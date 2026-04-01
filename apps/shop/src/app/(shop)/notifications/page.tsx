'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Package,
  Pill,
  Megaphone,
  MessageCircle,
  Loader2,
  CheckCheck,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { Button } from '@/components/ui/button';
import {
  getMyNotifications,
  markRead,
  markAllRead,
  type Notification,
} from '@/lib/notifications';

/** Map referenceType → target route */
function getNotificationRoute(notif: Notification): string | null {
  if (!notif.referenceType || !notif.referenceId) return null;

  switch (notif.referenceType) {
    case 'order':
      return `/orders/${notif.referenceId}`;
    case 'prescription':
      return `/rx/${notif.referenceId}`;
    case 'consultation':
      return `/consultation/${notif.referenceId}`;
    case 'complaint':
      return '/complaints';
    default:
      return null;
  }
}

/** Map notification type → icon + color */
function getNotifStyle(type: string) {
  switch (type) {
    case 'order_status':
    case 'order_confirmation':
      return { Icon: Package, color: 'text-purple-500 bg-purple-100' };
    case 'prescription_status':
    case 'refill_reminder':
      return { Icon: Pill, color: 'text-blue-500 bg-blue-100' };
    case 'promotion':
      return { Icon: Megaphone, color: 'text-amber-500 bg-amber-100' };
    case 'chat_message':
      return { Icon: MessageCircle, color: 'text-green-500 bg-green-100' };
    case 'complaint_status':
      return { Icon: AlertCircle, color: 'text-red-500 bg-red-100' };
    default:
      return { Icon: Bell, color: 'text-slate-500 bg-slate-100' };
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuthGuard();
  const { accessToken } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await getMyNotifications(accessToken);
      setNotifications(res.data ?? []);
      setUnreadCount(res.unreadCount ?? 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleTap = async (notif: Notification) => {
    if (!accessToken) return;

    // Mark as read if unread
    if (!notif.readAt) {
      try {
        await markRead(accessToken, notif.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // silent — still navigate
      }
    }

    // Navigate to relevant page based on referenceType
    const route = getNotificationRoute(notif);
    if (route) {
      router.push(route);
    }
  };

  const handleReadAll = async () => {
    if (!accessToken) return;
    try {
      await markAllRead(accessToken);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-full p-1 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold">การแจ้งเตือน</h1>
          {unreadCount > 0 && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReadAll}>
            <CheckCheck className="h-4 w-4 mr-1" />
            อ่านทั้งหมด
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1 px-4">
          {notifications.map((notif) => {
            const { Icon, color } = getNotifStyle(notif.type);
            const isRead = !!notif.readAt;
            const hasRoute = !!getNotificationRoute(notif);

            return (
              <div
                key={notif.id}
                role="button"
                tabIndex={0}
                onClick={() => handleTap(notif)}
                onKeyDown={(e) => e.key === 'Enter' && handleTap(notif)}
                className={`flex gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50 cursor-pointer ${
                  !isRead ? 'bg-primary/5' : ''
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-sm truncate ${!isRead ? 'font-bold' : 'font-medium'}`}
                    >
                      {notif.title}
                    </h3>
                    {!isRead && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  {notif.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                      {notif.body}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(notif.createdAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {hasRoute && (
                  <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </div>
            );
          })}

          {notifications.length === 0 && (
            <div className="py-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
