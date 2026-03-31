# Scope Validation Examples

## Example 1: Valid Follow-up Consultation (PASSED)

### Scenario
Patient with hypertension requesting medication refill. Has consultation history and baseline data.

### Request
```bash
POST /v1/telemedicine/scope/validate
Content-Type: application/json

{
  "consultationId": "550e8400-e29b-41d4-a716-446655440001",
  "patientId": "550e8400-e29b-41d4-a716-446655440002",
  "consultationType": "follow_up_chronic",
  "chiefComplaint": "ขอยาความดันโลหิตสูงประจำเดือน",
  "symptoms": ["ไม่มีอาการผิดปกติ"],
  "requestedMedications": [
    {
      "drugName": "Amlodipine",
      "genericName": "amlodipine",
      "dosage": "5mg"
    }
  ]
}
```

### Response
```json
{
  "validationId": "550e8400-e29b-41d4-a716-446655440003",
  "consultationId": "550e8400-e29b-41d4-a716-446655440001",
  "overallResult": "passed",
  "canProceed": true,
  "requiresPharmacistReview": false,
  "triggeredRules": [],
  "patientType": "follow_up",
  "lastConsultationDate": "2024-01-15T10:30:00.000Z",
  "hasBaselineData": true,
  "prohibitedSymptoms": [],
  "message": "การตรวจสอบขอบเขตการให้บริการผ่าน สามารถดำเนินการให้คำปรึกษาได้"
}
```

### Next Steps
✅ Proceed to E-Consent step

---

## Example 2: Prohibited Symptom - Chest Pain (REJECTED)

### Scenario
Patient reporting chest pain. This is a critical symptom requiring immediate medical attention.

### Request
```bash
POST /v1/telemedicine/scope/validate
Content-Type: application/json

{
  "consultationId": "550e8400-e29b-41d4-a716-446655440004",
  "patientId": "550e8400-e29b-41d4-a716-446655440005",
  "consultationType": "general_health",
  "chiefComplaint": "เจ็บหน้าอก",
  "symptoms": ["เจ็บหน้าอก", "แน่นหน้าอก"],
  "requestedMedications": []
}
```

### Response
```json
{
  "validationId": "550e8400-e29b-41d4-a716-446655440006",
  "consultationId": "550e8400-e29b-41d4-a716-446655440004",
  "overallResult": "rejected",
  "canProceed": false,
  "requiresPharmacistReview": false,
  "triggeredRules": [
    {
      "ruleId": "550e8400-e29b-41d4-a716-446655440007",
      "ruleName": "Prohibit Chest Pain",
      "ruleType": "symptom_check",
      "action": "reject",
      "severity": "critical",
      "message": "🚨 อาการเจ็บหน้าอกอาจเป็นสัญญาณของโรคหัวใจ กรุณาไปโรงพยาบาลทันที หรือโทร 1669",
      "details": {
        "matchedSymptoms": ["เจ็บหน้าอก", "แน่นหน้าอก"]
      }
    }
  ],
  "patientType": "follow_up",
  "lastConsultationDate": "2023-12-20T14:00:00.000Z",
  "hasBaselineData": true,
  "prohibitedSymptoms": ["เจ็บหน้าอก", "แน่นหน้าอก"],
  "message": "🚨 อาการเจ็บหน้าอกอาจเป็นสัญญาณของโรคหัวใจ กรุณาไปโรงพยาบาลทันที หรือโทร 1669"
}
```

### Next Steps
❌ Consultation rejected
🚑 Trigger Emergency Referral System
📱 Send LINE notification with hospital recommendations

---

## Example 3: Controlled Substance Request (REJECTED)

### Scenario
Patient requesting tramadol (narcotic). Cannot be dispensed via telemedicine.

