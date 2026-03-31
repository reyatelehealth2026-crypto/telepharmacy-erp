# Consultation Scope Validation Engine

## Overview

The Consultation Scope Validation Engine is a **CRITICAL compliance component** that validates whether a telemedicine consultation request is within the legal scope of practice for pharmacists in Thailand, as defined by Telemedicine 2569 regulations.

This module prevents pharmacists from accepting consultations they cannot legally handle, protecting both patients and pharmacists from malpractice liability.

## Key Features

### 1. Rule-Based Validation Engine
- **Multiple Rule Types**: Symptom checks, medication checks, patient type validation, baseline data requirements, and time-based rules
- **Priority-Based Execution**: Rules execute in priority order (lower number = higher priority)
- **Flexible Actions**: Rules can allow, reject, or flag consultations for review
- **Severity Levels**: Critical, high, medium, and low severity classifications

### 2. Prohibited Symptoms Detection
Automatically rejects consultations with emergency symptoms:
- Acute abdomen / severe abdominal pain
- Chest pain or chest tightness
- Difficulty breathing / shortness of breath
- Severe headache
- Altered consciousness / confusion
- Bleeding symptoms
- Severe allergic reactions

### 3. Controlled Substances Blocking
Prevents dispensing of controlled substances via telemedicine:
- **Narcotics**: Tramadol, codeine, morphine, fentanyl, etc.
- **Psychotropics**: Alprazolam, diazepam, lorazepam, zolpidem, etc.
- **Stimulants**: Methylphenidate and similar medications

### 4. Patient Type Validation
- **New Patients**: Rejects new patients with acute conditions (must see doctor first)
- **Follow-up Patients**: Validates recent consultation history (within 6 months)
- **Chronic Conditions**: Requires baseline data (lab results, vital signs) within 12 months

### 5. Pharmacist Override Mechanism
- Pharmacists can override validation results with mandatory justification (minimum 50 characters)
- All overrides are logged in audit trail for compliance review
- Overridden consultations are flagged for quality assurance

## Architecture

### Services

#### ScopeValidatorService
Main validation engine that:
- Loads active rules from database
- Evaluates rules against consultation context
- Tracks patient history and baseline data
- Generates validation results with detailed reasoning
- Supports pharmacist overrides with audit logging

#### ScopeRulesService
Manages scope rules:
- CRUD operations for scope rules
- Activate/deactivate rules
- Query rules by type, priority, or status

### Database Schema

#### scope_rules
Stores validation rules:
- `ruleType`: Type of rule (symptom_check, medication_check, etc.)
- `ruleName`: Human-readable rule name
- `condition`: JSON condition object (flexible rule definition)
- `action`: What to do when rule triggers (allow, reject, flag_review)
- `severity`: Severity level (critical, high, medium, low)
- `message`: User-facing message in Thai
- `priority`: Execution priority (1-1000, lower = higher priority)
- `isActive`: Whether rule is currently active

#### scope_validation_results
Stores validation results:
- `consultationId`: Associated consultation
- `overallResult`: Final result (passed, rejected, requires_review)
- `triggeredRules`: Array of rules that triggered
- `patientType`: new_patient or follow_up
- `lastConsultationDate`: Patient's last consultation
- `hasBaselineData`: Whether patient has required baseline data
- `overrideBy`: Pharmacist who overrode (if applicable)
- `overrideReason`: Justification for override

## API Endpoints

### POST /v1/telemedicine/scope/validate
Validate consultation scope

**Request:**
```json
{
  "consultationId": "uuid",
  "patientId": "uuid",
  "consultationType": "follow_up_chronic",
  "chiefComplaint": "ขอยาความดันโลหิตสูง",
  "symptoms": ["ปวดหัวเล็กน้อย"],
  "requestedMedications": [
    {
      "drugName": "Amlodipine",
      "dosage": "5mg"
    }
  ]
}
```

**Response:**
```json
{
  "validationId": "uuid",
  "consultationId": "uuid",
  "overallResult": "passed",
  "canProceed": true,
  "requiresPharmacistReview": false,
  "triggeredRules": [],
  "patientType": "follow_up",
  "lastConsultationDate": "2024-01-15T10:30:00Z",
  "hasBaselineData": true,
  "prohibitedSymptoms": [],
  "message": "การตรวจสอบขอบเขตการให้บริการผ่าน สามารถดำเนินการให้คำปรึกษาได้"
}
```

### POST /v1/telemedicine/scope/override
Override validation result (pharmacist only)

**Request:**
```json
{
  "validationId": "uuid",
  "reason": "ผู้ป่วยมีประวัติการรักษาต่อเนื่องมา 2 ปี มีข้อมูล Lab ล่าสุดเมื่อ 8 เดือนที่แล้ว อาการคงที่ ไม่มีภาวะแทรกซ้อน จึงพิจารณาให้บริการได้"
}
```

### GET /v1/telemedicine/scope/history/:consultationId
Get validation history for a consultation

### GET /v1/telemedicine/scope/rules
Get all active scope rules

### POST /v1/telemedicine/scope/rules
Create new scope rule (admin only)

### PUT /v1/telemedicine/scope/rules/:ruleId
Update scope rule (admin only)

### POST /v1/telemedicine/scope/rules/:ruleId/activate
Activate a rule (admin only)

