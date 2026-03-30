import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { drugs, drugInteractions, drugAllergyGroups, drugDiseaseContraindications } from "../schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const drugData = [
  {
    genericName: "paracetamol",
    genericNameTh: "พาราเซตามอล",
    atcCode: "N02BE01",
    atcCategory: "Analgesics",
    requiresPrescription: false,
    requiresPharmacist: false,
    dosageForms: ["tablet", "syrup", "suppository"],
    availableStrengths: [{ value: 325, unit: "mg" }, { value: 500, unit: "mg" }, { value: 1000, unit: "mg" }],
    pregnancyCategory: "B",
    breastfeedingSafe: true,
    pediatricSafe: true,
    geriatricSafe: true,
    commonSideEffects: ["คลื่นไส้", "ปวดท้อง"],
    seriousSideEffects: ["ตับวาย (overdose)", "ผื่นแพ้รุนแรง (Stevens-Johnson)"],
    contraindications: "โรคตับรุนแรง, การดื่มแอลกอฮอล์เป็นประจำ",
    storageInfo: "เก็บที่อุณหภูมิห้อง ไม่เกิน 30°C",
    tags: ["analgesic", "antipyretic", "otc"],
  },
  {
    genericName: "ibuprofen",
    genericNameTh: "ไอบูโพรเฟน",
    atcCode: "M01AE01",
    atcCategory: "NSAIDs",
    requiresPrescription: false,
    requiresPharmacist: true,
    dosageForms: ["tablet", "capsule", "syrup"],
    availableStrengths: [{ value: 200, unit: "mg" }, { value: 400, unit: "mg" }, { value: 600, unit: "mg" }],
    pregnancyCategory: "C",
    breastfeedingSafe: false,
    pediatricSafe: true,
    geriatricSafe: false,
    commonSideEffects: ["ปวดท้อง", "คลื่นไส้", "แสบร้อนกลางอก"],
    seriousSideEffects: ["แผลในกระเพาะ", "เลือดออกทางเดินอาหาร", "ไตวาย", "หัวใจวาย"],
    contraindications: "แผลในกระเพาะอาหาร, ไตวาย, หัวใจล้มเหลว, ตั้งครรภ์ไตรมาส 3",
    storageInfo: "เก็บที่อุณหภูมิห้อง ไม่เกิน 30°C",
    tags: ["nsaid", "analgesic", "anti-inflammatory"],
  },
  {
    genericName: "amoxicillin",
    genericNameTh: "อะม็อกซิซิลลิน",
    atcCode: "J01CA04",
    atcCategory: "Beta-lactam antibiotics",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["capsule", "tablet", "syrup", "injection"],
    availableStrengths: [{ value: 250, unit: "mg" }, { value: 500, unit: "mg" }, { value: 875, unit: "mg" }],
    pregnancyCategory: "B",
    breastfeedingSafe: true,
    pediatricSafe: true,
    geriatricSafe: true,
    commonSideEffects: ["ท้องเสีย", "คลื่นไส้", "ผื่น"],
    seriousSideEffects: ["อาการแพ้รุนแรง (anaphylaxis)", "C. difficile colitis"],
    contraindications: "แพ้ penicillin หรือ beta-lactam",
    storageInfo: "เก็บในที่เย็น",
    tags: ["antibiotic", "beta-lactam", "penicillin"],
  },
  {
    genericName: "cephalexin",
    genericNameTh: "เซฟาเล็กซิน",
    atcCode: "J01DB01",
    atcCategory: "Beta-lactam antibiotics",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["capsule", "tablet", "syrup"],
    availableStrengths: [{ value: 250, unit: "mg" }, { value: 500, unit: "mg" }],
    pregnancyCategory: "B",
    breastfeedingSafe: true,
    pediatricSafe: true,
    geriatricSafe: true,
    commonSideEffects: ["ท้องเสีย", "คลื่นไส้"],
    seriousSideEffects: ["อาการแพ้รุนแรง", "C. difficile colitis"],
    contraindications: "แพ้ cephalosporin; ระวังในผู้แพ้ penicillin (cross-allergy 1-10%)",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["antibiotic", "beta-lactam", "cephalosporin"],
  },
  {
    genericName: "warfarin",
    genericNameTh: "วาร์ฟาริน",
    atcCode: "B01AA03",
    atcCategory: "Anticoagulants",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet"],
    availableStrengths: [{ value: 1, unit: "mg" }, { value: 2, unit: "mg" }, { value: 5, unit: "mg" }],
    pregnancyCategory: "X",
    breastfeedingSafe: false,
    pediatricSafe: false,
    geriatricSafe: true,
    commonSideEffects: ["เลือดออกง่าย", "멍ง่าย"],
    seriousSideEffects: ["เลือดออกในสมอง", "เลือดออกภายใน"],
    contraindications: "ตั้งครรภ์, เลือดออกในสมอง, แผลในกระเพาะที่มีเลือดออก",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["anticoagulant", "narrow-therapeutic-index"],
  },
  {
    genericName: "aspirin",
    genericNameTh: "แอสไพริน",
    atcCode: "B01AC06",
    atcCategory: "Antithrombotic agents",
    requiresPrescription: false,
    requiresPharmacist: true,
    dosageForms: ["tablet"],
    availableStrengths: [{ value: 81, unit: "mg" }, { value: 300, unit: "mg" }, { value: 500, unit: "mg" }],
    pregnancyCategory: "C",
    breastfeedingSafe: false,
    pediatricSafe: false,
    geriatricSafe: true,
    commonSideEffects: ["ปวดท้อง", "แสบร้อนกลางอก"],
    seriousSideEffects: ["เลือดออกทางเดินอาหาร", "Reye syndrome ในเด็ก"],
    contraindications: "เด็กอายุ < 16 ปี (ไข้ไวรัส), แผลในกระเพาะ, แพ้ NSAIDs",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["nsaid", "antiplatelet", "analgesic"],
  },
  {
    genericName: "metformin",
    genericNameTh: "เมทฟอร์มิน",
    atcCode: "A10BA02",
    atcCategory: "Antidiabetics",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet"],
    availableStrengths: [{ value: 500, unit: "mg" }, { value: 850, unit: "mg" }, { value: 1000, unit: "mg" }],
    pregnancyCategory: "B",
    breastfeedingSafe: false,
    pediatricSafe: true,
    geriatricSafe: true,
    commonSideEffects: ["คลื่นไส้", "ท้องเสีย", "ปวดท้อง"],
    seriousSideEffects: ["Lactic acidosis (หายาก)"],
    contraindications: "ไตวาย (eGFR < 30), หัวใจล้มเหลว, ตับวาย",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["antidiabetic", "biguanide"],
  },
  {
    genericName: "amlodipine",
    genericNameTh: "แอมโลดิพีน",
    atcCode: "C08CA01",
    atcCategory: "Calcium channel blockers",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet"],
    availableStrengths: [{ value: 5, unit: "mg" }, { value: 10, unit: "mg" }],
    pregnancyCategory: "C",
    breastfeedingSafe: false,
    pediatricSafe: false,
    geriatricSafe: true,
    commonSideEffects: ["บวมน้ำที่ข้อเท้า", "ปวดศีรษะ", "หน้าแดง"],
    seriousSideEffects: ["ความดันต่ำมาก"],
    contraindications: "ช็อคจากหัวใจ, Unstable angina รุนแรง",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["antihypertensive", "calcium-channel-blocker"],
  },
  {
    genericName: "enalapril",
    genericNameTh: "อีนาลาพริล",
    atcCode: "C09AA02",
    atcCategory: "ACE inhibitors",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet"],
    availableStrengths: [{ value: 5, unit: "mg" }, { value: 10, unit: "mg" }, { value: 20, unit: "mg" }],
    pregnancyCategory: "D",
    breastfeedingSafe: false,
    pediatricSafe: false,
    geriatricSafe: true,
    commonSideEffects: ["ไอแห้ง", "ความดันต่ำ", "ระดับโพแทสเซียมสูง"],
    seriousSideEffects: ["Angioedema", "ไตวาย"],
    contraindications: "ตั้งครรภ์, Angioedema ประวัติ, ไตวายรุนแรง (eGFR < 30)",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["antihypertensive", "ace-inhibitor", "heart-failure"],
  },
  {
    genericName: "simvastatin",
    genericNameTh: "ซิมวาสตาติน",
    atcCode: "C10AA01",
    atcCategory: "Statins",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet"],
    availableStrengths: [{ value: 10, unit: "mg" }, { value: 20, unit: "mg" }, { value: 40, unit: "mg" }],
    pregnancyCategory: "X",
    breastfeedingSafe: false,
    pediatricSafe: false,
    geriatricSafe: true,
    commonSideEffects: ["ปวดกล้ามเนื้อ", "อ่อนเพลีย"],
    seriousSideEffects: ["Rhabdomyolysis", "ตับอักเสบ"],
    contraindications: "ตั้งครรภ์, ให้นม, ตับวาย, ใช้ร่วมกับ amiodarone > 20mg/day",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["statin", "cholesterol"],
  },
  {
    genericName: "omeprazole",
    genericNameTh: "โอมีพราโซล",
    atcCode: "A02BC01",
    atcCategory: "Proton pump inhibitors",
    requiresPrescription: false,
    requiresPharmacist: true,
    dosageForms: ["capsule", "tablet", "injection"],
    availableStrengths: [{ value: 20, unit: "mg" }, { value: 40, unit: "mg" }],
    pregnancyCategory: "C",
    breastfeedingSafe: false,
    pediatricSafe: true,
    geriatricSafe: true,
    commonSideEffects: ["ปวดศีรษะ", "ท้องเสีย"],
    seriousSideEffects: ["Hypomagnesemia (ระยะยาว)", "C. difficile"],
    contraindications: "ใช้ร่วมกับ clopidogrel (ลดประสิทธิภาพ)",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["ppi", "antacid", "gerd"],
  },
  {
    genericName: "methotrexate",
    genericNameTh: "เมโทเทร็กเซต",
    atcCode: "L04AX03",
    atcCategory: "Antimetabolites",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet", "injection"],
    availableStrengths: [{ value: 2.5, unit: "mg" }, { value: 10, unit: "mg" }],
    pregnancyCategory: "X",
    breastfeedingSafe: false,
    pediatricSafe: true,
    geriatricSafe: false,
    commonSideEffects: ["คลื่นไส้", "ปวดท้อง", "ผมร่วง"],
    seriousSideEffects: ["ตับพิษ", "ปอดพิษ", "ทำลายไขกระดูก"],
    contraindications: "ตั้งครรภ์, ให้นม, ไตวาย, ตับวาย",
    storageInfo: "เก็บในที่เย็น ไม่โดนแสง",
    tags: ["immunosuppressant", "antineoplastic", "dmard"],
  },
  {
    genericName: "prednisolone",
    genericNameTh: "เพรดนิโซโลน",
    atcCode: "H02AB06",
    atcCategory: "Corticosteroids",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet", "injection", "syrup"],
    availableStrengths: [{ value: 5, unit: "mg" }, { value: 10, unit: "mg" }, { value: 20, unit: "mg" }],
    pregnancyCategory: "C",
    breastfeedingSafe: true,
    pediatricSafe: true,
    geriatricSafe: true,
    commonSideEffects: ["น้ำตาลสูง", "ความดันสูง", "บวม"],
    seriousSideEffects: ["ติดเชื้อง่าย", "กระดูกพรุน", "ต้อกระจก"],
    contraindications: "ติดเชื้อรา, วัณโรคที่ยังไม่รักษา",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["corticosteroid", "anti-inflammatory", "immunosuppressant"],
  },
  {
    genericName: "diazepam",
    genericNameTh: "ไดอาซีแพม",
    atcCode: "N05BA01",
    atcCategory: "Benzodiazepines",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet", "injection"],
    availableStrengths: [{ value: 2, unit: "mg" }, { value: 5, unit: "mg" }, { value: 10, unit: "mg" }],
    pregnancyCategory: "D",
    breastfeedingSafe: false,
    pediatricSafe: true,
    geriatricSafe: false,
    commonSideEffects: ["ง่วงนอน", "เดินเซ"],
    seriousSideEffects: ["กดระบบหายใจ", "ติดยา"],
    contraindications: "ตั้งครรภ์, โรคกล้ามเนื้ออ่อนแรง (myasthenia gravis), ไม่ควรใช้ในผู้สูงอายุ",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["benzodiazepine", "anxiolytic", "controlled-substance"],
  },
  {
    genericName: "furosemide",
    genericNameTh: "ฟูโรซีไมด์",
    atcCode: "C03CA01",
    atcCategory: "Loop diuretics",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet", "injection"],
    availableStrengths: [{ value: 20, unit: "mg" }, { value: 40, unit: "mg" }, { value: 80, unit: "mg" }],
    pregnancyCategory: "C",
    breastfeedingSafe: false,
    pediatricSafe: true,
    geriatricSafe: true,
    commonSideEffects: ["โพแทสเซียมต่ำ", "ปัสสาวะบ่อย", "ความดันต่ำ"],
    seriousSideEffects: ["หูหนวก (ขนาดสูง IV)", "อิเล็กโทรไลต์เสียสมดุล"],
    contraindications: "ไม่มีปัสสาวะ (anuria), แพ้ sulfonamide",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["diuretic", "heart-failure", "sulfonamide"],
  },
  {
    genericName: "ciprofloxacin",
    genericNameTh: "ซิโปรฟลอกซาซิน",
    atcCode: "J01MA02",
    atcCategory: "Fluoroquinolones",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet", "injection", "eye_drops"],
    availableStrengths: [{ value: 250, unit: "mg" }, { value: 500, unit: "mg" }, { value: 750, unit: "mg" }],
    pregnancyCategory: "C",
    breastfeedingSafe: false,
    pediatricSafe: false,
    geriatricSafe: true,
    commonSideEffects: ["คลื่นไส้", "ท้องเสีย", "ปวดหัว"],
    seriousSideEffects: ["เอ็นอักเสบ/ฉีกขาด", "QT prolongation", "C. difficile"],
    contraindications: "เด็กอายุ < 18 ปี (ยกเว้น anthrax), ตั้งครรภ์",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["antibiotic", "fluoroquinolone"],
  },
  {
    genericName: "azithromycin",
    genericNameTh: "อะซิโธรไมซิน",
    atcCode: "J01FA10",
    atcCategory: "Macrolides",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet", "capsule", "syrup"],
    availableStrengths: [{ value: 250, unit: "mg" }, { value: 500, unit: "mg" }],
    pregnancyCategory: "B",
    breastfeedingSafe: true,
    pediatricSafe: true,
    geriatricSafe: true,
    commonSideEffects: ["ท้องเสีย", "คลื่นไส้"],
    seriousSideEffects: ["QT prolongation", "ตับอักเสบ"],
    contraindications: "แพ้ macrolide, QT prolongation",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["antibiotic", "macrolide"],
  },
  {
    genericName: "clopidogrel",
    genericNameTh: "โคลพิโดเกร็ล",
    atcCode: "B01AC04",
    atcCategory: "Antithrombotic agents",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet"],
    availableStrengths: [{ value: 75, unit: "mg" }],
    pregnancyCategory: "B",
    breastfeedingSafe: false,
    pediatricSafe: false,
    geriatricSafe: true,
    commonSideEffects: ["เลือดออกง่าย", "멍ง่าย"],
    seriousSideEffects: ["เลือดออกรุนแรง", "TTP (หายาก)"],
    contraindications: "เลือดออกภายใน, แผลในกระเพาะที่มีเลือดออก",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["antiplatelet", "cardiovascular"],
  },
  {
    genericName: "digoxin",
    genericNameTh: "ไดจอกซิน",
    atcCode: "C01AA05",
    atcCategory: "Cardiac glycosides",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet", "injection"],
    availableStrengths: [{ value: 0.0625, unit: "mg" }, { value: 0.125, unit: "mg" }, { value: 0.25, unit: "mg" }],
    pregnancyCategory: "C",
    breastfeedingSafe: true,
    pediatricSafe: true,
    geriatricSafe: false,
    commonSideEffects: ["คลื่นไส้", "มองเห็นสีเหลืองเขียว"],
    seriousSideEffects: ["หัวใจเต้นผิดจังหวะ", "พิษดิจอกซิน"],
    contraindications: "หัวใจเต้นช้ามาก, โพแทสเซียมต่ำ",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["cardiac-glycoside", "narrow-therapeutic-index", "heart-failure"],
  },
  {
    genericName: "hydrochlorothiazide",
    genericNameTh: "ไฮโดรคลอโรไทอะไซด์",
    atcCode: "C03AA03",
    atcCategory: "Thiazide diuretics",
    requiresPrescription: true,
    requiresPharmacist: true,
    dosageForms: ["tablet"],
    availableStrengths: [{ value: 12.5, unit: "mg" }, { value: 25, unit: "mg" }],
    pregnancyCategory: "B",
    breastfeedingSafe: false,
    pediatricSafe: true,
    geriatricSafe: true,
    commonSideEffects: ["โพแทสเซียมต่ำ", "ปัสสาวะบ่อย"],
    seriousSideEffects: ["อิเล็กโทรไลต์เสียสมดุล"],
    contraindications: "ไม่มีปัสสาวะ, แพ้ sulfonamide",
    storageInfo: "เก็บที่อุณหภูมิห้อง",
    tags: ["diuretic", "antihypertensive", "sulfonamide"],
  },
];

