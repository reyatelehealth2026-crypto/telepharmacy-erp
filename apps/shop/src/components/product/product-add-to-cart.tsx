'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import type { Product } from '@/lib/products';

interface Props {
  product: Product;
}

export function ProductAddToCart({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = () => {
    if (!product.inStock || product.requiresPrescription) return;
    addItem({
      productId: product.id,
      name: product.nameTh,
      brand: product.brand ?? undefined,
      imageUrl: product.imageUrl ?? undefined,
      price: product.sellPrice ?? 0,
      memberPrice: product.memberPrice ?? undefined,
      unit: product.unit ?? 'ชิ้น',
      requiresPrescription: product.requiresPrescription,
    });
  };

  if (product.requiresPrescription) {
    return (
      <Button size="lg" className="flex-1" variant="outline" disabled>
        ต้องมีใบสั่งยา
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className="flex-1"
      onClick={handleAddToCart}
      disabled={!product.inStock}
    >
      <ShoppingCart className="h-4 w-4" />
      {product.inStock ? 'เพิ่มลงตะกร้า' : 'สินค้าหมด'}
    </Button>
  );
}
