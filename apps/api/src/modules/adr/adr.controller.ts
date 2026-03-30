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
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdrService } from './adr.service';
import { CreateAdrSchema, type CreateAdrDto } from './dto/create-adr.dto';
import { UpdateAdrAssessmentSchema, type UpdateAdrAssessmentDto } from './dto/update-adr.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('adr')
@ApiBearerAuth()
@Controller('v1/adr')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'super_admin', 'pharmacist_tech')
export class AdrController {
  constructor(private readonly adrService: AdrService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateAdrSchema))
  async create(@Body() dto: CreateAdrDto, @CurrentUser() user: any) {
    const report = await this.adrService.create(dto, user.id);
    return { success: true, data: report, message: 'บันทึกรายงาน ADR เรียบร้อยแล้ว' };
  }

  @Get('export')
  async exportRegulatory(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const data = await this.adrService.exportRegulatory({ fromDate, toDate });
    return { success: true, data };
  }

  @Get()
  async findAll(
    @Query('patientId') patientId?: string,
    @Query('drugName') drugName?: string,
    @Query('severity') severity?: string,
    @Query('causality') causality?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.adrService.findAll({
      patientId,
      drugName,
      severity,
      causality,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const report = await this.adrService.findOne(id);
    return { success: true, data: report };
  }

  @Patch(':id/assess')
  async assess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAdrAssessmentSchema)) dto: UpdateAdrAssessmentDto,
    @CurrentUser() user: any,
  ) {
    const report = await this.adrService.assess(id, dto, user.id);
    return { success: true, data: report, message: 'ประเมิน causality เรียบร้อยแล้ว' };
  }
}
