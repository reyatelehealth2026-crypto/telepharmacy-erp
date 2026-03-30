# LINE Telepharmacy ERP — Database Schema

> **Version:** 1.0  
> **Date:** 2026-03-30  
> **Database:** PostgreSQL 16  
> **ORM:** Drizzle ORM  
> **Convention:** snake_case columns, plural table names, UUID PKs

---

## Conventions

```sql
-- Primary Key: UUID with gen_random_uuid()
-- Timestamps: created_at, updated_at (timestamptz)
-- Soft Delete: deleted_at (nullable timestamptz)
-- Status: CHECK constraints + ENUM types
-- Audit: created_by, updated_by (UUID → staff.id)
-- JSONB: สำหรับ flexible/nested data
-- Array: text[] สำหรับ tags/list ง่ายๆ
-- Indexing: B-tree default, GIN for JSONB/arrays, pg_trgm for text search
```

---

## 1. ENUM Types

```sql
-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'super_admin', 'pharmacist', 'pharmacist_tech',
  'customer_service', 'marketing', 'accounting', 'delivery'
);

CREATE TYPE patient_status AS ENUM ('active', 'inactive', 'deceased');

CREATE TYPE patient_title AS ENUM (
  'mr', 'mrs', 'miss', 'ms', 'master', 'infant', 'other'
);

CREATE TYPE gender AS ENUM ('male', 'female', 'other');

CREATE TYPE blood_type AS ENUM (
  'a', 'b', 'ab', 'o', 'a_rh_minus', 'b_rh_minus',
  'ab_rh_minus', 'o_rh_minus', 'unknown'
);

CREATE TYPE insurance_type AS ENUM (
  'none', 'government_30baht', 'social_security',
  'government_civil_servant', 'private'
);

CREATE TYPE allergy_severity AS ENUM (
  'mild', 'moderate', 'severe', 'life_threatening'
);

CREATE TYPE allergy_reaction_type AS ENUM (
  'allergic', 'side_effect', 'intolerance'
);

CREATE TYPE allergy_source AS ENUM (
  'patient_reported', 'doctor_diagnosed', 'pharmacist_identified', 'family_history'
);

CREATE TYPE chronic_disease_status AS ENUM ('active', 'resolved', 'under_treatment');

CREATE TYPE drug_classification AS ENUM (
  'hhr',                    -- ยาสามัญประจำบ้าน
  'dangerous_drug',         -- ยาอันตราย
  'specially_controlled',   -- ยาควบคุมพิเศษ
  'psychotropic',           -- ยาจิตเวช
  'narcotic',               -- ยาเสพติด
  'device',                 -- อุปกรณ์ทางการแพทย์
  'supplement',             -- อาหารเสริม
  'cosmetic',               -- ครีม/เครื่องสำอาง
  'herbal',                 -- สมุนไพร
  'food'                    -- อาหาร/เครื่องดื่มสุขภาพ
);

CREATE TYPE rx_status AS ENUM (
  'received',               -- รับรูปแล้ว
  'ai_processing',          -- AI OCR + pre-check
  'ai_completed',           -- AI เสร็จ รอเภสัชกร
  'pharmacist_reviewing',   -- เภสัชกรกำลังดู
  'approved',               -- อนุมัติจ่ายทั้งหมด
  'partial',                -- จ่ายบางรายการ
  'rejected',               -- ปฏิเสธ
  'referred',               -- ส่งต่อแพทย์
  'dispensing',             -- กำลังจ่ายยา
  'dispensed',              -- จ่ายแล้ว รอชำระ
  'counseling',             -- ให้คำปรึกษา
  'counseling_completed',   -- คำปรึกษาเสร็จ
  'shipped',                -- จัดส่งแล้ว
  'delivered',              -- ส่งถึงลูกค้าแล้ว
  'cancelled',              -- ยกเลิก
  'expired'                 -- หมดอายุ (ไม่จ่าย)
);

CREATE TYPE rx_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE rx_source AS ENUM (
  'paper_rx',               -- รูปใบสั่งยา
  'electronic_rx',          -- e-Claim / ใบสั่งยาอิเล็กทรอนิกส์
  'walk_in',                -- มาที่ร้าน
  'phone_call',             -- โทรมา
  'line_chat'               -- LINE
);

CREATE TYPE safety_check_result AS ENUM ('pass', 'warning', 'fail', 'skip');

CREATE TYPE intervention_type AS ENUM (
  'drug_interaction_prevented',
  'allergy_prevented',
  'dose_adjustment',
  'drug_substitution',
  'therapy_duplication',
  'contraindication',
  'patient_education',
  'referral_to_doctor',
  'other'
);

CREATE TYPE order_type AS ENUM (
  'otc',                    -- ซื้อยาสามัญ
  'rx',                     -- ใบสั่งยา
  'consultation',           -- ปรึกษาแล้วซื้อ
  'refill',                 -- สั่งยาเรื้อรังซ้ำ
  'reorder'                 -- สั่งซื้อซ้ำจากอดีต
);

CREATE TYPE order_status AS ENUM (
  'draft',                  -- ยังไม่ confirm
  'awaiting_payment',
  'paid',
  'processing',
  'packed',
  'ready_to_ship',
  'shipped',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
  'refunding',
  'refunded',
  'returned'
);

CREATE TYPE payment_method AS ENUM (
  'promptpay', 'bank_transfer', 'cod', 'mobile_banking', 'credit_card'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'successful', 'failed', 'expired',
  'refunding', 'refunded', 'partially_refunded'
);

CREATE TYPE delivery_status AS ENUM (
  'pending', 'picking', 'packed', 'ready', 'picked_up',
  'in_transit', 'out_for_delivery', 'nearby',
  'delivered', 'failed', 'returned_to_sender'
);

CREATE TYPE delivery_provider AS ENUM (
  'kerry', 'flash', 'ninja_van', 'j&t', 'dhl',
  'own_driver', 'customer_pickup'
);

CREATE TYPE counseling_method AS ENUM (
  'video_call', 'voice_call', 'line_chat', 'face_to_face', 'none'
);

CREATE TYPE lot_status AS ENUM (
  'available', 'quarantine', 'expired', 'damaged', 'recalled'
);

CREATE TYPE stock_movement_type AS ENUM (
  'purchase_in', 'sale_out', 'return_in', 'return_out',
  'adjustment_in', 'adjustment_out', 'write_off', 'transfer_in', 'transfer_out'
);

CREATE TYPE membership_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

CREATE TYPE points_transaction_type AS ENUM (
  'earned_purchase', 'earned_bonus', 'earned_review',
  'redeemed', 'expired', 'adjusted', 'referral_bonus'
);

CREATE TYPE promotion_type AS ENUM (
  'percentage_discount', 'fixed_discount', 'buy_x_get_y',
  'bundle', 'free_delivery', 'free_gift', 'points_multiplier'
);

CREATE TYPE promotion_status AS ENUM ('draft', 'active', 'paused', 'expired', 'cancelled');

CREATE TYPE notification_channel AS ENUM ('line', 'email', 'sms', 'push', 'in_app');

CREATE TYPE notification_type AS ENUM (
  'order_confirmation', 'payment_received', 'payment_failed',
  'order_shipped', 'order_delivered', 'prescription_status',
  'refill_reminder', 'medication_reminder', 'promotion',
  'low_stock_alert', 'expiry_warning', 'system_alert'
);

CREATE TYPE content_type AS ENUM (
  'health_article', 'product_review', 'faq', 'drug_info', 'promotion_banner'
);

CREATE TYPE chat_session_type AS ENUM ('bot', 'pharmacist', 'ai_assisted');

CREATE TYPE chat_message_role AS ENUM ('user', 'bot', 'pharmacist', 'system');

CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE complaint_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE vat_type AS ENUM ('vat_included', 'vat_excluded', 'no_vat');

CREATE TYPE product_status AS ENUM ('active', 'inactive', 'discontinued', 'draft');
```

