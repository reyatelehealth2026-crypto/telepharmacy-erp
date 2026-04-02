import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SystemConfigService } from './system-config.service';
import { DynamicConfigService } from './dynamic-config.service';

/**
 * Defines which keys each integration group supports.
 * Keys are stored as `{group}.{field}` in system_config table.
 * Env fallback mapping tells us which env var to show as placeholder.
 */
const INTEGRATION_GROUPS: Record<string, { fields: string[]; envMap: Record<string, string> }> = {
  line: {
    fields: ['channelAccessToken', 'channelSecret', 'channelId', 'liffId'],
    envMap: {
      channelAccessToken: 'LINE_CHANNEL_ACCESS_TOKEN',
      channelSecret: 'LINE_CHANNEL_SECRET',
      channelId: 'LINE_CHANNEL_ID',
      liffId: 'LINE_LIFF_ID',
    },
  },
  odoo: {
    fields: ['baseUrl', 'apiUser', 'apiToken', 'syncIntervalMs', 'stockCacheTtlSec'],
    envMap: {
      baseUrl: 'ODOO_BASE_URL',
      apiUser: 'ODOO_API_USER',
      apiToken: 'ODOO_API_TOKEN',
      syncIntervalMs: 'ODOO_SYNC_INTERVAL_MS',
      stockCacheTtlSec: 'ODOO_STOCK_CACHE_TTL_SEC',
    },
  },
  payment: {
    fields: ['omisePublicKey', 'omiseSecretKey', 'promptpayEnabled', 'creditCardEnabled', 'transferEnabled'],
    envMap: {
      omisePublicKey: 'OMISE_PUBLIC_KEY',
      omiseSecretKey: 'OMISE_SECRET_KEY',
      promptpayEnabled: '',
      creditCardEnabled: '',
      transferEnabled: '',
    },
  },
  ai: {
    fields: ['geminiApiKey'],
    envMap: {
      geminiApiKey: 'GEMINI_API_KEY',
    },
  },
  meilisearch: {
    fields: ['host', 'masterKey'],
    envMap: {
      host: 'MEILI_HOST',
      masterKey: 'MEILI_MASTER_KEY',
    },
  },
  telemedicine: {
    fields: [
      'agoraAppId', 'agoraAppCertificate',
      'awsRegion', 'awsAccessKeyId', 'awsSecretAccessKey',
      'thaiSmsApiKey', 'thaiSmsSender',
      'auditEncryptionKey', 'pharmacyCouncilApiKey',
    ],
    envMap: {
      agoraAppId: 'AGORA_APP_ID',
      agoraAppCertificate: 'AGORA_APP_CERTIFICATE',
      awsRegion: 'AWS_REKOGNITION_REGION',
      awsAccessKeyId: 'AWS_REKOGNITION_ACCESS_KEY',
      awsSecretAccessKey: 'AWS_REKOGNITION_SECRET_KEY',
      thaiSmsApiKey: 'THAI_SMS_API_KEY',
      thaiSmsSender: 'THAI_SMS_SENDER',
      auditEncryptionKey: 'AUDIT_ENCRYPTION_KEY',
      pharmacyCouncilApiKey: 'PHARMACY_COUNCIL_API_KEY',
    },
  },
};

