# LINE Telepharmacy ERP — Requirements Document (B2C Retail Focus)

> **Version:** 2.0  
> **Date:** 2026-03-30  
> **Author:** Jame + Kimi Claw  
> **Status:** Draft  
> **Business Model:** ขายปลีก (B2C) — ร้านขายยาออนไลน์ + Telepharmacy

---

## 1. ภาพรวมระบบ

### 1.1 Business Model
- **ร้านขายยาออนไลน์** ที่รับสั่งซื้อและให้บริการทางเภสัชกรรมผ่าน LINE
- **ลูกค้าคือผู้บริโภคทั่วไป** — คนป่วย, ผู้ดูแลคนป่วย, ผู้ซื้อยาสามัญประจำบ้าน
- **มีเภสัชกรตรวจสอบ** ยาอันตราย, ใบสั่งยา, ให้คำปรึกษา
- **จัดส่งถึงบ้าน** — ทั่วประเทศไทย
- **เป็นร้านขายยาที่มีใบอนุญาตจริง** สั่งจากร้านหลัก ส่งถึงมือลูกค้า (ตาม ประกาศ สภาเภสัชกรรม 56/2563)

### 1.2 สิ่งที่ต่างจาก B2B

| Feature | B2B (ขายส่ง) | **B2C (ขายปลีก)** ← เรา |
|---------|---------------|------------------------|
| ลูกค้า | ร้านขายยา, โรงพยาบาล | **ผู้บริโภคทั่วไป** |
| ปริมาณต่อออเดอร์ | มาก (แผง, กล่อง) | **น้อย (ขวด, แผง)** |
| ใบสั่งยา | ส่งมาจากร้านขายยาอื่น | **ส่งตรงจากคนไข้** |
| Credit Term | 30/45/60 วัน | **ชำระเลย / PromptPay** |
| ยอดของต่อครั้ง | หลักหมื่น-หลักแสน | **หลักร้อย-หลักพัน** |
| จำนวนออเดอร์/วัน | 10-50 | **200-1000+** |
| Customer Profile | ร้าน/สถานพยาบาล | **คนไข้ / ผู้บริโภค** |
| Telepharmacy | เสริม | **หัวใจหลักของระบบ** |
| Patient Record | ไม่มี | **ต้องมี (กฎหมาย)** |

### 1.3 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LINE Official Account                      │
│           (ลูกค้าสั่งซื้อ, ส่งใบสั่งยา, ปรึกษา, ติดตาม)       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Webhook / Messaging API
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    AI Layer (Chatbot / Agent)                 │
│   - ตอบคำถามสุขภาพยาอัตโนมัติ                                  │
│   - อ่านใบสั่งยา (OCR)                                       │
│   - แปลงข้อความเป็น order                                     │
│   - แนะนำสินค้า (สมุนไพร, อาหารเสริม, OTC)                    │
│   - ตอบเกี่ยวกับยาเรื้อรังของคนไข้                             │
└──────────────────────────┬───────────────────────────────────┘
                           │ API
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     ERP Backend                               │
│                                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ Patient  │ │Telepharm │ │ Catalog &│ │ Order &       │   │
│  │ Records  │ │ Center   │ │ Product  │ │ Payment       │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │Inventory │ │ Delivery │ │Loyalty &│ │ Reports &     │   │
│  │          │ │ Tracking │ │Promotions│ │ Analytics     │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │
└──────────────────────────┬───────────────────────────────────┘
                           │
                  ┌────────┼────────┐
                  ▼        ▼        ▼
               MySQL     Redis   Storage
