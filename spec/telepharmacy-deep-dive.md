# LINE Telepharmacy ERP — Telepharmacy Deep Dive

> วันที่: 2026-03-30  
> สถานะ: Draft  
> ส่วนที่เจาะลึกเฉพาะด้าน Telepharmacy สำหรับรวมเข้าใน Requirements Document

---

## 1. กฎหมายและกฎระเบียบที่เกี่ยวข้อง (Thailand)

### 1.1 กฎหมายหลัก

| กฎหมาย | เลขที่ | สิ่งที่ควบคุม |
|---------|--------|----------------|
| **พ.ร.บ.ยา** | พ.ศ. 2510 (แก้ไขหลายฉบับ) | การจำหน่ายยา, ใบอนุญาต, บัญชียา |
| **พ.ร.บ.วิชาชีพเภสัชกรรม** | พ.ศ. 2537 | สิทธิและหน้าที่เภสัชกร |
| **พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)** | พ.ศ. 2562 | ข้อมูลสุขภาพผู้ป่วย |
| **พ.ร.บ.ธุรกรรมอิเล็กทรอนิกส์** | พ.ศ. 2562 | ลายเซ็นอิเล็กทรอนิกส์ |
| **ประกาศ สภาเภสัชกรรม 56/2563** | 2 มิ.ย. 2563 | มาตรฐาน Telepharmacy |
| **ประกาศ กระทรวงสาธารณสุข (Telepharmacy)** | คาดว่าออกปลาย 2025 | กฎระเบียบ Telepharmacy ใหม่ (FDA) |
| **พ.ร.บ.วัตถุออกฤทธิ์ต่อจิตและประสาท** | พ.ร.บ. พ.ศ. 2518 | ยาจิตเวช, ยาเสพติด |
| **พ.ร.บ.ยาเสพติดให้โทษ** | พ.ศ. 2522 | ยาเสพติดประเภทต่างๆ |

### 1.2 การจำแนกยาในประเทศไทย (พ.ร.บ.ยา พ.ศ. 2510)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ความเข้มงวดในการควบคุม                        │
│                   (สูง → ต่ำ)                                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────┐ │
│  │ ยาควบคุมพิเศษ │  │   ยาอันตราย   │  │ ยาบรรจุเสร็จ  │  │  HHR  │ │
│  │ (Specially    │  │ (Dangerous   │  │ (ไม่ใช่ยา     │  │       │ │
│  │  Controlled)  │  │  Drug)       │  │ อันตราย/     │  │       │ │
│  │              │  │              │  │ ควบคุมพิเศษ)  │  │       │ │
│  │              │  │              │  └──────────────┘  │       │ │
│  │ ใบสั่งแพทย์  │  │ เภสัชกรจ่าย │  │ เภสัชกรจ่าย  │  │ จำหน่าย│ │
│  │ + เภสัชกร   │  │ (ไม่ต้องมี    │  │ (ไม่ต้องมี    │  │ ทั่วไป│ │
│  │ + สถานพยาบาล│  │  ใบสั่งแพทย์) │  │  ใบสั่งแพทย์) │  │       │ │
│  └──────────────┘  └──────────────┘                    └───────┘ │
│                                                                  │
│  ตัวอย่าง:         ตัวอย่าง:         ตัวอย่าง:       ตัวอย่าง:  │
│  มอร์ฟีน          อะม็อกซีซิลลิน   ยาแก้แพ้       พารา    │
│  เฟนทานิล         ไอบูโพรเฟน     ยาคลื่นไส้     เซตามอล │
│  เคมีบำบัด        เอนาลาพริล                      ยาธาตุ  │
│  ยากลุ่มฮอร์โมน  ยาปฏิชีวนะ                      น้ำขาว  │
│  ยาจิตเภสัช       ยาลดความดัน                               │
│  ยาเสพติดบางชนิด  ยาแก้อักเสบ                               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 ยาควบคุมพิเศษ — รายละเอียด

ยาควบคุมพิเศษแบ่งเป็นกลุ่มต่างๆ ตามประกาศ รมว.สาธารณสุข:

| กลุ่ม | ตัวอย่าง | ข้อกำหนดพิเศษ |
|-------|---------|----------------|
| ยาเคมีบำบัด (Anti-neoplastics) | Methotrexate, Cyclophosphamide | บันทึกการใช้ละเอียด, เภสัชกรต้องคุมเอง |
| ยากลุ่มฮอร์โมน (Corticosteroids) | Dexamethasone, Prednisolone (บางขนาด) | บันทึก, ใช้ภายใต้ดูแลแพทย์ |
| ยารักษาโรคจิตเภท (Antipsychotics) | Haloperidol, Chlorpromazine | บันทึก, ติดตามผลข้างเคียง |
| ยากลุ่ม Barbiturates | Phenobarbital | บันทึก, เสี่ยงเสพติด |
| ยากลุ่มสงบประสาท (Tranquilizers) | Diazepam, Alprazolam | บันทึก, ควบคุมปริมาณ |
| ยากลุ่มรักษาลมบ้าหมู (Antiepileptics) | Phenytoin, Valproic acid | บันทึก, monitor levels |
| ยากลุ่มรักษาวัณโรค (Antituberculous) | Isoniazid, Rifampicin | บันทึก, ติดตาม compliance |
| ยาเลขที่ 5 จัดเป็นยาควบคุมพิเศษ | Oseltamivir, Thalidomide | บันทึกพิเศษ |

