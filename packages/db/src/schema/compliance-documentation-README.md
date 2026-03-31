# ส.พ. 16 Compliance Documentation Schema

This document describes the database schema for managing ส.พ. 16 (Ministry of Public Health Form 16) compliance documentation for telemedicine services.

## Overview

The compliance documentation system tracks all information required for:
- Applying for ส.พ. 16 authorization to operate telemedicine services
- Maintaining compliance with Thai FDA (สบส.) regulations
- Generating quarterly and annual compliance reports
- Tracking system changes that require สบส. notification
- Managing equipment inventory and staff qualifications

## Tables

### 1. compliance_facilities

Stores information about physical facilities providing telemedicine services.

**Key Fields:**
- `facility_name`, `facility_type` - Basic facility information
- `address`, `province`, `district` - Location details
- `consultation_room_photos` - Array of photo URLs showing consultation space
- `room_dimensions` - Physical dimensions (length, width, height in meters)
- `privacy_measures` - Description of privacy setup (soundproofing, curtains, etc.)
- `operating_hours`, `telemedicine_hours` - Service availability

**Purpose:** Documents physical consultation space with photos, dimensions, and privacy measures (Requirement 9.2)

### 2. compliance_equipment

Tracks all equipment used for telemedicine consultations.

**Key Fields:**
- `equipment_type` - camera, microphone, monitor, computer, backup_power
- `brand`, `model`, `serial_number` - Equipment identification
- `specifications` - Technical specs (resolution, bitrate, etc.)
- `status` - active, maintenance, retired, backup
- `last_maintenance_date`, `next_maintenance_date` - Maintenance tracking
- `photo_url`, `invoice_url`, `manual_url` - Documentation

**Purpose:** Maintains equipment inventory including cameras, microphones, and backup systems (Requirement 9.6)

### 3. compliance_staff_qualifications

Documents staff qualifications and certifications.

**Key Fields:**
- `license_number`, `license_type` - Professional license information
- `license_expiry_date` - License validity tracking
- `degree`, `university`, `graduation_year` - Educational background
- `specializations`, `certifications` - Additional qualifications
- `telemedicine_training_completed` - Telemedicine-specific training status
- `work_schedule`, `telemedicine_shifts` - Availability
- `cv_url`, `license_document_url`, `degree_document_url` - Supporting documents

**Purpose:** Maintains current list of licensed pharmacists with license numbers and specialties (Requirement 9.3)

### 4. compliance_technical_specs

Documents video consultation platform technical specifications.

**Key Fields:**
- `platform_name`, `platform_version` - Platform identification (e.g., Agora.io)
- `encryption_protocol` - Security protocol (TLS 1.3, AES-256)
- `video_resolution`, `video_frame_rate` - Video quality specs
- `recording_enabled`, `recording_format`, `recording_storage` - Recording capabilities
- `recording_retention_years` - Data retention period (default: 10 years)
- `data_encryption_at_rest`, `data_encryption_in_transit` - Security measures
- `minimum_bandwidth_kbps`, `recommended_bandwidth_kbps` - Network requirements
- `data_center`, `data_center_location` - Data residency information
- `data_residency_compliant` - Thailand data residency compliance flag
- `uptime_percentage` - System reliability metric

**Purpose:** Documents Video_Consultation_Platform technical specifications including encryption, recording, and data security measures (Requirement 9.4)

### 5. sp16_authorizations

Tracks ส.พ. 16 authorization status and lifecycle.

**Key Fields:**
- `authorization_number` - Official authorization number from สบส.
- `status` - not_applied, application_pending, approved, expired, suspended, renewal_pending
- `application_date`, `application_document_url` - Application tracking
- `approval_date`, `approval_document_url` - Approval documentation
- `approved_by`, `approval_notes` - Approval details
- `effective_date`, `expiry_date` - Authorization validity period
- `renewal_reminder_sent_at` - Renewal reminder tracking (90 days before expiry)
- `suspended_at`, `suspension_reason` - Suspension tracking
- `correspondence_log` - Array of communications with สบส.

