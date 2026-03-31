# Compliance Monitoring Module

**Task 13: Quality Metrics & Compliance Monitoring**

Real-time compliance monitoring and quality metrics tracking for the telemedicine system.

## Features

### Compliance Metrics

1. **KYC Success Rate** - Target: >95%
2. **Consultation Completion Rate** - Target: >90%
3. **Referral Rate** - Alert if >15%
4. **Consent Acceptance Rate** - Target: >98%
5. **License Compliance Rate** - Target: 100%
6. **Audit Trail Integrity** - Target: 100%
7. **Data Residency Compliance** - Target: 100%

### Quality Metrics

1. **Video Resolution** - Average resolution tracking
2. **Frame Rate** - Average FPS tracking
3. **Bandwidth** - Average bandwidth (Kbps)
4. **Connection Drop Rate** - Percentage of dropped connections
5. **Patient Satisfaction** - Post-consultation surveys

### Alerting System

- **Warning Alerts**: Metrics below target
- **Critical Alerts**: Serious compliance issues
- **Real-time Monitoring**: Continuous metric calculation
- **Weekly Reports**: Automated compliance summaries

## API Endpoints

### GET /v1/telemedicine/compliance/dashboard
Get real-time compliance dashboard metrics

**Query Parameters:**
- `startDate`: ISO date string (optional, defaults to last 30 days)
- `endDate`: ISO date string (optional, defaults to now)

**Response:**
```json
{
  "kycSuccessRate": 96.5,
  "consultationCompletionRate": 92.3,
  "referralRate": 12.1,
  "avgConsultationDuration": 15,
  "consentAcceptanceRate": 98.7,
  "licenseComplianceRate": 100,
  "auditTrailIntegrity": 100,
  "dataResidencyCompliant": true
}
```

### GET /v1/telemedicine/compliance/metrics
Get specific compliance metrics with date range

Same as `/dashboard` endpoint.

### GET /v1/telemedicine/compliance/quality-metrics
Get video quality metrics

**Query Parameters:**
- `startDate`: ISO date string (optional)
- `endDate`: ISO date string (optional)

**Response:**
```json
{
  "avgVideoResolution": "720p",
  "avgFrameRate": 30,
  "avgBandwidth": 1500,
  "connectionDropRate": 2.5,
  "patientSatisfactionScore": 4.5
}
```

### GET /v1/telemedicine/compliance/alerts
Get active compliance alerts

**Response:**
```json
[
  {
    "id": "kyc-success-rate",
    "type": "warning",
    "metric": "KYC Success Rate",
    "message": "อัตราความสำเร็จของ KYC ต่ำกว่าเป้าหมาย (94.5% < 95%)",
    "threshold": 95,
    "currentValue": 94.5,
    "timestamp": "2026-03-31T10:00:00Z"
  }
]
```

### GET /v1/telemedicine/compliance/weekly-report
Generate weekly compliance summary report

**Response:**
```json
{
  "period": {
    "start": "2026-03-24T00:00:00Z",
    "end": "2026-03-31T00:00:00Z"
  },
  "metrics": { ... },
  "qualityMetrics": { ... },
  "alerts": [ ... ],
  "summary": "อัตราความสำเร็จของ KYC: 96.5%\n..."
}
```

### GET /v1/telemedicine/compliance/scorecard
Get compliance scorecard with grading

**Response:**
```json
{
  "overallScore": 95,
  "scores": {
    "kyc": 98,
    "consultation": 95,
    "referral": 100,
    "license": 100,
    "audit": 100,
    "dataResidency": 100
  },
  "grade": "A"
}
```

**Grading Scale:**
- A+ (95-100): Excellent compliance
- A (90-94): Very good compliance
- B+ (85-89): Good compliance
- B (80-84): Acceptable compliance
- C+ (75-79): Needs improvement
- C (70-74): Significant issues
- D+ (65-69): Critical issues
- D (60-64): Severe non-compliance
- F (<60): Unacceptable

### POST /v1/telemedicine/compliance/survey
Submit patient satisfaction survey

**Request Body:**
```json
{
  "consultationId": "uuid",
  "patientId": "uuid",
  "rating": 5,
  "feedback": "บริการดีมาก"
}
```

**Response:**
```json
{
  "submitted": true,
  "consultationId": "uuid",
  "rating": 5
}
```

## Metric Calculation

### KYC Success Rate
```
(Completed KYC / Total KYC Attempts) × 100
```

### Consultation Completion Rate
```
(Completed Consultations / Total Consultations) × 100
```

### Referral Rate
```
(Emergency Referrals / Total Consultations) × 100
```

### License Compliance Rate
```
(Valid Licenses / Total Pharmacists) × 100
```

### Connection Drop Rate
```
(Total Connection Drops / Total Consultations) × 100
```

## Alert Thresholds

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| KYC Success Rate | >95% | <95% | <90% |
| Consultation Completion | >90% | <90% | <85% |
| Referral Rate | <15% | >15% | >20% |
| License Compliance | 100% | <100% | <95% |
| Audit Integrity | 100% | <100% | <100% |

## Monitoring Dashboard

The compliance dashboard provides:

1. **Real-time Metrics**: Updated continuously
2. **Historical Trends**: 30-day rolling window
3. **Alert Status**: Active warnings and critical issues
4. **Quality Indicators**: Video and service quality
5. **Compliance Score**: Overall grade (A-F)

## Weekly Reports

Automated weekly reports include:

- Compliance metrics summary
- Quality metrics summary
- Active alerts
- Trend analysis
- Recommendations

Reports are generated every Monday at 8 AM.

## Environment Variables

```bash
# Compliance Monitoring
COMPLIANCE_KYC_SUCCESS_RATE_TARGET=95
COMPLIANCE_CONSULTATION_COMPLETION_RATE_TARGET=90
COMPLIANCE_REFERRAL_RATE_THRESHOLD=15
COMPLIANCE_LICENSE_COMPLIANCE_TARGET=100
```

## Testing

```bash
# Unit tests
pnpm test compliance-monitor.service.spec.ts

# Integration tests
pnpm test:e2e compliance.e2e-spec.ts
```

## Related Modules

- **KYC Module**: Provides KYC success rate data
- **Consultation Module**: Provides consultation metrics
- **Referral Module**: Provides referral rate data
- **License Module**: Provides license compliance data
- **Audit Module**: Provides audit trail integrity

## Future Enhancements

- [ ] Patient satisfaction survey system
- [ ] Automated alert notifications (email/LINE)
- [ ] Predictive analytics for compliance trends
- [ ] Integration with external monitoring tools
- [ ] Custom metric definitions
- [ ] Compliance report exports (PDF/CSV)

## References

- Requirements 10.1-10.16
- Task 13 in implementation plan
- Thai Telemedicine 2569 compliance standards
