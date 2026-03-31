/**
 * Default Scope Rules for Telemedicine 2569 Compliance
 *
 * These rules validate whether a telemedicine consultation request
 * is within the legal scope of practice for pharmacists in Thailand.
 */

export interface ScopeRuleSeed {
  ruleType: string;
  ruleName: string;
  condition: Record<string, any>;
  action: 'allow' | 'reject' | 'flag_review';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  priority: number;
}

export const defaultScopeRules: ScopeRuleSeed[] = [
  // ============================================================================
  // CRITICAL RULES - Prohibited Symptoms (Priority 1-15)
  // ============================================================================
  {
    ruleType: 'symptom_check',
    ruleName: 'Prohibit Acute Abdomen',
    condition: {
      prohibitedSymptoms: [
        'ปวดท้องมาก',
        'ท้องแข็ง',
        'ปวดท้องเฉียบพลัน',
        'severe abdominal pain',
        'rigid abdomen',
        'acute abdomen',
      ],
    },
    action: 'reject',
    severity: 'critical',
    message:
      '🚨 อาการปวดท้องเฉียบพลันต้องได้รับการตรวจร่างกายโดยแพทย์ กรุณาไปโรงพยาบาลทันที หรือโทร 1669',
    priority: 5,
  },
  {
    ruleType: 'symptom_check',
    ruleName: 'Prohibit Chest Pain',
    condition: {
      prohibitedSymptoms: [
        'เจ็บหน้าอก',
        'แน่นหน้าอก',
        'ปวดหน้าอก',
        'chest pain',
        'chest tightness',
        'chest pressure',
      ],
    },
    action: 'reject',
    severity: 'critical',
    message:
      '🚨 อาการเจ็บหน้าอกอาจเป็นสัญญาณของโรคหัวใจ กรุณาไปโรงพยาบาลทันที หรือโทร 1669',
    priority: 5,
  },
  {
    ruleType: 'symptom_check',
    ruleName: 'Prohibit Difficulty Breathing',
    condition: {
      prohibitedSymptoms: [
        'หอบเหนื่อย',
        'หายใจลำบาก',
        'หายใจไม่ออก',
        'difficulty breathing',
        'shortness of breath',
        'dyspnea',
      ],
    },
    action: 'reject',
    severity: 'critical',
    message:
      '🚨 อาการหายใจลำบากต้องได้รับการประเมินโดยแพทย์ กรุณาไปโรงพยาบาลทันที หรือโทร 1669',
    priority: 5,
  },
  {
    ruleType: 'symptom_check',
    ruleName: 'Prohibit Severe Headache',
    condition: {
      prohibitedSymptoms: [
        'ปวดหัวรุนแรง',
        'ปวดหัวมาก',
        'ปวดหัวเฉียบพลัน',
        'severe headache',
        'worst headache',
        'sudden headache',
      ],
    },
    action: 'reject',
    severity: 'critical',
    message:
      '🚨 อาการปวดหัวรุนแรงอาจเป็นสัญญาณของโรคร้ายแรง กรุณาไปโรงพยาบาลทันที',
    priority: 10,
  },
  {
    ruleType: 'symptom_check',
    ruleName: 'Prohibit Altered Consciousness',
    condition: {
      prohibitedSymptoms: [
        'สลบ',
        'หมดสติ',
        'ซึม',
        'สับสน',
        'unconscious',
        'loss of consciousness',
        'confusion',
        'altered mental status',
      ],
    },
    action: 'reject',
    severity: 'critical',
    message:
      '🚨 อาการสติสัมปชัญญะเปลี่ยนแปลงต้องได้รับการดูแลฉุกเฉิน กรุณาโทร 1669 ทันที',
    priority: 5,
  },

  // ============================================================================
  // HIGH PRIORITY RULES - Controlled Substances (Priority 1-5)
  // ============================================================================
  {
    ruleType: 'medication_check',
    ruleName: 'Prohibit Controlled Substances - Narcotics',
    condition: {
      controlledSubstances: [
        'tramadol',
        'codeine',
        'morphine',
        'fentanyl',
        'oxycodone',
        'hydrocodone',
        'ทรามาดอล',
        'โคเดอีน',
        'มอร์ฟีน',
        'เฟนทานิล',
      ],
    },
    action: 'reject',
    severity: 'critical',
    message:
      '❌ ไม่สามารถจ่ายยาเสพติดให้โทษผ่านระบบเภสัชกรรมทางไกลได้ กรุณาพบแพทย์เพื่อรับใบสั่งยา',
    priority: 1,
  },
  {
    ruleType: 'medication_check',
    ruleName: 'Prohibit Controlled Substances - Psychotropics',
    condition: {
      controlledSubstances: [
        'alprazolam',
        'diazepam',
        'lorazepam',
        'clonazepam',
        'zolpidem',
        'methylphenidate',
        'แอลพราโซแลม',
        'ไดอาซีแพม',
        'ลอราซีแพม',
        'โคลนาซีแพม',
        'โซลพิเดม',
      ],
    },
    action: 'reject',
    severity: 'critical',
    message:
      '❌ ไม่สามารถจ่ายยาควบคุมพิเศษผ่านระบบเภสัชกรรมทางไกลได้ กรุณาพบแพทย์เพื่อรับใบสั่งยา',
    priority: 1,
  },

  // ============================================================================
  // MEDIUM PRIORITY RULES - Patient Type & Symptoms (Priority 15-25)
  // ============================================================================
  {
    ruleType: 'symptom_check',
    ruleName: 'Flag High Fever',
    condition: {
      prohibitedSymptoms: [
        'ไข้สูงเกิน 39',
        'ไข้สูงมาก',
        'high fever above 39',
        'fever over 39',
      ],
    },
    action: 'flag_review',
    severity: 'high',
    message:
      '⚠️ ไข้สูงเกิน 39°C ต้องได้รับการประเมินโดยเภสัชกร อาจต้องส่งต่อแพทย์',
    priority: 15,
  },
  {
    ruleType: 'patient_type_check',
    ruleName: 'Reject New Patient with Acute Condition',
    condition: {
      rejectNewPatientWithAcute: true,
    },
    action: 'reject',
    severity: 'high',
    message:
      '❌ ผู้ป่วยใหม่ที่มีอาการเฉียบพลันต้องพบแพทย์เพื่อตรวจร่างกายก่อน ไม่สามารถให้บริการผ่านเภสัชกรรมทางไกลได้',
    priority: 20,
  },

  // ============================================================================
  // BASELINE DATA & FOLLOW-UP RULES (Priority 25-35)
  // ============================================================================
  {
    ruleType: 'baseline_data_check',
    ruleName: 'Require Baseline Data for Chronic Condition',
    condition: {
      maxBaselineAgeMonths: 12,
    },
    action: 'flag_review',
    severity: 'medium',
    message:
      '⚠️ ผู้ป่วยโรคเรื้อรังต้องมีข้อมูลพื้นฐาน (Lab results, Vital signs) ที่ไม่เกิน 12 เดือน',
    priority: 30,
  },
  {
    ruleType: 'time_since_last_visit',
    ruleName: 'Require Recent Visit for Follow-up',
    condition: {
      maxMonthsSinceLastVisit: 6,
    },
    action: 'flag_review',
    severity: 'medium',
    message:
      '⚠️ ผู้ป่วยติดตามต้องมีประวัติการพบแพทย์ภายใน 6 เดือน กรุณาตรวจสอบประวัติการรักษา',
    priority: 25,
  },

  // ============================================================================
  // ADDITIONAL SAFETY RULES (Priority 35-50)
  // ============================================================================
  {
    ruleType: 'symptom_check',
    ruleName: 'Flag Bleeding Symptoms',
    condition: {
      prohibitedSymptoms: [
        'เลือดออก',
        'อาเจียนเป็นเลือด',
        'ถ่ายเป็นเลือด',
        'bleeding',
        'vomiting blood',
        'blood in stool',
        'hematemesis',
        'melena',
      ],
    },
    action: 'reject',
    severity: 'critical',
    message:
      '🚨 อาการเลือดออกต้องได้รับการตรวจรักษาโดยแพทย์ทันที กรุณาไปโรงพยาบาล',
    priority: 10,
  },
  {
    ruleType: 'symptom_check',
    ruleName: 'Flag Pregnancy-Related Symptoms',
    condition: {
      prohibitedSymptoms: [
        'ตั้งครรภ์',
        'ท้อง',
        'คลอด',
        'pregnant',
        'pregnancy',
        'labor',
        'contractions',
      ],
    },
    action: 'flag_review',
    severity: 'high',
    message:
      '⚠️ อาการที่เกี่ยวข้องกับการตั้งครรภ์ต้องได้รับการประเมินโดยเภสัชกร',
    priority: 35,
  },
  {
    ruleType: 'symptom_check',
    ruleName: 'Flag Severe Allergic Reaction',
    condition: {
      prohibitedSymptoms: [
        'แพ้ยารุนแรง',
        'ลมพิษ',
        'บวมที่ใบหน้า',
        'severe allergic reaction',
        'anaphylaxis',
        'angioedema',
        'facial swelling',
      ],
    },
    action: 'reject',
    severity: 'critical',
    message:
      '🚨 อาการแพ้รุนแรงต้องได้รับการดูแลฉุกเฉิน กรุณาโทร 1669 หรือไปโรงพยาบาลทันที',
    priority: 5,
  },
];

/**
 * Seed scope rules into database
 */
export async function seedScopeRules(db: any): Promise<void> {
  console.log('🌱 Seeding default scope rules...');

  for (const rule of defaultScopeRules) {
    await db.insert('scope_rules').values({
      ruleType: rule.ruleType,
      ruleName: rule.ruleName,
      condition: rule.condition,
      action: rule.action,
      severity: rule.severity,
      message: rule.message,
      priority: rule.priority,
      isActive: true,
    });
  }

  console.log(`✅ Seeded ${defaultScopeRules.length} scope rules`);
}
