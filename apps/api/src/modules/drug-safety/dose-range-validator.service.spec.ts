import { Test, TestingModule } from '@nestjs/testing';
import { DoseRangeValidatorService } from './dose-range-validator.service';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, PatientSafetyContext } from './drug-safety.types';

const mockDrugRows = [
  {
    id: 'drug-ibuprofen',
    genericName: 'ibuprofen',
    availableStrengths: [{ value: 200, unit: 'mg' }, { value: 400, unit: 'mg' }, { value: 600, unit: 'mg' }],
    pregnancyCategory: 'C',
    breastfeedingSafe: false,
    pediatricSafe: true,
    geriatricSafe: false,
  },
  {
    id: 'drug-warfarin',
    genericName: 'warfarin',
    availableStrengths: [{ value: 1, unit: 'mg' }, { value: 2, unit: 'mg' }, { value: 5, unit: 'mg' }],
    pregnancyCategory: 'X',
    breastfeedingSafe: false,
    pediatricSafe: false,
    geriatricSafe: true,
  },
  {
    id: 'drug-methotrexate',
    genericName: 'methotrexate',
    availableStrengths: [{ value: 2.5, unit: 'mg' }],
    pregnancyCategory: 'X',
    breastfeedingSafe: false,
    pediatricSafe: true,
    geriatricSafe: false,
  },
];

const mockDb = {
  select: jest.fn(),
  from: jest.fn(),
};
mockDb.select.mockReturnValue(mockDb);

const basePatient: PatientSafetyContext = {
  id: 'patient-1',
  firstName: 'ทดสอบ',
  lastName: 'ขนาดยา',
  age: 35,
  gender: 'male',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: [],
  chronicDiseases: [],
  currentMedications: [],
};

describe('DoseRangeValidatorService', () => {
  let service: DoseRangeValidatorService;

  beforeEach(async () => {
    mockDb.select.mockReturnValue(mockDb);
    mockDb.from.mockResolvedValue(mockDrugRows);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoseRangeValidatorService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<DoseRangeValidatorService>(DoseRangeValidatorService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('checkDoses', () => {
    it('returns empty array for drugs with no strength specified', async () => {
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen' }];
      const result = await service.checkDoses(drugs, basePatient);
      expect(result).toHaveLength(0);
    });

    it('returns empty when dose is within range', async () => {
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen', strength: '400mg' }];
      const result = await service.checkDoses(drugs, basePatient);
      expect(result).toHaveLength(0);
    });

    it('warns when dose is above max available strength * 1.5', async () => {
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen', strength: '2000mg' }];
      const result = await service.checkDoses(drugs, basePatient);

      expect(result).toHaveLength(1);
      expect(result[0]!.verdict).toBe('above_range');
      expect(result[0]!.warnings.length).toBeGreaterThan(0);
    });

    it('warns when dose is below min available strength * 0.5', async () => {
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen', strength: '50mg' }];
      const result = await service.checkDoses(drugs, basePatient);

      expect(result).toHaveLength(1);
      expect(result[0]!.verdict).toBe('below_range');
    });

    it('warns for Category X drug in pregnant patient', async () => {
      const pregnantPatient: PatientSafetyContext = {
        ...basePatient,
        isPregnant: true,
        age: 28,
        gender: 'female',
      };
      const drugs: DrugToCheck[] = [{ name: 'warfarin', strength: '2mg' }];
      const result = await service.checkDoses(drugs, pregnantPatient);

      expect(result).toHaveLength(1);
      expect(result[0]!.warnings.some((w) => w.includes('Pregnancy Category X'))).toBe(true);
    });

    it('warns for Category D drug in pregnant patient', async () => {
      mockDb.from.mockResolvedValue([{
        id: 'drug-enalapril',
        genericName: 'enalapril',
        availableStrengths: [{ value: 5, unit: 'mg' }, { value: 10, unit: 'mg' }],
        pregnancyCategory: 'D',
        breastfeedingSafe: false,
        pediatricSafe: false,
        geriatricSafe: true,
      }]);

      const pregnantPatient: PatientSafetyContext = {
        ...basePatient,
        isPregnant: true,
        gender: 'female',
      };
      const drugs: DrugToCheck[] = [{ name: 'enalapril', strength: '5mg' }];
      const result = await service.checkDoses(drugs, pregnantPatient);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const pregnancyWarning = result.find((r) =>
        r.warnings.some((w) => w.includes('Category D') || w.includes('Pregnancy')),
      );
      expect(pregnancyWarning).toBeDefined();
    });

    it('warns for breastfeeding with unsafe drug', async () => {
      const breastfeedingPatient: PatientSafetyContext = {
        ...basePatient,
        isBreastfeeding: true,
        gender: 'female',
      };
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen', strength: '400mg' }];
      const result = await service.checkDoses(drugs, breastfeedingPatient);

      expect(result).toHaveLength(1);
      expect(result[0]!.warnings.some((w) => w.includes('นมบุตร'))).toBe(true);
    });

    it('warns for geriatric-unsafe drug in elderly patient', async () => {
      const elderlyPatient: PatientSafetyContext = {
        ...basePatient,
        age: 70,
      };
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen', strength: '400mg' }];
      const result = await service.checkDoses(drugs, elderlyPatient);

      expect(result).toHaveLength(1);
      expect(result[0]!.warnings.some((w) => w.includes('ผู้สูงอายุ'))).toBe(true);
    });

    it('warns for pediatric-unsafe drug in child patient', async () => {
      const childPatient: PatientSafetyContext = {
        ...basePatient,
        age: 10,
      };
      const drugs: DrugToCheck[] = [{ name: 'warfarin', strength: '1mg' }];
      const result = await service.checkDoses(drugs, childPatient);

      expect(result).toHaveLength(1);
      expect(result[0]!.warnings.some((w) => w.includes('เด็ก'))).toBe(true);
    });

    it('returns no result for unknown drug not in database', async () => {
      mockDb.from.mockResolvedValue([]);
      const drugs: DrugToCheck[] = [{ name: 'unknowndrug123', strength: '100mg' }];
      const result = await service.checkDoses(drugs, basePatient);
      expect(result).toHaveLength(0);
    });
  });
});
