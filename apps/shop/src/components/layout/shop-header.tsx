'use client';

import Link from 'next/link';
import { Bell, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cart';

export function ShopHeader() {
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <header className="sticky top-0 z-40 border-b bg-primary text-white">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold">💊 REYA</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/notifications" className="relative p-1">
            <Bell className="h-5 w-5" />
          </Link>
          <Link href="/cart" className="relative p-1">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
