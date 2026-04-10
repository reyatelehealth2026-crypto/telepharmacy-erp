import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { lineContactJourneys } from '@telepharmacy/db';
import { DRIZZLE } from '../../../database/database.constants';

type JourneyState = 'new_unregistered' | 'stub_unfinished' | 'link_pending' | 'linked_returning';

interface UpsertJourneyInput {
  lineUserId: string;
  patientId?: string | null;
  state: JourneyState;
  currentStep?: string | null;
  sourceEventId?: string | null;
  metadata?: Record<string, unknown>;
  completed?: boolean;
}

@Injectable()
export class LineContactJourneyService {
  private readonly logger = new Logger(LineContactJourneyService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  isPatientRegistered(patient: { phone?: string | null; birthDate?: string | null } | null | undefined): boolean {
    return !!patient?.phone && !!patient?.birthDate;
  }

  deriveState(
    patient: { phone?: string | null; birthDate?: string | null } | null | undefined,
  ): 'new_unregistered' | 'linked_returning' {
    return this.isPatientRegistered(patient) ? 'linked_returning' : 'new_unregistered';
  }

  resolveState(
    patient: { phone?: string | null; birthDate?: string | null } | null | undefined,
    journey?: { state?: JourneyState | null } | null,
    fallbackState: Extract<JourneyState, 'new_unregistered' | 'stub_unfinished'> = 'new_unregistered',
  ): JourneyState {
    if (this.isPatientRegistered(patient)) {
      return 'linked_returning';
    }

    if (journey?.state === 'link_pending') {
      return 'link_pending';
    }

    if (journey?.state === 'stub_unfinished') {
      return 'stub_unfinished';
    }

    return fallbackState;
  }

  async getJourney(lineUserId: string) {
    const [journey] = await this.db
      .select()
      .from(lineContactJourneys)
      .where(eq(lineContactJourneys.lineUserId, lineUserId))
      .limit(1);

    return journey ?? null;
  }

  async upsertJourney(input: UpsertJourneyInput) {
    const existing = await this.getJourney(input.lineUserId);
    const now = new Date();
    const mergedMetadata = {
      ...(existing?.metadata ?? {}),
      ...(input.metadata ?? {}),
    };

    if (existing) {
      const [updated] = await this.db
        .update(lineContactJourneys)
        .set({
          patientId: input.patientId ?? existing.patientId ?? null,
          state: input.state,
          currentStep: input.currentStep ?? existing.currentStep ?? null,
          sourceEventId: input.sourceEventId ?? existing.sourceEventId ?? null,
          metadata: mergedMetadata,
          lastEventAt: now,
          completedAt: input.completed ? now : existing.completedAt ?? null,
          updatedAt: now,
        })
        .where(eq(lineContactJourneys.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await this.db
      .insert(lineContactJourneys)
      .values({
        lineUserId: input.lineUserId,
        patientId: input.patientId ?? null,
        state: input.state,
        currentStep: input.currentStep ?? null,
        sourceEventId: input.sourceEventId ?? null,
        metadata: mergedMetadata,
        startedAt: now,
        lastEventAt: now,
        completedAt: input.completed ? now : null,
        updatedAt: now,
      })
      .returning();

    this.logger.log(`LINE contact journey created for ${input.lineUserId} (${input.state})`);
    return created;
  }

  async markLinkedReturning(
    patientId: string,
    lineUserId: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.upsertJourney({
      lineUserId,
      patientId,
      state: 'linked_returning',
      currentStep: 'completed',
      metadata,
      completed: true,
    });
  }
}
