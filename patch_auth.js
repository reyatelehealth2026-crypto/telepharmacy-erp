const fs = require('fs');
const path = 'apps/api/src/modules/auth/auth.service.ts';
let code = fs.readFileSync(path, 'utf8');

// Find and replace the channel ID resolution logic
const oldLines = [
  "      // Resolve channelId: DB \u2192 env \u2192 derive from LIFF ID",
  "      let channelId = await this.dynamicConfig.resolve('line.channelId', 'LINE_CHANNEL_ID');",
  "      if (!channelId) {",
  "        const liffId = await this.dynamicConfig.resolve('line.liffId', 'LINE_LIFF_ID');",
  "        channelId = liffId.split('-')[0] || '';",
  "      }",
].join('\n');

const newLines = [
  "      // Prefer LIFF Login channel ID (prefix of LIFF ID) — LIFF tokens are issued by Login channel",
  "      const liffId = await this.dynamicConfig.resolve('line.liffId', 'LINE_LIFF_ID');",
  "      const liffChannelId = liffId ? liffId.split('-')[0] : '';",
  "      const envChannelId = await this.dynamicConfig.resolve('line.channelId', 'LINE_CHANNEL_ID');",
  "      const channelId = liffChannelId || envChannelId || '';",
].join('\n');

if (code.includes(oldLines)) {
  code = code.replace(oldLines, newLines);
  fs.writeFileSync(path, code);
  console.log('PATCHED OK');
} else {
  // Try to find approximate location
  const idx = code.indexOf('Resolve channelId');
  if (idx >= 0) {
    console.log('NOT FOUND - nearby content:');
    console.log(JSON.stringify(code.substring(idx, idx + 300)));
  } else {
    console.log('NOT FOUND AT ALL');
  }
}
