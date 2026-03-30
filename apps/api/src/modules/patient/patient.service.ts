import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { eq, and, isNull, desc, ilike, or, sql } from 'drizzle-orm';
import {
  patients,
  patientAllergies,
  patientChronicDiseases,
  patientMedications,
} from '@telepharmacy/db';
import { DRIZZLE } from '../../database/database.constants';
import type { UpdatePatientDto } from './dto/update-patient.dto';
import type { CreateAllergyDto } from './dto/create-allergy.dto';
import type { UpdateAllergyDto } from './dto/update-allergy.dto';
import type { CreateChronicDiseaseDto } from './dto/create-chronic-disease.dto';
import type { UpdateChronicDiseaseDto } from './dto/update-chronic-disease.dto';
import type { CreateMedicationDto } from './dto/create-medication.dto';
import type { UpdateMedicationDto } from './dto/update-medication.dto';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ─── Patient Profile ────────────────────────────────────────

  async getProfile(patientId: string) {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
      .limit(1);

    if (!patient) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');
    }

    const [allergies, chronicDiseases, medications] = await Promise.all([
      this.db
        .select()
        .from(patientAllergies)
        .where(eq(patientAllergies.patientId, patientId))
        .orderBy(desc(patientAllergies.createdAt)),
      this.db
        .select()
        .from(patientChronicDiseases)
        .where(eq(patientChronicDiseases.patientId, patientId))
        .orderBy(desc(patientChronicDiseases.createdAt)),
      this.db
        .select()
        .from(patientMedications)
        .where(
          and(
            eq(patientMedications.patientId, patientId),
            eq(patientMedications.isCurrent, true),
          ),
        )
        .orderBy(desc(patientMedications.createdAt)),
    ]);

    return {
      ...patient,
      age: patient.birthDate ? this.calculateAge(patient.birthDate) : null,
      allergies,
      chronicDiseases,
      currentMedications: medications,
    };
  }

  async updateProfile(patientId: string, dto: UpdatePatientDto) {
    await this.ensurePatientExists(patientId);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    const fieldMap: Record<string, string> = {
      title: 'title',
      firstName: 'firstName',
      lastName: 'lastName',
      birthDate: 'birthDate',
      gender: 'gender',
      phone: 'phone',
      email: 'email',
      weight: 'weight',
      height: 'height',
      bloodType: 'bloodType',
      address: 'address',
      subDistrict: 'subDistrict',
      district: 'district',
      province: 'province',
      postalCode: 'postalCode',
      isPregnant: 'isPregnant',
      isBreastfeeding: 'isBreastfeeding',
      smoking: 'smoking',
      alcohol: 'alcohol',
      insuranceType: 'insuranceType',
      insuranceId: 'insuranceId',
    };

    for (const [dtoKey, dbKey] of Object.entries(fieldMap)) {
      const value = (dto as Record<string, unknown>)[dtoKey];
      if (value !== undefined) {
        updateData[dbKey] = value;
      }
    }

    const [updated] = await this.db
      .update(patients)
      .set(updateData)
      .where(eq(patients.id, patientId))
      .returning();

    return updated;
  }

  // ─── Allergies ──────────────────────────────────────────────

  async getAllergies(patientId: string) {
    await this.ensurePatientExists(patientId);
    return this.db
      .select()
      .from(patientAllergies)
      .where(eq(patientAllergies.patientId, patientId))
      .orderBy(desc(patientAllergies.createdAt));
  }

  async createAllergy(patientId: string, dto: CreateAllergyDto, recordedBy?: string) {
    await this.ensurePatientExists(patientId);

    const [allergy] = await this.db
      .insert(patientAllergies)
      .values({
        patientId,
        drugName: dto.drugName,
        genericNames: dto.genericNames ?? [],
        allergyGroup: dto.allergyGroup,
        reactionType: dto.reactionType,
        severity: dto.severity,
        symptoms: dto.symptoms,
        source: dto.source ?? 'patient_reported',
        occurredDate: dto.occurredDate,
        notes: dto.notes,
        recordedBy,
      })
      .returning();

    this.logger.log(
      `Allergy created for patient ${patientId}: ${dto.drugName} (${dto.severity})`,
    );

    return allergy;
  }

  async updateAllergy(patientId: string, allergyId: string, dto: UpdateAllergyDto) {
    const [existing] = await this.db
      .select()
      .from(patientAllergies)
      .where(
        and(
          eq(patientAllergies.id, allergyId),
          eq(patientAllergies.patientId, patientId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('ไม่พบข้อมูลการแพ้ยา');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) updateData[key] = value;
    }

    const [updated] = await this.db
      .update(patientAllergies)
      .set(updateData)
      .where(eq(patientAllergies.id, allergyId))
      .returning();

    return updated;
  }

  async deleteAllergy(patientId: string, allergyId: string) {
    const [existing] = await this.db
      .select({ id: patientAllergies.id })
      .from(patientAllergies)
      .where(
        and(
          eq(patientAllergies.id, allergyId),
          eq(patientAllergies.patientId, patientId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('ไม่พบข้อมูลการแพ้ยา');
    }

    await this.db
      .delete(patientAllergies)
      .where(eq(patientAllergies.id, allergyId));
  }

  // ─── Chronic Diseases ───────────────────────────────────────

  async getChronicDiseases(patientId: string) {
    await this.ensurePatientExists(patientId);
    return this.db
      .select()
      .from(patientChronicDiseases)
      .where(eq(patientChronicDiseases.patientId, patientId))
      .orderBy(desc(patientChronicDiseases.createdAt));
  }

  async createChronicDisease(
    patientId: string,
    dto: CreateChronicDiseaseDto,
    recordedBy?: string,
  ) {
    await this.ensurePatientExists(patientId);

    const [disease] = await this.db
      .insert(patientChronicDiseases)
      .values({
        patientId,
        diseaseName: dto.diseaseName,
        icd10Code: dto.icd10Code,
        status: dto.status ?? 'active',
        diagnosedDate: dto.diagnosedDate,
        notes: dto.notes,
        doctorName: dto.doctorName,
        hospital: dto.hospital,
        recordedBy,
      })
      .returning();

    this.logger.log(
      `Chronic disease created for patient ${patientId}: ${dto.diseaseName}`,
    );

    return disease;
  }

  async updateChronicDisease(
    patientId: string,
    diseaseId: string,
    dto: UpdateChronicDiseaseDto,
  ) {
    const [existing] = await this.db
      .select()
      .from(patientChronicDiseases)
      .where(
        and(
          eq(patientChronicDiseases.id, diseaseId),
          eq(patientChronicDiseases.patientId, patientId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('ไม่พบข้อมูลโรคประจำตัว');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) updateData[key] = value;
    }

    const [updated] = await this.db
      .update(patientChronicDiseases)
      .set(updateData)
      .where(eq(patientChronicDiseases.id, diseaseId))
      .returning();

    return updated;
  }

  async deleteChronicDisease(patientId: string, diseaseId: string) {
    const [existing] = await this.db
      .select({ id: patientChronicDiseases.id })
      .from(patientChronicDiseases)
      .where(
        and(
          eq(patientChronicDiseases.id, diseaseId),
          eq(patientChronicDiseases.patientId, patientId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('ไม่พบข้อมูลโรคประจำตัว');
    }

    await this.db
      .delete(patientChronicDiseases)
      .where(eq(patientChronicDiseases.id, diseaseId));
  }

  // ─── Medications ────────────────────────────────────────────

  async getMedications(patientId: string, currentOnly = true) {
    await this.ensurePatientExists(patientId);

    const conditions = [eq(patientMedications.patientId, patientId)];
    if (currentOnly) {
      conditions.push(eq(patientMedications.isCurrent, true));
    }

    return this.db
      .select()
      .from(patientMedications)
      .where(and(...conditions))
      .orderBy(desc(patientMedications.createdAt));
  }

  async createMedication(
    patientId: string,
    dto: CreateMedicationDto,
    recordedBy?: string,
  ) {
    await this.ensurePatientExists(patientId);

    const [medication] = await this.db
      .insert(patientMedications)
      .values({
        patientId,
        drugName: dto.drugName,
        genericName: dto.genericName,
        strength: dto.strength,
        dosageForm: dto.dosageForm,
        sig: dto.sig,
        duration: dto.duration,
        prescribedBy: dto.prescribedBy,
        prescribedAt: dto.prescribedAt,
        isCurrent: dto.isCurrent ?? true,
        recordedBy,
      })
      .returning();

    this.logger.log(
      `Medication created for patient ${patientId}: ${dto.drugName}`,
    );

    return medication;
  }

  async updateMedication(
    patientId: string,
    medicationId: string,
    dto: UpdateMedicationDto,
  ) {
    const [existing] = await this.db
      .select()
      .from(patientMedications)
      .where(
        and(
          eq(patientMedications.id, medicationId),
          eq(patientMedications.patientId, patientId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('ไม่พบข้อมูลยาที่ใช้อยู่');
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    const dtoRecord = dto as Record<string, unknown>;

    if (dtoRecord.isCurrent === false && existing.isCurrent) {
      updateData.isCurrent = false;
      updateData.discontinuedAt = new Date().toISOString().split('T')[0];
      if (dto.discontinuedReason) {
        updateData.discontinuedReason = dto.discontinuedReason;
      }
    }

    for (const [key, value] of Object.entries(dtoRecord)) {
      if (value !== undefined && key !== 'discontinuedReason') {
        updateData[key] = value;
      }
    }

    const [updated] = await this.db
      .update(patientMedications)
      .set(updateData)
      .where(eq(patientMedications.id, medicationId))
      .returning();

    return updated;
  }

  async deleteMedication(patientId: string, medicationId: string) {
    const [existing] = await this.db
      .select({ id: patientMedications.id })
      .from(patientMedications)
      .where(
        and(
          eq(patientMedications.id, medicationId),
          eq(patientMedications.patientId, patientId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('ไม่พบข้อมูลยาที่ใช้อยู่');
    }

    await this.db
      .delete(patientMedications)
      .where(eq(patientMedications.id, medicationId));
  }

  // ─── Staff: Search & Full Profile ──────────────────────────

  async searchPatients(query?: string, province?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const conditions = [isNull(patients.deletedAt)];

    if (query) {
      conditions.push(
        or(
          ilike(patients.firstName, `%${query}%`),
          ilike(patients.lastName, `%${query}%`),
          ilike(patients.patientNo, `%${query}%`),
          ilike(patients.phone, `%${query}%`),
        )!,
      );
    }

    if (province) {
      conditions.push(ilike(patients.province, `%${province}%`));
    }

    const [data, countResult] = await Promise.all([
      this.db
        .select()
        .from(patients)
        .where(and(...conditions))
        .orderBy(desc(patients.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(patients)
        .where(and(...conditions)),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFullProfile(patientId: string) {
    return this.getProfile(patientId);
  }

  async staffUpdatePatient(
    patientId: string,
    dto: UpdatePatientDto,
  ) {
    return this.updateProfile(patientId, dto);
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async ensurePatientExists(patientId: string) {
    const [patient] = await this.db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
      .limit(1);

    if (!patient) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ป่วย');
    }

    return patient;
  }

  private calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }
}
