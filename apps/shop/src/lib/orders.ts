import { api } from './api';

export type OrderStatus =
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'promptpay' | 'credit_card' | 'cod';
export type ShippingMethod = 'standard' | 'express' | 'cold_chain';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  status: OrderStatus;
  orderType: 'otc' | 'prescription';
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  delivery: {
    method: ShippingMethod;
    provider: string | null;
    trackingNo: string | null;
    estimatedDelivery: string | null;
    address: string;
  };
  payment: {
    method: PaymentMethod;
    status: string;
    qrCodeUrl: string | null;
    paidAt: string | null;
  };
  prescriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  items: Array<{ productId: string; quantity: number }>;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod;
  addressId: string;
  address: {
    recipientName: string;
    phone: string;
    address: string;
    subDistrict: string;
    district: string;
    province: string;
    postalCode: string;
    notes?: string;
  };
  couponCode?: string;
  redeemPoints?: number;
  notes?: string;
}

export interface OrderListResponse {
  data: Order[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function createOrder(token: string, data: CreateOrderData): Promise<Order> {
  const res = await api.post<{ data: Order }>('/v1/orders', data, token);
  return res.data;
}

export async function getMyOrders(token: string, page = 1, limit = 20): Promise<OrderListResponse> {
  return api.get<OrderListResponse>(`/v1/patients/me/orders?page=${page}&limit=${limit}`, token);
}

export async function getOrder(token: string, orderId: string): Promise<Order> {
  const res = await api.get<{ data: Order }>(`/v1/orders/${orderId}`, token);
  return res.data;
}

export async function uploadPaymentSlip(token: string, orderId: string, file: File): Promise<{ verified: boolean; message: string }> {
  const formData = new FormData();
  formData.append('slip', file);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const res = await fetch(`${API_BASE}/v1/orders/${orderId}/payment-slip`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function reOrder(token: string, orderId: string): Promise<Order> {
  const res = await api.post<{ data: Order }>(`/v1/orders/${orderId}/reorder`, {}, token);
  return res.data;
}

export const SHIPPING_OPTIONS: Array<{
  method: ShippingMethod;
  label: string;
  description: string;
  eta: string;
  price: number;
  freeAbove: number;
}> = [
  { method: 'standard', label: 'จัดส่งมาตรฐาน', description: 'Kerry / Flash Express', eta: '1-3 วันทำการ', price: 50, freeAbove: 500 },
  { method: 'express', label: 'จัดส่งด่วน', description: 'ส่งถึงภายในวันรุ่งขึ้น', eta: 'ภายในวันถัดไป', price: 120, freeAbove: 0 },
  { method: 'cold_chain', label: 'Cold Chain (ยาแช่เย็น)', description: 'ควบคุมอุณหภูมิ 2-8°C', eta: '1-2 วันทำการ', price: 150, freeAbove: 0 },
];