**Purpose:** Tracks ส.พ. 16 authorization expiration date and sends renewal reminders 90 days before expiry (Requirement 9.9)

### 6. compliance_system_changes

Maintains change log for system modifications.

**Key Fields:**
- `change_type` - equipment, software, procedure, staff, facility
- `change_category` - major, minor
- `change_description` - Detailed description of change
- `requires_sp16_amendment` - Flag indicating if สบส. notification required
- `impact_assessment`, `risk_level` - Impact analysis
- `planned_date`, `implemented_date` - Implementation tracking
- `implemented_by` - Staff member who implemented change
- `notification_required`, `notified_at` - สบส. notification tracking
- `acknowledgment_received`, `acknowledgment_date` - สบส. acknowledgment

**Purpose:** Maintains change log for any modifications to telemedicine system requiring ส.พ. 16 amendment (Requirement 9.10)

### 7. compliance_reports

Stores generated compliance reports.

**Key Fields:**
- `report_type` - quarterly, annual, self_assessment, incident
- `report_period_start`, `report_period_end` - Reporting period
- `report_data` - Structured report data (JSONB)
- `summary`, `findings`, `recommendations` - Report content
- **Metrics:**
  - `total_consultations`, `total_referrals`, `referral_rate`
  - `average_consultation_duration`
  - `kyc_success_rate`, `consent_acceptance_rate`
  - `system_uptime_percentage`
- `generated_at`, `generated_by` - Generation tracking
- `report_file_url` - PDF report location
- `submitted_to_authority`, `submitted_at` - Submission to สบส.
- `acknowledgment_received`, `acknowledgment_date` - สบส. acknowledgment

**Purpose:** Generates quarterly compliance reports for สบส. submission (Requirement 9.8) and annual self-assessment reports (Requirement 9.12)

## Relationships

```
compliance_facilities (1) ──< (N) compliance_equipment
compliance_facilities (1) ──< (N) compliance_staff_qualifications
compliance_facilities (1) ──< (N) compliance_technical_specs
compliance_facilities (1) ──< (N) sp16_authorizations
compliance_facilities (1) ──< (N) compliance_system_changes
compliance_facilities (1) ──< (N) compliance_reports

staff (1) ──< (N) compliance_staff_qualifications
staff (1) ──< (N) compliance_reports (generated_by)
staff (1) ──< (N) compliance_system_changes (implemented_by, reviewed_by)
staff (1) ──< (N) sp16_authorizations (submitted_by)
```

## Data Flow

### ส.พ. 16 Application Process

1. **Setup Phase:**
   - Create `compliance_facilities` record with facility details
   - Add `compliance_equipment` records for all equipment
   - Add `compliance_staff_qualifications` for all pharmacists
   - Create `compliance_technical_specs` with platform details

2. **Application Phase:**
   - Create `sp16_authorizations` record with status='not_applied'
   - Generate application package from all compliance data
   - Update status to 'application_pending' when submitted
   - Store `application_document_url`

3. **Approval Phase:**
   - Update status to 'approved' when authorization received
   - Store `authorization_number`, `approval_document_url`
   - Set `effective_date` and `expiry_date`

4. **Maintenance Phase:**
   - Track system changes in `compliance_system_changes`
   - Generate quarterly reports in `compliance_reports`
   - Monitor expiry date and send renewal reminders

### System Change Tracking

1. **Change Initiated:**
   - Create `compliance_system_changes` record
   - Assess if `requires_sp16_amendment` = true

2. **Implementation:**
   - Update `implemented_date` and `implemented_by`
   - Store documentation URLs

3. **Notification (if required):**
   - Set `notification_required` = true
   - Update `notified_at` when สบส. notified
   - Track `acknowledgment_received`

### Quarterly Reporting

1. **Report Generation:**
   - Query metrics from telemedicine tables
   - Calculate KPIs (referral rate, KYC success rate, etc.)
   - Create `compliance_reports` record with `report_type='quarterly'`
   - Generate PDF and store in `report_file_url`

2. **Submission:**
   - Update `submitted_to_authority` = true
   - Set `submitted_at` timestamp
   - Track `acknowledgment_received`