```

---

## 2. โมดูล Patient Records — ระบบบันทึกข้อมูลผู้ป่วย

> **บังคับตามกฎหมาย Telepharmacy** — ประกาศ สภาเภสัชกรรม 56/2563

### 2.1 Patient Registration

ลูกค้าสมัครผ่าน LINE (LINE Login) ครั้งแรก → กรอกข้อมูลสุขภาพ

| Field | Type | บังคับ/Optional |
|-------|------|----------------|
| patient_id | UUID | PK |
| line_user_id | string | **บังคับ** — ผูกกับ LINE |
| national_id | string | Optional — PDPA sensitive |
| prefix | enum | บังคับ |
| first_name | string | บังคับ |
| last_name | string | บังคับ |
| birth_date | date | บังคับ — ต้องรู้อายุเพื่อคำนวณขนาดยา |
| gender | enum | บังคับ |
| weight | decimal | Optional — แต่สำคัญมากสำหรับ dose calculation |
| height | decimal | Optional |
| blood_type | enum | Optional |
| phone | string | Optional |
| address | text | บังคับ — สำหรับจัดส่ง |
| sub_district | string | แขวง/ตำบล |
| district | string | เขต/อำเภอ |
| province | string | จังหวัด |
| postal_code | string | รหัสไปรษณีย์ |
| allergies | json | **สำคัญมาก** — ประวัติแพ้ยา |
| chronic_diseases | json | โรคประจำตัว |
| current_medications | json | ยาที่กินอยู่ตอนนี้ |
| insurance_type | enum | none, government_30baht, social_security, private |
| is_pregnant | boolean | Optional — สำคัญสำหรับ drug check |
| is_breastfeeding | boolean | Optional |
| pdpa_consent_at | datetime | **บังคับ** — วันยินยอม PDPA |
| status | enum | active, inactive, deceased |
| created_at | datetime | |
| updated_at | datetime | |

### 2.2 Drug Allergy Record

| Field | Type |
|-------|------|
| allergy_id | UUID |
| patient_id | UUID |
| drug_name | string |
| generic_names | json | ["Penicillin", "Amoxicillin", "Ampicillin"] |
| reaction_type | enum | allergic, side_effect, intolerance |
| severity | enum | mild, moderate, severe, life_threatening |
| symptoms | text | "ผื่นแดงทั่วตัว, หายใจหอบเหนื่อย" |
| source | enum | patient_reported, doctor_diagnosed, pharmacist_identified |
| occurred_date | date | |
| notes | text | |

**⚠️ ระบบต้องเตือน HARD STOP ทุกครั้งที่จะจ่ายยาที่แพ้ รวม cross-allergy**

### 2.3 Medical History

| ประเภท | รายละเอียด |
|--------|------------|
| โรคประจำตัว | เบาหวาน, ความดัน, ไต, ตับ, หัวใจ, มะเร็ง, ภูมิแพ้, อื่นๆ |
| ประวัติการผ่าตัด | วันที่, รายละเอียด |
| ประวัติการตั้งครรภ์ | LMP, EDD, ระยะ, ภาวะแทรกซ้อน |
| ยาที่ใช้อยู่ปัจจุบัน | ชื่อยา, ขนาด, วิธีใช้, แพทย์ผู้สั่ง |
| สมุนไพร/อาหารเสริม | ชื่อ, ขนาด, ความถี่ |

### 2.4 Patient Profile View (สำหรับเภสัชกร)

```
┌─────────────────────────────────────────────────────┐
│  👤 คุณสมชาย ใจดี          ID: PT-0001              │
│  📅 45 ปี  | ชาย | 70 kg                          │
│  📍 123 ถ.สุขุมวิท แขวงคลองเนียม เขตคลองสาน กรุงเทพ  │
│                                                      │
│  ⚠️ ALLERGIES:                                       │
│  🔴 Penicillin — severe (หายใจหอบเหนื่อย, ผื่น)    │
│  🟡 NSAIDs — mild (ปวดท้อง)                          │
│                                                      │
│  🏥 CHRONIC DISEASES:                                │
│  • เบาหวาน (HbA1c 7.2%) — ตั้งแต่ 2020             │
│  • ความดันโลหิตสูง — ตั้งแต่ 2019                  │
│                                                      │
│  💊 CURRENT MEDICATIONS:                              │
│  • Metformin 500mg — 1x2 หลังอาหาร (Dr.สมหวัง)      │
│  • Amlodipine 5mg — 1x1 เช้า (Dr.สมหวัง)             │
│                                                      │
│  📋 PRESCRIPTION HISTORY: 23 ฉบับ                     │
│  🛒 ORDER HISTORY: 15 ออเดอร์                        │
│  ⭐ LOYALTY: Gold — 2,450 แต้ม                       │
│  💰 TOTAL SPENT: ฿45,200                             │
└─────────────────────────────────────────────────────┘
```

---

## 3. โมดูล Telepharmacy Center — หัวใจของระบบ

### 3.1 Prescription Workflow (ละเอียด)

```
┌──────────────────────────────────────────────────────────────┐
│                  PRESCRIPTION LIFECYCLE                       │
│                                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐    │
│  │Received │─>│AI Check │─>│ Queue   │─>│ Pharmacist   │    │
│  │(รูป/Rx) │  │(OCR+Pre)│  │(รอ verify)│  │ Review      │    │
│  └─────────┘  └─────────┘  └─────────┘  └──┬──────┬───┘    │
│                                              │      │         │
│                                     ┌────────┘      └────┐   │
│                                     ▼                    ▼   │
│                              ┌──────────┐         ┌────────┐  │
│                              │ Approve  │         │ Reject │  │
│                              └────┬─────┘         └───┬────┘  │
│                                   ▼                   ▼     │
│                            ┌──────────┐          ┌────────┐  │
│                            │ Dispense │          │ Notify│  │
│                            │ +Counsel │          │ Patient│  │
│                            └────┬─────┘          │ +Advise│  │
│                                 ▼                └────────┘  │
│                            ┌──────────┐                      │
│                            │ Shipped  │                      │
│                            └────┬─────┘                      │
│                                 ▼                            │
│                            ┌──────────┐                      │
│                            │Delivered │                      │
│                            │+ Confirmed│                     │
│                            └──────────┘                      │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Step-by-step Detail

#### Step 1: รับใบสั่งยา
- ลูกค้าถ่ายรูปใบสั่งยาส่งผ่าน LINE (อาจหลายรูป)
- ระบบสร้าง Prescription Record
- แจ้ง LINE: "ได้รับใบสั่งยาแล้วค่ะ ระบบกำลังตรวจสอบ รอสักครู่นะคะ ⏳"

#### Step 2: AI Pre-check (อัตโนมัติ)
- **OCR** อ่าน: ชื่อแพทย์, โรงพยาบาล, ชื่อคนไข้, รายการยา, ขนาด, จำนวน
- **Auto-match** กับ Product catalog:
  - ✅ พบสินค้าตรง → แสดงราคา, สต็อก, ยี่ห้อ
  - ❌ ไม่พบ → flag "ไม่มีสินค้านี้"
  - ⚠️ พบหลายยี่ห้อ → แสดงให้เภสัชกรเลือก
- **Safety Checks:**
  - 🔴 **Allergy check** — ยาในใบสั่งแพ้ไหม? (cross-allergy ด้วย)
  - 🔴 **Drug interaction** — ยาในใบสั่ง vs ยาที่กินอยู่
  - 🟡 **Dose range** — ขนาดปกติไหม? (คำนวณตามน้ำหนัก)
  - 🟡 **Duplicate therapy** — มียากลุ่มเดียวกันซ้ำไหม?
  - 🔴 **Contraindication** — ยา vs โรคประจำตัว
  - 🟡 **Pregnancy check** — ยาอันตรายต่อทารกไหม?
- **ผล AI → Priority Queue:**
  - 🔴 High: พบ severe interaction / contraindicated
  - 🟡 Medium: พบ moderate issue / ยาอันตราย
  - 🟢 Low: ไม่พบปัญหา / OTC

#### Step 3: เข้าคิวรอเภสัชกร
- SLA ตามกฎหมาย:
  - 🔴 High priority: **15 นาที**
  - 🟡 Medium: **30 นาที**
  - 🟢 Low: **1 ชม.**
- แจ้งเตือนเภสัชกรผ่าน dashboard + push notification

