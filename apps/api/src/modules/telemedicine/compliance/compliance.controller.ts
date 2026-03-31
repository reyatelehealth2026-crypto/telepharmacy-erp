import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ComplianceMonitorService } from './compliance-monitor.service';
import { DocumentationGeneratorService } from './documentation-generator.service';
import * as fs from 'fs';

@ApiTags('Telemedicine - Compliance Monitoring')
@Controller('v1/telemedicine/compliance')
export class ComplianceController {
  constructor(
    private readonly complianceMonitor: ComplianceMonitorService,
    private readonly documentationGenerator: DocumentationGeneratorService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get real-time compliance dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved' })
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.complianceMonitor.getDashboardMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get specific compliance metrics with date range' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved' })
  async getMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.complianceMonitor.getDashboardMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('quality-metrics')
  @ApiOperation({ summary: 'Get video quality metrics' })
  @ApiResponse({ status: 200, description: 'Quality metrics retrieved' })
  async getQualityMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.complianceMonitor.getQualityMetrics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active compliance alerts' })
  @ApiResponse({ status: 200, description: 'Active alerts retrieved' })
  async getAlerts() {
    return this.complianceMonitor.getActiveAlerts();
  }

  @Get('weekly-report')
  @ApiOperation({ summary: 'Generate weekly compliance summary report' })
  @ApiResponse({ status: 200, description: 'Weekly report generated' })
  async getWeeklyReport() {
    return this.complianceMonitor.generateWeeklyReport();
  }

  @Get('scorecard')
  @ApiOperation({ summary: 'Get compliance scorecard with grading' })
  @ApiResponse({ status: 200, description: 'Scorecard retrieved' })
  async getScorecard() {
    return this.complianceMonitor.getComplianceScorecard();
  }

  @Post('survey')
  @ApiOperation({ summary: 'Submit patient satisfaction survey' })
  @ApiResponse({ status: 201, description: 'Survey submitted' })
  async submitSurvey(
    @Body()
    survey: {
      consultationId: string;
      patientId: string;
      rating: number;
      feedback?: string;
    },
  ) {
    // TODO: Implement survey storage
    return {
      submitted: true,
      consultationId: survey.consultationId,
      rating: survey.rating,
    };
  }

  @Post('documentation/sp16/:facilityId')
  @ApiOperation({
    summary: 'Generate ส.พ. 16 application package for facility',
  })
  @ApiResponse({
    status: 201,
    description: 'ส.พ. 16 application package generated',
  })
  async generateSp16Package(@Param('facilityId') facilityId: string) {
    const filepath =
      await this.documentationGenerator.generateSp16ApplicationPackage(
        facilityId,
      );

    return {
      success: true,
      filepath,
      message: 'ส.พ. 16 application package generated successfully',
    };
  }

  @Get('documentation/sp16/:facilityId/download')
  @ApiOperation({ summary: 'Download ส.พ. 16 application package' })
  @ApiResponse({ status: 200, description: 'PDF file downloaded' })
  async downloadSp16Package(
    @Param('facilityId') facilityId: string,
    @Res() res: Response,
  ) {
    const filepath =
      await this.documentationGenerator.generateSp16ApplicationPackage(
        facilityId,
      );

    // Stream the PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sp16-application-${facilityId}.pdf"`,
    );

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  }
}