---

## 2. Core Tables

### 2.1 staff — พนักงาน / เภสัชกร

```sql
CREATE TABLE staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  title           patient_title NOT NULL DEFAULT 'mr',
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  role            user_role NOT NULL DEFAULT 'customer_service',
  license_no      VARCHAR(50),               -- เลขใบอนุญาตเภสัชกร
  license_expiry  DATE,                      -- วันหมดอายุใบอนุญาต
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_license_for_pharmacist CHECK (
    (role = 'pharmacist' AND license_no IS NOT NULL AND license_expiry IS NOT NULL)
    OR role != 'pharmacist'
  )
);

CREATE INDEX idx_staff_role ON staff(role);
CREATE INDEX idx_staff_active ON staff(is_active) WHERE is_active = true;
```

### 2.2 patients — ข้อมูลลูกค้า/ผู้ป่วย

```sql
CREATE TABLE patients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_no        VARCHAR(20) NOT NULL UNIQUE, -- PT-00001

  -- LINE Binding
  line_user_id      VARCHAR(50) NOT NULL UNIQUE, -- U1234567890
  line_linked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ข้อมูลส่วนตัว
  title             patient_title NOT NULL DEFAULT 'mr',
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  birth_date        DATE NOT NULL,
  gender            gender NOT NULL,
  national_id       VARCHAR(13),                 -- เลขบัตรประชาชน (encrypted)
  weight            DECIMAL(5,2),                -- kg
  height            DECIMAL(5,2),                -- cm
  blood_type        blood_type DEFAULT 'unknown',

  -- ติดต่อ
  phone             VARCHAR(20),
  email             VARCHAR(255),

  -- ที่อยู่จัดส่ง (default)
  address           TEXT,
  sub_district      VARCHAR(100),               -- แขวง/ตำบล
  district          VARCHAR(100),               -- เขต/อำเภอ
  province          VARCHAR(100) NOT NULL,
  postal_code       VARCHAR(10),

  -- สุขภาพ
  is_pregnant       BOOLEAN DEFAULT false,
  is_breastfeeding  BOOLEAN DEFAULT false,
  smoking           BOOLEAN DEFAULT false,
  alcohol           BOOLEAN DEFAULT false,

  -- ประกันสุขภาพ
  insurance_type    insurance_type DEFAULT 'none',
  insurance_id      VARCHAR(50),

  -- PDPA
  pdpa_consent_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdpa_version      VARCHAR(20) NOT NULL DEFAULT '1.0',
  data_sharing_opt  BOOLEAN DEFAULT false,      -- แชร์ข้อมูลกับแพทย์

  -- Status
  status            patient_status NOT NULL DEFAULT 'active',
  deleted_at        TIMESTAMPTZ,                -- soft delete (PDPA right to erasure)

  -- Metadata
  source            VARCHAR(50) DEFAULT 'line', -- line, liff, web, walk_in
  utm_source        VARCHAR(100),
  utm_medium        VARCHAR(100),
  utm_campaign      VARCHAR(100),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_age_reasonable CHECK (
    birth_date <= (CURRENT_DATE - INTERVAL '1 year')
    AND birth_date >= (CURRENT_DATE - INTERVAL '150 years')
  )
);

CREATE INDEX idx_patients_line ON patients(line_user_id);
CREATE INDEX idx_patients_name ON patients(first_name, last_name);
CREATE INDEX idx_patients_phone ON patients(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_patients_status ON patients(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_province ON patients(province);
```

### 2.3 patient_allergies — ประวัติแพ้ยา

```sql
CREATE TABLE patient_allergies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- ข้อมูลแพ้
  drug_name       VARCHAR(255) NOT NULL,         -- ชื่อยาที่แพ้
  generic_names   TEXT[] NOT NULL DEFAULT '{}',  -- ["Penicillin", "Amoxicillin"]
  allergy_group   VARCHAR(100),                 -- Beta-lactam, NSAID, Sulfonamide

  reaction_type   allergy_reaction_type NOT NULL,
  severity        allergy_severity NOT NULL,
  symptoms        TEXT NOT NULL,                 -- อาการ: "ผื่นแดง, หายใจหอบเหนื่อย"

  -- Source
  source          allergy_source DEFAULT 'patient_reported',
  occurred_date   DATE,
  notes           TEXT,

  -- Audit
  recorded_by     UUID REFERENCES staff(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_symptoms_not_empty CHECK (LENGTH(symptoms) > 0)
);

CREATE INDEX idx_allergies_patient ON patient_allergies(patient_id);
CREATE INDEX idx_allergies_drug ON patient_allergies USING gin(to_tsvector('thai', drug_name));
CREATE INDEX idx_allergies_severity ON patient_allergies(severity);
```

### 2.4 patient_chronic_diseases — โรคประจำตัว

```sql
CREATE TABLE patient_chronic_diseases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  disease_name    VARCHAR(255) NOT NULL,         -- เบาหวาน, ความดันโลหิตสูง
  icd10_code      VARCHAR(10),                  -- E11, I10
  status          chronic_disease_status NOT NULL DEFAULT 'active',
  diagnosed_date  DATE,
  notes           TEXT,                          -- HbA1c 7.2%, BP 140/90

  -- แพทย์ผู้วินิจฉัย
  doctor_name     VARCHAR(255),
  hospital        VARCHAR(255),

  recorded_by     UUID REFERENCES staff(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chronic_patient ON patient_chronic_diseases(patient_id);
CREATE INDEX idx_chronic_disease ON patient_chronic_diseases(disease_name);
```

### 2.5 patient_medications — ยาที่ใช้อยู่ปัจจุบัน

