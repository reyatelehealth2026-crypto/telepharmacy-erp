'use client';

import { Menu, Bell } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            RP
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">เภสัชกร</p>
            <p className="text-xs text-muted-foreground">pharmacist</p>
          </div>
        </div>
      </div>
    </header>
  );
}
