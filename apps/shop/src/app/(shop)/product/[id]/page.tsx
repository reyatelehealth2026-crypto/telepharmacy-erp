import { ArrowLeft, ShoppingCart, Heart, Share2, Pill, AlertTriangle, Info, Star, PackageX, Barcode } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { getProduct, productCardImageUrl } from '@/lib/products';
import { ProductAddToCart } from '@/components/product/product-add-to-cart';

const classificationLabel: Record<string, string> = {
  hhr: 'ยาสามัญ',
  dangerous_drug: 'ยาอันตราย',
  specially_controlled: 'ยาควบคุมพิเศษ',
  supplement: 'อาหารเสริม',
  device: 'อุปกรณ์การแพทย์',
  cosmetic: 'เครื่องสำอาง',
  herbal: 'สมุนไพร',
  food: 'อาหาร',
};

const classificationVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  hhr: 'success',
  dangerous_drug: 'warning',
  specially_controlled: 'destructive',
  supplement: 'secondary',
  device: 'secondary',
  cosmetic: 'secondary',
  herbal: 'success',
  food: 'secondary',
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }

  const classification = product.drugClassification ?? 'hhr';
  const heroImage = productCardImageUrl(product);

  return (
    <div className="pb-24">
      {/* Top bar */}
      <div className="sticky top-14 z-30 flex items-center justify-between bg-background/95 px-4 py-2 backdrop-blur-sm">
        <Link href="/search" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex gap-2">
          <button className="rounded-full p-1 hover:bg-muted">
            <Heart className="h-5 w-5" />
          </button>
          <button className="rounded-full p-1 hover:bg-muted">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="relative flex aspect-square items-center justify-center bg-muted">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={product.nameTh}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        ) : (
          <Pill className="h-24 w-24 text-muted-foreground/20" />
        )}
      </div>

      {/* Info */}
      <div className="space-y-4 px-4 pt-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={classificationVariant[classification] ?? 'secondary'}>
              {classificationLabel[classification] ?? classification}
            </Badge>
            {product.requiresPrescription && (
              <Badge variant="destructive">ต้องมีใบสั่งยา</Badge>
            )}
            {product.fdaRegistrationNo && (
              <Badge variant="outline" className="text-[10px]">
                อย. {product.fdaRegistrationNo}
              </Badge>
            )}
          </div>
          {product.brand && (
            <p className="mt-1 text-xs text-muted-foreground">{product.brand}</p>
          )}
          <h1 className="mt-1 text-lg font-bold">{product.nameTh}</h1>
          {product.nameEn && (
            <p className="text-sm text-muted-foreground italic">{product.nameEn}</p>
          )}
          {(product.genericName || product.strength || product.packSize) && (
            <p className="text-sm text-muted-foreground">
              {[product.genericName, product.strength, product.packSize]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        {/* Price + Stock */}
        <div className="rounded-xl bg-secondary p-4">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-primary">
              {product.sellPrice ? formatPrice(product.sellPrice) : 'ติดต่อร้าน'}
            </span>
            {product.comparePrice && product.comparePrice > (product.sellPrice ?? 0) && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
            {product.unit && (
              <span className="text-sm text-muted-foreground">/{product.unit}</span>
            )}
          </div>
          {product.memberPrice && product.memberPrice < (product.sellPrice ?? Infinity) && (
            <p className="mt-1 text-sm text-amber-600">
              <Star className="mr-1 inline h-3 w-3" />
              ราคาสมาชิก {formatPrice(product.memberPrice)}
            </p>
          )}
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                product.inStock ? 'bg-emerald-500' : 'bg-red-400'
              }`}
            />
            <p className="text-xs text-muted-foreground">
              {product.inStock
                ? `มีสินค้า (${product.stockQty.toLocaleString()} ${product.unit ?? 'ชิ้น'})`
                : 'สินค้าหมดชั่วคราว'}
            </p>
            {product.isLowStock && product.inStock && (
              <Badge variant="warning" className="ml-1 text-[10px]">
                เหลือน้อย
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {product.shortDescription && (
          <div>
            <h2 className="text-sm font-bold">รายละเอียด</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {product.shortDescription}
            </p>
          </div>
        )}

        {/* How to Use */}
        {product.howToUse && (
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">วิธีใช้</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{product.howToUse}</p>
          </div>
        )}

        {/* Warnings */}
        {product.warnings && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-bold text-amber-800">คำเตือน</h2>
            </div>
            <p className="mt-2 text-sm text-amber-700">{product.warnings}</p>
          </div>
        )}

        {/* Side Effects */}
        {product.sideEffects && (
          <div>
            <h2 className="text-sm font-bold">ผลข้างเคียง</h2>
            <p className="mt-1 text-sm text-muted-foreground">{product.sideEffects}</p>
          </div>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Product Info Footer */}
        <div className="rounded-xl border bg-muted/30 p-3 space-y-1.5">
          {product.sku && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Barcode className="h-3.5 w-3.5 shrink-0" />
              <span>SKU: {product.sku}</span>
            </div>
          )}
          {product.odooCode && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PackageX className="h-3.5 w-3.5 shrink-0" />
              <span>รหัสสินค้า: {product.odooCode}</span>
            </div>
          )}
          {product.barcode && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Barcode className="h-3.5 w-3.5 shrink-0" />
              <span>บาร์โค้ด: {product.barcode}</span>
            </div>
          )}
          {product.unit && (
            <div className="text-xs text-muted-foreground">หน่วย: {product.unit}</div>
          )}
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white/95 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg gap-3">
          <Link
            href="/consultation"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-base font-medium transition-colors hover:bg-muted"
          >
            💬 ปรึกษาเภสัชกร
          </Link>
          <ProductAddToCart product={product} />
        </div>
      </div>
    </div>
  );
}
