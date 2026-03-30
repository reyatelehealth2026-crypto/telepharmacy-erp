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
}

@Injectable()
export class FlexMessageService {
  welcome(data: WelcomeData): LineFlexMessageObject {
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
            text: 'ยินดีต้อนรับสู่ Re-Ya Telepharmacy',
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
              type: 'postback',
              label: '💬 ปรึกษาเภสัชกร',
              data: 'action=consult',
              displayText: 'ขอปรึกษาเภสัชกร',
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

  orderSummary(data: OrderSummaryData): LineFlexMessageObject {
    const itemComponents: FlexComponent[] = data.items.map((item) => ({
      type: 'box' as const,
      layout: 'horizontal' as const,
      contents: [
        {
          type: 'text' as const,
          text: `${item.name} x${item.qty}`,
          size: 'sm',
          color: '#555555',
          flex: 0,
          wrap: true,
        },
        {
          type: 'text' as const,
          text: `฿${item.price.toLocaleString()}`,
          size: 'sm',
          color: '#111111',
          align: 'end' as const,
        },
      ],
    }));

    const bubble: FlexBubble = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'สรุปออเดอร์',
            weight: 'bold',
            color: '#1DB446',
            size: 'sm',
          },
          {
            type: 'text',
            text: data.orderNo,
            weight: 'bold',
            size: 'xxl',
            margin: 'md',
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: itemComponents,
          },
          { type: 'separator', margin: 'lg' },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            contents: [
              {
                type: 'text',
                text: 'รวมทั้งสิ้น',
                size: 'md',
                weight: 'bold',
                color: '#555555',
              },
              {
                type: 'text',
                text: `฿${data.totalAmount.toLocaleString()}`,
                size: 'md',
                weight: 'bold',
                color: '#1DB446',
                align: 'end',
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'ชำระเงิน',
                size: 'xs',
                color: '#aaaaaa',
                flex: 0,
              },
              {
                type: 'text',
                text: data.paymentMethod,
                size: 'xs',
                color: '#aaaaaa',
                align: 'end',
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
              label: '📦 ติดตามออเดอร์',
              uri: `${data.shopUrl}/orders`,
            },
          },
        ],
      },
    };

    return {
      type: 'flex',
      altText: `สรุปออเดอร์ ${data.orderNo} — ฿${data.totalAmount.toLocaleString()}`,
      contents: bubble,
    };
  }

  rxStatus(data: RxStatusData): LineFlexMessageObject {
    const statusColor = this.getRxStatusColor(data.status);

    const bodyContents: FlexComponent[] = [
      {
        type: 'text',
        text: '📋 สถานะใบสั่งยา',
        weight: 'bold',
        size: 'lg',
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'lg',
        contents: [
          { type: 'text', text: 'เลขที่', size: 'sm', color: '#aaaaaa', flex: 0 },
          {
            type: 'text',
            text: data.prescriptionNo,
            size: 'sm',
            color: '#333333',
            align: 'end',
            weight: 'bold',
          },
        ],
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          { type: 'text', text: 'ผู้ป่วย', size: 'sm', color: '#aaaaaa', flex: 0 },
          {
            type: 'text',
            text: data.patientName,
            size: 'sm',
            color: '#333333',
            align: 'end',
          },
        ],
      },
      { type: 'separator', margin: 'lg' },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'lg',
        contents: [
          { type: 'text', text: 'สถานะ', size: 'md', color: '#555555' },
          {
            type: 'text',
            text: data.statusLabel,
            size: 'md',
            weight: 'bold',
            color: statusColor,
            align: 'end',
          },
        ],
      },
    ];

    if (data.pharmacistName) {
      bodyContents.push({
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          { type: 'text', text: 'เภสัชกร', size: 'sm', color: '#aaaaaa', flex: 0 },
          {
            type: 'text',
            text: data.pharmacistName,
            size: 'sm',
            color: '#333333',
            align: 'end',
          },
        ],
      });
    }

    if (data.note) {
      bodyContents.push({
        type: 'text',
        text: data.note,
        size: 'xs',
        color: '#888888',
        wrap: true,
        margin: 'lg',
      });
    }

    const bubble: FlexBubble = {
      type: 'bubble',
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
              label: '📋 ดูรายละเอียด',
              uri: `${data.shopUrl}/rx/status`,
            },
          },
        ],
      },
    };

    return {
      type: 'flex',
      altText: `ใบสั่งยา ${data.prescriptionNo}: ${data.statusLabel}`,
      contents: bubble,
    };
  }

  productCards(
    products: ProductCardData[],
  ): LineFlexMessageObject {
    const bubbles: FlexBubble[] = products.slice(0, 10).map((p) => ({
      type: 'bubble' as const,
      hero: {
        type: 'image' as const,
        url: p.imageUrl,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover' as const,
        action: {
          type: 'uri' as const,
          label: 'ดูสินค้า',
          uri: `${p.shopUrl}/product/${p.id}`,
        },
      },
      body: {
        type: 'box' as const,
        layout: 'vertical' as const,
        contents: [
          {
            type: 'text' as const,
            text: p.name,
            weight: 'bold' as const,
            size: 'md',
            wrap: true,
          },
          {
            type: 'text' as const,
            text: p.description,
            size: 'xs',
            color: '#999999',
            wrap: true,
            margin: 'sm',
          },
          {
            type: 'text' as const,
            text: `฿${p.price.toLocaleString()}`,
            size: 'lg',
            weight: 'bold' as const,
            color: '#1DB446',
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box' as const,
        layout: 'vertical' as const,
        spacing: 'sm',
        contents: [
          {
            type: 'button' as const,
            style: 'primary' as const,
            color: '#1DB446',
            action: {
              type: 'uri' as const,
              label: '🛒 สั่งซื้อ',
              uri: `${p.shopUrl}/product/${p.id}`,
            },
          },
        ],
      },
    }));

    const carousel: FlexCarousel = { type: 'carousel', contents: bubbles };

    return {
      type: 'flex',
      altText: `สินค้าแนะนำ ${products.length} รายการ`,
      contents: carousel,
    };
  }

  paymentConfirmation(data: {
    orderNo: string;
    amount: number;
    paidAt: string;
    shopUrl: string;
  }): LineFlexMessageObject {
    const bubble: FlexBubble = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅ ชำระเงินสำเร็จ',
            weight: 'bold',
            color: '#1DB446',
            size: 'lg',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ออเดอร์', size: 'sm', color: '#aaaaaa', flex: 0 },
                  {
                    type: 'text',
                    text: data.orderNo,
                    size: 'sm',
                    color: '#333333',
                    align: 'end',
                    weight: 'bold',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'จำนวน', size: 'sm', color: '#aaaaaa', flex: 0 },
                  {
                    type: 'text',
                    text: `฿${data.amount.toLocaleString()}`,
                    size: 'sm',
                    color: '#1DB446',
                    align: 'end',
                    weight: 'bold',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'เวลา', size: 'sm', color: '#aaaaaa', flex: 0 },
                  {
                    type: 'text',
                    text: data.paidAt,
                    size: 'sm',
                    color: '#333333',
                    align: 'end',
                  },
                ],
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
              label: '📦 ติดตามออเดอร์',
              uri: `${data.shopUrl}/orders`,
            },
          },
        ],
      },
    };

    return {
      type: 'flex',
      altText: `ชำระเงินสำเร็จ ${data.orderNo} — ฿${data.amount.toLocaleString()}`,
      contents: bubble,
    };
  }

  deliveryUpdate(data: {
    orderNo: string;
    trackingNo: string;
    provider: string;
    statusLabel: string;
    trackingUrl?: string;
    shopUrl: string;
  }): LineFlexMessageObject {
    const footerContents: FlexComponent[] = [];

    if (data.trackingUrl) {
      footerContents.push({
        type: 'button',
        style: 'primary',
        color: '#1DB446',
        action: {
          type: 'uri',
          label: '🚚 ติดตามพัสดุ',
          uri: data.trackingUrl,
        },
      });
    }

    footerContents.push({
      type: 'button',
      style: 'secondary',
      action: {
        type: 'uri',
        label: '📦 ดูออเดอร์',
        uri: `${data.shopUrl}/orders`,
      },
    });

    const bubble: FlexBubble = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🚚 อัปเดตการจัดส่ง',
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ออเดอร์', size: 'sm', color: '#aaaaaa', flex: 0 },
                  {
                    type: 'text',
                    text: data.orderNo,
                    size: 'sm',
                    color: '#333333',
                    align: 'end',
                    weight: 'bold',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ขนส่ง', size: 'sm', color: '#aaaaaa', flex: 0 },
                  {
                    type: 'text',
                    text: data.provider,
                    size: 'sm',
                    color: '#333333',
                    align: 'end',
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'เลขพัสดุ', size: 'sm', color: '#aaaaaa', flex: 0 },
                  {
                    type: 'text',
                    text: data.trackingNo,
                    size: 'sm',
                    color: '#333333',
                    align: 'end',
                  },
                ],
              },
              { type: 'separator', margin: 'md' },
              {
                type: 'text',
                text: data.statusLabel,
                size: 'md',
                weight: 'bold',
                color: '#1DB446',
                margin: 'md',
                align: 'center',
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: footerContents,
      },
    };

    return {
      type: 'flex',
      altText: `อัปเดตการจัดส่ง ${data.orderNo}: ${data.statusLabel}`,
      contents: bubble,
    };
  }

  private getRxStatusColor(status: string): string {
    const colors: Record<string, string> = {
      received: '#999999',
      ai_processing: '#FF9800',
      ai_completed: '#FF9800',
      pharmacist_reviewing: '#2196F3',
      approved: '#1DB446',
      partial: '#FF9800',
      rejected: '#F44336',
      dispensing: '#2196F3',
      dispensed: '#1DB446',
      shipped: '#1DB446',
      delivered: '#1DB446',
      cancelled: '#F44336',
    };
    return colors[status] ?? '#999999';
  }
}
