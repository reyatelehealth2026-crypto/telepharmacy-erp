import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  price: number;
  memberPrice?: number;
  quantity: number;
  unit: string;
  requiresPrescription: boolean;
}

export interface SavedItem {
  productId: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  price: number;
  memberPrice?: number;
  unit: string;
  requiresPrescription: boolean;
  savedAt: string;
}

interface CartState {
  items: CartItem[];
  savedItems: SavedItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: () => number;
  subtotal: () => number;
  saveForLater: (productId: string) => void;
  moveToCart: (productId: string) => void;
  removeSavedItem: (productId: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      savedItems: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                ),
        })),

      clearCart: () => set({ items: [] }),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      saveForLater: (productId) =>
        set((state) => {
          const item = state.items.find((i) => i.productId === productId);
          if (!item) return state;
          return {
            items: state.items.filter((i) => i.productId !== productId),
            savedItems: [
              ...state.savedItems.filter((i) => i.productId !== productId),
              {
                productId: item.productId,
                name: item.name,
                brand: item.brand,
                imageUrl: item.imageUrl,
                price: item.price,
                memberPrice: item.memberPrice,
                unit: item.unit,
                requiresPrescription: item.requiresPrescription,
                savedAt: new Date().toISOString(),
              },
            ],
          };
        }),

      moveToCart: (productId) =>
        set((state) => {
          const savedItem = state.savedItems.find((i) => i.productId === productId);
          if (!savedItem) return state;
          const existing = state.items.find((i) => i.productId === productId);
          return {
            savedItems: state.savedItems.filter((i) => i.productId !== productId),
            items: existing
              ? state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
                )
              : [
                  ...state.items,
                  {
                    productId: savedItem.productId,
                    name: savedItem.name,
                    brand: savedItem.brand,
                    imageUrl: savedItem.imageUrl,
                    price: savedItem.price,
                    memberPrice: savedItem.memberPrice,
                    quantity: 1,
                    unit: savedItem.unit,
                    requiresPrescription: savedItem.requiresPrescription,
                  },
                ],
          };
        }),

      removeSavedItem: (productId) =>
        set((state) => ({
          savedItems: state.savedItems.filter((i) => i.productId !== productId),
        })),
    }),
    { name: 'reya-cart' }
  )
);
