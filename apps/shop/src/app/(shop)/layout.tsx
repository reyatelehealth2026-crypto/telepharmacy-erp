import { ShopHeader } from '@/components/layout/shop-header';
import { BottomNav } from '@/components/layout/bottom-nav';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <ShopHeader />
      <main className="pb-24 animate-fade-in">{children}</main>
      <BottomNav />
    </div>
  );
}
