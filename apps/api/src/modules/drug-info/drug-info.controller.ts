import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DrugInfoService } from './drug-info.service';
import { CreateMedicationReviewSchema, type CreateMedicationReviewDto, CompleteMedicationReviewSchema, type CompleteMedicationReviewDto } from './dto/create-drug-info.dto';
import { CreateTdmRequestSchema, type CreateTdmRequestDto, RecordTdmResultSchema, type RecordTdmResultDto } from './dto/medication-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('drug-info')
@ApiBearerAuth()
@Controller('drug-info')
@UseGuards(JwtAuthGuard)
export class DrugInfoController {
  constructor(private readonly drugInfoService: DrugInfoService) {}

  @Get('lookup')
  async lookup(@Query('q') q: string) {
    const result = await this.drugInfoService.lookupDrug(q ?? '');
    return { success: true, ...result };
  }

  @Post('medication-review')
  async createMedicationReview(
    @Body(new ZodValidationPipe(CreateMedicationReviewSchema)) dto: CreateMedicationReviewDto,
    @CurrentUser() user: any,
  ) {
    const request = await this.drugInfoService.createMedicationReview(dto, user.id);
    return { success: true, data: request, message: 'ส่งคำขอ Medication Review เรียบร้อยแล้ว' };
  }

  @Get('medication-review')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  async findMedicationReviews(
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.drugInfoService.findMedicationReviews({
      patientId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { success: true, ...result };
  }

  @Patch('medication-review/:id/complete')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin')
  async completeMedicationReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(CompleteMedicationReviewSchema)) dto: CompleteMedicationReviewDto,
    @CurrentUser() user: any,
  ) {
    const request = await this.drugInfoService.completeMedicationReview(id, dto, user.id);
    return { success: true, data: request, message: 'บันทึก Medication Review เรียบร้อยแล้ว' };
  }

  @Post('tdm')
  async createTdmRequest(
    @Body(new ZodValidationPipe(CreateTdmRequestSchema)) dto: CreateTdmRequestDto,
    @CurrentUser() user: any,
  ) {
    const request = await this.drugInfoService.createTdmRequest(dto, user.id);
    return { success: true, data: request, message: 'ส่งคำขอ TDM เรียบร้อยแล้ว' };
  }

  @Get('tdm')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  async findTdmRequests(
    @Query('patientId') patientId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.drugInfoService.findTdmRequests({
      patientId,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { success: true, ...result };
  }

  @Patch('tdm/:id/result')
  @UseGuards(RolesGuard)
  @Roles('pharmacist', 'super_admin')
  async recordTdmResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RecordTdmResultSchema)) dto: RecordTdmResultDto,
    @CurrentUser() user: any,
  ) {
    const request = await this.drugInfoService.recordTdmResult(id, dto, user.id);
    return { success: true, data: request, message: 'บันทึกผล TDM เรียบร้อยแล้ว' };
  }
}
