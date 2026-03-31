import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';
import * as schema from '@telepharmacy/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { TelemedicineAuditService } from '../audit/audit.service';
import { MinioStorageService } from '../kyc/minio.service';
import { SmsService } from '../kyc/sms.service';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

const { emergencyReferrals, videoConsultations, patients, staff } = schema;

export interface CreateReferralDto {
  consultationId: string;
  reason:
    | 'emergency_symptoms'
    | 'diagnostic_uncertainty'
    | 'scope_limitation'
    | 'requires_physical_exam'
    | 'requires_lab_tests'
    | 'requires_specialist'
    | 'patient_request';
  urgencyLevel: 'immediate' | 'urgent' | 'routine';
  clinicalSummary: string;
  symptoms?: any[];
  vitalSigns?: any;
  currentMedications?: any[];
  pharmacistNotes: string;
}

export interface HospitalInfo {
  name: string;
  nameEn?: string;
  address: string;
  province: string;
  district: string;
  phone: string;
  emergencyPhone?: string;
  hasER: boolean;
  latitude: number;
  longitude: number;
  distance?: number;
  googleMapsUrl: string;
}

@Injectable()
export class ReferralService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private readonly config: ConfigService,
    private readonly auditService: TelemedicineAuditService,
    private readonly minioService: MinioStorageService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Create emergency referral from consultation
   */
  async createReferral(
    pharmacistId: string,
    dto: CreateReferralDto,
  ): Promise<any> {
    // 1. Verify consultation exists and belongs to pharmacist
    const [consultation] = await this.db
      .select()
      .from(videoConsultations)
      .where(
        and(
          eq(videoConsultations.id, dto.consultationId),
          eq(videoConsultations.pharmacistId, pharmacistId),
        ),
      );

    if (!consultation) {
      throw new NotFoundException('ไม่พบคำขอให้คำปรึกษา');
    }

    if (!['in_progress', 'completed'].includes(consultation.status)) {
      throw new BadRequestException(
        'ไม่สามารถสร้างใบส่งตัวได้ในสถานะนี้',
      );
    }

    // 2. Get patient info
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, consultation.patientId));

    if (!patient) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');
    }

    // 3. Find nearest hospitals
    const nearestHospitals = await this.findNearestHospitals(
      patient.province || 'กรุงเทพมหานคร',
      patient.district,
      5,
    );

    const nearestHospital = nearestHospitals[0] || null;

    // 4. Create referral record
    const [referral] = await this.db
      .insert(emergencyReferrals)
      .values({
        consultationId: dto.consultationId,
        patientId: consultation.patientId,
        pharmacistId,
        reason: dto.reason,
        urgencyLevel: dto.urgencyLevel,
        clinicalSummary: dto.clinicalSummary,
        symptoms: dto.symptoms || [],
        vitalSigns: dto.vitalSigns || {},
        currentMedications: dto.currentMedications || [],
        pharmacistNotes: dto.pharmacistNotes,
        recommendedHospitals: nearestHospitals,
        nearestHospital,
        status: 'created',
      })
      .returning();

    // 5. Generate referral letter PDF
    const pdfUrl = await this.generateReferralLetterPDF(
      referral,
      patient,
      consultation,
      nearestHospital,
    );

    // 6. Update referral with PDF URL
    await this.db
      .update(emergencyReferrals)
      .set({
        referralLetterUrl: pdfUrl,
        referralLetterGeneratedAt: new Date(),
      })
      .where(eq(emergencyReferrals.id, referral.id));

    // 7. Update consultation status
    await this.db
      .update(videoConsultations)
      .set({
        status: 'referred',
        referralId: referral.id,
      })
      .where(eq(videoConsultations.id, dto.consultationId));

    // 8. Send notifications
    await this.sendReferralNotifications(
      referral.id,
      patient,
      nearestHospital,
      pdfUrl,
      dto.urgencyLevel,
    );

    // 9. Audit log
    await this.auditService.log({
      actorId: pharmacistId,
      actorType: 'pharmacist',
      actionType: 'referral_created',
      entityType: 'referral',
      entityId: referral.id,
      metadata: {
        reason: dto.reason,
        urgencyLevel: dto.urgencyLevel,
        consultationId: dto.consultationId,
      },
    });

    return {
      referralId: referral.id,
      status: 'created',
      nearestHospital,
      referralLetterUrl: pdfUrl,
      notificationsSent: true,
    };
  }

  /**
   * Patient acknowledges referral
   */
  async acknowledgeReferral(
    patientId: string,
    referralId: string,
  ): Promise<{ acknowledged: boolean }> {
    const [referral] = await this.db
      .select()
      .from(emergencyReferrals)
      .where(
        and(
          eq(emergencyReferrals.id, referralId),
          eq(emergencyReferrals.patientId, patientId),
        ),
      );

    if (!referral) {
      throw new NotFoundException('ไม่พบใบส่งตัว');
    }

    await this.db
      .update(emergencyReferrals)
      .set({
        status: 'patient_acknowledged',
        acknowledgedAt: new Date(),
      })
      .where(eq(emergencyReferrals.id, referralId));

    await this.auditService.log({
      actorId: patientId,
      actorType: 'patient',
      actionType: 'referral_acknowledged',
      entityType: 'referral',
      entityId: referralId,
      metadata: {},
    });

    return { acknowledged: true };
  }

  /**
   * Get referral details
   */
  async getReferral(referralId: string, userId: string): Promise<any> {
    const [referral] = await this.db
      .select()
      .from(emergencyReferrals)
      .where(eq(emergencyReferrals.id, referralId));

    if (!referral) {
      throw new NotFoundException('ไม่พบใบส่งตัว');
    }

    // Authorization check
    if (
      referral.patientId !== userId &&
      referral.pharmacistId !== userId
    ) {
      throw new BadRequestException('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
    }

    return referral;
  }

  /**
   * List referrals with filters
   */
  async listReferrals(
    userId: string,
    userType: 'patient' | 'pharmacist' | 'admin',
    filters: {
      status?: string[];
      urgencyLevel?: string;
      startDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ referrals: any[]; total: number }> {
    const conditions = [];

    if (userType === 'patient') {
      conditions.push(eq(emergencyReferrals.patientId, userId));
    } else if (userType === 'pharmacist') {
      conditions.push(eq(emergencyReferrals.pharmacistId, userId));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(emergencyReferrals.status, filters.status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const referrals = await this.db
      .select()
      .from(emergencyReferrals)
      .where(whereClause)
      .orderBy(desc(emergencyReferrals.createdAt))
      .limit(filters.limit || 20)
      .offset(filters.offset || 0);

    return {
      referrals,
      total: referrals.length,
    };
  }

  /**
   * Get referral statistics
   */
  async getReferralStats(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalReferrals: number;
    byReason: Record<string, number>;
    byUrgency: Record<string, number>;
    acknowledgmentRate: number;
  }> {
    // TODO: Implement with proper aggregation queries
    return {
      totalReferrals: 0,
      byReason: {},
      byUrgency: {},
      acknowledgmentRate: 0,
    };
  }

  /**
   * Find nearest hospitals with ER capabilities
   */
  private async findNearestHospitals(
    province: string,
    district?: string,
    limit: number = 5,
  ): Promise<HospitalInfo[]> {
    // Thailand hospitals database - in production, this would be a proper database
    const hospitals: HospitalInfo[] = [
      {
        name: 'โรงพยาบาลจุฬาลงกรณ์',
        nameEn: 'King Chulalongkorn Memorial Hospital',
        address: '1873 ถนนพระราม 4 แขวงปทุมวัน เขตปทุมวัน',
        province: 'กรุงเทพมหานคร',
        district: 'ปทุมวัน',
        phone: '02-256-4000',
        emergencyPhone: '02-256-4444',
        hasER: true,
        latitude: 13.7326,
        longitude: 100.5310,
        googleMapsUrl: 'https://maps.google.com/?q=13.7326,100.5310',
      },
      {
        name: 'โรงพยาบาลศิริราช',
        nameEn: 'Siriraj Hospital',
        address: '2 ถนนวังหลัง แขวงศิริราช เขตบางกอกน้อย',
        province: 'กรุงเทพมหานคร',
        district: 'บางกอกน้อย',
        phone: '02-419-7000',
        emergencyPhone: '02-419-7777',
        hasER: true,
        latitude: 13.7583,
        longitude: 100.4897,
        googleMapsUrl: 'https://maps.google.com/?q=13.7583,100.4897',
      },
      {
        name: 'โรงพยาบาลรามาธิบดี',
        nameEn: 'Ramathibodi Hospital',
        address: '270 ถนนพระราม 6 แขวงทุ่งพญาไท เขตราชเทวี',
        province: 'กรุงเทพมหานคร',
        district: 'ราชเทวี',
        phone: '02-201-1000',
        emergencyPhone: '02-201-1111',
        hasER: true,
        latitude: 13.7594,
        longitude: 100.5297,
        googleMapsUrl: 'https://maps.google.com/?q=13.7594,100.5297',
      },
    ];

    // Filter by province
    let filtered = hospitals.filter((h) => h.province === province);

    // If district specified, prioritize hospitals in that district
    if (district) {
      const inDistrict = filtered.filter((h) => h.district === district);
      const outDistrict = filtered.filter((h) => h.district !== district);
      filtered = [...inDistrict, ...outDistrict];
    }

    return filtered.slice(0, limit);
  }

  /**
   * Generate referral letter PDF
   */
  private async generateReferralLetterPDF(
    referral: any,
    patient: any,
    consultation: any,
    hospital: HospitalInfo | null,
  ): Promise<string> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    // Header
    doc
      .fontSize(20)
      .text('ใบส่งตัวผู้ป่วย', { align: 'center' })
      .fontSize(16)
      .text('Emergency Referral Letter', { align: 'center' })
      .moveDown();

    // Referral info
    doc
      .fontSize(12)
      .text(`เลขที่ใบส่งตัว: ${referral.id}`)
      .text(`วันที่: ${new Date().toLocaleDateString('th-TH')}`)
      .text(`ระดับความเร่งด่วน: ${this.getUrgencyLevelThai(referral.urgencyLevel)}`)
      .moveDown();

    // Patient info
    doc
      .fontSize(14)
      .text('ข้อมูลผู้ป่วย', { underline: true })
      .fontSize(12)
      .text(`ชื่อ-นามสกุล: ${patient.firstName} ${patient.lastName}`)
      .text(`HN: ${patient.hn || 'N/A'}`)
      .text(`อายุ: ${this.calculateAge(patient.dateOfBirth)} ปี`)
      .text(`เบอร์โทร: ${patient.phoneNumber}`)
      .moveDown();

    // Clinical summary
    doc
      .fontSize(14)
      .text('สรุปอาการ', { underline: true })
      .fontSize(12)
      .text(referral.clinicalSummary)
      .moveDown();

    // Pharmacist notes
    doc
      .fontSize(14)
      .text('ความเห็นเภสัชกร', { underline: true })
      .fontSize(12)
      .text(referral.pharmacistNotes)
      .moveDown();

    // Recommended hospital
    if (hospital) {
      doc
        .fontSize(14)
        .text('โรงพยาบาลที่แนะนำ', { underline: true })
        .fontSize(12)
        .text(`${hospital.name}`)
        .text(`ที่อยู่: ${hospital.address}`)
        .text(`โทรศัพท์: ${hospital.phone}`)
        .text(`ฉุกเฉิน: ${hospital.emergencyPhone || hospital.phone}`)
        .moveDown();
    }

    // Emergency hotline
    doc
      .fontSize(14)
      .text('หมายเลขฉุกเฉิน', { underline: true })
      .fontSize(12)
      .text('โทร 1669 (บริการฉุกเฉินทางการแพทย์)')
      .text('โทร 1646 (สายด่วนสาธารณสุข)');

    doc.end();

    // Wait for PDF generation to complete
    await new Promise((resolve) => doc.on('end', resolve));

    const pdfBuffer = Buffer.concat(chunks);

    // Upload to MinIO
    const filename = `referral-${referral.id}-${Date.now()}.pdf`;
    const bucket = this.config.get<string>(
      'telemedicine.storage.referralsBucket',
      'telemedicine-referrals',
    );

    await this.minioService.uploadFile(
      bucket,
      filename,
      pdfBuffer,
      'application/pdf',
    );

    return `${this.config.get('minio.endpoint')}/${bucket}/${filename}`;
  }

  /**
   * Send referral notifications to patient
   */
  private async sendReferralNotifications(
    referralId: string,
    patient: any,
    hospital: HospitalInfo | null,
    pdfUrl: string,
    urgencyLevel: string,
  ): Promise<void> {
    const urgencyText = this.getUrgencyLevelThai(urgencyLevel);

    // LINE notification
    const lineMessage = `
🚨 แจ้งเตือนส่งตัวผู้ป่วย (${urgencyText})

เภสัชกรแนะนำให้ท่านไปพบแพทย์ที่โรงพยาบาล

${hospital ? `โรงพยาบาลที่แนะนำ: ${hospital.name}\nโทร: ${hospital.emergencyPhone || hospital.phone}\n\n📍 ${hospital.googleMapsUrl}` : ''}

📄 ดูใบส่งตัว: ${pdfUrl}

⚠️ หากมีอาการฉุกเฉิน โปรดโทร 1669
    `.trim();

    // TODO: Send LINE notification via LINE Messaging API
    console.log('LINE notification:', lineMessage);

    // SMS backup notification
    const smsMessage = `[ร้านยา] เภสัชกรแนะนำให้ท่านไปพบแพทย์ที่โรงพยาบาล${hospital ? ` ${hospital.name} โทร ${hospital.emergencyPhone || hospital.phone}` : ''} หากฉุกเฉินโทร 1669`;

    try {
      await this.smsService.sendSms(patient.phoneNumber, smsMessage);
    } catch (error) {
      console.error('Failed to send SMS:', error);
    }

    // Update referral status
    await this.db
      .update(emergencyReferrals)
      .set({
        status: 'patient_notified',
        notifiedAt: new Date(),
        notificationChannel: 'line,sms',
      })
      .where(eq(emergencyReferrals.id, referralId));

    // Schedule follow-up notification (15 minutes)
    // TODO: Queue BullMQ job for follow-up
  }

  /**
   * Get urgency level in Thai
   */
  private getUrgencyLevelThai(level: string): string {
    const map: Record<string, string> = {
      immediate: 'ฉุกเฉินมาก',
      urgent: 'เร่งด่วน',
      routine: 'ปกติ',
    };
    return map[level] || level;
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date | string): number {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
}
