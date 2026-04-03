'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';
import { requiresPrescriptionForClassification } from '@/lib/products';

interface ProductCardProps {
  id: string;
  sku?: string;
  slug?: string;
  shortSlug?: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  price: number;
  memberPrice?: number;
  comparePrice?: number;
  unit: string;
  inStock: boolean;
  requiresPrescription: boolean;
  drugClassification: string;
  tags?: string[];
}

export function ProductCard({
  id,
  sku,
  slug,
  shortSlug,
  name,
  brand,
  imageUrl,
  price,
  memberPrice,
  comparePrice,
  unit,
  inStock,
  requiresPrescription,
  drugClassification,
  tags,
}: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  const needsRx =
    requiresPrescription ||
    requiresPrescriptionForClassification(drugClassification);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || needsRx) return;
    addItem({
      productId: id,
      name,
      brand,
      imageUrl,
      price,
      memberPrice,
      unit,
      requiresPrescription,
    });
  };

  const discountPct =
    comparePrice && comparePrice > price
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  return (
    <Link
      href={`/product/${shortSlug || sku || slug || id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Pill className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="glass-dark absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
              สินค้าหมด
            </span>
          </div>
        )}

        {/* Badges row */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {needsRx && (
            <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 shadow-sm">
              ใบสั่งยา
            </Badge>
          )}
        </div>
        {discountPct !== null && (
          <Badge
            variant="destructive"
            className="absolute right-2 top-2 text-[10px] px-1.5 py-0.5 shadow-sm"
          >
            -{discountPct}%
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {brand && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
            {brand}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {name}
        </h3>

        {/* Stock badge + tags */}
        <div className="flex flex-wrap items-center gap-1">
          {inStock ? (
            <Badge variant="success" className="text-[10px] px-1.5 py-0">
              มีสินค้า
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              สินค้าหมด
            </Badge>
          )}
          {tags && tags.slice(0, 1).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Price block */}
        <div className="mt-auto pt-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-primary">
              {formatPrice(price)}
            </span>
            {comparePrice && comparePrice > price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(comparePrice)}
              </span>
            )}
          </div>
          {memberPrice && memberPrice < price && (
            <span className="block text-[11px] font-medium text-amber-600">
              สมาชิก {formatPrice(memberPrice)}
            </span>
          )}
          <span className="block text-[11px] text-muted-foreground">/{unit}</span>
        </div>

        {!needsRx && inStock && (
          <Button
            size="sm"
            className="mt-1.5 w-full gap-1.5 rounded-xl text-xs shadow-sm"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            เพิ่มลงตะกร้า
          </Button>
        )}
        {needsRx && (
          <Button
            size="sm"
            variant="outline"
            className="mt-1.5 w-full gap-1.5 rounded-xl text-xs"
            asChild
          >
            <Link href={`/product/${shortSlug || sku || slug || id}`}>ดูรายละเอียด</Link>
          </Button>
        )}
      </div>
    </Link>
  );
}
