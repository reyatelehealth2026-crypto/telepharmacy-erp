import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  address: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  notes: string;
  isDefault: boolean;
}

interface AddressState {
  addresses: Address[];
  selectedId: string | null;
  addAddress: (address: Omit<Address, 'id'>) => void;
  updateAddress: (id: string, data: Partial<Address>) => void;
  removeAddress: (id: string) => void;
  setDefault: (id: string) => void;
  selectAddress: (id: string) => void;
  getSelected: () => Address | undefined;
}

function genId() {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: [],
      selectedId: null,

      addAddress: (data) => {
        const id = genId();
        set((state) => {
          const isFirst = state.addresses.length === 0;
          const addresses = isFirst
            ? [{ ...data, id, isDefault: true }]
            : data.isDefault
              ? [...state.addresses.map((a) => ({ ...a, isDefault: false })), { ...data, id }]
              : [...state.addresses, { ...data, id }];
          return {
            addresses,
            selectedId: isFirst || data.isDefault ? id : state.selectedId,
          };
        });
      },

      updateAddress: (id, data) =>
        set((state) => ({
          addresses: state.addresses.map((a) => (a.id === id ? { ...a, ...data } : a)),
        })),

      removeAddress: (id) =>
        set((state) => {
          const filtered = state.addresses.filter((a) => a.id !== id);
          const needNewDefault = state.addresses.find((a) => a.id === id)?.isDefault && filtered.length > 0;
          if (needNewDefault) filtered[0]!.isDefault = true;
          return {
            addresses: filtered,
            selectedId: state.selectedId === id ? (filtered[0]?.id ?? null) : state.selectedId,
          };
        }),

      setDefault: (id) =>
        set((state) => ({
          addresses: state.addresses.map((a) => ({
            ...a,
            isDefault: a.id === id,
          })),
        })),

      selectAddress: (id) => set({ selectedId: id }),

      getSelected: () => {
        const { addresses, selectedId } = get();
        return addresses.find((a) => a.id === selectedId) ?? addresses.find((a) => a.isDefault) ?? addresses[0];
      },
    }),
    { name: 'reya-addresses' }
  )
);