### 1.4 ข้อกำหนดจากประกาศ สภาเภสัชกรรม 56/2563

**Telepharmacy คือ:**
> การบริการทางเภสัชกรรม (Pharmaceutical Care) และการให้บริการที่เกี่ยวเนื่องแก่ผู้ป่วยหรือผู้รับบริการ โดยเภสัชกรสื่อสารกับผู้ป่วยได้ด้วยเทคโนโลยีการสื่อสาร รวมทั้งการส่งมอบยา

**มาตรฐานที่ระบบต้องมี:**

1. **ระบบลงทะเบียนผู้ป่วย** (Patient Registration)
   - ชื่อ, นามสกุล, เลขบัตรประชาชน, วันเกิด
   - ประวัติแพ้ยา (Drug Allergies)
   - ประวัติโรคประจำตัว
   - ยาที่ใช้อยู่ในปัจจุบัน (Current Medications)

2. **ระบบ Patient Profile / Medical Records**
   - เก็บข้อมูลอย่างเป็นความลับ
   - สามารถเข้าถึงได้ตามสิทธิ์
   - แก้ไขได้ พร้อม audit trail

3. **ระบบบันทึกเสียง/วิดีโอการให้คำปรึกษา**
   - บันทึกการสื่อสารทุกครั้ง (audio/video)
   - เก็บไว้เป็นหลักฐาน
   - เข้าถึงได้ตามสิทธิ์

4. **ระบบวิเคราะห์ใบสั่งยา**
   - ตรวจสอบความเหมาะสมของยา (Drug Appropriateness)
   - ตรวจ Drug Interaction
   - ตรวจ Adverse Drug Reaction (ADR)
   - หา Drug-Related Problems (DRPs)

5. **ระบบส่งต่อผู้ป่วย**
   - ถ้าพบปัญหาที่ต้องส่งแพทย์ → มี channel ส่งต่อ

6. **มาตรฐานการส่งมอบยา**
   - ควบคุมอุณหภูมิระหว่างจัดส่ง (Cold Chain)
   - ป้องกันยาสูญหาย
   - ระบบ Tracking

---

## 2. โมดูล Telepharmacy — รายละเอียดเต็ม

### 2.1 Patient Management (ระบบจัดการผู้ป่วย)

#### 2.1.1 Patient Registration

| Field | Type | หมายเหตุ |
|-------|------|----------|
| patient_id | UUID | PK |
| hn | string | Hospital Number (ถ้ามี — จากโรงพยาบาล) |
| national_id | string | เลขบัตรประชาชน (13 หลัก) — **PDPA sensitive** |
| prefix | enum | นาย, นาง, นางสาว, เด็กชาย, เด็กหญิง |
| first_name | string | ชื่อ |
| last_name | string | นามสกุล |
| birth_date | date | วันเกิด |
| gender | enum | male, female, other |
| blood_type | enum | A, B, AB, O, unknown |
| weight | decimal | น้ำหนัก (kg) — สำคัญต่อการคำนวณขนาดยา |
| height | decimal | ส่วนสูง (cm) |
| phone | string | เบอร์โทร |
| email | string | |
| address | text | ที่อยู่ |
| emergency_contact_name | string | ผู้ติดต่อฉุกเฉิน |
| emergency_contact_phone | string | |
| allergies | json | ประวัติแพ้ยา — **CRITICAL** |
| chronic_diseases | json | โรคประจำตัว |
| current_medications | json | ยาที่รับประทานอยู่ตอนนี้ |
| insurance_type | enum | `none`, `government`, `social_security`, `private` |
| insurance_id | string | เลขประกันสุขภาพ |
| customer_id | UUID | FK → customers (ถ้าเป็นลูกค้า B2B) |
| registered_via | enum | `line`, `walk_in`, `hospital`, `referral` |
| consent_given_at | datetime | ยินยอม PDPA |
| line_user_id | string | สำหรับส่งผลลัพธ์ผ่าน LINE |
| status | enum | `active`, `inactive`, `deceased` |
| created_at | datetime | |
| updated_at | datetime | |

#### 2.1.2 Drug Allergy Record (ระบบแพ้ยา — สำคัญมาก)

| Field | Type | หมายเหตุ |
|-------|------|----------|
| allergy_id | UUID | PK |
| patient_id | UUID | FK |
| drug_name | string | ชื่อยาที่แพ้ |
| generic_name | string | ชื่อสามัญ |
| reaction_type | enum | `allergic`, `side_effect`, `intolerance`, `contraindication` |
| severity | enum | `mild`, `moderate`, `severe`, `life_threatening` |
| symptoms | text | อาการ เช่น ผื่น, หายใจลำบาก, บวม |
| onset | string | เริ่มเป็นเมื่อไหร่ (เช่น "ทันที", "2-3 ชม.") |
| source | enum | `patient_reported`, `doctor_diagnosed`, `pharmacist_identified`, `system_detected` |
| verified_by | UUID | FK → pharmacists (ผู้ยืนยัน) |
| notes | text | |
| reported_date | date | วันที่รายงาน |

