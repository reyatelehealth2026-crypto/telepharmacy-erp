import { readFileSync } from 'fs';
import { join } from 'path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { consentTemplates } from '@telepharmacy/db/schema/telemedicine';

/**
 * Seed script to initialize the Thai consent template v1.0.0
 * 
 * Usage:
 * ts-node apps/api/src/modules/telemedicine/consent/seed-consent-template.ts
 */

async function seedConsentTemplate() {
  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    console.log('🌱 Seeding consent template...');

    // Read the Thai consent template
    const templatePath = join(__dirname, 'consent-template-th-v1.0.0.md');
    const content = readFileSync(templatePath, 'utf-8');

    // Extract clauses from markdown
    const clauses = [
      {
        id: 'tech-limitations',
        title: 'ข้อจำกัดของเทคโนโลยี',
        content:
          'เภสัชกรไม่สามารถตรวจร่างกายโดยตรงได้ คุณภาพของภาพและเสียงขึ้นอยู่กับสัญญาณอินเทอร์เน็ต',
        required: true,
      },
      {
        id: 'service-scope',
        title: 'ขอบเขตการให้บริการ',
        content:
          'บริการเหมาะสำหรับการติดตามโรคเรื้อรัง การขอยาประจำตัว และอาการเจ็บป่วยเล็กน้อย',
        required: true,
      },
      {
        id: 'patient-responsibilities',
        title: 'หน้าที่ในการปฏิบัติตามคำแนะนำ',
        content:
          'ผู้ป่วยต้องให้ข้อมูลที่ถูกต้อง ปฏิบัติตามคำแนะนำ และไปโรงพยาบาลเมื่อได้รับการแนะนำ',
        required: true,
      },
      {
        id: 'privacy-recording',
        title: 'ความเป็นส่วนตัวและการบันทึกข้อมูล',
        content:
          'การให้คำปรึกษาจะถูกบันทึกและเก็บไว้ 10 ปี ตามกฎหมาย ข้อมูลจะถูกเก็บรักษาตาม PDPA',
        required: true,
      },
      {
        id: 'withdrawal',
        title: 'การยกเลิกความยินยอม',
        content:
          'สามารถถอนความยินยอมได้ตลอดเวลา โดยมีผลหลังจาก 7 วันทำการ',
        required: true,
      },
      {
        id: 'pdpa-rights',
        title: 'สิทธิของผู้ป่วยตาม PDPA',
        content:
          'ผู้ป่วยมีสิทธิเข้าถึง แก้ไข ลบ และโอนย้ายข้อมูลส่วนบุคคล',
        required: true,
      },
      {
        id: 'contact-complaints',
        title: 'การติดต่อและข้อร้องเรียน',
        content:
          'สามารถติดต่อร้องเรียนได้ที่ support@telepharmacy.com หรือสภาเภสัชกรรม',
        required: true,
      },
    ];

    // Insert template
    const [template] = await db
      .insert(consentTemplates)
      .values({
        version: '1.0.0',
        language: 'th',
        title: 'ข้อตกลงและยินยอมการรับบริการเภสัชกรรมทางไกล',
        content,
        clauses,
        isActive: true,
        effectiveFrom: new Date('2025-01-01T00:00:00Z'),
        effectiveUntil: null,
        createdBy: null, // System-created
      })
      .returning();

    console.log('✅ Consent template seeded successfully!');
    console.log(`   ID: ${template.id}`);
    console.log(`   Version: ${template.version}`);
    console.log(`   Language: ${template.language}`);
    console.log(`   Effective From: ${template.effectiveFrom}`);

  } catch (error) {
    console.error('❌ Error seeding consent template:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  seedConsentTemplate()
    .then(() => {
      console.log('🎉 Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedConsentTemplate };
