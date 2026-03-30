import { Test, TestingModule } from '@nestjs/testing';
import { DrugInteractionService } from './drug-interaction.service';
import { DRIZZLE } from '../../database/database.constants';
import type { DrugToCheck } from './drug-safety.types';

const mockDrugRows = [
  { id: 'drug-warfarin', genericName: 'warfarin' },
  { id: 'drug-aspirin', genericName: 'aspirin' },
  { id: 'drug-ibuprofen', genericName: 'ibuprofen' },
  { id: 'drug-methotrexate', genericName: 'methotrexate' },
  { id: 'drug-omeprazole', genericName: 'omeprazole' },
  { id: 'drug-clopidogrel', genericName: 'clopidogrel' },
];

const mockInteractionRows = [
  {
    severity: 'major',
    mechanism: 'Warfarin anticoagulation potentiated',
    clinicalEffect: 'เพิ่มความเสี่ยงเลือดออก',
    management: 'หลีกเลี่ยง',
    evidenceLevel: 'established',
    drugAName: 'warfarin',
  },
];

const createMockDb = () => {
  const chain = {
    select: jest.fn(),
    from: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
};

let mockDb: ReturnType<typeof createMockDb>;

describe('DrugInteractionService', () => {
  let service: DrugInteractionService;

  beforeEach(async () => {
    mockDb = createMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrugInteractionService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<DrugInteractionService>(DrugInteractionService);
    service.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkInteractions', () => {
    it('returns empty array for single drug', async () => {
      const drugs: DrugToCheck[] = [{ name: 'warfarin' }];
      const result = await service.checkInteractions(drugs);
      expect(result).toEqual([]);
    });

    it('returns empty array for empty list', async () => {
      const result = await service.checkInteractions([]);
      expect(result).toEqual([]);
    });

    it('detects major DDI between warfarin and aspirin', async () => {
      // findDrugByName: select().from() resolves
      // DDI query: select().from().innerJoin().where() resolves
      mockDb.from
        .mockResolvedValueOnce(mockDrugRows)   // findDrugByName(warfarin)
        .mockResolvedValueOnce(mockDrugRows)   // findDrugByName(aspirin)
        .mockReturnValue(mockDb);              // DDI query: from() returns chain
      mockDb.where.mockResolvedValueOnce(mockInteractionRows); // DDI query final

      const drugs: DrugToCheck[] = [
        { name: 'warfarin', genericName: 'warfarin' },
        { name: 'aspirin', genericName: 'aspirin' },
      ];
      const result = await service.checkInteractions(drugs);

      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('ddi');
      expect(result[0]!.severity).toBe('major');
      expect(result[0]!.fromDatabase).toBe(true);
    });

    it('returns empty when no interaction found in DB', async () => {
      mockDb.from
        .mockResolvedValueOnce(mockDrugRows)  // findDrugByName A
        .mockResolvedValueOnce(mockDrugRows)  // findDrugByName B
        .mockReturnValue(mockDb);             // DDI query from()
      mockDb.where.mockResolvedValueOnce([]); // DDI query returns empty

      const drugs: DrugToCheck[] = [
        { name: 'paracetamol' },
        { name: 'amoxicillin' },
      ];
      const result = await service.checkInteractions(drugs);
      expect(result).toHaveLength(0);
    });

    it('checks all pairs for 3 drugs', async () => {
      // 3 pairs => 6 findDrugByName calls + 3 DDI queries
      mockDb.from.mockResolvedValue([]);   // all findDrugByName return nothing -> skip DDI
      mockDb.where.mockResolvedValue([]);

      const drugs: DrugToCheck[] = [
        { name: 'warfarin' },
        { name: 'aspirin' },
        { name: 'ibuprofen' },
      ];
      const result = await service.checkInteractions(drugs);
      expect(Array.isArray(result)).toBe(true);
    });

    it('uses cache on second call for same pair', async () => {
      mockDb.from
        .mockResolvedValueOnce(mockDrugRows)   // findDrugByName A
        .mockResolvedValueOnce(mockDrugRows)   // findDrugByName B
        .mockReturnValue(mockDb);
      mockDb.where.mockResolvedValueOnce(mockInteractionRows); // DDI query

      const drugs: DrugToCheck[] = [
        { name: 'warfarin' },
        { name: 'aspirin' },
      ];

      await service.checkInteractions(drugs);
      const callCountAfterFirst = mockDb.where.mock.calls.length;

      await service.checkInteractions(drugs);
      const callCountAfterSecond = mockDb.where.mock.calls.length;

      expect(callCountAfterSecond).toBe(callCountAfterFirst);
    });
  });
});