### Request
```bash
POST /v1/telemedicine/scope/validate
Content-Type: application/json

{
  "consultationId": "550e8400-e29b-41d4-a716-446655440008",
  "patientId": "550e8400-e29b-41d4-a716-446655440009",
  "consultationType": "medication_refill",
  "chiefComplaint": "ขอยาแก้ปวด",
  "symptoms": ["ปวดหลัง"],
  "requestedMedications": [
    {
      "drugName": "Tramadol",
      "genericName": "tramadol",
      "dosage": "50mg"
    }
  ]
}
```

### Response
```json
{
  "validationId": "550e8400-e29b-41d4-a716-446655440010",
  "consultationId": "550e8400-e29b-41d4-a716-446655440008",
  "overallResult": "rejected",
  "canProceed": false,
  "requiresPharmacistReview": false,
  "triggeredRules": [
    {
      "ruleId": "550e8400-e29b-41d4-a716-446655440011",
      "ruleName": "Prohibit Controlled Substances - Narcotics",
      "ruleType": "medication_check",
      "action": "reject",
      "severity": "critical",
      "message": "❌ ไม่สามารถจ่ายยาเสพติดให้โทษผ่านระบบเภสัชกรรมทางไกลได้ กรุณาพบแพทย์เพื่อรับใบสั่งยา",
      "details": {
        "matchedMedications": ["Tramadol"]
      }
    }
  ],
  "patientType": "follow_up",
  "lastConsultationDate": "2024-01-10T09:00:00.000Z",
  "hasBaselineData": true,
  "prohibitedSymptoms": [],
  "message": "❌ ไม่สามารถจ่ายยาเสพติดให้โทษผ่านระบบเภสัชกรรมทางไกลได้ กรุณาพบแพทย์เพื่อรับใบสั่งยา"
}
```

### Next Steps
❌ Consultation rejected
📋 Display message explaining controlled substance policy
🏥 Suggest in-person doctor visit

---

## Example 4: New Patient with Acute Symptoms (REJECTED)

### Scenario
First-time patient with severe abdominal pain. Requires in-person examination.

### Request
```bash
POST /v1/telemedicine/scope/validate
Content-Type: application/json

{
  "consultationId": "550e8400-e29b-41d4-a716-446655440012",
  "patientId": "550e8400-e29b-41d4-a716-446655440013",
  "consultationType": "minor_ailment",
  "chiefComplaint": "ปวดท้องมาก",
  "symptoms": ["ปวดท้องมาก", "คลื่นไส้", "อาเจียน"],
  "requestedMedications": []
}
```

### Response
```json
{
  "validationId": "550e8400-e29b-41d4-a716-446655440014",
  "consultationId": "550e8400-e29b-41d4-a716-446655440012",
  "overallResult": "rejected",
  "canProceed": false,
  "requiresPharmacistReview": false,
  "triggeredRules": [
    {
      "ruleId": "550e8400-e29b-41d4-a716-446655440015",
      "ruleName": "Prohibit Acute Abdomen",
      "ruleType": "symptom_check",
      "action": "reject",
      "severity": "critical",
      "message": "🚨 อาการปวดท้องเฉียบพลันต้องได้รับการตรวจร่างกายโดยแพทย์ กรุณาไปโรงพยาบาลทันที หรือโทร 1669",
      "details": {
        "matchedSymptoms": ["ปวดท้องมาก"]
      }
    },
    {
      "ruleId": "550e8400-e29b-41d4-a716-446655440016",
      "ruleName": "Reject New Patient with Acute Condition",
      "ruleType": "patient_type_check",
      "action": "reject",
      "severity": "high",
      "message": "❌ ผู้ป่วยใหม่ที่มีอาการเฉียบพลันต้องพบแพทย์เพื่อตรวจร่างกายก่อน ไม่สามารถให้บริการผ่านเภสัชกรรมทางไกลได้",
      "details": {
        "isNewPatient": true,
        "hasAcuteSymptoms": true
      }
    }
  ],
  "patientType": "new_patient",
  "lastConsultationDate": null,
  "hasBaselineData": false,
  "prohibitedSymptoms": ["ปวดท้องมาก"],
  "message": "🚨 อาการปวดท้องเฉียบพลันต้องได้รับการตรวจร่างกายโดยแพทย์ กรุณาไปโรงพยาบาลทันที หรือโทร 1669"
}
```

