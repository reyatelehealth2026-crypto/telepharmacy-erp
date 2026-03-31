import { Test, TestingModule } from '@nestjs/testing';
import { ScopeValidatorService } from './scope-validator.service';
import { TelemedicineAuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';

describe('ScopeValidatorService', () => {
  let service: ScopeValidatorService;
  let mockDb: any;
  let mockAuditService: any;

  beforeEach(async () => {
    // Mock database
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    // Mock audit service
    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopeValidatorService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn(),
          },
        },
        {
          provide: TelemedicineAuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ScopeValidatorService>(ScopeValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateConsultationScope', () => {
    it('should pass validation for valid follow-up consultation', async () => {
      // Mock active rules (empty for this test)
      mockDb.returning.mockResolvedValueOnce([]);

      // Mock patient history (follow-up patient)
      mockDb.returning.mockResolvedValueOnce([
        {
          count: 5,
          lastDate: new Date('2024-01-15'),
        },
      ]);

      // Mock validation result insert
      mockDb.returning.mockResolvedValueOnce([
        {
          id: 'validation-id-123',
          consultationId: 'consultation-id-123',
          overallResult: 'passed',
        },
      ]);

      const dto = {
        consultationId: 'consultation-id-123',
        patientId: 'patient-id-123',
        consultationType: 'follow_up_chronic' as const,
        chiefComplaint: 'ขอยาความดันโลหิตสูง',
        symptoms: ['ปวดหัวเล็กน้อย'],
        requestedMedications: [
          {
            drugName: 'Amlodipine',
            dosage: '5mg',
          },
        ],
      };

      const result = await service.validateConsultationScope(
        dto,
        'patient-id-123',
        'patient',
      );

      expect(result.overallResult).toBe('passed');
      expect(result.canProceed).toBe(true);
      expect(result.requiresPharmacistReview).toBe(false);
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should reject consultation with prohibited symptoms', async () => {
      // Mock active rules with chest pain rule
      mockDb.returning.mockResolvedValueOnce([
        {
          id: 'rule-1',
          ruleType: 'symptom_check',
          ruleName: 'Prohibit Chest Pain',
          condition: {
            prohibitedSymptoms: ['เจ็บหน้าอก', 'chest pain'],
          },
          action: 'reject',
          severity: 'critical',
          message: 'อาการเจ็บหน้าอกต้องไปโรงพยาบาล',
          priority: 5,
          isActive: true,
        },
      ]);

      // Mock patient history
      mockDb.returning.mockResolvedValueOnce([
        {
          count: 3,
          lastDate: new Date('2024-01-15'),
        },
      ]);

      // Mock validation result insert
      mockDb.returning.mockResolvedValueOnce([
        {
          id: 'validation-id-456',
          consultationId: 'consultation-id-456',
          overallResult: 'rejected',
        },
      ]);

      const dto = {
        consultationId: 'consultation-id-456',
        patientId: 'patient-id-456',
        consultationType: 'general_health' as const,
        chiefComplaint: 'เจ็บหน้าอก',
        symptoms: ['เจ็บหน้าอก', 'หายใจลำบาก'],
        requestedMedications: [],
      };

      const result = await service.validateConsultationScope(
        dto,
        'patient-id-456',
        'patient',
      );

      expect(result.overallResult).toBe('rejected');
      expect(result.canProceed).toBe(false);
      expect(result.triggeredRules.length).toBeGreaterThan(0);
      expect(result.triggeredRules[0].action).toBe('reject');
    });

    it('should reject consultation requesting controlled substances', async () => {
      // Mock active rules with controlled substance rule
      mockDb.returning.mockResolvedValueOnce([
        {
          id: 'rule-2',
          ruleType: 'medication_check',
          ruleName: 'Prohibit Controlled Substances',
          condition: {
            controlledSubstances: ['tramadol', 'alprazolam'],
          },
          action: 'reject',
          severity: 'critical',
          message: 'ไม่สามารถจ่ายยาเสพติดให้โทษได้',
          priority: 1,
          isActive: true,
        },
      ]);

      // Mock patient history
      mockDb.returning.mockResolvedValueOnce([
        {
          count: 2,
          lastDate: new Date('2024-01-10'),
        },
      ]);

      // Mock validation result insert
      mockDb.returning.mockResolvedValueOnce([
        {
          id: 'validation-id-789',
          consultationId: 'consultation-id-789',
          overallResult: 'rejected',
        },
      ]);

      const dto = {
        consultationId: 'consultation-id-789',
        patientId: 'patient-id-789',
        consultationType: 'medication_refill' as const,
        chiefComplaint: 'ขอยาแก้ปวด',
        symptoms: ['ปวดหลัง'],
        requestedMedications: [
          {
            drugName: 'Tramadol',
            dosage: '50mg',
          },
        ],
      };

      const result = await service.validateConsultationScope(
        dto,
        'patient-id-789',
        'patient',
      );

      expect(result.overallResult).toBe('rejected');
      expect(result.canProceed).toBe(false);
      expect(result.triggeredRules[0].ruleType).toBe('medication_check');
    });

    it('should flag new patient with acute symptoms for review', async () => {
      // Mock active rules with patient type rule
      mockDb.returning.mockResolvedValueOnce([
        {
          id: 'rule-3',
          ruleType: 'patient_type_check',
          ruleName: 'Reject New Patient with Acute Condition',
          condition: {
            rejectNewPatientWithAcute: true,
          },
          action: 'reject',
          severity: 'high',
          message: 'ผู้ป่วยใหม่ต้องพบแพทย์ก่อน',
          priority: 20,
          isActive: true,
        },
      ]);

      // Mock patient history (new patient)
      mockDb.returning.mockResolvedValueOnce([
        {
          count: 0,
          lastDate: null,
        },
      ]);

      // Mock validation result insert
      mockDb.returning.mockResolvedValueOnce([
        {
          id: 'validation-id-101',
          consultationId: 'consultation-id-101',
          overallResult: 'rejected',
        },
      ]);

      const dto = {
        consultationId: 'consultation-id-101',
        patientId: 'patient-id-101',
        consultationType: 'minor_ailment' as const,
        chiefComplaint: 'ปวดท้อง',
        symptoms: ['ปวดท้องมาก', 'ไข้'],
        requestedMedications: [],
      };

      const result = await service.validateConsultationScope(
        dto,
        'patient-id-101',
        'patient',
      );

      expect(result.overallResult).toBe('rejected');
      expect(result.patientType).toBe('new_patient');
    });
  });

  describe('overrideValidation', () => {
    it('should allow pharmacist to override validation with justification', async () => {
      const validationId = 'validation-id-123';
      const pharmacistId = 'pharmacist-id-456';
      const reason =
        'ผู้ป่วยมีประวัติการรักษาต่อเนื่องมา 2 ปี มีข้อมูล Lab ล่าสุดเมื่อ 8 เดือนที่แล้ว อาการคงที่ ไม่มีภาวะแทรกซ้อน';

      mockDb.returning.mockResolvedValueOnce([
        {
          id: validationId,
          overrideBy: pharmacistId,
          overrideReason: reason,
        },
      ]);

      await service.overrideValidation(validationId, pharmacistId, reason);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'scope_validation_override',
          actorId: pharmacistId,
        }),
      );
    });

    it('should reject override with insufficient justification', async () => {
      const validationId = 'validation-id-123';
      const pharmacistId = 'pharmacist-id-456';
      const shortReason = 'OK'; // Too short

      await expect(
        service.overrideValidation(validationId, pharmacistId, shortReason),
      ).rejects.toThrow('Override reason must be at least 50 characters');
    });
  });

  describe('getValidationHistory', () => {
    it('should return validation history for a consultation', async () => {
      const consultationId = 'consultation-id-123';

      mockDb.returning.mockResolvedValueOnce([
        {
          id: 'validation-1',
          consultationId,
          overallResult: 'rejected',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'validation-2',
          consultationId,
          overallResult: 'passed',
          createdAt: new Date('2024-01-15T10:30:00Z'),
          overrideBy: 'pharmacist-id-456',
        },
      ]);

      const history = await service.getValidationHistory(consultationId);

      expect(history).toHaveLength(2);
      expect(history[0].overallResult).toBe('rejected');
      expect(history[1].overrideBy).toBe('pharmacist-id-456');
    });
  });
});
