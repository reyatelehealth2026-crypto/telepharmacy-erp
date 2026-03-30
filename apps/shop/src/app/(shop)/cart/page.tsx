'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Pill, Heart, Archive, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const { 
    items, 
    savedItems,
    updateQuantity, 
    removeItem, 
    saveForLater,
    moveToCart,
    removeSavedItem,
    subtotal, 
    clearCart 
  } = useCartStore();
  const deliveryFee = subtotal() >= 500 ? 0 : 50;
  const total = subtotal() + deliveryFee;

  if (items.length === 0 && savedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="mt-4 text-lg font-bold">ตะกร้าว่าง</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          เลือกสินค้าที่ต้องการแล้วเพิ่มลงตะกร้า
        </p>
        <Link
          href="/search"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          เลือกซื้อสินค้า
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-48">
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">ตะกร้าสินค้า ({items.length})</h1>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-destructive hover:underline"
            >
              ล้างตะกร้า
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      {items.length > 0 && (
        <div className="mt-4 space-y-3 px-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-3 rounded-xl border p-3"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Pill className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    {item.brand && (
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                    )}
                    <h3 className="text-sm font-medium">{item.name}</h3>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="text-sm font-bold text-primary">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-2 rounded-lg border">
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        className="p-1.5 hover:bg-muted"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        className="p-1.5 hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => saveForLater(item.productId)}
                      className="p-2 text-muted-foreground hover:text-primary"
                      title="เก็บไว้ซื้อภายหลัง"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Saved for Later */}
      {savedItems.length > 0 && (
        <div className="mt-6 px-4">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-3">
            <Archive className="h-4 w-4" />
            เก็บไว้ซื้อภายหลัง ({savedItems.length})
          </h2>
          <div className="space-y-3">
            {savedItems.map((item) => (
              <div
                key={item.productId}
                className="flex gap-3 rounded-xl border border-dashed p-3 opacity-80"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Pill className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      {item.brand && (
                        <p className="text-xs text-muted-foreground">{item.brand}</p>
                      )}
                      <h3 className="text-sm font-medium">{item.name}</h3>
                    </div>
                    <button
                      onClick={() => removeSavedItem(item.productId)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-sm font-bold text-primary">
                      {formatPrice(item.price)}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => moveToCart(item.productId)}>
                      ย้ายไปตะกร้า
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery note */}
      {items.length > 0 && subtotal() < 500 && (
        <div className="mx-4 mt-4 rounded-lg bg-amber-50 p-3 text-center text-xs text-amber-700">
          ซื้อเพิ่มอีก {formatPrice(500 - subtotal())} เพื่อรับจัดส่งฟรี!
        </div>
      )}

      {/* Summary - only show if has items */}
      {items.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
          <div className="mx-auto max-w-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ยอดสินค้า</span>
              <span>{formatPrice(subtotal())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ค่าจัดส่ง</span>
              <span className={deliveryFee === 0 ? 'text-primary font-medium' : ''}>
                {deliveryFee === 0 ? 'ฟรี' : formatPrice(deliveryFee)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>รวมทั้งหมด</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
            <Link
              href="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              ดำเนินการสั่งซื้อ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Show checkout disabled state when only saved items */}
      {items.length === 0 && savedItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
          <div className="mx-auto max-w-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">
              ไม่มีสินค้าในตะกร้า
            </p>
            <Link
              href="/search"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              เลือกซื้อสินค้า
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
