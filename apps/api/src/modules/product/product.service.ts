import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, ilike, and, sql, asc, desc, or } from 'drizzle-orm';
import { products } from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { OdooService } from '../odoo/odoo.service';
import type { ProductQueryDto } from './dto/product-query.dto';
import type { OdooNormalisedProduct } from '../odoo/types/odoo.types';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  /** In-memory stock cache: key = odooCode, value = { qty, expiresAt } */
  private readonly stockCache = new Map<string, { qty: number; expiresAt: number }>();
  private readonly stockCacheTtlMs: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly odooService: OdooService,
    private readonly config: ConfigService,
  ) {
    const ttlSec = this.config.get<number>('odoo.stockCacheTtlSec') ?? 300;
    this.stockCacheTtlMs = ttlSec * 1000;
  }

  // ── List products ──────────────────────────────────────────────────────────

  async findAll(query: ProductQueryDto) {
    const {
      search,
      categoryId,
      drugClassification,
      requiresPrescription,
      inStockOnly,
      isFeatured,
      page = 1,
      limit = 20,
      sortBy = 'sortOrder',
      sortOrder = 'asc',
    } = query;

    const conditions: any[] = [eq(products.status, 'active')];

    if (search) {
      conditions.push(
        or(
          ilike(products.nameTh, `%${search}%`),
          ilike(products.nameEn ?? products.nameTh, `%${search}%`),
          ilike(products.brand ?? products.nameTh, `%${search}%`),
          ilike(products.genericName ?? products.nameTh, `%${search}%`),
          ilike(products.sku, `%${search}%`),
        ),
      );
    }

    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (drugClassification)
      conditions.push(eq(products.drugClassification, drugClassification as any));
    if (requiresPrescription !== undefined)
      conditions.push(eq(products.requiresPrescription, requiresPrescription));
    if (isFeatured) conditions.push(eq(products.isFeatured, true));
    if (inStockOnly) conditions.push(sql`${products.stockQty} > 0`);

    const where = and(...conditions);
    const sortCol = this.getSortColumn(sortBy);
    const orderFn = sortOrder === 'desc' ? desc : asc;

    const [rows, countResult] = await Promise.all([
      this.db
        .select({
          id: products.id,
          sku: products.sku,
          odooCode: products.odooCode,
          nameTh: products.nameTh,
          nameEn: products.nameEn,
          slug: products.slug,
          brand: products.brand,
          genericName: products.genericName,
          drugClassification: products.drugClassification,
          requiresPrescription: products.requiresPrescription,
          requiresPharmacist: products.requiresPharmacist,
          dosageForm: products.dosageForm,
          strength: products.strength,
          packSize: products.packSize,
          unit: products.unit,
          images: products.images,
          sellPrice: products.sellPrice,
          memberPrice: products.memberPrice,
          comparePrice: products.comparePrice,
          stockQty: products.stockQty,
          stockSyncAt: products.stockSyncAt,
          minStock: products.minStock,
          reorderPoint: products.reorderPoint,
          isFeatured: products.isFeatured,
          isNew: products.isNew,
          tags: products.tags,
          status: products.status,
          categoryId: products.categoryId,
          shortDescription: products.shortDescription,
          howToUse: products.howToUse,
          warnings: products.warnings,
          barcode: products.barcode,
        })
        .from(products)
        .where(where)
        .orderBy(orderFn(sortCol))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      data: rows.map((r: any) => this.formatProduct(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Single product ─────────────────────────────────────────────────────────

  async findOne(identifier: string, withRealTimeStock = false) {
    const row = await this.findByIdentifier(identifier);
    if (!row) throw new NotFoundException('ไม่พบสินค้า');

    const formatted = this.formatProduct(row);

    if (withRealTimeStock && row.odooCode) {
      const liveQty = await this.getLiveStock(row.odooCode);
      if (liveQty !== null) {
        formatted.stockQty = liveQty;
        formatted.inStock = liveQty > 0;
        this.updateStockInDb(row.id, liveQty).catch(() => {});
      }
    }

    return formatted;
  }

  private async findByIdentifier(identifier: string) {
    const conditions: any[] = [
      eq(products.slug, identifier),
      eq(products.sku, identifier),
    ];

    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    if (uuidLike) {
      conditions.unshift(eq(products.id, identifier));
    }

    const shortSkuMatch = /^sku(\d+)$/i.exec(identifier)?.[1];
    if (shortSkuMatch) {
      conditions.push(
        ilike(products.sku, `${shortSkuMatch}%`),
        ilike(products.odooCode, `${shortSkuMatch}%`),
      );
    }

    const [row] = await this.db
      .select()
      .from(products)
      .where(or(...conditions))
      .limit(1);

    return row ?? null;
  }

  // ── Real-time stock ────────────────────────────────────────────────────────

  async getStock(identifier: string) {
    const [row] = await this.db
      .select({ id: products.id, odooCode: products.odooCode, stockQty: products.stockQty })
      .from(products)
      .where(
        or(
          eq(products.id, identifier),
          eq(products.slug, identifier),
          eq(products.sku, identifier),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('ไม่พบสินค้า');

    if (!row.odooCode) {
      return { productId: row.id, qty: Number(row.stockQty ?? 0), source: 'db' as const };
    }

    const liveQty = await this.getLiveStock(row.odooCode);
    if (liveQty !== null) {
      this.updateStockInDb(row.id, liveQty).catch(() => {});
      return { productId: row.id, qty: liveQty, source: 'odoo' as const };
    }

    return { productId: row.id, qty: Number(row.stockQty ?? 0), source: 'db_fallback' as const };
  }

  // ── Odoo connection test ───────────────────────────────────────────────────

  async checkOdooConnection() {
    return this.odooService.testConnection();
  }

  // ── Discover & bulk sync all products from image server ────────────────────

  async syncAllFromOdoo(maxCode = 1000): Promise<{
    discovered: number;
    synced: number;
    errors: number;
    skipped: number;
    details: string[];
  }> {
    this.logger.log(`Starting full sync: discovering product codes 0001–${String(maxCode).padStart(4, '0')}...`);

    const codes = await this.odooService.discoverProductCodes(maxCode);
    this.logger.log(`Discovered ${codes.length} product codes with images`);

    let synced = 0;
    let errors = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const code of codes) {
      try {
        const product = await this.odooService.getProduct(code);
        if (!product) {
          skipped++;
          details.push(`SKIP ${code}: not found in Odoo`);
          continue;
        }
        await this.upsertFromOdoo(product);
        synced++;
        details.push(`OK ${code}: ${product.nameTh} (฿${product.onlinePrice ?? product.listPrice})`);
      } catch (err) {
        this.logger.error(`Failed to upsert product ${code}`, err);
        errors++;
        details.push(`ERR ${code}: ${String(err)}`);
      }
    }

    this.logger.log(`Full sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors`);
    return { discovered: codes.length, synced, errors, skipped, details };
  }

  // ── Sync a single product by Odoo code ────────────────────────────────────

  async syncOneByOdooCode(odooCode: string): Promise<{ ok: boolean; message: string }> {
    const product = await this.odooService.getProduct(odooCode);
    if (!product) {
      return { ok: false, message: `Product ${odooCode} not found in Odoo` };
    }
    await this.upsertFromOdoo(product);
    return { ok: true, message: `Synced product ${odooCode}: ${product.nameTh}` };
  }

  // ── Bulk sync (list of codes) ──────────────────────────────────────────────

  async syncFromOdoo(
    odooCodes?: string[],
  ): Promise<{ synced: number; errors: number; details: string[] }> {
    this.logger.log('Starting Odoo product sync...');

    // If no codes provided, re-sync all products that already have an odooCode in DB
    if (!odooCodes?.length) {
      const existing = await this.db
        .select({ odooCode: products.odooCode })
        .from(products)
        .where(sql`${products.odooCode} IS NOT NULL`);

      const existingCodes = existing
        .map((r: any) => r.odooCode as string)
        .filter(Boolean);

      if (!existingCodes.length) {
        return { synced: 0, errors: 0, details: ['No products with odooCode in DB — provide codes to sync new products'] };
      }
      this.logger.log(`Re-syncing ${existingCodes.length} existing products...`);
      odooCodes = existingCodes;
    }

    const codesToSync = odooCodes ?? [];
    let synced = 0;
    let errors = 0;
    const details: string[] = [];

    for (const code of codesToSync) {
      try {
        const product = await this.odooService.getProduct(code);
        if (!product) {
          details.push(`SKIP ${code}: not found`);
          continue;
        }
        await this.upsertFromOdoo(product);
        synced++;
        details.push(`OK ${code}: ${product.nameTh}`);
      } catch (err) {
        this.logger.error(`Failed to upsert product ${code}`, err);
        errors++;
        details.push(`ERR ${code}: ${String(err)}`);
      }
    }

    this.logger.log(`Sync complete: ${synced} synced, ${errors} errors`);
    return { synced, errors, details };
  }


  // ── Create product manually ────────────────────────────────────────────────

  async create(dto: any, userId: string) {
    const sku = dto.sku ?? 'MAN-' + Date.now();
    const slug = this.toSlug(dto.nameTh, sku);

    const [product] = await this.db
      .insert(products)
      .values({
        sku,
        slug,
        nameTh: dto.nameTh,
        nameEn: dto.nameEn ?? null,
        genericName: dto.genericName ?? null,
        brand: dto.brand ?? null,
        categoryId: dto.categoryId ?? null,
        drugClassification: dto.drugClassification ?? null,
        dosageForm: dto.dosageForm ?? null,
        strength: dto.strength ?? null,
        unit: dto.unit ?? 'item',
        sellPrice: dto.sellPrice != null ? String(dto.sellPrice) : null,
        comparePrice: dto.comparePrice != null ? String(dto.comparePrice) : null,
        stockQty: dto.stockQty != null ? String(dto.stockQty) : '0',
        shortDescription: dto.shortDescription ?? null,
        howToUse: dto.howToUse ?? null,
        warnings: dto.warnings ?? null,
        requiresPrescription: dto.requiresPrescription ?? false,
        requiresPharmacist: dto.requiresPharmacist ?? false,
        barcode: dto.barcode ?? null,
        status: dto.status ?? 'draft',
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return this.formatProduct(product);
  }

  // ── Update product ─────────────────────────────────────────────────────────

  async update(id: string, dto: any, userId: string) {
    const [existing] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('ไม่พบสินค้า');

    const updates: Record<string, any> = { updatedBy: userId, updatedAt: new Date() };
    const stringFields = ['sellPrice', 'comparePrice', 'memberPrice', 'stockQty'];
    for (const [key, val] of Object.entries(dto)) {
      if (val === undefined) continue;
      if (stringFields.includes(key) && val != null) {
        updates[key] = String(val);
      } else {
        updates[key] = val;
      }
    }

    const [updated] = await this.db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();

    return this.formatProduct(updated);
  }

  // ── Delete product (soft delete) ───────────────────────────────────────────

  async remove(id: string) {
    const [existing] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('ไม่พบสินค้า');

    await this.db
      .update(products)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async upsertFromOdoo(op: OdooNormalisedProduct) {
    const now = new Date();
    const slug = this.toSlug(op.nameTh, op.odooCode);
    const sellPrice = String(op.onlinePrice ?? op.listPrice);
    const hasDiscount = op.onlinePrice !== null && op.onlinePrice < op.listPrice;
    // Build images array: use imageUrl if available
    const images = op.imageUrl ? [op.imageUrl] : [];

    await this.db
      .insert(products)
      .values({
        sku: op.sku,
        odooCode: op.odooCode,
        nameTh: op.nameTh,
        nameEn: op.nameEn ?? null,
        genericName: op.genericName ?? null,
        shortDescription: op.description ?? null,
        howToUse: op.howToUse ?? null,
        warnings: op.caution ?? null,
        slug,
        unit: (op.unit ?? 'ชิ้น').substring(0, 20),
        sellPrice,
        comparePrice: hasDiscount ? String(op.listPrice) : null,
        stockQty: String(op.stockQty),
        stockSyncAt: now,
        odooLastSyncAt: now,
        status: op.isActive ? 'active' : 'inactive',
        barcode: op.barcode ?? null,
        images,
      })
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          odooCode: op.odooCode,
          nameTh: op.nameTh,
          nameEn: op.nameEn ?? null,
          genericName: op.genericName ?? null,
          shortDescription: op.description ?? null,
          howToUse: op.howToUse ?? null,
          warnings: op.caution ?? null,
          sellPrice,
          comparePrice: hasDiscount ? String(op.listPrice) : null,
          stockQty: String(op.stockQty),
          stockSyncAt: now,
          odooLastSyncAt: now,
          status: op.isActive ? 'active' : 'inactive',
          barcode: op.barcode ?? null,
          unit: (op.unit ?? 'ชิ้น').substring(0, 20),
          // Only update images if we have a new URL (don't overwrite manually uploaded images)
          ...(op.imageUrl ? { images } : {}),
          updatedAt: now,
        },
      });
  }

  private async getLiveStock(odooCode: string): Promise<number | null> {
    const cached = this.stockCache.get(odooCode);
    if (cached && cached.expiresAt > Date.now()) return cached.qty;

    const qty = await this.odooService.getStock(odooCode);
    if (qty === null) return null;

    this.stockCache.set(odooCode, { qty, expiresAt: Date.now() + this.stockCacheTtlMs });
    return qty;
  }

  private async updateStockInDb(productId: string, qty: number) {
    await this.db
      .update(products)
      .set({ stockQty: String(qty), stockSyncAt: new Date() })
      .where(eq(products.id, productId));
  }

  private getSortColumn(sortBy: string) {
    const map: Record<string, any> = {
      nameTh: products.nameTh,
      sellPrice: products.sellPrice,
      stockQty: products.stockQty,
      sortOrder: products.sortOrder,
      createdAt: products.createdAt,
    };
    return map[sortBy] ?? products.sortOrder;
  }

  private formatProduct(row: any) {
    const qty = Number(row.stockQty ?? 0);
    const firstImage =
      Array.isArray(row.images) && row.images.length > 0 ? row.images[0] : null;

    return {
      ...row,
      sellPrice: row.sellPrice ? Number(row.sellPrice) : null,
      memberPrice: row.memberPrice ? Number(row.memberPrice) : null,
      comparePrice: row.comparePrice ? Number(row.comparePrice) : null,
      stockQty: qty,
      inStock: qty > 0,
      imageUrl: firstImage,
      isLowStock: qty > 0 && qty <= Number(row.reorderPoint ?? 10),
      shortSlug: this.toShortSlug(row.sku ?? row.odooCode ?? row.slug ?? row.id),
    };
  }

  private toShortSlug(code: string): string {
    const digits = code.match(/\d+/)?.[0];
    if (digits) return `sku${digits}`;
    return code
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || code;
  }

  private toSlug(name: string, code: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 200);
    return `${base}-${code}`;
  }
}
