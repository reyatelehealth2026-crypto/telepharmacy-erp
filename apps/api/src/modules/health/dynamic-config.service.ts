import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { systemConfig } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';

/**
 * DynamicConfigService — reads config from DB first, falls back to env.
 *
 * Usage in any service:
 *   const token = await this.dynamicConfig.resolve('line.channelAccessToken', 'LINE_CHANNEL_ACCESS_TOKEN');
 *
 * This allows Super Admin to override env values via the admin dashboard
 * without restarting the server or touching .env files.
 */
@Injectable()
export class DynamicConfigService {
  /** In-memory cache with TTL to avoid hitting DB on every request. */
  private cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /**
   * Resolve a config value: DB → env → defaultValue.
   * @param dbKey   Key in system_config table (e.g. "line.channelAccessToken")
   * @param envKey  Env variable name (e.g. "LINE_CHANNEL_ACCESS_TOKEN")
   * @param defaultValue  Fallback if neither DB nor env has a value
   */
  async resolve(dbKey: string, envKey: string, defaultValue = ''): Promise<string> {
    // Check cache first
    const cached = this.cache.get(dbKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Try DB
    const [row] = await this.db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, dbKey))
      .limit(1);

    if (row?.value != null && String(row.value) !== '') {
      const val = String(row.value);
      this.cache.set(dbKey, { value: val, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return val;
    }

    // Fallback to env
    const envVal = process.env[envKey] ?? defaultValue;
    this.cache.set(dbKey, { value: envVal, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return envVal;
  }

  /** Resolve as number. */
  async resolveNumber(dbKey: string, envKey: string, defaultValue: number): Promise<number> {
    const val = await this.resolve(dbKey, envKey, String(defaultValue));
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
  }

  /** Invalidate cache for a key or all keys. */
  invalidate(dbKey?: string) {
    if (dbKey) {
      this.cache.delete(dbKey);
    } else {
      this.cache.clear();
    }
  }
}
