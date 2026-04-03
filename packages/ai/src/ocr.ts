import { generateText } from 'ai';
import { AI_CONFIG, OCR_PRESCRIPTION_PROMPT, OCR_SLIP_PROMPT } from './config';
import { googleVisionModel } from './google-model';
import type { PrescriptionOcrResult, SlipOcrResult } from './types';

export async function extractPrescription(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  options?: { geminiApiKey?: string }
): Promise<PrescriptionOcrResult> {
  const transcript = await transcribeImage(imageBase64, mimeType, options);

  const { text } = await generateText({
    model: googleVisionModel(options?.geminiApiKey),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: imageBase64,
            mimeType,
          },
          {
            type: 'text',
            text: `${OCR_PRESCRIPTION_PROMPT}

เบาะแสจาก OCR รอบแรก (อาจมีผิดพลาด แต่ช่วยอ่านบริบท):
${transcript || '(ไม่มีข้อความถอดได้)'}

กติกาเพิ่ม:
- ถ้ามีข้อมูลบางส่วน ให้ใช้ค่าที่ใกล้เคียงที่สุดแทนการใส่ null
- ถ้าอ่านข้อความได้แม้ไม่ครบ ให้เก็บค่านั้นไว้
- อย่าปล่อยทุกฟิลด์ว่าง ถ้ามีตัวอักษรใด ๆ ที่อ่านได้
- ตอบเป็น JSON เท่านั้น`,
          },
        ],
      },
    ],
    temperature: 0,
    maxTokens: AI_CONFIG.maxTokens,
  });

  return parsePrescriptionResult(text);
}

export async function extractSlip(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  options?: { geminiApiKey?: string }
): Promise<SlipOcrResult> {
  const { text } = await generateText({
    model: googleVisionModel(options?.geminiApiKey),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: imageBase64,
            mimeType,
          },
          {
            type: 'text',
            text: OCR_SLIP_PROMPT,
          },
        ],
      },
    ],
    temperature: 0,
    maxTokens: 1024,
  });

  try {
    const cleaned = normalizeJsonText(text);
    const parsed = JSON.parse(cleaned);
    return {
      ...parsed,
      amount: typeof parsed.amount === 'string' ? parseFloat(parsed.amount.replace(/,/g, '')) : parsed.amount,
      confidence: parsed.confidence ?? (parsed.amount ? 0.9 : 0.5),
    };
  } catch {
    return {
      amount: 0,
      date: '',
      time: '',
      confidence: 0,
    };
  }
}

export async function extractMultiplePrescriptionImages(
  images: Array<{ base64: string; mimeType?: string }>,
  options?: { geminiApiKey?: string }
): Promise<PrescriptionOcrResult> {
  const transcriptBlocks = await Promise.all(
    images.map((img, index) => transcribeImage(img.base64, img.mimeType || 'image/jpeg', options, index + 1))
  );

  const content = [
    ...images.flatMap((img) => [
      {
        type: 'image' as const,
        image: img.base64,
        mimeType: img.mimeType || 'image/jpeg',
      },
    ]),
    {
      type: 'text' as const,
      text: `${OCR_PRESCRIPTION_PROMPT}

OCR รอบแรกจากรูปทั้งหมด:
${transcriptBlocks.map((t, i) => `รูปที่ ${i + 1}:\n${t || '(ไม่มีข้อความ)'}`).join('\n\n')}

กติกาเพิ่ม:
- รวมข้อมูลจากทุกภาพเป็นผลลัพธ์เดียว
- ถ้ามีข้อมูลบางส่วน ให้ใช้ค่าที่ใกล้เคียงที่สุดแทนการใส่ null
- ถ้าพบรายการยาหลายรายการ ให้รวมให้ครบ`,
    },
  ];

  const { text } = await generateText({
    model: googleVisionModel(options?.geminiApiKey),
    messages: [{ role: 'user', content: content as any }],
    temperature: 0,
    maxTokens: AI_CONFIG.maxTokens,
  });

  return parsePrescriptionResult(text);
}

async function transcribeImage(
  imageBase64: string,
  mimeType: string,
  options?: { geminiApiKey?: string },
  imageIndex?: number,
): Promise<string> {
  const { text } = await generateText({
    model: googleVisionModel(options?.geminiApiKey),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: imageBase64,
            mimeType,
          },
          {
            type: 'text',
            text: imageIndex
              ? `ถอดข้อความทั้งหมดจากภาพใบสั่งยา (รูปที่ ${imageIndex}) ให้ละเอียดที่สุด ใช้ภาษาต้นฉบับตามที่เห็น บรรทัดไหนอ่านไม่ออกให้เว้นไว้ ไม่ต้องสรุป ไม่ต้อง JSON`
              : 'ถอดข้อความทั้งหมดจากภาพใบสั่งยาให้ละเอียดที่สุด ใช้ภาษาต้นฉบับตามที่เห็น บรรทัดไหนอ่านไม่ออกให้เว้นไว้ ไม่ต้องสรุป ไม่ต้อง JSON',
          },
        ],
      },
    ],
    temperature: 0,
    maxTokens: 2048,
  });

  return text.trim();
}

function parsePrescriptionResult(text: string): PrescriptionOcrResult {
  try {
    const cleaned = normalizeJsonText(text);
    const parsed = JSON.parse(cleaned);
    return {
      ...parsed,
      confidence: parsed.confidence ?? estimateConfidence(parsed),
      rawText: text,
    };
  } catch {
    return {
      prescriber: { name: '' },
      patient: { name: '' },
      items: [],
      confidence: 0,
      rawText: text,
    };
  }
}

function normalizeJsonText(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

function estimateConfidence(result: Partial<PrescriptionOcrResult>): number {
  let score = 0;
  let total = 0;

  if (result.prescriber?.name) {
    score += 1;
  }
  total += 1;

  if (result.patient?.name) {
    score += 1;
  }
  total += 1;

  if (result.items && result.items.length > 0) {
    score += 2;
    for (const item of result.items) {
      if (item.drugName) score += 0.5;
      if (item.quantity) score += 0.3;
      if (item.sig) score += 0.2;
      total += 1;
    }
  }
  total += 2;

  return Math.min(Math.round((score / total) * 100) / 100, 1);
}
