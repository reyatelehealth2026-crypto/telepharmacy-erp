import type {
  OrderType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DeliveryStatus,
  DeliveryProvider,
} from "./enums";
import type { Address } from "./common";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  totalPrice: number;
  prescriptionItemId?: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transactionRef?: string;
  slipImageUrl?: string;
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  status: DeliveryStatus;
  provider: DeliveryProvider;
  trackingNo?: string;
  recipientName: string;
  recipientPhone: string;
  address: Address;
  estimatedDelivery?: string;
  deliveredAt?: string;
  deliveryNotes?: string;
  proofImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNo: string;
  patientId: string;
  orderType: OrderType;
  status: OrderStatus;
  prescriptionId?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  vatAmount: number;
  totalAmount: number;
  pointsEarned?: number;
  pointsUsed?: number;
  delivery?: Delivery;
  payment?: Payment;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  prescriptionItemId?: string;
}

export interface CreateOrderInput {
  patientId: string;
  orderType: OrderType;
  prescriptionId?: string;
  items: CreateOrderItemInput[];
  deliveryAddress: Address;
  recipientName: string;
  recipientPhone: string;
  deliveryProvider?: DeliveryProvider;
  paymentMethod: PaymentMethod;
  usePoints?: number;
  notes?: string;
}

export interface OrderSummary {
  id: string;
  orderNo: string;
  orderType: OrderType;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
  deliveryStatus?: DeliveryStatus;
  paymentStatus?: PaymentStatus;
}
