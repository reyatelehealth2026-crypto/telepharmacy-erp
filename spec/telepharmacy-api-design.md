# LINE Telepharmacy ERP — API Design

> **Version:** 1.0  
> **Date:** 2026-03-30  
> **Architecture:** REST + WebSocket  
> **Base URL:** `https://api.re-ya.com/v1`  
> **Auth:** JWT (access + refresh tokens)  
> **Format:** JSON

---

## 1. Conventions

```
Base URL:     /v1
Auth Header:  Authorization: Bearer <access_token>
Content-Type: application/json
Pagination:   ?page=1&limit=20
Sorting:      ?sort=-created_at (prefix - for DESC)
Filtering:    ?status=active&category_id=xxx
Search:       ?q=พาราเซตามอล
Cursor:       ?cursor=eyJpZCI6... (สำหรับ infinite scroll)
Include:      ?include=patient,items,product

Response envelope:
{
  "success": true,
  "data": { ... } | [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  },
  "message": "optional message"
}

Error envelope:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}

Status Codes:
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

---

## 2. Authentication

### 2.1 LINE Login (สำหรับลูกค้า)

```
POST /v1/auth/line-login
```

```json
// Request
{
  "code": "LINE authorization code",
  "redirect_uri": "https://liff.re-ya.com/callback"
}

// Response 201
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "patient": {
    "id": "uuid",
    "patient_no": "PT-00001",
    "first_name": "สมชาย",
    "last_name": "ใจดี",
    "is_registered": true
  }
}
```

### 2.2 Staff Login

```
POST /v1/auth/staff-login
```

```json
// Request
{
  "email": "pharmacist@re-ya.com",
  "password": "********"
}

// Response 201
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "staff": {
    "id": "uuid",
    "name": "เภสัชกรสมหญิง",
    "role": "pharmacist",
    "license_no": "12345"
  }
}
```

### 2.3 Refresh Token

```
POST /v1/auth/refresh
```

```json
// Request
{ "refresh_token": "..." }

// Response 200
{
  "access_token": "new_access_token",
  "expires_in": 3600
}
```

### 2.4 Logout

```
POST /v1/auth/logout
Authorization: Bearer <token>
```

### 2.5 PDPA Consent

```
POST /v1/auth/pdpa-consent
Authorization: Bearer <patient_token>
```

```json
// Request
{
  "version": "1.0",
  "data_sharing_opt": false
}

