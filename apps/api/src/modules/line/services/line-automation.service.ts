import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { patientTags, patientTagAssignments } from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';

const INTENT_LABELS: Record<string, string> = {
  consult: 'เจตนา: ปรึกษาเภสัชกร',
  register: 'เจตนา: สมัครสมาชิก',
  link_account: 'เจตนา: เชื่อมบัญชี',
  rx_upload: 'เจตนา: ส่งใบสั่งยา',
  order_tracking: 'เจตนา: ติดตามออเดอร์',
  product_search: 'เจตนา: ค้นหาสินค้า',
  other: 'เจตนา: อื่นๆ',
};

/**
 * Phase 5 optional backlog: automation hooks (e.g. auto-tag by LINE triage intent).
 */
@Injectable()
export class LineAutomationService {
  private readonly logger = new Logger(LineAutomationService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  /** Idempotent: ensures `intent_<entryIntent>` tag exists and is assigned to the patient. */
  async applyIntentTag(
    patientId: string | null | undefined,
    entryIntent: string | null | undefined,
  ): Promise<void> {
    if (!patientId || !entryIntent) return;

    const slug = `intent_${entryIntent}`;
    const label = INTENT_LABELS[entryIntent] ?? `เจตนา: ${entryIntent}`;

    try {
      let [tag] = await this.db.select().from(patientTags).where(eq(patientTags.slug, slug)).limit(1);

      if (!tag) {
        const [created] = await this.db
          .insert(patientTags)
          .values({ slug, label, sortOrder: 900 })
          .returning();
        tag = created;
      }

      await this.db
        .insert(patientTagAssignments)
        .values({
          patientId,
          tagId: tag.id,
          assignedByStaffId: null,
        })
        .onConflictDoNothing({
          target: [patientTagAssignments.patientId, patientTagAssignments.tagId],
        });
    } catch (err) {
      this.logger.warn(`applyIntentTag failed: ${(err as Error).message}`);
    }
  }
}
