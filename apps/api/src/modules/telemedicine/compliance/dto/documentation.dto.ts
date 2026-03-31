import { IsUUID, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateSp16PackageDto {
  @ApiProperty({
    description: 'Facility ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  facilityId!: string;
}

export class Sp16PackageResponseDto {
  @ApiProperty({ description: 'Success status' })
  success!: boolean;

  @ApiProperty({ description: 'File path of generated PDF' })
  filepath!: string;

  @ApiProperty({ description: 'Success message' })
  message!: string;
}

export class FacilityDataDto {
  @ApiProperty({ description: 'Facility name' })
  name!: string;

  @ApiProperty({ description: 'Facility type' })
  type!: string;

  @ApiProperty({ description: 'Address' })
  address!: string;

  @ApiProperty({ description: 'Province' })
  province!: string;

  @ApiProperty({ description: 'District' })
  district!: string;

  @ApiProperty({ description: 'Consultation room photos', type: [String] })
  @IsOptional()
  @IsArray()
  consultationRoomPhotos?: string[];

  @ApiProperty({ description: 'Room dimensions' })
  @IsOptional()
  roomDimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };

  @ApiProperty({ description: 'Privacy measures description' })
  @IsOptional()
  @IsString()
  privacyMeasures?: string;
}

export class StaffQualificationDto {
  @ApiProperty({ description: 'Staff name' })
  name!: string;

  @ApiProperty({ description: 'License number' })
  licenseNumber!: string;

  @ApiProperty({ description: 'License type' })
  licenseType!: string;

  @ApiProperty({ description: 'License issue date' })
  licenseIssueDate?: Date;

  @ApiProperty({ description: 'License expiry date' })
  licenseExpiryDate?: Date;

  @ApiProperty({ description: 'Degree' })
  @IsOptional()
  degree?: string;

  @ApiProperty({ description: 'University' })
  @IsOptional()
  university?: string;

  @ApiProperty({ description: 'Graduation year' })
  @IsOptional()
  graduationYear?: number;

  @ApiProperty({ description: 'Specializations', type: [String] })
  @IsOptional()
  @IsArray()
  specializations?: string[];

  @ApiProperty({ description: 'Telemedicine training completed' })
  telemedicineTrainingCompleted!: boolean;
}

export class TechnicalSpecsDto {
  @ApiProperty({ description: 'Platform name' })
  platformName!: string;

  @ApiProperty({ description: 'Platform version' })
  @IsOptional()
  platformVersion?: string;

  @ApiProperty({ description: 'Encryption protocol' })
  encryptionProtocol!: string;

  @ApiProperty({ description: 'Video resolution' })
  videoResolution!: string;

  @ApiProperty({ description: 'Video frame rate' })
  videoFrameRate!: number;

  @ApiProperty({ description: 'Recording enabled' })
  recordingEnabled!: boolean;

  @ApiProperty({ description: 'Recording format' })
  recordingFormat!: string;

  @ApiProperty({ description: 'Recording storage location' })
  recordingStorage!: string;

  @ApiProperty({ description: 'Data center location' })
  dataCenter!: string;

  @ApiProperty({ description: 'Data residency compliant' })
  dataResidencyCompliant!: boolean;
}

export class EquipmentDto {
  @ApiProperty({ description: 'Equipment type' })
  type!: string;

  @ApiProperty({ description: 'Brand' })
  @IsOptional()
  brand?: string;

  @ApiProperty({ description: 'Model' })
  @IsOptional()
  model?: string;

  @ApiProperty({ description: 'Serial number' })
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({ description: 'Purchase date' })
  @IsOptional()
  purchaseDate?: Date;

  @ApiProperty({ description: 'Status' })
  status!: string;
}