const allergyGroupData = [
  {
    groupName: "beta-lactam",
    description: "กลุ่มยาปฏิชีวนะ beta-lactam รวม penicillin และ cephalosporin",
    genericNames: [
      "penicillin", "amoxicillin", "ampicillin", "piperacillin", "nafcillin",
      "cephalexin", "cefazolin", "ceftriaxone", "cefixime", "cefuroxime",
      "meropenem", "imipenem", "ertapenem", "aztreonam",
    ],
    detectionHint: "ยาที่มีชื่อลงท้ายด้วย -cillin หรือ -cef หรือ -meropenem",
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
    detectionHint: "ยาที่ชื่อลงท้ายด้วย -mycin (ยกเว้น gentamicin, vancomycin)",
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

async function seedDrugs() {
  console.log("Seeding drug allergy groups...");
  for (const group of allergyGroupData) {
    await db.insert(drugAllergyGroups).values(group).onConflictDoNothing();
  }
  console.log(`✓ Inserted ${allergyGroupData.length} allergy groups`);

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
  console.log(`✓ Inserted ${insertedDrugs.length} drugs`);

  const findDrug = (name: string) => insertedDrugs.find((d) => d.genericName === name);

  const warfarin = findDrug("warfarin");
  const aspirin = findDrug("aspirin");
  const ibuprofen = findDrug("ibuprofen");
  const methotrexate = findDrug("methotrexate");
  const clopidogrel = findDrug("clopidogrel");
  const digoxin = findDrug("digoxin");
  const simvastatin = findDrug("simvastatin");
  const omeprazole = findDrug("omeprazole");
  const ciprofloxacin = findDrug("ciprofloxacin");
  const amoxicillin = findDrug("amoxicillin");
  const cephalexin = findDrug("cephalexin");

  const interactions = [
    ...(warfarin && aspirin
      ? [{
          drugAId: warfarin.id,
          drugBId: aspirin.id,
          severity: "major",
          mechanism: "Warfarin anticoagulation potentiated + antiplatelet effect of aspirin",
          clinicalEffect: "เพิ่มความเสี่ยงเลือดออกรุนแรง",
          management: "หลีกเลี่ยง ถ้าจำเป็นต้องใช้ร่วมกัน ต้องติดตาม INR อย่างใกล้ชิด",
          evidenceLevel: "established",
        }]
      : []),
    ...(warfarin && ibuprofen
      ? [{
          drugAId: warfarin.id,
          drugBId: ibuprofen.id,
          severity: "major",
          mechanism: "NSAIDs ยับยั้ง COX-1 เพิ่ม bleeding + อาจเปลี่ยน warfarin metabolism",
          clinicalEffect: "เพิ่มความเสี่ยงเลือดออก โดยเฉพาะในทางเดินอาหาร",
          management: "หลีกเลี่ยง ใช้ paracetamol แทนถ้าเป็นไปได้",
          evidenceLevel: "established",
        }]
      : []),
    ...(methotrexate && ibuprofen
      ? [{
          drugAId: methotrexate.id,
          drugBId: ibuprofen.id,
          severity: "major",
          mechanism: "NSAIDs ลดการขับ methotrexate ทางไต",
          clinicalEffect: "ระดับ methotrexate สูงขึ้น → พิษต่อไขกระดูกและตับ",
          management: "หลีกเลี่ยง โดยเฉพาะในขนาด methotrexate สูง",
          evidenceLevel: "established",
        }]
      : []),
    ...(clopidogrel && omeprazole
      ? [{
          drugAId: clopidogrel.id,
          drugBId: omeprazole.id,
          severity: "moderate",
          mechanism: "Omeprazole ยับยั้ง CYP2C19 ลดการแปลง clopidogrel เป็น active metabolite",
          clinicalEffect: "ลดฤทธิ์ antiplatelet ของ clopidogrel",
          management: "ใช้ pantoprazole แทนถ้าเป็นไปได้",
          evidenceLevel: "established",
        }]
      : []),
    ...(digoxin && amoxicillin
      ? [{
          drugAId: digoxin.id,
          drugBId: amoxicillin.id,
          severity: "moderate",
          mechanism: "Antibiotics เปลี่ยน gut flora ที่ metabolize digoxin",
          clinicalEffect: "บางราย digoxin level สูงขึ้น",
          management: "ติดตาม digoxin level และอาการ",
          evidenceLevel: "probable",
        }]
      : []),
    ...(simvastatin && ciprofloxacin
      ? [{
          drugAId: simvastatin.id,
          drugBId: ciprofloxacin.id,
          severity: "moderate",
          mechanism: "Ciprofloxacin ยับยั้ง CYP3A4 บางส่วน เพิ่ม simvastatin level",
          clinicalEffect: "เพิ่มความเสี่ยง myopathy",
          management: "ใช้ด้วยความระมัดระวัง ติดตามอาการปวดกล้ามเนื้อ",
          evidenceLevel: "probable",
        }]
      : []),
  ];

  if (interactions.length > 0) {
    await db.insert(drugInteractions).values(interactions as any).onConflictDoNothing();
    console.log(`✓ Inserted ${interactions.length} drug interactions`);
  }

  const contraindicationData = [
    ...(ibuprofen
      ? [
          {
            drugId: ibuprofen.id,
            diseaseName: "Peptic ulcer disease",
            icd10Pattern: "K25%",
            severity: "contraindicated",
            reason: "NSAIDs ทำลาย gastric mucosal barrier เพิ่มความเสี่ยงแผลทะลุและเลือดออก",
            alternative: "Paracetamol หรือ opioid (ถ้าจำเป็น)",
          },
          {
            drugId: ibuprofen.id,
            diseaseName: "Chronic kidney disease",
            icd10Pattern: "N18%",
            severity: "major",
            reason: "NSAIDs ลด renal prostaglandin ทำให้ไตทำงานแย่ลง",
            alternative: "Paracetamol",
          },
          {
            drugId: ibuprofen.id,
            diseaseName: "Heart failure",
            icd10Pattern: "I50%",
            severity: "major",
            reason: "NSAIDs ทำให้ sodium retention เพิ่ม preload และ afterload",
            alternative: "Paracetamol",
          },
        ]
      : []),
    ...(aspirin
      ? [
          {
            drugId: aspirin.id,
            diseaseName: "Peptic ulcer disease",
            icd10Pattern: "K25%",
            severity: "major",
            reason: "Aspirin ทำลาย gastric mucosal barrier",
            alternative: "ใช้ร่วมกับ PPI ถ้าจำเป็น",
          },
        ]
      : []),
    ...(enalaprilId => enalaprilId
      ? [
          {
            drugId: enalaprilId,
            diseaseName: "Chronic kidney disease stage 5",
            icd10Pattern: "N18.5",
            severity: "major",
            reason: "ACE inhibitor เพิ่ม potassium และลด GFR ในไตวายรุนแรง",
            alternative: "ปรึกษาอายุรแพทย์",
          },
        ]
      : [])(findDrug("enalapril")?.id),
    ...(methotrexate
      ? [
          {
            drugId: methotrexate.id,
            diseaseName: "Chronic kidney disease",
            icd10Pattern: "N18%",
            severity: "contraindicated",
            reason: "Methotrexate ขับออกทางไต ไตวายทำให้ level สูง → พิษรุนแรง",
            alternative: "ปรึกษาแพทย์",
          },
        ]
      : []),
    ...(amoxicillin && cephalexin
      ? [
          {
            drugId: amoxicillin.id,
            diseaseName: "Beta-lactam allergy",
            icd10Pattern: "Z88.0",
            severity: "contraindicated",
            reason: "ผู้แพ้ penicillin ห้ามใช้ amoxicillin",
            alternative: "Azithromycin หรือ clindamycin",
          },
        ]
      : []),
  ].filter(Boolean);

  if (contraindicationData.length > 0) {
    await db.insert(drugDiseaseContraindications).values(contraindicationData as any).onConflictDoNothing();
    console.log(`✓ Inserted ${contraindicationData.length} drug-disease contraindications`);
  }

  console.log("✅ Drug seed complete");
}

seedDrugs()
  .catch(console.error)
  .finally(() => client.end());