**⚠️ ระบบต้อง:**
- เตือนทุกครั้งที่มีการจ่ายยาที่คนไข้แพ้ (HARD STOP)
- แสดงเตือนสำหรับ cross-allergy (เช่น แพ้ Penicillin → เตือน Amoxicillin)
- บันทึกการเปลี่ยนแปลงทุกครั้ง

#### 2.1.3 Medical History

| Record Type | รายละเอียด |
|-------------|------------|
| **ประวัติโรคประจำตัว** | เบาหวาน, ความดัน, หัวใจ, ไต, ตับ, มะเร็ง, ฯลฯ |
| **ประวัติการผ่าตัด** | วันที่, รายละเอียด |
| **ประวัติการตั้งครรภ์** | ระยะ, LMP, ให้นมบุตร (breastfeeding?) |
| **ยาที่ใช้อยู่ปัจจุบัน** | ชื่อยา, ขนาด, วิธีใช้, แพทย์ผู้สั่ง |
| **อาหารเสริม / สมุนไพร** | ชื่อ, ขนาด, ความถี่ |

### 2.2 Prescription Management (ระบบจัดการใบสั่งยา)

#### 2.2.1 ประเภทใบสั่งยาที่ระบบรับ

| ประเภท | รายละเอียด | Workflow |
|--------|------------|----------|
| **ใบสั่งยาจากแพทย์ (Paper Rx)** | ลูกค้าถ่ายรูปส่งผ่าน LINE | OCR → AI pre-check → เภสัชกร verify |
| **ใบสั่งยาอิเล็กทรอนิกส์ (e-Prescription)** | ส่งจาก HIS ของโรงพยาบาล | API receive → เภสัชกร verify |
| **ใบสั่งยาที่ส่งต่อ (Transfer Rx)** | จากร้านขายยาอื่น | Verify → จ่ายต่อ |
| **ยาไม่ต้องมีใบสั่ง (OTC/DD)** | ลูกค้าสั่งเองผ่าน LINE | เภสัชกร review (สำหรับ DD) หรือ auto (สำหรับ HHR) |

#### 2.2.2 Prescription Data Model (ขยายจาก Requirements หลัก)

```
Prescription (ใบสั่งยา)
├── Header
│   ├── rx_no (เลขที่ใบสั่งยา)
│   ├── rx_date (วันออกใบสั่ง)
│   ├── prescriber (แพทย์ผู้สั่ง)
│   │   ├── name
│   │   ├── license_no (เลขที่ใบอนุญาตประกอบโรคศิลปะ)
│   │   ├── hospital
│   │   └── department
│   ├── patient (คนไข้)
│   │   ├── name, age, weight
│   │   ├── diagnosis (วินิจฉัย — ถ้ามี)
│   │   └── allergies
│   ├── source (paper, electronic, transfer)
│   ├── images[] (รูปใบสั่งยา — หลายรูปได้)
│   └── ocr_result (ผล OCR)
│
├── Items (รายการยา)
│   ├── drug_name (ชื่อยาบนใบสั่ง)
│   ├── generic_name (ชื่อสามัญ)
│   ├── strength (ขนาด เช่น 500mg)
│   ├── dosage_form (รูปแบบ เช่น tablet, syrup)
│   ├── quantity (จำนวน)
│   ├── sig (วิธีใช้ เช่น 1x1 หลังอาหาร)
│   ├── duration (ระยะเวลา เช่น 7 วัน)
│   ├── refills (จำนวนครั้งที่สามารถจ่ายซ้ำ)
│   ├── matched_product_id → products (match กับสต็อก)
│   ├── substitution (การเปลี่ยนยา — ถ้ามี)
│   │   ├── original_drug
│   │   ├── substituted_drug
│   │   ├── reason (เช่น สต็อกหมด, ราคาถูกกว่า, generic)
│   │   └── approved (ผู้อนุมัติ)
│   └── checks[]
│       ├── drug_interaction_check
│       ├── allergy_check
│       ├── dosage_check
│       └── contraindication_check
│
├── Verification (การตรวจสอบ)
│   ├── pharmacist_id
│   ├── verified_at
│   ├── clinical_notes (บันทึกทางคลินิก)
│   ├── interventions[] (การแทรกแทรง)
│   │   ├── type (dose_adjustment, drug_change, counseling, referral)
│   │   ├── description
│   │   ├── reason
│   │   └── prescriber_contacted (ติดต่อแพทย์หรือยัง)
│   ├── status (approved, rejected, partial, referred)
│   └── digital_signature (ลายเซ็นดิจิทัล)
│
└── Dispensing (การจ่ายยา)
    ├── dispensed_at
    ├── dispenser_id (เภสัชกรผู้จ่าย)
    ├── items_dispensed[]
    │   ├── product_id
    │   ├── lot_id
    │   ├── quantity_dispensed
    │   ├── expiry_date (ของ lot ที่จ่าย)
    │   └── label_printed (พิมพ์ฉลากแล้ว)
    ├── counseling_provided (ให้คำปรึกษาแล้วหรือยัง)
    ├── counseling_method (video, voice, chat, face_to_face)
    ├── counseling_recording_url (ไฟล์บันทึก — audio/video)
    ├── patient_confirmed (คนไข้ยืนยันรับยาแล้ว)
    └── delivery_info (ถ้าส่งมอบทางไกล)
```