```sql
CREATE TABLE patient_medications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  drug_name       VARCHAR(255) NOT NULL,         -- Metformin 500mg
  generic_name    VARCHAR(255),                 -- Metformin
  strength        VARCHAR(50),                  -- 500mg
  dosage_form     VARCHAR(50),                  -- tablet, capsule
  sig             TEXT NOT NULL,                 -- 1เม็ด 2ครั้ง/วัน หลังอาหาร
  duration        VARCHAR(100),                 -- ตลอดชีพ, 3 เดือน

  -- แพทย์ผู้สั่ง
  prescribed_by   VARCHAR(255),                 -- ชื่อแพทย์
  prescribed_at   DATE,

  -- Status
  is_current      BOOLEAN DEFAULT true,
  discontinued_at DATE,
  discontinued_reason TEXT,

  recorded_by     UUID REFERENCES staff(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meds_patient ON patient_medications(patient_id);
CREATE INDEX idx_meds_current ON patient_medications(patient_id, is_current) WHERE is_current = true;
CREATE INDEX idx_meds_drug ON patient_medications USING gin(to_tsvector('thai', drug_name));
```

---

## 3. Drug Database

### 3.1 drugs — ฐานข้อมูลยา (reference)

```sql
CREATE TABLE drugs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ข้อมูลยา
  generic_name        VARCHAR(255) NOT NULL,
  generic_name_th     VARCHAR(255),              -- ชื่อสามัญภาษาไทย
  atc_code            VARCHAR(10),               -- J01CA04 (Amoxicillin)
  atc_category        VARCHAR(255),              -- Antibacterials / Beta-lactam

  -- ลำดับชั้นยา
  classification      drug_classification NOT NULL,
  requires_prescription BOOLEAN DEFAULT false,
  requires_pharmacist BOOLEAN DEFAULT false,

  -- รูปแบบยา
  dosage_forms        TEXT[] DEFAULT '{}',       -- ['tablet', 'syrup', 'injection']

  -- ขนาดยาที่มี
  available_strengths JSONB DEFAULT '[]',        -- [{"strength":"500mg","form":"tablet"},...]

  -- ข้อควรระวัง
  pregnancy_category VARCHAR(5),                 -- A, B, C, D, X
  breastfeeding_safe  BOOLEAN,
  pediatric_safe      BOOLEAN,
  geriatric_safe      BOOLEAN,

  -- ข้อมูลทางคลินิก
  half_life           VARCHAR(50),               -- 6-12 hours
  protein_binding     VARCHAR(50),               -- 90%
  metabolism          TEXT,                       -- Hepatic CYP3A4
  excretion           TEXT,                       -- Renal
  therapeutic_range   JSONB DEFAULT '[]',        -- [{"min":10,"max":20,"unit":"mg/L"}]

  -- ข้อมูลสำหรับผู้ป่วย
  common_side_effects TEXT[],                    -- ['คลื่นไส้', 'ปวดหัว']
  serious_side_effects TEXT[],                   -- ['anaphylaxis', 'Stevens-Johnson']
  contraindications   TEXT,                      -- คำอธิบาย
  food_interactions   JSONB DEFAULT '[]',        -- [{"food":"องุ่น","effect":"ลดประสิทธิภาพ"}]
  storage_info        TEXT,                      -- เก็บที่ 15-30°C

  -- ค้นหา
  synonyms            TEXT[] DEFAULT '{}',       -- ชื่ออื่นๆ / alias
  tags                TEXT[] DEFAULT '{}',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_drugs_generic ON drugs(generic_name);
CREATE INDEX idx_drugs_atc ON drugs(atc_code) WHERE atc_code IS NOT NULL;
CREATE INDEX idx_drugs_class ON drugs(classification);
CREATE INDEX idx_drugs_search ON drugs USING gin(to_tsvector('thai', COALESCE(generic_name,'') || ' ' || COALESCE(generic_name_th,'')));
```

### 3.2 drug_interactions — การ interact ระหว่างยา

```sql
CREATE TABLE drug_interactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a_id       UUID NOT NULL REFERENCES drugs(id),
  drug_b_id       UUID NOT NULL REFERENCES drugs(id),

  severity        VARCHAR(20) NOT NULL,         -- contraindicated, major, moderate, minor
  mechanism       TEXT NOT NULL,                 -- "CYP3A4 inhibition → ระดับยาในเลือดสูง"
  clinical_effect TEXT NOT NULL,                 -- "เพิ่มความเสี่ยงหัวใจวาย"
  management      TEXT,                          -- "หลีกเลี่ยงการใช้ร่วม / ลดขนาด / monitor ระดับยา"
  evidence_level  VARCHAR(20),                   -- established, probable, suspected, possible
  references      JSONB DEFAULT '[]',           -- ["Thai Drug Interaction 2024", ...]

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_severity CHECK (severity IN ('contraindicated','major','moderate','minor'))
);

CREATE INDEX idx_interaction_drug_a ON drug_interactions(drug_a_id);
CREATE INDEX idx_interaction_drug_b ON drug_interactions(drug_b_id);
CREATE UNIQUE INDEX idx_interaction_pair ON drug_interactions(LEAST(drug_a_id, drug_b_id), GREATEST(drug_a_id, drug_b_id));
CREATE INDEX idx_interaction_severity ON drug_interactions(severity);
```

### 3.3 drug_disease_contraindications — ยา vs โรค

```sql
CREATE TABLE drug_disease_contraindications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id         UUID NOT NULL REFERENCES drugs(id),
  disease_name    VARCHAR(255) NOT NULL,         -- เบาหวาน, มะเร็ง, หัวใจ
  icd10_pattern   VARCHAR(50),                  -- E1%, I50, etc.
  severity        VARCHAR(20) NOT NULL,         -- contraindicated, caution, monitor
  reason          TEXT NOT NULL,
  alternative     TEXT,                          -- ยาทางเลือก
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ddc_drug ON drug_disease_contraindications(drug_id);
CREATE INDEX idx_ddc_disease ON drug_disease_contraindications(disease_name);
```

### 3.4 drug_allergy_groups — cross-allergy mapping

```sql
CREATE TABLE drug_allergy_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name      VARCHAR(100) NOT NULL UNIQUE,  -- "Beta-lactam", "Sulfonamide", "NSAID"
  description     TEXT,
  generic_names   TEXT[] NOT NULL DEFAULT '{}',  -- ["Penicillin", "Amoxicillin", "Ampicillin"]
  detection_hint  TEXT                           -- "หากแพ้ Penicillin ให้ทดสอบ cross-reaction"
);

CREATE INDEX idx_allergy_group_names ON drug_allergy_groups USING gin(generic_names);
```

---

## 4. Product Catalog

### 4.1 categories — หมวดหมู่สินค้า

```sql
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_th         VARCHAR(100) NOT NULL,
  name_en         VARCHAR(100),
  slug            VARCHAR(120) NOT NULL UNIQUE,  -- otc-pain-relief, supplements-vitamins
  parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon            VARCHAR(50),                   -- emoji หรือ icon name
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;
```

### 4.2 products — สินค้าที่ขาย

