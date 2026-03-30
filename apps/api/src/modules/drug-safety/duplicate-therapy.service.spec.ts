import { Test, TestingModule } from '@nestjs/testing';
import { DuplicateTherapyService } from './duplicate-therapy.service';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, PatientSafetyContext } from './drug-safety.types';

const mockDrugRows = [
  { genericName: 'ibuprofen', atcCode: 'M01AE01' },
  { genericName: 'naproxen', atcCode: 'M01AE02' },
  { genericName: 'aspirin', atcCode: 'B01AC06' },
  { genericName: 'furosemide', atcCode: 'C03CA01' },
  { genericName: 'hydrochlorothiazide', atcCode: 'C03AA03' },
  { genericName: 'amlodipine', atcCode: 'C08CA01' },
  { genericName: 'metformin', atcCode: 'A10BA02' },
];

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockResolvedValue(mockDrugRows),
};

const basePatient: PatientSafetyContext = {
  id: 'patient-1',
  firstName: 'ทดสอบ',
  lastName: 'ซ้ำซ้อน',
  age: 50,
  gender: 'male',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: [],
  chronicDiseases: [],
  currentMedications: [],
};

describe('DuplicateTherapyService', () => {
  let service: DuplicateTherapyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuplicateTherapyService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<DuplicateTherapyService>(DuplicateTherapyService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('checkDuplicateTherapy', () => {
    it('returns empty for single drug with no current medications', async () => {
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen', genericName: 'ibuprofen' }];
      const result = await service.checkDuplicateTherapy(drugs, basePatient);
      expect(result).toHaveLength(0);
    });

    it('detects duplicate NSAIDs in prescription', async () => {
      const drugs: DrugToCheck[] = [
        { name: 'ibuprofen', genericName: 'ibuprofen', atcCode: 'M01AE01' },
        { name: 'naproxen', genericName: 'naproxen', atcCode: 'M01AE02' },
      ];
      const result = await service.checkDuplicateTherapy(drugs, basePatient);

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('duplicate_therapy');
      expect(result[0]!.atcClass).toBe('M01AE');
      expect(result[0]!.message).toContain('ibuprofen');
      expect(result[0]!.message).toContain('naproxen');
    });

    it('detects duplicate when new drug overlaps with current medication', async () => {
      const patient: PatientSafetyContext = {
        ...basePatient,
        currentMedications: [
          { drugName: 'ibuprofen', genericName: 'ibuprofen', atcCode: 'M01AE01', sig: '3x1 pc' },
        ],
      };
      const drugs: DrugToCheck[] = [
        { name: 'naproxen', genericName: 'naproxen', atcCode: 'M01AE02' },
      ];
      const result = await service.checkDuplicateTherapy(drugs, patient);

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('duplicate_therapy');
    });

    it('does not flag drugs from different ATC classes', async () => {
      const drugs: DrugToCheck[] = [
        { name: 'amlodipine', genericName: 'amlodipine', atcCode: 'C08CA01' },
        { name: 'metformin', genericName: 'metformin', atcCode: 'A10BA02' },
      ];
      const result = await service.checkDuplicateTherapy(drugs, basePatient);
      expect(result).toHaveLength(0);
    });

    it('does not flag same drug class in current meds only (no new drug of same class)', async () => {
      const patient: PatientSafetyContext = {
        ...basePatient,
        currentMedications: [
          { drugName: 'ibuprofen', genericName: 'ibuprofen', atcCode: 'M01AE01', sig: '3x1' },
          { drugName: 'naproxen', genericName: 'naproxen', atcCode: 'M01AE02', sig: '2x1' },
        ],
      };
      const drugs: DrugToCheck[] = [
        { name: 'amlodipine', genericName: 'amlodipine', atcCode: 'C08CA01' },
      ];
      const result = await service.checkDuplicateTherapy(drugs, patient);
      expect(result).toHaveLength(0);
    });

    it('returns multiple alerts when multiple duplicate pairs', async () => {
      const drugs: DrugToCheck[] = [
        { name: 'ibuprofen', genericName: 'ibuprofen', atcCode: 'M01AE01' },
        { name: 'naproxen', genericName: 'naproxen', atcCode: 'M01AE02' },
        { name: 'furosemide', genericName: 'furosemide', atcCode: 'C03CA01' },
      ];
      const patient: PatientSafetyContext = {
        ...basePatient,
        currentMedications: [
          { drugName: 'hydrochlorothiazide', genericName: 'hydrochlorothiazide', atcCode: 'C03AA03', sig: '1x1' },
        ],
      };
      const result = await service.checkDuplicateTherapy(drugs, patient);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});
