import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { systemConfig } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';

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

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.db.select().from(systemConfig);
    return Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  }

  async set(key: string, value: unknown, updatedBy?: string) {
    const existing = await this.get(key);
    if (existing !== null) {
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
