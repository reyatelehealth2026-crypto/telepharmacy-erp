import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import {
  inventoryLots,
  stockMovements,
  products,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { ReceiveLotDto } from './dto/receive-lot.dto';
import type { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /**
   * FEFO (First Expired First Out) lot selection.
   * Selects available lots ordered by expiry_date ASC, skipping expired lots.
   * Returns lots with enough cumulative quantity to fulfill the requested amount.
   */
  async selectFefoLots(productId: string, requiredQty: number) {
    const today = new Date().toISOString().split('T')[0];

    const lots = await this.db
      .select()
      .from(inventoryLots)
      .where(
        and(
          eq(inventoryLots.productId, productId),
          eq(inventoryLots.status, 'available'),
          sql`${inventoryLots.expiryDate} >= ${today}`,
          sql`CAST(${inventoryLots.quantityAvailable} AS numeric) > 0`,
        ),
      )
      .orderBy(asc(inventoryLots.expiryDate));

    const selected: Array<{ lotId: string; lotNo: string; quantity: number; expiryDate: string | null }> = [];
    let remaining = requiredQty;

    for (const lot of lots) {
      if (remaining <= 0) break;
      const available = parseFloat(lot.quantityAvailable ?? '0');
      const take = Math.min(available, remaining);
      selected.push({
        lotId: lot.id,
        lotNo: lot.lotNo,
        quantity: take,
        expiryDate: lot.expiryDate,
      });
      remaining -= take;
    }

    if (remaining > 0) {
      throw new BadRequestException(
        `Insufficient stock for product ${productId}. Short by ${remaining.toFixed(3)} units.`,
      );
    }

    return selected;
  }

  /**
   * Receive a new lot into inventory.
   */
  async receiveLot(dto: ReceiveLotDto, performedBy: string) {
    const [lot] = await this.db
      .insert(inventoryLots)
      .values({
        productId: dto.productId,
        lotNo: dto.lotNo,
        expiryDate: dto.expiryDate,
        manufacturingDate: dto.manufacturingDate ?? null,
        receivedDate: new Date().toISOString().split('T')[0],
        quantityReceived: String(dto.quantity),
        quantityAvailable: String(dto.quantity),
        quantityReserved: '0',
        quantityDamaged: '0',
        costPrice: dto.costPrice != null ? String(dto.costPrice) : null,
        supplierId: dto.supplierId ?? null,
        supplierLotRef: dto.supplierLotRef ?? null,
        warehouseLocation: dto.warehouseLocation ?? null,
        warehouseZone: dto.warehouseZone ?? null,
        status: 'available',
      })
      .returning();

    await this.db.insert(stockMovements).values({
      lotId: lot.id,
      productId: dto.productId,
      movementType: 'purchase_in',
      quantity: String(dto.quantity),
      unitCost: dto.costPrice != null ? String(dto.costPrice) : null,
      reason: 'Received new lot',
      performedBy,
    });

    this.logger.log(`Received lot ${dto.lotNo} for product ${dto.productId}, qty: ${dto.quantity}`);
    return lot;
  }

  /**
   * Record a stock movement and update lot quantities.
   */
  async recordMovement(dto: AdjustStockDto, performedBy: string) {
    const lot = await this.db.query.inventoryLots.findFirst({
      where: eq(inventoryLots.id, dto.lotId),
    });

    if (!lot) {
      throw new NotFoundException(`Lot ${dto.lotId} not found`);
    }

    const currentAvailable = parseFloat(lot.quantityAvailable ?? '0');
    const currentDamaged = parseFloat(lot.quantityDamaged ?? '0');
    const absQty = Math.abs(dto.quantity);

    let newAvailable = currentAvailable;
    let newDamaged = currentDamaged;
    let newStatus = lot.status;

    switch (dto.movementType) {
      case 'adjustment_in':
      case 'return_in':
        newAvailable += absQty;
        break;
      case 'adjustment_out':
      case 'return_out':
        if (absQty > currentAvailable) {
          throw new BadRequestException(
            `Cannot remove ${absQty} from lot ${dto.lotId}. Available: ${currentAvailable}`,
          );
        }
        newAvailable -= absQty;
        break;
      case 'write_off':
        if (absQty > currentAvailable) {
          throw new BadRequestException(
            `Cannot write off ${absQty} from lot ${dto.lotId}. Available: ${currentAvailable}`,
          );
        }
        newAvailable -= absQty;
        newDamaged += absQty;
        if (newAvailable <= 0) {
          newStatus = 'damaged';
        }
        break;
      default:
        throw new BadRequestException(`Invalid movement type: ${dto.movementType}`);
    }

    await this.db
      .update(inventoryLots)
      .set({
        quantityAvailable: String(newAvailable),
        quantityDamaged: String(newDamaged),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(inventoryLots.id, dto.lotId));

    const [movement] = await this.db
      .insert(stockMovements)
      .values({
        lotId: dto.lotId,
        productId: lot.productId,
        movementType: dto.movementType,
        quantity: String(dto.movementType.endsWith('_out') || dto.movementType === 'write_off' ? -absQty : absQty),
        reason: dto.reason,
        notes: dto.notes ?? null,
        referenceType: dto.referenceType ?? null,
        referenceId: dto.referenceId ?? null,
        performedBy,
      })
      .returning();

    this.logger.log(`Stock movement: ${dto.movementType} ${absQty} on lot ${dto.lotId}`);
    return movement;
  }

  /**
   * Reserve stock from FEFO-selected lots (for order placement).
   */
  async reserveStock(lotId: string, quantity: number) {
    const lot = await this.db.query.inventoryLots.findFirst({
      where: eq(inventoryLots.id, lotId),
    });

    if (!lot) throw new NotFoundException(`Lot ${lotId} not found`);

    const available = parseFloat(lot.quantityAvailable ?? '0');
    const reserved = parseFloat(lot.quantityReserved ?? '0');

    if (quantity > available) {
      throw new BadRequestException(`Cannot reserve ${quantity}. Available: ${available}`);
    }

    await this.db
      .update(inventoryLots)
      .set({
        quantityAvailable: String(available - quantity),
        quantityReserved: String(reserved + quantity),
        updatedAt: new Date(),
      })
      .where(eq(inventoryLots.id, lotId));
  }

  /**
   * Release reserved stock back to available (for order cancellation).
   */
  async releaseReservedStock(lotId: string, quantity: number) {
    const lot = await this.db.query.inventoryLots.findFirst({
      where: eq(inventoryLots.id, lotId),
    });

    if (!lot) throw new NotFoundException(`Lot ${lotId} not found`);

    const available = parseFloat(lot.quantityAvailable ?? '0');
    const reserved = parseFloat(lot.quantityReserved ?? '0');
    const releaseQty = Math.min(quantity, reserved);

    await this.db
      .update(inventoryLots)
      .set({
        quantityAvailable: String(available + releaseQty),
        quantityReserved: String(reserved - releaseQty),
        updatedAt: new Date(),
      })
      .where(eq(inventoryLots.id, lotId));
  }

  /**
   * Consume reserved stock (for order shipment — deduct from reserved).
   */
  async consumeReservedStock(lotId: string, quantity: number, orderId: string, performedBy: string) {
    const lot = await this.db.query.inventoryLots.findFirst({
      where: eq(inventoryLots.id, lotId),
    });

    if (!lot) throw new NotFoundException(`Lot ${lotId} not found`);

    const reserved = parseFloat(lot.quantityReserved ?? '0');
    const consumeQty = Math.min(quantity, reserved);

    await this.db
      .update(inventoryLots)
      .set({
        quantityReserved: String(reserved - consumeQty),
        updatedAt: new Date(),
      })
      .where(eq(inventoryLots.id, lotId));

    await this.db.insert(stockMovements).values({
      lotId,
      productId: lot.productId,
      movementType: 'sale_out',
      quantity: String(-consumeQty),
      referenceType: 'order',
      referenceId: orderId,
      reason: `Dispensed for order ${orderId}`,
      performedBy,
    });
  }

  /**
   * Get stock overview with aggregated quantities per product.
   */
  async getStockOverview(filters: {
    category?: string;
    lowStock?: boolean;
    expiringWithin?: number;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const today = new Date().toISOString().split('T')[0];

    const rows = await this.db
      .select({
        productId: inventoryLots.productId,
        totalStock: sql<string>`SUM(CAST(${inventoryLots.quantityReceived} AS numeric))`,
        totalAvailable: sql<string>`SUM(CAST(${inventoryLots.quantityAvailable} AS numeric))`,
        totalReserved: sql<string>`SUM(CAST(${inventoryLots.quantityReserved} AS numeric))`,
        totalDamaged: sql<string>`SUM(CAST(${inventoryLots.quantityDamaged} AS numeric))`,
        earliestExpiry: sql<string>`MIN(${inventoryLots.expiryDate})`,
        lotCount: sql<number>`COUNT(*)::int`,
      })
      .from(inventoryLots)
      .where(eq(inventoryLots.status, 'available'))
      .groupBy(inventoryLots.productId)
      .limit(limit)
      .offset(offset);

    const result = [];
    for (const row of rows) {
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, row.productId),
        columns: { id: true, nameTh: true, sku: true, minStock: true, coldChain: true },
      });

      const daysToExpiry = row.earliestExpiry
        ? Math.ceil((new Date(row.earliestExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      const totalAvailable = parseFloat(row.totalAvailable ?? '0');
      const minStock = parseFloat(product?.minStock ?? '0');
      const isLowStock = minStock > 0 && totalAvailable <= minStock;

      if (filters.lowStock && !isLowStock) continue;
      if (filters.expiringWithin && (daysToExpiry === null || daysToExpiry > filters.expiringWithin)) continue;

      result.push({
        product: product ?? { id: row.productId },
        totalStock: parseFloat(row.totalStock ?? '0'),
        available: totalAvailable,
        reserved: parseFloat(row.totalReserved ?? '0'),
        damaged: parseFloat(row.totalDamaged ?? '0'),
        lotCount: row.lotCount,
        alerts: {
          lowStock: isLowStock,
          expiringSoon: daysToExpiry !== null && daysToExpiry <= 90,
          daysToExpiry,
        },
      });
    }

    return { success: true, data: result, meta: { page, limit } };
  }

  /**
   * Get lots for a specific product, ordered by expiry (FEFO).
   */
  async getLotsByProduct(productId: string) {
    const lots = await this.db
      .select()
      .from(inventoryLots)
      .where(eq(inventoryLots.productId, productId))
      .orderBy(asc(inventoryLots.expiryDate));

    return { success: true, data: lots };
  }

  /**
   * Get expiry alerts — lots expiring within N days.
   */
  async getExpiryAlerts(days: number = 30) {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const lots = await this.db
      .select({
        lot: inventoryLots,
        productName: products.nameTh,
        productSku: products.sku,
      })
      .from(inventoryLots)
      .innerJoin(products, eq(inventoryLots.productId, products.id))
      .where(
        and(
          eq(inventoryLots.status, 'available'),
          sql`CAST(${inventoryLots.quantityAvailable} AS numeric) > 0`,
          sql`${inventoryLots.expiryDate} <= ${futureDateStr}`,
          sql`${inventoryLots.expiryDate} >= ${todayStr}`,
        ),
      )
      .orderBy(asc(inventoryLots.expiryDate));

    return {
      success: true,
      data: lots.map((r: any) => ({
        ...r.lot,
        productName: r.productName,
        productSku: r.productSku,
        daysUntilExpiry: Math.ceil(
          (new Date(r.lot.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      })),
      meta: { days, total: lots.length },
    };
  }

  /**
   * Get low stock alerts — products below their min_stock threshold.
   */
  async getLowStockAlerts() {
    const rows = await this.db
      .select({
        productId: inventoryLots.productId,
        totalAvailable: sql<string>`SUM(CAST(${inventoryLots.quantityAvailable} AS numeric))`,
      })
      .from(inventoryLots)
      .where(eq(inventoryLots.status, 'available'))
      .groupBy(inventoryLots.productId);

    const alerts = [];
    for (const row of rows) {
      const product = await this.db.query.products.findFirst({
        where: eq(products.id, row.productId),
        columns: { id: true, nameTh: true, sku: true, minStock: true },
      });

      if (!product) continue;
      const minStock = parseFloat(product.minStock ?? '0');
      const available = parseFloat(row.totalAvailable ?? '0');

      if (minStock > 0 && available <= minStock) {
        alerts.push({
          product,
          available,
          minStock,
          shortage: minStock - available,
        });
      }
    }

    return { success: true, data: alerts, meta: { total: alerts.length } };
  }

  /**
   * Get stock movement history with pagination.
   */
  async getMovementHistory(filters: {
    productId?: string;
    lotId?: string;
    movementType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters.productId) conditions.push(eq(stockMovements.productId, filters.productId));
    if (filters.lotId) conditions.push(eq(stockMovements.lotId, filters.lotId));
    if (filters.movementType) conditions.push(eq(stockMovements.movementType, filters.movementType as any));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const movements = await this.db
      .select({
        movement: stockMovements,
        lotNo: inventoryLots.lotNo,
        productName: products.nameTh,
        productSku: products.sku,
      })
      .from(stockMovements)
      .innerJoin(inventoryLots, eq(stockMovements.lotId, inventoryLots.id))
      .innerJoin(products, eq(stockMovements.productId, products.id))
      .where(whereClause)
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      data: movements.map((r: any) => ({
        ...r.movement,
        lotNo: r.lotNo,
        productName: r.productName,
        productSku: r.productSku,
      })),
      meta: { page, limit },
    };
  }
}
