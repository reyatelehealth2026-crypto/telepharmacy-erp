import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { auditLog } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async log(params: {
    tableName: string;
    recordId: string;
    action: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    changedBy?: string;
    ipAddress?: string;
  }) {
    try {
      await this.db.insert(auditLog).values({
        tableName: params.tableName,
        recordId: params.recordId,
        action: params.action,
        oldValues: params.oldValues ?? null,
        newValues: params.newValues ?? null,
        changedBy: params.changedBy ?? null,
        ipAddress: params.ipAddress ?? null,
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`);
    }
  }

  async query(filters: {
    tableName?: string;
    recordId?: string;
    action?: string;
    changedBy?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (filters.tableName) conditions.push(eq(auditLog.tableName, filters.tableName));
    if (filters.recordId) conditions.push(eq(auditLog.recordId, filters.recordId));
    if (filters.action) conditions.push(eq(auditLog.action, filters.action));
    if (filters.changedBy) conditions.push(eq(auditLog.changedBy, filters.changedBy));

    const query = this.db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.changedAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) query.where(and(...conditions));

    const rows = await query;
    return { data: rows, page, limit };
  }
}