// Response 200
{
  "consented_at": "2026-03-30T07:00:00+07:00",
  "version": "1.0"
}
```

---

## 3. Patients

### 3.1 Get My Profile

```
GET /v1/patients/me
Authorization: Bearer <patient_token>
```

```json
// Response 200
{
  "id": "uuid",
  "patient_no": "PT-00001",
  "title": "mr",
  "first_name": "สมชาย",
  "last_name": "ใจดี",
  "birth_date": "1981-05-15",
  "age": 44,
  "gender": "male",
  "weight": 70,
  "height": 172,
  "phone": "0812345678",
  "province": "กรุงเทพฯ",
  "allergies": [
    { "drug_name": "Penicillin", "severity": "severe", "symptoms": "หายใจหอบเหนื่อย" }
  ],
  "chronic_diseases": [
    { "disease_name": "เบาหวาน", "status": "active" }
  ],
  "current_medications": [
    { "drug_name": "Metformin 500mg", "sig": "1เม็ด หลังอาหาร 2ครั้ง/วัน" }
  ],
  "loyalty": {
    "tier": "silver",
    "current_points": 2450,
    "lifetime_spent": 8500
  }
}
```

### 3.2 Update My Profile

```
PATCH /v1/patients/me
Authorization: Bearer <patient_token>
```

```json
// Request
{
  "weight": 72,
  "phone": "0812345678",
  "address": "123 ถ.สุขุมวิท",
  "province": "กรุงเทพฯ"
}
```

### 3.3 Allergies

```
GET    /v1/patients/me/allergies
POST   /v1/patients/me/allergies
PATCH  /v1/patients/me/allergies/:id
DELETE /v1/patients/me/allergies/:id
```

```json
// POST Request
{
  "drug_name": "Aspirin",
  "generic_names": ["Aspirin", "Acetylsalicylic acid"],
  "allergy_group": "NSAID",
  "reaction_type": "allergic",
  "severity": "moderate",
  "symptoms": "ผื่นแดงบริเวณหน้าอก",
  "occurred_date": "2025-06-15"
}
```

### 3.4 Chronic Diseases

```
GET    /v1/patients/me/diseases
POST   /v1/patients/me/diseases
PATCH  /v1/patients/me/diseases/:id
DELETE /v1/patients/me/diseases/:id
```

### 3.5 Current Medications

```
GET    /v1/patients/me/medications
POST   /v1/patients/me/medications
PATCH  /v1/patients/me/medications/:id
DELETE /v1/patients/me/medications/:id
```

---

## 4. Staff — Patient Management (เภสัชกร)

### 4.1 Search Patients

```
GET /v1/staff/patients?q=สมชาย&province=กรุงเทพ&page=1&limit=20
Authorization: Bearer <staff_token>
Role: pharmacist, super_admin
```

### 4.2 Get Patient Full Profile

```
GET /v1/staff/patients/:patient_id
```

```json
// Response 200 — full clinical profile
{
  "id": "uuid",
  "patient_no": "PT-00001",
  "personal": { ... },
  "allergies": [ ... ],
  "chronic_diseases": [ ... ],
  "current_medications": [ ... ],
  "prescription_history": {
    "total": 23,
    "recent": [ ... ]
  },
  "order_history": {
    "total": 15,
    "total_spent": 45200,
    "recent": [ ... ]
  },
  "loyalty": {
    "tier": "silver",
    "current_points": 2450,
    "total_earned": 4520,
    "total_redeemed": 2070
  }
}
```

### 4.3 Staff Edit Patient (เภสัชกรบันทึกแทน)

```
PATCH /v1/staff/patients/:patient_id
```

```json
// Request
{
  "weight": 70,
  "allergies": [
    { "drug_name": "Penicillin", "severity": "severe" },
    { "drug_name": "NSAIDs", "severity": "mild" }
  ],
  "chronic_diseases": [
    { "disease_name": "เบาหวาน", "icd10_code": "E11", "status": "active" }
  ]
}
```

---

## 5. Product Catalog

### 5.1 Search Products

```
GET /v1/products?q=พาราเซตามอล&category=otc-pain&classification=hhr&sort=-popularity&page=1&limit=20
```

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "sku": "HHR-PAR-001",
      "name_th": "พาราเซตามอล 500mg",
      "brand": "ยาหลัก",
      "generic_name": "Paracetamol",
      "strength": "500mg",
      "pack_size": "10 เม็ด",
      "unit": "แผง",
      "sell_price": 35,
      "member_price": 33,
      "compare_price": 45,
      "drug_classification": "hhr",
      "requires_prescription": false,
      "image_url": "https://...",
      "in_stock": true,
      "tags": ["ไข้", "ปวดหัว", "ยาสามัญ"]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 15, "total_pages": 1 }
}
```

### 5.2 Get Product Detail

```
GET /v1/products/:id
```

```json
// Response 200
{
  "id": "uuid",
  "sku": "HHR-PAR-001",
  "name_th": "พาราเซตามอล 500mg",
  "name_en": "Paracetamol 500mg",
  "brand": "ยาหลัก",
  "manufacturer": "บริษัทยาหลัก จำกัด",
  "category": { "id": "uuid", "name_th": "ยาไข้" },
  "drug_classification": "hhr",
  "requires_prescription": false,
  "requires_pharmacist": false,
  "dosage_form": "tablet",
  "strength": "500mg",
  "pack_size": "10 เม็ด",
  "unit": "แผง",
  "barcode": "8851234567890",
  "fda_registration_no": "1A 1234/2567",
  "short_description": "บรรเทาอาการปวดและไข้",
  "full_description": "...",
  "how_to_use": "ผู้ใหญ่: 1-2 เม็ด ทุก 4-6 ชม.",
  "warnings": "อย่าเกิน 8 เม็ด/วัน",
  "side_effects": "...",
  "ingredients": "Paracetamol 500mg",
  "images": [...],
  "sell_price": 35,
  "member_price": 33,
  "compare_price": 45,
  "vat_type": "vat_included",
  "in_stock": true,
  "stock_quantity": 150,
  "cold_chain": false,
  "is_featured": false,
  "tags": ["ไข้", "ปวดหัว"],
  "related_products": [ ... ],
  "frequently_bought_together": [ ... ]
}
```

### 5.3 Browse Categories

