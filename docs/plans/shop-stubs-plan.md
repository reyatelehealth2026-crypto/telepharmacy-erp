# Shop Stubs Resolution Plan (Phase 2)

## Tasks ที่ทำได้ทันที (frontend-only fixes)

### Task 1: Search URL Sync
แก้ /search ให้ sync query/filter/sort กับ URL params เพื่อ shareable URLs

### Task 2: Consultation Page → Wire to Telemedicine API
เชื่อม /consultation กับ POST /v1/telemedicine/consultations/request

### Task 3: AI Consult → Wire to Backend Chatbot API
เชื่อม /ai-consult กับ backend chatbot (ต้องสร้าง API route ง่ายๆ)

## Tasks ที่ต้อง backend work (ทำทีหลัง)
- Chat real-time (ต้อง WebSocket)
- Address sync (ต้อง API endpoint ใหม่)
- Payment QR (ต้อง Omise integration)
- OCR Progress polling (ต้อง status endpoint)
