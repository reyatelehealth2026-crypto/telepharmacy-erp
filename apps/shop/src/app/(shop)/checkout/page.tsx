'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  QrCode,
  Truck,
  Snowflake,
  Zap,
  CheckCircle2,
  Pill,
  Plus,
  Upload,
  Loader2,
  Banknote,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart';
import { useAddressStore, type Address } from '@/store/address';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { formatPrice } from '@/lib/utils';
import { createOrder, validateCoupon, SHIPPING_OPTIONS, type ShippingMethod, type PaymentMethod } from '@/lib/orders';
import { syncAddresses } from '@/lib/address-api';
import { toast } from 'sonner';
import { THAI_PROVINCES, isThaiProvince, normalizeThaiProvince } from '@/lib/thai-provinces';

type CheckoutStep = 'address' | 'review';

const PAYMENT_OPTIONS: Array<{ method: PaymentMethod; label: string; desc: string; icon: typeof QrCode }> = [
  { method: 'promptpay', label: 'PromptPay QR', desc: 'สแกนจ่ายผ่าน QR Code', icon: QrCode },
  { method: 'credit_card', label: 'บัตรเครดิต/เดบิต', desc: 'Visa, Mastercard, JCB', icon: CreditCard },
  { method: 'cod', label: 'เก็บเงินปลายทาง (COD)', desc: 'ชำระเมื่อรับสินค้า', icon: Banknote },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuthGuard();
  const { items, subtotal, clearCart } = useCartStore();
  const { addresses, addAddress, getSelected, selectAddress } = useAddressStore();
  const { accessToken } = useAuthStore();

  const [step, setStep] = useState<CheckoutStep>(addresses.length > 0 ? 'review' : 'address');

  useEffect(() => {
    if (accessToken) {
      syncAddresses(accessToken).catch(() => {});
    }
  }, [accessToken]);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('promptpay');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Address form
  const [addressForm, setAddressForm] = useState({
    label: 'บ้าน',
    recipientName: '',
    phone: '',
    address: '',
    subDistrict: '',
    district: '',
    province: '',
    postalCode: '',
    latitude: '',
    longitude: '',
    notes: '',
  });

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const shipping = SHIPPING_OPTIONS.find((s) => s.method === shippingMethod) ?? SHIPPING_OPTIONS[0]!;
  const deliveryFee = subtotal() >= shipping.freeAbove && shipping.freeAbove > 0 ? 0 : shipping.price;
  const total = subtotal() - couponDiscount + deliveryFee;
  const selectedAddress = getSelected();

  const updateAddr = (field: string, value: string) => {
    setAddressForm((f) => ({ ...f, [field]: value }));
  };

  const sanitizeDigits = (value: string) => value.replace(/\D/g, '');

  const validateAddressPayload = (payload: {
    recipientName?: string;
    phone: string;
    address: string;
    province: string;
    postalCode: string;
  }) => {
    if (!payload.recipientName?.trim()) return 'กรุณากรอกชื่อผู้รับ';
    if (!payload.address?.trim()) return 'กรุณากรอกที่อยู่';

    const phone = sanitizeDigits(payload.phone || '');
    if (!/^0\d{9}$/.test(phone)) return 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก และขึ้นต้นด้วย 0';

    const province = normalizeThaiProvince(payload.province || '');
    if (!isThaiProvince(province)) return 'กรุณาเลือกจังหวัดในประเทศไทย';

    const postalCode = sanitizeDigits(payload.postalCode || '');
    if (!/^\d{5}$/.test(postalCode)) return 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก';

    return null;
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }

    setLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      setAddressForm((f) => ({
        ...f,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      }));

      try {
        const url = new URL('https://nominatim.openstreetmap.org/reverse');
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('lat', String(latitude));
        url.searchParams.set('lon', String(longitude));
        url.searchParams.set('accept-language', 'th');

        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          const addr = data?.address ?? {};
          const rawProvince = normalizeThaiProvince(addr.state || addr.province || '');
          const province = isThaiProvince(rawProvince) ? rawProvince : '';

          setAddressForm((f) => ({
            ...f,
            address: data?.display_name || f.address,
            subDistrict: addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || addr.city_district || f.subDistrict,
            district: addr.city || addr.county || addr.municipality || addr.district || f.district,
            province: province || f.province,
            postalCode: addr.postcode || f.postalCode,
          }));
        }
      } catch {
        // ignore reverse-geocode failure; coords already set
      }

      toast.success('ดึงตำแหน่งปัจจุบันแล้ว');
    } catch (err: any) {
      toast.error(err?.message || 'ไม่สามารถดึงตำแหน่งปัจจุบันได้');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSaveAddress = () => {
    const validationError = validateAddressPayload(addressForm);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const payload = {
      ...addressForm,
      phone: sanitizeDigits(addressForm.phone),
      postalCode: sanitizeDigits(addressForm.postalCode),
      province: normalizeThaiProvince(addressForm.province),
      latitude: addressForm.latitude.trim() ? Number(addressForm.latitude) : null,
      longitude: addressForm.longitude.trim() ? Number(addressForm.longitude) : null,
      isDefault: addresses.length === 0,
    };

    addAddress(payload as any);
    setStep('review');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const token = accessToken ?? '';
      const result = await validateCoupon(token, couponCode.trim(), subtotal());
      if (result.valid) {
        setCouponApplied(true);
        setCouponDiscount(result.discountAmount);
        toast.success(result.description || 'ใช้โค้ดส่วนลดสำเร็จ');
      } else {
        toast.error('โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ');
      }
    } catch (err: any) {
      toast.error(err?.message || 'ไม่สามารถตรวจสอบโค้ดส่วนลดได้');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('กรุณาเลือกที่อยู่จัดส่ง');
      return;
    }
    if (items.length === 0) {
      toast.error('ไม่มีสินค้าในตะกร้า');
      return;
    }

    const selectedValidationError = validateAddressPayload({
      recipientName: selectedAddress.recipientName,
      phone: selectedAddress.phone,
      address: selectedAddress.address,
      province: selectedAddress.province,
      postalCode: selectedAddress.postalCode,
    });
    if (selectedValidationError) {
      toast.error(`ที่อยู่จัดส่งไม่ครบหรือไม่ถูกต้อง: ${selectedValidationError}`);
      return;
    }

    setSubmitting(true);
    try {
      const token = accessToken ?? '';
      const order = await createOrder(token, {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        deliveryAddress: {
          address: selectedAddress.address,
          subDistrict: selectedAddress.subDistrict,
          district: selectedAddress.district,
          province: normalizeThaiProvince(selectedAddress.province),
          postalCode: sanitizeDigits(selectedAddress.postalCode),
          phone: sanitizeDigits(selectedAddress.phone),
          recipient: selectedAddress.recipientName,
        },
        paymentMethod,
        discountCode: couponApplied ? couponCode : undefined,
        deliveryNotes: selectedAddress.notes,
      });

      clearCart();
      toast.success('สั่งซื้อสำเร็จ!');
      // Pass QR base64 from API response if available
      const apiResponse = order as any;
      const qrBase64 = apiResponse.payment?.promptpayQrBase64;
      const params = new URLSearchParams({ orderId: order.id });
      if (qrBase64) params.set('qr', qrBase64);
      router.push(`/checkout/success?${params.toString()}`);
    } catch (err: any) {
      toast.error(err?.message || 'สั่งซื้อไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Address Step ─────────────────────────────────────────────────
  if (step === 'address') {
    return (
      <div className="pb-32">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/cart" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold">ที่อยู่จัดส่ง</h1>
        </div>

        {/* Existing Addresses */}
        {addresses.length > 0 && (
          <div className="space-y-2 px-4 mb-4">
            <p className="text-xs font-medium text-muted-foreground">ที่อยู่ที่บันทึกไว้</p>
            {addresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => { selectAddress(addr.id); setStep('review'); }}
                className="w-full rounded-xl border p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{addr.label}</span>
                  {addr.isDefault && <Badge variant="secondary">ค่าเริ่มต้น</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {addr.recipientName} · {addr.phone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {addr.address} {addr.subDistrict} {addr.district} {addr.province} {addr.postalCode}
                </p>
              </button>
            ))}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">หรือเพิ่มที่อยู่ใหม่</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        <div className="space-y-4 px-4">
          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">เพิ่มที่อยู่ใหม่</h2>
            </div>
            <div className="flex gap-2">
              {['บ้าน', 'ที่ทำงาน', 'อื่นๆ'].map((l) => (
                <button
                  key={l}
                  onClick={() => updateAddr('label', l)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    addressForm.label === l ? 'border-primary bg-secondary text-primary' : 'hover:bg-muted'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <Input placeholder="ชื่อผู้รับ *" value={addressForm.recipientName} onChange={(e) => updateAddr('recipientName', e.target.value)} />
            <Input placeholder="เบอร์โทรศัพท์ *" type="tel" inputMode="numeric" maxLength={10} value={addressForm.phone} onChange={(e) => updateAddr('phone', e.target.value)} />
            <Input placeholder="ที่อยู่ (บ้านเลขที่ / ซอย / ถนน) *" value={addressForm.address} onChange={(e) => updateAddr('address', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="แขวง/ตำบล" value={addressForm.subDistrict} onChange={(e) => updateAddr('subDistrict', e.target.value)} />
              <Input placeholder="เขต/อำเภอ" value={addressForm.district} onChange={(e) => updateAddr('district', e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">เลือกตำแหน่งจากพิกัดได้ แล้วระบบจะช่วยเติมที่อยู่ให้</p>
              <Button type="button" variant="outline" size="sm" onClick={handleUseCurrentLocation} disabled={locationLoading}>
                {locationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                ใช้ตำแหน่งปัจจุบัน
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Latitude" type="number" step="any" value={addressForm.latitude} onChange={(e) => updateAddr('latitude', e.target.value)} />
              <Input placeholder="Longitude" type="number" step="any" value={addressForm.longitude} onChange={(e) => updateAddr('longitude', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={addressForm.province}
                onChange={(e) => updateAddr('province', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">จังหวัด *</option>
                {THAI_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
              <Input placeholder="รหัสไปรษณีย์ *" inputMode="numeric" maxLength={5} value={addressForm.postalCode} onChange={(e) => updateAddr('postalCode', e.target.value)} />
            </div>
            <Input placeholder="หมายเหตุ (เช่น วางไว้หน้าประตู)" value={addressForm.notes} onChange={(e) => updateAddr('notes', e.target.value)} />
          </div>
        </div>

        <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
          <div className="mx-auto max-w-lg">
            <Button className="w-full" size="lg" onClick={handleSaveAddress}>
              <Plus className="h-4 w-4" />
              บันทึกที่อยู่และดำเนินการต่อ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Review Step ──────────────────────────────────────────────────
  return (
    <div className="pb-48">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/cart" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">สรุปคำสั่งซื้อ</h1>
      </div>

      <div className="space-y-4 px-4">
        {/* Delivery Address */}
        {selectedAddress && (
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold">ที่อยู่จัดส่ง</h2>
              </div>
              <button onClick={() => setStep('address')} className="text-xs text-primary">
                เปลี่ยน
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm font-medium">{selectedAddress.recipientName} · {selectedAddress.phone}</p>
              <p className="text-xs text-muted-foreground">
                {selectedAddress.address} {selectedAddress.subDistrict} {selectedAddress.district} {selectedAddress.province} {selectedAddress.postalCode}
              </p>
              {selectedAddress.notes && (
                <p className="mt-1 text-xs text-muted-foreground">หมายเหตุ: {selectedAddress.notes}</p>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-bold">รายการสินค้า ({items.length})</h2>
          <div className="mt-3 space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Pill className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                </div>
                <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipping Method */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">วิธีจัดส่ง</h2>
          </div>
          <div className="mt-3 space-y-2">
            {SHIPPING_OPTIONS.map((opt) => {
              const isFree = subtotal() >= opt.freeAbove && opt.freeAbove > 0;
              const ShipIcon = opt.method === 'express' ? Zap : opt.method === 'cold_chain' ? Snowflake : Truck;
              return (
                <button
                  key={opt.method}
                  onClick={() => setShippingMethod(opt.method)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-colors ${
                    shippingMethod === opt.method ? 'border-primary bg-secondary' : 'hover:bg-muted'
                  }`}
                >
                  <ShipIcon className="h-5 w-5 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description} · {opt.eta}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${isFree ? 'text-primary' : ''}`}>
                      {isFree ? 'ฟรี' : formatPrice(opt.price)}
                    </span>
                    {opt.freeAbove > 0 && !isFree && (
                      <p className="text-[10px] text-muted-foreground">ฟรีเมื่อซื้อครบ {formatPrice(opt.freeAbove)}</p>
                    )}
                  </div>
                  {shippingMethod === opt.method && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Method */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">วิธีชำระเงิน</h2>
          </div>
          <div className="mt-3 space-y-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.method}
                onClick={() => setPaymentMethod(opt.method)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 transition-colors ${
                  paymentMethod === opt.method ? 'border-primary bg-secondary' : 'hover:bg-muted'
                }`}
              >
                <opt.icon className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {paymentMethod === opt.method && <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />}
              </button>
            ))}
          </div>

          {/* Slip upload for transfer */}
          {paymentMethod === 'promptpay' && (
            <div className="mt-3 rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-blue-700">
                หลังสั่งซื้อ ระบบจะแสดง QR Code PromptPay ให้สแกนชำระเงิน
              </p>
            </div>
          )}
        </div>

        {/* Coupon Code */}
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">โค้ดส่วนลด</h2>
          </div>
          {couponApplied ? (
            <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
              <div>
                <p className="text-sm font-medium text-primary">{couponCode}</p>
                <p className="text-xs text-muted-foreground">ส่วนลด {formatPrice(couponDiscount)}</p>
              </div>
              <button
                onClick={() => { setCouponApplied(false); setCouponDiscount(0); setCouponCode(''); }}
                className="text-xs text-destructive"
              >
                ลบ
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="กรอกโค้ดส่วนลด"
                className="flex-1"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button variant="outline" onClick={handleApplyCoupon} disabled={!couponCode.trim()}>
                ใช้โค้ด
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white p-4">
        <div className="mx-auto max-w-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ยอดสินค้า</span>
            <span>{formatPrice(subtotal())}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ส่วนลด</span>
              <span className="text-primary">-{formatPrice(couponDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ค่าจัดส่ง ({shipping.label})</span>
            <span className={deliveryFee === 0 ? 'font-medium text-primary' : ''}>
              {deliveryFee === 0 ? 'ฟรี' : formatPrice(deliveryFee)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>รวมทั้งหมด</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
          <Button className="w-full" size="lg" onClick={handlePlaceOrder} disabled={submitting || !selectedAddress}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'กำลังสั่งซื้อ...' : `ยืนยันสั่งซื้อ · ${formatPrice(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
