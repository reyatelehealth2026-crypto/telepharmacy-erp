import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KycService } from './kyc.service';
import { AwsRekognitionService } from './aws-rekognition.service';
import { SmsService } from './sms.service';
import { EmailVerificationService } from './email.service';
import { MinioStorageService } from './minio.service';
import { RedisKycService } from './redis.service';
import {
  UploadDocumentDto,
  uploadDocumentSchema,
  VerifyOtpDto,
  verifyOtpSchema,
  SendOtpDto,
  sendOtpSchema,
  LivenessCheckDto,
  livenessCheckSchema,
  FaceCompareDto,
  faceCompareSchema,
  ManualReviewDto,
  manualReviewSchema,
} from './dto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('v1/telemedicine/kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  private readonly encryptionKey: string;

  constructor(
    private readonly kycService: KycService,
    private readonly rekognitionService: AwsRekognitionService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailVerificationService,
    private readonly minioService: MinioStorageService,
    private readonly redisService: RedisKycService,
    private readonly configService: ConfigService,
  ) {
    // Get encryption key from config
    this.encryptionKey = this.configService.get('telemedicine.audit.encryptionKey') || 
      '0'.repeat(64); // 32 bytes hex = 64 characters
  }

  /**
   * Step 1: Upload ID document and extract data via OCR
   */
  @Post('upload-document')
  @UseInterceptors(FileInterceptor('document'))
  async uploadDocument(
    @UploadedFile() file: any,
    @Body(new ZodValidationPipe(uploadDocumentSchema)) dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG and PNG images are allowed');
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size must not exceed 10MB');
    }

    // Extract data from ID document using OCR
    const extractedData = await this.kycService.extractIdData(file.buffer);

    // Upload encrypted document to MinIO
    const filename = this.minioService.generateFilename(
      `kyc-${dto.patientId}`,
      file.originalname.split('.').pop() || 'jpg'
    );
    const documentUrl = await this.minioService.uploadEncrypted(
      file.buffer,
      filename,
      this.encryptionKey
    );

    // Create or update KYC verification record
    const verification = await this.kycService.createOrUpdateVerification(
      dto.patientId,
      documentUrl,
      dto.documentType,
      extractedData,
      {
        ipAddress: '127.0.0.1', // TODO: Get from request
        deviceId: 'device-id', // TODO: Get from request headers
        userAgent: 'user-agent', // TODO: Get from request headers
      }
    );

    return {
      success: true,
      verificationId: verification.id,
      extractedData: {
        nationalId: extractedData.nationalId,
        thaiName: extractedData.thaiName,
        englishName: extractedData.englishName,
        dateOfBirth: extractedData.dateOfBirth,
        address: extractedData.address,
      },
      requiresGuardianConsent: verification.requiresGuardianConsent,
      nextStep: 'liveness_check',
    };
  }

  /**
   * Step 2: Liveness detection
   */
  @Post('liveness-check')
  @UseInterceptors(FileInterceptor('video'))
  async livenessCheck(
    @UploadedFile() file: any,
    @Body(new ZodValidationPipe(livenessCheckSchema)) dto: LivenessCheckDto,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    // Validate file type
    const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only MP4, WebM, and MOV videos are allowed');
    }

    // Get verification record
    const verification = await this.kycService.getVerification(dto.verificationId);

    // Perform liveness check
    const result = await this.rekognitionService.performLivenessCheck(
      file.buffer,
      dto.gestures
    );

    // Upload video to MinIO
    const filename = this.minioService.generateFilename(
      `liveness-${dto.verificationId}`,
      'mp4'
    );
    const videoUrl = await this.minioService.uploadEncrypted(
      file.buffer,
      filename,
      this.encryptionKey
    );

    // Update verification record
    await this.kycService.updateLivenessCheck(
      dto.verificationId,
      videoUrl,
      result.score,
      result.gesturesPerformed,
      result.passed
    );

    return {
      success: true,
      passed: result.passed,
      score: result.score,
      nextStep: result.passed ? 'face_compare' : 'manual_review',
    };
  }

  /**
   * Step 3: Face comparison
   */
  @Post('face-compare')
  @UseInterceptors(FileInterceptor('selfie'))
  async faceCompare(
    @UploadedFile() file: any,
    @Body(new ZodValidationPipe(faceCompareSchema)) dto: FaceCompareDto,
  ) {
    if (!file) {
      throw new BadRequestException('Selfie file is required');
    }

    // Get verification record
    const verification = await this.kycService.getVerification(dto.verificationId);

    // Download ID document for comparison
    const idDocumentBuffer = await this.minioService.downloadDecrypted(
      verification.idDocumentUrl,
      this.encryptionKey
    );

    // Compare faces
    const result = await this.rekognitionService.compareFaces(
      idDocumentBuffer,
      file.buffer
    );

    // Upload selfie to MinIO
    const filename = this.minioService.generateFilename(
      `selfie-${dto.verificationId}`,
      file.originalname.split('.').pop() || 'jpg'
    );
    const selfieUrl = await this.minioService.uploadEncrypted(
      file.buffer,
      filename,
      this.encryptionKey
    );

    // Update verification record
    await this.kycService.updateFaceComparison(
      dto.verificationId,
      selfieUrl,
      result.confidence,
      result.matched
    );

    const requiresReview = result.confidence < 90;

    return {
      success: true,
      matched: result.matched,
      confidence: result.confidence,
      requiresReview,
      nextStep: requiresReview ? 'manual_review' : 'send_otp',
    };
  }

  /**
   * Step 4: Send OTP
   */
  @Post('send-otp')
  async sendOtp(@Body(new ZodValidationPipe(sendOtpSchema)) dto: SendOtpDto) {
    // Get verification record
    const verification = await this.kycService.getVerification(dto.verificationId);

    // Get patient phone number
    // TODO: Query patient from database
    const patientPhone = '0812345678'; // Mock

    // Generate OTP
    const otp = this.kycService.generateOtp();

    // Store OTP in Redis with 5-minute expiry
    const expirySeconds = this.configService.get('telemedicine.kyc.otpExpirySeconds') || 300;
    await this.redisService.storeOtp(dto.verificationId, otp, expirySeconds);

    // Send OTP via SMS
    await this.smsService.sendOtp(patientPhone, otp);

    // Update verification record
    await this.kycService.updateOtpSent(dto.verificationId);

    return {
      success: true,
      sent: true,
      expiresIn: expirySeconds,
      nextStep: 'verify_otp',
    };
  }

  /**
   * Step 5: Verify OTP
   */
  @Post('verify-otp')
  async verifyOtp(@Body(new ZodValidationPipe(verifyOtpSchema)) dto: VerifyOtpDto) {
    // Get verification record
    const verification = await this.kycService.getVerification(dto.verificationId);

    // Check OTP attempts
    const maxAttempts = this.configService.get('telemedicine.kyc.otpMaxAttempts') || 3;
    if ((verification.phoneOtpAttempts || 0) >= maxAttempts) {
      throw new BadRequestException('Maximum OTP attempts exceeded. Please request a new OTP.');
    }

    // Get OTP from Redis
    const storedOtp = await this.redisService.getOtp(dto.verificationId);

    if (!storedOtp) {
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    // Verify OTP
    if (storedOtp !== dto.otp) {
      // Increment attempts
      await this.kycService.incrementOtpAttempts(dto.verificationId);
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    // OTP is valid - delete from Redis
    await this.redisService.deleteOtp(dto.verificationId);

    // Update verification record
    await this.kycService.updateOtpVerified(dto.verificationId);

    // Send email verification
    // TODO: Get patient email from database
    const patientEmail = 'patient@example.com'; // Mock
    const patientName = 'Patient Name'; // Mock

    const verificationToken = this.emailService.generateVerificationToken(
      dto.verificationId,
      patientEmail
    );

    await this.emailService.sendVerificationEmail(
      patientEmail,
      verificationToken,
      patientName
    );

    await this.kycService.updateEmailVerificationSent(dto.verificationId);

    return {
      success: true,
      verified: true,
      kycCompleted: false,
      nextStep: 'verify_email',
      message: 'OTP verified successfully. Please check your email to complete verification.',
    };
  }

  /**
   * Step 6: Verify email (via link click)
   */
  @Get('verify-email/:token')
  async verifyEmail(@Param('token') token: string) {
    // Verify token
    const payload = this.emailService.verifyToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    // Update verification record
    await this.kycService.updateEmailVerified(payload.verificationId);

    // TODO: Mark patient as telemedicine-enabled in patients table

    return {
      success: true,
      verified: true,
      kycCompleted: true,
      message: 'Email verified successfully. Your account is now enabled for telemedicine services.',
      redirectUrl: '/telemedicine/dashboard', // LIFF app URL
    };
  }

  /**
   * Get KYC status
   */
  @Get('status/:patientId')
  async getStatus(@Param('patientId') patientId: string) {
    const verification = await this.kycService.getVerificationByPatientId(patientId);

    if (!verification) {
      return {
        hasKyc: false,
        status: 'not_started',
        nextStep: 'upload_document',
      };
    }

    // Determine next step based on status
    let nextStep = 'completed';
    if (verification.status === 'pending') {
      nextStep = 'upload_document';
    } else if (verification.status === 'documents_uploaded') {
      nextStep = 'liveness_check';
    } else if (verification.status === 'liveness_passed') {
      nextStep = 'face_compare';
    } else if (verification.status === 'face_verified') {
      nextStep = 'send_otp';
    } else if (verification.status === 'otp_verified') {
      nextStep = 'verify_email';
    } else if (verification.status === 'failed') {
      nextStep = 'manual_review';
    } else if (verification.status === 'manual_review') {
      nextStep = 'awaiting_review';
    }

    return {
      hasKyc: true,
      verificationId: verification.id,
      status: verification.status,
      nextStep,
      requiresGuardianConsent: verification.requiresGuardianConsent,
      flaggedForReview: verification.flaggedForReview,
      completedAt: verification.completedAt,
      expiresAt: verification.expiresAt,
    };
  }

  /**
   * Manual review (pharmacist/admin only)
   */
  @Post(':verificationId/review')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin')
  async manualReview(
    @Param('verificationId') verificationId: string,
    @Body(new ZodValidationPipe(manualReviewSchema)) dto: ManualReviewDto,
    @CurrentUser() user: any,
  ) {
    const reviewerId = user.id;

    await this.kycService.manualReview(
      verificationId,
      reviewerId,
      dto.approved,
      dto.reviewNotes
    );

    return {
      success: true,
      approved: dto.approved,
      message: dto.approved
        ? 'KYC verification approved successfully'
        : 'KYC verification rejected',
    };
  }
}
