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
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientOnly, CurrentUser } from '../auth';
import type { RequestUser } from '../auth';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';
import { CreateChronicDiseaseDto } from './dto/create-chronic-disease.dto';
import { UpdateChronicDiseaseDto } from './dto/update-chronic-disease.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  // ─── Profile ────────────────────────────────────────────────

  @PatientOnly()
  @Get('me')
  getMyProfile(@CurrentUser() user: RequestUser) {
    return this.patientService.getProfile(user.id);
  }

  @PatientOnly()
  @Patch('me')
  updateMyProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientService.updateProfile(user.id, dto);
  }

  // ─── Allergies ──────────────────────────────────────────────

  @PatientOnly()
  @Get('me/allergies')
  getMyAllergies(@CurrentUser() user: RequestUser) {
    return this.patientService.getAllergies(user.id);
  }

  @PatientOnly()
  @Post('me/allergies')
  @HttpCode(HttpStatus.CREATED)
  createMyAllergy(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAllergyDto,
  ) {
    return this.patientService.createAllergy(user.id, dto);
  }

  @PatientOnly()
  @Patch('me/allergies/:allergyId')
  updateMyAllergy(
    @CurrentUser() user: RequestUser,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
    @Body() dto: UpdateAllergyDto,
  ) {
    return this.patientService.updateAllergy(user.id, allergyId, dto);
  }

  @PatientOnly()
  @Delete('me/allergies/:allergyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMyAllergy(
    @CurrentUser() user: RequestUser,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
  ) {
    return this.patientService.deleteAllergy(user.id, allergyId);
  }

  // ─── Chronic Diseases ───────────────────────────────────────

  @PatientOnly()
  @Get('me/diseases')
  getMyDiseases(@CurrentUser() user: RequestUser) {
    return this.patientService.getChronicDiseases(user.id);
  }

  @PatientOnly()
  @Post('me/diseases')
  @HttpCode(HttpStatus.CREATED)
  createMyDisease(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateChronicDiseaseDto,
  ) {
    return this.patientService.createChronicDisease(user.id, dto);
  }

  @PatientOnly()
  @Patch('me/diseases/:diseaseId')
  updateMyDisease(
    @CurrentUser() user: RequestUser,
    @Param('diseaseId', ParseUUIDPipe) diseaseId: string,
    @Body() dto: UpdateChronicDiseaseDto,
  ) {
    return this.patientService.updateChronicDisease(user.id, diseaseId, dto);
  }

  @PatientOnly()
  @Delete('me/diseases/:diseaseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMyDisease(
    @CurrentUser() user: RequestUser,
    @Param('diseaseId', ParseUUIDPipe) diseaseId: string,
  ) {
    return this.patientService.deleteChronicDisease(user.id, diseaseId);
  }

  // ─── Medications ────────────────────────────────────────────

  @PatientOnly()
  @Get('me/medications')
  getMyMedications(
    @CurrentUser() user: RequestUser,
    @Query('current_only', new DefaultValuePipe(true), ParseBoolPipe)
    currentOnly: boolean,
  ) {
    return this.patientService.getMedications(user.id, currentOnly);
  }

  @PatientOnly()
  @Post('me/medications')
  @HttpCode(HttpStatus.CREATED)
  createMyMedication(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.patientService.createMedication(user.id, dto);
  }

  @PatientOnly()
  @Patch('me/medications/:medicationId')
  updateMyMedication(
    @CurrentUser() user: RequestUser,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.patientService.updateMedication(user.id, medicationId, dto);
  }

  @PatientOnly()
  @Delete('me/medications/:medicationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMyMedication(
    @CurrentUser() user: RequestUser,
    @Param('medicationId', ParseUUIDPipe) medicationId: string,
  ) {
    return this.patientService.deleteMedication(user.id, medicationId);
  }

  // ─── Addresses ──────────────────────────────────────────────

  @PatientOnly()
  @Get('me/addresses')
  getMyAddresses(@CurrentUser() user: RequestUser) {
    return this.patientService.getAddresses(user.id);
  }

  @PatientOnly()
  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  createMyAddress(@CurrentUser() user: RequestUser, @Body() dto: any) {
    return this.patientService.createAddress(user.id, dto);
  }

  @PatientOnly()
  @Patch('me/addresses/:addressId')
  updateMyAddress(
    @CurrentUser() user: RequestUser,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: any,
  ) {
    return this.patientService.updateAddress(user.id, addressId, dto);
  }

  @PatientOnly()
  @Delete('me/addresses/:addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMyAddress(
    @CurrentUser() user: RequestUser,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ) {
    return this.patientService.deleteAddress(user.id, addressId);
  }
}
