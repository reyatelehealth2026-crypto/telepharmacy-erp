import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Pill,
  Package,
  Tag,
  AlertTriangle,
  Info,
  Barcode,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { getAdminProduct } from '@/lib/products';

const classificationLabel: Record<string, string> = {
  hhr: 'ยาสามัญ (HHR)',
  dangerous_drug: 'ยาอันตราย (DD)',
  specially_controlled: 'ยาควบคุมพิเศษ',
  supplement: 'อาหารเสริม',
  device: 'อุปกรณ์การแพทย์',
  cosmetic: 'เครื่องสำอาง',
  herbal: 'สมุนไพร',
  food: 'อาหาร',
};

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline' }) {
  const cls = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    outline: 'border border-gray-300 text-gray-600',
  }[variant];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-3 py-2 border-b last:border-0">
      <span className="w-36 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product;
  try {
    product = await getAdminProduct(id);
  } catch {
    notFound();
  }

  const stockColor = !product.inStock
    ? 'text-red-600'
    : product.isLowStock
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Link>
        <div>
          <h1 className="text-xl font-bold">{product.nameTh}</h1>
          <p className="text-sm text-muted-foreground">{product.sku}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Image + Quick Stats */}
        <div className="space-y-4">
          {/* Product Image */}
          <div className="overflow-hidden rounded-xl border bg-muted">
            <div className="relative aspect-square">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.nameTh}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Pill className="h-20 w-20 text-muted-foreground/20" />
                </div>
              )}
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">สต็อก</p>
              <p className={`text-2xl font-bold ${stockColor}`}>
                {product.stockQty.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{product.unit ?? 'ชิ้น'}</p>
            </div>
            <div className="rounded-xl border p-3 text-center">
              <p className="text-xs text-muted-foreground">ราคาขาย</p>
              <p className="text-2xl font-bold text-primary">
                {product.sellPrice ? `฿${product.sellPrice.toLocaleString()}` : '-'}
              </p>
              {product.comparePrice && product.comparePrice > (product.sellPrice ?? 0) && (
                <p className="text-xs text-muted-foreground line-through">
                  ฿{product.comparePrice.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={product.status === 'active' ? 'success' : 'warning'}>
              {product.status === 'active' ? 'Active' : product.status}
            </Badge>
            {product.odooCode && (
              <Badge variant="default">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Odoo: {product.odooCode}
              </Badge>
            )}
            {product.requiresPrescription && (
              <Badge variant="danger">ต้องใบสั่งยา</Badge>
            )}
            {product.isFeatured && <Badge variant="warning">แนะนำ</Badge>}
            {product.isNew && <Badge variant="success">ใหม่</Badge>}
            {!product.inStock && <Badge variant="danger">สินค้าหมด</Badge>}
            {product.isLowStock && product.inStock && (
              <Badge variant="warning">
                <AlertTriangle className="mr-1 h-3 w-3" />
                สต็อกต่ำ
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="space-y-4 lg:col-span-2">
          {/* Basic Info */}
          <div className="rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">ข้อมูลสินค้า</h2>
            </div>
            <InfoRow label="ชื่อภาษาไทย" value={product.nameTh} />
            <InfoRow label="ชื่อภาษาอังกฤษ" value={product.nameEn} />
            <InfoRow label="ชื่อสามัญ" value={product.genericName} />
            <InfoRow label="แบรนด์" value={product.brand} />
            <InfoRow label="ประเภทยา" value={classificationLabel[product.drugClassification ?? ''] ?? product.drugClassification} />
            <InfoRow label="รูปแบบยา" value={product.dosageForm} />
            <InfoRow label="ความแรง" value={product.strength} />
            <InfoRow label="ขนาดบรรจุ" value={product.packSize} />
            <InfoRow label="หน่วย" value={product.unit} />
          </div>

          {/* Pricing */}
          <div className="rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">ราคาและสต็อก</h2>
            </div>
            <InfoRow label="ราคาขาย" value={product.sellPrice ? `฿${product.sellPrice.toLocaleString()}` : null} />
            <InfoRow label="ราคาเปรียบเทียบ" value={product.comparePrice ? `฿${product.comparePrice.toLocaleString()}` : null} />
            <InfoRow label="ราคาสมาชิก" value={product.memberPrice ? `฿${product.memberPrice.toLocaleString()}` : null} />
            <InfoRow label="สต็อกปัจจุบัน" value={`${product.stockQty.toLocaleString()} ${product.unit ?? 'ชิ้น'}`} />
            <InfoRow label="สต็อกขั้นต่ำ" value={product.minStock} />
            <InfoRow label="จุดสั่งซื้อ" value={product.reorderPoint} />
          </div>

          {/* Odoo Info */}
          {product.odooCode && (
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">ข้อมูล Odoo</h2>
              </div>
              <InfoRow label="รหัส Odoo" value={product.odooCode} />
              <InfoRow label="บาร์โค้ด" value={product.barcode} />
              <InfoRow label="SKU" value={product.sku} />
              <InfoRow
                label="Sync ล่าสุด"
                value={product.odooLastSyncAt
                  ? new Date(product.odooLastSyncAt).toLocaleString('th-TH')
                  : null}
              />
              <InfoRow
                label="Stock sync"
                value={product.stockSyncAt
                  ? new Date(product.stockSyncAt).toLocaleString('th-TH')
                  : null}
              />
            </div>
          )}

          {/* Description */}
          {(product.shortDescription || product.howToUse || product.warnings) && (
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">รายละเอียด</h2>
              </div>

              {product.shortDescription && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">คำอธิบาย / สรรพคุณ</p>
                  <p className="text-sm leading-relaxed">{product.shortDescription}</p>
                </div>
              )}

              {product.howToUse && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">วิธีใช้</p>
                  <p className="text-sm leading-relaxed">{product.howToUse}</p>
                </div>
              )}

              {product.warnings && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <p className="text-xs font-medium text-amber-800">คำเตือน</p>
                  </div>
                  <p className="text-sm text-amber-700 leading-relaxed">{product.warnings}</p>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="rounded-xl border p-4 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Barcode className="h-3.5 w-3.5" />
              <span>ID: {product.id}</span>
            </div>
            {product.createdAt && (
              <p>สร้างเมื่อ: {new Date(product.createdAt).toLocaleString('th-TH')}</p>
            )}
            {product.updatedAt && (
              <p>แก้ไขล่าสุด: {new Date(product.updatedAt).toLocaleString('th-TH')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
