import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { eq, and, desc, sql } from 'drizzle-orm';
import { payments, orders } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { VerifySlipDto } from './dto/verify-slip.dto';

export const SLIP_OCR_QUEUE = 'slip-ocr-queue';
export const PROCESS_SLIP_OCR_JOB = 'process-slip-ocr';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue(SLIP_OCR_QUEUE) private readonly slipOcrQueue: Queue,
  ) {}

  /**
   * Generate PromptPay QR payload using EMVCo standard.
   * Supports both phone number and national ID as PromptPay targets.
   */
  generatePromptPayPayload(amount: number, ref: string): { payload: string; qrBase64: string } {
    const promptpayId = process.env.PROMPTPAY_ID ?? '0000000000';
    const isPhone = promptpayId.length <= 13 && /^\d+$/.test(promptpayId);

    const aid = isPhone ? '0000000000000001' : '0000000000000002';
    const formattedId = isPhone
      ? '0066' + promptpayId.replace(/^0/, '').padStart(9, '0')
      : promptpayId;

    const merchantInfo = this.buildTlv('00', aid) + this.buildTlv('01', formattedId);
    const amountStr = amount.toFixed(2);

    let payload = '';
    payload += this.buildTlv('00', '01');                                 // Payload Format Indicator
    payload += this.buildTlv('01', '12');                                 // Point of Initiation (dynamic QR)
    payload += this.buildTlv('29', merchantInfo);                         // Merchant Account Information (PromptPay)
    payload += this.buildTlv('53', '764');                                // Transaction Currency (THB)
    payload += this.buildTlv('54', amountStr);                            // Transaction Amount
    payload += this.buildTlv('58', 'TH');                                 // Country Code
    payload += this.buildTlv('62', this.buildTlv('05', ref.slice(0, 25))); // Additional Data (Reference)

    payload += '6304';
    const crc = this.crc16(payload);
    payload += crc;

    this.logger.debug(`Generated PromptPay payload for ${amount} THB, ref: ${ref}`);

    return {
      payload,
      qrBase64: Buffer.from(payload).toString('base64'),
    };
  }

  /**
   * Create a payment record for an order.
   */
  async createPayment(orderId: string, method: string, amount: number) {
    const paymentNo = await this.generatePaymentNo();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min expiry

    let promptpayPayload: string | null = null;
    let promptpayRef: string | null = null;

    if (method === 'promptpay') {
      promptpayRef = paymentNo;
      const qrData = this.generatePromptPayPayload(amount, paymentNo);
      promptpayPayload = qrData.payload;
    }

    const [payment] = await this.db
      .insert(payments)
      .values({
        paymentNo,
        orderId,
        method,
        status: 'pending',
        amount: String(amount),
        promptpayPayload,
        promptpayRef,
        expiredAt: expiresAt,
      })
      .returning();

    return payment;
  }

  /**
   * Upload payment slip for an order.
   */
  async uploadSlip(orderId: string, patientId: string, slipImageUrl: string) {
    const order = await this.db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.patientId, patientId)),
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== 'awaiting_payment') {
      throw new BadRequestException(`Order is not awaiting payment. Current status: ${order.status}`);
    }

    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.orderId, orderId),
    });

    if (!payment) throw new NotFoundException(`Payment record for order ${orderId} not found`);

    await this.db
      .update(payments)
      .set({
        slipImageUrl,
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Enqueue slip OCR job for automatic verification
    await this.slipOcrQueue.add(
      PROCESS_SLIP_OCR_JOB,
      {
        paymentId: payment.id,
        orderId,
        slipImageUrl,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Slip uploaded for order ${orderId}, OCR job enqueued`);

    return {
      success: true,
      status: 'processing',
      message: 'ได้รับสลิปแล้ว ระบบกำลังตรวจสอบ ⏳',
    };
  }

  /**
   * Verify slip OCR result against order amount.
   * Tolerance: ±5% of expected amount.
   */
  async verifySlipOcr(paymentId: string, ocrResult: { amount: number; date?: string; time?: string }) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });

    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    const expectedAmount = parseFloat(payment.amount);
    const tolerance = expectedAmount * 0.05;
    const isMatch = Math.abs(ocrResult.amount - expectedAmount) <= tolerance;

    const matchStatus = isMatch ? 'matched' : 'mismatch';

    await this.db
      .update(payments)
      .set({
        slipOcrResult: ocrResult,
        slipMatchStatus: matchStatus,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    if (isMatch) {
      await this.confirmPayment(paymentId);
    }

    return {
      success: true,
      matchStatus,
      ocrResult,
      expectedAmount,
      message: isMatch ? 'ยอดตรงกัน ชำระเงินสำเร็จ' : 'ยอดไม่ตรง รอเจ้าหน้าที่ตรวจสอบ',
    };
  }

  /**
   * Staff manually verify a payment slip.
   */
  async manualVerifySlip(paymentId: string, staffId: string, dto: VerifySlipDto) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });

    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    await this.db
      .update(payments)
      .set({
        slipVerifiedBy: staffId,
        slipVerifiedAt: new Date(),
        slipMatchStatus: dto.decision,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    if (dto.decision === 'approved' || dto.decision === 'matched') {
      await this.confirmPayment(paymentId);
    }

    return { success: true, message: `Slip ${dto.decision} by staff` };
  }

  /**
   * Confirm payment — mark as successful and update order status.
   */
  async confirmPayment(paymentId: string) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });

    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    const now = new Date();

    await this.db
      .update(payments)
      .set({
        status: 'successful',
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(payments.id, paymentId));

    await this.db
      .update(orders)
      .set({
        status: 'processing',
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, payment.orderId));

    this.logger.log(`Payment ${paymentId} confirmed for order ${payment.orderId}`);
    return { success: true };
  }

  /**
   * Process a refund for a payment.
   */
  async processRefund(paymentId: string, amount: number, reason: string) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });

    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    if (payment.status !== 'successful') {
      throw new BadRequestException(`Cannot refund payment with status: ${payment.status}`);
    }

    const paidAmount = parseFloat(payment.amount);
    if (amount > paidAmount) {
      throw new BadRequestException(`Refund amount ${amount} exceeds paid amount ${paidAmount}`);
    }

    const isPartial = amount < paidAmount;

    await this.db
      .update(payments)
      .set({
        status: isPartial ? 'partially_refunded' : 'refunding',
        refundAmount: String(amount),
        refundReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    await this.db
      .update(orders)
      .set({
        status: 'refunding',
        updatedAt: new Date(),
      })
      .where(eq(orders.id, payment.orderId));

    this.logger.log(`Refund initiated: ${amount} THB for payment ${paymentId}`);

    return {
      success: true,
      refundAmount: amount,
      status: isPartial ? 'partially_refunded' : 'refunding',
    };
  }

  /**
   * Get orders with pending slip verification.
   */
  async getPendingSlipOrders(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const pending = await this.db
      .select({
        payment: payments,
        orderNo: orders.orderNo,
        orderTotal: orders.totalAmount,
        patientId: orders.patientId,
      })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(
        and(
          eq(payments.status, 'processing'),
          eq(payments.slipMatchStatus, 'mismatch'),
        ),
      )
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      data: pending.map((r: any) => ({
        ...r.payment,
        orderNo: r.orderNo,
        orderTotal: r.orderTotal,
        patientId: r.patientId,
      })),
      meta: { page, limit },
    };
  }

  /**
   * Get payment by order ID.
   */
  async getPaymentByOrderId(orderId: string) {
    return this.db.query.payments.findFirst({
      where: eq(payments.orderId, orderId),
    });
  }

  /**
   * Store OCR result without auto-matching (for low/medium confidence).
   */
  async storeSlipOcrResult(paymentId: string, ocrResult: any, matchStatus: string) {
    const payment = await this.db.query.payments.findFirst({
      where: eq(payments.id, paymentId),
    });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    await this.db
      .update(payments)
      .set({
        slipOcrResult: ocrResult,
        slipMatchStatus: matchStatus,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    this.logger.log(`Slip OCR result stored for payment ${paymentId}: status=${matchStatus}`);
    return { success: true, matchStatus };
  }

  /**
   * Manual verify slip by order ID (convenience for controller).
   */
  async manualVerifySlipByOrder(orderId: string, staffId: string, dto: VerifySlipDto) {
    const payment = await this.getPaymentByOrderId(orderId);
    if (!payment) throw new NotFoundException(`Payment for order ${orderId} not found`);
    return this.manualVerifySlip(payment.id, staffId, dto);
  }

  /**
   * Process refund by order ID (convenience for controller).
   */
  async processRefundByOrder(orderId: string, amount: number, reason: string) {
    const payment = await this.getPaymentByOrderId(orderId);
    if (!payment) throw new NotFoundException(`Payment for order ${orderId} not found`);
    return this.processRefund(payment.id, amount, reason);
  }

  // --- Private helpers ---

  private buildTlv(tag: string, value: string): string {
    const len = value.length.toString().padStart(2, '0');
    return tag + len + value;
  }

  private crc16(data: string): string {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  private async generatePaymentNo(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PAY-${today}-`;
    const existing = await this.db
      .select({ paymentNo: payments.paymentNo })
      .from(payments)
      .where(sql`${payments.paymentNo} LIKE ${prefix + '%'}`)
      .orderBy(desc(payments.paymentNo))
      .limit(1);

    let seq = 1;
    if (existing.length > 0) {
      const last = existing[0].paymentNo;
      seq = parseInt(last.split('-').pop() ?? '0', 10) + 1;
    }

    return `${prefix}${String(seq).padStart(3, '0')}`;
  }
}
