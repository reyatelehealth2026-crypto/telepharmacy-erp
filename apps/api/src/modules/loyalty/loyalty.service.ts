import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, and, lte, sql } from 'drizzle-orm';
import {
  loyaltyAccounts,
  pointsTransactions,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { RedeemPointsDto } from './dto/redeem-points.dto';

/** Tier thresholds based on lifetime_spent (THB) */
const TIER_THRESHOLDS: Array<{ tier: string; minSpent: number }> = [
  { tier: 'platinum', minSpent: 30000 },
  { tier: 'gold', minSpent: 10000 },
  { tier: 'silver', minSpent: 5000 },
  { tier: 'bronze', minSpent: 0 },
];

/** 1 point = ฿0.10 discount */
const POINT_VALUE = 0.10;

/** 1 THB spent = 1 point earned */
const EARN_RATE = 1;

const TIER_BENEFITS: Record<string, string[]> = {
  bronze: ['สะสมแต้ม 1 แต้ม/฿1'],
  silver: ['ส่วนลด 5%', 'สะสมแต้ม 1.5x'],
  gold: ['ส่วนลด 10%', 'จัดส่งฟรีทุกออเดอร์', 'สะสมแต้ม 2x'],
  platinum: ['ส่วนลด 15%', 'จัดส่งฟรี + ด่วน', 'สะสมแต้ม 3x', 'เภสัชกรส่วนตัว'],
};

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /**
   * Get or create a loyalty account for a patient.
   */
  async getOrCreateAccount(patientId: string) {
    let account = await this.db.query.loyaltyAccounts.findFirst({
      where: eq(loyaltyAccounts.patientId, patientId),
    });

    if (!account) {
      const [created] = await this.db
        .insert(loyaltyAccounts)
        .values({
          patientId,
          currentPoints: 0,
          lifetimePoints: 0,
          lifetimeSpent: '0',
          tier: 'bronze',
        })
        .returning();
      account = created;
      this.logger.log(`Created loyalty account for patient ${patientId}`);
    }

    return account;
  }

  /**
   * Earn points from a completed order.
   * Base rate: 1 point per ฿1 spent. Multiplied by tier bonus.
   */
  async earnPoints(patientId: string, orderId: string, amount: number) {
    const account = await this.getOrCreateAccount(patientId);

    const multiplier = this.getTierMultiplier(account.tier);
    const basePoints = Math.floor(amount * EARN_RATE);
    const earnedPoints = Math.floor(basePoints * multiplier);
    const newBalance = account.currentPoints + earnedPoints;
    const newLifetime = account.lifetimePoints + earnedPoints;
    const newLifetimeSpent = parseFloat(account.lifetimeSpent ?? '0') + amount;

    await this.db
      .update(loyaltyAccounts)
      .set({
        currentPoints: newBalance,
        lifetimePoints: newLifetime,
        lifetimeSpent: String(newLifetimeSpent),
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.id, account.id));

    await this.db.insert(pointsTransactions).values({
      loyaltyAccountId: account.id,
      type: 'earned_purchase',
      points: earnedPoints,
      balanceAfter: newBalance,
      referenceType: 'order',
      referenceId: orderId,
      description: `ได้รับ ${earnedPoints} แต้ม จากคำสั่งซื้อ (${multiplier}x)`,
      expiresAt: this.getPointsExpiry(),
    });

    await this.checkAndUpgradeTier(account.id, newLifetimeSpent);

    this.logger.log(`Patient ${patientId} earned ${earnedPoints} points from order ${orderId}`);

    return {
      success: true,
      earnedPoints,
      multiplier,
      newBalance,
    };
  }

  /**
   * Redeem points for a discount.
   */
  async redeemPoints(patientId: string, dto: RedeemPointsDto) {
    const account = await this.getOrCreateAccount(patientId);

    if (dto.points > account.currentPoints) {
      throw new BadRequestException(
        `Insufficient points. Available: ${account.currentPoints}, requested: ${dto.points}`,
      );
    }

    const discountAmount = dto.points * POINT_VALUE;
    const newBalance = account.currentPoints - dto.points;

    await this.db
      .update(loyaltyAccounts)
      .set({
        currentPoints: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.id, account.id));

    await this.db.insert(pointsTransactions).values({
      loyaltyAccountId: account.id,
      type: 'redeemed',
      points: -dto.points,
      balanceAfter: newBalance,
      referenceType: dto.orderId ? 'order' : null,
      referenceId: dto.orderId ?? null,
      description: `แลก ${dto.points} แต้ม ได้ส่วนลด ฿${discountAmount.toFixed(2)}`,
    });

    this.logger.log(`Patient ${patientId} redeemed ${dto.points} points`);

    return {
      success: true,
      discountAmount,
      remainingPoints: newBalance,
      message: `แลก ${dto.points} แต้ม ได้ส่วนลด ฿${discountAmount.toFixed(2)}`,
    };
  }

  /**
   * Check and upgrade/downgrade tier based on lifetime_spent.
   */
  async checkAndUpgradeTier(accountId: string, lifetimeSpent: number) {
    const account = await this.db.query.loyaltyAccounts.findFirst({
      where: eq(loyaltyAccounts.id, accountId),
    });

    if (!account) return;

    let newTier = 'bronze';
    for (const threshold of TIER_THRESHOLDS) {
      if (lifetimeSpent >= threshold.minSpent) {
        newTier = threshold.tier;
        break;
      }
    }

    if (newTier !== account.tier) {
      const isUpgrade = TIER_THRESHOLDS.findIndex(t => t.tier === newTier)
        < TIER_THRESHOLDS.findIndex(t => t.tier === account.tier);

      await this.db
        .update(loyaltyAccounts)
        .set({
          tier: newTier,
          tierUpgradeAt: isUpgrade ? new Date() : account.tierUpgradeAt,
          tierLastCalculated: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(loyaltyAccounts.id, accountId));

      this.logger.log(`Account ${accountId} tier changed: ${account.tier} → ${newTier}`);
    }

    return newTier;
  }

  /**
   * Get loyalty info for patient — account, recent transactions, expiring points, next tier.
   */
  async getMyLoyalty(patientId: string) {
    const account = await this.getOrCreateAccount(patientId);

    const recentTransactions = await this.db
      .select()
      .from(pointsTransactions)
      .where(eq(pointsTransactions.loyaltyAccountId, account.id))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(10);

    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 30);

    const expiringSoon = await this.db
      .select()
      .from(pointsTransactions)
      .where(
        and(
          eq(pointsTransactions.loyaltyAccountId, account.id),
          eq(pointsTransactions.type, 'earned_purchase'),
          sql`${pointsTransactions.expiresAt} IS NOT NULL`,
          sql`${pointsTransactions.expiresAt} <= ${thirtyDaysLater.toISOString()}`,
          sql`${pointsTransactions.expiresAt} > ${now.toISOString()}`,
          sql`${pointsTransactions.points} > 0`,
        ),
      );

    const lifetimeSpent = parseFloat(account.lifetimeSpent ?? '0');
    const currentTierIdx = TIER_THRESHOLDS.findIndex(t => t.tier === account.tier);
    const nextTierInfo = currentTierIdx > 0 ? TIER_THRESHOLDS[currentTierIdx - 1] : null;

    return {
      success: true,
      data: {
        tier: account.tier,
        currentPoints: account.currentPoints,
        lifetimePoints: account.lifetimePoints,
        lifetimeSpent,
        nextTier: nextTierInfo
          ? {
              name: nextTierInfo.tier,
              requiredSpent: nextTierInfo.minSpent,
              remaining: nextTierInfo.minSpent - lifetimeSpent,
              benefits: TIER_BENEFITS[nextTierInfo.tier] ?? [],
            }
          : null,
        recentTransactions: recentTransactions.map((t: any) => ({
          type: t.type,
          points: t.points,
          description: t.description,
          date: t.createdAt,
        })),
        expiringSoon: expiringSoon.map((t: any) => ({
          points: t.points,
          expiresAt: t.expiresAt,
        })),
      },
    };
  }

  /**
   * Get full transaction history with pagination.
   */
  async getTransactionHistory(patientId: string, page: number = 1, limit: number = 20) {
    const account = await this.getOrCreateAccount(patientId);
    const offset = (page - 1) * limit;

    const transactions = await this.db
      .select()
      .from(pointsTransactions)
      .where(eq(pointsTransactions.loyaltyAccountId, account.id))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data: transactions, meta: { page, limit } };
  }

  /**
   * Staff manual adjustment.
   */
  async adjustPoints(patientId: string, points: number, reason: string, staffId: string) {
    const account = await this.getOrCreateAccount(patientId);

    const newBalance = account.currentPoints + points;
    if (newBalance < 0) {
      throw new BadRequestException(`Adjustment would result in negative balance: ${newBalance}`);
    }

    await this.db
      .update(loyaltyAccounts)
      .set({
        currentPoints: newBalance,
        lifetimePoints: points > 0 ? account.lifetimePoints + points : account.lifetimePoints,
        updatedAt: new Date(),
      })
      .where(eq(loyaltyAccounts.id, account.id));

    await this.db.insert(pointsTransactions).values({
      loyaltyAccountId: account.id,
      type: 'adjusted',
      points,
      balanceAfter: newBalance,
      description: `${reason} (by staff ${staffId})`,
    });

    this.logger.log(`Staff ${staffId} adjusted ${points} points for patient ${patientId}: ${reason}`);

    return {
      success: true,
      adjustedPoints: points,
      newBalance,
    };
  }

  // --- Private helpers ---

  private getTierMultiplier(tier: string): number {
    const multipliers: Record<string, number> = {
      bronze: 1,
      silver: 1.5,
      gold: 2,
      platinum: 3,
    };
    return multipliers[tier] ?? 1;
  }

  private getPointsExpiry(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }
}
