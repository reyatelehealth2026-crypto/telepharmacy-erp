import Link from 'next/link';
import {
  Pill,
  FileImage,
  Repeat,
  Sparkles,
  Leaf,
  Bot,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { getFeaturedProducts } from '@/lib/products';
import { getArticles, type Article } from '@/lib/content';

const quickActions = [
  { href: '/search', icon: Pill, label: 'สั่งซื้อยา', color: 'bg-emerald-500' },
  { href: '/rx/upload', icon: FileImage, label: 'ส่งใบสั่งยา', color: 'bg-blue-500' },
  { href: '/ai-consult', icon: Bot, label: 'AI ปรึกษาอาการ', color: 'bg-purple-600' },
  { href: '/orders', icon: Repeat, label: 'สั่งยาซ้ำ', color: 'bg-amber-500' },
];

const categories = [
  { slug: 'fever-pain', icon: '🤒', name: 'ยาไข้/ปวด' },
  { slug: 'cold-flu', icon: '🤧', name: 'ยาหวัด/ไอ' },
  { slug: 'stomach', icon: '🫃', name: 'ยาท้อง' },
  { slug: 'vitamins', icon: '💊', name: 'วิตามิน' },
  { slug: 'skin-care', icon: '🧴', name: 'ดูแลผิว' },
  { slug: 'herbal', icon: '🌿', name: 'สมุนไพร' },
  { slug: 'baby', icon: '👶', name: 'เด็ก/ทารก' },
  { slug: 'devices', icon: '🩺', name: 'อุปกรณ์' },
];

export default async function HomePage() {
  const [featuredProducts, healthTips] = await Promise.all([
    getFeaturedProducts(8).catch(() => []),
    getArticles({ type: 'health_article', limit: 3 })
      .then((res) => res.data ?? [])
      .catch(() => [] as Article[]),
  ]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-emerald-700 px-4 py-6 text-white">
        <h1 className="text-xl font-bold">สวัสดีค่ะ 👋</h1>
        <p className="mt-1 text-sm text-emerald-100">
          ร้านยา REYA พร้อมดูแลสุขภาพคุณ
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/search" className="flex-1">
            <div className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2.5 text-sm text-white/90 backdrop-blur-sm">
              <Pill className="h-4 w-4" />
              <span>ค้นหายา หรือพิมพ์อาการ...</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="px-4">
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={`${action.color} flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm`}
              >
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-center text-xs font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">หมวดหมู่</h2>
          <Link href="/categories" className="text-sm text-primary">
            ดูทั้งหมด
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-center text-xs font-medium">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Promotions Banner */}
      <section className="px-4">
        <div className="overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-bold">โปรโมชั่นวันนี้</span>
          </div>
          <p className="mt-1 text-lg font-bold">ลด 20% ชุดป้องกันไข้หวัด</p>
          <p className="text-sm text-white/80">พาราเซตามอล + วิตามินซี + ยาแก้คัดจมูก</p>
          <Button size="sm" className="mt-3 bg-white text-orange-600 hover:bg-white/90">
            สั่งซื้อเลย
          </Button>
        </div>
      </section>

      {/* Featured Products */}
      <section className="px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">สินค้าแนะนำ</h2>
          <Link href="/search" className="text-sm text-primary">
            ดูทั้งหมด
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.nameTh}
                brand={product.brand ?? undefined}
                imageUrl={product.imageUrl ?? undefined}
                price={product.sellPrice ?? 0}
                memberPrice={product.memberPrice ?? undefined}
                comparePrice={product.comparePrice ?? undefined}
                unit={product.unit ?? 'ชิ้น'}
                inStock={product.inStock}
                requiresPrescription={product.requiresPrescription}
                drugClassification={product.drugClassification ?? 'hhr'}
                tags={product.tags}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <Pill className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p>ยังไม่มีสินค้าแนะนำ</p>
            <p className="mt-1 text-xs">กรุณา sync สินค้าจาก Odoo ก่อน</p>
          </div>
        )}
      </section>

      {/* Health Tips */}
      <section className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">เคล็ดลับสุขภาพ</h2>
          <Link href="/articles" className="text-sm text-primary">
            ดูทั้งหมด
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {healthTips.length > 0 ? (
            healthTips.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="flex gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-1 text-sm font-medium">{article.titleTh}</h3>
                  {article.excerpt && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Leaf className="mx-auto mb-2 h-6 w-6 opacity-30" />
              <p>ยังไม่มีบทความสุขภาพ</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
