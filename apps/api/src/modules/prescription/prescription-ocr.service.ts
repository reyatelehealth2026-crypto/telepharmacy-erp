import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { prescriptions, prescriptionItems } from '@telepharmacy/db';
import { extractPrescription, extractMultiplePrescriptionImages } from '@telepharmacy/ai';
import { DRIZZLE } from '../../database/database.constants';
import { MinioStorageService } from '../telemedicine/kyc/minio.service';
import { DynamicConfigService } from '../health/dynamic-config.service';

interface PrescriptionOcrResult {
  prescriber: { name: string; licenseNo?: string; hospital?: string; department?: string };
  patient: { name: string; age?: string };
  items: Array<{ drugName: string; strength?: string; dosageForm?: string; quantity: string; sig: string; duration?: string }>;
  diagnosis?: string;
  rxDate?: string;
  confidence: number;
  rawText?: string;
}

export const OCR_QUEUE = 'ocr-queue';

const OcrItemSchema = z.object({
  drugName: z.string().min(1),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  quantity: z.string().optional(),
  sig: z.string().optional(),
  duration: z.string().optional(),
});

const OcrResultSchema = z.object({
  prescriber: z.object({
    name: z.string(),
    licenseNo: z.string().optional(),
    hospital: z.string().optional(),
    department: z.string().optional(),
  }),
  patient: z.object({
    name: z.string(),
    age: z.string().optional(),
  }),
  items: z.array(OcrItemSchema).default([]),
  diagnosis: z.string().optional(),
  rxDate: z.string().optional(),
  confidence: z.number().min(0).max(1),
  rawText: z.string().optional(),
});

export type ValidatedOcrResult = z.infer<typeof OcrResultSchema>;

export const LOW_CONFIDENCE_THRESHOLD = 0.4;

@Injectable()
export class PrescriptionOcrService {
  private readonly logger = new Logger(PrescriptionOcrService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    @InjectQueue(OCR_QUEUE) private readonly ocrQueue: Queue,
    private readonly dynamicConfig: DynamicConfigService,
    private readonly minioStorage: MinioStorageService,
  ) {}

