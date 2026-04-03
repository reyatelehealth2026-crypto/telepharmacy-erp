'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, ShoppingCart, Search } from 'lucide-react';
import { useCartStore } from '@/store/cart';

export function ShopHeader() {
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((s) => s.itemCount());

  useEffect(() => {
    setMounted(true);
  }, []);

  const showCartBadge = mounted && itemCount > 0;

  return (
    <header className="sticky top-0 z-40 border-b bg-primary text-white shadow-md">
      <div className="mx-auto max-w-lg">
        {/* Top bar: logo + icons */}
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
              <span className="text-base">💊</span>
            </div>
            <span className="text-lg font-bold tracking-tight">REYA</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            >
              <Bell className="h-5 w-5" />
            </Link>
            <Link
              href="/cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            >
              <ShoppingCart className="h-5 w-5" />
              {showCartBadge && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Inline search bar */}
        <div className="px-4 pb-3">
          <Link href="/search" className="block">
            <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-sm text-white/80 ring-1 ring-white/20 transition-colors hover:bg-white/20">
              <Search className="h-4 w-4 shrink-0 text-white/60" />
              <span className="text-white/70">ค้นหายา หรือพิมพ์อาการ...</span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
