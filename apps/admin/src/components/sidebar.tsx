'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingCart,
  Users,
  Package,
  Warehouse,
  BarChart3,
  Settings,
  LogOut,
  Pill,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'คิวใบสั่งยา', href: '/dashboard/pharmacist', icon: ClipboardList },
  { name: 'ออเดอร์', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'ผู้ป่วย', href: '/dashboard/patients', icon: Users },
  { name: 'สินค้า', href: '/dashboard/products', icon: Pill },
  { name: 'คลังสินค้า', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'รายงาน', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'ตั้งค่า', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          R
        </div>
        <div>
          <p className="text-sm font-semibold">REYA Pharmacy</p>
          <p className="text-xs text-muted-foreground">Admin Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
