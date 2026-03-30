import { Module } from '@nestjs/common';
import { AllergyDetectionService } from './allergy-detection.service';
import { DrugInteractionService } from './drug-interaction.service';
import { ContraindicationCheckerService } from './contraindication-checker.service';
import { DuplicateTherapyService } from './duplicate-therapy.service';
import { DoseRangeValidatorService } from './dose-range-validator.service';
import { SafetyCheckEngineService } from './safety-check-engine.service';

@Module({
  providers: [
    AllergyDetectionService,
    DrugInteractionService,
    ContraindicationCheckerService,
    DuplicateTherapyService,
    DoseRangeValidatorService,
    SafetyCheckEngineService,
  ],
  exports: [
    AllergyDetectionService,
    DrugInteractionService,
    ContraindicationCheckerService,
    DuplicateTherapyService,
    DoseRangeValidatorService,
    SafetyCheckEngineService,
  ],
})
export class DrugSafetyModule {}
