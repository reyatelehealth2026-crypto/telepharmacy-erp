import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';
import { kycVerifications, patients } from '@telepharmacy/db';
import { eq, and, desc } from 'drizzle-orm';
import * as crypto from 'crypto';
import { ExtractedIdData } from './dto';

@Injectable()
export class KycService {
  private readonly otpExpirySeconds: number;
  private readonly otpMaxAttempts: number;
  private readonly faceMatchMinConfidence: number;
  private readonly ocrMinConfidence: number;
  private readonly kycValidityYears: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly configService: ConfigService,
  ) {
    const kycConfig = this.configService.get('telemedicine.kyc');
    this.otpExpirySeconds = kycConfig?.otpExpirySeconds || 300;
    this.otpMaxAttempts = kycConfig?.otpMaxAttempts || 3;
    this.faceMatchMinConfidence = kycConfig?.faceMatchMinConfidence || 90;
    this.ocrMinConfidence = kycConfig?.ocrMinConfidence || 95;
    this.kycValidityYears = kycConfig?.kycValidityYears || 1;
  }

  /**
   * Extract data from Thai ID card using OCR (Gemini Vision API)
   */
  async extractIdData(imageBuffer: Buffer): Promise<ExtractedIdData> {
    // TODO: Integrate with Gemini Vision API
    // For now, return mock data structure
    const prompt = `Extract structured data from this Thai national ID card image.
    Return JSON with fields: nationalId, thaiName, englishName, dateOfBirth, address, issueDate, expiryDate, confidence`;

    // Mock extraction result
    const result = {
      nationalId: '1234567890123',
      thaiName: 'สมชาย ใจดี',
      englishName: 'Somchai Jaidee',
      dateOfBirth: '1990-01-15',
      address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
      issueDate: '2020-01-01',
      expiryDate: '2030-01-01',
      confidence: 98.5,
    };

    // Validate Thai ID checksum
    if (!this.validateThaiIdChecksum(result.nationalId)) {
      throw new BadRequestException('Invalid Thai national ID checksum');
    }

    if (result.confidence < this.ocrMinConfidence) {
      throw new BadRequestException(`OCR confidence too low: ${result.confidence}%. Minimum required: ${this.ocrMinConfidence}%`);
    }

    return result;
  }

  /**
   * Validate Thai national ID checksum using MOD 11 algorithm
   */
  validateThaiIdChecksum(idNumber: string): boolean {
    if (!/^\d{13}$/.test(idNumber)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(idNumber[i]) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(idNumber[12]);
  }

  /**
   * Create or update KYC verification record
   */
  async createOrUpdateVerification(
    patientId: string,
    documentUrl: string,
    documentType: string,
    extractedData: ExtractedIdData,
    metadata: { ipAddress?: string; deviceId?: string; userAgent?: string }
  ): Promise<any> {
    // Check if patient exists
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Check for existing verification
    const [existing] = await this.db
      .select()
      .from(kycVerifications)
      .where(eq(kycVerifications.patientId, patientId))
      .orderBy(desc(kycVerifications.createdAt))
      .limit(1);

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + this.kycValidityYears);

    // Check if patient is minor (under 20 years old)
    const birthDate = new Date(extractedData.dateOfBirth);
    const age = this.calculateAge(birthDate);
    const requiresGuardianConsent = age < 20;

    if (existing && existing.status !== 'completed' && existing.status !== 'failed') {
      // Update existing verification
      const [updated] = await this.db
        .update(kycVerifications)
        .set({
          idDocumentUrl: documentUrl,
          idDocumentType: documentType,
          extractedData: extractedData,
          ocrConfidence: extractedData.confidence.toString(),
          status: 'documents_uploaded',
          requiresGuardianConsent,
          ipAddress: metadata.ipAddress,
          deviceId: metadata.deviceId,
          userAgent: metadata.userAgent,
          updatedAt: new Date(),
        })
        .where(eq(kycVerifications.id, existing.id))
        .returning();

      return updated;
    } else {
      // Create new verification
      const [created] = await this.db
        .insert(kycVerifications)
        .values({
          patientId,
          idDocumentUrl: documentUrl,
          idDocumentType: documentType,
          extractedData: extractedData,
          ocrConfidence: extractedData.confidence.toString(),
          status: 'documents_uploaded',
          requiresGuardianConsent,
          expiresAt,
          ipAddress: metadata.ipAddress,
          deviceId: metadata.deviceId,
          userAgent: metadata.userAgent,
        })
        .returning();

      return created;
    }
  }

  /**
   * Update liveness check result
   */
  async updateLivenessCheck(
    verificationId: string,
    videoUrl: string,
    score: number,
    gestures: string[],
    passed: boolean
  ): Promise<void> {
    const updateData: any = {
      livenessVideoUrl: videoUrl,
      livenessScore: score.toString(),
      livenessGestures: gestures,
      updatedAt: new Date(),
    };

    if (passed) {
      updateData.livenessPassedAt = new Date();
      updateData.status = 'liveness_passed';
    } else {
      updateData.status = 'failed';
      updateData.flaggedForReview = true;
      updateData.reviewReason = 'Liveness detection failed';
    }

    await this.db
      .update(kycVerifications)
      .set(updateData)
      .where(eq(kycVerifications.id, verificationId));
  }

  /**
   * Update face comparison result
   */
  async updateFaceComparison(
    verificationId: string,
    selfieUrl: string,
    confidence: number,
    matched: boolean
  ): Promise<void> {
    const requiresReview = confidence < this.faceMatchMinConfidence;

    const updateData: any = {
      selfieUrl,
      faceMatchConfidence: confidence.toString(),
      updatedAt: new Date(),
    };

    if (matched && !requiresReview) {
      updateData.faceMatchPassedAt = new Date();
      updateData.status = 'face_verified';
    } else {
      updateData.flaggedForReview = true;
      updateData.reviewReason = requiresReview
        ? `Face match confidence below threshold: ${confidence}%`
        : 'Face comparison failed';
    }

    await this.db
      .update(kycVerifications)
      .set(updateData)
      .where(eq(kycVerifications.id, verificationId));
  }

  /**
   * Generate 6-digit OTP
   */
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Update OTP sent timestamp
   */
  async updateOtpSent(verificationId: string): Promise<void> {
    await this.db
      .update(kycVerifications)
      .set({
        phoneOtpSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kycVerifications.id, verificationId));
  }

  /**
   * Update OTP verified status
   */
  async updateOtpVerified(verificationId: string): Promise<void> {
    await this.db
      .update(kycVerifications)
      .set({
        phoneOtpVerifiedAt: new Date(),
        status: 'otp_verified',
        updatedAt: new Date(),
      })
      .where(eq(kycVerifications.id, verificationId));
  }

  /**
   * Increment OTP attempts
   */
  async incrementOtpAttempts(verificationId: string): Promise<number> {
    const [verification] = await this.db
      .select()
      .from(kycVerifications)
      .where(eq(kycVerifications.id, verificationId))
      .limit(1);

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const newAttempts = (verification.phoneOtpAttempts || 0) + 1;

    await this.db
      .update(kycVerifications)
      .set({
        phoneOtpAttempts: newAttempts,
        updatedAt: new Date(),
      })
      .where(eq(kycVerifications.id, verificationId));

    return newAttempts;
  }

  /**
   * Update email verification sent timestamp
   */
  async updateEmailVerificationSent(verificationId: string): Promise<void> {
    await this.db
      .update(kycVerifications)
      .set({
        emailVerificationSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kycVerifications.id, verificationId));
  }

  /**
   * Update email verified status and complete KYC
   */
  async updateEmailVerified(verificationId: string): Promise<void> {
    await this.db
      .update(kycVerifications)
      .set({
        emailVerifiedAt: new Date(),
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kycVerifications.id, verificationId));
  }

  /**
   * Get verification by ID
   */
  async getVerification(verificationId: string): Promise<any> {
    const [verification] = await this.db
      .select()
      .from(kycVerifications)
      .where(eq(kycVerifications.id, verificationId))
      .limit(1);

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    return verification;
  }

  /**
   * Get verification by patient ID
   */
  async getVerificationByPatientId(patientId: string): Promise<any> {
    const [verification] = await this.db
      .select()
      .from(kycVerifications)
      .where(eq(kycVerifications.patientId, patientId))
      .orderBy(desc(kycVerifications.createdAt))
      .limit(1);

    return verification;
  }

  /**
   * Manual review approval/rejection
   */
  async manualReview(
    verificationId: string,
    reviewerId: string,
    approved: boolean,
    notes: string
  ): Promise<void> {
    const updateData: any = {
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: notes,
      flaggedForReview: false,
      updatedAt: new Date(),
    };

    if (approved) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    } else {
      updateData.status = 'failed';
    }

    await this.db
      .update(kycVerifications)
      .set(updateData)
      .where(eq(kycVerifications.id, verificationId));
  }

  /**
   * Calculate age from birth date
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Encrypt sensitive data before storage
   */
  encryptData(data: string, key: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string, key: string): string {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