#### Step 4: เภสัชกร Review
- ดูรูปใบสั่งยาต้นฉบับ
- ดูผล AI pre-check
- ดู patient profile (allergies, โรค, ยาที่กินอยู่)
- ตัดสินใจ:
  - ✅ **Approve** → จ่ายยาทั้งหมด
  - ⚠️ **Partial** → จ่ายที่ได้ + อธิบายที่ไม่ได้
  - ❌ **Reject** → แจ้งเหตุผล + แนะนำทางเลือก
  - 📞 **Contact Doctor** → ติดต่อแพทย์เพื่อยืนยัน/เปลี่ยนยา
- **บันทึกการแทรกแทรง (Intervention)** ทุกครั้ง

#### Step 5: การจ่ายยา (Dispensing)
- เลือก lot ตาม **FEFO** (First Expired First Out)
- ตรวจ expiry (อย่างน้อย 6 เดือนที่เหลือ)
- พิมพ์ฉลากยา:
  - ชื่อคนไข้, ชื่อยา, ขนาด, วิธีใช้
  - คำเตือน (เช่น อาจทำให้ง่วง)
  - เลข Lot, Expiry, ชื่อร้าน, เภสัชกรผู้จ่าย
- **Digital Signature** เภสัชกร

#### Step 6: ให้คำปรึกษา (Patient Counseling)
> **บังคับตามกฎหมาย** — ประกาศ สภาเภสัชกรรม 56/2563

- ช่องทาง:
  - 📹 **Video call** (แนะนำ — ตามกฎหมาย)
  - 📞 Voice call
  - 💬 LINE chat (สำหรับเรื่องง่าย)
- เนื้อหาคำปรึกษา:
  - ชื่อยา + วัตถุประสงค์
  - ขนาด + วิธีใช้ + เวลา
  - ระยะเวลาที่ต้องกิน
  - ผลข้างเคียงที่อาจเกิด
  - ข้อห้าม / คำเตือน
  - อาหารที่ควรหลีกเลี่ยง
  - ถ้าลืมกินทำอย่างไร
  - เก็บยาอย่างไร
- **บันทึกเป็น audio/video** (เก็บ 2 ปี)
- คนไข้ยืนยันว่าเข้าใจ

#### Step 7: ชำระเงิน
- ยอดรวมแสดงผ่าน LINE (itemized)
- ช่องทางชำระ:
  - 💳 PromptPay (แนะนำ)
  - 🏦 โอนเงิน → ส่งสลิป
  - 💵 COD (เก็บเงินปลายทาง)
  - 📱 Mobile Banking
- ส่งใบเสร็จ/ใบกำกับภาษีทาง LINE

#### Step 8: จัดส่ง
- แพ็คยา + ฉลาก + ใบเสร็จ
- **Cold Chain** สำหรับยาที่ต้องเก็บเย็น (ice pack + temp logger)
- Tracking ส่งให้ลูกค้าทาง LINE
- **ผู้รับต้องยืนยันตัวตน:**
  - ชื่อตรงกับใบสั่งยา
  - ถ้าเป็นญาติ → ต้องแสดงหนังสือมอบฉันทะ
  - ยืนยันผ่าน LINE OTP / รหัส

### 3.3 Prescription Data Model

```
Prescription
├── Header
│   ├── rx_no
│   ├── rx_date
│   ├── prescriber (name, license, hospital, department)
│   ├── patient_id → patients
│   ├── source (paper_rx, electronic_rx, walk_in)
│   ├── images[] (รูปใบสั่งยา)
│   ├── ocr_result (ผล OCR)
│   └── status
│
├── Items[] (รายการยา)
│   ├── drug_name (บนใบสั่ง)
│   ├── matched_product_id → products
│   ├── strength, dosage_form, quantity, sig, duration
│   ├── lot_id (ที่จ่าย)
│   ├── checks[]
│   │   ├── allergy_check (🟢/🔴)
│   │   ├── interaction_check (🟢/🟡/🔴)
│   │   ├── dose_check (🟢/🟡)
│   │   └── contraindication_check (🟢/🔴)
│   └── substitution (ถ้ามี)
│
├── Verification
│   ├── pharmacist_id
│   ├── verified_at
│   ├── clinical_notes
│   ├── interventions[]
│   ├── digital_signature
│   └── status (approved/partial/rejected/referred)
│
├── Counseling
│   ├── method (video/voice/chat/face_to_face)
│   ├── recording_url (audio/video)
│   ├── topics_covered[]
│   └── patient_confirmed
│
├── Payment
│   ├── amount
│   ├── method (promptpay/transfer/cod)
│   ├── paid_at
│   └── invoice_id
│
└── Delivery
    ├── address
    ├── method (own_driver/courier)
    ├── cold_chain_required
    ├── tracking_no
    ├── receiver_verified
    └── delivered_at
```

---

## 4. โมดูล Catalog & Product — ระบบสินค้า

### 4.1 Product Categories (B2C Focus)