```
GET /v1/categories
```

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "name_th": "ยาไข้",
      "slug": "otc-pain",
      "icon": "🤒",
      "children": [
        { "id": "uuid", "name_th": "ยาไข้", "slug": "fever-reducer" },
        { "id": "uuid", "name_th": "ยาปวดหัว", "slug": "headache" }
      ],
      "product_count": 25
    }
  ]
}
```

### 5.4 AI Symptom Search

```
POST /v1/products/symptom-search
```

```json
// Request
{
  "symptoms": "ไข้ ปวดตัว คัดจมูก 3 วัน",
  "patient_id": "uuid"  // optional — เพื่อเช็ค allergy/interaction
}

// Response 200
{
  "understanding": {
    "symptoms": ["ไข้", "ปวดตัว", "คัดจมูก"],
    "possible_condition": "ไข้หวัด",
    "confidence": 0.85
  },
  "recommendations": [
    {
      "product": { ... },
      "reason": "ลดไข้ บรรเทาอาการปวด",
      "priority": "recommended"
    }
  ],
  "bundles": [
    {
      "id": "uuid",
      "name": "ชุดป้องกันไข้หวัด",
      "original_price": 169,
      "bundle_price": 149,
      "savings": 20,
      "products": [ ... ]
    }
  ],
  "disclaimer": "คำแนะนำนี้เป็นข้อมูลเบื้องต้น ควรปรึกษาเภสัชกรหากอาการไม่ดีขึ้นใน 3 วัน",
  "safety_alerts": []  // ถ้ามี allergy หรือ interaction
}
```

### 5.5 Staff — Product Management

```
GET    /v1/staff/products                     # list with filters
POST   /v1/staff/products                     # create
GET    /v1/staff/products/:id                 # detail
PATCH  /v1/staff/products/:id                 # update
DELETE /v1/staff/products/:id                 # soft delete
POST   /v1/staff/products/:id/images          # upload images
PATCH  /v1/staff/products/bulk-update         # update many (price, status)
GET    /v1/staff/products/export              # CSV export
POST   /v1/staff/products/import              # CSV import
```

---

## 6. Prescriptions

### 6.1 Submit Prescription (ลูกค้าส่งรูป)

```
POST /v1/prescriptions
Authorization: Bearer <patient_token>
Content-Type: multipart/form-data
```

```
// Form Data
images[]: (binary)         — รูปใบสั่งยา (สูงสุด 5 รูป)
notes: "ยาสำหรับลูกชาย 5 ขวบ"  (optional)
```

```json
// Response 201
{
  "id": "uuid",
  "rx_no": "RX-20260330-001",
  "status": "received",
  "message": "ได้รับใบสั่งยาแล้วค่ะ ระบบกำลังตรวจสอบ รอสักครู่นะคะ ⏳",
  "estimated_wait": "15-30 นาที"
}
```

### 6.2 Get Prescription Status

```
GET /v1/prescriptions/:id
Authorization: Bearer <patient_token>
```

```json
// Response 200
{
  "id": "uuid",
  "rx_no": "RX-20260330-001",
  "status": "approved",
  "priority": "low",
  "created_at": "2026-03-30T07:00:00+07:00",
  "items": [
    {
      "drug_name": "Amoxicillin 250mg",
      "quantity": 30,
      "status": "approved",
      "unit_price": 120,
      "total_price": 120,
      "matched_product": {
        "name_th": "อมอกซิซิลลิน 250mg",
        "brand": "GPO",
        "sell_price": 120,
        "in_stock": true
      }
    }
  ],
  "safety_summary": {
    "allergy_check": "pass",
    "interaction_check": "pass",
    "dose_check": "pass"
  },
  "total_amount": 170,
  "counseling_scheduled": true,
  "payment_prompt": {
    "promptpay_url": "https://promptpay.io/...",
    "amount": 170
  }
}
```

### 6.3 My Prescriptions

```
GET /v1/prescriptions?status=delivered&sort=-created_at&page=1&limit=10
Authorization: Bearer <patient_token>
```

### 6.4 Staff — Prescription Queue

```
GET /v1/staff/prescriptions/queue?priority=high&status=ai_completed
Authorization: Bearer <staff_token>
Role: pharmacist
```

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "rx_no": "RX-20260330-001",
      "priority": "high",
      "waiting_minutes": 8,
      "patient": {
        "name": "สมชาย ใจดี",
        "patient_no": "PT-00001"
      },
      "safety_alerts": [
        { "type": "interaction", "severity": "major", "description": "Warfarin + Aspirin" }
      ],
      "images": ["url1", "url2"],
      "status": "ai_completed",
      "created_at": "..."
    }
  ],
  "meta": { "total": 5, "by_priority": { "urgent": 0, "high": 1, "medium": 2, "low": 2 } }
}
```

