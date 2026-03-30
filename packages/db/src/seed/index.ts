import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import {
  drugs,
  drugInteractions,
  drugAllergyGroups,
  drugDiseaseContraindications,
  staff,
} from "../schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const allergyGroupData = [
  {
    groupName: "beta-lactam",
    description: "กลุ่มยาปฏิชีวนะ beta-lactam รวม penicillin และ cephalosporin",
    genericNames: [
      "penicillin", "amoxicillin", "ampicillin", "piperacillin", "nafcillin",
      "cephalexin", "cefazolin", "ceftriaxone", "cefixime", "cefuroxime",
      "meropenem", "imipenem", "ertapenem", "aztreonam",
    ],
    detectionHint: "ยาที่มีชื่อลงท้ายด้วย -cillin หรือ -cef หรือ -penem",
  },
  {
    groupName: "nsaid",
    description: "กลุ่มยาต้านการอักเสบที่ไม่ใช่สเตียรอยด์",
    genericNames: [
      "aspirin", "ibuprofen", "naproxen", "diclofenac",
      "piroxicam", "meloxicam", "celecoxib", "indomethacin",
      "ketorolac", "mefenamic_acid",
    ],
    detectionHint: "ยาแก้ปวด/ต้านอักเสบที่ไม่ใช่ paracetamol หรือ opioid",
  },
  {
    groupName: "sulfonamide",
    description: "กลุ่มยาที่มีโครงสร้าง sulfonamide",
    genericNames: [
      "sulfamethoxazole", "sulfasalazine", "dapsone",
      "furosemide", "hydrochlorothiazide", "celecoxib",
      "probenecid",
    ],
    detectionHint: "ยาปฏิชีวนะ sulfa และยาขับปัสสาวะบางตัว",
  },
  {
    groupName: "fluoroquinolone",
    description: "กลุ่มยาปฏิชีวนะ fluoroquinolone",
    genericNames: [
      "ciprofloxacin", "levofloxacin", "moxifloxacin",
      "norfloxacin", "ofloxacin", "gemifloxacin",
    ],
    detectionHint: "ยาที่ชื่อลงท้ายด้วย -floxacin",
  },
  {
    groupName: "macrolide",
    description: "กลุ่มยาปฏิชีวนะ macrolide",
    genericNames: [
      "azithromycin", "clarithromycin", "erythromycin",
      "roxithromycin", "spiramycin",
    ],
    detectionHint: "ยาที่ชื่อลงท้ายด้วย -thromycin หรือ -mycin ในกลุ่ม macrolide",
  },
  {
    groupName: "opioid",
    description: "กลุ่มยาแก้ปวด opioid",
    genericNames: [
      "morphine", "codeine", "tramadol", "fentanyl",
      "oxycodone", "hydrocodone", "buprenorphine",
    ],
    detectionHint: "ยาแก้ปวดกลุ่ม narcotic",
  },
];

