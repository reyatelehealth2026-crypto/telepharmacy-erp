import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';
import * as schema from '@telepharmacy/db';
import { desc, and, eq, gte, lte, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

const { telemedicineAuditLog } = schema;

export interface AuditEvent {
  actorId: string;
  actorType: 'patient' | 'pharmacist' | 'system' | 'admin';
  actionType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: { lat: number; lng: number; accuracy: number };
  sessionId?: string;
}

export interface AuditSearchFilters {
  actorId?: string;
  actorType?: string;
  actionType?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogEntry {
  id: string;
  previousHash: string;
  currentHash: string;
  timestamp: Date;
  actorId: string;
  actorType: string;
  actionType: string;
  entityType: string;
  entityId: string;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  geolocation: any;
  sessionId: string | null;
  createdAt: Date;
}

@Injectable()
export class TelemedicineAuditService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly config: ConfigService,
  ) {
    const keyHex = config.get<string>('telemedicine.audit.encryptionKey');
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('Audit encryption key must be a 64-character hex string (32 bytes)');
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  /**
   * Log an audit event with hash chaining for tamper detection
   */
  async log(event: AuditEvent): Promise<void> {
    // 1. Get previous hash for blockchain-inspired chain
    const previousHash = await this.getLatestHash();

    // 2. Encrypt sensitive metadata using AES-256-GCM
    const encryptedMetadata = event.metadata
      ? this.encryptData(JSON.stringify(event.metadata))
      : null;

    // 3. Create log entry with millisecond precision timestamp
    const logEntry = {
      previousHash,
      timestamp: new Date(),
      actorId: event.actorId,
      actorType: event.actorType,
      actionType: event.actionType,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: encryptedMetadata,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      geolocation: event.geolocation || null,
      sessionId: event.sessionId || null,
    };

    // 4. Calculate current hash using SHA-256
    const currentHash = this.calculateHash(logEntry);

    // 5. Insert into append-only table
    await this.db.insert(telemedicineAuditLog).values({
      ...logEntry,
      currentHash,
    });
  }

  /**
   * Get the latest hash from the chain (for linking next entry)
   */
  private async getLatestHash(): Promise<string> {
    const [latest] = await this.db
      .select({ hash: telemedicineAuditLog.currentHash })
      .from(telemedicineAuditLog)
      .orderBy(desc(telemedicineAuditLog.timestamp))
      .limit(1);

    // Genesis hash (first entry in chain)
    return latest?.hash || '0'.repeat(64);
  }

  /**
   * Calculate SHA-256 hash for tamper detection
   */
  private calculateHash(entry: any): string {
    // Create deterministic string representation
    const data = [
      entry.previousHash,
      entry.timestamp.toISOString(),
      entry.actorId,
      entry.actorType,
      entry.actionType,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.metadata),
      entry.ipAddress || '',
      entry.sessionId || '',
    ].join('|');

    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  private encryptData(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  private decryptData(encryptedData: string): string {
    if (!encryptedData) {
      throw new Error('Encrypted data is required');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const ivHex = parts[0];
    const authTagHex = parts[1];
    const encryptedText = parts[2];

    if (!ivHex || !authTagHex || !encryptedText) {
      throw new Error('Invalid encrypted data parts');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = decipher.update(encryptedText, 'hex', 'utf8') + decipher.final('utf8');

    return decrypted;
  }

  /**
   * Search audit logs with filters
   */
  async search(filters: AuditSearchFilters): Promise<{
    logs: AuditLogEntry[];
    total: number;
  }> {
    const conditions = [];

    if (filters.actorId) {
      conditions.push(eq(telemedicineAuditLog.actorId, filters.actorId));
    }
    if (filters.actorType) {
      conditions.push(eq(telemedicineAuditLog.actorType, filters.actorType));
    }
    if (filters.actionType) {
      conditions.push(eq(telemedicineAuditLog.actionType, filters.actionType));
    }
    if (filters.entityType) {
      conditions.push(eq(telemedicineAuditLog.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(telemedicineAuditLog.entityId, filters.entityId));
    }
    if (filters.startDate) {
      conditions.push(gte(telemedicineAuditLog.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(telemedicineAuditLog.timestamp, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(telemedicineAuditLog)
      .where(whereClause);

    // Get paginated results
    const logs = await this.db
      .select()
      .from(telemedicineAuditLog)
      .where(whereClause)
      .orderBy(desc(telemedicineAuditLog.timestamp))
      .limit(filters.limit || 100)
      .offset(filters.offset || 0);

    // Decrypt metadata for authorized access
    const decryptedLogs = logs.map((log: any) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(this.decryptData(log.metadata)) : null,
    }));

    return {
      logs: decryptedLogs,
      total: count,
    };
  }

  /**
   * Verify hash chain integrity
   */
  async verifyChainIntegrity(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    valid: boolean;
    totalEntries: number;
    invalidEntries: string[];
    errors: string[];
  }> {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(telemedicineAuditLog.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(telemedicineAuditLog.timestamp, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await this.db
      .select()
      .from(telemedicineAuditLog)
      .where(whereClause)
      .orderBy(telemedicineAuditLog.timestamp);

    const invalidEntries: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i] as any;

      // Verify hash calculation
      const calculatedHash = this.calculateHash({
        previousHash: log.previousHash,
        timestamp: log.timestamp,
        actorId: log.actorId,
        actorType: log.actorType,
        actionType: log.actionType,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        sessionId: log.sessionId,
      });

      if (calculatedHash !== log.currentHash) {
        invalidEntries.push(log.id);
        errors.push(
          `Entry ${log.id}: Hash mismatch (expected: ${log.currentHash}, calculated: ${calculatedHash})`,
        );
      }

      // Verify chain linkage (except for first entry)
      if (i > 0) {
        const previousLog = logs[i - 1];
        if (log.previousHash !== previousLog.currentHash) {
          invalidEntries.push(log.id);
          errors.push(
            `Entry ${log.id}: Chain broken (previousHash: ${log.previousHash}, expected: ${previousLog.currentHash})`,
          );
        }
      }
    }

    return {
      valid: invalidEntries.length === 0,
      totalEntries: logs.length,
      invalidEntries,
      errors,
    };
  }

  /**
   * Export audit logs to CSV format
   */
  async exportToCsv(filters: AuditSearchFilters): Promise<string> {
    const { logs } = await this.search({ ...filters, limit: 10000 });

    const headers = [
      'ID',
      'Timestamp',
      'Actor ID',
      'Actor Type',
      'Action Type',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'Session ID',
      'Hash',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toISOString(),
      log.actorId,
      log.actorType,
      log.actionType,
      log.entityType,
      log.entityId,
      log.ipAddress || '',
      log.sessionId || '',
      log.currentHash,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}