```sql
CREATE TABLE products (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                     VARCHAR(50) NOT NULL UNIQUE,
  name_th                 VARCHAR(255) NOT NULL,
  name_en                 VARCHAR(255),
  slug                    VARCHAR(300) NOT NULL UNIQUE,

  -- ข้อมูลยา
  drug_id                 UUID REFERENCES drugs(id),     -- เชื่อมกับ drug reference
  generic_name            VARCHAR(255),
  brand                   VARCHAR(100) NOT NULL,
  manufacturer            VARCHAR(255),
  category_id             UUID NOT NULL REFERENCES categories(id),
  drug_classification     drug_classification NOT NULL,
  requires_prescription   BOOLEAN DEFAULT false,
  requires_pharmacist     BOOLEAN DEFAULT false,

  -- รายละเอียดสินค้า
  dosage_form             VARCHAR(50),                  -- tablet, capsule, syrup, cream
  strength                VARCHAR(50),                  -- 500mg, 10mg/ml
  pack_size               VARCHAR(50),                  -- 10เม็ด, 100ml
  unit                    VARCHAR(20) NOT NULL,         -- ขวด, แผง, กล่อง, หลอด
  barcode                 VARCHAR(50),
  fda_registration_no     VARCHAR(50),

  -- รายละเอียดแสดง
  short_description       TEXT,                          -- LINE message (max 160 chars)
  full_description        TEXT,                          -- LIFF / web page
  how_to_use              TEXT,
  warnings                TEXT,
  side_effects            TEXT,
  contraindications       TEXT,
  ingredients             TEXT,

  -- รูปภาพ
  images                  JSONB DEFAULT '[]'::jsonb,    -- [{url,alt,is_primary}]

  -- ราคา
  sell_price              DECIMAL(10,2) NOT NULL,
  member_price            DECIMAL(10,2),                -- ราคาสมาชิก
  compare_price           DECIMAL(10,2),                -- ราคาปกติ (ขีดโทษ)
  cost_price              DECIMAL(10,2) NOT NULL,        -- ราคาทุน
  vat_type                vat_type DEFAULT 'vat_included',

  -- สต็อก config
  min_stock               DECIMAL(10,2) DEFAULT 0,
  max_stock               DECIMAL(10,2),
  reorder_point           DECIMAL(10,2) DEFAULT 10,

  -- จัดส่ง
  cold_chain              BOOLEAN DEFAULT false,
  storage_instruction     VARCHAR(255),
  shelf_life_months       INTEGER,
  weight_gram             DECIMAL(8,2),                 -- น้ำหนักสำหรับคำนวณค่าจัดส่ง

  -- สถานะ
  status                  product_status DEFAULT 'draft',
  is_featured             BOOLEAN DEFAULT false,
  is_new                  BOOLEAN DEFAULT false,
  sort_order              INTEGER DEFAULT 0,

  -- SEO / Search
  tags                    TEXT[] DEFAULT '{}',
  seo_keywords            TEXT[] DEFAULT '{}',
  search_keywords         TEXT[],                       -- คำค้นหายอดนิยม / ชื่อย่อ

  -- Audit
  created_by              UUID REFERENCES staff(id),
  updated_by              UUID REFERENCES staff(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_classification ON products(drug_classification);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_status ON products(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true AND deleted_at IS NULL;
CREATE INDEX idx_products_rx ON products(requires_prescription) WHERE requires_prescription = true AND deleted_at IS NULL;
CREATE INDEX idx_products_search ON products USING gin(
  to_tsvector('thai', COALESCE(name_th,'') || ' ' || COALESCE(name_en,'') || ' ' || COALESCE(generic_name,''))
);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
```

---

## 5. Inventory

### 5.1 inventory_lots — Lot/Batch

```sql
CREATE TABLE inventory_lots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES products(id),
  lot_no              VARCHAR(100) NOT NULL,

  -- วันที่
  manufacturing_date  DATE,
  expiry_date         DATE NOT NULL,
  received_date       DATE NOT NULL DEFAULT CURRENT_DATE,

  -- จำนวน
  quantity_received   DECIMAL(12,3) NOT NULL,
  quantity_available  DECIMAL(12,3) NOT NULL DEFAULT 0,
  quantity_reserved   DECIMAL(12,3) NOT NULL DEFAULT 0,
  quantity_damaged    DECIMAL(12,3) NOT NULL DEFAULT 0,

  -- ราคาทุน (ต่อ lot)
  cost_price          DECIMAL(10,2) NOT NULL,

  -- ที่เก็บ
  warehouse_location  VARCHAR(50),                   -- A-01-03
  warehouse_zone      VARCHAR(50),                   -- ambient, cold, frozen

  -- Supplier
  supplier_id         UUID,
  supplier_lot_ref    VARCHAR(100),                 -- PO reference

  -- Status
  status              lot_status DEFAULT 'available',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_qty_non_negative CHECK (
    quantity_available >= 0
    AND quantity_reserved >= 0
    AND quantity_damaged >= 0
  ),
  CONSTRAINT chk_not_expired CHECK (
    status != 'expired' OR expiry_date < CURRENT_DATE
  )
);

CREATE INDEX idx_lots_product ON inventory_lots(product_id);
CREATE INDEX idx_lots_expiry ON inventory_lots(expiry_date);
CREATE INDEX idx_lots_status ON inventory_lots(status);
CREATE INDEX idx_lots_location ON inventory_lots(warehouse_location);
-- FEFO index: เลือก lot ที่ใกล้หมดอายุก่อน
CREATE INDEX idx_lots_fefo ON inventory_lots(product_id, expiry_date ASC)
  WHERE status = 'available' AND quantity_available > 0;
```

### 5.2 stock_movements — บันทึกการเคลื่อนไหวสต็อก

```sql
CREATE TABLE stock_movements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id              UUID NOT NULL REFERENCES inventory_lots(id),
  product_id          UUID NOT NULL REFERENCES products(id),

  movement_type       stock_movement_type NOT NULL,
  quantity            DECIMAL(12,3) NOT NULL,        -- จำนวน (+ หรือ -)
  unit_cost           DECIMAL(10,2),                 -- ราคาทุนตอนเคลื่อนไหว

  -- Reference
  reference_type      VARCHAR(50),                   -- order, purchase_order, adjustment, return
  reference_id        UUID,                          -- FK ไป order หรือ PO

  -- หมายเหตุ
  reason              TEXT,
  notes               TEXT,

  -- Audit
  performed_by        UUID REFERENCES staff(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stockmov_lot ON stock_movements(lot_id);
CREATE INDEX idx_stockmov_product ON stock_movements(product_id);
CREATE INDEX idx_stockmov_type ON stock_movements(movement_type);
CREATE INDEX idx_stockmov_date ON stock_movements(created_at DESC);
CREATE INDEX idx_stockmov_reference ON stock_movements(reference_type, reference_id);
```

---

## 6. Prescriptions

### 6.1 prescriptions — ใบสั่งยา

