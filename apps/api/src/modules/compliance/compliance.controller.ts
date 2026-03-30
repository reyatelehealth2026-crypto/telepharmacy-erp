import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { ComplianceService } from './compliance.service';
import { AuditService } from './audit.service';
import { LogAuditEventSchema, type LogAuditEventDto, ConsentRecordSchema, type ConsentRecordDto } from './dto/data-request.dto';
import { CreateBreachReportSchema, type CreateBreachReportDto } from './dto/data-breach.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('compliance')
@ApiBearerAuth()
@Controller('v1/compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly auditService: AuditService,
  ) {}

  @Post('audit-log')
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech', 'customer_service')
  async logAuditEvent(
    @Body(new ZodValidationPipe(LogAuditEventSchema)) dto: LogAuditEventDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const result = await this.complianceService.logAuditEvent(dto, user.id, req.ip);
    return { success: true, data: result };
  }

  @Get('audit-log')
  @Roles('super_admin')
  async queryAuditLog(
    @Query('tableName') tableName?: string,
    @Query('recordId') recordId?: string,
    @Query('action') action?: string,
    @Query('changedBy') changedBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.complianceService.queryAuditLog({
      tableName,
      recordId,
      action,
      changedBy,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { success: true, ...result };
  }

  @Post('data-export/:patientId')
  @Roles('pharmacist', 'super_admin')
  async exportPatientData(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const data = await this.complianceService.exportPatientData(patientId, user.id, req.ip);
    return { success: true, data };
  }

  @Post('erasure/:patientId')
  @Roles('super_admin')
  async erasureRequest(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const result = await this.complianceService.erasureRequest(patientId, user.id, req.ip);
    return { success: true, data: result, message: 'ลบข้อมูลส่วนบุคคลเรียบร้อยแล้ว' };
  }

  @Post('consent/:patientId')
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech', 'customer_service')
  async recordConsent(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body(new ZodValidationPipe(ConsentRecordSchema)) dto: ConsentRecordDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const record = await this.complianceService.recordConsent(patientId, dto, user.id, req.ip);
    return { success: true, data: record, message: 'บันทึกความยินยอมเรียบร้อยแล้ว' };
  }

  @Get('retention-review')
  @Roles('super_admin', 'pharmacist')
  async retentionReview() {
    const result = await this.complianceService.retentionReview();
    return { success: true, data: result };
  }

  @Post('breach')
  @Roles('super_admin', 'pharmacist')
  async reportBreach(
    @Body(new ZodValidationPipe(CreateBreachReportSchema)) dto: CreateBreachReportDto,
    @CurrentUser() user: any,
  ) {
    const report = await this.complianceService.reportBreach(dto, user.id);
    return { success: true, data: report, message: 'บันทึกรายงานเหตุการณ์ข้อมูลเรียบร้อยแล้ว' };
  }

  @Get('breach')
  @Roles('super_admin', 'pharmacist')
  async findBreachReports(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.complianceService.findBreachReports({
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { success: true, ...result };
  }
}
