import { registerAs } from '@nestjs/config';

export const lineConfig = registerAs('line', () => {
  const liffId = process.env.LINE_LIFF_ID ?? '';
  return {
    channelId: process.env.LINE_CHANNEL_ID || liffId.split('-')[0] || '',
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? '',
    channelSecret: process.env.LINE_CHANNEL_SECRET ?? '',
    liffId,
  };
});
