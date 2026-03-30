import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'REYA Pharmacy — ร้านขายยาออนไลน์',
  description: 'สั่งยาออนไลน์ ส่งถึงบ้าน พร้อมเภสัชกรให้คำปรึกษา',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${notoSansThai.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
