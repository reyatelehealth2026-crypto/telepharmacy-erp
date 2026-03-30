import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number };
  action: { type: string; uri?: string; data?: string; label?: string; text?: string };
}

interface RichMenuObject {
  size: { width: 2500; height: 1686 | 843 };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: RichMenuArea[];
}

/**
 * Manages LINE Rich Menu lifecycle — create, upload image, link, switch per user/segment.
 */
@Injectable()
export class RichMenuService {
  private readonly logger = new Logger(RichMenuService.name);
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.getOrThrow<string>('line.channelAccessToken');
  }

  /**
   * Create the default 6-button Rich Menu for registered patients.
   */
  getDefaultMenuObject(shopUrl: string): RichMenuObject {
    const w = 2500;
    const h = 1686;
    const colW = Math.floor(w / 3);
    const rowH = Math.floor(h / 2);

    return {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'ReYa Main Menu',
      chatBarText: 'เมนู Re-Ya',
      areas: [
        {
          bounds: { x: 0, y: 0, width: colW, height: rowH },
          action: { type: 'uri', uri: shopUrl, label: 'สั่งซื้อ' },
        },
        {
          bounds: { x: colW, y: 0, width: colW, height: rowH },
          action: { type: 'uri', uri: `${shopUrl}/rx/upload`, label: 'ใบสั่งยา' },
        },
        {
          bounds: { x: colW * 2, y: 0, width: colW, height: rowH },
          action: { type: 'uri', uri: `${shopUrl}/orders`, label: 'ติดตาม' },
        },
        {
          bounds: { x: 0, y: rowH, width: colW, height: rowH },
          action: { type: 'postback', data: 'action=slip_upload', label: 'สลิป' },
        },
        {
          bounds: { x: colW, y: rowH, width: colW, height: rowH },
          action: { type: 'postback', data: 'action=consult', label: 'สอบถาม' },
        },
        {
          bounds: { x: colW * 2, y: rowH, width: colW, height: rowH },
          action: { type: 'uri', uri: 'tel:+6620001234', label: 'โทรหาเรา' },
        },
      ],
    };
  }

  /**
   * Sync (create + upload image + set default) rich menu on LINE Platform.
   */
  async sync(imageBuffer: Buffer, shopUrl: string): Promise<{ richMenuId: string }> {
    const menuObj = this.getDefaultMenuObject(shopUrl);

    // 1) Create rich menu
    const createRes = await this.request('/richmenu', menuObj);
    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`Failed to create rich menu: ${body}`);
    }
    const { richMenuId } = (await createRes.json()) as { richMenuId: string };
    this.logger.log(`Rich menu created: ${richMenuId}`);

    // 2) Upload image
    const uploadRes = await fetch(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'image/png',
        },
        body: imageBuffer,
      },
    );
    if (!uploadRes.ok) {
      const body = await uploadRes.text();
      throw new Error(`Failed to upload rich menu image: ${body}`);
    }
    this.logger.log(`Rich menu image uploaded for ${richMenuId}`);

    // 3) Set as default
    const defaultRes = await fetch(
      `${LINE_API_BASE}/user/all/richmenu/${richMenuId}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );
    if (!defaultRes.ok) {
      const body = await defaultRes.text();
      this.logger.warn(`Failed to set default rich menu: ${body}`);
    }

    return { richMenuId };
  }

  /**
   * Link a rich menu to a specific user.
   */
  async linkToUser(userId: string, richMenuId: string): Promise<void> {
    const res = await fetch(
      `${LINE_API_BASE}/user/${userId}/richmenu/${richMenuId}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Failed to link rich menu to user: ${body}`);
    }
  }

  /**
   * Link a rich menu to multiple users.
   */
  async linkToUsers(userIds: string[], richMenuId: string): Promise<void> {
    const res = await this.request('/richmenu/bulk/link', {
      richMenuId,
      userIds,
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Failed to bulk link rich menu: ${body}`);
    }
  }

  /**
   * Unlink rich menu from a user (revert to default).
   */
  async unlinkFromUser(userId: string): Promise<void> {
    const res = await fetch(`${LINE_API_BASE}/user/${userId}/richmenu`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Failed to unlink rich menu from user: ${body}`);
    }
  }

  /**
   * List all rich menus on the channel.
   */
  async listAll(): Promise<any[]> {
    const res = await fetch(`${LINE_API_BASE}/richmenu/list`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { richmenus: any[] };
    return data.richmenus;
  }

  /**
   * Delete a rich menu.
   */
  async deleteMenu(richMenuId: string): Promise<void> {
    await fetch(`${LINE_API_BASE}/richmenu/${richMenuId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
  }

  private async request(path: string, body: unknown): Promise<Response> {
    return fetch(`${LINE_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });
  }
}
