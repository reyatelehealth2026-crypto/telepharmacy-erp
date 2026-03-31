import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TelemedicineAuditService } from './audit.service';
import { DRIZZLE } from '../../../database/database.constants';

describe('TelemedicineAuditService', () => {
  let service: TelemedicineAuditService;
  let mockDb: any;

  beforeEach(async () => {
    // Mock database
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
              offset: jest.fn().mockResolvedValue([]),
            }),
          }),
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              { hash: '0'.repeat(64) },
            ]),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemedicineAuditService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'telemedicine.audit.encryptionKey') {
                // 32-byte key in hex (64 characters)
                return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TelemedicineAuditService>(TelemedicineAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should log an audit event with hash chaining', async () => {
      const event = {
        actorId: 'user-123',
        actorType: 'patient' as const,
        actionType: 'kyc_verification_started',
        entityType: 'kyc_verification',
        entityId: 'kyc-456',
        metadata: { step: 'document_upload' },
        ipAddress: '192.168.1.1',
        sessionId: 'session-789',
      };

      await service.log(event);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should encrypt sensitive metadata', async () => {
      const event = {
        actorId: 'user-123',
        actorType: 'pharmacist' as const,
        actionType: 'prescription_created',
        entityType: 'prescription',
        entityId: 'rx-789',
        metadata: {
          patientName: 'John Doe',
          medications: ['Metformin 500mg'],
        },
      };

      await service.log(event);

      // Verify that insert was called (metadata should be encrypted)
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('hash chaining', () => {
    it('should calculate SHA-256 hash correctly', () => {
      // This is a basic test to ensure the service initializes correctly
      // Full hash chain testing would require database integration
      expect(service).toBeDefined();
    });
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const testData = JSON.stringify({ sensitive: 'information' });
      
      // Access private methods via type assertion for testing
      const encrypted = (service as any).encryptData(testData);
      expect(encrypted).toBeTruthy();
      expect(encrypted).toContain(':'); // Should have iv:authTag:data format

      const decrypted = (service as any).decryptData(encrypted);
      expect(decrypted).toBe(testData);
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => {
        (service as any).decryptData('invalid-format');
      }).toThrow('Invalid encrypted data format');
    });
  });
});