```sql
CREATE TABLE prescriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rx_no               VARCHAR(30) NOT NULL UNIQUE,   -- RX-20260330-001

  -- ผู้ป่วย
  patient_id          UUID NOT NULL REFERENCES patients(id),

  -- แพทย์ผู้สั่ง
  prescriber_name     VARCHAR(255),
  prescriber_license  VARCHAR(50),
  prescriber_hospital VARCHAR(255),
  prescriber_dept     VARCHAR(100),

  -- ข้อมูลใบสั่งยา
  rx_date             DATE,
  source              rx_source NOT NULL DEFAULT 'paper_rx',
  diagnosis           TEXT,                          -- ICD-10 หรือข้อความ

  -- รูปใบสั่งยา
  images              JSONB DEFAULT '[]'::jsonb,    -- [{url,uploaded_at}]

  -- OCR Result
  ocr_status          VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  ocr_result          JSONB,                         -- ผล OCR เต็ม
  ocr_confidence      DECIMAL(5,2),                  -- 0-100
  ocr_processed_at    TIMESTAMPTZ,

  -- AI Safety Checks (summary)
  ai_checks_passed    BOOLEAN,
  ai_checks_result    JSONB,                         -- ผล check ทั้งหมด
  ai_priority         rx_priority DEFAULT 'low',

  -- Status
  status              rx_status NOT NULL DEFAULT 'received',
  rejection_reason    TEXT,

  -- ผูกกับออเดอร์
  order_id            UUID,                          -- FK → orders (set หลังสร้างออเดอร์)

  -- เภสัชกรผู้ตรวจสอบ
  verified_by         UUID REFERENCES staff(id),
  verified_at         TIMESTAMPTZ,

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rx_patient ON prescriptions(patient_id);
CREATE INDEX idx_rx_status ON prescriptions(status);
CREATE INDEX idx_rx_priority ON prescriptions(ai_priority);
CREATE INDEX idx_rx_date ON prescriptions(rx_date DESC);
CREATE INDEX idx_rx_verified ON prescriptions(verified_by, verified_at);
CREATE INDEX idx_rx_created ON prescriptions(created_at DESC);
```

### 6.2 prescription_items — รายการยาในใบสั่ง

```sql
CREATE TABLE prescription_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id     UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,

  -- ข้อมูลจากใบสั่งยา (อ่านจาก OCR / manual)
  item_no             INTEGER NOT NULL,              -- ลำดับ
  drug_name           VARCHAR(255) NOT NULL,         -- ชื่อบนใบสั่ง
  strength            VARCHAR(50),
  dosage_form         VARCHAR(50),
  quantity            DECIMAL(10,2) NOT NULL,
  sig                 TEXT,                          -- "1x2 หลังอาหาร"
  duration            VARCHAR(100),                  -- "7 วัน"

  -- Match กับสินค้า
  matched_product_id  UUID REFERENCES products(id),  -- สินค้าที่ match
  match_confidence    DECIMAL(5,2),                  -- 0-100
  match_status        VARCHAR(20) DEFAULT 'pending', -- pending, matched, no_match, multiple_options

  -- Lot ที่จ่าย (หลัง dispense)
  dispensed_lot_id    UUID REFERENCES inventory_lots(id),
  dispensed_qty       DECIMAL(10,2),

  -- ราคา
  unit_price          DECIMAL(10,2),
  total_price         DECIMAL(10,2),

  -- เภสัชกรตัดสินใจ
  pharmacist_decision VARCHAR(20),                  -- approved, substituted, skipped, needs_clarification
  substitution_note   TEXT,                          -- "เปลี่ยนเป็น Amoxicillin 250mg แทน"
  skip_reason         TEXT,

  -- Status
  status              VARCHAR(20) DEFAULT 'pending', -- pending, verified, dispensed, skipped

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_item_no_positive CHECK (item_no > 0)
);

CREATE INDEX idx_rxitems_rx ON prescription_items(prescription_id);
CREATE INDEX idx_rxitems_product ON prescription_items(matched_product_id) WHERE matched_product_id IS NOT NULL;
CREATE INDEX idx_rxitems_status ON prescription_items(status);
```

### 6.3 safety_checks — ผลตรวจสอบความปลอดภัย (ราย item)

```sql
CREATE TABLE safety_checks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_item_id UUID NOT NULL REFERENCES prescription_items(id) ON DELETE CASCADE,

  check_type          VARCHAR(50) NOT NULL,         -- allergy, interaction, dose, contraindication, duplicate_therapy, pregnancy
  result              safety_check_result NOT NULL,
  severity            VARCHAR(20),                  -- ถ้า result != pass
  description         TEXT NOT NULL,                 -- "Patient has Penicillin allergy"
  recommendation      TEXT,                          -- "Do not dispense. Contact prescriber."

  -- Reference
  reference_drug_id   UUID REFERENCES drugs(id),    -- ยาที่ interact
  reference_rule_id   UUID,                          -- FK ไป drug_interactions / drug_disease_contraindications

  -- AI generated
  ai_generated        BOOLEAN DEFAULT true,
  ai_confidence       DECIMAL(5,2),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_safety_item ON safety_checks(prescription_item_id);
CREATE INDEX idx_safety_type ON safety_checks(check_type);
CREATE INDEX idx_safety_result ON safety_checks(result);
```

### 6.4 pharmacist_interventions — บันทึกการแทรกแทรง

```sql
CREATE TABLE pharmacist_interventions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id     UUID NOT NULL REFERENCES prescriptions(id),

  intervention_type   intervention_type NOT NULL,
  description         TEXT NOT NULL,                 -- "Detected drug interaction: Warfarin + Aspirin"
  action_taken        TEXT NOT NULL,                 -- "Contacted prescriber, changed to Paracetamol"
  outcome             TEXT,                          -- "Prescriber agreed to change"
  severity            VARCHAR(20) NOT NULL,         -- mild, moderate, severe, critical

  -- ผู้บันทึก
  pharmacist_id       UUID NOT NULL REFERENCES staff(id),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intervention_rx ON pharmacist_interventions(prescription_id);
CREATE INDEX idx_intervention_pharmacist ON pharmacist_interventions(pharmacist_id);
CREATE INDEX idx_intervention_type ON pharmacist_interventions(intervention_type);
CREATE INDEX idx_intervention_date ON pharmacist_interventions(created_at DESC);
```

### 6.5 counseling_sessions — บันทึกการให้คำปรึกษา

```sql
CREATE TABLE counseling_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id     UUID REFERENCES prescriptions(id),

  method              counseling_method NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ,
  duration_seconds    INTEGER,

  -- เนื้อหาที่คุย
  topics_covered      TEXT[] DEFAULT '{}',          -- ['วิธีใช้ยา', 'ผลข้างเคียง', 'อาหารที่หลีกเลี่ยง']
  notes               TEXT,

  -- การบันทึก (audio/video)
  recording_url       TEXT,                          -- URL ไป MinIO
  recording_type      VARCHAR(20),                  -- audio, video
  recording_size_mb   DECIMAL(8,2),
  recording_duration  INTEGER,                      -- seconds

  -- ยืนยันจากคนไข้
  patient_confirmed   BOOLEAN DEFAULT false,
  confirmed_at        TIMESTAMPTZ,

  -- เภสัชกร
  pharmacist_id       UUID NOT NULL REFERENCES staff(id),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_recording_retention CHECK (
    recording_url IS NULL
    OR (recording_url IS NOT NULL AND created_at > CURRENT_DATE - INTERVAL '2 years')
  )
);

CREATE INDEX idx_counseling_rx ON counseling_sessions(prescription_id) WHERE prescription_id IS NOT NULL;
CREATE INDEX idx_counseling_pharmacist ON counseling_sessions(pharmacist_id);
```

