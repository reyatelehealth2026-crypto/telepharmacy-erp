import { Injectable } from '@nestjs/common';
import type {
  FlexBubble,
  FlexCarousel,
  FlexComponent,
  LineFlexMessageObject,
} from '../types/line-events.types';

interface OrderSummaryData {
  orderNo: string;
  items: { name: string; qty: number; price: number }[];
  totalAmount: number;
  paymentMethod: string;
  shopUrl: string;
}

interface RxStatusData {
  prescriptionNo: string;
  patientName: string;
  status: string;
  statusLabel: string;
  pharmacistName?: string;
  note?: string;
  shopUrl: string;
}

interface ProductCardData {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  shopUrl: string;
}

interface WelcomeData {
  displayName: string;
  shopUrl: string;
  registerUrl: string;
  linkUrl: string;
  profileUrl: string;
  rxUploadUrl: string;
  isRegistered: boolean;
  journeyState?: 'new_unregistered' | 'stub_unfinished' | 'link_pending' | 'linked_returning';
}

@Injectable()
export class FlexMessageService {
  welcome(data: WelcomeData): LineFlexMessageObject {
    const subtitle = data.journeyState === 'link_pending'
      ? 'พร้อมเชื่อมบัญชีเดิมต่อได้ทันที'
      : data.journeyState === 'stub_unfinished'
        ? 'กลับมากรอกข้อมูลหรือเชื่อมบัญชีต่อได้เลย'
        : data.isRegistered
          ? 'ยินดีต้อนรับกลับสู่ Re-Ya Telepharmacy'
          : 'ยินดีต้อนรับสู่ Re-Ya Telepharmacy';

    const memberActionLabel = data.isRegistered
      ? '👤 โปรไฟล์ของฉัน'
      : data.journeyState === 'stub_unfinished'
        ? '📝 กรอกข้อมูลต่อ'
        : '📝 สมัครสมาชิก';

    const membershipBenefitText = data.isRegistered
      ? '👤 ดูข้อมูลสมาชิกและประวัติการรักษา'
      : data.journeyState === 'link_pending'
        ? '🔗 เชื่อมบัญชีเดิมต่อจากที่ค้างไว้'
        : '🔗 เชื่อมบัญชีเดิมหรือสมัครสมาชิกได้ทันที';

    const bubble: FlexBubble = {
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://re-ya.com/images/welcome-banner.jpg',
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `สวัสดีค่ะ ${data.displayName} 🙏`,
            weight: 'bold',
            size: 'xl',
            wrap: true,
          },
          {
            type: 'text',
            text: subtitle,
            size: 'sm',
            color: '#999999',
            margin: 'md',
            wrap: true,
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '💊 สั่งซื้อยาและผลิตภัณฑ์สุขภาพ',
                size: 'sm',
                wrap: true,
              },
              {
                type: 'text',
                text: '📋 อัปโหลดใบสั่งยา (Rx)',
                size: 'sm',
                wrap: true,
              },
              {
                type: 'text',
                text: '💬 ปรึกษาเภสัชกรออนไลน์',
                size: 'sm',
                wrap: true,
              },
              {
                type: 'text',
                text: membershipBenefitText,
                size: 'sm',
                wrap: true,
              },
              {
                type: 'text',
                text: '🚚 จัดส่งถึงบ้านทั่วประเทศ',
                size: 'sm',
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1DB446',
            action: {
              type: 'uri',
              label: '🛒 เปิดร้านค้า',
              uri: data.shopUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'uri',
              label: memberActionLabel,
              uri: data.isRegistered ? data.profileUrl : data.registerUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'uri',
              label: '🔗 เชื่อมบัญชีเดิม',
              uri: data.linkUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '💬 ปรึกษาเภสัชกร',
              data: 'action=consult',
              displayText: 'ขอปรึกษาเภสัชกร',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'uri',
              label: '📋 อัปโหลดใบสั่งยา',
              uri: data.rxUploadUrl,
            },
          },
        ],
      },
    };

    return {
      type: 'flex',
      altText: `สวัสดีค่ะ ${data.displayName} — ยินดีต้อนรับสู่ Re-Ya Telepharmacy`,
      contents: bubble,
    };
  }

  medicationReminder(data: {
    medicationName: string;
    dosage: string;
    scheduledTime?: string;
  }): LineFlexMessageObject {
    const bubble: FlexBubble = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `💊 ${data.medicationName}`,
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'text',
            text: data.dosage,
            size: 'sm',
            wrap: true,
            margin: 'md',
          },
          ...(data.scheduledTime
            ? [
                {
                  type: 'text' as const,
                  text: `เวลา: ${data.scheduledTime}`,
                  size: 'xs',
                  color: '#666666',
                },
              ]
            : []),
        ],
      },
    };

    return {
      type: 'flex',
      altText: `แจ้งเตือนทานยา: ${data.medicationName} — ${data.dosage}`,
      contents: bubble,
    };
  }

  promotionalMessage(data: {
    title: string;
    description: string;
    code?: string;
    discount: string;
    expiresAt?: string;
    imageUrl?: string;
    shopUrl: string;
  }): LineFlexMessageObject {
    const bodyContents: FlexComponent[] = [
      {
        type: 'text',
        text: '🎉 โปรโมชั่นพิเศษ',
        weight: 'bold',
        color: '#1DB446',
        size: 'sm',
      },
      {
        type: 'text',
        text: data.title,
        weight: 'bold',
        size: 'xl',
        margin: 'md',
        wrap: true,
      },
      {
        type: 'text',
        text: data.description,
        size: 'sm',
        color: '#666666',
        wrap: true,
        margin: 'md',
      },
      { type: 'separator', margin: 'lg' },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'lg',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: data.discount,
            size: 'xl',
            weight: 'bold',
            color: '#FF5551',
            align: 'center',
          },
        ],
      },
    ];

    if (data.code) {
      bodyContents.push({
        type: 'box',
        layout: 'horizontal',
        margin: 'md',
        contents: [
          { type: 'text', text: 'โค้ด:', size: 'sm', color: '#aaaaaa', flex: 0 },
          {
            type: 'text',
            text: data.code,
            size: 'md',
            weight: 'bold',
            color: '#1DB446',
            align: 'end',
          },
        ],
      });
    }

    if (data.expiresAt) {
      bodyContents.push({
        type: 'text',
        text: `หมดเขต ${data.expiresAt}`,
        size: 'xs',
        color: '#999999',
        align: 'center',
        margin: 'md',
      });
    }

    const bubble: FlexBubble = {
      type: 'bubble',
      ...(data.imageUrl
        ? {
            hero: {
              type: 'image' as const,
              url: data.imageUrl,
              size: 'full',
              aspectRatio: '20:13',
              aspectMode: 'cover' as const,
            },
          }
        : {}),
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1DB446',
            action: {
              type: 'uri',
              label: '🛒 ช้อปเลย',
              uri: data.shopUrl,
            },
          },
        ],
      },
    };

    return {
      type: 'flex',
      altText: `โปรโมชั่น: ${data.title} — ${data.discount}`,
      contents: bubble,
    };
  }
}
