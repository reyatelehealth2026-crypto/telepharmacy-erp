import { generateText } from 'ai';
import { AI_CONFIG, OCR_PRESCRIPTION_PROMPT, OCR_SLIP_PROMPT } from './config';
import { googleVisionModel } from './google-model';
import type { PrescriptionOcrResult, SlipOcrResult } from './types';

export async function extractPrescription(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  options?: { geminiApiKey?: string }
): Promise<PrescriptionOcrResult> {
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
            text: OCR_PRESCRIPTION_PROMPT,
          },
        ],
      },
    ],
    temperature: 0.1,
    maxTokens: AI_CONFIG.maxTokens,
  });

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
    temperature: 0.1,
    maxTokens: 1024,
  });

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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
  const content = images.flatMap((img) => [
    {
      type: 'image' as const,
      image: img.base64,
      mimeType: img.mimeType || 'image/jpeg',
    },
  ]);

  content.push({
    type: 'text' as any,
    image: OCR_PRESCRIPTION_PROMPT + '\n\nมีหลายรูป ให้รวมข้อมูลจากทุกรูปเป็นผลลัพธ์เดียว',
    mimeType: '',
  });

  const { text } = await generateText({
    model: googleVisionModel(options?.geminiApiKey),
    messages: [{ role: 'user', content: content as any }],
    temperature: 0.1,
    maxTokens: AI_CONFIG.maxTokens,
  });

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
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

function estimateConfidence(result: Partial<PrescriptionOcrResult>): number {
  let score = 0;
  let total = 0;

  if (result.prescriber?.name) { score += 1; } total += 1;
  if (result.patient?.name) { score += 1; } total += 1;
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
