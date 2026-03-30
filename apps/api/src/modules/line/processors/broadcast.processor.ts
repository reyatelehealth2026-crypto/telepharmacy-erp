import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { LineClientService } from '../services/line-client.service';
import { BroadcastService, BROADCAST_QUEUE, SEND_BROADCAST_JOB } from '../services/broadcast.service';
import type { LineMessageObject } from '../types/line-events.types';

interface BroadcastBatchPayload {
  campaignId: string;
  lineUserIds: string[];
  content: any;
  altText: string;
  batchIndex: number;
}

@Processor(BROADCAST_QUEUE)
export class BroadcastProcessor {
  private readonly logger = new Logger(BroadcastProcessor.name);

  constructor(
    private readonly lineClient: LineClientService,
    private readonly broadcastService: BroadcastService,
  ) {}

  @Process(SEND_BROADCAST_JOB)
  async handleBroadcastBatch(job: Job<BroadcastBatchPayload>) {
    const { campaignId, lineUserIds, content, altText, batchIndex } = job.data;
    this.logger.log(
      `Processing broadcast batch ${batchIndex} for campaign ${campaignId}: ${lineUserIds.length} recipients`,
    );

    const messages: LineMessageObject[] = [
      {
        type: 'flex',
        altText,
        contents: content,
      },
    ];

    try {
      // LINE multicast supports max 500 users per call
      await this.lineClient.multicast(lineUserIds, messages);
      await this.broadcastService.markBatchSent(campaignId, lineUserIds, true);
      this.logger.log(`Broadcast batch ${batchIndex} sent successfully`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Broadcast batch ${batchIndex} failed: ${errMsg}`);
      await this.broadcastService.markBatchSent(campaignId, lineUserIds, false, errMsg);
      throw error; // Re-throw for Bull retry
    }
  }
}
