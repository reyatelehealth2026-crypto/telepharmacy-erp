# Documentation Generator Service

**Task 12.2: Implement documentation generator service**

Service to generate ส.พ. 16 application package for Thai FDA (สบส.) submission.

## Overview

The Documentation Generator Service compiles data from all compliance tables and generates a comprehensive PDF document for ส.พ. 16 (Telemedicine Authorization Application) submission to Thai FDA.

## Features

### 1. Facility Information (Requirement 9.1)
- Facility name, type, and address
- Consultation room photos and dimensions
- Privacy measures description
- Lighting and soundproofing details
- Operating hours and telemedicine hours

### 2. Licensed Pharmacist List (Requirement 9.2)
- Pharmacist name and license number
- License type and validity period
- Educational qualifications (degree, university, graduation year)
- Specializations and certifications
- Telemedicine training completion status
- Work schedule and telemedicine shifts

### 3. Video Platform Technical Specifications (Requirement 9.3)
- Platform name and version (e.g., Agora.io)
- Encryption protocols (TLS 1.3, AES-256)
- Video resolution and frame rate
- Recording capabilities and retention period
- Data encryption (at rest and in transit)
- Access control methods
- Network requirements (bandwidth, uptime)
- Data center location (Thailand data residency)

### 4. Equipment Inventory (Requirement 9.4)
- Camera specifications
- Microphone specifications
- Monitor/display specifications
- Computer specifications
- Backup power systems
- Purchase dates and warranty information
- Maintenance schedule

## API Endpoints

### POST /v1/telemedicine/compliance/documentation/sp16/:facilityId
Generate ส.พ. 16 application package for a facility

**Parameters:**
- `facilityId` (path): UUID of the facility

**Response:**
```json
{
  "success": true,
  "filepath": "/uploads/compliance/sp16-application-{facilityId}-{timestamp}.pdf",
  "message": "ส.พ. 16 application package generated successfully"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/telemedicine/compliance/documentation/sp16/123e4567-e89b-12d3-a456-426614174000
```

### GET /v1/telemedicine/compliance/documentation/sp16/:facilityId/download
Download ส.พ. 16 application package

**Parameters:**
- `facilityId` (path): UUID of the facility

**Response:**
- PDF file download

**Example:**
```bash
curl -X GET http://localhost:3000/v1/telemedicine/compliance/documentation/sp16/123e4567-e89b-12d3-a456-426614174000/download -o sp16-application.pdf
```

## PDF Document Structure

The generated PDF includes the following sections:

### Cover Page
- Document title: "คำขออนุญาตให้บริการเภสัชกรรมทางไกล (ส.พ. 16)"
- Facility name and address
- Document generation date

### Section 1: Facility Information (ข้อมูลสถานพยาบาล)
- 1.1 Basic information
- 1.2 Consultation room details
- 1.3 Operating hours
- 1.4 Photos (reference to appendix)

### Section 2: Licensed Pharmacists (รายชื่อเภสัชกรผู้ให้บริการ)
- 2.1 Pharmacist 1 details
- 2.2 Pharmacist 2 details
- ... (one subsection per pharmacist)

### Section 3: Technical Specifications (ข้อมูลทางเทคนิค)
- 3.1 Video platform
- 3.2 Recording capabilities
- 3.3 Security measures
- 3.4 Internet network
- 3.5 Data residency

### Section 4: Equipment Inventory (รายการอุปกรณ์)
- 4.1 Cameras
- 4.2 Microphones
- 4.3 Monitors
- 4.4 Computers
- 4.5 Backup power systems

### Appendices (ภาคผนวก)
- Appendix A: Consultation room photos
- Appendix B: Pharmacist license copies
- Appendix C: Additional technical documents
- Appendix D: Standard Operating Procedures (SOP)
- Appendix E: Telemedicine training certificates

## Data Sources

The service queries the following database tables:

1. **compliance_facilities** - Facility information
2. **compliance_staff_qualifications** - Pharmacist qualifications
3. **compliance_technical_specs** - Technical specifications
4. **compliance_equipment** - Equipment inventory
5. **staff** - Staff details (joined with qualifications)

## Usage Example

