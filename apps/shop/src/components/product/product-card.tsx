'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  id: string;
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || requiresPrescription) return;
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

  return (
    <Link
      href={`/product/${id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Pill className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-foreground">
              สินค้าหมด
            </span>
          </div>
        )}
        {requiresPrescription && (
          <Badge variant="warning" className="absolute left-2 top-2">
            ต้องมีใบสั่งยา
          </Badge>
        )}
        {comparePrice && comparePrice > price && (
          <Badge variant="destructive" className="absolute right-2 top-2">
            -{Math.round(((comparePrice - price) / comparePrice) * 100)}%
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        {brand && (
          <span className="text-xs text-muted-foreground">{brand}</span>
        )}
        <h3 className="line-clamp-2 text-sm font-medium leading-tight">
          {name}
        </h3>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
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
            <span className="text-xs text-amber-600">
              สมาชิก {formatPrice(memberPrice)}
            </span>
          )}
          <span className="block text-xs text-muted-foreground">/{unit}</span>
        </div>

        {!requiresPrescription && inStock && (
          <Button
            size="sm"
            className="mt-2 w-full"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4" />
            เพิ่มลงตะกร้า
          </Button>
        )}
      </div>
    </Link>
  );
}