```
สินค้าขายยาปลีก
├── 💊 ยาสามัญประจำบ้าน (HHR) — ขายได้ทั่วไป
│   ├── ยาไข้ (Paracetamol, Ibuprofen)
│   ├── ยาแก้อาการท้อง (Loperamide, Omeprazole)
│   ├── ยาแก้ไอ (Dextromethorphan, Ambroxol)
│   ├── ยาแก้หวัด (Antihistamine, Decongestant)
│   ├── ยาแก้ท้องเสีย
│   ├── ยาบำรุง (Vitamin, Mineral)
│   ├── ยาทาผิว/หู/ตา/จมูก
│   └── ยาสมุนไพร
│
├── ⚠️ ยาอันตราย (DD) — ต้องมีเภสัชกรจ่าย
│   ├── ยาปฏิชีวนะ (Amoxicillin, Cephalexin)
│   ├── ยาแก้อักเสบ (NSAIDs — บางขนาด)
│   ├── ยาลดความดัน
│   ├── ยาเบาหวาน
│   ├── ยาคลื่นไส้
│   └── ยาหูหนวก
│
├── 🏥 อุปกรณ์ทางการแพทย์
│   ├── เครื่องวัดความดัน, เครื่องวัดน้ำตาล
│   ├── ผ้าพันแผล, ยาแก้ปวดทา, แอลกอฮอล
│   ├── Mask, Hand Sanitizer
│   └── เข็มฉีดยา (สำหรับผู้ป่วยเบาหวาน)
│
├── 🌿 สมุนไพร & อาหารเสริม
│   ├── วิตามิน (C, D, B-Complex, Omega-3)
│   ├── อาหารเสริมลดน้ำหนัก
│   ├── อาหารเสริมสำหรับผู้สูงอายุ
│   ├── อาหารเสริมข้อต่อ
│   └── สมุนไพรไทย
│
├── 🧴 ผลิตภัณฑ์สุขภาพ & ความงาม
│   ├── ครีมกันแดด
│   ├── ยาสีฟัน, น้ำยาบ้วนปาก
│   ├── แชมพู, สบู่
│   └── ครีมบำรุงผิว
│
└── 👶 สินค้าสำหรับเด็ก & ทารก
    ├── นมผง, อาหารเด็ก
    ├── ผ้าอ้อม
    ├── ยาหยอดจมูกเด็ก
    └── ครีมผื่นเด็ก
```

### 4.2 Product Data Model

| Field | Type | หมายเหตุ |
|-------|------|----------|
| product_id | UUID | PK |
| sku | string | unique |
| name_th | string | ชื่อไทย |
| name_en | string | ชื่ออังกฤษ |
| generic_name | string | ชื่อสามัญ |
| brand | string | ยี่ห้อ |
| category_id | UUID | FK → categories |
| drug_classification | enum | `hhr`, `dangerous_drug`, `specially_controlled`, `device`, `supplement`, `cosmetic`, `herbal` |
| requires_prescription | boolean | ต้องมีใบสั่งยาไหม |
| requires_pharmacist | boolean | ต้องมีเภสัชกรจ่ายไหม (DD) |
| dosage_form | string | tablet, capsule, syrup, cream, etc. |
| strength | string | 500mg, 10mg/ml |
| pack_size | string | 10 เม็ด, 100ml |
| unit | string | ขวด, แผง, กล่อง, หลอด, อัน |
| barcode | string | EAN/Barcode |
| fda_registration_no | string | เลขทะเบียน อย. |
| short_description | text | รายละเอียดสั้น (แสดงใน LINE) |
| full_description | text | รายละเอียดเต็ม |
| how_to_use | text | วิธีใช้ |
| warnings | text | คำเตือน |
| side_effects | text | ผลข้างเคียง |
| contraindications | text | ข้อห้าม |
| ingredients | text | ส่วนผสม |
| images | json | [url1, url2, ...] |
| sell_price | decimal | ราคาขาย |
| member_price | decimal | ราคาสมาชิก |
| compare_price | decimal | ราคาปกติ (แสดงเป็นขีดโทษ) |
| cost_price | decimal | ราคาทุน (hidden) |
| vat_type | enum | vat_included, vat_excluded, no_vat |
| cold_chain | boolean | ต้องเก็บเย็น |
| storage_instruction | string | เก็บที่อุณหภูมิ 15-30°C |
| shelf_life_months | integer | อายุเก็บรักษา |
| min_stock | decimal | สต็อกขั้นต่ำ |
| max_stock | decimal | สต็อกสูงสุด |
| reorder_point | decimal | จุดสั่งซื้อใหม่ |
| status | enum | active, inactive, discontinued |
| is_featured | boolean | แสดงเป็นสินค้าแนะนำ |
| tags | json | tags |
| seo_keywords | json | keywords |
| created_at | datetime | |
| updated_at | datetime | |

### 4.3 Product Discovery (สำหรับลูกค้า)

| Feature | รายละเอียด |
|---------|------------|
| **Search** | ค้นหาตามชื่อยา, ยี่ห้อ, อาการ, ส่วนผสม |
| **Browse by Category** | เลือกหมวดหมู่ |
| **Health Articles** | บทความสุขภาพ + แนะนำสินค้า |
| **AI Recommendation** | "ฉันมีอาการไข้หนาวสัก 2 วันแล้ว" → แนะนำยา + คำแนะนำ |
| **Frequently Bought Together** | ซื้อร่วมกันบ่อย |
| **Promotions** | สินค้าลดราคา, ซื้อ 1 แถม 1 |
| **New Arrivals** | สินค้าใหม่ |
| **Best Sellers** | ขายดีที่สุด |

---

## 5. โมดูล Order & Payment — ระบบสั่งซื้อและชำระเงิน

### 5.1 ประเภทออเดอร์ (B2C)

| Type | รายละเอียด | Workflow |
|------|------------|----------|
| **OTC Order** | ซื้อยาสามัญ + อาหารเสริม + อุปกรณ์ | เลือกสินค้า → ชำระเงิน → จัดส่ง |
| **Rx Order** | ส่งใบสั่งยา → เภสัชกร verify → จ่ายยา | ส่งรูป Rx → verify → ชำระ → จัดส่ง |
| **Consultation Order** | ปรึกษาเภสัชกร → เภสัชกรแนะนำ → ซื้อยา | chat/video → แนะนำ → confirm → จัดส่ง |
| **Refill Order** | สั่งซื้อยาเรื้อรังซ้ำ (auto/manual) | แจ้งเตือน → confirm → ชำระ → จัดส่ง |
| **Reorder** | สั่งซื้อสินค้าเดิมซ้ำ | เลือกจากประวัติ → confirm → ชำระ → จัดส่ง |

### 5.2 Order Lifecycle

```
Created → Paid → Processing → Packed → Shipped → Delivered → Completed
    ↓       ↓                    ↓
Cancelled Refunded           Returned
```

### 5.3 Order Data Model