```typescript
import { DocumentationGeneratorService } from './documentation-generator.service';

// Inject the service
constructor(
  private readonly documentationGenerator: DocumentationGeneratorService,
) {}

// Generate ส.พ. 16 package
async generatePackage(facilityId: string) {
  const filepath = await this.documentationGenerator
    .generateSp16ApplicationPackage(facilityId);
  
  console.log(`PDF generated at: ${filepath}`);
  return filepath;
}
```

## Configuration

### Environment Variables

```bash
# Storage location for generated PDFs
COMPLIANCE_DOCS_UPLOAD_DIR=./uploads/compliance

# MinIO configuration (for production)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_COMPLIANCE=telemedicine-compliance
```

### File Storage

**Development:**
- PDFs are saved to local filesystem: `./uploads/compliance/`

**Production:**
- PDFs should be uploaded to MinIO bucket: `telemedicine-compliance`
- Implement MinIO upload in `savePdfToStorage()` method

## PDF Generation

The service uses **PDFKit** library to generate PDF documents:

```typescript
import * as PDFDocument from 'pdfkit';

// Create PDF document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
});

// Add content
doc.fontSize(16).font('Helvetica-Bold').text('Title');
doc.fontSize(12).font('Helvetica').text('Content');

// Generate buffer
const chunks: Buffer[] = [];
doc.on('data', (chunk) => chunks.push(chunk));
doc.on('end', () => {
  const pdfBuffer = Buffer.concat(chunks);
  // Save or upload pdfBuffer
});

doc.end();
```

## Thai Language Support

The PDF includes Thai language content:

- **Font**: Helvetica (supports Thai characters)
- **Date Format**: Thai Buddhist calendar (พ.ศ.)
- **Translations**: All labels and descriptions in Thai

### Translation Helpers

```typescript
private translateFacilityType(type: string): string {
  const types: Record<string, string> = {
    clinic: 'คลินิก',
    pharmacy: 'ร้านขายยา',
    hospital: 'โรงพยาบาล',
  };
  return types[type] || type;
}

private translateDay(day: string): string {
  const days: Record<string, string> = {
    monday: 'จันทร์',
    tuesday: 'อังคาร',
    wednesday: 'พุธ',
    // ...
  };
  return days[day] || day;
}
```

## Error Handling

The service throws errors in the following cases:

1. **Facility not found**: `throw new Error('Facility not found: {facilityId}')`
2. **Technical specs not found**: `throw new Error('Technical specifications not found for facility: {facilityId}')`
3. **PDF generation error**: Caught in Promise rejection

## Testing

### Unit Tests

```typescript
describe('DocumentationGeneratorService', () => {
  it('should generate ส.พ. 16 package', async () => {
    const filepath = await service.generateSp16ApplicationPackage(facilityId);
    expect(filepath).toContain('sp16-application');
    expect(fs.existsSync(filepath)).toBe(true);
  });

  it('should include facility information', async () => {
    const facilityData = await service['getFacilityData'](facilityId);
    expect(facilityData.name).toBeDefined();
    expect(facilityData.address).toBeDefined();
  });

  it('should include staff qualifications', async () => {
    const staffData = await service['getStaffQualifications'](facilityId);
    expect(staffData.length).toBeGreaterThan(0);
    expect(staffData[0].licenseNumber).toBeDefined();
  });
});
```

### Integration Tests

```bash
# Test PDF generation
pnpm test documentation-generator.service.spec.ts

# Test API endpoint
pnpm test:e2e compliance.e2e-spec.ts
```

## Future Enhancements

- [ ] Add digital signature to PDF
- [ ] Support multiple languages (Thai/English)
- [ ] Include QR code for document verification
- [ ] Auto-upload to MinIO in production
- [ ] Email notification when document is ready
- [ ] Version control for generated documents
- [ ] Template customization per facility
- [ ] Batch generation for multiple facilities

## Related Modules

- **Compliance Module**: Parent module
- **Compliance Monitor Service**: Metrics and monitoring
- **Facility Management**: Facility data
- **Staff Management**: Pharmacist data
- **Equipment Management**: Equipment inventory

## References

- Requirements 9.1, 9.2, 9.3, 9.4
- Task 12.2 in implementation plan
- Thai FDA ส.พ. 16 application guidelines
- Telemedicine 2569 compliance standards

## Dependencies

```json
{
  "pdfkit": "^0.13.0",
  "@types/pdfkit": "^0.12.0"
}
```

Install dependencies:
```bash
pnpm add pdfkit
pnpm add -D @types/pdfkit
```
