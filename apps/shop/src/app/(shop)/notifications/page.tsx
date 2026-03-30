import Link from 'next/link';
import { ArrowLeft, Bell, Package, Pill, Megaphone } from 'lucide-react';

const mockNotifications = [
  {
    id: '1',
    type: 'order_shipped',
    title: 'จัดส่งแล้ว!',
    body: 'ออเดอร์ #REYA-20260330-001 จัดส่งแล้ว คาดถึง 1 เม.ย.',
    isRead: false,
    createdAt: '2026-03-30T14:00:00',
    icon: Package,
    color: 'text-purple-500 bg-purple-100',
  },
  {
    id: '2',
    type: 'prescription_status',
    title: 'ใบสั่งยาอนุมัติแล้ว',
    body: 'RX-20260330-001 ผ่านการตรวจสอบแล้ว กรุณาชำระเงิน',
    isRead: false,
    createdAt: '2026-03-30T10:00:00',
    icon: Pill,
    color: 'text-green-500 bg-green-100',
  },
  {
    id: '3',
    type: 'promotion',
    title: 'Flash Sale วันนี้!',
    body: 'วิตามินซี ลด 30% เฉพาะวันนี้เท่านั้น',
    isRead: true,
    createdAt: '2026-03-29T09:00:00',
    icon: Megaphone,
    color: 'text-amber-500 bg-amber-100',
  },
  {
    id: '4',
    type: 'refill_reminder',
    title: 'ถึงเวลาเติมยา',
    body: 'Metformin 500mg ของคุณกำลังจะหมด สั่งซื้อซ้ำได้เลย',
    isRead: true,
    createdAt: '2026-03-28T08:00:00',
    icon: Pill,
    color: 'text-blue-500 bg-blue-100',
  },
];

export default function NotificationsPage() {
  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="rounded-full p-1 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">การแจ้งเตือน</h1>
      </div>

      <div className="space-y-1 px-4">
        {mockNotifications.map((notif) => {
          const Icon = notif.icon;
          return (
            <div
              key={notif.id}
              className={`flex gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50 ${
                !notif.isRead ? 'bg-primary/5' : ''
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${notif.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h3 className={`text-sm ${!notif.isRead ? 'font-bold' : 'font-medium'}`}>
                    {notif.title}
                  </h3>
                  {!notif.isRead && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{notif.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(notif.createdAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}

        {mockNotifications.length === 0 && (
          <div className="py-12 text-center">
            <Bell className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
          </div>
        )}
      </div>
    </div>
  );
}