const drugData = [
  { genericName: "paracetamol", genericNameTh: "พาราเซตามอล", atcCode: "N02BE01", atcCategory: "Analgesics", requiresPrescription: false, requiresPharmacist: false, dosageForms: ["tablet", "syrup", "suppository"], availableStrengths: [{ value: 325, unit: "mg" }, { value: 500, unit: "mg" }], pregnancyCategory: "B", breastfeedingSafe: true, pediatricSafe: true, geriatricSafe: true, commonSideEffects: ["คลื่นไส้"], seriousSideEffects: ["ตับวาย (overdose)"], contraindications: "โรคตับรุนแรง", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["analgesic", "antipyretic", "otc"] },
  { genericName: "ibuprofen", genericNameTh: "ไอบูโพรเฟน", atcCode: "M01AE01", atcCategory: "NSAIDs", requiresPrescription: false, requiresPharmacist: true, dosageForms: ["tablet", "capsule"], availableStrengths: [{ value: 200, unit: "mg" }, { value: 400, unit: "mg" }], pregnancyCategory: "C", breastfeedingSafe: false, pediatricSafe: true, geriatricSafe: false, commonSideEffects: ["ปวดท้อง", "คลื่นไส้"], seriousSideEffects: ["แผลในกระเพาะ", "เลือดออกทางเดินอาหาร", "ไตวาย"], contraindications: "แผลในกระเพาะอาหาร, ไตวาย, หัวใจล้มเหลว", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["nsaid", "analgesic"] },
  { genericName: "amoxicillin", genericNameTh: "อะม็อกซิซิลลิน", atcCode: "J01CA04", atcCategory: "Beta-lactam antibiotics", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["capsule", "syrup"], availableStrengths: [{ value: 250, unit: "mg" }, { value: 500, unit: "mg" }], pregnancyCategory: "B", breastfeedingSafe: true, pediatricSafe: true, geriatricSafe: true, commonSideEffects: ["ท้องเสีย", "คลื่นไส้"], seriousSideEffects: ["อาการแพ้รุนแรง (anaphylaxis)"], contraindications: "แพ้ penicillin", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["antibiotic", "beta-lactam"] },
  { genericName: "cephalexin", genericNameTh: "เซฟาเล็กซิน", atcCode: "J01DB01", atcCategory: "Beta-lactam antibiotics", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["capsule", "syrup"], availableStrengths: [{ value: 250, unit: "mg" }, { value: 500, unit: "mg" }], pregnancyCategory: "B", breastfeedingSafe: true, pediatricSafe: true, geriatricSafe: true, commonSideEffects: ["ท้องเสีย"], seriousSideEffects: ["อาการแพ้รุนแรง"], contraindications: "แพ้ cephalosporin; ระวังในผู้แพ้ penicillin", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["antibiotic", "beta-lactam", "cephalosporin"] },
  { genericName: "warfarin", genericNameTh: "วาร์ฟาริน", atcCode: "B01AA03", atcCategory: "Anticoagulants", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet"], availableStrengths: [{ value: 1, unit: "mg" }, { value: 2, unit: "mg" }, { value: 5, unit: "mg" }], pregnancyCategory: "X", breastfeedingSafe: false, pediatricSafe: false, geriatricSafe: true, commonSideEffects: ["เลือดออกง่าย"], seriousSideEffects: ["เลือดออกในสมอง", "เลือดออกภายใน"], contraindications: "ตั้งครรภ์, เลือดออกในสมอง", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["anticoagulant", "narrow-therapeutic-index"] },
  { genericName: "aspirin", genericNameTh: "แอสไพริน", atcCode: "B01AC06", atcCategory: "Antithrombotic agents", requiresPrescription: false, requiresPharmacist: true, dosageForms: ["tablet"], availableStrengths: [{ value: 81, unit: "mg" }, { value: 300, unit: "mg" }], pregnancyCategory: "C", breastfeedingSafe: false, pediatricSafe: false, geriatricSafe: true, commonSideEffects: ["ปวดท้อง"], seriousSideEffects: ["เลือดออกทางเดินอาหาร", "Reye syndrome ในเด็ก"], contraindications: "เด็กอายุ < 16 ปี, แผลในกระเพาะ", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["nsaid", "antiplatelet"] },
  { genericName: "metformin", genericNameTh: "เมทฟอร์มิน", atcCode: "A10BA02", atcCategory: "Antidiabetics", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet"], availableStrengths: [{ value: 500, unit: "mg" }, { value: 1000, unit: "mg" }], pregnancyCategory: "B", breastfeedingSafe: false, pediatricSafe: true, geriatricSafe: true, commonSideEffects: ["คลื่นไส้", "ท้องเสีย"], seriousSideEffects: ["Lactic acidosis (หายาก)"], contraindications: "ไตวาย (eGFR < 30), หัวใจล้มเหลว", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["antidiabetic"] },
  { genericName: "amlodipine", genericNameTh: "แอมโลดิพีน", atcCode: "C08CA01", atcCategory: "Calcium channel blockers", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet"], availableStrengths: [{ value: 5, unit: "mg" }, { value: 10, unit: "mg" }], pregnancyCategory: "C", breastfeedingSafe: false, pediatricSafe: false, geriatricSafe: true, commonSideEffects: ["บวมน้ำที่ข้อเท้า", "ปวดศีรษะ"], seriousSideEffects: ["ความดันต่ำมาก"], contraindications: "ช็อคจากหัวใจ", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["antihypertensive"] },
  { genericName: "enalapril", genericNameTh: "อีนาลาพริล", atcCode: "C09AA02", atcCategory: "ACE inhibitors", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet"], availableStrengths: [{ value: 5, unit: "mg" }, { value: 10, unit: "mg" }], pregnancyCategory: "D", breastfeedingSafe: false, pediatricSafe: false, geriatricSafe: true, commonSideEffects: ["ไอแห้ง", "ความดันต่ำ"], seriousSideEffects: ["Angioedema", "ไตวาย"], contraindications: "ตั้งครรภ์, ไตวายรุนแรง", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["antihypertensive", "ace-inhibitor"] },
  { genericName: "simvastatin", genericNameTh: "ซิมวาสตาติน", atcCode: "C10AA01", atcCategory: "Statins", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet"], availableStrengths: [{ value: 10, unit: "mg" }, { value: 20, unit: "mg" }, { value: 40, unit: "mg" }], pregnancyCategory: "X", breastfeedingSafe: false, pediatricSafe: false, geriatricSafe: true, commonSideEffects: ["ปวดกล้ามเนื้อ"], seriousSideEffects: ["Rhabdomyolysis", "ตับอักเสบ"], contraindications: "ตั้งครรภ์, ตับวาย", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["statin", "cholesterol"] },
  { genericName: "omeprazole", genericNameTh: "โอมีพราโซล", atcCode: "A02BC01", atcCategory: "Proton pump inhibitors", requiresPrescription: false, requiresPharmacist: true, dosageForms: ["capsule"], availableStrengths: [{ value: 20, unit: "mg" }, { value: 40, unit: "mg" }], pregnancyCategory: "C", breastfeedingSafe: false, pediatricSafe: true, geriatricSafe: true, commonSideEffects: ["ปวดศีรษะ", "ท้องเสีย"], seriousSideEffects: ["Hypomagnesemia (ระยะยาว)"], contraindications: "ใช้ร่วมกับ clopidogrel (ลดประสิทธิภาพ)", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["ppi", "gerd"] },
  { genericName: "methotrexate", genericNameTh: "เมโทเทร็กเซต", atcCode: "L04AX03", atcCategory: "Antimetabolites", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet", "injection"], availableStrengths: [{ value: 2.5, unit: "mg" }], pregnancyCategory: "X", breastfeedingSafe: false, pediatricSafe: true, geriatricSafe: false, commonSideEffects: ["คลื่นไส้", "ผมร่วง"], seriousSideEffects: ["ตับพิษ", "ทำลายไขกระดูก"], contraindications: "ตั้งครรภ์, ไตวาย, ตับวาย", storageInfo: "เก็บในที่เย็น ไม่โดนแสง", tags: ["immunosuppressant", "dmard"] },
  { genericName: "prednisolone", genericNameTh: "เพรดนิโซโลน", atcCode: "H02AB06", atcCategory: "Corticosteroids", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet", "syrup"], availableStrengths: [{ value: 5, unit: "mg" }, { value: 20, unit: "mg" }], pregnancyCategory: "C", breastfeedingSafe: true, pediatricSafe: true, geriatricSafe: true, commonSideEffects: ["น้ำตาลสูง", "ความดันสูง"], seriousSideEffects: ["ติดเชื้อง่าย", "กระดูกพรุน"], contraindications: "ติดเชื้อรา, วัณโรคที่ยังไม่รักษา", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["corticosteroid", "anti-inflammatory"] },
  { genericName: "diazepam", genericNameTh: "ไดอาซีแพม", atcCode: "N05BA01", atcCategory: "Benzodiazepines", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet", "injection"], availableStrengths: [{ value: 2, unit: "mg" }, { value: 5, unit: "mg" }], pregnancyCategory: "D", breastfeedingSafe: false, pediatricSafe: true, geriatricSafe: false, commonSideEffects: ["ง่วงนอน"], seriousSideEffects: ["กดระบบหายใจ", "ติดยา"], contraindications: "ตั้งครรภ์, myasthenia gravis", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["benzodiazepine", "controlled-substance"] },
  { genericName: "furosemide", genericNameTh: "ฟูโรซีไมด์", atcCode: "C03CA01", atcCategory: "Loop diuretics", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet", "injection"], availableStrengths: [{ value: 20, unit: "mg" }, { value: 40, unit: "mg" }], pregnancyCategory: "C", breastfeedingSafe: false, pediatricSafe: true, geriatricSafe: true, commonSideEffects: ["โพแทสเซียมต่ำ"], seriousSideEffects: ["หูหนวก (ขนาดสูง IV)"], contraindications: "ไม่มีปัสสาวะ (anuria), แพ้ sulfonamide", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["diuretic", "sulfonamide"] },
  { genericName: "ciprofloxacin", genericNameTh: "ซิโปรฟลอกซาซิน", atcCode: "J01MA02", atcCategory: "Fluoroquinolones", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet", "injection"], availableStrengths: [{ value: 250, unit: "mg" }, { value: 500, unit: "mg" }], pregnancyCategory: "C", breastfeedingSafe: false, pediatricSafe: false, geriatricSafe: true, commonSideEffects: ["คลื่นไส้", "ท้องเสีย"], seriousSideEffects: ["เอ็นอักเสบ/ฉีกขาด", "QT prolongation"], contraindications: "เด็กอายุ < 18 ปี (ยกเว้น anthrax), ตั้งครรภ์", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["antibiotic", "fluoroquinolone"] },
  { genericName: "azithromycin", genericNameTh: "อะซิโธรไมซิน", atcCode: "J01FA10", atcCategory: "Macrolides", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet", "syrup"], availableStrengths: [{ value: 250, unit: "mg" }, { value: 500, unit: "mg" }], pregnancyCategory: "B", breastfeedingSafe: true, pediatricSafe: true, geriatricSafe: true, commonSideEffects: ["ท้องเสีย", "คลื่นไส้"], seriousSideEffects: ["QT prolongation"], contraindications: "แพ้ macrolide, QT prolongation", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["antibiotic", "macrolide"] },
  { genericName: "clopidogrel", genericNameTh: "โคลพิโดเกร็ล", atcCode: "B01AC04", atcCategory: "Antithrombotic agents", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet"], availableStrengths: [{ value: 75, unit: "mg" }], pregnancyCategory: "B", breastfeedingSafe: false, pediatricSafe: false, geriatricSafe: true, commonSideEffects: ["เลือดออกง่าย"], seriousSideEffects: ["เลือดออกรุนแรง"], contraindications: "เลือดออกภายใน", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["antiplatelet"] },
  { genericName: "digoxin", genericNameTh: "ไดจอกซิน", atcCode: "C01AA05", atcCategory: "Cardiac glycosides", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet"], availableStrengths: [{ value: 0.125, unit: "mg" }, { value: 0.25, unit: "mg" }], pregnancyCategory: "C", breastfeedingSafe: true, pediatricSafe: true, geriatricSafe: false, commonSideEffects: ["คลื่นไส้", "มองเห็นสีเหลืองเขียว"], seriousSideEffects: ["หัวใจเต้นผิดจังหวะ"], contraindications: "หัวใจเต้นช้ามาก, โพแทสเซียมต่ำ", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["cardiac-glycoside", "narrow-therapeutic-index"] },
  { genericName: "hydrochlorothiazide", genericNameTh: "ไฮโดรคลอโรไทอะไซด์", atcCode: "C03AA03", atcCategory: "Thiazide diuretics", requiresPrescription: true, requiresPharmacist: true, dosageForms: ["tablet"], availableStrengths: [{ value: 12.5, unit: "mg" }, { value: 25, unit: "mg" }], pregnancyCategory: "B", breastfeedingSafe: false, pediatricSafe: true, geriatricSafe: true, commonSideEffects: ["โพแทสเซียมต่ำ"], seriousSideEffects: ["อิเล็กโทรไลต์เสียสมดุล"], contraindications: "ไม่มีปัสสาวะ, แพ้ sulfonamide", storageInfo: "เก็บที่อุณหภูมิห้อง", tags: ["diuretic", "antihypertensive", "sulfonamide"] },
];

const staffData = [
  { email: "admin@re-ya.com", password: "Admin@reya2024!", title: "mr" as const, firstName: "ผู้ดูแล", lastName: "ระบบ", role: "super_admin" as const },
  { email: "pharmacist@re-ya.com", password: "Pharm@reya2024!", title: "miss" as const, firstName: "สมหญิง", lastName: "เภสัชสกุล", role: "pharmacist" as const, licenseNo: "PH12345" },
  { email: "staff@re-ya.com", password: "Staff@reya2024!", title: "mr" as const, firstName: "สมชาย", lastName: "พนักงานสกุล", role: "customer_service" as const },
];

async function main() {
  console.log("🌱 Starting database seed...\n");

  console.log("Seeding drug allergy groups...");
  for (const group of allergyGroupData) {
    await db.insert(drugAllergyGroups).values(group).onConflictDoNothing();
  }
  console.log(`✓ ${allergyGroupData.length} allergy groups`);

  console.log("Seeding drugs...");
  const insertedDrugs: { id: string; genericName: string }[] = [];
  for (const drug of drugData) {
    const [inserted] = await db
      .insert(drugs)
      .values(drug as any)
      .onConflictDoNothing()
      .returning({ id: drugs.id, genericName: drugs.genericName });
    if (inserted) insertedDrugs.push(inserted);
  }
  console.log(`✓ ${insertedDrugs.length} drugs`);

  const find = (name: string) => insertedDrugs.find((d) => d.genericName === name);

  const interactions: Parameters<typeof db.insert<typeof drugInteractions>>[0] extends (table: typeof drugInteractions) => any ? never : any[] = [];
  const w = find("warfarin");
  const asp = find("aspirin");
  const ibu = find("ibuprofen");
  const mtx = find("methotrexate");
  const clopi = find("clopidogrel");
  const ome = find("omeprazole");
  const sim = find("simvastatin");
  const cipro = find("ciprofloxacin");

  if (w && asp) interactions.push({ drugAId: w.id, drugBId: asp.id, severity: "major", mechanism: "Warfarin anticoagulation potentiated + antiplatelet effect", clinicalEffect: "เพิ่มความเสี่ยงเลือดออกรุนแรง", management: "หลีกเลี่ยง; ติดตาม INR อย่างใกล้ชิด", evidenceLevel: "established" });
  if (w && ibu) interactions.push({ drugAId: w.id, drugBId: ibu.id, severity: "major", mechanism: "NSAIDs ยับยั้ง COX-1 + อาจเปลี่ยน warfarin metabolism", clinicalEffect: "เพิ่มความเสี่ยงเลือดออก โดยเฉพาะทางเดินอาหาร", management: "หลีกเลี่ยง ใช้ paracetamol แทน", evidenceLevel: "established" });
  if (mtx && ibu) interactions.push({ drugAId: mtx.id, drugBId: ibu.id, severity: "major", mechanism: "NSAIDs ลดการขับ methotrexate ทางไต", clinicalEffect: "ระดับ methotrexate สูง → พิษต่อไขกระดูกและตับ", management: "หลีกเลี่ยง", evidenceLevel: "established" });
  if (clopi && ome) interactions.push({ drugAId: clopi.id, drugBId: ome.id, severity: "moderate", mechanism: "Omeprazole ยับยั้ง CYP2C19 ลดการแปลง clopidogrel", clinicalEffect: "ลดฤทธิ์ antiplatelet", management: "ใช้ pantoprazole แทน", evidenceLevel: "established" });
  if (sim && cipro) interactions.push({ drugAId: sim.id, drugBId: cipro.id, severity: "moderate", mechanism: "Ciprofloxacin ยับยั้ง CYP3A4 เพิ่ม simvastatin level", clinicalEffect: "เพิ่มความเสี่ยง myopathy", management: "ติดตามอาการปวดกล้ามเนื้อ", evidenceLevel: "probable" });

  if (interactions.length > 0) {
    await db.insert(drugInteractions).values(interactions).onConflictDoNothing();
  }
  console.log(`✓ ${interactions.length} drug interactions`);

  const contraindications: any[] = [];
  if (ibu) {
    contraindications.push(
      { drugId: ibu.id, diseaseName: "Peptic ulcer disease", icd10Pattern: "K25%", severity: "contraindicated", reason: "NSAIDs ทำลาย gastric mucosal barrier เพิ่มความเสี่ยงแผลทะลุ", alternative: "Paracetamol" },
      { drugId: ibu.id, diseaseName: "Chronic kidney disease", icd10Pattern: "N18%", severity: "major", reason: "NSAIDs ลด renal prostaglandin ทำให้ไตทำงานแย่ลง", alternative: "Paracetamol" },
      { drugId: ibu.id, diseaseName: "Heart failure", icd10Pattern: "I50%", severity: "major", reason: "NSAIDs ทำให้ sodium retention เพิ่ม preload และ afterload", alternative: "Paracetamol" },
    );
  }
  if (asp) {
    contraindications.push({ drugId: asp.id, diseaseName: "Peptic ulcer disease", icd10Pattern: "K25%", severity: "major", reason: "Aspirin ทำลาย gastric mucosal barrier", alternative: "ใช้ร่วมกับ PPI ถ้าจำเป็น" });
  }
  const enalapril = find("enalapril");
  if (enalapril) {
    contraindications.push({ drugId: enalapril.id, diseaseName: "Chronic kidney disease stage 5", icd10Pattern: "N18.5", severity: "major", reason: "ACE inhibitor เพิ่ม potassium และลด GFR ในไตวายรุนแรง", alternative: "ปรึกษาอายุรแพทย์" });
  }
  const mtxDrug = find("methotrexate");
  if (mtxDrug) {
    contraindications.push({ drugId: mtxDrug.id, diseaseName: "Chronic kidney disease", icd10Pattern: "N18%", severity: "contraindicated", reason: "Methotrexate ขับออกทางไต ไตวาย → ระดับสูง → พิษรุนแรง", alternative: "ปรึกษาแพทย์" });
  }

  if (contraindications.length > 0) {
    await db.insert(drugDiseaseContraindications).values(contraindications).onConflictDoNothing();
  }
  console.log(`✓ ${contraindications.length} drug-disease contraindications`);

  console.log("\nSeeding staff accounts...");
  for (const member of staffData) {
    const { password, ...rest } = member;
    const passwordHash = await bcrypt.hash(password, 10);
    await db.insert(staff).values({ ...rest, passwordHash, isActive: true }).onConflictDoNothing();
    console.log(`  ✓ ${rest.email} (${rest.role})`);
  }

  console.log("\n✅ Database seed complete!");
}

main()
  .catch((err) => { console.error("Seed failed:", err); process.exit(1); })
  .finally(() => client.end());
