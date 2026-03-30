'use client';

import Link from 'next/link';
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
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-sm safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around">
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
                'relative flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.showBadge && itemCount > 0 && (
                <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