---

## 7. Orders

### 7.1 orders — ออเดอร์

```sql
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no            VARCHAR(30) NOT NULL UNIQUE,  -- REYA-20260330-001

  -- ลูกค้า
  patient_id          UUID NOT NULL REFERENCES patients(id),

  -- ประเภทออเดอร์
  order_type          order_type NOT NULL DEFAULT 'otc',
  prescription_id     UUID REFERENCES prescriptions(id), -- ถ้าเป็น Rx order

  -- สถานะ
  status              order_status NOT NULL DEFAULT 'draft',
  cancellation_reason TEXT,

  -- ราคา
  subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_code       VARCHAR(20),                  -- promo code
  delivery_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
  cold_chain_fee      DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  points_earned       INTEGER DEFAULT 0,
  points_redeemed     INTEGER DEFAULT 0,
  points_discount     DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- จัดส่ง
  delivery_address    TEXT NOT NULL,
  delivery_sub_district VARCHAR(100),
  delivery_district   VARCHAR(100),
  delivery_province   VARCHAR(100) NOT NULL,
  delivery_postal_code VARCHAR(10),
  delivery_phone      VARCHAR(20) NOT NULL,
  delivery_recipient  VARCHAR(255) NOT NULL,         -- ชื่อผู้รับ
  delivery_notes      TEXT,                          -- "วางไว้หน้าประตู"

  cold_chain_required BOOLEAN DEFAULT false,

  -- Channel
  source              VARCHAR(20) DEFAULT 'line',   -- line, liff, web
  line_message_id     VARCHAR(50),                  -- LINE message ID ที่สร้างออเดอร์

  -- หมายเหตุ
  notes               TEXT,                          -- จากลูกค้า
  internal_notes      TEXT,                          -- จากพนักงาน

  -- Timestamps
  paid_at             TIMESTAMPTZ,
  processed_at        TIMESTAMPTZ,
  packed_at           TIMESTAMPTZ,
  shipped_at          TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_type ON orders(order_type);
CREATE INDEX idx_orders_date ON orders(created_at DESC);
CREATE INDEX idx_orders_paid ON orders(paid_at DESC) WHERE paid_at IS NOT NULL;
CREATE INDEX idx_orders_source ON orders(source);
```

### 7.2 order_items — รายการสินค้าในออเดอร์

```sql
CREATE TABLE order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id),

  item_no             INTEGER NOT NULL,
  product_name        VARCHAR(255) NOT NULL,         -- snapshot ชื่อตอนสั่ง
  sku                 VARCHAR(50),
  drug_classification drug_classification,

  quantity            DECIMAL(10,2) NOT NULL,
  unit                VARCHAR(20) NOT NULL,
  unit_price          DECIMAL(10,2) NOT NULL,
  discount_amount     DECIMAL(10,2) DEFAULT 0,
  total_price         DECIMAL(12,2) NOT NULL,

  -- Lot ที่จ่าย (เพิ่มหลัง dispense)
  lot_id              UUID REFERENCES inventory_lots(id),

  -- Refill reference
  refill_from_item_id UUID REFERENCES order_items(id), -- ถ้าเป็น refill

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orderitems_order ON order_items(order_id);
CREATE INDEX idx_orderitems_product ON order_items(product_id);
CREATE INDEX idx_orderitems_lot ON order_items(lot_id) WHERE lot_id IS NOT NULL;
```

### 7.3 payments — การชำระเงิน

```sql
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no          VARCHAR(30) NOT NULL UNIQUE,   -- PAY-20260330-001
  order_id            UUID NOT NULL REFERENCES orders(id),

  method              payment_method NOT NULL,
  status              payment_status NOT NULL DEFAULT 'pending',
  amount              DECIMAL(12,2) NOT NULL,

  -- PromptPay
  promptpay_payload   VARCHAR(255),                  -- QR payload
  promptpay_ref       VARCHAR(50),                   --  ref จาก bank

  -- Bank Transfer / Slip
  slip_image_url      TEXT,                          -- รูปสลิป
  slip_ocr_result     JSONB,                         -- ผล OCR: amount, date, time
  slip_verified_by    UUID REFERENCES staff(id),
  slip_verified_at    TIMESTAMPTZ,
  slip_match_status   VARCHAR(20),                   -- matched, mismatch, pending_manual

  -- COD
  cod_collected_amount DECIMAL(12,2),

  -- Refund
  refund_amount       DECIMAL(12,2),
  refund_reason       TEXT,
  refund_ref          VARCHAR(50),

  -- Gateway reference
  gateway             VARCHAR(50),                   -- omise, scb, ktb, etc.
  gateway_ref         VARCHAR(255),

  -- Timestamps
  paid_at             TIMESTAMPTZ,
  expired_at          TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_date ON payments(created_at DESC);
CREATE INDEX idx_payments_slip_pending ON payments(status)
  WHERE status = 'pending' AND method = 'bank_transfer';
```

### 7.4 deliveries — การจัดส่ง

```sql
CREATE TABLE deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id),

  status              delivery_status NOT NULL DEFAULT 'pending',
  provider            delivery_provider NOT NULL,
  tracking_no         VARCHAR(100),

  -- ราคา
  fee                 DECIMAL(10,2) NOT NULL DEFAULT 0,
  cod_amount          DECIMAL(12,2),

  -- Cold chain
  cold_chain          BOOLEAN DEFAULT false,
  temp_logger_id      VARCHAR(50),                  -- ถ้ามี temperature logger

  -- เวลา
  picked_up_at        TIMESTAMPTZ,
  estimated_delivery  TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,

  -- ผู้รับ
  receiver_name       VARCHAR(255),
  receiver_phone      VARCHAR(20),
  receiver_relation   VARCHAR(50),                   -- self, family, other
  delivery_proof_url  TEXT,                          -- รูป/ลายเซ็น

  -- Notes
  notes               TEXT,
  failure_reason      TEXT,

  -- Courier info
  courier_name        VARCHAR(100),
  courier_phone       VARCHAR(20),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_tracking ON deliveries(tracking_no) WHERE tracking_no IS NOT NULL;
CREATE INDEX idx_deliveries_provider ON deliveries(provider);
```

---

## 8. Loyalty & Promotions

### 8.1 loyalty_accounts — บัญชีแต้ม

```sql
CREATE TABLE loyalty_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL UNIQUE REFERENCES patients(id),

  current_points      INTEGER NOT NULL DEFAULT 0,
  lifetime_points     INTEGER NOT NULL DEFAULT 0,
  lifetime_spent      DECIMAL(12,2) NOT NULL DEFAULT 0,
  tier                membership_tier NOT NULL DEFAULT 'bronze',

  -- Tier thresholds (snapshot)
  tier_upgrade_at     TIMESTAMPTZ,
  tier_last_calculated TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_points_non_negative CHECK (current_points >= 0)
);
```

### 8.2 points_transactions — รายการแต้ม