### 6.5 Staff — Verify Prescription

```
POST /v1/staff/prescriptions/:id/verify
Authorization: Bearer <staff_token>
Role: pharmacist
```

```json
// Request
{
  "decision": "approved",        // approved | partial | rejected | referred
  "items": [
    {
      "prescription_item_id": "uuid",
      "decision": "approved",
      "matched_product_id": "uuid",
      "dispensed_lot_id": "uuid",
      "quantity": 30
    },
    {
      "prescription_item_id": "uuid2",
      "decision": "skipped",
      "skip_reason": "ไม่มีสินค้าในสต็อก"
    }
  ],
  "clinical_notes": "ตรวจสอบแล้ว ยาเหมาะกับอาการ",
  "interventions": [
    {
      "type": "drug_substitution",
      "description": "เปลี่ยนจาก Amoxicillin 500mg เป็น 250mg เพราะคนไข้มีไตอ่อน",
      "action_taken": "ติดต่อแพทย์แล้ว แพทย์อนุมัติ"
    }
  ]
}

// Response 200
{
  "id": "uuid",
  "status": "approved",
  "order_id": "uuid",            // สร้างออเดอร์อัตโนมัติ
  "total_amount": 170
}
```

### 6.6 Staff — Reject Prescription

```json
// POST /v1/staff/prescriptions/:id/verify with decision: "rejected"
{
  "decision": "rejected",
  "rejection_reason": "ใบสั่งยาหมดอายุ (เกิน 3 เดือน)",
  "advice_to_patient": "กรุณาติดต่อแพทย์เพื่อขอใบสั่งยาใหม่",
  "contact_doctor": true
}
```

### 6.7 Counseling

```
POST /v1/prescriptions/:id/counseling/start
Authorization: Bearer <staff_token>
```

```json
// Request
{
  "method": "video_call",
  "pharmacist_id": "uuid"
}

// Response 201
{
  "session_id": "uuid",
  "method": "video_call",
  "video_call_url": "https://meet.re-ya.com/rx-20260330-001",
  "started_at": "..."
}
```

```
POST /v1/prescriptions/:id/counseling/complete
```

```json
// Request
{
  "session_id": "uuid",
  "topics_covered": ["วิธีใช้ยา", "ผลข้างเคียง", "อาหารที่หลีกเลี่ยง"],
  "notes": "คนไข้เข้าใจดี ยืนยันจะทานยาตามสั่ง",
  "patient_confirmed": true,
  "recording_url": "https://storage.re-ya.com/counseling/rx-001.mp4"
}
```

---

## 7. Orders

### 7.1 Create Order (OTC)

```
POST /v1/orders
Authorization: Bearer <patient_token>
```

```json
// Request
{
  "order_type": "otc",
  "items": [
    { "product_id": "uuid", "quantity": 2 },
    { "product_id": "uuid2", "quantity": 1 }
  ],
  "delivery_address": {
    "address": "123 ถ.สุขุมวิท แขวงคลองเนียม",
    "sub_district": "คลองเนียม",
    "district": "คลองสาน",
    "province": "กรุงเทพฯ",
    "postal_code": "10600",
    "phone": "0812345678",
    "recipient": "สมชาย ใจดี"
  },
  "delivery_notes": "วางไว้หน้าประตู",
  "discount_code": "WELCOME10",
  "use_points": 100,
  "notes": "อยากได้ยาที่แผงใหม่สุด"
}

// Response 201
{
  "id": "uuid",
  "order_no": "REYA-20260330-001",
  "status": "awaiting_payment",
  "items": [ ... ],
  "subtotal": 159,
  "discount_amount": 15.9,
  "delivery_fee": 50,
  "vat": 0,
  "points_discount": 10,
  "total_amount": 183.1,
  "points_to_earn": 183,
  "payment": {
    "promptpay_url": "https://promptpay.io/...",
    "promptpay_qr_base64": "...",
    "bank_account": {
      "bank": "กสิกรไทย",
      "account_no": "xxx-x-xxxxx-x",
      "account_name": "REYA Pharmacy"
    },
    "expires_at": "2026-03-30T07:30:00+07:00"
  }
}
```

