import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
  BadRequestException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

// multer is a transitive dependency of @nestjs/platform-express
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer') as typeof import('multer');

import { PrescriptionService } from './prescription.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { VerifyPrescriptionDto } from './dto/verify-prescription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

type UploadedRxFile = { buffer: Buffer; originalname: string; mimetype: string };

@Controller('prescriptions')
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  async createWithUpload(
    @CurrentUser() user: { id: string },
    @UploadedFiles() files: UploadedRxFile[],
    @Body() body: { notes?: string },
  ) {
    if (!files?.length) {
      throw new BadRequestException('กรุณาแนบรูปใบสั่งยา');
    }
    const imageUrls = await this.prescriptionService.uploadRxImages(files, user.id);
    return this.prescriptionService.create(user.id, {
      imageUrls,
      source: 'paper_rx',
      diagnosis: body.notes,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: any,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionService.create(user.id, dto);
  }

  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  getQueue(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.prescriptionService.getQueue(page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prescriptionService.findById(id);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacist', 'super_admin')
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: VerifyPrescriptionDto,
  ) {
    return this.prescriptionService.verify(id, user.id, dto);
  }

  @Get(':id/signature')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacist', 'super_admin', 'pharmacist_tech')
  getSignature(@Param('id', ParseUUIDPipe) id: string) {
    return this.prescriptionService.getSignature(id);
  }

  @Post(':id/interventions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacist', 'super_admin')
  logIntervention(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() body: {
      interventionType: string;
      description: string;
      actionTaken?: string;
      outcome?: string;
      severity?: string;
    },
  ) {
    return this.prescriptionService.logIntervention(id, user.id, body);
  }

  @Post(':id/counseling')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacist', 'super_admin')
  startCounseling(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() body: { method: string },
  ) {
    return this.prescriptionService.startCounseling(id, user.id, body.method);
  }

  @Patch(':id/counseling/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pharmacist', 'super_admin')
  updateCounseling(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: {
      endedAt?: string;
      topicsCovered?: string[];
      notes?: string;
      patientConfirmed?: boolean;
    },
  ) {
    return this.prescriptionService.updateCounseling(sessionId, body);
  }
}

@Controller('patients/me/prescriptions')
export class PatientPrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getMyPrescriptions(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.prescriptionService.getPatientPrescriptions(user.id, page, limit);
  }
}
