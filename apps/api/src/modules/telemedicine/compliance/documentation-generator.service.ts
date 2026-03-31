import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';
import { eq, and, desc } from 'drizzle-orm';
import {
  complianceFacilities,
  complianceEquipment,
  complianceStaffQualifications,
  complianceTechnicalSpecs,
  sp16Authorizations,
  staff,
} from '@telepharmacy/db';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Documentation Generator Service
 * 
 * Generates ส.พ. 16 application package including:
 * - Facility information with photos and dimensions
 * - Licensed pharmacist list with qualifications
 * - Video platform technical specifications
 * - Equipment inventory
 * - Standard operating procedures
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */
@Injectable()
export class DocumentationGeneratorService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate complete ส.พ. 16 application package
   */
  async generateSp16ApplicationPackage(facilityId: string): Promise<string> {
    // 1. Gather all required data
    const facilityData = await this.getFacilityData(facilityId);
    const staffData = await this.getStaffQualifications(facilityId);
    const technicalSpecs = await this.getTechnicalSpecifications(facilityId);
    const equipment = await this.getEquipmentInventory(facilityId);

    // 2. Generate PDF document
    const pdfBuffer = await this.generatePdfDocument({
      facility: facilityData,
      staff: staffData,
      technical: technicalSpecs,
      equipment: equipment,
    });

    // 3. Save to storage (MinIO or local filesystem)
    const filename = `sp16-application-${facilityId}-${Date.now()}.pdf`;
    const filepath = await this.savePdfToStorage(filename, pdfBuffer);

    return filepath;
  }

  /**
   * Get facility information including photos and dimensions
   * Requirement 9.1: Document facility information with photos and dimensions
   */
  private async getFacilityData(facilityId: string) {
    const [facility] = await this.db
      .select()
      .from(complianceFacilities)
      .where(eq(complianceFacilities.id, facilityId));

    if (!facility) {
      throw new Error(`Facility not found: ${facilityId}`);
    }

    return {
      name: facility.facilityName,
      type: facility.facilityType,
      address: facility.address,
      province: facility.province,
      district: facility.district,
      subdistrict: facility.subdistrict,
      postalCode: facility.postalCode,
      phone: facility.phoneNumber,
      email: facility.email,
      emergencyContact: facility.emergencyContact,
      consultationRoomPhotos: facility.consultationRoomPhotos || [],
      roomDimensions: facility.roomDimensions || {},
      privacyMeasures: facility.privacyMeasures,
      lightingDescription: facility.lightingDescription,
      soundproofingDescription: facility.soundproofingDescription,
      operatingHours: facility.operatingHours || {},
      telemedicineHours: facility.telemedicineHours || {},
    };
  }

  /**
   * Get licensed pharmacist list with qualifications
   * Requirement 9.2: Document licensed pharmacist list with qualifications
   */
  private async getStaffQualifications(facilityId: string) {
    const qualifications = await this.db
      .select({
        qualification: complianceStaffQualifications,
        staff: staff,
      })
      .from(complianceStaffQualifications)
      .leftJoin(
        staff,
        eq(complianceStaffQualifications.staffId, staff.id),
      )
      .where(
        and(
          eq(complianceStaffQualifications.facilityId, facilityId),
          eq(complianceStaffQualifications.isActive, true),
        ),
      );

    return qualifications.map((q: any) => ({
      name: `${q.staff.firstName} ${q.staff.lastName}`,
      licenseNumber: q.qualification.licenseNumber,
      licenseType: q.qualification.licenseType,
      licenseIssueDate: q.qualification.licenseIssueDate,
      licenseExpiryDate: q.qualification.licenseExpiryDate,
      degree: q.qualification.degree,
      university: q.qualification.university,
      graduationYear: q.qualification.graduationYear,
      specializations: q.qualification.specializations || [],
      certifications: q.qualification.certifications || [],
      telemedicineTrainingCompleted:
        q.qualification.telemedicineTrainingCompleted,
      trainingDate: q.qualification.trainingDate,
      workSchedule: q.qualification.workSchedule || {},
      telemedicineShifts: q.qualification.telemedicineShifts || {},
    }));
  }

  /**
   * Get video platform technical specifications
   * Requirement 9.3: Document video platform technical specifications
   */
  private async getTechnicalSpecifications(facilityId: string) {
    const [specs] = await this.db
      .select()
      .from(complianceTechnicalSpecs)
      .where(eq(complianceTechnicalSpecs.facilityId, facilityId))
      .orderBy(desc(complianceTechnicalSpecs.createdAt))
      .limit(1);

    if (!specs) {
      throw new Error(
        `Technical specifications not found for facility: ${facilityId}`,
      );
    }

    return {
      platformName: specs.platformName,
      platformVersion: specs.platformVersion,
      encryptionProtocol: specs.encryptionProtocol,
      videoResolution: specs.videoResolution,
      videoFrameRate: specs.videoFrameRate,
      audioBitrate: specs.audioBitrate,
      videoBitrate: specs.videoBitrate,
      recordingEnabled: specs.recordingEnabled,
      recordingFormat: specs.recordingFormat,
      recordingStorage: specs.recordingStorage,
      recordingRetentionYears: specs.recordingRetentionYears,
      dataEncryptionAtRest: specs.dataEncryptionAtRest,
      dataEncryptionInTransit: specs.dataEncryptionInTransit,
      accessControlMethod: specs.accessControlMethod,
      backupFrequency: specs.backupFrequency,
      backupLocation: specs.backupLocation,
      minimumBandwidthKbps: specs.minimumBandwidthKbps,
      recommendedBandwidthKbps: specs.recommendedBandwidthKbps,
      internetProvider: specs.internetProvider,
      backupInternetProvider: specs.backupInternetProvider,
      dataCenter: specs.dataCenter,
      dataCenterLocation: specs.dataCenterLocation,
      dataResidencyCompliant: specs.dataResidencyCompliant,
      uptimePercentage: specs.uptimePercentage,
    };
  }

  /**
   * Get equipment inventory
   * Requirement 9.4: Maintain equipment inventory
   */
  private async getEquipmentInventory(facilityId: string) {
    const equipment = await this.db
      .select()
      .from(complianceEquipment)
      .where(
        and(
          eq(complianceEquipment.facilityId, facilityId),
          eq(complianceEquipment.status, 'active'),
        ),
      );

    return equipment.map((e: any) => ({
      type: e.equipmentType,
      brand: e.brand,
      model: e.model,
      serialNumber: e.serialNumber,
      specifications: e.specifications || {},
      purchaseDate: e.purchaseDate,
      warrantyExpiry: e.warrantyExpiry,
      status: e.status,
      lastMaintenanceDate: e.lastMaintenanceDate,
      nextMaintenanceDate: e.nextMaintenanceDate,
    }));
  }

  /**
   * Generate PDF document with all compliance information
   */
  private async generatePdfDocument(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Collect PDF chunks
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Generate document content
      this.addCoverPage(doc, data.facility);
      this.addFacilitySection(doc, data.facility);
      this.addStaffSection(doc, data.staff);
      this.addTechnicalSpecsSection(doc, data.technical);
      this.addEquipmentSection(doc, data.equipment);
      this.addAppendices(doc);

      doc.end();
    });
  }

  /**
   * Add cover page
   */
  private addCoverPage(doc: typeof PDFDocument, facility: any) {
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('คำขออนุญาตให้บริการเภสัชกรรมทางไกล', { align: 'center' });

    doc.moveDown();
    doc
      .fontSize(18)
      .text('(ส.พ. 16)', { align: 'center' });

    doc.moveDown(3);
    doc
      .fontSize(14)
      .font('Helvetica')
      .text(`สถานพยาบาล: ${facility.name}`, { align: 'center' });

    doc.moveDown();
    doc.text(`ที่อยู่: ${facility.address}`, { align: 'center' });

    doc.moveDown(2);
    doc
      .fontSize(12)
      .text(`วันที่จัดทำเอกสาร: ${new Date().toLocaleDateString('th-TH')}`, {
        align: 'center',
      });

    doc.addPage();
  }

  /**
   * Add facility information section
   * Requirement 9.1
   */
  private addFacilitySection(doc: typeof PDFDocument, facility: any) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('1. ข้อมูลสถานพยาบาล', { underline: true });

    doc.moveDown();
    doc.fontSize(12).font('Helvetica');

    doc.text(`ชื่อสถานพยาบาล: ${facility.name}`);
    doc.text(`ประเภท: ${this.translateFacilityType(facility.type)}`);
    doc.text(`ที่อยู่: ${facility.address}`);
    doc.text(`จังหวัด: ${facility.province}`);
    doc.text(`อำเภอ/เขต: ${facility.district}`);
    doc.text(`ตำบล/แขวง: ${facility.subdistrict || '-'}`);
    doc.text(`รหัสไปรษณีย์: ${facility.postalCode || '-'}`);
    doc.text(`โทรศัพท์: ${facility.phone || '-'}`);
    doc.text(`อีเมล: ${facility.email || '-'}`);
    doc.text(`ติดต่อฉุกเฉิน: ${facility.emergencyContact || '-'}`);

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('1.1 ห้องให้คำปรึกษา');
    doc.fontSize(12).font('Helvetica');

    if (facility.roomDimensions) {
      doc.text(
        `ขนาดห้อง: ${facility.roomDimensions.length || '-'} x ${facility.roomDimensions.width || '-'} x ${facility.roomDimensions.height || '-'} เมตร`,
      );
    }

    doc.text(`มาตรการรักษาความเป็นส่วนตัว: ${facility.privacyMeasures || '-'}`);
    doc.text(`ระบบแสงสว่าง: ${facility.lightingDescription || '-'}`);
    doc.text(`ระบบกันเสียง: ${facility.soundproofingDescription || '-'}`);

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('1.2 เวลาทำการ');
    doc.fontSize(12).font('Helvetica');

    if (facility.operatingHours) {
      Object.entries(facility.operatingHours).forEach(([day, hours]) => {
        doc.text(`${this.translateDay(day)}: ${hours}`);
      });
    }

    doc.moveDown();
    if (facility.consultationRoomPhotos?.length > 0) {
      doc.text(
        `รูปภาพห้องให้คำปรึกษา: ${facility.consultationRoomPhotos.length} รูป`,
      );
      doc.text('(ดูภาคผนวก A)');
    }

    doc.addPage();
  }

  /**
   * Add staff qualifications section
   * Requirement 9.2
   */
  private addStaffSection(doc: typeof PDFDocument, staff: any[]) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('2. รายชื่อเภสัชกรผู้ให้บริการ', { underline: true });

    doc.moveDown();

    staff.forEach((s, index) => {
      doc.fontSize(14).font('Helvetica-Bold').text(`2.${index + 1} ${s.name}`);
      doc.fontSize(12).font('Helvetica');

      doc.text(`เลขที่ใบอนุญาต: ${s.licenseNumber}`);
      doc.text(`ประเภทใบอนุญาต: ${this.translateLicenseType(s.licenseType)}`);
      doc.text(
        `วันที่ออกใบอนุญาต: ${s.licenseIssueDate ? new Date(s.licenseIssueDate).toLocaleDateString('th-TH') : '-'}`,
      );
      doc.text(
        `วันหมดอายุ: ${s.licenseExpiryDate ? new Date(s.licenseExpiryDate).toLocaleDateString('th-TH') : '-'}`,
      );

      doc.moveDown(0.5);
      doc.text(`วุฒิการศึกษา: ${s.degree || '-'}`);
      doc.text(`สถาบันการศึกษา: ${s.university || '-'}`);
      doc.text(`ปีที่สำเร็จการศึกษา: ${s.graduationYear || '-'}`);

      if (s.specializations?.length > 0) {
        doc.text(`ความเชี่ยวชาญ: ${s.specializations.join(', ')}`);
      }

      if (s.certifications?.length > 0) {
        doc.text(`ใบรับรองเพิ่มเติม: ${s.certifications.length} ฉบับ`);
      }

      doc.text(
        `ผ่านการอบรมเภสัชกรรมทางไกล: ${s.telemedicineTrainingCompleted ? 'ใช่' : 'ไม่'}`,
      );
      if (s.trainingDate) {
        doc.text(
          `วันที่อบรม: ${new Date(s.trainingDate).toLocaleDateString('th-TH')}`,
        );
      }

      doc.moveDown();
    });

    doc.addPage();
  }

  /**
   * Add technical specifications section
   * Requirement 9.3
   */
  private addTechnicalSpecsSection(doc: typeof PDFDocument, specs: any) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('3. ข้อมูลทางเทคนิค', { underline: true });

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('3.1 แพลตฟอร์มวิดีโอคอล');
    doc.fontSize(12).font('Helvetica');

    doc.text(`ชื่อแพลตฟอร์ม: ${specs.platformName}`);
    doc.text(`เวอร์ชัน: ${specs.platformVersion || '-'}`);
    doc.text(`โปรโตคอลเข้ารหัส: ${specs.encryptionProtocol}`);
    doc.text(`ความละเอียดวิดีโอ: ${specs.videoResolution}`);
    doc.text(`อัตราเฟรม: ${specs.videoFrameRate} fps`);
    doc.text(`Bitrate เสียง: ${specs.audioBitrate} kbps`);
    doc.text(`Bitrate วิดีโอ: ${specs.videoBitrate} kbps`);

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('3.2 การบันทึกข้อมูล');
    doc.fontSize(12).font('Helvetica');

    doc.text(`เปิดใช้งานการบันทึก: ${specs.recordingEnabled ? 'ใช่' : 'ไม่'}`);
    doc.text(`รูปแบบไฟล์: ${specs.recordingFormat}`);
    doc.text(`ที่เก็บข้อมูล: ${specs.recordingStorage}`);
    doc.text(`ระยะเวลาเก็บรักษา: ${specs.recordingRetentionYears} ปี`);

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('3.3 ความปลอดภัย');
    doc.fontSize(12).font('Helvetica');

    doc.text(`การเข้ารหัสข้อมูล (At Rest): ${specs.dataEncryptionAtRest}`);
    doc.text(
      `การเข้ารหัสข้อมูล (In Transit): ${specs.dataEncryptionInTransit}`,
    );
    doc.text(`วิธีการควบคุมการเข้าถึง: ${specs.accessControlMethod}`);
    doc.text(`ความถี่การสำรองข้อมูล: ${specs.backupFrequency}`);
    doc.text(`สถานที่สำรองข้อมูล: ${specs.backupLocation}`);

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('3.4 เครือข่ายอินเทอร์เน็ต');
    doc.fontSize(12).font('Helvetica');

    doc.text(
      `แบนด์วิดท์ขั้นต่ำ: ${specs.minimumBandwidthKbps} kbps`,
    );
    doc.text(
      `แบนด์วิดท์แนะนำ: ${specs.recommendedBandwidthKbps} kbps`,
    );
    doc.text(`ผู้ให้บริการหลัก: ${specs.internetProvider || '-'}`);
    doc.text(`ผู้ให้บริการสำรอง: ${specs.backupInternetProvider || '-'}`);
    doc.text(`Uptime: ${specs.uptimePercentage || '-'}%`);

    doc.moveDown();
    doc.fontSize(14).font('Helvetica-Bold').text('3.5 Data Residency');
    doc.fontSize(12).font('Helvetica');

    doc.text(`Data Center: ${specs.dataCenter}`);
    doc.text(`สถานที่ตั้ง: ${specs.dataCenterLocation}`);
    doc.text(
      `เป็นไปตามข้อกำหนด Data Residency: ${specs.dataResidencyCompliant ? 'ใช่' : 'ไม่'}`,
    );

    doc.addPage();
  }

  /**
   * Add equipment inventory section
   * Requirement 9.4
   */
  private addEquipmentSection(doc: typeof PDFDocument, equipment: any[]) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('4. รายการอุปกรณ์', { underline: true });

    doc.moveDown();

    const equipmentByType = this.groupEquipmentByType(equipment);

    Object.entries(equipmentByType).forEach(([type, items]: [string, any]) => {
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`4.${this.getEquipmentTypeNumber(type)} ${this.translateEquipmentType(type)}`);

      doc.fontSize(12).font('Helvetica');

      items.forEach((item: any, index: number) => {
        doc.text(`  ${index + 1}. ${item.brand} ${item.model}`);
        doc.text(`     Serial Number: ${item.serialNumber || '-'}`);
        doc.text(
          `     วันที่ซื้อ: ${item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('th-TH') : '-'}`,
        );
        doc.text(
          `     การบำรุงรักษาล่าสุด: ${item.lastMaintenanceDate ? new Date(item.lastMaintenanceDate).toLocaleDateString('th-TH') : '-'}`,
        );
        doc.moveDown(0.5);
      });

      doc.moveDown();
    });

    doc.addPage();
  }

  /**
   * Add appendices
   */
  private addAppendices(doc: typeof PDFDocument) {
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('ภาคผนวก', { underline: true });

    doc.moveDown();
    doc.fontSize(12).font('Helvetica');

    doc.text('ภาคผนวก A: รูปภาพห้องให้คำปรึกษา');
    doc.text('ภาคผนวก B: สำเนาใบอนุญาตเภสัชกร');
    doc.text('ภาคผนวก C: เอกสารทางเทคนิคเพิ่มเติม');
    doc.text('ภาคผนวก D: Standard Operating Procedures (SOP)');
    doc.text('ภาคผนวก E: ใบรับรองการอบรมเภสัชกรรมทางไกล');

    doc.moveDown(2);
    doc.fontSize(10).text(
      `เอกสารนี้จัดทำโดยระบบอัตโนมัติ LINE Telepharmacy ERP`,
      { align: 'center' },
    );
    doc.text(`วันที่: ${new Date().toISOString()}`, { align: 'center' });
  }

  /**
   * Save PDF to storage
   */
  private async savePdfToStorage(
    filename: string,
    buffer: Buffer,
  ): Promise<string> {
    // For now, save to local filesystem
    // In production, upload to MinIO
    const uploadDir = path.join(process.cwd(), 'uploads', 'compliance');

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    return filepath;
  }

  // Helper methods

  private translateFacilityType(type: string): string {
    const types: Record<string, string> = {
      clinic: 'คลินิก',
      pharmacy: 'ร้านขายยา',
      hospital: 'โรงพยาบาล',
    };
    return types[type] || type;
  }

  private translateDay(day: string): string {
    const days: Record<string, string> = {
      monday: 'จันทร์',
      tuesday: 'อังคาร',
      wednesday: 'พุธ',
      thursday: 'พฤหัสบดี',
      friday: 'ศุกร์',
      saturday: 'เสาร์',
      sunday: 'อาทิตย์',
    };
    return days[day] || day;
  }

  private translateLicenseType(type: string): string {
    const types: Record<string, string> = {
      pharmacist: 'เภสัชกร',
      pharmacist_tech: 'ผู้ช่วยเภสัชกร',
    };
    return types[type] || type;
  }

  private translateEquipmentType(type: string): string {
    const types: Record<string, string> = {
      camera: 'กล้อง',
      microphone: 'ไมโครโฟน',
      monitor: 'จอภาพ',
      computer: 'คอมพิวเตอร์',
      backup_power: 'ระบบไฟสำรอง',
    };
    return types[type] || type;
  }

  private groupEquipmentByType(equipment: any[]): Record<string, any[]> {
    return equipment.reduce(
      (acc, item) => {
        if (!acc[item.type]) {
          acc[item.type] = [];
        }
        acc[item.type].push(item);
        return acc;
      },
      {} as Record<string, any[]>,
    );
  }

  private getEquipmentTypeNumber(type: string): number {
    const order = ['camera', 'microphone', 'monitor', 'computer', 'backup_power'];
    return order.indexOf(type) + 1;
  }
}