### 7.2 Upload Payment Slip

```
POST /v1/orders/:order_id/slip
Authorization: Bearer <patient_token>
Content-Type: multipart/form-data
```

```
// Form Data
slip_image: (binary)
```

```json
// Response 200
{
  "status": "processing",
  "message": "ได้รับสลิปแล้ว ระบบกำลังตรวจสอบ ⏳",
  "ocr_result": {
    "amount": 183.10,
    "date": "2026-03-30",
    "time": "07:10"
  },
  "match_status": "matched"   // matched | mismatch | pending_manual
}
```

### 7.3 Get Order Detail

```
GET /v1/orders/:id
Authorization: Bearer <patient_token>
```

```json
// Response 200
{
  "id": "uuid",
  "order_no": "REYA-20260330-001",
  "order_type": "otc",
  "status": "shipped",
  "created_at": "...",
  "paid_at": "...",
  "items": [
    {
      "product": { "name_th": "พาราเซตามอล 500mg", "image_url": "..." },
      "quantity": 2,
      "unit_price": 35,
      "total_price": 70
    }
  ],
  "subtotal": 159,
  "discount_amount": 15.9,
  "delivery_fee": 50,
  "total_amount": 183.1,
  "delivery": {
    "provider": "kerry",
    "tracking_no": "KRY123456789",
    "status": "in_transit",
    "estimated_delivery": "2026-04-01"
  },
  "payment": {
    "method": "promptpay",
    "status": "successful",
    "paid_at": "..."
  }
}
```

### 7.4 My Orders

```
GET /v1/orders?status=delivered&sort=-created_at&page=1&limit=10
Authorization: Bearer <patient_token>
```

### 7.5 Cancel Order

```
POST /v1/orders/:id/cancel
```

```json
// Request
{ "reason": "เปลี่ยนใจไม่ซื้อแล้ว" }
```

### 7.6 Reorder (สั่งซ้ำ)

```
POST /v1/orders/:id/reorder
```

```json
// Response 201 — returns new draft order with same items
{
  "id": "new-uuid",
  "order_no": "REYA-20260330-002",
  "status": "draft",
  "items": [ ... ],  // same as original, with updated prices & stock
  "unavailable_items": [ ... ]  // items ที่หมดสต็อก
}
```

### 7.7 Refill (ยาเรื้อรัง)

```
POST /v1/orders/refill
```

```json
// Request
{
  "medication_ids": ["uuid1", "uuid2"],
  "delivery_address": { ... },
  "notes": "ขอยาแผงใหม่"
}

// Response 201
{
  "id": "uuid",
  "order_no": "REYA-20260330-003",
  "order_type": "refill",
  "status": "awaiting_payment",
  "items": [
    {
      "product": { "name_th": "Metformin 500mg" },
      "quantity": 60,
      "refill_from": { "order_no": "REYA-20260315-001", "date": "2026-03-15" }
    }
  ],
  "total_amount": 350
}
```

### 7.8 Staff — Order Management

```
GET    /v1/staff/orders                          # list + filters
GET    /v1/staff/orders/:id                      # detail
PATCH  /v1/staff/orders/:id/status               # update status
POST   /v1/staff/orders/:id/pack                 # mark as packed
POST   /v1/staff/orders/:id/ship                 # create shipment
POST   /v1/staff/orders/:id/deliver              # mark delivered
POST   /v1/staff/orders/:id/refund               # process refund
GET    /v1/staff/orders/pending-slip             # orders awaiting slip verification
POST   /v1/staff/orders/:id/verify-slip          # manually verify slip
```

---

## 8. Inventory

### 8.1 Staff — Inventory

```
GET    /v1/staff/inventory                       # stock overview
GET    /v1/staff/inventory/products/:id/lots     # lots per product
POST   /v1/staff/inventory/lots                  # receive new lot
PATCH  /v1/staff/inventory/lots/:id              # update lot
POST   /v1/staff/inventory/adjustments           # stock adjustment
GET    /v1/staff/inventory/alerts                # low stock + expiry alerts
GET    /v1/staff/inventory/movements             # movement history
POST   /v1/staff/inventory/write-off             # write off expired/damaged
GET    /v1/staff/inventory/export                # CSV export
```

### 8.2 Stock Overview

```
GET /v1/staff/inventory?category=otc&low_stock=true&expiring_within=30
```

