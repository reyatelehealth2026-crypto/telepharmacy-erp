import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { TelemedicineAuditService, AuditSearchFilters } from './audit.service';
import { AuditReportService } from './audit-report.service';

@Controller('telemedicine/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(
    private readonly auditService: TelemedicineAuditService,
    private readonly reportService: AuditReportService,
  ) {}

  /**
   * Search audit logs with filters
   * Only accessible by super admins
   */
  @Get('search')
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  async searchLogs(
    @Query('actorId') actorId?: string,
    @Query('actorType') actorType?: string,
    @Query('actionType') actionType?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: AuditSearchFilters = {
      actorId,
      actorType,
      actionType,
      entityType,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    const result = await this.auditService.search(filters);

    return {
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
      },
    };
  }

  /**
   * Verify hash chain integrity
   * Critical for court-admissible evidence
   */
  @Get('verify-integrity')
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  async verifyIntegrity(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.auditService.verifyChainIntegrity(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Export audit logs to CSV
   */
  @Get('export/csv')
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  async exportCsv(
    @Query('actorId') actorId?: string,
    @Query('actorType') actorType?: string,
    @Query('actionType') actionType?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res({ passthrough: true }) res: Response = {} as Response,
  ) {
    const filters: AuditSearchFilters = {
      actorId,
      actorType,
      actionType,
      entityType,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const csvContent = await this.auditService.exportToCsv(filters);

    const filename = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(Buffer.from(csvContent, 'utf-8'));
  }

  /**
   * Export audit logs to PDF report
   */
  @Get('export/pdf')
  @Roles('super_admin')
  @HttpCode(HttpStatus.OK)
  async exportPdf(
    @Query('actorId') actorId?: string,
    @Query('actorType') actorType?: string,
    @Query('actionType') actionType?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res({ passthrough: true }) res: Response = {} as Response,
  ) {
    const filters: AuditSearchFilters = {
      actorId,
      actorType,
      actionType,
      entityType,
      entityId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    const pdfBuffer = await this.reportService.generatePdfReport(filters);

    const filename = `audit-report-${new Date().toISOString().split('T')[0]}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(pdfBuffer);
  }
}
