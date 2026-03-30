import { Test, TestingModule } from '@nestjs/testing';
import { ContraindicationCheckerService } from './contraindication-checker.service';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck, PatientSafetyContext } from './drug-safety.types';

const mockDrugRows = [
  { id: 'drug-ibuprofen', genericName: 'ibuprofen' },
  { id: 'drug-methotrexate', genericName: 'methotrexate' },
  { id: 'drug-enalapril', genericName: 'enalapril' },
];

const mockContraindicationRows = [
  {
    drugId: 'drug-ibuprofen',
    diseaseName: 'Peptic ulcer disease',
    icd10Pattern: 'K25%',
    severity: 'contraindicated',
    reason: 'NSAIDs ทำลาย gastric mucosal barrier',
    alternative: 'Paracetamol',
  },
  {
    drugId: 'drug-ibuprofen',
    diseaseName: 'Chronic kidney disease',
    icd10Pattern: 'N18%',
    severity: 'major',
    reason: 'NSAIDs ลด renal prostaglandin',
    alternative: 'Paracetamol',
  },
];

const createMockDb = () => {
  const chain = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  // from() returns chain (for .where() chaining) but also resolves for select-all queries
  chain.from.mockReturnValue(chain);
  return chain;
};

let mockDb: ReturnType<typeof createMockDb>;

const basePatient: PatientSafetyContext = {
  id: 'patient-1',
  firstName: 'สมหญิง',
  lastName: 'ทดสอบ',
  age: 45,
  gender: 'female',
  isPregnant: false,
  isBreastfeeding: false,
  allergies: [],
  chronicDiseases: [],
  currentMedications: [],
};

describe('ContraindicationCheckerService', () => {
  let service: ContraindicationCheckerService;

  beforeEach(async () => {
    mockDb = createMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContraindicationCheckerService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<ContraindicationCheckerService>(ContraindicationCheckerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkContraindications', () => {
    it('returns empty array when patient has no chronic diseases', async () => {
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen' }];
      const result = await service.checkContraindications(drugs, basePatient);
      expect(result).toEqual([]);
    });

    it('flags contraindication for ibuprofen + peptic ulcer', async () => {
      // findDrugByName: select().from(drugs) — resolves at from()
      // contraindications: select().from(ci).where() — resolves at where()
      mockDb.from.mockResolvedValueOnce(mockDrugRows);  // findDrugByName
      mockDb.where.mockResolvedValueOnce(mockContraindicationRows); // CI query

      const patient: PatientSafetyContext = {
        ...basePatient,
        chronicDiseases: [
          { diseaseName: 'Peptic ulcer disease', icd10Code: 'K25.3', status: 'active' },
        ],
      };
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen', genericName: 'ibuprofen' }];
      const result = await service.checkContraindications(drugs, patient);

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('contraindication');
      expect(result[0]!.severity).toBe('contraindicated');
      expect(result[0]!.alternative).toBe('Paracetamol');
    });

    it('matches ICD-10 pattern prefix (K25%)', async () => {
      mockDb.from.mockResolvedValueOnce(mockDrugRows);
      mockDb.where.mockResolvedValueOnce(mockContraindicationRows);

      const patient: PatientSafetyContext = {
        ...basePatient,
        chronicDiseases: [
          { diseaseName: 'Gastric ulcer', icd10Code: 'K25.9', status: 'active' },
        ],
      };
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen' }];
      const result = await service.checkContraindications(drugs, patient);

      expect(result).toHaveLength(1);
      expect(result[0]!.diseaseName).toBe('Gastric ulcer');
    });

    it('does not flag when disease does not match', async () => {
      mockDb.from.mockResolvedValueOnce(mockDrugRows);
      mockDb.where.mockResolvedValueOnce(mockContraindicationRows);

      const patient: PatientSafetyContext = {
        ...basePatient,
        chronicDiseases: [
          { diseaseName: 'Hypertension', icd10Code: 'I10', status: 'active' },
        ],
      };
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen' }];
      const result = await service.checkContraindications(drugs, patient);

      expect(result).toHaveLength(0);
    });

    it('handles drug not found in database gracefully', async () => {
      mockDb.from.mockResolvedValueOnce([]); // findDrugByName returns nothing

      const patient: PatientSafetyContext = {
        ...basePatient,
        chronicDiseases: [
          { diseaseName: 'Hypertension', icd10Code: 'I10', status: 'active' },
        ],
      };
      const drugs: DrugToCheck[] = [{ name: 'unknowndrug123' }];
      const result = await service.checkContraindications(drugs, patient);

      expect(result).toHaveLength(0);
    });

    it('matches disease by name substring', async () => {
      mockDb.from.mockResolvedValueOnce(mockDrugRows);  // findDrugByName
      mockDb.where.mockResolvedValueOnce([{             // CI query
          drugId: 'drug-ibuprofen',
          diseaseName: 'Chronic kidney disease',
          icd10Pattern: 'N18%',
          severity: 'major',
          reason: 'NSAIDs reduce GFR',
          alternative: 'Paracetamol',
        }]);

      const patient: PatientSafetyContext = {
        ...basePatient,
        chronicDiseases: [
          { diseaseName: 'Chronic kidney disease stage 3', status: 'active' },
        ],
      };
      const drugs: DrugToCheck[] = [{ name: 'ibuprofen' }];
      const result = await service.checkContraindications(drugs, patient);

      expect(result).toHaveLength(1);
      expect(result[0]!.severity).toBe('major');
    });
  });
});
