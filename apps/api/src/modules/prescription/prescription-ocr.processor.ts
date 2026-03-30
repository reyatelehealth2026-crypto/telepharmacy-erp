import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrescriptionOcrService, OCR_QUEUE } from './prescription-ocr.service';

@Processor(OCR_QUEUE)
export class PrescriptionOcrProcessor {
  private readonly logger = new Logger(PrescriptionOcrProcessor.name);

  constructor(private readonly ocrService: PrescriptionOcrService) {}

  @Process('process-rx')
  async handleOcr(job: Job<{ prescriptionId: string }>) {
    this.logger.log(`Processing OCR job for prescription ${job.data.prescriptionId}`);
    await this.ocrService.processOcr(job.data.prescriptionId);
  }
}
