import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  OdooGetProductResponse,
  OdooNormalisedProduct,
  OdooProductItem,
} from './types/odoo.types';

const IMAGE_BASE = 'https://manager.cnypharmacy.com/uploads/product_photo';

@Injectable()
export class OdooService implements OnModuleInit {
  private readonly logger = new Logger(OdooService.name);
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly token: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('odoo.baseUrl') ?? '';
    this.token = this.config.get<string>('odoo.apiToken') ?? '';
    const apiUser = this.config.get<string>('odoo.apiUser') ?? '';
    this.headers = {
      'Content-Type': 'application/json',
      'Api-User': apiUser,
      'User-Token': this.token,
      // Cloudflare WAF blocks default Node.js/Python user-agents
      'User-Agent': 'Mozilla/5.0 (compatible; TelepharmacyERP/1.0)',
    };
  }

  onModuleInit() {
    if (!this.token) {
      this.logger.warn(
        'ODOO_API_TOKEN is not set — product sync disabled. ' +
          'Set ODOO_API_USER and ODOO_API_TOKEN from Odoo ineco_gc credentials.',
      );
    } else {
      this.logger.log(`Odoo integration ready: ${this.baseUrl}`);
    }
  }

  // ── Connection test ────────────────────────────────────────────────────────

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.token) {
      return { ok: false, message: 'ODOO_API_TOKEN not configured' };
    }
    try {
      const raw = await this.callGetProduct('0001');
      if (!raw) return { ok: false, message: 'No response from Odoo' };
      if (raw.error === 'Invalid Token') {
        return { ok: false, message: 'User-Token is invalid — check ODOO_API_TOKEN' };
      }
      const count = raw.products?.length ?? 0;
      return { ok: true, message: `Connected to Odoo (test product returned ${count} variant(s))` };
    } catch (err: any) {
      return { ok: false, message: `Connection failed: ${String(err?.message ?? err)}` };
    }
  }

  // ── Core API calls ─────────────────────────────────────────────────────────

  /** Fetch a single product by PRODUCT_CODE. Returns null on error. */
  async getProduct(productCode: string): Promise<OdooNormalisedProduct | null> {
    const raw = await this.callGetProduct(productCode);
    if (!raw?.products?.length) return null;
    return this.normalise(raw.products[0]!);
  }

  /** Fetch multiple products by code — sequential to avoid hammering Odoo. */
  async getProductBatch(
    productCodes: string[],
  ): Promise<Map<string, OdooNormalisedProduct>> {
    const map = new Map<string, OdooNormalisedProduct>();
    for (const code of productCodes) {
      const p = await this.getProduct(code);
      if (p) map.set(code, p);
    }
    return map;
  }

  /** Fetch real-time stock qty for a product code. Returns null when not found. */
  async getStock(productCode: string): Promise<number | null> {
    const raw = await this.callGetProduct(productCode);
    if (!raw?.products?.length) return null;
    return raw.products[0]!.saleable_qty ?? null;
  }

  /** Batch stock lookup — returns Map<odooCode, qty>. */
  async getStockBatch(productCodes: string[]): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    await Promise.allSettled(
      productCodes.map(async (code) => {
        const qty = await this.getStock(code);
        if (qty !== null) results.set(code, qty);
      }),
    );
    return results;
  }

  /**
   * Probe image server to discover all product codes that have images.
   * Scans codes 0001–9999 in parallel batches.
   */
  async discoverProductCodes(maxCode = 1000, batchSize = 50): Promise<string[]> {
    this.logger.log(`Discovering product codes with images (0001–${String(maxCode).padStart(4, '0')})...`);
    const found: string[] = [];

    for (let start = 1; start <= maxCode; start += batchSize) {
      const end = Math.min(start + batchSize - 1, maxCode);
      const batch = Array.from({ length: end - start + 1 }, (_, i) =>
        String(start + i).padStart(4, '0'),
      );

      const results = await Promise.allSettled(
        batch.map(async (code) => {
          const url = `${IMAGE_BASE}/${code}.jpg`;
          const res = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });
          const size = parseInt(res.headers.get('content-length') ?? '0', 10);
          // Real product image > 5KB; placeholder is ~1KB
          if (res.ok && size > 5000) return code;
          return null;
        }),
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) found.push(r.value);
      }

      this.logger.debug(`Scanned ${end}/${maxCode}, found ${found.length} so far`);
    }

    this.logger.log(`Discovery complete: ${found.length} product codes with images`);
    return found;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async callGetProduct(productCode: string): Promise<OdooGetProductResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/ineco_gc/get_product`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ PRODUCT_CODE: productCode }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(`Odoo get_product [${productCode}] HTTP ${res.status}`);
        return null;
      }
      const json = (await res.json()) as { result?: OdooGetProductResponse };
      return json.result ?? null;
    } catch (err) {
      this.logger.error(`Odoo get_product [${productCode}] error: ${String(err)}`);
      return null;
    }
  }

  /** Construct image URL from product_code */
  static buildImageUrl(productCode: string): string {
    return `${IMAGE_BASE}/${productCode}.jpg`;
  }

  /** Map raw Odoo product item → internal normalised shape */
  normalise(item: OdooProductItem): OdooNormalisedProduct {
    const onlineEntry = item.product_price_ids.find((p) => p.price_code === '005');
    const code = item.product_code;
    return {
      odooId: item.product_id,
      odooCode: code,
      sku: item.sku,
      barcode: item.barcode || null,
      nameTh: item.name,
      nameEn: item.name_2 || null,
      genericName: item.generic_name || null,
      description: item.benefit || null,
      howToUse: item.how_to_use || null,
      caution: item.caution || null,
      category: item.category || null,
      listPrice: item.list_price,
      onlinePrice: onlineEntry?.price ?? null,
      stockQty: item.saleable_qty ?? 0,
      isActive: item.active,
      imageUrl: code ? OdooService.buildImageUrl(code) : null,
      prices: item.product_price_ids,
      vendors: item.vendor_product,
      unit: item.uom_name || 'ชิ้น',
    };
  }
}