#### 2.2.3 Pharmacist Verification Workflow (ละเอียด)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESCRIPTION WORKFLOW                        │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Received │───>│ AI Check │───>│ Queue    │───>│ Pharmacist│  │
│  │ (รูป/Rx)  │    │ (Pre)    │    │ (รอ verify)│   │ Review   │  │
│  └──────────┘    └──────────┘    └──────────┘    └─────┬────┘  │
│                                        │               │       │
│                                        │        ┌──────┴──────┐│
│                                        │        ▼             ▼│
│                                        │   ┌────────┐  ┌────────┐
│                                        │   │Approve │  │ Reject │
│                                        │   └───┬────┘  └───┬────┘
│                                        │       │           │    │
│                                        │       ▼           ▼    │
│                                        │  ┌────────┐  ┌────────┐
│                                        │  │Dispense│  │Notify │
│                                        │  │+Counsel│  │Patient │
│                                        │  └───┬────┘  └────────┘
│                                        │      │                │
│                                        ▼      ▼                │
│                                    ┌──────────┐               │
│                                    │Delivered │               │
│                                    └──────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

**Step 1: รับใบสั่งยา**
- ลูกค้าส่งรูปผ่าน LINE (อาจหลายรูป)
- ระบบสร้าง Prescription record
- แจ้งลูกค้า: "ได้รับใบสั่งยาแล้ว กำลังตรวจสอบ..."

**Step 2: AI Pre-check (อัตโนมัติ)**
- OCR อ่านข้อมูลใบสั่งยา:
  - ชื่อแพทย์, โรงพยาบาล
  - ชื่อคนไข้
  - รายการยา + ขนาด + จำนวน
- Auto-match กับ Product database:
  - พบสินค้าตรง → แสดงราคา, สต็อก
  - ไม่พบ → flag ว่าไม่มีสินค้านี้
  - พบหลายตัวเลือก → แสดงให้เภสัชกรเลือก
- Drug Safety Checks:
  - ✅ Allergy cross-check (ตรงกับ patient record?)
  - ✅ Drug-drug interaction (ยาในใบสั่งกับยาที่คนไข้ใช้อยู่?)
  - ✅ Dose range check (ขนาดปกติอยู่ในช่วงไหม? ต่อน้ำหนัก?)
  - ✅ Duplicate therapy check (มียากลุ่มเดียวกันซ้ำไหม?)
  - ✅ Contraindication check (โรคประจำตัว vs ยา)
  - ⚠️ Pregnancy/Lactation check (ถ้าเป็นหญิงในวัยเจริญ)
- **ผล AI แสดงเป็น flag:**
  - 🟢 ไม่พบปัญหา
  - 🟡 ต้อง review (เช่น dose สูงกว่าปกติเล็กน้อย)
  - 🔴 พบปัญหารุนแรง (contraindicated, severe interaction)

**Step 3: เข้าคิวรอเภสัชกร**
- Priority queue:
  - 🔴 High: ยาควบคุมพิเศษ, พบ severe interaction
  - 🟡 Medium: ยาอันตราย, พบ moderate issue
  - 🟢 Low: OTC, ไม่พบปัญหา
- SLA: เภสัชกรต้อง review ภายในเวลาที่กำหนด
  - ยาควบคุมพิเศษ: 30 นาที
  - ยาอันตราย: 1 ชม.
  - OTC: 2 ชม.

**Step 4: เภสัชกร Review**
- ดูภาพใบสั่งยาต้นฉบับ
- ดูผล AI pre-check
- ดู patient profile (allergies, diseases, current meds)
- ตัดสินใจ:
  - **Approve (อนุมัติทั้งหมด)** → ไปจ่ายยา
  - **Partial Approve (อนุมัติบางรายการ)** → จ่ายที่ได้ + อธิบายที่ไม่ได้
  - **Reject (ปฏิเสธ)** → แจ้งลูกค้า + เหตุผล + แนะนำทางเลือก
  - **Refer (ส่งต่อแพทย์)** → ติดต่อแพทย์เพื่อยืนยัน/เปลี่ยนยา

**Step 5: การแทรกแทรงทางเภสัชกรรม (Pharmaceutical Interventions)**
- บันทึกทุกครั้งที่เภสัชกรแทรกแทรง:
  - เปลี่ยนขนาดยา (เช่น แพทย์สั่งผิด → ติดต่อแพทย์ → แก้ไข)
  - เปลี่ยนยา (เช่น แพ้ → เปลี่ยนเป็นกลุ่มอื่น)
  - ให้คำปรึกษาเพิ่มเติม (เช่น ยานี้ต้องกินหลังอาหาร)
  - ส่งต่อแพทย์ (เช่น ยากับโรคไม่ match)
- Rate intervention ตามมาตรฐานสากล

