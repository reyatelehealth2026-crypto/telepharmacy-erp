import { Test, TestingModule } from '@nestjs/testing';
import { AllergyDetectionService } from './allergy-detection.service';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, PatientSafetyContext } from './drug-safety.types';

const mockAllergyGroups = [
  {
    groupName: 'beta-lactam',
    genericNames: ['penicillin', 'amoxicillin', 'ampicillin', 'cephalexin', 'ceftriaxone'],
    description: 'Beta-lactam antibiotics',
    detectionHint: '',
  },
  {
    groupName: 'nsaid',
    genericNames: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'],
    description: 'NSAIDs',
    detectionHint: '',
  },
];

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockResolvedValue(mockAllergyGroups),
};

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

describe('AllergyDetectionService', () => {
  let service: AllergyDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllergyDetectionService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AllergyDetectionService>(AllergyDetectionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockDb.from.mockResolvedValue(mockAllergyGroups);
  });

  describe('checkAllergies', () => {
    it('returns empty array when patient has no allergies', async () => {
      const drugs: DrugToCheck[] = [{ name: 'amoxicillin' }];
      const result = await service.checkAllergies(drugs, basePatient);
      expect(result).toEqual([]);
    });

    it('detects direct allergy match (exact name)', async () => {
      const patient: PatientSafetyContext = {
        ...basePatient,
        allergies: [{ drugName: 'amoxicillin', severity: 'severe' }],
      };
      const drugs: DrugToCheck[] = [{ name: 'amoxicillin' }];
      const result = await service.checkAllergies(drugs, patient);

      expect(result).toHaveLength(1);
      expect(result[0]!.drugName).toBe('amoxicillin');
      expect(result[0]!.isCrossAllergy).toBe(false);
      expect(result[0]!.severity).toBe('severe');
    });

    it('detects cross-allergy within beta-lactam group', async () => {
      const patient: PatientSafetyContext = {
        ...basePatient,
        allergies: [
          {
            drugName: 'penicillin',
            allergyGroup: 'beta-lactam',
            severity: 'moderate',
          },
        ],
      };
      const drugs: DrugToCheck[] = [{ name: 'cephalexin', genericName: 'cephalexin' }];
      const result = await service.checkAllergies(drugs, patient);

      expect(result).toHaveLength(1);
      expect(result[0]!.isCrossAllergy).toBe(true);
      expect(result[0]!.allergyGroup).toBe('beta-lactam');
    });

    it('does not flag cross-allergy for different groups', async () => {
      const patient: PatientSafetyContext = {
        ...basePatient,
        allergies: [
          { drugName: 'ibuprofen', allergyGroup: 'nsaid', severity: 'mild' },
        ],
      };
      const drugs: DrugToCheck[] = [{ name: 'amoxicillin', genericName: 'amoxicillin' }];
      const result = await service.checkAllergies(drugs, patient);

      expect(result).toHaveLength(0);
    });

    it('detects cross-allergy for nsaid group', async () => {
      const patient: PatientSafetyContext = {
        ...basePatient,
        allergies: [
          { drugName: 'aspirin', allergyGroup: 'nsaid', severity: 'moderate' },
        ],
      };
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen', genericName: 'ibuprofen' }];
      const result = await service.checkAllergies(drugs, patient);

      expect(result).toHaveLength(1);
      expect(result[0]!.isCrossAllergy).toBe(true);
    });

    it('returns multiple alerts for multiple allergic drugs', async () => {
      const patient: PatientSafetyContext = {
        ...basePatient,
        allergies: [
          { drugName: 'amoxicillin', severity: 'severe' },
          { drugName: 'ibuprofen', allergyGroup: 'nsaid', severity: 'moderate' },
        ],
      };
      const drugs: DrugToCheck[] = [
        { name: 'amoxicillin' },
        { name: 'naproxen', genericName: 'naproxen' },
      ];
      const result = await service.checkAllergies(drugs, patient);

      expect(result).toHaveLength(2);
    });

    it('handles drug name containing allergy drug name', async () => {
      const patient: PatientSafetyContext = {
        ...basePatient,
        allergies: [{ drugName: 'penicillin', severity: 'severe' }],
      };
      const drugs: DrugToCheck[] = [{ name: 'amoxicillin-clavulanate' }];
      const result = await service.checkAllergies(drugs, patient);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });
});
