import Link from 'next/link';
import {
  Pill,
  FileImage,
  Repeat,
  Sparkles,
  Bot,
  FileText,
  ArrowRight,
  Leaf,
  Thermometer,
  Wind,
  Droplets,
  Baby,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { getFeaturedProducts } from '@/lib/products';
import { getArticles, type Article } from '@/lib/content';

const quickActions = [
  {
    href: '/search',
    icon: Pill,
    label: 'สั่งซื้อยา',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    href: '/rx/upload',
    icon: FileImage,
    label: 'ส่งใบสั่งยา',
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    href: '/ai-consult',
    icon: Bot,
    label: 'AI ปรึกษา',
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    href: '/orders',
    icon: Repeat,
    label: 'สั่งยาซ้ำ',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
];

const categories: { href: string; icon: LucideIcon; color: string; name: string }[] = [
  { href: '/search?q=ยาไข้', icon: Thermometer, color: 'text-red-500 bg-red-50', name: 'ยาไข้/ปวด' },
  { href: '/search?q=ยาหวัด', icon: Wind, color: 'text-sky-500 bg-sky-50', name: 'ยาหวัด/ไอ' },
  { href: '/search?q=ยาท้อง', icon: Droplets, color: 'text-amber-500 bg-amber-50', name: 'ยาท้อง' },
  { href: '/search?drugClassification=supplement', icon: Pill, color: 'text-violet-500 bg-violet-50', name: 'วิตามิน' },
  { href: '/search?drugClassification=cosmetic', icon: Sparkles, color: 'text-pink-500 bg-pink-50', name: 'ดูแลผิว' },
  { href: '/search?drugClassification=herbal', icon: Leaf, color: 'text-emerald-500 bg-emerald-50', name: 'สมุนไพร' },
  { href: '/search?q=เด็ก', icon: Baby, color: 'text-orange-500 bg-orange-50', name: 'เด็ก/ทารก' },
  { href: '/search?drugClassification=device', icon: Stethoscope, color: 'text-teal-500 bg-teal-50', name: 'อุปกรณ์' },
];

export default async function HomePage() {
  const [featuredProducts, healthTips] = await Promise.all([
    getFeaturedProducts(8).catch(() => []),
    getArticles({ type: 'health_article', limit: 3 })
      .then((res) => res.data ?? [])
      .catch(() => [] as Article[]),
  ]);

  return (
    <div className="space-y-5 pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-emerald-600 to-teal-700 px-4 pb-6 pt-5 text-white">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -left-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-sm font-medium text-emerald-200">ยินดีต้อนรับสู่</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">REYA Pharmacy</h1>
          <p className="mt-1 text-sm text-emerald-100/90">
            ร้านยาออนไลน์ พร้อมเภสัชกรดูแลคุณ
          </p>

          {/* Free delivery badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20">
            <Sparkles className="h-3 w-3" />
            จัดส่งฟรีเมื่อซื้อครบ ฿500
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="px-4">
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col items-center gap-2"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${action.gradient} text-white shadow-md transition-transform duration-200 group-active:scale-95 group-hover:scale-105`}
              >
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-center text-xs font-medium leading-tight">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Promotions Banner */}
      <section className="px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 p-4 text-white shadow-card">
          <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
                โปรโมชั่นวันนี้
              </span>
            </div>
            <p className="mt-1 text-lg font-bold leading-tight">
              ลด 20% ชุดป้องกันไข้หวัด
            </p>
            <p className="mt-0.5 text-xs text-white/80">
              พาราเซตามอล + วิตามินซี + ยาแก้คัดจมูก
            </p>
            <Button
              size="sm"
              className="mt-3 h-8 bg-white px-4 text-xs font-semibold text-orange-600 hover:bg-white/95 shadow-sm"
            >
              สั่งซื้อเลย
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">หมวดหมู่</h2>
          <Link
            href="/search"
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            ดูทั้งหมด
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className="group flex flex-col items-center gap-1.5 rounded-2xl bg-card p-2.5 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5 active:scale-95"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cat.color} transition-transform group-hover:scale-110`}>
                <cat.icon className="h-5 w-5" />
              </div>
              <span className="text-center text-[11px] font-medium leading-tight text-foreground/80">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">สินค้าแนะนำ</h2>
          <Link
            href="/search"
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            ดูทั้งหมด
            <ArrowRight className="h-3 w-3" />
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
          <div className="mt-3 rounded-2xl border border-dashed bg-card p-8 text-center">
            <Pill className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">ยังไม่มีสินค้าแนะนำ</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              กรุณา sync สินค้าจาก Odoo ก่อน
            </p>
          </div>
        )}
      </section>

      {/* Health Tips */}
      <section className="px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">เคล็ดลับสุขภาพ</h2>
          <Link
            href="/articles"
            className="flex items-center gap-1 text-xs font-medium text-primary"
          >
            ดูทั้งหมด
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-3 space-y-2.5">
          {healthTips.length > 0 ? (
            healthTips.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="flex gap-3 rounded-2xl border bg-card p-3 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm font-semibold">
                    {article.titleTh}
                  </h3>
                  {article.excerpt && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {article.excerpt}
                    </p>
                  )}
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" />
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed bg-card p-6 text-center">
              <Leaf className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">ยังไม่มีบทความสุขภาพ</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