```json
// Response 200
{
  "data": [
    {
      "product": { "id": "uuid", "name_th": "พาราเซตามอล 500mg", "sku": "HHR-PAR-001" },
      "total_stock": 150,
      "available": 130,
      "reserved": 20,
      "lots": [
        { "lot_no": "LOT-2026-001", "qty": 80, "expiry": "2027-06-15", "status": "available" },
        { "lot_no": "LOT-2026-002", "qty": 50, "expiry": "2027-03-01", "status": "available" }
      ],
      "alerts": {
        "low_stock": false,
        "expiring_soon": true,
        "days_to_expiry": 365
      }
    }
  ]
}
```

### 8.3 Receive New Lot

```
POST /v1/staff/inventory/lots
```

```json
// Request
{
  "product_id": "uuid",
  "lot_no": "LOT-2026-003",
  "expiry_date": "2027-09-30",
  "manufacturing_date": "2026-03-01",
  "quantity": 500,
  "cost_price": 15,
  "supplier_id": "uuid",
  "warehouse_location": "A-02-01"
}
```

### 8.4 Stock Adjustment

```
POST /v1/staff/inventory/adjustments
```

```json
// Request
{
  "lot_id": "uuid",
  "movement_type": "adjustment_out",
  "quantity": -5,
  "reason": "ชำรุด",
  "notes": "แผงบุบ 5 แผง"
}
```

---

## 9. Drug Database

### 9.1 Search Drugs (สำหรับเภสัชกร)

```
GET /v1/staff/drugs?q=Amoxicillin&classification=dangerous_drug
```

### 9.2 Get Drug Detail

```
GET /v1/staff/drugs/:id
```

```json
// Response 200
{
  "id": "uuid",
  "generic_name": "Amoxicillin",
  "generic_name_th": "อมอกซิซิลลิน",
  "atc_code": "J01CA04",
  "classification": "dangerous_drug",
  "requires_prescription": true,
  "available_strengths": ["250mg", "500mg"],
  "dosage_forms": ["capsule", "syrup"],
  "pregnancy_category": "B",
  "breastfeeding_safe": true,
  "pediatric_safe": true,
  "half_life": "61.3 minutes",
  "common_side_effects": ["คลื่นไส้", "ท้องเสีย", "ผื่น"],
  "serious_side_effects": ["anaphylaxis"],
  "contraindications": "แพ้ penicillin",
  "interactions": [
    {
      "drug_name": "Warfarin",
      "severity": "major",
      "mechanism": "เพิ่มเลือดออก",
      "management": "หลีกเลี่ยง / monitor INR"
    }
  ]
}
```

### 9.3 Check Drug Interactions

```
POST /v1/staff/drugs/interaction-check
```

```json
// Request
{
  "patient_id": "uuid",              // optional — auto-check vs allergies + current meds
  "drugs": [
    { "name": "Amoxicillin", "strength": "500mg" },
    { "name": "Warfarin", "strength": "5mg" }
  ]
}

// Response 200
{
  "has_interactions": true,
  "interactions": [
    {
      "drug_a": "Amoxicillin",
      "drug_b": "Warfarin",
      "severity": "major",
      "mechanism": "Amoxicillin เพิ่ม effect ของ Warfarin → เลือดออก",
      "management": "Monitor INR ใกล้ชิด, อาจต้องลดขนาด Warfarin",
      "evidence_level": "established"
    }
  ],
  "patient_alerts": [
    { "type": "allergy", "message": "คนไข้แพ้ Penicillin — Amoxicillin เป็น Beta-lactam" }
  ]
}
```

### 9.4 Dose Calculator

```
POST /v1/staff/drugs/dose-check
```

```json
// Request
{
  "drug_id": "uuid",
  "patient_id": "uuid",
  "prescribed_dose": "500mg",
  "prescribed_frequency": "3x1",
  "prescribed_route": "oral"
}

// Response 200
{
  "drug_name": "Amoxicillin",
  "prescribed": { "dose": "500mg", "frequency": "3x1", "route": "oral" },
  "recommended": {
    "adult": { "min": "250mg", "max": "500mg", "frequency": "3x1", "max_daily": "1500mg" },
    "pediatric": { "mg_per_kg": "25-50mg/kg/day", "frequency": "3x1", "max_daily": "1500mg" }
  },
  "patient_specific": {
    "adjusted_for_weight": true,
    "calculated_dose": "450mg (คำนวณจาก 70kg x 25mg/kg / 3)",
    "is_within_range": true,
    "warnings": []
  },
  "renal_adjustment": null,
  "hepatic_adjustment": null,
  "verdict": "within_range"
}
```