```sql
CREATE TABLE points_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id  UUID NOT NULL REFERENCES loyalty_accounts(id),

  type                points_transaction_type NOT NULL,
  points              INTEGER NOT NULL,              -- + หรือ -
  balance_after       INTEGER NOT NULL,              -- ยอดคงเหลือหลัง transaction

  -- Reference
  reference_type      VARCHAR(50),                   -- order, review, promotion
  reference_id        UUID,

  -- Expiry
  expires_at          TIMESTAMPTZ,

  -- Description
  description         TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_points_account ON points_transactions(loyalty_account_id);
CREATE INDEX idx_points_type ON points_transactions(type);
CREATE INDEX idx_points_expires ON points_transactions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_points_date ON points_transactions(created_at DESC);
```

### 8.3 promotions — โปรโมชั่น

```sql
CREATE TABLE promotions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(30) UNIQUE,             -- สำหรับ promo code
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  type                promotion_type NOT NULL,

  -- ขอบเขต
  product_ids         UUID[] DEFAULT '{}',           -- สินค้าที่ใช้ได้ (null = ทั้งหมด)
  category_ids        UUID[] DEFAULT '{}',           -- หมวดหมู่ที่ใช้ได้
  tier_required       membership_tier,               -- ต้องเป็นสมาชิกขั้นนี้ขึ้นไป
  min_order_amount    DECIMAL(12,2),                 -- ยอดขั้นต่ำ
  max_discount        DECIMAL(12,2),                 -- ส่วนลดสูงสุด

  -- Value
  value               DECIMAL(10,2) NOT NULL,        -- % หรือ บาท หรือ qty
  buy_quantity        INTEGER,                      -- สำหรับ buy_x_get_y
  get_quantity        INTEGER,

  -- ใช้ได้กี่ครั้ง
  usage_limit         INTEGER,                      -- null = unlimited
  usage_per_customer  INTEGER DEFAULT 1,             -- ต่อคน
  usage_count         INTEGER NOT NULL DEFAULT 0,

  -- เวลา
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,

  status              promotion_status DEFAULT 'draft',
  created_by          UUID REFERENCES staff(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_positive_value CHECK (value > 0)
);

CREATE INDEX idx_promo_status ON promotions(status);
CREATE INDEX idx_promo_dates ON promotions(starts_at, ends_at);
CREATE INDEX idx_promo_code ON promotions(code) WHERE code IS NOT NULL;
```

---

## 9. Chat & AI

### 9.1 chat_sessions — วาระสนทนา

```sql
CREATE TABLE chat_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  line_user_id        VARCHAR(50) NOT NULL,

  session_type        chat_session_type NOT NULL DEFAULT 'bot',

  -- Context
  order_id            UUID REFERENCES orders(id),
  prescription_id     UUID REFERENCES prescriptions(id),

  -- AI context
  ai_model            VARCHAR(50),
  ai_session_id       VARCHAR(255),                  -- สำหรับ maintain conversation memory

  -- Routing
  assigned_to         UUID REFERENCES staff(id),    -- pharmacist ที่รับเคส
  assigned_at         TIMESTAMPTZ,
  transferred_reason  TEXT,

  -- Status
  status              VARCHAR(20) DEFAULT 'active', -- active, transferred, resolved, abandoned
  patient_satisfaction INTEGER,                     -- 1-5 stars
  resolved_at         TIMESTAMPTZ,

  -- Metrics
  message_count       INTEGER DEFAULT 0,
  first_response_at   TIMESTAMPTZ,                  -- เวลาตอบแรก
  avg_response_time   INTEGER,                      -- seconds

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_patient ON chat_sessions(patient_id);
CREATE INDEX idx_chat_staff ON chat_sessions(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_chat_status ON chat_sessions(status);
CREATE INDEX idx_chat_date ON chat_sessions(created_at DESC);
```

### 9.2 chat_messages — ข้อความในแชท

```sql
CREATE TABLE chat_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,

  role                chat_message_role NOT NULL,
  content             TEXT NOT NULL,

  -- LINE specific
  line_message_id     VARCHAR(50),
  message_type        VARCHAR(20),                   -- text, image, flex, etc.

  -- Attachments
  attachments         JSONB DEFAULT '[]'::jsonb,    -- [{type, url, thumbnail_url}]

  -- AI metadata
  ai_model            VARCHAR(50),
  ai_tokens_used      INTEGER,
  ai_processing_ms    INTEGER,

  -- Staff
  sent_by_staff       UUID REFERENCES staff(id),

  -- Sentiment (computed)
  sentiment           VARCHAR(20),                   -- positive, neutral, negative, angry
  sentiment_score     DECIMAL(3,2),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chatmsg_session ON chat_messages(session_id);
CREATE INDEX idx_chatmsg_role ON chat_messages(session_id, role);
CREATE INDEX idx_chatmsg_sentiment ON chat_messages(sentiment) WHERE sentiment IN ('negative', 'angry');
CREATE INDEX idx_chatmsg_date ON chat_messages(created_at DESC);
```

---

## 10. Notifications

```sql
CREATE TABLE notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID REFERENCES patients(id),
  staff_id            UUID REFERENCES staff(id),

  type                notification_type NOT NULL,
  channel             notification_channel NOT NULL,
  title               VARCHAR(255),
  body                TEXT NOT NULL,

  -- LINE specific
  line_message_type   VARCHAR(20),                   -- text, flex, image, etc.
  line_message_data   JSONB,                         -- Flex message structure

  -- Status
  status              VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed, read
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  read_at             TIMESTAMPTZ,
  error_message       TEXT,

  -- Reference
  reference_type      VARCHAR(50),
  reference_id        UUID,

  -- Retry
  retry_count         INTEGER DEFAULT 0,
  max_retries         INTEGER DEFAULT 3,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_patient ON notifications(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX idx_notif_staff ON notifications(staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX idx_notif_status ON notifications(status);
CREATE INDEX idx_notif_type ON notifications(type);
CREATE INDEX idx_notif_retry ON notifications(status, retry_count)
  WHERE status = 'failed' AND retry_count < 3;
```

---

## 11. Content (Health Articles, FAQ)

```sql
CREATE TABLE content (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                content_type NOT NULL DEFAULT 'health_article',

  title_th            VARCHAR(255) NOT NULL,
  title_en            VARCHAR(255),
  slug                VARCHAR(300) NOT NULL UNIQUE,
  body                TEXT NOT NULL,                 -- Markdown
  excerpt             TEXT,                          -- สรุปสั้น

  -- Product references
  related_product_ids UUID[] DEFAULT '{}',

  -- SEO
  meta_title          VARCHAR(255),
  meta_description    TEXT,
  tags                TEXT[] DEFAULT '{}',
  seo_keywords        TEXT[] DEFAULT '{}',

  -- Featured image
  featured_image_url  TEXT,

  -- Status
  status              VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  published_at        TIMESTAMPTZ,

  -- Author
  author_id           UUID REFERENCES staff(id),

  -- Metrics
  view_count          INTEGER DEFAULT 0,
  share_count         INTEGER DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_published ON content(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_content_search ON content USING gin(to_tsvector('thai', COALESCE(title_th,'') || ' ' || COALESCE(excerpt,'')));
```

