import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentationGeneratorService } from './documentation-generator.service';
import { DRIZZLE } from '../../../database/database.constants';
import * as fs from 'fs';
import * as path from 'path';

describe('DocumentationGeneratorService', () => {
  let service: DocumentationGeneratorService;
  let mockDb: any;

  const mockFacilityId = '123e4567-e89b-12d3-a456-426614174000';

  const mockFacility = {
    id: mockFacilityId,
    facilityName: 'LINE Telepharmacy Clinic',
    facilityType: 'pharmacy',
    address: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย',
    province: 'กรุงเทพมหานคร',
    district: 'คลองเตย',
    subdistrict: 'คลองเตย',
    postalCode: '10110',
    phoneNumber: '02-123-4567',
    email: 'info@telepharmacy.com',
    emergencyContact: '02-123-4568',
    consultationRoomPhotos: ['photo1.jpg', 'photo2.jpg'],
    roomDimensions: { length: 4, width: 3, height: 2.5 },
    privacyMeasures: 'ห้องปิด มีม่านกั้น',
    lightingDescription: 'แสงสว่างเพียงพอ',
    soundproofingDescription: 'กันเสียงดี',
    operatingHours: {
      monday: '09:00-18:00',
      tuesday: '09:00-18:00',
    },
    telemedicineHours: {
      monday: '09:00-17:00',
      tuesday: '09:00-17:00',
    },
  };

  const mockStaff = [
    {
      qualification: {
        licenseNumber: 'PH-12345',
        licenseType: 'pharmacist',
        licenseIssueDate: new Date('2020-01-01'),
        licenseExpiryDate: new Date('2025-12-31'),
        degree: 'Bachelor of Pharmacy',
        university: 'Chulalongkorn University',
        graduationYear: 2019,
        specializations: ['Clinical Pharmacy'],
        certifications: ['Telemedicine Certificate'],
        telemedicineTrainingCompleted: true,
        trainingDate: new Date('2023-06-01'),
        workSchedule: { monday: '09:00-18:00' },
        telemedicineShifts: { monday: '09:00-17:00' },
      },
      staff: {
        firstName: 'สมชาย',
        lastName: 'ใจดี',
      },
    },
  ];

  const mockTechnicalSpecs = {
    platformName: 'Agora.io',
    platformVersion: '4.0.0',
    encryptionProtocol: 'TLS 1.3, AES-256',
    videoResolution: '720p',
    videoFrameRate: 30,
    audioBitrate: 128,
    videoBitrate: 2000,
    recordingEnabled: true,
    recordingFormat: 'MP4',
    recordingStorage: 'MinIO Thailand',
    recordingRetentionYears: 10,
    dataEncryptionAtRest: 'AES-256',
    dataEncryptionInTransit: 'TLS 1.3',
    accessControlMethod: 'JWT + MFA',
    backupFrequency: 'Daily',
    backupLocation: 'Bangkok, Thailand',
    minimumBandwidthKbps: 500,
    recommendedBandwidthKbps: 2000,
    internetProvider: 'True Internet',
    backupInternetProvider: 'AIS Fibre',
    dataCenter: 'AWS Bangkok',
    dataCenterLocation: 'Bangkok, Thailand',
    dataResidencyCompliant: true,
    uptimePercentage: '99.99',
  };

  const mockEquipment = [
    {
      equipmentType: 'camera',
      brand: 'Logitech',
      model: 'C920',
      serialNumber: 'SN-12345',
      specifications: { resolution: '1080p' },
      purchaseDate: new Date('2023-01-01'),
      warrantyExpiry: new Date('2025-01-01'),
      status: 'active',
      lastMaintenanceDate: new Date('2024-01-01'),
      nextMaintenanceDate: new Date('2024-07-01'),
    },
  ];

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentationGeneratorService,
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
      ],
    }).compile();

    service = module.get<DocumentationGeneratorService>(
      DocumentationGeneratorService,
    );
  });

  afterEach(() => {
    // Clean up generated test files
    const uploadDir = path.join(process.cwd(), 'uploads', 'compliance');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach((file) => {
        if (file.startsWith('sp16-application-')) {
          fs.unlinkSync(path.join(uploadDir, file));
        }
      });
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSp16ApplicationPackage', () => {
    it('should generate PDF document', async () => {
      // Mock database responses
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockFacility]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          leftJoin: jest.fn().mockReturnValueOnce({
            where: jest.fn().mockResolvedValueOnce(mockStaff),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            orderBy: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce([mockTechnicalSpecs]),
            }),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce(mockEquipment),
        }),
      });

      const filepath =
        await service.generateSp16ApplicationPackage(mockFacilityId);

      expect(filepath).toBeDefined();
      expect(filepath).toContain('sp16-application');
      expect(filepath).toContain(mockFacilityId);
      expect(fs.existsSync(filepath)).toBe(true);

      // Verify PDF file size is reasonable (> 1KB)
      const stats = fs.statSync(filepath);
      expect(stats.size).toBeGreaterThan(1000);
    });

    it('should throw error if facility not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([]),
        }),
      });

      await expect(
        service.generateSp16ApplicationPackage(mockFacilityId),
      ).rejects.toThrow('Facility not found');
    });

    it('should throw error if technical specs not found', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockFacility]),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          leftJoin: jest.fn().mockReturnValueOnce({
            where: jest.fn().mockResolvedValueOnce(mockStaff),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            orderBy: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce([]),
            }),
          }),
        }),
      });

      await expect(
        service.generateSp16ApplicationPackage(mockFacilityId),
      ).rejects.toThrow('Technical specifications not found');
    });
  });

  describe('getFacilityData', () => {
    it('should return facility data', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce([mockFacility]),
        }),
      });

      const result = await service['getFacilityData'](mockFacilityId);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockFacility.facilityName);
      expect(result.address).toBe(mockFacility.address);
      expect(result.consultationRoomPhotos).toHaveLength(2);
    });
  });

  describe('getStaffQualifications', () => {
    it('should return staff qualifications', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          leftJoin: jest.fn().mockReturnValueOnce({
            where: jest.fn().mockResolvedValueOnce(mockStaff),
          }),
        }),
      });

      const result = await service['getStaffQualifications'](mockFacilityId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('สมชาย ใจดี');
      expect(result[0].licenseNumber).toBe('PH-12345');
    });
  });

  describe('getTechnicalSpecifications', () => {
    it('should return technical specifications', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockReturnValueOnce({
            orderBy: jest.fn().mockReturnValueOnce({
              limit: jest.fn().mockResolvedValueOnce([mockTechnicalSpecs]),
            }),
          }),
        }),
      });

      const result =
        await service['getTechnicalSpecifications'](mockFacilityId);

      expect(result).toBeDefined();
      expect(result.platformName).toBe('Agora.io');
      expect(result.dataResidencyCompliant).toBe(true);
    });
  });

  describe('getEquipmentInventory', () => {
    it('should return equipment inventory', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValueOnce({
          where: jest.fn().mockResolvedValueOnce(mockEquipment),
        }),
      });

      const result = await service['getEquipmentInventory'](mockFacilityId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('camera');
      expect(result[0].brand).toBe('Logitech');
    });
  });

  describe('Translation helpers', () => {
    it('should translate facility type', () => {
      expect(service['translateFacilityType']('pharmacy')).toBe('ร้านขายยา');
      expect(service['translateFacilityType']('clinic')).toBe('คลินิก');
      expect(service['translateFacilityType']('hospital')).toBe('โรงพยาบาล');
    });

    it('should translate day', () => {
      expect(service['translateDay']('monday')).toBe('จันทร์');
      expect(service['translateDay']('tuesday')).toBe('อังคาร');
    });

    it('should translate license type', () => {
      expect(service['translateLicenseType']('pharmacist')).toBe('เภสัชกร');
      expect(service['translateLicenseType']('pharmacist_tech')).toBe(
        'ผู้ช่วยเภสัชกร',
      );
    });

    it('should translate equipment type', () => {
      expect(service['translateEquipmentType']('camera')).toBe('กล้อง');
      expect(service['translateEquipmentType']('microphone')).toBe('ไมโครโฟน');
    });
  });
});
