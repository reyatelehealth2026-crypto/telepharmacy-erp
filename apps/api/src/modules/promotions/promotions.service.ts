import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { promotions, orders } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { CreatePromotionDto } from './dto/create-promotion.dto';
import type { UpdatePromotionDto } from './dto/update-promotion.dto';

/** Tier hierarchy for comparison */
const TIER_RANK: Record<string, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
};

export interface CouponValidationResult {
  valid: boolean;
  promotion?: any;
  discountAmount?: number;
  errorMessage?: string;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async create(dto: CreatePromotionDto, staffId: string) {
    this.validateTypeSpecificFields(dto);

    const existing = await this.db.query.promotions.findFirst({
      where: eq(promotions.code, dto.code),
    });
    if (existing) {
      throw new ConflictException('รหัสโปรโมชั่นนี้ถูกใช้แล้ว');
    }

    const [promotion] = await this.db
      .insert(promotions)
      .values({
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        type: dto.type,
        value: dto.value != null ? String(dto.value) : null,
        minOrderAmount: dto.minOrderAmount != null ? String(dto.minOrderAmount) : null,
        maxDiscount: dto.maxDiscount != null ? String(dto.maxDiscount) : null,
        usageLimit: dto.usageLimit ?? null,
        usagePerCustomer: dto.usagePerCustomer ?? 1,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        tierRequired: dto.tierRequired ?? null,
        productIds: dto.productIds ?? [],
        categoryIds: dto.categoryIds ?? [],
        buyQuantity: dto.buyQuantity ?? null,
        getQuantity: dto.getQuantity ?? null,
        status: 'draft',
        createdBy: staffId,
      })
      .returning();

    this.logger.log(`Promotion ${dto.code} created by staff ${staffId}`);
    return { success: true, data: promotion };
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const existing = await this.findOneEntity(id);

    if (dto.type || existing.type) {
      const merged = { ...existing, ...dto, type: dto.type ?? existing.type };
      this.validateTypeSpecificFields(merged as CreatePromotionDto);
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (dto.code !== undefined) updateData.code = dto.code;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.value !== undefined) updateData.value = dto.value != null ? String(dto.value) : null;
    if (dto.minOrderAmount !== undefined) updateData.minOrderAmount = dto.minOrderAmount != null ? String(dto.minOrderAmount) : null;
    if (dto.maxDiscount !== undefined) updateData.maxDiscount = dto.maxDiscount != null ? String(dto.maxDiscount) : null;
    if (dto.usageLimit !== undefined) updateData.usageLimit = dto.usageLimit;
    if (dto.usagePerCustomer !== undefined) updateData.usagePerCustomer = dto.usagePerCustomer;
    if (dto.startsAt !== undefined) updateData.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt !== undefined) updateData.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (dto.tierRequired !== undefined) updateData.tierRequired = dto.tierRequired;
    if (dto.productIds !== undefined) updateData.productIds = dto.productIds;
    if (dto.categoryIds !== undefined) updateData.categoryIds = dto.categoryIds;
    if (dto.buyQuantity !== undefined) updateData.buyQuantity = dto.buyQuantity;
    if (dto.getQuantity !== undefined) updateData.getQuantity = dto.getQuantity;

    const [updated] = await this.db
      .update(promotions)
      .set(updateData)
      .where(eq(promotions.id, id))
      .returning();

