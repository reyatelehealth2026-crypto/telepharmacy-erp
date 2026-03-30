import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { Roles, CurrentUser } from '../auth';
import type { RequestUser } from '../auth';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';
import { CreateChronicDiseaseDto } from './dto/create-chronic-disease.dto';
import { UpdateChronicDiseaseDto } from './dto/update-chronic-disease.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@Controller('staff/patients')
export class StaffPatientController {
  constructor(private readonly patientService: PatientService) {}

  // ─── Search & Profile ───────────────────────────────────────

  @Roles('pharmacist', 'super_admin', 'customer_service')
  @Get()
  searchPatients(
    @Query('q') query?: string,
    @Query('province') province?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.patientService.searchPatients(query, province, page, limit);
  }

  @Roles('pharmacist', 'super_admin')
  @Get(':patientId')
  getPatientProfile(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.patientService.getFullProfile(patientId);
  }

  @Roles('pharmacist', 'super_admin')
  @Patch(':patientId')
  updatePatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientService.staffUpdatePatient(patientId, dto);
  }

  // ─── Allergies ──────────────────────────────────────────────

  @Roles('pharmacist', 'super_admin')
  @Get(':patientId/allergies')
  getAllergies(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.patientService.getAllergies(patientId);
  }

  @Roles('pharmacist', 'super_admin')
  @Post(':patientId/allergies')
  @HttpCode(HttpStatus.CREATED)
  createAllergy(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateAllergyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientService.createAllergy(patientId, dto, user.id);
  }

  @Roles('pharmacist', 'super_admin')
  @Patch(':patientId/allergies/:allergyId')
  updateAllergy(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
    @Body() dto: UpdateAllergyDto,
  ) {
    return this.patientService.updateAllergy(patientId, allergyId, dto);
  }

  @Roles('pharmacist', 'super_admin')
  @Delete(':patientId/allergies/:allergyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAllergy(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
  ) {
    return this.patientService.deleteAllergy(patientId, allergyId);
  }

  // ─── Chronic Diseases ───────────────────────────────────────

  @Roles('pharmacist', 'super_admin')
  @Get(':patientId/diseases')
  getDiseases(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.patientService.getChronicDiseases(patientId);
  }

  @Roles('pharmacist', 'super_admin')
  @Post(':patientId/diseases')
  @HttpCode(HttpStatus.CREATED)
  createDisease(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateChronicDiseaseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientService.createChronicDisease(patientId, dto, user.id);
  }

  @Roles('pharmacist', 'super_admin')
  @Patch(':patientId/diseases/:diseaseId')
  updateDisease(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('diseaseId', ParseUUIDPipe) diseaseId: string,
    @Body() dto: UpdateChronicDiseaseDto,
  ) {
    return this.patientService.updateChronicDisease(patientId, diseaseId, dto);
  }

  @Roles('pharmacist', 'super_admin')
  @Delete(':patientId/diseases/:diseaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDisease(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('diseaseId', ParseUUIDPipe) diseaseId: string,
  ) {
    return this.patientService.deleteChronicDisease(patientId, diseaseId);
  }

  // ─── Medications ────────────────────────────────────────────

  @Roles('pharmacist', 'super_admin')
  @Get(':patientId/medications')
  getMedications(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.patientService.getMedications(patientId, false);
  }

  @Roles('pharmacist', 'super_admin')
  @Post(':patientId/medications')
  @HttpCode(HttpStatus.CREATED)
  createMedication(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateMedicationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.patientService.createMedication(patientId, dto, user.id);
  }

  @Roles('pharmacist', 'super_admin')
  @Patch(':patientId/medications/:medicationId')
  updateMedication(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.patientService.updateMedication(patientId, medicationId, dto);
  }

  @Roles('pharmacist', 'super_admin')
  @Delete(':patientId/medications/:medicationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMedication(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
  ) {
    return this.patientService.deleteMedication(patientId, medicationId);
  }
}
