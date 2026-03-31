import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EConsentService } from './consent.service';
import { MinioService } from '../kyc/minio.service';
import { PdfService } from './pdf.service';
import { DRIZZLE } from '../../../database/database.constants';

describe('EConsentService', () => {
  let service: EConsentService;
  let mockDb: any;
  let mockMinioService: any;
  let mockPdfService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    // Mock database
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    // Mock MinIO service
    mockMinioService = {
      upload: jest.fn().mockResolvedValue('https://minio.example.com/file.png'),
    };

    // Mock PDF service
    mockPdfService = {
      generateConsentPdf: jest
        .fn()
        .mockResolvedValue(Buffer.from('fake-pdf-content')),
    };

    // Mock Config service
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'telemedicine.storage.documentsBucket') {
          return 'telemedicine-documents';
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EConsentService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: MinioService, useValue: mockMinioService },
        { provide: PdfService, useValue: mockPdfService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EConsentService>(EConsentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveTemplate', () => {
    it('should return active consent template', async () => {
      const mockTemplate = {
        id: 'template-123',
        version: '1.0.0',
        language: 'th',
        title: 'ข้อตกลงและยินยอม',
        content: '# Content',
        clauses: [],
        isActive: true,
        effectiveFrom: new Date('2025-01-01'),
        effectiveUntil: null,
        createdAt: new Date(),
      };

      mockDb.limit.mockResolvedValue([mockTemplate]);

      const result = await service.getActiveTemplate('th');

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(result.language).toBe('th');
    });

    it('should throw NotFoundException when no active template exists', async () => {
      mockDb.limit.mockResolvedValue([]);

      await expect(service.getActiveTemplate('th')).rejects.toThrow(
        'No active consent template found',
      );
    });
  });

  describe('getConsentStatus', () => {
    it('should return status with no consent', async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await service.getConsentStatus('patient-123');

      expect(result.hasActiveConsent).toBe(false);
      expect(result.requiresNewConsent).toBe(true);
      expect(result.reason).toBe('No consent found');
    });

    it('should return status with active consent', async () => {
      const mockConsent = {
        id: 'consent-123',
        patientId: 'patient-123',
        templateId: 'template-123',
        accepted: true,
        acceptedAt: new Date(),
        withdrawnAt: null,
      };

      const mockTemplate = {
        id: 'template-123',
        isActive: true,
        effectiveUntil: null,
      };

      mockDb.limit
        .mockResolvedValueOnce([mockConsent]) // First call for consent
        .mockResolvedValueOnce([mockTemplate]); // Second call for template

      const result = await service.getConsentStatus('patient-123');

      expect(result.hasActiveConsent).toBe(true);
      expect(result.requiresNewConsent).toBe(false);
    });
  });

  describe('acceptConsent', () => {
    it('should accept consent and generate PDF', async () => {
      const mockTemplate = {
        id: 'template-123',
        version: '1.0.0',
        isActive: true,
      };

      const mockConsent = {
        id: 'consent-123',
        patientId: 'patient-123',
        templateId: 'template-123',
        accepted: true,
      };

      mockDb.limit.mockResolvedValue([mockTemplate]);
      mockDb.returning.mockResolvedValue([mockConsent]);

      const dto = {
        templateId: 'template-123',
        signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        scrolledToEnd: true,
        timeSpentSeconds: 60,
      };

      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        deviceId: 'device-123',
      };

      const result = await service.acceptConsent('patient-123', dto, metadata);

      expect(result.success).toBe(true);
      expect(result.consentId).toBe('consent-123');
      expect(mockMinioService.upload).toHaveBeenCalledTimes(2); // Signature + PDF
      expect(mockPdfService.generateConsentPdf).toHaveBeenCalled();
    });

    it('should reject if patient did not scroll to end', async () => {
      const mockTemplate = {
        id: 'template-123',
        isActive: true,
      };

      mockDb.limit.mockResolvedValue([mockTemplate]);

      const dto = {
        templateId: 'template-123',
        signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        scrolledToEnd: false, // Not scrolled
        timeSpentSeconds: 60,
      };

      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        deviceId: 'device-123',
      };

      await expect(
        service.acceptConsent('patient-123', dto, metadata),
      ).rejects.toThrow('Patient must scroll to the end');
    });

    it('should reject if time spent is less than 30 seconds', async () => {
      const mockTemplate = {
        id: 'template-123',
        isActive: true,
      };

      mockDb.limit.mockResolvedValue([mockTemplate]);

      const dto = {
        templateId: 'template-123',
        signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        scrolledToEnd: true,
        timeSpentSeconds: 20, // Too short
      };

      const metadata = {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        deviceId: 'device-123',
      };

      await expect(
        service.acceptConsent('patient-123', dto, metadata),
      ).rejects.toThrow('Patient must spend at least 30 seconds');
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw consent successfully', async () => {
      const mockConsent = {
        id: 'consent-123',
        patientId: 'patient-123',
        withdrawnAt: null,
      };

      mockDb.limit.mockResolvedValue([mockConsent]);

      const dto = {
        consentId: 'consent-123',
        reason: 'I no longer wish to use telemedicine services',
      };

      await service.withdrawConsent('patient-123', dto);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({
          withdrawnAt: expect.any(Date),
          withdrawalReason: dto.reason,
        }),
      );
    });

    it('should throw error if consent already withdrawn', async () => {
      const mockConsent = {
        id: 'consent-123',
        patientId: 'patient-123',
        withdrawnAt: new Date(), // Already withdrawn
      };

      mockDb.limit.mockResolvedValue([mockConsent]);

      const dto = {
        consentId: 'consent-123',
        reason: 'Test reason',
      };

      await expect(
        service.withdrawConsent('patient-123', dto),
      ).rejects.toThrow('Consent already withdrawn');
    });
  });

  describe('createTemplate', () => {
    it('should create new consent template', async () => {
      const mockTemplate = {
        id: 'template-123',
        version: '1.1.0',
        language: 'th',
      };

      mockDb.limit.mockResolvedValue([]); // No existing template
      mockDb.returning.mockResolvedValue([mockTemplate]);

      const dto = {
        version: '1.1.0',
        language: 'th',
        title: 'New Template',
        content: '# Content',
        clauses: [],
        effectiveFrom: '2025-02-01T00:00:00Z',
      };

      const result = await service.createTemplate(dto, 'admin-123');

      expect(result.version).toBe('1.1.0');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw error if version already exists', async () => {
      const existingTemplate = {
        id: 'template-123',
        version: '1.0.0',
      };

      mockDb.limit.mockResolvedValue([existingTemplate]);

      const dto = {
        version: '1.0.0', // Duplicate version
        language: 'th',
        title: 'New Template',
        content: '# Content',
        clauses: [],
        effectiveFrom: '2025-02-01T00:00:00Z',
      };

      await expect(
        service.createTemplate(dto, 'admin-123'),
      ).rejects.toThrow('already exists');
    });
  });
});
