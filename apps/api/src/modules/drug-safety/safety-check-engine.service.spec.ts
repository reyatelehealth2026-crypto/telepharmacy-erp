import { Test, TestingModule } from '@nestjs/testing';
import { SafetyCheckEngineService } from './safety-check-engine.service';
import { AllergyDetectionService } from './allergy-detection.service';
import { DrugInteractionService } from './drug-interaction.service';
import { ContraindicationCheckerService } from './contraindication-checker.service';
import { DuplicateTherapyService } from './duplicate-therapy.service';
import { DoseRangeValidatorService } from './dose-range-validator.service';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, PatientSafetyContext, SafetyCheckSummary } from './drug-safety.types';

const basePatient: PatientSafetyContext = {
  id: 'patient-1',
  firstName: 'สมชาย',
  lastName: 'ทดสอบ',
  age: 35,
  gender: 'male',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: [],
  chronicDiseases: [],
  currentMedications: [],
};

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockResolvedValue([]),
};

describe('SafetyCheckEngineService', () => {
  let engine: SafetyCheckEngineService;
  let allergyDetection: jest.Mocked<AllergyDetectionService>;
  let ddiChecker: jest.Mocked<DrugInteractionService>;
  let contraindicationChecker: jest.Mocked<ContraindicationCheckerService>;
  let duplicateTherapy: jest.Mocked<DuplicateTherapyService>;
  let doseValidator: jest.Mocked<DoseRangeValidatorService>;

  beforeEach(async () => {
    const mockAllergyDetection = {
      checkAllergies: jest.fn().mockResolvedValue([]),
    };
    const mockDdiChecker = {
      checkInteractions: jest.fn().mockResolvedValue([]),
    };
    const mockContraindicationChecker = {
      checkContraindications: jest.fn().mockResolvedValue([]),
    };
    const mockDuplicateTherapy = {
      checkDuplicateTherapy: jest.fn().mockResolvedValue([]),
    };
    const mockDoseValidator = {
      checkDoses: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SafetyCheckEngineService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: AllergyDetectionService, useValue: mockAllergyDetection },
        { provide: DrugInteractionService, useValue: mockDdiChecker },
        { provide: ContraindicationCheckerService, useValue: mockContraindicationChecker },
        { provide: DuplicateTherapyService, useValue: mockDuplicateTherapy },
        { provide: DoseRangeValidatorService, useValue: mockDoseValidator },
      ],
    }).compile();

    engine = module.get<SafetyCheckEngineService>(SafetyCheckEngineService);
    allergyDetection = module.get(AllergyDetectionService);
    ddiChecker = module.get(DrugInteractionService);
    contraindicationChecker = module.get(ContraindicationCheckerService);
    duplicateTherapy = module.get(DuplicateTherapyService);
    doseValidator = module.get(DoseRangeValidatorService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('runChecks', () => {
    it('returns low risk with no issues when all checks pass', async () => {
      const drugs: DrugToCheck[] = [{ name: 'paracetamol', strength: '500mg' }];
      const result = await engine.runChecks(drugs, basePatient);

      expect(result.hasIssues).toBe(false);
      expect(result.overallRisk).toBe('low');
      expect(result.summary).toContain('ผ่านการตรวจสอบ');
      expect(result.issues).toHaveLength(0);
    });

    it('returns critical risk when allergy with severe severity', async () => {
      allergyDetection.checkAllergies.mockResolvedValue([
        {
          type: 'allergy',
          drugName: 'amoxicillin',
          allergyDrug: 'penicillin',
          allergyGroup: 'beta-lactam',
          severity: 'severe',
          isCrossAllergy: true,
          message: 'แพ้ยากลุ่ม beta-lactam',
        },
      ]);

      const drugs: DrugToCheck[] = [{ name: 'amoxicillin' }];
      const result = await engine.runChecks(drugs, basePatient);

      expect(result.hasIssues).toBe(true);
      expect(result.overallRisk).toBe('critical');
      expect(result.allergyAlerts).toHaveLength(1);
      expect(result.summary).toContain('แพ้ยา 1 รายการ');
    });

    it('returns critical risk for contraindicated DDI', async () => {
      ddiChecker.checkInteractions.mockResolvedValue([
        {
          type: 'ddi',
          drugA: 'warfarin',
          drugB: 'aspirin',
          severity: 'contraindicated',
          mechanism: 'anticoagulation potentiated',
          clinicalEffect: 'เลือดออก',
          management: 'หลีกเลี่ยง',
          fromDatabase: true,
        },
      ]);

      const drugs: DrugToCheck[] = [
        { name: 'warfarin' },
        { name: 'aspirin' },
      ];
      const result = await engine.runChecks(drugs, basePatient);

      expect(result.hasIssues).toBe(true);
      expect(result.overallRisk).toBe('critical');
      expect(result.ddiAlerts).toHaveLength(1);
    });

    it('returns high risk for major DDI', async () => {
      ddiChecker.checkInteractions.mockResolvedValue([
        {
          type: 'ddi',
          drugA: 'warfarin',
          drugB: 'ibuprofen',
          severity: 'major',
          mechanism: 'NSAIDs + warfarin',
          clinicalEffect: 'เลือดออก',
          management: 'หลีกเลี่ยง',
          fromDatabase: true,
        },
      ]);

      const drugs: DrugToCheck[] = [{ name: 'warfarin' }, { name: 'ibuprofen' }];
      const result = await engine.runChecks(drugs, basePatient);

      expect(result.hasIssues).toBe(true);
      expect(result.overallRisk).toBe('high');
    });

    it('aggregates all issue types correctly', async () => {
      allergyDetection.checkAllergies.mockResolvedValue([
        { type: 'allergy', drugName: 'amoxicillin', allergyDrug: 'penicillin', severity: 'moderate', isCrossAllergy: true, message: 'cross-allergy' },
      ]);
      ddiChecker.checkInteractions.mockResolvedValue([
        { type: 'ddi', drugA: 'drug-a', drugB: 'drug-b', severity: 'moderate', mechanism: 'x', clinicalEffect: 'y', management: 'z', fromDatabase: true },
      ]);
      duplicateTherapy.checkDuplicateTherapy.mockResolvedValue([
        { type: 'duplicate_therapy', drugA: 'drug-c', drugB: 'drug-d', atcClass: 'N02B', message: 'duplicate' },
      ]);

      const result = await engine.runChecks([{ name: 'amoxicillin' }], basePatient);

      expect(result.allergyAlerts).toHaveLength(1);
      expect(result.ddiAlerts).toHaveLength(1);
      expect(result.duplicateTherapy).toHaveLength(1);
      expect(result.issues).toHaveLength(3);
      expect(result.hasIssues).toBe(true);
    });

    it('summary lists all issue categories', async () => {
      allergyDetection.checkAllergies.mockResolvedValue([
        { type: 'allergy', drugName: 'a', allergyDrug: 'b', severity: 'moderate', isCrossAllergy: false, message: '' },
      ]);
      ddiChecker.checkInteractions.mockResolvedValue([
        { type: 'ddi', drugA: 'x', drugB: 'y', severity: 'moderate', mechanism: '', clinicalEffect: '', management: '', fromDatabase: true },
      ]);

      const result = await engine.runChecks([{ name: 'test-drug' }], basePatient);

      expect(result.summary).toContain('แพ้ยา');
      expect(result.summary).toContain('ปฏิกิริยา');
    });

    it('calls all sub-services', async () => {
      const drugs: DrugToCheck[] = [{ name: 'paracetamol' }];
      await engine.runChecks(drugs, basePatient);

      expect(allergyDetection.checkAllergies).toHaveBeenCalledTimes(1);
      expect(ddiChecker.checkInteractions).toHaveBeenCalledTimes(1);
      expect(contraindicationChecker.checkContraindications).toHaveBeenCalledTimes(1);
      expect(duplicateTherapy.checkDuplicateTherapy).toHaveBeenCalledTimes(1);
      expect(doseValidator.checkDoses).toHaveBeenCalledTimes(1);
    });
  });

  describe('persistSafetyChecks', () => {
    it('inserts a pass record when no issues', async () => {
      const cleanSummary: SafetyCheckSummary = {
        hasIssues: false,
        overallRisk: 'low',
        issues: [],
        allergyAlerts: [],
        ddiAlerts: [],
        contraindications: [],
        duplicateTherapy: [],
        doseWarnings: [],
        summary: 'ผ่าน',
      };

      await engine.persistSafetyChecks('item-1', cleanSummary);
      expect(mockDb.values).toHaveBeenCalled();
    });

    it('inserts rows for each alert type', async () => {
      const summaryWithIssues: SafetyCheckSummary = {
        hasIssues: true,
        overallRisk: 'high',
        issues: [],
        allergyAlerts: [
          { type: 'allergy', drugName: 'amoxicillin', allergyDrug: 'penicillin', severity: 'severe', isCrossAllergy: false, message: 'alert' },
        ],
        ddiAlerts: [
          { type: 'ddi', drugA: 'w', drugB: 'a', severity: 'major', mechanism: 'x', clinicalEffect: 'y', management: 'z', fromDatabase: true },
        ],
        contraindications: [],
        duplicateTherapy: [],
        doseWarnings: [],
        summary: 'พบปัญหา',
      };

      await engine.persistSafetyChecks('item-1', summaryWithIssues);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