    return { success: true, data: updated };
  }

  async findAll(filters: {
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (filters.status) conditions.push(eq(promotions.status, filters.status as any));
    if (filters.type) conditions.push(eq(promotions.type, filters.type as any));
    if (filters.startDate) conditions.push(gte(promotions.startsAt, new Date(filters.startDate)));
    if (filters.endDate) conditions.push(lte(promotions.endsAt, new Date(filters.endDate)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await this.db
      .select()
      .from(promotions)
      .where(whereClause)
      .orderBy(desc(promotions.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data, meta: { page, limit } };
  }

  async findOne(id: string) {
    const promotion = await this.findOneEntity(id);
    return { success: true, data: promotion };
  }

  async delete(id: string) {
    await this.findOneEntity(id);
    await this.db.delete(promotions).where(eq(promotions.id, id));
    return { success: true, message: 'ลบโปรโมชั่นเรียบร้อย' };
  }

  async activate(id: string) {
    await this.findOneEntity(id);
    const [updated] = await this.db
      .update(promotions)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(promotions.id, id))
      .returning();
    return { success: true, data: updated };
  }

  async deactivate(id: string) {
    await this.findOneEntity(id);
    const [updated] = await this.db
      .update(promotions)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(promotions.id, id))
      .returning();
    return { success: true, data: updated };
  }

  /**
   * Validate a coupon code against order context.
   */
  async validateCoupon(
    code: string,
    patientId: string,
    orderAmount: number,
    patientTier?: string,
  ): Promise<CouponValidationResult> {
    const promotion = await this.db.query.promotions.findFirst({
      where: eq(promotions.code, code),
    });

    if (!promotion) {
      return { valid: false, errorMessage: 'ไม่พบรหัสคูปอง' };
    }

    if (promotion.status !== 'active') {
      return { valid: false, errorMessage: 'คูปองนี้ไม่สามารถใช้งานได้' };
    }

    // Check usage limit
    if (promotion.usageLimit != null && promotion.usageCount >= promotion.usageLimit) {
      return { valid: false, errorMessage: 'คูปองถูกใช้ครบจำนวนแล้ว' };
    }

    // Check minimum order amount
    const minOrder = parseFloat(promotion.minOrderAmount ?? '0');
    if (minOrder > 0 && orderAmount < minOrder) {
      return {
        valid: false,
        errorMessage: `ยอดสั่งซื้อขั้นต่ำ ${minOrder} บาท`,
      };
    }

    // Check tier requirement
    if (promotion.tierRequired) {
      const requiredRank = TIER_RANK[promotion.tierRequired] ?? 0;
      const patientRank = TIER_RANK[patientTier ?? 'bronze'] ?? 0;
      if (patientRank < requiredRank) {
        return {
          valid: false,
          errorMessage: `คูปองนี้สำหรับสมาชิกระดับ ${promotion.tierRequired} ขึ้นไป`,
        };
      }
    }

    // Check date range
    const now = new Date();
    if (promotion.startsAt && now < new Date(promotion.startsAt)) {
      return { valid: false, errorMessage: 'คูปองยังไม่เริ่มใช้งาน' };
    }
    if (promotion.endsAt && now > new Date(promotion.endsAt)) {
      return { valid: false, errorMessage: 'คูปองหมดอายุแล้ว' };
    }

    // Compute discount
    const discountAmount = this.computeDiscount(promotion, orderAmount);

    return {
      valid: true,
      promotion,
      discountAmount,
    };
  }

  /**
   * Apply a coupon to an order — increment usageCount and record discount.
   */
  async applyCoupon(promotionId: string, orderId: string) {
    const promotion = await this.findOneEntity(promotionId);

    // Increment usage count
    await this.db
      .update(promotions)
      .set({
        usageCount: sql`${promotions.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(promotions.id, promotionId));

    // Record discount on order
    const orderAmount = await this.getOrderAmount(orderId);
    const discountAmount = this.computeDiscount(promotion, orderAmount);

    await this.db
      .update(orders)
      .set({
        discountCode: promotion.code,
        discountAmount: String(discountAmount),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    this.logger.log(`Coupon ${promotion.code} applied to order ${orderId}, discount: ${discountAmount}`);
    return { success: true, discountAmount };
  }

  // --- Private helpers ---

  private async findOneEntity(id: string) {
    const promotion = await this.db.query.promotions.findFirst({
      where: eq(promotions.id, id),
    });
    if (!promotion) {
      throw new NotFoundException('ไม่พบโปรโมชั่น');
    }
    return promotion;
  }

  private validateTypeSpecificFields(dto: CreatePromotionDto) {
    if (dto.type === 'percentage_discount') {
      if (dto.value == null || dto.value < 1 || dto.value > 100) {
        throw new BadRequestException('ส่วนลดเปอร์เซ็นต์ต้องอยู่ระหว่าง 1–100');
      }
      if (dto.maxDiscount == null) {
        throw new BadRequestException('กรุณาระบุส่วนลดสูงสุด (maxDiscount)');
      }
    }

    if (dto.type === 'buy_x_get_y') {
      if (dto.buyQuantity == null || dto.buyQuantity < 1) {
        throw new BadRequestException('กรุณาระบุจำนวนซื้อ (buyQuantity)');
      }
      if (dto.getQuantity == null || dto.getQuantity < 1) {
        throw new BadRequestException('กรุณาระบุจำนวนแถม (getQuantity)');
      }
    }
  }

  private computeDiscount(promotion: any, orderAmount: number): number {
    const value = parseFloat(promotion.value ?? '0');
    const maxDiscount = parseFloat(promotion.maxDiscount ?? '0');

    switch (promotion.type) {
      case 'percentage_discount': {
        const raw = (orderAmount * value) / 100;
        return maxDiscount > 0 ? Math.min(raw, maxDiscount) : raw;
      }
      case 'fixed_discount':
        return Math.min(value, orderAmount);
      case 'free_delivery':
        return 0; // Delivery fee handled separately
      default:
        return 0;
    }
  }

  private async getOrderAmount(orderId: string): Promise<number> {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    return parseFloat(order.subtotal ?? order.totalAmount ?? '0');
  }
}