---

## 10. Loyalty

### 10.1 My Loyalty

```
GET /v1/loyalty/me
Authorization: Bearer <patient_token>
```

```json
// Response 200
{
  "tier": "silver",
  "current_points": 2450,
  "lifetime_points": 4520,
  "lifetime_spent": 8500,
  "next_tier": {
    "name": "gold",
    "required_spent": 10000,
    "remaining": 1500,
    "benefits": ["ส่วนลด 10%", "จัดส่งฟรีทุกออเดอร์"]
  },
  "recent_transactions": [
    { "type": "earned_purchase", "points": 183, "description": "คำสั่งซื้อ #REYA-20260330-001", "date": "2026-03-30" },
    { "type": "redeemed", "points": -100, "description": "แลกส่วนลด ฿10", "date": "2026-03-28" }
  ],
  "expiring_soon": [
    { "points": 100, "expires_at": "2026-04-15" }
  ]
}
```

### 10.2 Redeem Points

```
POST /v1/loyalty/redeem
```

```json
// Request
{
  "points": 200,
  "order_id": "uuid"  // optional — ใช้กับออเดอร์ที่กำลังชำระ
}

// Response 200
{
  "discount_amount": 20,
  "remaining_points": 2250,
  "message": "แลก 200 แต้ม ได้ส่วนลด ฿20"
}
```

---

## 11. Promotions

```
GET  /v1/promotions?active=true&type=percentage_discount
GET  /v1/promotions/:id
POST /v1/promotions/:id/apply                   // ตรวจสอบว่าใช้ได้ไหม

// Staff
GET    /v1/staff/promotions
POST   /v1/staff/promotions
PATCH  /v1/staff/promotions/:id
DELETE /v1/staff/promotions/:id
```

---

## 12. Notifications

```
GET  /v1/notifications?unread=true&sort=-created_at
POST /v1/notifications/:id/read
POST /v1/notifications/read-all

// Response
{
  "data": [
    {
      "id": "uuid",
      "type": "order_shipped",
      "title": "จัดส่งแล้ว! 🚚",
      "body": "ออเดอร์ #REYA-20260330-001 จัดส่งแล้ว คาดถึง 1 เม.ย.",
      "is_read": false,
      "created_at": "..."
    }
  ]
}
```

---

## 13. Medication Reminders

```
GET    /v1/reminders
POST   /v1/reminders
PATCH  /v1/reminders/:id
DELETE /v1/reminders/:id
POST   /v1/reminders/:id/confirm              // ยืนยันว่าทานแล้ว
GET    /v1/reminders/adherence                  // สถิติการทานยา
```

```json
// POST Request
{
  "patient_medication_id": "uuid",
  "reminder_times": ["08:00", "20:00"],
  "reminder_days": [1,2,3,4,5,6,7]
}
```

---

## 14. Content (Health Articles)

```
GET /v1/content?type=health_article&tag=ไข้หวัด&sort=-published_at
GET /v1/content/:slug
```

---

## 15. LINE Webhook

### 15.1 Webhook Endpoint

```
POST /v1/line/webhook
```

```json
// Request (from LINE Platform)
{
  "destination": "xxx",
  "events": [
    {
      "type": "message",
      "replyToken": "xxx",
      "timestamp": 1234567890,
      "mode": "active",
      "source": { "type": "user", "userId": "U1234567890" },
      "message": { "id": "xxx", "type": "text", "text": "อยากซื้อพารา" }
    }
  ]
}

// Response 200 (empty body — async processing)
```

### 15.2 Internal — Send LINE Message

```
POST /v1/internal/line/send
Authorization: Bearer <internal_token>
```

```json
// Request
{
  "to": "U1234567890",           // line_user_id
  "type": "flex",
  "alt_text": "สรุปออเดอร์",
  "message": { ... }              // Flex message JSON
}
```

### 15.3 Internal — Broadcast

```
POST /v1/internal/line/broadcast
```

```json
// Request
{
  "message": { ... },
  "filter": {
    "tier": "gold",
    "province": "กรุงเทพฯ"
  }
}
```

---

## 16. AI Chatbot

### 16.1 Chat (Streaming)

```
POST /v1/chat
Authorization: Bearer <patient_token>
Content-Type: application/json
```