### Next Steps
❌ Consultation rejected (multiple critical rules triggered)
🚑 Trigger Emergency Referral System
📱 Send urgent notification

---

## Example 5: Outdated Baseline Data (REQUIRES_REVIEW)

### Scenario
Chronic disease patient with baseline data older than 12 months. Needs pharmacist review.

### Request
```bash
POST /v1/telemedicine/scope/validate
Content-Type: application/json

{
  "consultationId": "550e8400-e29b-41d4-a716-446655440017",
  "patientId": "550e8400-e29b-41d4-a716-446655440018",
  "consultationType": "follow_up_chronic",
  "chiefComplaint": "ขอยาเบาหวาน",
  "symptoms": ["ไม่มีอาการผิดปกติ"],
  "requestedMedications": [
    {
      "drugName": "Metformin",
      "genericName": "metformin",
      "dosage": "500mg"
    }
  ]
}
```

### Response
```json
{
  "validationId": "550e8400-e29b-41d4-a716-446655440019",
  "consultationId": "550e8400-e29b-41d4-a716-446655440017",
  "overallResult": "requires_review",
  "canProceed": true,
  "requiresPharmacistReview": true,
  "triggeredRules": [
    {
      "ruleId": "550e8400-e29b-41d4-a716-446655440020",
      "ruleName": "Require Baseline Data for Chronic Condition",
      "ruleType": "baseline_data_check",
      "action": "flag_review",
      "severity": "medium",
      "message": "⚠️ ผู้ป่วยโรคเรื้อรังต้องมีข้อมูลพื้นฐาน (Lab results, Vital signs) ที่ไม่เกิน 12 เดือน",
      "details": {
        "hasBaselineData": true,
        "baselineDataAge": 15,
        "isOutdated": true,
        "maxAgeMonths": 12
      }
    }
  ],
  "patientType": "follow_up",
  "lastConsultationDate": "2022-10-15T11:00:00.000Z",
  "hasBaselineData": true,
  "prohibitedSymptoms": [],
  "message": "การให้คำปรึกษาต้องได้รับการพิจารณาจากเภสัชกร"
}
```

### Next Steps
⚠️ Pharmacist review required
👨‍⚕️ Pharmacist can:
  - Review patient history
  - Request updated lab results
  - Override validation with justification
  - Proceed with consultation if appropriate

---

## Example 6: Pharmacist Override

### Scenario
Pharmacist reviews flagged consultation and decides to proceed with justification.

### Request
```bash
POST /v1/telemedicine/scope/override
Content-Type: application/json
Authorization: Bearer <pharmacist-jwt-token>

{
  "validationId": "550e8400-e29b-41d4-a716-446655440019",
  "reason": "ผู้ป่วยมีประวัติการรักษาต่อเนื่องมา 3 ปี ผลตรวจ HbA1c ล่าสุดเมื่อ 15 เดือนที่แล้วอยู่ในเกณฑ์ดี (6.5%) อาการคงที่ ไม่มีภาวะแทรกซ้อน ผู้ป่วยมีการวัดน้ำตาลเองที่บ้านสม่ำเสมอและอยู่ในเกณฑ์ปกติ จึงพิจารณาให้บริการได้ และแนะนำให้ผู้ป่วยไปตรวจ Lab ใหม่ภายใน 3 เดือน"
}
```

### Response
```json
{
  "success": true,
  "message": "Validation override recorded successfully"
}
```

### Audit Trail
```json
{
  "actorId": "pharmacist-id-456",
  "actorType": "pharmacist",
  "actionType": "scope_validation_override",
  "entityType": "scope_validation",
  "entityId": "550e8400-e29b-41d4-a716-446655440019",
  "metadata": {
    "reason": "ผู้ป่วยมีประวัติการรักษาต่อเนื่องมา 3 ปี..."
  },
  "timestamp": "2024-01-20T14:30:00.000Z"
}
```