## Usage Examples

### Query Current Authorization Status

```typescript
const [authorization] = await db
  .select()
  .from(sp16Authorizations)
  .where(eq(sp16Authorizations.facilityId, facilityId))
  .orderBy(desc(sp16Authorizations.createdAt))
  .limit(1);

if (authorization.status === 'approved') {
  const daysUntilExpiry = differenceInDays(authorization.expiryDate, new Date());
  if (daysUntilExpiry <= 90) {
    // Send renewal reminder
  }
}
```

### Get Equipment Inventory

```typescript
const equipment = await db
  .select()
  .from(complianceEquipment)
  .where(
    and(
      eq(complianceEquipment.facilityId, facilityId),
      eq(complianceEquipment.status, 'active')
    )
  );
```

### Track System Change

```typescript
await db.insert(complianceSystemChanges).values({
  facilityId,
  changeType: 'software',
  changeCategory: 'major',
  changeDescription: 'Upgraded video platform from Agora 4.0 to 5.0',
  requiresSp16Amendment: true,
  impactAssessment: 'Improved video quality and security',
  riskLevel: 'low',
  implementedDate: new Date(),
  implementedBy: staffId,
  notificationRequired: true,
});
```

### Generate Quarterly Report

```typescript
const reportData = {
  consultations: await getConsultationMetrics(startDate, endDate),
  referrals: await getReferralMetrics(startDate, endDate),
  kyc: await getKycMetrics(startDate, endDate),
  consent: await getConsentMetrics(startDate, endDate),
  uptime: await getUptimeMetrics(startDate, endDate),
};

await db.insert(complianceReports).values({
  facilityId,
  reportType: 'quarterly',
  reportPeriodStart: startDate,
  reportPeriodEnd: endDate,
  reportData,
  totalConsultations: reportData.consultations.total,
  totalReferrals: reportData.referrals.total,
  referralRate: (reportData.referrals.total / reportData.consultations.total) * 100,
  kycSuccessRate: reportData.kyc.successRate,
  consentAcceptanceRate: reportData.consent.acceptanceRate,
  systemUptimePercentage: reportData.uptime.percentage,
  generatedAt: new Date(),
  generatedBy: staffId,
});
```

## Compliance Requirements Mapping

| Requirement | Table(s) | Description |
|-------------|----------|-------------|
| 9.1 | All tables | Generate ส.พ. 16 application package |
| 9.2 | compliance_facilities | Document physical consultation space |
| 9.3 | compliance_staff_qualifications | Maintain licensed pharmacist list |
| 9.4 | compliance_technical_specs | Document video platform specifications |
| 9.5 | compliance_technical_specs | Generate internet stability report |
| 9.6 | compliance_equipment | Maintain equipment inventory |
| 9.7 | compliance_facilities | Document standard operating procedures |
| 9.8 | compliance_reports | Generate quarterly compliance reports |
| 9.9 | sp16_authorizations | Track authorization expiration and reminders |
| 9.10 | compliance_system_changes | Maintain change log |
| 9.11 | sp16_authorizations | Store approval letters and correspondence |
| 9.12 | compliance_reports | Generate annual self-assessment |

## Migration

The schema is defined in `packages/db/src/schema/telemedicine.ts` and the migration is in `packages/db/src/migrations/0002_steep_purple_man.sql`.

To apply the migration:

```bash
cd packages/db
pnpm db:migrate
```

## Next Steps

After schema implementation, the following services need to be created:

1. **Compliance Documentation Service** (Task 12.2)
   - Generate ส.พ. 16 application package
   - Compile facility information, equipment inventory, staff qualifications
   - Generate PDF documentation

2. **System Monitoring Service** (Task 12.3)
   - Track internet uptime and bandwidth
   - Monitor equipment status
   - Generate stability reports

3. **Quarterly Reporting Service** (Task 12.4)
   - Calculate compliance metrics
   - Generate quarterly reports
   - Submit to สบส.

4. **REST API Endpoints** (Task 12.5)
   - CRUD operations for all compliance tables
   - Report generation endpoints
   - Authorization status tracking
