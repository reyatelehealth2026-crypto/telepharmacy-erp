import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { createHash } from 'crypto';

@Injectable()
export class PdfService {
  /**
   * Generate consent PDF with patient signature
   */
  async generateConsentPdf(data: {
    consent: any;
    template: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          info: {
            Title: 'ใบยินยอมการรับบริการเภสัชกรรมทางไกล',
            Author: 'LINE Telepharmacy',
            Subject: 'E-Consent Form',
            Keywords: 'consent, telepharmacy, telemedicine',
            CreationDate: new Date(),
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Register Thai font (if available)
        // For production, you would need to include Thai fonts
        // doc.registerFont('THSarabunNew', 'path/to/THSarabunNew.ttf');
        // doc.font('THSarabunNew');

        // Header
        doc
          .fontSize(20)
          .text('ข้อตกลงและยินยอมการรับบริการเภสัชกรรมทางไกล', {
            align: 'center',
          });

        doc.moveDown();

        doc
          .fontSize(12)
          .text(`เวอร์ชัน: ${data.template.version}`, { align: 'center' });

        doc
          .fontSize(10)
          .text(
            `วันที่มีผล: ${new Date(data.template.effectiveFrom).toLocaleDateString('th-TH')}`,
            { align: 'center' },
          );

        doc.moveDown(2);

        // Consent content (Markdown to plain text)
        const content = this.markdownToPlainText(data.template.content);
        doc.fontSize(11).text(content, {
          align: 'left',
          lineGap: 5,
        });

        doc.moveDown(2);

        // Signature section
        doc
          .fontSize(14)
          .text('ลายเซ็นผู้ยินยอม', { underline: true });

        doc.moveDown();

        // Patient signature (if available)
        if (data.consent.signatureUrl) {
          doc
            .fontSize(10)
            .text('ลายเซ็นดิจิทัล:', { continued: false });
          doc.text(`[ดูลายเซ็นที่: ${data.consent.signatureUrl}]`, {
            link: data.consent.signatureUrl,
            underline: true,
            color: 'blue',
          });
        }

        doc.moveDown();

        // Consent metadata
        doc.fontSize(10);
        doc.text(`วันที่ยินยอม: ${new Date(data.consent.acceptedAt).toLocaleString('th-TH')}`);
        doc.text(`IP Address: ${data.consent.ipAddress || 'N/A'}`);
        doc.text(`Device ID: ${data.consent.deviceId || 'N/A'}`);

        if (data.consent.geolocation) {
          doc.text(
            `ตำแหน่ง: ${data.consent.geolocation.latitude}, ${data.consent.geolocation.longitude}`,
          );
        }

        doc.moveDown();

        doc.text(`เวลาที่ใช้อ่าน: ${data.consent.timeSpentSeconds} วินาที`);
        doc.text(`อ่านจนจบ: ${data.consent.scrolledToEnd ? 'ใช่' : 'ไม่'}`);

        doc.moveDown(2);

        // Document hash for verification
        const documentHash = this.generateDocumentHash(data);
        doc.fontSize(8).text(`Document Hash (SHA-256): ${documentHash}`, {
          align: 'center',
          color: 'gray',
        });

        doc.moveDown();

        doc.fontSize(8).text(`Consent ID: ${data.consent.id}`, {
          align: 'center',
          color: 'gray',
        });

        // Footer
        doc.fontSize(8).text(
          'เอกสารนี้สร้างโดยระบบอัตโนมัติและมีผลทางกฎหมาย',
          {
            align: 'center',
            color: 'gray',
          },
        );

        doc.text('LINE Telepharmacy - ระบบเภสัชกรรมทางไกล', {
          align: 'center',
          color: 'gray',
        });

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate referral letter PDF
   */
  async generateReferralPdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(18)
          .text('ใบส่งตัวผู้ป่วย (Referral Letter)', { align: 'center' });

        doc.moveDown();

        doc
          .fontSize(12)
          .text(`เลขที่: ${data.referralNo}`, { align: 'right' });
        doc.text(`วันที่: ${data.date}`, { align: 'right' });

        doc.moveDown(2);

        // Patient info
        doc.fontSize(14).text('ข้อมูลผู้ป่วย', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`ชื่อ-นามสกุล: ${data.patientInfo.name}`);
        doc.text(`HN: ${data.patientInfo.hn}`);
        doc.text(`อายุ: ${data.patientInfo.age} ปี`);
        doc.text(`เพศ: ${data.patientInfo.gender}`);
        doc.text(`เบอร์โทร: ${data.patientInfo.phone}`);

        doc.moveDown(2);

        // Referral info
        doc.fontSize(14).text('ข้อมูลการส่งตัว', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`จาก: ${data.referralInfo.from}`);
        doc.text(`ถึง: ${data.referralInfo.to}`);
        doc.text(`ระดับความเร่งด่วน: ${data.referralInfo.urgency}`);
        doc.text(`เหตุผล: ${data.referralInfo.reason}`);

        doc.moveDown(2);

        // Clinical info
        doc.fontSize(14).text('ข้อมูลทางคลินิก', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`อาการสำคัญ: ${data.clinicalInfo.chiefComplaint}`);
        doc.moveDown(0.5);
        doc.text(`สรุปอาการ:`);
        doc.text(data.clinicalInfo.summary, { indent: 20 });
        doc.moveDown(0.5);
        doc.text(`หมายเหตุจากเภสัชกร:`);
        doc.text(data.clinicalInfo.pharmacistNotes, { indent: 20 });

        doc.moveDown(2);

        // Pharmacist signature
        doc.fontSize(11);
        doc.text(`ลงชื่อ: ${data.pharmacistInfo.name}`, { align: 'right' });
        doc.text(`เภสัชกร เลขที่ใบอนุญาต: ${data.pharmacistInfo.licenseNo}`, {
          align: 'right',
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate audit report PDF
   */
  async generateAuditReportPdf(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(18)
          .text('Telemedicine Audit Report', { align: 'center' });

        doc.moveDown();

        doc.fontSize(12);
        doc.text(`Period: ${data.period}`, { align: 'center' });
        doc.text(`Generated: ${new Date(data.generatedAt).toLocaleString('th-TH')}`, {
          align: 'center',
        });
        doc.text(`Total Entries: ${data.totalEntries}`, { align: 'center' });

        doc.moveDown(2);

        // Integrity check
        doc.fontSize(14).text('Integrity Check', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Status: ${data.integrityCheck.isValid ? '✓ Valid' : '✗ Invalid'}`);
        doc.text(`Checked Entries: ${data.integrityCheck.checkedCount}`);

        if (data.integrityCheck.errors.length > 0) {
          doc.text('Errors:');
          data.integrityCheck.errors.forEach((error: string) => {
            doc.text(`  - ${error}`);
          });
        }

        doc.moveDown(2);

        // Log entries (first 100)
        doc.fontSize(14).text('Audit Log Entries', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(9);

        data.logs.slice(0, 100).forEach((log: any, index: number) => {
          doc.text(
            `${index + 1}. ${log.timestamp} | ${log.actor} | ${log.action} | ${log.entity}`,
          );
        });

        if (data.logs.length > 100) {
          doc.moveDown();
          doc.text(`... and ${data.logs.length - 100} more entries`);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private markdownToPlainText(markdown: string): string {
    // Simple markdown to plain text conversion
    return markdown
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
      .replace(/^[-*+]\s+/gm, '• ') // Convert lists
      .replace(/^\d+\.\s+/gm, '') // Remove numbered lists
      .replace(/^>\s+/gm, '') // Remove blockquotes
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .trim();
  }

  private generateDocumentHash(data: any): string {
    const hashData = JSON.stringify({
      templateId: data.template.id,
      templateVersion: data.template.version,
      consentId: data.consent.id,
      patientId: data.consent.patientId,
      acceptedAt: data.consent.acceptedAt,
      ipAddress: data.consent.ipAddress,
    });

    return createHash('sha256').update(hashData).digest('hex');
  }
}