```json
// Request
{
  "message": "ฉันมีอาการไข้ ควรทานอะไรคะ",
  "session_id": "uuid"  // optional — continue session
}

// Response 200 (streaming — SSE)
data: {"type": "thinking", "content": "กำลังคิด..."}
data: {"type": "message", "content": "สวัสดีค่ะ 🤒"}
data: {"type": "message", "content": "ไข้เป็นอาการที่พบได้บ่อย..."}
data: {"type": "products", "data": [...]}
data: {"type": "disclaimer", "content": "หากไข้ไม่ลด 3 วัน แนะนำพบแพทย์"}
data: {"type": "done", "session_id": "uuid"}
```

### 16.2 Transfer to Pharmacist

```
POST /v1/chat/:session_id/transfer
```

```json
// Request
{
  "reason": "ลูกค้าถามเรื่องยาอันตราย",
  "pharmacist_id": "uuid"  // optional — auto-assign if null
}
```

---

## 17. Reports (Staff/Admin)

```
GET /v1/staff/reports/sales/daily?date=2026-03-30
GET /v1/staff/reports/sales/monthly?month=2026-03
GET /v1/staff/reports/sales/top-products?period=30d&limit=20
GET /v1/staff/reports/sales/aov?period=30d
GET /v1/staff/reports/patients/acquisition?period=30d
GET /v1/staff/reports/patients/retention?period=90d
GET /v1/staff/reports/prescriptions/volume?period=30d
GET /v1/staff/reports/prescriptions/sla?period=30d
GET /v1/staff/reports/prescriptions/interventions?period=30d
GET /v1/staff/reports/inventory/stock-value
GET /v1/staff/reports/inventory/expiry?months=3
GET /v1/staff/reports/loyalty/tiers
GET /v1/staff/reports/complaints?period=30d
```

---

## 18. WebSocket Events (Real-time)

### 18.1 Connection

```
WS wss://api.re-ya.com/v1/ws
Authorization: Bearer <token>
```

### 18.2 Events

```
// Staff subscribes
→ staff.prescription.queue.subscribe
← staff.prescription.queue.update  { new: 1, total: 5 }

→ staff.orders.subscribe
← staff.orders.new                  { order_no: "REYA-001", status: "paid" }
← staff.orders.status_change        { order_no: "REYA-001", old: "paid", new: "processing" }

→ staff.chat.subscribe
← staff.chat.new_session            { patient: "สมชาย", type: "bot", sentiment: "negative" }
← staff.chat.message                { session_id: "uuid", message: "..." }

// Patient subscribes
→ patient.orders.subscribe
← patient.orders.status_change      { order_no: "REYA-001", status: "shipped", tracking: "..." }
← patient.prescription.update       { rx_no: "RX-001", status: "approved" }
← patient.points.update             { change: +183, total: 2450 }
```

---

## 19. Rate Limiting

| Endpoint | Rate | Scope |
|----------|------|-------|
| `POST /v1/line/webhook` | 100/min | per LINE OA |
| `POST /v1/chat` | 20/min | per patient |
| `POST /v1/orders` | 10/min | per patient |
| `POST /v1/auth/*` | 10/min | per IP |
| `GET /v1/products` | 60/min | per IP |
| `GET /v1/staff/*` | 120/min | per staff |
| All others | 60/min | per IP |

---

## 20. API Summary

| Module | Public Endpoints | Staff Endpoints | Total |
|--------|-----------------|-----------------|-------|
| **Auth** | 5 | 1 | 6 |
| **Patients** | 8 | 3 | 11 |
| **Products** | 5 | 8 | 13 |
| **Prescriptions** | 3 | 5 | 8 |
| **Orders** | 7 | 8 | 15 |
| **Payments** | 2 | 3 | 5 |
| **Inventory** | 0 | 10 | 10 |
| **Drug DB** | 0 | 4 | 4 |
| **Loyalty** | 2 | 0 | 2 |
| **Promotions** | 3 | 4 | 7 |
| **Notifications** | 3 | 0 | 3 |
| **Reminders** | 5 | 0 | 5 |
| **Chat/AI** | 3 | 2 | 5 |
| **Content** | 2 | 0 | 2 |
| **Reports** | 0 | 13 | 13 |
| **LINE Webhook** | 1 | 2 | 3 |
| **WebSocket** | — | — | 10 events |
| **Total** | **~49** | **~63** | **~112** |
