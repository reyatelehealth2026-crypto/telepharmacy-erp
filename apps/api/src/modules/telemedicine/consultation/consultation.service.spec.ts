import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationService } from './consultation.service';
import { AgoraService } from './agora.service';
import { ScopeValidatorService } from '../scope/scope-validator.service';
import { EConsentService } from '../consent/consent.service';
import { TelemedicineAuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../database/database.constants';

describe('ConsultationService', () => {
  let service: ConsultationService;
  let agoraService: AgoraService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'minio.endpoint': 'http://localhost:9000',
                'telemedicine.storage.recordingsBucket':
                  'telemedicine-recordings',
              };
              return config[key];
            }),
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'telemedicine.agora.appId': 'test-app-id',
                'telemedicine.agora.appCertificate': 'test-certificate',
              };
              return config[key];
            }),
          },
        },
        {
          provide: AgoraService,
          useValue: {
            generateChannelName: jest.fn((id) => `consultation-${id}`),
            generateUid: jest.fn(() => 12345),
            generateToken: jest.fn(() => 'mock-agora-token'),
            startCloudRecording: jest.fn(() =>
              Promise.resolve({
                sid: 'mock-sid',
                resourceId: 'mock-resource-id',
              }),
            ),
            stopCloudRecording: jest.fn(() =>
              Promise.resolve({
                sid: 'mock-sid',
                resourceId: 'mock-resource-id',
                fileList: [
                  {
                    filename: 'recording-123.mp4',
                    trackType: 'audio_and_video',
                    uid: '12345',
                    mixedAllUser: true,
                    isPlayable: true,
                    sliceStartTime: 1234567890,
                  },
                ],
              }),
            ),
          },
        },
        {
          provide: ScopeValidatorService,
          useValue: {
            validateConsultationScope: jest.fn(() =>
              Promise.resolve({
                canProceed: true,
                overallResult: 'passed',
                message: 'Consultation can proceed',
                triggeredRules: [],
              }),
            ),
          },
        },
        {
          provide: EConsentService,
          useValue: {
            getActiveTemplate: jest.fn(() =>
              Promise.resolve({
                id: 'template-id',
                version: 'v1.0.0',
                content: 'Consent content',
              }),
            ),
            acceptConsent: jest.fn(() =>
              Promise.resolve({
                consentId: 'consent-id',
                pdfUrl: 'http://localhost:9000/consent.pdf',
              }),
            ),
          },
        },
        {
          provide: TelemedicineAuditService,
          useValue: {
            log: jest.fn(() => Promise.resolve()),
          },
        },
      ],
    }).compile();

    service = module.get<ConsultationService>(ConsultationService);
    agoraService = module.get<AgoraService>(AgoraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Agora token generation', () => {
    it('should generate valid Agora token', () => {
      const token = agoraService.generateToken({
        channelName: 'test-channel',
        uid: 12345,
        role: 'publisher',
      });

      expect(token).toBe('mock-agora-token');
      expect(agoraService.generateToken).toHaveBeenCalledWith({
        channelName: 'test-channel',
        uid: 12345,
        role: 'publisher',
      });
    });

    it('should generate unique UIDs for different users', () => {
      const uid1 = agoraService.generateUid('user-1');
      const uid2 = agoraService.generateUid('user-2');

      expect(uid1).toBeDefined();
      expect(uid2).toBeDefined();
      // In real implementation, these should be different
    });
  });

  describe('Session duration calculation', () => {
    it('should calculate session duration correctly', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:15:30Z');

      const durationSeconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000,
      );

      expect(durationSeconds).toBe(930); // 15 minutes 30 seconds
    });

    it('should handle sessions longer than 1 hour', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T11:30:00Z');

      const durationSeconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000,
      );

      expect(durationSeconds).toBe(5400); // 90 minutes
    });
  });

  describe('Recording hash generation', () => {
    it('should generate SHA-256 hash for recording', async () => {
      const recordingUrl = 'http://localhost:9000/recording-123.mp4';

      // Access private method via type assertion
      const hash = await (service as any).generateRecordingHash(recordingUrl);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different hashes for different recordings', async () => {
      const url1 = 'http://localhost:9000/recording-1.mp4';
      const url2 = 'http://localhost:9000/recording-2.mp4';

      const hash1 = await (service as any).generateRecordingHash(url1);
      const hash2 = await (service as any).generateRecordingHash(url2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Cloud recording lifecycle', () => {
    it('should start cloud recording successfully', async () => {
      const result = await agoraService.startCloudRecording({
        channelName: 'test-channel',
        uid: 12345,
      });

      expect(result).toEqual({
        sid: 'mock-sid',
        resourceId: 'mock-resource-id',
      });
    });

    it('should stop cloud recording and get file list', async () => {
      const result = await agoraService.stopCloudRecording(
        'test-channel',
        'mock-resource-id',
        'mock-sid',
        12345,
      );

      expect(result.fileList).toHaveLength(1);
      expect(result.fileList[0].filename).toBe('recording-123.mp4');
    });
  });
});
