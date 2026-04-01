import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PdpaService } from './pdpa.service';
import type {
  DataExportRequestDto,
  DataDeletionRequestDto,
  ConsentPreferencesDto,
} from './pdpa.service';

@ApiTags('Telemedicine - PDPA Compliance')
@Controller('telemedicine/pdpa')
export class PdpaController {
  constructor(private readonly pdpaService: PdpaService) {}

  @Post('export-request')
  @ApiOperation({ summary: 'Request patient data export (PDPA Right to Access)' })
  @ApiResponse({ status: 201, description: 'Export request created' })
  async requestDataExport(@Body() dto: DataExportRequestDto) {
    return this.pdpaService.requestDataExport(dto);
  }

  @Get('export/:patientId')
  @ApiOperation({ summary: 'Get complete patient data export' })
  @ApiResponse({ status: 200, description: 'Patient data exported' })
  async exportPatientData(@Param('patientId') patientId: string) {
    return this.pdpaService.exportPatientData(patientId);
  }

  @Post('deletion-request')
  @ApiOperation({ summary: 'Request patient data deletion (PDPA Right to Erasure)' })
  @ApiResponse({ status: 201, description: 'Deletion request created' })
  async requestDataDeletion(@Body() dto: DataDeletionRequestDto) {
    return this.pdpaService.requestDataDeletion(dto);
  }

  @Get('consent-status')
  @ApiOperation({ summary: 'Get patient consent preferences' })
  @ApiResponse({ status: 200, description: 'Consent status retrieved' })
  async getConsentStatus(@Query('patientId') patientId: string) {
    return this.pdpaService.getConsentStatus(patientId);
  }

  @Post('consent')
  @ApiOperation({ summary: 'Update patient consent preferences' })
  @ApiResponse({ status: 200, description: 'Consent preferences updated' })
  async updateConsentPreferences(
    @Query('patientId') patientId: string,
    @Body() preferences: ConsentPreferencesDto,
  ) {
    return this.pdpaService.updateConsentPreferences(patientId, preferences);
  }

  @Get('data-residency')
  @ApiOperation({ summary: 'Verify data residency compliance' })
  @ApiResponse({ status: 200, description: 'Data residency status' })
  async verifyDataResidency() {
    return this.pdpaService.verifyDataResidency();
  }

  @Get('compliance-report')
  @ApiOperation({ summary: 'Generate PDPA compliance report' })
  @ApiResponse({ status: 200, description: 'Compliance report generated' })
  async generateComplianceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.pdpaService.generateComplianceReport(
      new Date(startDate),
      new Date(endDate),
    );
  }
}
