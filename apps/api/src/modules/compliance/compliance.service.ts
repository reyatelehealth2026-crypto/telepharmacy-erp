import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import {
  auditLog,
  patients,
  dataBreachReports,
  consentRecords,
  prescriptions,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import { AuditService } from '../audit/audit.service';
import { LineClientService } from '../line/services/line-client.service';
import type { LogAuditEventDto, ConsentRecordDto } from './dto/data-request.dto';
import type { CreateBreachReportDto } from './dto/data-breach.dto';

const GENERAL_RETENTION_YEARS = 5;
const CONTROLLED_RETENTION_YEARS = 10;

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly auditService: AuditService,
    private readonly lineClient: LineClientService,
  ) {}

  async logAuditEvent(dto: LogAuditEventDto, staffId: string, ipAddress?: string) {
    await this.auditService.log({
      tableName: dto.tableName,
      recordId: dto.recordId,
      action: dto.action,
      oldValues: dto.oldValues,
      newValues: dto.newValues,
      changedBy: staffId,
      ipAddress,
    });
    return { logged: true };
  }

  async queryAuditLog(filters: {
    tableName?: string;
    recordId?: string;
    action?: string;
    changedBy?: string;
    page?: number;
    limit?: number;
  }) {
    return this.auditService.query(filters);
  }

  async exportPatientData(patientId: string, requestedBy: string, ipAddress?: string) {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) throw new NotFoundException(`ไม่พบข้อมูลผู้ป่วย ${patientId}`);

    await this.auditService.log({
      tableName: 'patients',
      recordId: patientId,
      action: 'export',
      changedBy: requestedBy,
      ipAddress,
    });

    const patientPrescriptions = await this.db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));

    return {
      exportedAt: new Date().toISOString(),
      requestedBy,
      patientData: {
        id: patient.id,
        patientNo: patient.patientNo,
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: patient.birthDate,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        pdpaConsentAt: patient.pdpaConsentAt,
        pdpaVersion: patient.pdpaVersion,
        dataSharingOpt: patient.dataSharingOpt,
        createdAt: patient.createdAt,
      },
      prescriptions: patientPrescriptions,
    };
  }

  async erasureRequest(patientId: string, requestedBy: string, ipAddress?: string) {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) throw new NotFoundException(`ไม่พบข้อมูลผู้ป่วย ${patientId}`);

    await this.auditService.log({
      tableName: 'patients',
      recordId: patientId,
      action: 'delete',
      oldValues: { firstName: patient.firstName, lastName: patient.lastName, nationalId: patient.nationalId },
      changedBy: requestedBy,
      ipAddress,
    });

    await this.db
      .update(patients)
      .set({
        firstName: 'ANONYMIZED',
        lastName: 'ANONYMIZED',
        nationalId: null,
        phone: null,
        email: null,
        address: null,
        lineUserId: null,
        deletedAt: new Date(),
        status: 'inactive',
      })
      .where(eq(patients.id, patientId));

    this.logger.log(`Patient ${patientId} anonymized by ${requestedBy}`);
    return { anonymized: true, patientId };
  }

  async recordConsent(patientId: string, dto: ConsentRecordDto, recordedBy: string, ipAddress?: string) {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) throw new NotFoundException(`ไม่พบข้อมูลผู้ป่วย ${patientId}`);

    const [record] = await this.db
      .insert(consentRecords)
      .values({
        patientId,
        consentVersion: dto.consentVersion,
        consentType: dto.consentType,
        granted: dto.granted,
        grantedAt: dto.granted ? new Date() : null,
        withdrawnAt: !dto.granted ? new Date() : null,
        ipAddress: dto.ipAddress ?? ipAddress ?? null,
        recordedBy,
      })
      .returning();

    if (!dto.granted) {
      await this.db
        .update(patients)
        .set({ pdpaVersion: dto.consentVersion })
        .where(eq(patients.id, patientId));
    }

    return record;
  }

  async retentionReview() {
    const generalCutoff = new Date();
    generalCutoff.setFullYear(generalCutoff.getFullYear() - GENERAL_RETENTION_YEARS);

    const overdue = await this.db
      .select()
      .from(prescriptions)
      .where(lt(prescriptions.createdAt, generalCutoff))
      .limit(100);

    return {
      cutoffDate: generalCutoff.toISOString(),
      generalRetentionYears: GENERAL_RETENTION_YEARS,
      controlledRetentionYears: CONTROLLED_RETENTION_YEARS,
      recordsOverdue: overdue.length,
      records: overdue.map((r: any) => ({
        id: r.id,
        patientId: r.patientId,
        createdAt: r.createdAt,
        type: 'prescription',
      })),
    };
  }

  async reportBreach(dto: CreateBreachReportDto, reportedBy: string) {
    const [report] = await this.db
      .insert(dataBreachReports)
      .values({
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        affectedPatientIds: dto.affectedPatientIds,
        affectedRecordCount: dto.affectedRecordCount ?? null,
        dataTypes: dto.dataTypes,
        discoveredAt: new Date(dto.discoveredAt),
        reportedBy,
        rootCause: dto.rootCause ?? null,
        remediation: dto.remediation ?? null,
        status: 'detected',
      })
      .returning();

    this.logger.warn(`Data breach reported: ${report.id}, severity=${dto.severity}`);

    if (dto.affectedPatientIds.length > 0) {
      await this.notifyAffectedPatients(dto.affectedPatientIds, dto.title, report.id);
    }

    return report;
  }

  async findBreachReports(filters: { status?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const query = this.db
      .select()
      .from(dataBreachReports)
      .orderBy(desc(dataBreachReports.createdAt))
      .limit(limit)
      .offset(offset);

    if (filters.status) query.where(eq(dataBreachReports.status, filters.status as any));

    const rows = await query;
    return { data: rows, page, limit };
  }

  private async notifyAffectedPatients(patientIds: string[], breachTitle: string, breachId: string) {
    const affectedPatients = await this.db
      .select({ id: patients.id, lineUserId: patients.lineUserId })
      .from(patients)
      .where(sql`${patients.id} = ANY(${patientIds})`);

    const message = `แจ้งเตือนสำคัญ: พบเหตุการณ์ด้านความปลอดภัยของข้อมูล "${breachTitle}" ที่อาจกระทบข้อมูลของคุณ กรุณาติดต่อเภสัชกรเพื่อรับข้อมูลเพิ่มเติม`;

    for (const patient of affectedPatients) {
      if (!patient.lineUserId) continue;
      try {
        await this.lineClient.pushMessage(patient.lineUserId, [{ type: 'text', text: message }]);
      } catch (err) {
        this.logger.error(`Failed to notify patient ${patient.id} of breach: ${(err as Error).message}`);
      }
    }

    await this.db
      .update(dataBreachReports)
      .set({ notificationSentAt: new Date(), updatedAt: new Date() })
      .where(eq(dataBreachReports.id, breachId));
  }
}