| Field | Type |
|-------|------|
| order_id | UUID |
| order_no | string | (auto: REYA-20260330-001) |
| patient_id | UUID | FK → patients |
| order_type | enum | otc, rx, consultation, refill, reorder |
| prescription_id | UUID | FK (nullable) |
| status | enum | created, awaiting_payment, paid, processing, packed, shipped, delivered, completed, cancelled, refunded, returned |
| items[] | json | [{product_id, name, qty, price, lot_id, ...}] |
| subtotal | decimal |
| discount_amount | decimal |
| delivery_fee | decimal | ค่าจัดส่ง |
| vat | decimal | 7% |
| total_amount | decimal |
| payment_method | enum | promptpay, bank_transfer, cod, mobile_banking |
| payment_status | enum | unpaid, paid, refunding, refunded |
| paid_at | datetime | |
| delivery_address | text | |
| delivery_method | enum | kerry, flash, ninja_van, own_driver |
| delivery_fee | decimal | |
| cold_chain_items | boolean | มียาต้องเก็บเย็นไหม |
| tracking_no | string | |
| estimated_delivery | datetime | |
| delivered_at | datetime | |
| source | enum | line, liff, web |
| line_message_id | string | |
| notes | text | หมายเหตุจากลูกค้า |
| internal_notes | text | โน้ตภายใน |
| created_at | datetime | |
| updated_at | datetime | |

### 5.4 Payment Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Order      │────>│  Pay         │────>│  Confirm     │
│  Created    │     │  (PromptPay/ │     │  Payment     │
│             │     │   Transfer/  │     │  (Auto/Manual│
│             │     │   COD)       │     │   Slip Check)│
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                          ┌──────┴──────┐
                                          ▼             ▼
                                   ┌──────────┐  ┌──────────┐
                                   │ Success  │  │ Failed   │
                                   │ → Process│  │ → Retry/ │
                                   │          │  │   Cancel │
                                   └──────────┘  └──────────┘
```

**สลิปอัตโนมัติ (AI OCR):**
- ลูกค้าส่งรูปสลิป → OCR อ่านจำนวนเงิน + เวลา
- Auto-match กับ order
- ถ้าตรง → auto-confirm
- ถ้าไม่ตรง → ส่งให้พนักงานตรวจ

### 5.5 Delivery

| Feature | รายละเอียด |
|---------|------------|
| **Delivery Fee** | ฟรีสำหรับออเดอร์ ≥ ฿500 / ฿50 สำหรับออเดอร์ < ฿500 |
| **Estimated Delivery** | 1-3 วัน (กรุงเทพ), 2-5 วัน (ต่างจังหวัด) |
| **Cold Chain** | ice pack + temp indicator สำหรับยาต้องเก็บเย็น (+฿30) |
| **Tracking** | ส่ง tracking number ทาง LINE + อัปเดตสถานะ |
| **Proof of Delivery** | ลายเซ็นรับ / ถ่ายรูป / LINE OTP confirm |

---

## 6. โมดูล Inventory — ระบบคลัง

### 6.1 Lot / Batch Management

| Field | Type |
|-------|------|
| lot_id | UUID |
| product_id | UUID |
| lot_no | string |
| expiry_date | date |
| quantity_received | decimal |
| quantity_available | decimal |
| quantity_reserved | decimal |
| cost_price | decimal |
| warehouse_location | string | เช่น A-01-03 |
| status | enum | available, quarantine, expired, damaged |
| supplier_id | UUID |
| received_date | date |

### 6.2 Stock Alerts

| Alert Type | Condition | Action |
|------------|-----------|--------|
| **Low Stock** | qty ≤ reorder_point | แจ้งพนักงาน + สร้าง PO อัตโนมัติ |
| **Expiry Warning** | expiry ≤ 3 เดือน | แจ้ง + แสดงใน dashboard |
| **Expired** | expiry < today | แจ้ง + ต้อง write off |
| **Cold Chain Alert** | temp out of range | แจ้ง urgent |

### 6.3 Stock Movement

- `purchase_in` — รับเข้าจาก supplier
- `sale_out` — ขายออก
- `return_in` — รับคืนจากลูกค้า
- `return_out` — คืน supplier
- `adjustment_in/out` — ปรับยอด
- `write_off` — จำหน่าย/หมดอายุ

---

## 7. โมดูล LINE Integration — ช่องทางหลัก

### 7.1 ฟีเจอร์ LINE สำหรับลูกค้า B2C

| Feature | รายละเอียด |
|---------|------------|
| **🛒 สั่งซื้อสินค้า** | เลือกจาก catalog หรือพิมพ์ชื่อยา |
| **📸 ส่งใบสั่งยา** | ถ่ายรูปส่ง → verify → จ่าย → ส่ง |
| **💬 ปรึกษาเภสัชกร** | chat/video กับเภสัชกร |
| **💊 สั่งยาซ้ำ (Refill)** | กดเลือกจากยาเดิม |
| **💳 ชำระเงิน** | PromptPay / ส่งสลิป |
| **📦 ติดตามพัสดุ** | ดูสถานะ + tracking |
| **📋 ประวัติสั่งซื้อ** | ดูออเดอร์เก่าๆ |
| **👤 ข้อมูลสุขภาพ** | ดู/แก้ไขข้อมูลแพ้ยา, โรคประจำตัว |
| **⭐ สะสมแต้ม** | ดูแต้ม + แลกส่วนลด |
| **🔔 แจ้งเตือน** | ยาเรื้อรังหมดเติม, โปรโมชั่น |

### 7.2 Rich Menu Design

```
┌─────────────────────────────────────────┐
│           💊 REYA Pharmacy              │
├──────────────┬──────────────────────────┤
│ 🛒 สั่งซื้อ   │ 💊 ส่งใบสั่งยา          │
│ สินค้า       │ ถ่ายรูปใบสั่งยา         │
├──────────────┼──────────────────────────┤
│ 💬 ปรึกษา     │ 📦 ติดตามออเดอร์        │
│ เภสัชกร      │ สถานะจัดส่ง            │
├──────────────┼──────────────────────────┤
│ ⭐ แต้มของฉัน │ 👤 ข้อมูลสุขภาพ        │
│ สะสมแลกของ   │ แพ้ยา/โรคประจำตัว      │
└──────────────┴──────────────────────────┘
```

### 7.3 Auto-Reply Rules

| Trigger | Reply |
|---------|-------|
| สวัสดี / สอบถาม | "สวัสดีค่ะ! มีอะไรให้ช่วยไหมคะ? พิมพ์ชื่อยาที่ต้องการ หรือกดเมนูด้านล่างได้เลยค่ะ 😊" |
| [ส่งรูปใบสั่งยา] | "ได้รับใบสั่งยาแล้วค่ะ กำลังตรวจสอบ รอสักครู่นะคะ ⏳" |
| อยากซื้อ + [ชื่อยา] | แสดงสินค้า + ราคา + ปุ่ม "เพิ่มลงตะกร้า" |
| ติดตามออเดอร์ | แสดงออเดอร์ล่าสุด + สถานะ |
| สลิป | "ส่งรูปสลิปมาได้เลยค่ะ เราจะตรวจสอบให้ 💳" |
| แพ้ยา | แสดงข้อมูลแพ้ยาของลูกค้า + ปุ่ม "เพิ่ม/แก้ไข" |
| [ส่งรูปผื่น/อาการ] | "เราเห็นอาการคุณ แนะนำให้ปรึกษาเภสัชกรนะคะ กดปุ่มด้านล่างเลยค่ะ" + ปุ่มเชื่อมต่อเภสัชกร |

### 7.4 Notification Flow (LINE → ลูกค้า)

```
สั่งซื้อสำเร็จ:     ✅ รับออเดอร์แล้ว #REYA-20260330-001
                     💰 ยอดรวม: ฿350 (รวมค่าจัดส่ง)
                     📱 ชำระเงิน: [PromptPay] / [ส่งสลิป]

