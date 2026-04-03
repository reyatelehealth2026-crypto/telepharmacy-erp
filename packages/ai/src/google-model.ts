import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AI_CONFIG } from './config';

/**
 * Resolve API key: explicit param → GOOGLE_GENERATIVE_AI_API_KEY → GEMINI_API_KEY (admin DB sync uses GEMINI).
 */
function resolvedKey(apiKey?: string): string {
  const g = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const env = g.process?.env ?? {};
  const k = (apiKey ?? env.GOOGLE_GENERATIVE_AI_API_KEY ?? env.GEMINI_API_KEY ?? '').trim();
  return k;
}

export function googleChatModel(apiKey?: string) {
  const key = resolvedKey(apiKey);
  const google = createGoogleGenerativeAI({ apiKey: key || undefined });
  return google(AI_CONFIG.defaultModel);
}

export function googleVisionModel(apiKey?: string) {
  const key = resolvedKey(apiKey);
  const google = createGoogleGenerativeAI({ apiKey: key || undefined });
  return google(AI_CONFIG.visionModel);
}