### POST /v1/telemedicine/scope/rules/:ruleId/deactivate
Deactivate a rule (admin only)

## Default Scope Rules

The system includes 13 pre-configured rules covering:

### Critical Rules (Priority 1-15)
1. **Prohibit Controlled Substances - Narcotics** (Priority 1)
2. **Prohibit Controlled Substances - Psychotropics** (Priority 1)
3. **Prohibit Acute Abdomen** (Priority 5)
4. **Prohibit Chest Pain** (Priority 5)
5. **Prohibit Difficulty Breathing** (Priority 5)
6. **Prohibit Altered Consciousness** (Priority 5)
7. **Prohibit Severe Allergic Reaction** (Priority 5)
8. **Prohibit Bleeding Symptoms** (Priority 10)
9. **Prohibit Severe Headache** (Priority 10)
10. **Flag High Fever** (Priority 15)

### Medium Priority Rules (Priority 20-35)
11. **Reject New Patient with Acute Condition** (Priority 20)
12. **Require Recent Visit for Follow-up** (Priority 25)
13. **Require Baseline Data for Chronic Condition** (Priority 30)
14. **Flag Pregnancy-Related Symptoms** (Priority 35)

## Rule Evaluation Logic

### 1. Symptom Check Rules
Matches patient symptoms against prohibited symptom lists:
- Case-insensitive matching
- Supports both Thai and English terms
- Partial string matching for flexibility

### 2. Medication Check Rules
Validates requested medications against controlled substance lists:
- Checks both drug name and generic name
- Blocks narcotics and psychotropics
- Supports Thai and English drug names

### 3. Patient Type Rules
Evaluates patient history:
- New patient + acute symptoms = reject
- Requires in-person visit for initial assessment

### 4. Baseline Data Rules
For chronic conditions:
- Requires lab results within 12 months
- Requires vital signs data
- Flags outdated baseline data for review

### 5. Time Since Last Visit Rules
Validates follow-up timeframe:
- Maximum 6 months since last consultation
- Ensures continuity of care
- Prevents gaps in treatment monitoring

## Validation Flow

```
1. Load Active Rules (sorted by priority)
   ↓
2. Get Patient History
   - Consultation count
   - Last consultation date
   - Baseline data status
   ↓
3. Build Validation Context
   - Patient history
   - Symptoms
   - Requested medications
   - Consultation type
   ↓
4. Evaluate Each Rule
   - Execute in priority order
   - Track triggered rules
   - Determine overall result
   ↓
5. Save Validation Result
   - Store in database
   - Log to audit trail
   ↓
6. Return Result
   - Overall result (passed/rejected/requires_review)
   - Triggered rules with details
   - User-friendly message
```

## Integration with Consultation Flow

```
Patient Request
   ↓
Scope Validation ← YOU ARE HERE
   ↓
├─ PASSED → E-Consent → Video Call
├─ REQUIRES_REVIEW → Pharmacist Review → Override or Reject
└─ REJECTED → Referral System → Hospital Recommendation
```

## Compliance Notes

### Legal Requirements (Telemedicine 2569)
- ✅ Validates consultation scope before service delivery
- ✅ Prevents pharmacists from handling cases outside their scope
- ✅ Provides audit trail for regulatory compliance
- ✅ Supports pharmacist professional judgment via override mechanism

### Audit Trail
All validation events are logged:
- Validation requests and results
- Triggered rules and reasoning
- Pharmacist overrides with justification
- Timestamps and actor information

### Quality Assurance
- Overridden consultations flagged for review
- Validation statistics tracked for compliance monitoring
- Rule effectiveness can be analyzed over time

## Testing

### Unit Tests
Test individual rule evaluation logic:
- Symptom matching
- Medication checking
- Patient type validation
- Baseline data requirements
- Time calculations

### Integration Tests
Test complete validation flow:
- Multiple rules triggering
- Priority-based execution
- Override mechanism
- Audit logging

### Property-Based Tests
Validate rule engine properties:
- Rule evaluation is deterministic
- Priority ordering is respected
- Audit trail is complete

## Configuration

### Environment Variables
```env
# Scope validation settings (optional - uses defaults)
SCOPE_VALIDATION_CACHE_TTL=300  # Cache validation results for 5 minutes
SCOPE_VALIDATION_MAX_RULES=100  # Maximum active rules
```

### Redis Caching
Validation results can be cached to improve performance:
- Cache key: `scope:cache:{consultationId}`
- TTL: 5 minutes (configurable)
- Invalidated on rule updates

## Monitoring

### Key Metrics
- Validation pass rate
- Rejection rate by rule type
- Override rate
- Average validation time
- Most frequently triggered rules

### Alerts
- High rejection rate (>15%)
- Frequent overrides (potential rule issues)
- Validation errors or timeouts

## Future Enhancements

1. **Machine Learning Integration**
   - Learn from pharmacist overrides
   - Suggest rule adjustments
   - Predict consultation outcomes

2. **Dynamic Rule Weights**
   - Adjust rule sensitivity based on outcomes
   - A/B testing for rule effectiveness

3. **Patient Risk Scoring**
   - Combine multiple factors into risk score
   - Personalized validation thresholds

4. **Integration with Hospital Systems**
   - Real-time baseline data retrieval
   - Automated referral tracking

## Support

For questions or issues:
- Review this README
- Check audit logs for validation details
- Contact telemedicine compliance team
