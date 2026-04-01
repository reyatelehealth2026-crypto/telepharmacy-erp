import { Injectable, Inject, Logger, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  orders,
  orderItems,
  deliveries,
  products,
  payments,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentService } from '../payment/payment.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationSenderService } from '../notifications/notification-sender.service';
import { EventsService } from '../events/events.service';
import type { CreateOtcOrderDto } from './dto/create-otc-order.dto';
import type { ShipOrderDto } from './dto/ship-order.dto';
import type { ShippingWebhookDto } from './dto/shipping-webhook.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly inventoryService: InventoryService,
    private readonly paymentService: PaymentService,
    private readonly loyaltyService: LoyaltyService,
    private readonly notificationSender: NotificationSenderService,
    @Optional() private readonly eventsService?: EventsService,
  ) {}

  /**
   * Create an OTC order: validate stock, FEFO lot reservation, compute totals, create payment.
   */
  async createOtcOrder(patientId: string, dto: CreateOtcOrderDto) {
    const orderNo = await this.generateOrderNo();
    const paymentMethod = dto.paymentMethod ?? 'promptpay';

    const itemsData: Array<{
      productId: string;
      productName: string;
      sku: string | null;
      drugClassification: string | null;
      quantity: number;
      unit: string | null;
      unitPrice: number;
      totalPrice: number;
      lotId: string | null;
    }> = [];

    let subtotal = 0;

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i]!;
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (product.requiresPrescription) {
        throw new BadRequestException(`Product ${product.nameTh} requires a prescription. Use Rx order flow.`);
      }

      const fefoLots = await this.inventoryService.selectFefoLots(item.productId, item.quantity);
      const primaryLot = fefoLots[0]!;

      for (const lot of fefoLots) {
        await this.inventoryService.reserveStock(lot.lotId, lot.quantity);
      }

      const unitPrice = parseFloat(product.sellPrice ?? '0');
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      itemsData.push({
        productId: item.productId,
        productName: product.nameTh,
        sku: product.sku,
        drugClassification: product.drugClassification,
        quantity: item.quantity,
        unit: product.unit,
        unitPrice,
        totalPrice,
        lotId: primaryLot.lotId,
      });
    }

    const deliveryFee = this.calculateDeliveryFee(dto.deliveryAddress.province);
    const coldChainRequired = itemsData.some(i => {
      return false; // TODO: check product.coldChain
    });
    const coldChainFee = coldChainRequired ? 50 : 0;

    const pointsDiscount = dto.usePoints ? dto.usePoints * 0.10 : 0;
    const discountAmount = 0; // TODO: apply discount code logic
    const totalAmount = subtotal - discountAmount - pointsDiscount + deliveryFee + coldChainFee;
    const pointsToEarn = Math.floor(totalAmount);

    const [order] = await this.db
      .insert(orders)
      .values({
        orderNo,
        patientId,
        orderType: 'otc',
        status: 'awaiting_payment',
        subtotal: String(subtotal),
        discountAmount: String(discountAmount),
        discountCode: dto.discountCode ?? null,
        deliveryFee: String(deliveryFee),
        coldChainFee: String(coldChainFee),
        coldChainRequired,
        totalAmount: String(totalAmount),
        pointsEarned: 0,
        pointsRedeemed: dto.usePoints ?? 0,
        pointsDiscount: String(pointsDiscount),
        deliveryAddress: dto.deliveryAddress.address,
        deliverySubDistrict: dto.deliveryAddress.subDistrict ?? null,
        deliveryDistrict: dto.deliveryAddress.district ?? null,
        deliveryProvince: dto.deliveryAddress.province,
        deliveryPostalCode: dto.deliveryAddress.postalCode ?? null,
        deliveryPhone: dto.deliveryAddress.phone ?? null,
        deliveryRecipient: dto.deliveryAddress.recipient ?? null,
        deliveryNotes: dto.deliveryNotes ?? null,
        notes: dto.notes ?? null,
        source: 'line',
      })
      .returning();

    for (let i = 0; i < itemsData.length; i++) {
      const item = itemsData[i]!;
      await this.db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        itemNo: i + 1,
        productName: item.productName,
        sku: item.sku,
        drugClassification: item.drugClassification,
        quantity: String(item.quantity),
        unit: item.unit,
        unitPrice: String(item.unitPrice),
        discountAmount: '0',
        totalPrice: String(item.totalPrice),
        lotId: item.lotId,
      });
    }

    const payment = await this.paymentService.createPayment(order.id, paymentMethod, totalAmount);

    this.logger.log(`Order ${orderNo} created for patient ${patientId}, total: ${totalAmount} THB`);

    return {
      success: true,
      data: {
        id: order.id,
        orderNo,
        status: order.status,
        items: itemsData,
        subtotal,
        discountAmount,
        deliveryFee,
        coldChainFee,
        pointsDiscount,
        totalAmount,
        pointsToEarn,
        payment: {
          id: payment.id,
          method: paymentMethod,
          promptpayPayload: payment.promptpayPayload,
          promptpayQrBase64: payment.promptpayPayload
            ? Buffer.from(payment.promptpayPayload).toString('base64')
            : null,
          expiresAt: payment.expiredAt,
        },
      },
    };
  }

  /**
   * Create order from approved prescription.
   */
  async createFromPrescription(patientId: string, prescriptionId: string) {
    const orderNo = await this.generateOrderNo();

    const [order] = await this.db
      .insert(orders)
      .values({
        orderNo,
        patientId,
        orderType: 'rx',
        prescriptionId,
        status: 'awaiting_payment',
        source: 'line',
      })
      .returning();

    this.logger.log(`Rx order ${orderNo} created from prescription ${prescriptionId}`);
    return { success: true, data: order };
  }

  /**
   * Get order by ID with items, delivery, and payment info.
   */
  async getOrder(id: string, patientId?: string) {
    const conditions = [eq(orders.id, id)];
    if (patientId) conditions.push(eq(orders.patientId, patientId));

    const order = await this.db.query.orders.findFirst({
      where: and(...conditions),
    });

    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    const delivery = await this.db.query.deliveries.findFirst({
      where: eq(deliveries.orderId, id),
    });

    const payment = await this.paymentService.getPaymentByOrderId(id);

    return {
      success: true,
      data: {
        ...order,
        items,
        delivery: delivery ?? null,
        payment: payment ?? null,
      },
    };
  }

  /**
   * List orders with pagination and optional filters.
   */
  async listOrders(filters: {
    patientId?: string;
    status?: string;
    orderType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters.patientId) conditions.push(eq(orders.patientId, filters.patientId));
    if (filters.status) conditions.push(eq(orders.status, filters.status as any));
    if (filters.orderType) conditions.push(eq(orders.orderType, filters.orderType as any));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await this.db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data, meta: { page, limit } };
  }

  /**
   * Cancel an order, releasing reserved lots.
   */
  async cancelOrder(id: string, reason: string, patientId?: string) {
    const order = await this.getOrderEntity(id, patientId);

    const cancellable = ['draft', 'awaiting_payment'];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order with status: ${order.status}`);
    }

    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    for (const item of items) {
      if (item.lotId) {
        await this.inventoryService.releaseReservedStock(item.lotId, parseFloat(item.quantity));
      }
    }

    await this.db
      .update(orders)
      .set({
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id));

    this.logger.log(`Order ${id} cancelled: ${reason}`);
    return { success: true, message: 'Order cancelled' };
  }

  /**
   * Reorder — clone items from a previous order.
   */
  async reorder(originalOrderId: string, patientId: string) {
    const original = await this.getOrderEntity(originalOrderId, patientId);
    const originalItems = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, originalOrderId));

    const orderNo = await this.generateOrderNo();

    const [newOrder] = await this.db
      .insert(orders)
      .values({
        orderNo,
        patientId,
        orderType: 'reorder',
        status: 'draft',
        deliveryAddress: original.deliveryAddress,
        deliverySubDistrict: original.deliverySubDistrict,
        deliveryDistrict: original.deliveryDistrict,
        deliveryProvince: original.deliveryProvince,
        deliveryPostalCode: original.deliveryPostalCode,
        deliveryPhone: original.deliveryPhone,
        deliveryRecipient: original.deliveryRecipient,
        source: 'line',
      })
      .returning();

    const unavailableItems: string[] = [];

    for (const item of originalItems) {
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });

      if (!product || product.status !== 'active') {
        unavailableItems.push(item.productName);
        continue;
      }

      await this.db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        drugClassification: item.drugClassification,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: product.sellPrice ?? item.unitPrice,
        discountAmount: '0',
        totalPrice: String(parseFloat(product.sellPrice ?? item.unitPrice) * parseFloat(item.quantity)),
      });
    }

    return {
      success: true,
      data: {
        id: newOrder.id,
        orderNo,
        status: 'draft',
        unavailableItems,
      },
    };
  }

  /**
   * Update order status (staff).
   */
  async updateOrderStatus(id: string, status: string, staffId: string) {
    const order = await this.getOrderEntity(id);

    const timestampField = this.getTimestampField(status);
    const updateData: any = { status, updatedAt: new Date() };
    if (timestampField) updateData[timestampField] = new Date();

    await this.db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id));

    this.logger.log(`Order ${id} status updated to ${status} by staff ${staffId}`);

    // Trigger notification for key status changes
    if (['paid', 'shipped', 'delivered'].includes(status) && order.patientId) {
      await this.sendOrderNotification(order, status);
    }

    // Emit real-time WebSocket event for admin dashboard
    try {
      this.eventsService?.emitOrderUpdate({
        id,
        status,
        patientId: order.patientId,
        orderNo: order.orderNo,
        updatedBy: staffId,
      });
    } catch (err) {
      this.logger.error(`Failed to emit order:update for ${id}`, (err as Error).stack);
    }

    return { success: true, status };
  }

  /**
   * Pack order.
   */
  async packOrder(id: string, staffId: string) {
    return this.updateOrderStatus(id, 'packed', staffId);
  }

  /**
   * Ship order — create delivery record and consume reserved stock.
   */
  async shipOrder(id: string, dto: ShipOrderDto, staffId: string) {
    const order = await this.getOrderEntity(id);

    if (!['packed', 'ready_to_ship', 'processing'].includes(order.status)) {
      throw new BadRequestException(`Cannot ship order with status: ${order.status}`);
    }

    const [delivery] = await this.db
      .insert(deliveries)
      .values({
        orderId: id,
        provider: dto.provider,
        trackingNo: dto.trackingNo ?? null,
        fee: order.deliveryFee ?? '0',
        coldChain: dto.coldChain ?? false,
        courierName: dto.courierName ?? null,
        courierPhone: dto.courierPhone ?? null,
        notes: dto.notes ?? null,
        status: 'picked_up',
        pickedUpAt: new Date(),
      })
      .returning();

    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id));

    for (const item of items) {
      if (item.lotId) {
        await this.inventoryService.consumeReservedStock(
          item.lotId,
          parseFloat(item.quantity),
          id,
          staffId,
        );
      }
    }

    await this.db
      .update(orders)
      .set({ status: 'shipped', shippedAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, id));

    this.logger.log(`Order ${id} shipped via ${dto.provider}, tracking: ${dto.trackingNo}`);

    // Trigger notification for shipped status
    if (order.patientId) {
      await this.sendOrderNotification(order, 'shipped');
    }

    // Emit real-time WebSocket event for admin dashboard
    try {
      this.eventsService?.emitOrderUpdate({
        id,
        status: 'shipped',
        patientId: order.patientId,
        orderNo: order.orderNo,
        trackingNo: dto.trackingNo,
        provider: dto.provider,
      });
    } catch (err) {
      this.logger.error(`Failed to emit order:update for ${id}`, (err as Error).stack);
    }

    return { success: true, data: delivery };
  }

  /**
   * Mark order as delivered + auto-earn loyalty points.
   */
  async markDelivered(id: string) {
    const order = await this.getOrderEntity(id);

    await this.db
      .update(orders)
      .set({ status: 'delivered', deliveredAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, id));

    const delivery = await this.db.query.deliveries.findFirst({
      where: eq(deliveries.orderId, id),
    });

    if (delivery) {
      await this.db
        .update(deliveries)
        .set({ status: 'delivered', deliveredAt: new Date(), updatedAt: new Date() })
        .where(eq(deliveries.id, delivery.id));
    }

    // ── Loyalty: Auto-earn points on delivery ──
    const totalAmount = parseFloat(order.totalAmount ?? '0');
    if (totalAmount > 0 && order.patientId) {
      try {
        const earnResult = await this.loyaltyService.earnPoints(
          order.patientId,
          id,
          totalAmount,
        );

        // Update pointsEarned on the order record
        await this.db
          .update(orders)
          .set({ pointsEarned: earnResult.earnedPoints })
          .where(eq(orders.id, id));

        this.logger.log(
          `Loyalty: ${earnResult.earnedPoints} points earned for order ${id} (${earnResult.multiplier}x)`,
        );
      } catch (err) {
        this.logger.error(`Failed to earn loyalty points for order ${id}`, err);
        // Non-fatal — order delivery still succeeds
      }
    }

    // Trigger notification for delivered status
    if (order.patientId) {
      await this.sendOrderNotification(order, 'delivered');
    }

    // Emit real-time WebSocket event for admin dashboard
    try {
      this.eventsService?.emitOrderUpdate({
        id,
        status: 'delivered',
        patientId: order.patientId,
        orderNo: order.orderNo,
      });
    } catch (err) {
      this.logger.error(`Failed to emit order:update for ${id}`, (err as Error).stack);
    }

    this.logger.log(`Order ${id} marked as delivered`);
    return { success: true, orderId: id, patientId: order.patientId, totalAmount: order.totalAmount };
  }

  /**
   * Handle shipping provider webhook.
   */
  async handleShippingWebhook(dto: ShippingWebhookDto) {
    const delivery = await this.db.query.deliveries.findFirst({
      where: eq(deliveries.trackingNo, dto.trackingNo),
    });

    if (!delivery) {
      this.logger.warn(`Shipping webhook: tracking ${dto.trackingNo} not found`);
      return { success: false, error: 'Tracking number not found' };
    }

    const updateData: any = { status: dto.status, updatedAt: new Date() };
    if (dto.receiverName) updateData.receiverName = dto.receiverName;
    if (dto.receiverPhone) updateData.receiverPhone = dto.receiverPhone;
    if (dto.failureReason) updateData.failureReason = dto.failureReason;
    if (dto.deliveryProofUrl) updateData.deliveryProofUrl = dto.deliveryProofUrl;
    if (dto.status === 'delivered') updateData.deliveredAt = new Date();

    await this.db
      .update(deliveries)
      .set(updateData)
      .where(eq(deliveries.id, delivery.id));

    if (dto.status === 'delivered') {
      await this.markDelivered(delivery.orderId);
    }

    if (dto.status === 'failed' || dto.status === 'returned_to_sender') {
      await this.db
        .update(orders)
        .set({ status: 'returned', updatedAt: new Date() })
        .where(eq(orders.id, delivery.orderId));
    }

    this.logger.log(`Shipping webhook: ${dto.trackingNo} → ${dto.status}`);
    return { success: true };
  }

  // --- Private helpers ---

  /**
   * Send a notification to the patient when order status changes to paid/shipped/delivered.
   * Wrapped in try/catch so notification failures don't break the main flow.
   */
  private async sendOrderNotification(order: any, status: string) {
    const statusMessages: Record<string, { title: string; body: string }> = {
      paid: {
        title: 'ชำระเงินสำเร็จ',
        body: `คำสั่งซื้อ ${order.orderNo} ชำระเงินเรียบร้อยแล้ว`,
      },
      shipped: {
        title: 'จัดส่งแล้ว',
        body: `คำสั่งซื้อ ${order.orderNo} ถูกจัดส่งแล้ว`,
      },
      delivered: {
        title: 'จัดส่งสำเร็จ',
        body: `คำสั่งซื้อ ${order.orderNo} จัดส่งถึงปลายทางแล้ว`,
      },
    };

    const msg = statusMessages[status];
    if (!msg) return;

    try {
      await this.notificationSender.send({
        patientId: order.patientId,
        type: 'order_update',
        title: msg.title,
        body: msg.body,
        referenceType: 'order',
        referenceId: order.id,
      });
    } catch (err) {
      this.logger.error(
        `Failed to send order notification for ${order.id} (status=${status})`,
        (err as Error).stack,
      );
    }
  }

  private async getOrderEntity(id: string, patientId?: string) {
    const conditions = [eq(orders.id, id)];
    if (patientId) conditions.push(eq(orders.patientId, patientId));

    const order = await this.db.query.orders.findFirst({
      where: and(...conditions),
    });

    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  private calculateDeliveryFee(province: string): number {
    const bangkokAreas = ['กรุงเทพฯ', 'กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ'];
    return bangkokAreas.includes(province) ? 40 : 60;
  }

  private getTimestampField(status: string): string | null {
    const map: Record<string, string> = {
      paid: 'paidAt',
      processing: 'processedAt',
      packed: 'packedAt',
      shipped: 'shippedAt',
      delivered: 'deliveredAt',
      completed: 'completedAt',
      cancelled: 'cancelledAt',
    };
    return map[status] ?? null;
  }

  private async generateOrderNo(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `REYA-${today}-`;
    const existing = await this.db
      .select({ orderNo: orders.orderNo })
      .from(orders)
      .where(sql`${orders.orderNo} LIKE ${prefix + '%'}`)
      .orderBy(desc(orders.orderNo))
      .limit(1);

    let seq = 1;
    if (existing.length > 0) {
      const last = existing[0].orderNo;
      seq = parseInt(last.split('-').pop() ?? '0', 10) + 1;
    }

    return `${prefix}${String(seq).padStart(3, '0')}`;
  }

  /** Get orders with pending slip verification. */
  async getPendingSlipOrders() {
    const result = await this.db
      .select()
      .from(orders)
      .where(eq(orders.status, 'awaiting_payment'))
      .orderBy(desc(orders.createdAt))
      .limit(50);
    return { data: result, total: result.length };
  }

  /** Verify a payment slip (approve or reject). */
  async verifySlip(orderId: string, approved: boolean, notes: string, staffId: string) {
    const order = await this.getOrderEntity(orderId);
    if (!order) throw new NotFoundException('Order not found');

    if (approved) {
      await this.db
        .update(orders)
        .set({ status: 'paid', paidAt: new Date(), internalNotes: notes })
        .where(eq(orders.id, orderId));
      this.logger.log(`Slip verified for order ${orderId} by staff ${staffId}`);

      // Trigger notification for paid status
      if (order.patientId) {
        await this.sendOrderNotification(order, 'paid');
      }

      return { success: true, message: 'อนุมัติสลิปเรียบร้อย' };
    } else {
      await this.db
        .update(orders)
        .set({ status: 'cancelled', cancelledAt: new Date(), internalNotes: `สลิปไม่ถูกต้อง: ${notes}` })
        .where(eq(orders.id, orderId));
      this.logger.log(`Slip rejected for order ${orderId} by staff ${staffId}`);
      return { success: true, message: 'ปฏิเสธสลิปเรียบร้อย' };
    }
  }

  /** Process a refund for an order. */
  async refundOrder(orderId: string, reason: string, staffId: string, amount?: number) {
    const order = await this.getOrderEntity(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'cancelled' || order.status === 'refunded') {
      throw new BadRequestException('Order already cancelled/refunded');
    }

    await this.db
      .update(orders)
      .set({ status: 'cancelled', cancelledAt: new Date(), internalNotes: `Refund: ${reason}` })
      .where(eq(orders.id, orderId));

    this.logger.log(`Order ${orderId} refunded by staff ${staffId}: ${reason}`);
    return { success: true, message: 'คืนเงินเรียบร้อย' };
  }
}
