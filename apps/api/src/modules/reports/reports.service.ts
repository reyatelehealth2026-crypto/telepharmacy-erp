import { Injectable, Inject, Logger } from '@nestjs/common';
import { sql, eq, and, gte, lte, count } from 'drizzle-orm';
import {
  orders,
  prescriptions,
  pharmacistInterventions,
  patients,
  inventoryLots,
  products,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async getDashboardSummary(from: Date, to: Date) {
    const [salesResult, orderCountResult, rxResult, interventionResult, newPatientResult] =
      await Promise.all([
        // Total sales
        this.db
          .select({
            total: sql<string>`coalesce(sum(${orders.totalAmount}::numeric), 0)`,
            count: sql<number>`count(*)::int`,
          })
          .from(orders)
          .where(
            and(
              gte(orders.createdAt, from),
              lte(orders.createdAt, to),
              sql`${orders.status} NOT IN ('cancelled', 'draft')`,
            ),
          ),

        // Orders by status
        this.db
          .select({
            status: orders.status,
            count: sql<number>`count(*)::int`,
          })
          .from(orders)
          .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
          .groupBy(orders.status),

        // Prescriptions summary
        this.db
          .select({
            total: sql<number>`count(*)::int`,
            verified: sql<number>`count(*) filter (where ${prescriptions.status} in ('approved', 'dispensing', 'dispensed', 'counseling', 'counseling_completed', 'shipped', 'delivered'))::int`,
            rejected: sql<number>`count(*) filter (where ${prescriptions.status} = 'rejected')::int`,
            pending: sql<number>`count(*) filter (where ${prescriptions.status} in ('received', 'ai_processing', 'ai_completed', 'pharmacist_reviewing'))::int`,
          })
          .from(prescriptions)
          .where(
            and(gte(prescriptions.createdAt, from), lte(prescriptions.createdAt, to)),
          ),

        // Interventions count
        this.db
          .select({
            total: sql<number>`count(*)::int`,
          })
          .from(pharmacistInterventions)
          .where(
            and(
              gte(pharmacistInterventions.createdAt, from),
              lte(pharmacistInterventions.createdAt, to),
            ),
          ),

        // New patients
        this.db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(patients)
          .where(
            and(gte(patients.createdAt, from), lte(patients.createdAt, to)),
          ),
      ]);

    const totalSales = parseFloat(salesResult[0]?.total ?? '0');
    const totalOrders = salesResult[0]?.count ?? 0;
    const aov = totalOrders > 0 ? totalSales / totalOrders : 0;

    const rx = rxResult[0] ?? { total: 0, verified: 0, rejected: 0, pending: 0 };
    const interventionRate =
      rx.total > 0
        ? ((interventionResult[0]?.total ?? 0) / rx.total) * 100
        : 0;

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      sales: {
        totalAmount: totalSales,
        totalOrders,
        aov: Math.round(aov * 100) / 100,
      },
      ordersByStatus: orderCountResult,
      prescriptions: {
        total: rx.total,
        verified: rx.verified,
        rejected: rx.rejected,
        pending: rx.pending,
        verifyRate: rx.total > 0 ? Math.round((rx.verified / rx.total) * 10000) / 100 : 0,
      },
      interventions: {
        total: interventionResult[0]?.total ?? 0,
        rate: Math.round(interventionRate * 100) / 100,
      },
      newPatients: newPatientResult[0]?.count ?? 0,
    };
  }

  async getDailySales(from: Date, to: Date) {
    const rows = await this.db
      .select({
        date: sql<string>`date_trunc('day', ${orders.createdAt})::date::text`,
        totalAmount: sql<string>`coalesce(sum(${orders.totalAmount}::numeric), 0)`,
        orderCount: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, from),
          lte(orders.createdAt, to),
          sql`${orders.status} NOT IN ('cancelled', 'draft')`,
        ),
      )
      .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt})`);

    return rows.map((r: any) => ({
      date: r.date,
      totalAmount: parseFloat(r.totalAmount),
      orderCount: r.orderCount,
    }));
  }

  async getTopProducts(from: Date, to: Date, limit = 10) {
    const rows = await this.db.execute(sql`
      SELECT
        oi.product_id,
        oi.product_name,
        oi.sku,
        SUM(oi.quantity::numeric) AS total_qty,
        SUM(oi.total_price::numeric) AS total_revenue,
        COUNT(DISTINCT o.id)::int AS order_count
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= ${from}
        AND o.created_at <= ${to}
        AND o.status NOT IN ('cancelled', 'draft')
      GROUP BY oi.product_id, oi.product_name, oi.sku
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `);

    return rows.rows ?? rows;
  }

  async getRxVolume(from: Date, to: Date) {
    const rows = await this.db
      .select({
        date: sql<string>`date_trunc('day', ${prescriptions.createdAt})::date::text`,
        total: sql<number>`count(*)::int`,
        verified: sql<number>`count(*) filter (where ${prescriptions.verifiedAt} is not null)::int`,
        avgVerifyMinutes: sql<string>`coalesce(
          round(avg(extract(epoch from (${prescriptions.verifiedAt} - ${prescriptions.createdAt})) / 60) filter (where ${prescriptions.verifiedAt} is not null), 1),
          0
        )`,
      })
      .from(prescriptions)
      .where(
        and(gte(prescriptions.createdAt, from), lte(prescriptions.createdAt, to)),
      )
      .groupBy(sql`date_trunc('day', ${prescriptions.createdAt})`)
      .orderBy(sql`date_trunc('day', ${prescriptions.createdAt})`);

    return rows.map((r: any) => ({
      date: r.date,
      total: r.total,
      verified: r.verified,
      avgVerifyMinutes: parseFloat(r.avgVerifyMinutes),
    }));
  }

  async getInterventionsByType(from: Date, to: Date) {
    const rows = await this.db
      .select({
        interventionType: pharmacistInterventions.interventionType,
        count: sql<number>`count(*)::int`,
      })
      .from(pharmacistInterventions)
      .where(
        and(
          gte(pharmacistInterventions.createdAt, from),
          lte(pharmacistInterventions.createdAt, to),
        ),
      )
      .groupBy(pharmacistInterventions.interventionType)
      .orderBy(sql`count(*) desc`);

    return rows;
  }

  async getLowStockSummary() {
    const rows = await this.db.execute(sql`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.stock_qty,
        p.reorder_level,
        COALESCE(
          (SELECT SUM(il.quantity_remaining::numeric)
           FROM inventory_lots il
           WHERE il.product_id = p.id AND il.quantity_remaining > 0),
          0
        ) AS lot_qty_remaining
      FROM products p
      WHERE p.stock_qty <= p.reorder_level
        AND p.status = 'active'
      ORDER BY (p.stock_qty::numeric / NULLIF(p.reorder_level, 0)) ASC
      LIMIT 50
    `);

    return rows.rows ?? rows;
  }

  async getExpiryReport(withinDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    const rows = await this.db.execute(sql`
      SELECT
        il.id AS lot_id,
        il.lot_no,
        p.name AS product_name,
        p.sku,
        il.quantity_remaining,
        il.expiry_date,
        EXTRACT(day FROM il.expiry_date::timestamp - now()) AS days_until_expiry
      FROM inventory_lots il
      JOIN products p ON p.id = il.product_id
      WHERE il.quantity_remaining > 0
        AND il.expiry_date IS NOT NULL
        AND il.expiry_date <= ${cutoff.toISOString().split('T')[0]}
      ORDER BY il.expiry_date ASC
      LIMIT 100
    `);

    return rows.rows ?? rows;
  }
}