---

## 12. Complaints & Feedback

```sql
CREATE TABLE complaints (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID REFERENCES patients(id),
  order_id            UUID REFERENCES orders(id),
  chat_session_id     UUID REFERENCES chat_sessions(id),

  severity            complaint_severity NOT NULL DEFAULT 'medium',
  category            VARCHAR(100),                   -- ยาไม่ถึง, ยาผิด, สลิปผิด, บริการ
  description         TEXT NOT NULL,

  -- Images
  images              JSONB DEFAULT '[]'::jsonb,

  status              complaint_status NOT NULL DEFAULT 'open',
  resolution          TEXT,
  resolved_by         UUID REFERENCES staff(id),
  resolved_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaint_status ON complaints(status);
CREATE INDEX idx_complaint_severity ON complaints(severity);
CREATE INDEX idx_complaint_date ON complaints(created_at DESC);
```

---

## 13. System & Audit

### 13.1 audit_log — บันทึกการเปลี่ยนแปลง

```sql
CREATE TABLE audit_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name          VARCHAR(100) NOT NULL,
  record_id           UUID NOT NULL,
  action              VARCHAR(20) NOT NULL,         -- insert, update, delete
  old_values          JSONB,
  new_values          JSONB,
  changed_by          UUID REFERENCES staff(id),
  changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address          INET
);

CREATE INDEX idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_date ON audit_log(changed_at DESC);
CREATE INDEX idx_audit_user ON audit_log(changed_by) WHERE changed_by IS NOT NULL;
```

### 13.2 system_config — ตั้งค่าระบบ

```sql
CREATE TABLE system_config (
  key                 VARCHAR(100) PRIMARY KEY,
  value               JSONB NOT NULL,
  description         TEXT,
  updated_by          UUID REFERENCES staff(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 13.3 medication_reminders — แจ้งเตือนทานยา

```sql
CREATE TABLE medication_reminders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES patients(id),
  patient_medication_id UUID REFERENCES patient_medications(id),

  drug_name           VARCHAR(255) NOT NULL,
  sig                 TEXT NOT NULL,

  -- เวลาแจ้งเตือน (Thai timezone)
  reminder_times      TIME[] NOT NULL DEFAULT '{}', -- ['08:00', '20:00']
  reminder_days       INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- ทุกวัน

  -- Status
  is_active           BOOLEAN DEFAULT true,
  last_reminded_at    TIMESTAMPTZ,
  last_confirmed_at   TIMESTAMPTZ,

  -- Weekly stats
  weekly_adherence    DECIMAL(5,2),                 -- 0-100 %

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminder_patient ON medication_reminders(patient_id);
CREATE INDEX idx_reminder_active ON medication_reminders(is_active) WHERE is_active = true;
```

---

## 14. ER Diagram (Summary)

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   patients   │────<│ patient_allergies│     │      drugs       │
│              │     └──────────────────┘     │                  │
│              │────<│ patient_chronic_  │     │ drug_interactions│──┐
│              │     │   diseases        │     └──────────────────┘  │
│              │     └──────────────────┘                          │
│              │     ┌──────────────────┐     ┌──────────────────┐  │
│              │────<│ patient_         │     │ drug_disease_    │  │
│              │     │  medications     │     │ contraindications│  │
│              │     └──────────────────┘     └──────────────────┘  │
└──────┬───────┘                                                │
       │                                                        │
       │    ┌──────────────────┐     ┌──────────────────┐        │
       ├───<│  prescriptions   │────<│ prescription_    │──> safety_checks
       │    │                  │     │   items          │        │
       │    └────────┬─────────┘     └──────────────────┘        │
       │             │                                            │
       │    ┌────────┴─────────┐     ┌──────────────────┐        │
       │    │ pharmacist_      │     │ counseling_      │        │
       │    │ interventions    │     │ sessions         │        │
       │    └──────────────────┘     └──────────────────┘        │
       │                                                        │
       │    ┌──────────────────┐     ┌──────────────────┐        │
       ├───<│     orders       │────<│  order_items     │        │
       │    └──┬───────┬───────┘     └──────────────────┘        │
       │       │       │                                         │
       │  ┌────┴───┐ ┌─┴──────────┐     ┌──────────────────┐    │
       │  │payments │ │ deliveries │     │    products      │    │
       │  └────────┘ └────────────┘     │                  │    │
       │                                │  inventory_lots  │    │
       │    ┌──────────────────┐        └────────┬─────────┘    │
       ├───<│ loyalty_accounts │                 │              │
       │    └──────────────────┘        ┌────────┴─────────┐    │
       │                                │ stock_movements  │    │
       │    ┌──────────────────┐        └──────────────────┘    │
       ├───<│  chat_sessions   │                               │
       │    │                  │        ┌──────────────────┐    │
       │    └──────┬───────────┘        │   promotions     │    │
       │           │                    └──────────────────┘    │
       │    ┌──────┴───────────┐                               │
       ├───<│  chat_messages   │        ┌──────────────────┐    │
       │    └──────────────────┘        │   notifications   │    │
       │                                └──────────────────┘    │
       │    ┌──────────────────┐                               │
       └───<│ medication_      │                               │
            │  reminders       │                               │
            └──────────────────┘                               │
                                                              ┘
```

---

## 15. Summary

| Category | Tables | Key Features |
|----------|--------|-------------|
| **Users** | 1 | staff (RBAC) |
| **Patients** | 4 | profile, allergies, diseases, medications |
| **Drug DB** | 4 | drugs, interactions, disease contraindications, allergy groups |
| **Products** | 2 | products, categories |
| **Inventory** | 2 | lots (FEFO), stock movements |
| **Prescriptions** | 5 | Rx header, items, safety checks, interventions, counseling |
| **Orders** | 4 | orders, items, payments, deliveries |
| **Loyalty** | 3 | accounts, points transactions, promotions |
| **Chat/AI** | 2 | sessions, messages (with sentiment) |
| **Notifications** | 1 | multi-channel, retry logic |
| **Content** | 1 | health articles, FAQ |
| **Complaints** | 1 | with severity + resolution tracking |
| **System** | 3 | audit log, config, medication reminders |
| **ENUMs** | 30+ | comprehensive type safety |
| **Total** | **33 tables + 30+ enums** | |

### Design Decisions
1. **UUID PKs** — global uniqueness, no auto-increment collision
2. **JSONB** — flexible data (OCR results, AI checks, images) without schema changes
3. **TEXT[]** — simple arrays for tags, times, days
4. **GIN indexes** — fast search on JSONB, arrays, Thai full-text
5. **pg_trgm** — fuzzy text search for drug names
6. **Soft delete** — `deleted_at` on patients (PDPA compliance)
7. **FEFO index** — dedicated composite index for lot selection
8. **CHECK constraints** — data integrity at DB level
9. **Audit trail** — every change logged
10. **Thai full-text** — `to_tsvector('thai', ...)` for Thai search