ชำระเงินสำเร็จ:     💳 ชำระเงินสำเร็จแล้ว ฿350
                     📦 กำลังเตรียมสินค้า

จัดส่งแล้ว:         🚚 จัดส่งแล้ว!
                     📋 Tracking: Kerry — 1234567890
                     📅 คาดว่าถึง: 1 เม.ย. 2569
                     🔍 [ติดตามพัสดุ]

จัดส่งสำเร็จ:       ✅ จัดส่งสำเร็จแล้วค่ะ!
                     ⭐ ได้รับ +10 แต้ม
                     💬 มีความคิดเห็นไหมคะ?

ยาเรื้อรังหมดเติม:   💊 ยา Metformin 500mg ของคุณกำลังจะหมด
                     📅 ตามสั่ง: 1x2 หลังอาหาร
                     🔄 [สั่งซื้อซ้ำ] [ขอคำปรึกษาเภสัชกรก่อน]

Promotion:            🔥 Flash Sale! วันนี้-พรุ่งนี้
                     Vitamin C 1000mg ลด 30%
                     🛒 [ซื้อเลย]
```

---

## 8. โมดูล Loyalty & Promotions

### 8.1 Points System

| Rule | รายละเอียด |
|------|------------|
| สะสม | 1 บาท = 1 แต้ม |
| แลก | 100 แต้ม = ฿10 ส่วนลด |
| หมดอายุ | 12 เดือน (จากวันได้รับ) |
| ยาที่ต้องมีใบสั่ง | ได้แต้มเหมือนกัน |
| Bonus | +50 แต้ม เมื่อ review สินค้า |

### 8.2 Membership Tiers

| Tier | ยอดซื้อรวม | ส่วนลด | จัดส่งฟรี | สิทธิพิเศษ |
|------|-----------|--------|----------|----------|
| **Bronze** | 0 - 2,999 | — | ≥฿500 | คำปรึกษาทั่วไป |
| **Silver** | 3,000 - 9,999 | 5% | ≥฿300 | คำปรึกษา priority |
| **Gold** | 10,000 - 29,999 | 10% | ฟรีทุกออเดอร์ | เภสัชกรประจำ |
| **Platinum** | 30,000+ | 15% | ฟรี + Express | เภสัชกรประจำ + Video call |

### 8.3 Promotions

| ประเภท | ตัวอย่าง |
|--------|---------|
| **Flash Sale** | ลด 30% Vitamin C วันนี้-พรุ่งนี้ |
| **Buy X Get Y** | ซื้อ 2 แถม 1 ยาแก้ไอ |
| **Bundle Deal** | ชุดไข้หวัด (Paracetamol + Antihistamine + วิตามิน C) ฿199 |
| **New Customer** | ลด 10% ออเดอร์แรก |
| **Birthday** | ลด 20% เดือนเกิด |
| **Referral** | แนะนำเพื่อน → ได้ ฿50 discount |
| **First-time Rx** | ส่งฟรีครั้งแรกสำหรับใบสั่งยา |
| **Seasonal** | ชุดป้องกันไข้หวัดฤดูหนาว |

---

## 9. โมดูล AI & Intelligence

### 9.1 AI Chatbot (สำหรับลูกค้า B2C)

**สิ่งที่ AI ทำได้:**
- 💬 ตอบคำถามสุขภาพทั่วไป ("ปวดหัว ควรกินอะไร?")
- 🔍 ค้นหาสินค้าจากข้อความ ("มี paracetamol 500mg ไหม")
- 📸 อ่านใบสั่งยา → สร้าง draft order
- 🧾 อ่านสลิป → ยืนยันการชำระเงิน
- 💡 แนะนำสินค้าจากอาการ
- 📋 สรุปประวัติสั่งซื้อ / ยาเรื้อรัง
- 😊 Sentiment detection — ถ้าลูกค้าไม่พอใจ → ส่งให้พนักงาน

**สิ่งที่ AI ทำไม่ได้ (ต้องเภสัชกร):**
- ❌ ยืนยันใบสั่งยา
- ❌ แนะนำยาอันตราย (DD) โดยตรง
- ❌ เปลี่ยนขนาดยา
- ❌ วินิจฉัยโรค

### 9.2 Symptom-based Product Recommendation

```
ลูกค้า: "มีอาการไข้ ปวดตัว คัดจมูก สัก 3 วันแล้ว อยากซื้อยา"