**Step 6: การจ่ายยา (Dispensing)**
- เลือก lot ตาม FEFO (First Expired First Out)
- ตรวจสอบ expiry (อย่างน้อย 6 เดือนที่เหลือ — ยกเว้นตาม policy)
- พิมพ์ฉลากยา:
  - ชื่อคนไข้
  - ชื่อยา, ขนาด
  - วิธีใช้ (Sig)
  - คำเตือน (Warning)
  - เลข Lot, Expiry
  - ชื่อร้าน, เลขที่ใบอนุญาต
  - วันที่จ่าย, เภสัชกรผู้จ่าย
- ตัดสต็อก (Stock Movement → sale_out)

**Step 7: การให้คำปรึกษา (Patient Counseling)**
- **บังคับตามกฎหมาย** — เภสัชกรต้องให้คำปรึกษาทุกครั้ง
- ช่องทาง:
  - 📹 Video call (แนะนำ — ตามประกาศ 56/2563)
  - 📞 Voice call
  - 💬 Chat (LINE)
  - 🏥 ตัวต่อตัว (walk-in)
- เนื้อหาคำปรึกษา:
  - ชื่อยา + วัตถุประสงค์
  - ขนาด + วิธีใช้ + เวลา
  - ระยะเวลาที่ต้องรับประทาน
  - ผลข้างเคียงที่อาจเกิด
  - ข้อห้าม / คำเตือน
  - อาหาร/ยาที่ควรหลีกเลี่ยง
  - ถ้าลืมรับประทานทำอย่างไร
  - เก็บยาอย่างไร (อุณหภูมิ)
- **บันทึกเป็น audio/video** (ตามประกาศ 56/2563)
- คนไข้ยืนยันว่าเข้าใจแล้ว

**Step 8: ส่งมอบยา (Delivery)**
- ตามมาตรฐาน สภาเภสัชกรรม 56/2563:
  - ควบคุมอุณหภูมิ (Cold Chain — สำหรับยาที่ต้องเก็บเย็น)
  - ป้องกันยาสูญหาย
  - ระบบ Tracking
- ผู้รับยาต้องยืนยันตัวตน:
  - ชื่อตรงกับใบสั่งยา
  - ถ้าเป็นญาติ → ต้องแสดงหนังสือมอบฉันทะ
- ถ้าส่งผ่าน LINE → ยืนยันด้วย OTP หรือ LINE Login

### 2.3 Drug Interaction Database

#### 2.3.1 ประเภท Drug Interaction

| Level | ระดับ | Action |
|-------|--------|--------|
| **Contraindicated** | 🔴 ห้ามใช้ร่วมกัน | หยุดจ่าย แจ้งแพทย์ทันที |
| **Major — Severe** | 🔴 อันตราย | ห้ามจ่าย เว้นแต่แพทย์ยืนยันเป็นลายลักษณ์อักษร |
| **Moderate** | 🟡 รุนแรงปานกลาง | จ่ายได้ แต่ต้องมีการ monitor + แจ้งคนไข้ |
| **Minor** | 🟢 เล็กน้อย | จ่ายได้ แจ้งคนไข้หากมีอาการ |

#### 2.3.2 ประเภท Interaction

| ประเภท | ตัวอย่าง |
|--------|---------|
| **Drug-Drug** | Warfarin + Aspirin → เลือดออกง่าย |
| **Drug-Food** | Statin + Grapefruit juice → เพิ่มระดับยาในเลือด |
| **Drug-Disease** | NSAID + โรคไต → ทำลายไต |
| **Drug-Pregnancy** | Isotretinoin + ตั้งครรภ์ → ทำร้ายทารก |
| **Drug-Lactation** | ยาบางตัวผ่านน้ำนม → อันตรายต่อทารก |

#### 2.3.3 Dose Range Check

| Check | รายละเอียด |
|-------|------------|
| **Adult dose range** | ตรวจว่าขนาดอยู่ในช่วงปกติ (ต่อน้ำหนัก) |
| **Pediatric dose** | คำนวณตามน้ำหนัก/พื้นที่ผิว (ถ้ามีข้อมูล) |
| **Geriatric dose** | ลดขนาดสำหรับผู้สูงอายุ (≥65 ปี) |
| **Renal adjustment** | ปรับขนาดตาม肾功能 (CrCl) |
| **Hepatic adjustment** | ปรับขนาดตาม liver function |
| **Maximum daily dose** | ตรวจว่ารวมทุกยาในใบสั่งไม่เกินขนาดสูงสุด |

### 2.4 Drug Database (ฐานข้อมูลยา)

#### 2.4.1 Drug Information Record

