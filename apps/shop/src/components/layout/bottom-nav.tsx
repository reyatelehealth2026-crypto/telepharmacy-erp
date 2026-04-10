'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Search, ShoppingCart, ClipboardList, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart';

const navItems = [
  { href: '/', icon: Home, label: 'หน้าหลัก' },
  { href: '/search', icon: Search, label: 'ค้นหา' },
  { href: '/cart', icon: ShoppingCart, label: 'ตะกร้า', showBadge: true },
  { href: '/orders', icon: ClipboardList, label: 'ออเดอร์' },
  { href: '/profile', icon: User, label: 'โปรไฟล์' },
];

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const itemCount = useCartStore((s) => s.itemCount());

  useEffect(() => {
    setMounted(true);
  }, []);

  const showCartBadge = mounted && itemCount > 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 shadow-nav safe-area-bottom">
      <div className="glass border-t mx-auto max-w-lg">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 px-3 py-2.5 text-xs transition-all duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Active indicator dot */}
                <span
                  className={cn(
                    'absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-primary transition-all duration-300',
                    isActive ? 'w-5' : 'w-0'
                  )}
                />

                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-200',
                  isActive && 'bg-primary/10 scale-105'
                )}>
                  <item.icon className="h-[18px] w-[18px]" />
                </div>

                {item.showBadge && showCartBadge && (
                  <span className="absolute right-3 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white shadow-sm animate-scale-in">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
                <span className={cn('font-medium', isActive && 'font-semibold')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