  async enqueueOcrJob(prescriptionId: string): Promise<void> {
    await this.ocrQueue.add(
      'process-rx',
      { prescriptionId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Enqueued OCR job for prescription ${prescriptionId}`);
  }

  async processOcr(prescriptionId: string): Promise<void> {
    const [rx] = await this.db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, prescriptionId))
      .limit(1);

    if (!rx) {
      this.logger.warn(`Prescription ${prescriptionId} not found for OCR`);
      return;
    }

    await this.db
      .update(prescriptions)
      .set({ ocrStatus: 'processing', status: 'ai_processing' })
      .where(eq(prescriptions.id, prescriptionId));

    const images: { imageUrl: string }[] = rx.images ?? [];
    if (images.length === 0) {
      await this.db
        .update(prescriptions)
        .set({ ocrStatus: 'no_images', status: 'ai_completed' })
        .where(eq(prescriptions.id, prescriptionId));
      return;
    }

    try {
      const geminiApiKey = await this.dynamicConfig.resolve('ai.geminiApiKey', 'GEMINI_API_KEY');
      const ocrResult = await this.runOcr(images, geminiApiKey?.trim() || undefined);
      const validated = this.validateOcrResult(ocrResult);
      const isLowConfidence = validated.confidence < LOW_CONFIDENCE_THRESHOLD;

      await this.db
        .update(prescriptions)
        .set({
          ocrStatus: isLowConfidence ? 'low_confidence' : 'completed',
          ocrResult: validated,
          ocrConfidence: String(validated.confidence),
          ocrProcessedAt: new Date(),
          prescriberName: validated.prescriber.name || null,
          prescriberLicense: validated.prescriber.licenseNo || null,
          prescriberHospital: validated.prescriber.hospital || null,
          prescriberDept: validated.prescriber.department || null,
          diagnosis: validated.diagnosis || null,
          status: 'ai_completed',
        })
        .where(eq(prescriptions.id, prescriptionId));

      if (validated.items.length > 0 && !isLowConfidence) {
        await this.persistPrescriptionItems(prescriptionId, validated.items);
      }

      this.logger.log(
        `OCR complete for ${prescriptionId}: confidence=${validated.confidence}, items=${validated.items.length}`,
      );
    } catch (err) {
      this.logger.error(`OCR failed for ${prescriptionId}: ${(err as Error).message}`);
      await this.db
        .update(prescriptions)
        .set({ ocrStatus: 'failed', status: 'ai_completed' })
        .where(eq(prescriptions.id, prescriptionId));
    }
  }

  private async runOcr(
    images: { imageUrl: string }[],
    geminiApiKey?: string,
  ): Promise<PrescriptionOcrResult> {
    const base64Images = await Promise.all(
      images.map(async (img) => {
        const base64 = await this.fetchImageAsBase64(img.imageUrl);
        return { base64, mimeType: this.guessMimeType(img.imageUrl) };
      }),
    );

    const opts = { geminiApiKey };
    if (base64Images.length === 1) {
      return extractPrescription(base64Images[0]!.base64, base64Images[0]!.mimeType, opts);
    }
    return extractMultiplePrescriptionImages(base64Images, opts);
  }

  private validateOcrResult(raw: PrescriptionOcrResult): ValidatedOcrResult {
    const parsed = OcrResultSchema.safeParse(raw);
    if (parsed.success) return parsed.data;

    this.logger.warn(`OCR result validation issues: ${JSON.stringify(parsed.error.issues)}`);
    return {
      prescriber: { name: raw.prescriber?.name ?? '' },
      patient: { name: raw.patient?.name ?? '' },
      items: (raw.items ?? [])
        .filter((item: any) => item.drugName)
        .map((item: any) => ({
          drugName: item.drugName,
          strength: item.strength,
          dosageForm: item.dosageForm,
          quantity: item.quantity,
          sig: item.sig,
          duration: item.duration,
        })),
      confidence: raw.confidence ?? 0,
      rawText: raw.rawText,
    };
  }

  private async persistPrescriptionItems(
    prescriptionId: string,
    items: ValidatedOcrResult['items'],
  ): Promise<void> {
    const rows = items.map((item, idx) => ({
      prescriptionId,
      itemNo: idx + 1,
      drugName: item.drugName,
      strength: item.strength ?? null,
      dosageForm: item.dosageForm ?? null,
      quantity: item.quantity ? String(parseFloat(item.quantity.replace(/[^0-9.]/g, '')) || 0) : null,
      sig: item.sig ?? null,
      duration: item.duration ?? null,
      status: 'pending',
    }));

    if (rows.length > 0) {
      await this.db.insert(prescriptionItems).values(rows).onConflictDoNothing();
    }
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    if (url.startsWith('data:')) {
      const m = /^data:([^;]*);base64,(.+)$/i.exec(url);
      if (m?.[2]) return m[2];
    }
    // For MinIO URLs, stream directly from the MinIO client.
    // Supports localhost, old public host, and temporary /minio path route.
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('minio.telepharmacy.com') || url.includes('minio.re-ya.com') || url.includes('/minio/')) {
      try {
        const urlObj = new URL(url);
        const rawPath = urlObj.pathname.replace(/^\//, '');
        const pathAfterMinio = rawPath.startsWith('minio/') ? rawPath.slice('minio/'.length) : rawPath.replace(/^minio\//, '');
        const parts = pathAfterMinio.split('/').filter(Boolean);
        const bucket = parts[0];
        const objectName = parts.slice(1).join('/');
        const client = (this.minioStorage as any).client;
        const stream = await client.getObject(bucket, objectName);
        const chunks: Buffer[] =[];
        for await (const chunk of stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks).toString('base64');
      } catch (e) {
        this.logger.warn(`MinIO direct fetch failed for ${url}, falling back to HTTP: ${e}`);
      }
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  private guessMimeType(url: string): string {
    const lower = url.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    return 'image/jpeg';
  }
}