| Field | Type | หมายเหตุ |
|-------|------|----------|
| drug_id | UUID | PK |
| generic_name | string | ชื่อสามัญสากา (INN/Thai) |
| trade_names | json | ชื่อการค้าทั้งหมด (เช่น ["Panadol", "Tylenol", "Dymadon"]) |
| therapeutic_class | string | กลุ่มยา (เช่น "NSAID", "Penicillin") |
| atc_code | string | ATC Classification Code |
| fda_registration_no | string | เลขทะเบียน อย. |
| drug_classification | enum | `hhr`, `dangerous_drug`, `specially_controlled`, `narcotic`, `psychotropic` |
| prescription_required | boolean | ต้องมีใบสั่งแพทย์ |
| pharmacy_only | boolean | จ่ายเฉพาะที่ร้านขายยา |
| dosage_forms | json | รูปแบบที่มี (เช่น ["tablet 500mg", "syrup 125mg/5ml"]) |
| strengths | json | ขนาดที่มี |
| adult_dose | json | `{min: "250mg", max: "1000mg", frequency: "6h", max_daily: "4000mg"}` |
| pediatric_dose | json | ขนาดเด็ก (ถ้ามี) |
| geriatric_dose | json | ขนาดผู้สูงอายุ (ถ้ามี) |
| renal_dose | json | ปรับขนาดสำหรับไต |
| hepatic_dose | json | ปรับขนาดสำหรับตับ |
| contraindications | json | ข้อห้าม |
| pregnancy_category | enum | `A`, `B`, `C`, `D`, `X`, `N/A` (FDA Pregnancy Category) |
| lactation_safe | boolean | ปลอดภัยสำหรับให้นมบุตร |
| food_interactions | json | อาหารที่ควรหลีกเลี่ยง |
| common_side_effects | json | ผลข้างเคียงที่พบบ่อย |
| severe_side_effects | json | ผลข้างเคียงรุนแรง |
| storage_temperature | json | `{min: 15, max: 30}` °C |
| cold_chain | boolean | ต้องเก็บตู้เย็น |
| shelf_life | integer | อายุการเก็บรักษา (เดือน) |
| manufacturer | string | ผู้ผลิต |
| country_of_origin | string | ประเทศที่ผลิต |
| linked_product_ids | json | FK → products (link กับสินค้าในสต็อก) |
| updated_at | datetime | |

#### 2.4.2 Drug Interaction Rules

| Field | Type | หมายเหตุ |
|-------|------|----------|
| interaction_id | UUID | PK |
| drug_a_id | UUID | FK → drugs |
| drug_b_id | UUID | FK → drugs |
| severity | enum | `contraindicated`, `major`, `moderate`, `minor` |
| mechanism | text | กลไก (เช่น "CYP3A4 inhibition") |
| clinical_effect | text | ผลทางคลินิก |
| management | text | วิธีจัดการ (เช่น "หลีกเลี่ยงการใช้ร่วม", "monitor INR") |
| evidence_level | enum | `established`, `probable`, `suspected`, `possible` |
| source | string | แหล่งข้อมูล (เช่น "Lexicomp", "MIMS") |

### 2.5 Adverse Drug Reaction (ADR) Reporting

#### 2.5.1 ADR Record

| Field | Type | หมายเหตุ |
|-------|------|----------|
| adr_id | UUID | PK |
| patient_id | UUID | FK |
| prescription_id | UUID | FK (nullable) |
| suspected_drug_id | UUID | FK → drugs |
| reaction_description | text | อาการที่เกิด |
| severity | enum | `mild`, `moderate`, `severe`, `life_threatening`, `fatal` |
| onset_date | date | เริ่มมีอาการเมื่อไหร่ |
| onset_timing | enum | `immediate`, `hours`, `days`, `weeks` |
| dechallenge | enum | `resolved`, `improving`, `not_resolved`, `unknown` |
| rechallenge | enum | `reoccurred`, `not_repeated`, `unknown` |
| causality | enum | `certain`, `probable`, `possible`, `unlikely`, `conditional` (WHO-UMC) |
| reported_to_fda | boolean | แจ้ง อย. แล้วหรือยัง |
| reported_date | date | |
| reported_by | UUID | FK → pharmacists |
| notes | text | |

**⚠️ สำคัญ:** ยาที่มี ADR รุนแรง → ต้องแจ้ง อย. ภายในระยะเวลาที่กำหมาย

### 2.6 Medication Adherence Tracking (ติดตามการรับประทานยา)

#### 2.6.1 สำหรับยาเรื้อรัง (Chronic Medications)

| Feature | รายละเอียด |
|---------|------------|
| **Refill Reminder** | แจ้งผ่าน LINE ก่อนยาหมด (คำนวณจาก sig + quantity) |
| **Adherence Score** | คะแนนการรับประทานยาตามจังหวะ (จากการมา refill) |
| **Missed Dose Alert** | ถ้าลูกค้าไม่มา refill ตามกำหนด |
| **Auto-Reorder** | สร้าง order ให้อัตโนมัติสำหรับยาเรื้อรัง (ถ้าลูกค้ายินยอม) |
| **Drug Review** | เภสัชกร review ยาเรื้อรังทุก 3-6 เดือน |

### 2.7 Pharmacovigilance Dashboard

- จำนวน ADR รายเดือน
- ยาที่พบ ADR บ่อยที่สุด
- Severity distribution
- Causality assessment summary
- การแทรกแทรงเภสัชกรรม (Intervention Rate)
- Intervention effectiveness
- เปรียบเทียบกับช่วงเวลาก่อนหน้า

---

## 3. Telepharmacy Service Scenarios (Use Cases)

### 3.1 ร้านขายยาส่ง B2B → ลูกค้าเป็นร้านขายยา / โรงพยาบาล