### Next Steps
✅ Consultation can proceed
📝 Override logged for compliance review
🔍 Flagged for quality assurance audit

---

## Example 7: Get Validation History

### Request
```bash
GET /v1/telemedicine/scope/history/550e8400-e29b-41d4-a716-446655440017
Authorization: Bearer <jwt-token>
```

### Response
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440019",
    "consultationId": "550e8400-e29b-41d4-a716-446655440017",
    "overallResult": "requires_review",
    "triggeredRules": [...],
    "patientType": "follow_up",
    "lastConsultationDate": "2022-10-15T11:00:00.000Z",
    "hasBaselineData": true,
    "overrideBy": "pharmacist-id-456",
    "overrideReason": "ผู้ป่วยมีประวัติการรักษาต่อเนื่องมา 3 ปี...",
    "overrideAt": "2024-01-20T14:30:00.000Z",
    "createdAt": "2024-01-20T14:25:00.000Z"
  }
]
```

---

## Example 8: Get All Active Rules

### Request
```bash
GET /v1/telemedicine/scope/rules
Authorization: Bearer <jwt-token>
```

### Response
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440021",
    "ruleType": "medication_check",
    "ruleName": "Prohibit Controlled Substances - Narcotics",
    "condition": {
      "controlledSubstances": ["tramadol", "codeine", "morphine", ...]
    },
    "action": "reject",
    "severity": "critical",
    "message": "❌ ไม่สามารถจ่ายยาเสพติดให้โทษผ่านระบบเภสัชกรรมทางไกลได้",
    "isActive": true,
    "priority": 1,
    "createdBy": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440022",
    "ruleType": "symptom_check",
    "ruleName": "Prohibit Chest Pain",
    "condition": {
      "prohibitedSymptoms": ["เจ็บหน้าอก", "chest pain", ...]
    },
    "action": "reject",
    "severity": "critical",
    "message": "🚨 อาการเจ็บหน้าอกอาจเป็นสัญญาณของโรคหัวใจ",
    "isActive": true,
    "priority": 5,
    "createdBy": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

## Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Patient Requests Consultation                            │
│    POST /v1/telemedicine/consultations/request              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Scope Validation (AUTOMATIC)                             │
│    POST /v1/telemedicine/scope/validate                     │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┬───────────────────┐
         │                       │                   │
         ▼                       ▼                   ▼
    ┌─────────┐          ┌──────────────┐    ┌──────────┐
    │ PASSED  │          │ REQUIRES     │    │ REJECTED │
    │         │          │ REVIEW       │    │          │
    └────┬────┘          └──────┬───────┘    └────┬─────┘
         │                      │                  │
         ▼                      ▼                  ▼
    ┌─────────┐          ┌──────────────┐    ┌──────────┐
    │ E-Consent│          │ Pharmacist   │    │ Referral │
    │         │          │ Review       │    │ System   │
    └─────────┘          └──────┬───────┘    └──────────┘
                                │
                    ┌───────────┴────────────┐
                    │                        │
                    ▼                        ▼
            ┌──────────────┐        ┌──────────────┐
            │ Override     │        │ Reject       │
            │ (Proceed)    │        │ (Refer)      │
            └──────────────┘        └──────────────┘
```

## Testing Checklist

- [ ] Valid follow-up consultation passes
- [ ] Prohibited symptoms trigger rejection
- [ ] Controlled substances trigger rejection
- [ ] New patient with acute symptoms rejected
- [ ] Outdated baseline data flags for review
- [ ] Pharmacist override works with justification
- [ ] Override requires minimum 50 characters
- [ ] Validation history is retrievable
- [ ] Audit trail logs all validations
- [ ] Audit trail logs all overrides
- [ ] Rules can be activated/deactivated
- [ ] Multiple rules can trigger simultaneously
- [ ] Priority ordering is respected
- [ ] Thai and English symptoms both detected
