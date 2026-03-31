import { api } from './api';
import { useAddressStore, type Address } from '@/store/address';

interface ApiAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  address: string;
  subDistrict: string | null;
  district: string | null;
  province: string;
  postalCode: string | null;
  notes: string | null;
  isDefault: boolean;
}

function toStoreAddress(a: ApiAddress): Address {
  return {
    id: a.id,
    label: a.label ?? 'บ้าน',
    recipientName: a.recipientName,
    phone: a.phone,
    address: a.address,
    subDistrict: a.subDistrict ?? '',
    district: a.district ?? '',
    province: a.province,
    postalCode: a.postalCode ?? '',
    notes: a.notes ?? '',
    isDefault: a.isDefault,
  };
}

/** Fetch addresses from backend and sync to Zustand store. */
export async function syncAddresses(token: string) {
  try {
    const res = await api.get<ApiAddress[]>('/v1/patients/me/addresses', token);
    const addresses = (Array.isArray(res) ? res : (res as any).data ?? []).map(toStoreAddress);
    const store = useAddressStore.getState();
    // Replace local addresses with server data
    useAddressStore.setState({
      addresses,
      selectedId: addresses.find(a => a.isDefault)?.id ?? addresses[0]?.id ?? null,
    });
    return addresses;
  } catch {
    // Fallback: keep local addresses
    return useAddressStore.getState().addresses;
  }
}

/** Create address on backend and sync store. */
export async function createAddress(token: string, data: Omit<Address, 'id'>) {
  const res = await api.post<ApiAddress>('/v1/patients/me/addresses', data, token);
  const addr = toStoreAddress(res as any);
  await syncAddresses(token);
  return addr;
}

/** Update address on backend and sync store. */
export async function updateAddress(token: string, id: string, data: Partial<Address>) {
  await api.patch(`/v1/patients/me/addresses/${id}`, data, token);
  await syncAddresses(token);
}

/** Delete address on backend and sync store. */
export async function deleteAddress(token: string, id: string) {
  await api.delete(`/v1/patients/me/addresses/${id}`, token);
  await syncAddresses(token);
}