```
ลูกค้า (ร้านขายยา A)
    │
    ├── สั่งซื้อยาสามัญ (HHR, DD) ผ่าน LINE
    │   → สร้าง Order ตรง
    │   → ไม่ต้องผ่าน prescription flow
    │   → จัดส่งตามปกติ
    │
    ├── ส่งใบสั่งยาจากลูกค้าของเขา
    │   → OCR → เภสัชกร verify
    │   → จ่ายให้ร้าน A (ไม่ใช่คนไข้ตรง)
    │   → ร้าน A จ่ายให้คนไข้เอง
    │
    ├── สอบถามข้อมูลยา
    │   → AI ตอบ หรือ เภสัชกรตอบ
    │
    └── แจ้งปัญหา (ยาผิด, ยาเสีย)
        → Return/Complaint flow
```

### 3.2 Telepharmacy Direct-to-Patient (ร้านขายยาส่ง → คนไข้โดยตรง)

> ⚠️ ตามกฎหมายไทย ร้านขายยาส่งไม่สามารถขายยาโดยตรงให้คนไข้ได้ ต้องผ่านร้านขายยาปลายทาง
> แต่ในอนาคตเมื่อกฎ Telepharmacy ของ FDA ออก อาจมีช่องทางใหม่

### 3.3 Clinical Pharmacy Services (บริการทางคลินิก)

| Service | รายละเอียด |
|---------|------------|
| **Drug Information (DI)** | ตอบคำถามข้อมูลยา — ขนาด, interaction, side effects |
| **Medication Review (MR)** | ตรวจสอบยาที่คนไข้ใช้อยู่ทั้งหมด ว่ามีปัญหาไหม |
| **Therapeutic Drug Monitoring (TDM)** | ติดตามระดับยาในเลือด (เช่น Vancomycin, Phenytoin) |
| **Pharmacokinetic Consultation** | คำนวณขนาดยาตาม PK parameters |
| **Anticoagulation Management** | ติดตามค่า INR สำหรับผู้ป่วยรับ Warfarin |
| **Antibiotic Stewardship** | แนะนำการใช้ยาปฏิชีวนะอย่างมีเหตุผล |
| **Palliative Care Pharmacy** | จัดการยาสำหรับผู้ป่วยรักษาประคับประคอง |
| **Nutrition Support** | แนะนำอาหารเสริม, TPN |

---

## 4. Integration Requirements

### 4.1 ระบบที่ต้องเชื่อมต่อ

| System | Integration Method | รายละเอียด |
|--------|-------------------|------------|
| **LINE OA** | Webhook + Messaging API | รับส่งข้อความ, รูป, วิดีโอ |
| **LINE LIFF** | SDK | Web app ภายใน LINE |
| **Hospital HIS** | HL7 FHIR API / Custom API | รับ e-Prescription |
| **Thai FDA Database** | API / Web Scraping | ตรวจสอบเลขทะเบียนยา |
| **National Drug Database (DHR)** | API | ข้อมูลยาประจำชาติ |
| **Drug Interaction DB** | Local DB + Subscription | Lexicomp / MIMS / local |
| **Payment Gateway** | API | PromptPay / โอนเงิน |
| **Shipping Provider** | API | Kerry, Flash, Ninja Van |
| **SMS Gateway** | API | OTP, แจ้งเตือน |

### 4.2 Data Flow — Telepharmacy

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  LINE OA    │────>│  AI Layer    │────>│  Pharmacist     │
│  (Customer) │     │  (Pre-check) │     │  Dashboard      │
└──────┬──────┘     └──────┬───────┘     └────────┬────────┘
       │                   │                       │
       │            ┌──────┴───────┐        ┌──────┴──────┐
       │            │ Drug DB      │        │ Prescription│
       │            │ Interaction  │        │ Record      │
       │            │ Dose Check   │        │ Patient     │
       │            │ Allergy Check│        │ Profile     │
       │            └──────────────┘        │ Dispensing  │
       │                                    │ Log         │
       │                                    └──────┬──────┘
       │                                           │
       ▼                                    ┌──────┴──────┐
