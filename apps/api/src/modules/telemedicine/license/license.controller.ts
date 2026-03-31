import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UsePipes,
} from '@nestjs/common';
import {
  LicenseVerifierService,
  VerifyLicenseDto,
  ManualReviewDto,
} from './license-verifier.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const VerifyLicenseSchema = z.object({
  pharmacistId: z.string().uuid(),
  licenseNumber: z.string().min(5),
  licenseType: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string(),
});

const ManualReviewSchema = z.object({
  documentUrl: z.string().url(),
  reviewNotes: z.string().min(10),
  approved: z.boolean(),
});

@Controller('v1/telemedicine/licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseVerifierService) {}

  @Post('verify')
  @UsePipes(new ZodValidationPipe(VerifyLicenseSchema))
  async verifyLicense(@Body() dto: VerifyLicenseDto) {
    return this.licenseService.verifyLicense({
      ...dto,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
      expiryDate: new Date(dto.expiryDate),
    });
  }

  @Get(':pharmacistId')
  async getLicenseStatus(@Param('pharmacistId') pharmacistId: string) {
    return this.licenseService.getLicenseStatus(pharmacistId);
  }

  @Post(':id/manual-review')
  @UsePipes(new ZodValidationPipe(ManualReviewSchema))
  async manualReview(
    @Param('id') verificationId: string,
    @Body() dto: ManualReviewDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.id || 'mock-admin-id';
    return this.licenseService.manualReview(verificationId, adminId, dto);
  }

  @Get('expiring')
  async getExpiringLicenses() {
    return this.licenseService.getExpiringLicenses();
  }

  @Get('compliance-report')
  async getComplianceReport() {
    return this.licenseService.generateComplianceReport();
  }
}