@Controller('system/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SystemConfigController {
  constructor(
    private readonly configService: SystemConfigService,
    private readonly dynamicConfig: DynamicConfigService,
  ) {}

  @Get()
  async getAll() {
    const configs = await this.configService.getAll();
    return { success: true, data: configs };
  }

  @Get('pharmacy')
  async getPharmacySettings() {
    const settings = await this.configService.getPharmacySettings();
    return { success: true, data: settings };
  }

  @Patch('pharmacy')
  async updatePharmacySettings(
    @Body() body: { pharmacyName?: string; phone?: string; email?: string; address?: string; openHours?: string },
    @CurrentUser() user: any,
  ) {
    await this.configService.setMany(
      Object.entries(body)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => ({ key: `pharmacy.${k}`, value: v })),
      user.id,
    );
    return { success: true, message: 'บันทึกเรียบร้อย' };
  }

  @Get('notifications')
  async getNotificationSettings() {
    const settings = await this.configService.getNotificationSettings();
    return { success: true, data: settings };
  }

  @Patch('notifications')
  async updateNotificationSettings(
    @Body() body: Record<string, boolean>,
    @CurrentUser() user: any,
  ) {
    const allowedKeys = [
      'newOrder', 'lowStock', 'rxPending', 'newComplaint', 'newConsultation',
      'orderConfirmation', 'orderShipped', 'orderDelivered',
      'prescriptionStatus', 'medicationReminder', 'promotionalMessages',
    ];
    await this.configService.setMany(
      Object.entries(body)
        .filter(([k, v]) => allowedKeys.includes(k) && v !== undefined)
        .map(([k, v]) => ({ key: `notifications.${k}`, value: v })),
      user.id,
    );
    return { success: true, message: 'บันทึกเรียบร้อย' };
  }

  @Get('delivery')
  async getDeliverySettings() {
    const all = await this.configService.getAll();
    return {
      success: true,
      data: {
        freeDeliveryThreshold: all['delivery.freeDeliveryThreshold'] ?? '500',
        standardDeliveryFee: all['delivery.standardDeliveryFee'] ?? '50',
        expressDeliveryFee: all['delivery.expressDeliveryFee'] ?? '100',
        standardDeliveryDays: all['delivery.standardDeliveryDays'] ?? '3-5',
        expressDeliveryDays: all['delivery.expressDeliveryDays'] ?? '1-2',
        enableExpress: all['delivery.enableExpress'] ?? true,
        enableCOD: all['delivery.enableCOD'] ?? false,
        maxWeight: all['delivery.maxWeight'] ?? '20',
      },
    };
  }

  @Patch('delivery')
  async updateDeliverySettings(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: any,
  ) {
    const allowedKeys = [
      'freeDeliveryThreshold', 'standardDeliveryFee', 'expressDeliveryFee',
      'standardDeliveryDays', 'expressDeliveryDays', 'enableExpress', 'enableCOD', 'maxWeight',
    ];
    await this.configService.setMany(
      Object.entries(body)
        .filter(([k, v]) => allowedKeys.includes(k) && v !== undefined)
        .map(([k, v]) => ({ key: `delivery.${k}`, value: v })),
      user.id,
    );
    return { success: true, message: 'บันทึกเรียบร้อย' };
  }

  // ─── Integration Config Endpoints ──────────────────────────────

  /** List all available integration groups. */
  @Get('integrations')
  async listIntegrations() {
    const groups = Object.keys(INTEGRATION_GROUPS);
    return { success: true, data: groups };
  }

  /** Get config for a specific integration group (sensitive values masked). */
  @Get('integrations/:group')
  async getIntegration(@Param('group') group: string) {
    const def = INTEGRATION_GROUPS[group];
    if (!def) {
      return { success: false, message: `Unknown integration group: ${group}` };
    }

    const dbValues = await this.configService.getByPrefix(group);

    // Build response: DB value (masked if sensitive) or indicate env fallback
    const result: Record<string, { value: unknown; source: 'db' | 'env' | 'unset'; envVar: string }> = {};
    for (const field of def.fields) {
      const envVar = def.envMap[field] ?? '';
      if (dbValues[field] !== undefined) {
        result[field] = { value: dbValues[field], source: 'db', envVar };
      } else {
        const envVal = process.env[envVar];
        result[field] = {
          value: envVal ? '(ใช้ค่าจาก ENV)' : '',
          source: envVal ? 'env' : 'unset',
          envVar,
        };
      }
    }

    return { success: true, data: result };
  }

  /** Update config for a specific integration group. */
  @Patch('integrations/:group')
  async updateIntegration(
    @Param('group') group: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: any,
  ) {
    const def = INTEGRATION_GROUPS[group];
    if (!def) {
      return { success: false, message: `Unknown integration group: ${group}` };
    }

    const entries = Object.entries(body)
      .filter(([k]) => def.fields.includes(k))
      .map(([k, v]) => ({ key: `${group}.${k}`, value: v }));

    await this.configService.setManySkipMasked(entries, user.id);
    // Invalidate DynamicConfigService cache so new values take effect immediately
    this.dynamicConfig.invalidate();
    return { success: true, message: 'บันทึกเรียบร้อย' };
  }
}