┌──────────────┐                          │  Inventory  │
│  Notification│<─────────────────────────│  (Stock)    │
│  (LINE)      │                          └─────────────┘
└──────────────┘
```

---

## 5. Compliance & Regulatory Requirements

### 5.1 PDPA Compliance (ข้อมูลสุขภาพ)

| Requirement | Implementation |
|-------------|---------------|
| ยินยอม (Consent) | ลงทะเบียน → ยินยอมก่อนเก็บข้อมูล |
| จำกัดการเข้าถึง | เฉพาะเภสัชกร + ผู้บริหารที่มีสิทธิ์ |
| ลบข้อมูลเมื่อขอ | ลบ/anonymize ข้อมูลคนไข้ได้ (ยกเว้น record ที่ต้องเก็บตามกฎหมาย) |
| ระบบล็อกเข้า | Audit log ทุกครั้งที่เข้าดูข้อมูลคนไข้ |
| Data Breach | แจ้งผู้ป่วยภายใน 72 ชม. |

### 5.2 Pharmacy Record Keeping

| Record Type | กำหนดเก็บ | หมายเหตุ |
|-------------|-----------|----------|
| ใบสั่งยา | 5 ปี | พ.ร.บ.ยา |
| บันทึกการจ่ายยา | 5 ปี | พ.ร.บ.ยา |
| บัญชียาซื้อขาย | 5 ปี | พ.ร.บ.ยา |
| ยาควบคุมพิเศษ | 10 ปี | พ.ร.บ.ยาควบคุมพิเศษ |
| ยาเสพติด | 10 ปี | พ.ร.บ.ยาเสพติด |
| บันทึกคำปรึกษา (audio/video) | 2 ปี | ประกาศ 56/2563 |
| บันทึก ADR | 5 ปี | กฎ อย. |
| บันทึกการแทรกแทรง | 5 ปี | มาตรฐาน GPP |

### 5.3 Electronic Signature

- เภสัชกรต้องลงนามดิจิทัลเมื่อ verify prescription
- ตาม พ.ร.บ.ธุรกรรมอิเล็กทรอนิกส์ พ.ศ. 2562
- ต้องมี:
  - ระบุตัวตนผู้ลงนามได้ชัดเจน
  - ลายเซ็นเชื่อมโยงกับเอกสารที่ลงนาม
  - มี timestamp
  - มี audit trail

---

## 6. Pharmacist Dashboard

### 6.1 หน้าหลัก

- **Prescription Queue** (คิวใบสั่งยารอตรวจ)
  - จำนวนที่รอ: X ฉบับ
  - แยกตาม priority: 🔴 High / 🟡 Medium / 🟢 Low
  - Average wait time
- **Alerts**
  - 🚨 Severe drug interaction detected
  - ⏰ SLA breach warning (ใกล้เกินเวลา)
  - 📦 Low stock on commonly prescribed drugs
  - 🔄 Refill due for chronic patients

### 6.2 หน้าตรวจสอบใบสั่งยา (Single Rx View)

```
┌─────────────────────────────────────────────────────────────────┐
│  Rx #RX-20260330-001                    Status: Pending Review │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  👤 Patient: สมชาย ใจดี          📅 Rx Date: 2026-03-30        │
│  🏥 Hospital: รพ.กรุงเทพ              👨‍⚕️ Dr. วิชัย รักษาดี    │
│                                                                  │
│  ⚠️ AI Alerts:                                                  │
│  🟡 [Moderate] Metformin + Cimetidine — เพิ่มระดับ Metformin  │
│  🟢 [OK] No allergy detected                                    │
│  🟢 [OK] Dose within range                                      │
│                                                                  │
│  ┌─ รายการยา ──────────────────────────────────────────────┐   │
│  │ 1. Metformin 500mg — 1x1 หลังอาหาร — 30 เม็ด          │   │
│  │    ✅ Stock available (Lot: M2025-06, Exp: 2027-06)       │   │
│  │    💰 ฿2.50/เม็ด                                           │   │
│  │                                                           │   │
│  │ 2. Cimetidine 200mg — 1x1 ก่อนอาหาร — 30 เม็ด         │   │
│  │    ✅ Stock available (Lot: C2025-03, Exp: 2027-03)       │   │
│  │    💰 ฿1.80/เม็ด                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [📷 View Original Rx]  [📋 Patient History]  [💊 Drug Info]   │
│                                                                  │
│  ┌─ Actions ─────────────────────────────────────────────────┐   │
│  │ [✅ Approve]  [⚠️ Partial]  [❌ Reject]  [📞 Contact Dr] │   │
│  │                                                           │   │
│  │ Clinical Notes: ┌──────────────────────────────┐          │   │
│  │                 │                              │          │   │
│  │                 └──────────────────────────────┘          │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 รายงานทางคลินิก

- **Intervention Report** — จำนวนการแทรกแทรง, ประเภท, ผลลัพธ์
- **ADR Report** — จำนวน ADR, ยาที่เกี่ยวข้อง, severity
- **Prescription Audit** — ความถูกต้องของใบสั่งยา
- **Patient Satisfaction** — ผลสำรวจความพึงพอใจหลังได้รับบริการ
- **Drug Utilization Review (DUR)** — รูปแบบการใช้ยา

---

## 7. Priority Matrix — Telepharmacy Specific

| Feature | Priority | เหตุผล |
|---------|----------|--------|
| Drug Classification Rules | 🔴 P0 | กฎหมายบังคับ |
| Patient Registration + Allergy | 🔴 P0 | ความปลอดภัยคนไข้ |
| Prescription Verification Flow | 🔴 P0 | Core telepharmacy |
| Drug Interaction Check | 🔴 P0 | ความปลอดภัย |
| Dose Range Check | 🔴 P0 | ความปลอดภัย |
| Pharmacist Dashboard | 🔴 P0 | เครื่องมือเภสัชกร |
| Drug Database (Local) | 🟡 P1 | ต้องมีฐานข้อมูลยา |
| Patient Counseling Record | 🟡 P1 | ตามกฎหมาย 56/2563 |
| Electronic Signature | 🟡 P1 | ตามกฎหมาย |
| ADR Reporting | 🟡 P1 | ตามกฎหมาย |
| e-Prescription (HIS Integration) | 🟡 P1 | Future-ready |
| Cold Chain Monitoring | 🟡 P1 | สำหรับยาบางชนิด |
| Medication Adherence Tracking | 🟢 P2 | คุณภาพบริการ |
| Clinical Pharmacy Services | 🟢 P2 | เพิ่มมูลค่าบริการ |
| Pharmacovigilance Dashboard | 🟢 P2 | Quality improvement |
| TDM / PK Consultation | 🔵 P3 | Advanced services |
