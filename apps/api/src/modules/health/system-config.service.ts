import { Injectable, Inject } from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { systemConfig } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';

/** Keys that are sensitive — values are masked when reading. */
const SENSITIVE_KEYS = new Set([
  'line.channelSecret',
  'line.channelAccessToken',
  'payment.omiseSecretKey',
  'ai.geminiApiKey',
  'jwt.secret',
  'jwt.refreshSecret',
  'telemedicine.awsSecretAccessKey',
  'telemedicine.agoraAppCertificate',
  'telemedicine.thaiSmsApiKey',
  'telemedicine.auditEncryptionKey',
  'telemedicine.pharmacyCouncilApiKey',
  'odoo.apiToken',
  'meilisearch.masterKey',
]);

function maskValue(val: unknown): string {
  const s = String(val ?? '');
  if (s.length <= 8) return '••••••••';
  return s.slice(0, 4) + '••••' + s.slice(-4);
}

@Injectable()
export class SystemConfigService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  async get(key: string): Promise<unknown> {
    const [row] = await this.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);
    return row?.value ?? null;
  }

  /** Get raw value (unmasked) for internal use by other services. */
  async getResolved(key: string): Promise<string> {
    const val = await this.get(key);
    return val != null ? String(val) : '';
  }

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.db.select().from(systemConfig);
    return Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  }

  /** Get all configs by prefix, with sensitive values masked. */
  async getByPrefix(prefix: string): Promise<Record<string, unknown>> {
    const rows = await this.db
      .select()
      .from(systemConfig)
      .where(like(systemConfig.key, `${prefix}.%`));
    const result: Record<string, unknown> = {};
    for (const r of rows) {
      const shortKey = (r as any).key.replace(`${prefix}.`, '');
      const val = (r as any).value;
      result[shortKey] = SENSITIVE_KEYS.has((r as any).key) ? maskValue(val) : val;
    }
    return result;
  }

  async set(key: string, value: unknown, updatedBy?: string) {
    const [existing] = await this.db
      .select({ key: systemConfig.key })
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);

    if (existing) {
      await this.db
        .update(systemConfig)
        .set({ value, updatedBy, updatedAt: new Date() })
        .where(eq(systemConfig.key, key));
    } else {
      await this.db
        .insert(systemConfig)
        .values({ key, value, updatedBy, updatedAt: new Date() });
    }
  }

  async setMany(entries: { key: string; value: unknown }[], updatedBy?: string) {
    for (const { key, value } of entries) {
      await this.set(key, value, updatedBy);
    }
  }

  /** Set entries but skip masked/unchanged values (e.g. "abcd••••efgh"). */
  async setManySkipMasked(entries: { key: string; value: unknown }[], updatedBy?: string) {
    for (const { key, value } of entries) {
      const strVal = String(value ?? '');
      // Skip if value contains mask pattern — user didn't change it
      if (strVal.includes('••••')) continue;
      // Skip empty strings for sensitive keys — user cleared the field but we keep old value
      if (SENSITIVE_KEYS.has(key) && strVal === '') continue;
      await this.set(key, value, updatedBy);
    }
  }

  async getPharmacySettings() {
    const all = await this.getAll();
    return {
      pharmacyName: all['pharmacy.pharmacyName'] ?? 'REYA Pharmacy',
      phone: all['pharmacy.phone'] ?? '',
      email: all['pharmacy.email'] ?? '',
      address: all['pharmacy.address'] ?? '',
      openHours: all['pharmacy.openHours'] ?? '09:00-21:00',
    };
  }

  async getNotificationSettings() {
    const all = await this.getAll();
    return {
      newOrder: all['notifications.newOrder'] ?? true,
      lowStock: all['notifications.lowStock'] ?? true,
      rxPending: all['notifications.rxPending'] ?? true,
    };
  }
}