AI Response:
"คุณดูเหมือนมีอาการไข้หวัดค่ะ 🤒

นี่คือสินค้าที่แนะนำค่ะ:

1. 🏆 Paracetamol 500mg (10 เม็ด) — ฿35
   ลดไข้ บรรเทาอาการปวด
   
2. ⭐ Phenylephrine + Chlorpheniramine (10 เม็ด) — ฿45
   คัดจมูก จมูกคัด น้ำมูกไหล
   
3. 💡 Vitamin C 1000mg (10 เม็ด) — ฿89
   เสริมภูมิคุ้มกัน

4. 📦 ชุดป้องกันไข้หวัด — ฿149 (ประหยัด ฿24!)
   Paracetamol + ยาแก้คัดจมูก + Vitamin C

⚠️ คำแนะนำ: ถ้าไข้ไม่ลดใน 3 วัน แนะนำให้พบแพทย์นะคะ
ต้องการเพิ่มอะไรเพิ่มไหมคะ?"
```

### 9.3 Medication Reminder (แจ้งเตือนทานยา)

- ลูกค้าตั้งค่าเวลาทานยา
- แจ้งเตือนทาง LINE ตามเวลาที่กำหนด:
  - 💊 "ถึงเวลาทาน Metformin 500mg ค่ะ (1 เม็ด หลังอาหารเช้า)"
- ถ้าไม่ confirm → แจ้งซ้ำ 30 นาที
- Weekly report: "สัปดาห์นี้ทานครบ 90% 👍"

---

## 10. โมดูล Admin & Staff

### 10.1 User Roles

| Role | สิทธิ์ | ใช้ที่ |
|------|--------|-------|
| **Super Admin** | ทุกอย่าง | เจ้าของร้าน |
| **Pharmacist** | verify Rx, dispense, counsel, patient records | เภสัชกร |
| **Pharmacist Tech** | จัดสต็อก, packing, delivery | ผู้ช่วยเภสัชกร |
| **Customer Service** | ตอบแชท, จัดการออเดอร์, refund | พนักงานบริการลูกค้า |
| **Marketing** | promotions, broadcast, content | ทีมการตลาด |
| **Accounting** | invoice, slip verify, reports | บัญชี |
| **Delivery** | ดู route, confirm delivery | คนขับ |

### 10.2 Pharmacist Dashboard

- **Queue** — คิวใบสั่งยารอ verify (แบบ priority)
- **Patient Lookup** — ค้นหาคนไข้ด้วยชื่อ/เลขบัตร
- **Drug Reference** — ค้นหาข้อมูลยา, interaction, dose
- **Intervention Log** — บันทึกการแทรกแทรง
- **Clinical Reports** — ADR, DUR, intervention stats

### 10.3 Operations Dashboard

- ยอดขายวันนี้ / เดือนนี้
- ออเดอร์ที่รอดำเนินการ
- สต็อกที่ต่ำ
- สลิปที่รอตรวจ
- ใบสั่งยารอ verify
- Delivery status
- Customer complaints

---

## 11. โมดูล Reports & Analytics

### 11.1 Sales Reports (B2C Focus)

| Report | รายละเอียด |
|--------|------------|
| ยอดขายรายวัน/เดือน | GMV, Net Revenue, จำนวนออเดอร์ |
| Top Products | สินค้าขายดี / กำไรดี |
| Average Order Value (AOV) | เฉลี่ี่ยอออเดอร์ต่อครั้ง |
| Customer Acquisition | ลูกค้าใหม่รายเดือน |
| Retention Rate | ลูกค้ากลับมาซื้อซ้ำ |
| Repeat Purchase Rate | % ลูกค้าที่ซื้อมากกว่า 1 ครั้ง |
| Channel Performance | LINE vs LIFF vs Web |
| Conversion Rate | คนถาม → คนซื้อ |

### 11.2 Telepharmacy Reports

| Report | รายละเอียด |
|--------|------------|
| Rx Volume | จำนวนใบสั่งยา / รอบ verify / reject rate |
| Verification SLA | เวลาเฉลี่ี่ verify / % ภายใน SLA |
| Intervention Rate | จำนวนการแทรกแทรง / 100 ฉบับ |
| ADR Reports | จำนวน ADR / severity / drug |
| Drug Interaction Alerts | จำนวน alerts / severity |
| Patient Satisfaction | ผลสำรวมหลังได้รับบริการ |

---

## 12. Compliance & Legal (B2C Telepharmacy)

### 12.1 กฎหมายที่ต้องปฏิบัติ

| กฎหมาย | สิ่งที่ระบบต้องทำ |
|---------|-------------------|
| **ประกาศ สภาเภสัชกรรม 56/2563** | Patient records, counseling record, delivery tracking |
| **พ.ร.บ.ยา 2510** | บัญชียาซื้อขาย, ควบคุมประเภทยา, เลขทะเบียน อย. |
| **PDPA** | Consent, data access control, right to delete, breach notification |
| **พ.ร.บ.ธุรกรรมอิเล็กทรอนิกส์** | Digital signature สำหรับเภสัชกร |
| **พ.ร.บ.คุ้มครองผู้บริโภค** | ราคาชัดเจน, ไม่โฆษณาหลอกลวง |
| **กฎ FDA Telepharmacy (ใหม่)** | Platform approved, certified delivery |

### 12.2 Record Retention

| Record | เก็บนาน | หมายเหตุ |
|--------|---------|----------|
| ใบสั่งยา | 5 ปี | พ.ร.บ.ยา |
| บันทึกการจ่ายยา | 5 ปี | พ.ร.บ.ยา |
| บันทึกคำปรึกษา (audio/video) | 2 ปี | ประกาศ 56/2563 |
| ข้อมูลผู้ป่วย | ตามกฎหมาย | PDPA |
| ยาควบคุมพิเศษ | 10 ปี | พ.ร.บ.ยาควบคุมพิเศษ |
| บัญชียาซื้อขาย | 5 ปี | พ.ร.บ.ยา |
| ADR report | 5 ปี | กฎ อย. |

---

## 13. Technical Requirements

### 13.1 Performance
- API response < 500ms (P95)
- LINE message processing < 3 วินาที
- รองรับ concurrent users: 200+ (ลูกค้า + พนักงาน)
- **จำนวนออเดอร์สูง** → ต้อง optimize query + caching

### 13.2 AI Requirements
- **OCR:** อ่านใบสั่งยาไทย + สลิปเงินโอน
- **NLP:** เข้าใจภาษาพูดไทย, ย่อคำ, สะกดผิด
- **Drug DB:** ฐานข้อมูลยา + interaction rules (local)
- **LLM:** สำหรับตอบคำถาม + แนะนำสินค้า

### 13.3 Deployment
- Docker
- CI/CD
- Auto-scaling (ถ้า traffic สูง)
- CDN สำหรับรูปสินค้า
- Redis cache (สำหรับ product catalog, session)

---

## 14. Priority Matrix

| โมดูล | Priority | เหตุผล |
|--------|----------|--------|
| **Patient Records + Allergy** | 🔴 P0 | กฎหมายบังคับ + ความปลอดภัย |
| **Product Catalog (HHR + DD)** | 🔴 P0 | ขายอะไรไม่ได้ถ้าไม่มีสินค้า |
| **Prescription Verification** | 🔴 P0 | Core telepharmacy |
| **Drug Interaction + Dose Check** | 🔴 P0 | ความปลอดภัยคนไข้ |
| **Order + Payment** | 🔴 P0 | ลูกค้าต้องซื้อและจ่ายเงินได้ |
| **LINE Integration** | 🔴 P0 | ช่องทางหลัก |
| **Pharmacist Dashboard** | 🔴 P0 | เครื่องมือเภสัชกร |
| **Inventory** | 🟡 P1 | จัดการสต็อก |
| **Delivery Tracking** | 🟡 P1 | ลูกค้าต้องรับของได้ |
| **AI Chatbot** | 🟡 P1 | ลดภาระพนักงาน |
| **OCR (Slip + Rx)** | 🟡 P1 | automate manual work |
| **Patient Counseling** | 🟡 P1 | ตามกฎหมาย |
| **Loyalty + Points** | 🟢 P2 | สร้างความภักดี |
| **Promotions** | 🟢 P2 | เพิ่มยอดขาย |
| **Reports & Analytics** | 🟢 P2 | วิเคราะห์ข้อมูล |
| **Medication Reminder** | 🟢 P2 | คุณภาพบริการ |
| **Health Articles** | 🔵 P3 | Content marketing |
| **Demand Forecasting** | 🔵 P3 | optimize inventory |

---

## Appendix A: สถาปัตยกรรมรวม

```
┌──────────────────────────────────────────────────────────────────┐
│                         LINE Official Account                      │
│                  (ลูกค้า 200-1000+ คน/วัน)                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                     AI Layer (Chatbot)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │  NLP Engine  │ │  OCR Engine  │ │ Drug Safety  │              │
│  │  (Thai)      │ │ (Rx + Slip)  │ │ Checker      │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                     API Gateway + Auth                             │
│              (JWT, Rate Limiting, CORS)                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                     Microservices / Modules                       │
│                                                               │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐  │
│  │ Patient   │ │Telepharm  │ │ Product   │ │ Order &       │  │
│  │ Service   │ │ Service   │ │ Service   │ │ Payment       │  │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └───────┬───────┘  │
│        │             │             │               │           │
│  ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐ ┌───────┴───────┐  │
│  │Inventory │ │Delivery   │ │Loyalty   │ │Notification  │  │
│  │Service   │ │Service    │ │Service   │ │Service       │  │
│  └───────────┘ └───────────┘ └───────────┘ └───────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐    │
│  │              Pharmacist Admin Dashboard                │    │
│  └───────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    ┌────────┼────────┐
                    ▼        ▼        ▼
                 MySQL     Redis   Storage
