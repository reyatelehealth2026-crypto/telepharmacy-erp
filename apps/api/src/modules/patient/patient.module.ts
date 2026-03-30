import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { StaffPatientController } from './staff-patient.controller';
import { PatientService } from './patient.service';

@Module({
  controllers: [PatientController, StaffPatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}
