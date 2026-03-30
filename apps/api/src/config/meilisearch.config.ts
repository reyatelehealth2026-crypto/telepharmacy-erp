import { registerAs } from '@nestjs/config';

export const meilisearchConfig = registerAs('meilisearch', () => ({
  host: process.env.MEILI_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY ?? '',
}));