```

## Appendix B: Tech Stack Recommendation

| Layer | Options | แนะนำ (สำหรับ B2C) |
|-------|---------|---------------------|
| **Backend** | Laravel (PHP), NestJS (Node), FastAPI (Python) | **NestJS** — modern, TypeScript, จัดการ concurrent ดี |
| **Frontend Admin** | Next.js, Livewire, Vue | **Next.js** — เร็ว, SEO, เคยวางไว้ |
| **LINE Frontend** | LIFF (React), LINE Flex Message | **LIFF** — สำหรับ product catalog, checkout |
| **Database** | MySQL, PostgreSQL | **PostgreSQL** — JSON support ดี, strong typing |
| **Cache** | Redis | **Redis** — มีอยู่แล้ว |
| **Queue** | Bull (Redis), RabbitMQ | **Bull** — Redis-based, ง่าย |
| **Search** | Meilisearch, Elasticsearch | **Meilisearch** — lightweight, Thai support ดี |
| **OCR** | Google Vision, AI (Gemini/GPT-4o Vision) | **Gemini Vision** — ใช้อยู่แล้ว |
| **LLM** | Gemini, OpenAI, Claude | **Gemini** — ใช้อยู่แล้ว |
| **Storage** | S3, MinIO, local | **MinIO** (self-hosted) หรือ S3 |
| **Payment** | Omise, Stripe, PromptPay | **Omise** + **PromptPay** |
| **Shipping** | Kerry, Flash, Ninja Van API | ตามที่มีสัญญา |
| **Deployment** | Docker Compose, K8s | **Docker Compose** เริ่ม, K8s ภายหลัง |
