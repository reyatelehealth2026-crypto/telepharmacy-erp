import { registerAs } from '@nestjs/config';

export const odooConfig = registerAs('odoo', () => ({
  baseUrl: process.env.ODOO_BASE_URL ?? 'https://erp.cnyrxapp.com',
  /** Api-User header — email of the Odoo API user */
  apiUser: process.env.ODOO_API_USER ?? '',
  /** User-Token header — ineco_gc token for the API user */
  apiToken: process.env.ODOO_API_TOKEN ?? '',
  webhookSecret: process.env.ODOO_WEBHOOK_SECRET ?? '',
  syncIntervalMs: parseInt(process.env.ODOO_SYNC_INTERVAL_MS ?? '1800000', 10),
  stockCacheTtlSec: parseInt(process.env.ODOO_STOCK_CACHE_TTL_SEC ?? '300', 10),
}));
