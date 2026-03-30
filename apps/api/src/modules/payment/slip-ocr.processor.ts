import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { extractSlip } from '@telepharmacy/ai';
import { PaymentService } from '../payment.service';

export const SLIP_OCR_QUEUE = 'slip-ocr-queue';
export const PROCESS_SLIP_OCR_JOB = 'process-slip-ocr';

interface SlipOcrPayload {
  paymentId: string;
  orderId: string;
  slipImageUrl: string;
}

@Processor(SLIP_OCR_QUEUE)
export class SlipOcrProcessor {
  private readonly logger = new Logger(SlipOcrProcessor.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Process(PROCESS_SLIP_OCR_JOB)
  async handleSlipOcr(job: Job<SlipOcrPayload>) {
    const { paymentId, orderId, slipImageUrl } = job.data;
    this.logger.log(`Processing slip OCR for payment ${paymentId}, order ${orderId}`);

    try {
      // 1) Fetch image and convert to base64
      const imageRes = await fetch(slipImageUrl);
      if (!imageRes.ok) {
        throw new Error(`Failed to fetch slip image: ${imageRes.status}`);
      }
      const imageBuffer = await imageRes.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';

      // 2) Run OCR via AI package
      const ocrResult = await extractSlip(imageBase64, contentType);
      this.logger.log(
        `Slip OCR result for payment ${paymentId}: amount=${ocrResult.amount}, confidence=${ocrResult.confidence}`,
      );

      // 3) Determine verification path based on confidence
      if (ocrResult.confidence >= 0.85) {
        // High confidence — auto-verify
        const result = await this.paymentService.verifySlipOcr(paymentId, {
          amount: ocrResult.amount,
          date: ocrResult.date,
          time: ocrResult.time,
        });
        this.logger.log(`Slip OCR auto-verified for payment ${paymentId}: ${result.matchStatus}`);
      } else if (ocrResult.confidence >= 0.60) {
        // Medium confidence — store result, needs staff review
        await this.paymentService.storeSlipOcrResult(paymentId, ocrResult, 'needs_review');
        this.logger.log(`Slip OCR needs review for payment ${paymentId} (confidence: ${ocrResult.confidence})`);
      } else {
        // Low confidence — manual only
        await this.paymentService.storeSlipOcrResult(paymentId, ocrResult, 'manual_required');
        this.logger.log(`Slip OCR requires manual for payment ${paymentId} (confidence: ${ocrResult.confidence})`);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Slip OCR failed for payment ${paymentId}: ${errMsg}`);
      throw error; // Re-throw for Bull retry → DLQ
    }
  }
}
