import { streamText, generateText } from 'ai';
import { AI_CONFIG, PHARMACY_SYSTEM_PROMPT } from './config';
import { googleChatModel } from './google-model';
import type { PatientContext, ChatMessage, ChatResponse, SymptomSearchResult } from './types';

function buildPatientContextString(patient?: PatientContext): string {
  if (!patient) return 'ไม่มีข้อมูลคนไข้';

  const parts: string[] = [
    `ชื่อ: ${patient.firstName} ${patient.lastName}`,
    `อายุ: ${patient.age} ปี`,
    `เพศ: ${patient.gender}`,
  ];

  if (patient.weight) parts.push(`น้ำหนัก: ${patient.weight} kg`);

  if (patient.allergies.length > 0) {
    parts.push(
      `⚠️ แพ้ยา: ${patient.allergies.map((a) => `${a.drugName} (${a.severity})`).join(', ')}`
    );
  }

  if (patient.chronicDiseases.length > 0) {
    parts.push(
      `โรคประจำตัว: ${patient.chronicDiseases.filter((d) => d.status === 'active').map((d) => d.diseaseName).join(', ')}`
    );
  }

  if (patient.currentMedications.length > 0) {
    parts.push(
      `ยาที่กินอยู่: ${patient.currentMedications.map((m) => `${m.drugName} ${m.sig}`).join(', ')}`
    );
  }

  if (patient.isPregnant) parts.push('⚠️ กำลังตั้งครรภ์');
  if (patient.isBreastfeeding) parts.push('⚠️ กำลังให้นมบุตร');

  return parts.join('\n');
}

export async function chatWithPatient(
  message: string,
  history: ChatMessage[] = [],
  patient?: PatientContext,
  options?: { geminiApiKey?: string }
) {
  const systemPrompt = `${PHARMACY_SYSTEM_PROMPT}\n\nข้อมูลคนไข้:\n${buildPatientContextString(patient)}`;

  const messages = [
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const result = streamText({
    model: googleChatModel(options?.geminiApiKey),
    system: systemPrompt,
    messages,
    temperature: AI_CONFIG.chatTemperature,
    maxTokens: AI_CONFIG.maxTokens,
  });

  return result;
}

export async function chatWithPatientSync(
  message: string,
  history: ChatMessage[] = [],
  patient?: PatientContext,
  options?: { geminiApiKey?: string }
): Promise<ChatResponse> {
  const systemPrompt = `${PHARMACY_SYSTEM_PROMPT}

ข้อมูลคนไข้:
${buildPatientContextString(patient)}

ตอบเป็น JSON:
{
  "message": "ข้อความตอบกลับ",
  "products": [{"id": "", "name": "", "price": 0, "reason": ""}],
  "shouldTransfer": false,
  "transferReason": "",
  "disclaimer": "คำเตือน"
}`;

  const messages = [
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const { text } = await generateText({
    model: googleChatModel(options?.geminiApiKey),
    system: systemPrompt,
    messages,
    temperature: AI_CONFIG.chatTemperature,
    maxTokens: AI_CONFIG.maxTokens,
  });

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      message: text,
      shouldTransfer: false,
      disclaimer: 'คำแนะนำนี้เป็นข้อมูลเบื้องต้น ควรปรึกษาเภสัชกรก่อนใช้ยา',
    };
  }
}

export async function searchBySymptoms(
  symptoms: string,
  patient?: PatientContext,
  options?: { geminiApiKey?: string }
): Promise<SymptomSearchResult> {
  const prompt = `ลูกค้ามีอาการ: "${symptoms}"

${patient ? `ข้อมูลคนไข้:\n${buildPatientContextString(patient)}` : ''}

วิเคราะห์อาการและแนะนำสินค้าที่เหมาะสม ตอบเป็น JSON:
{
  "understanding": {
    "symptoms": ["อาการ 1", "อาการ 2"],
    "possibleCondition": "สภาวะที่เป็นไปได้",
    "confidence": 0.0-1.0
  },
  "recommendations": [
    {
      "productName": "ชื่อสินค้า",
      "reason": "เหตุผลที่แนะนำ",
      "priority": "recommended|alternative|optional"
    }
  ],
  "safetyAlerts": ["คำเตือนถ้ามี"],
  "disclaimer": "คำเตือนทั่วไป"
}`;

  const { text } = await generateText({
    model: googleChatModel(options?.geminiApiKey),
    system: PHARMACY_SYSTEM_PROMPT,
    prompt,
    temperature: AI_CONFIG.temperature,
    maxTokens: AI_CONFIG.maxTokens,
  });

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      understanding: {
        symptoms: [symptoms],
        possibleCondition: 'ไม่สามารถวิเคราะห์ได้',
        confidence: 0,
      },
      recommendations: [],
      safetyAlerts: [],
      disclaimer: 'กรุณาปรึกษาเภสัชกรเพื่อรับคำแนะนำที่เหมาะสม',
    };
  }
}
