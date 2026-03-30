'use client';

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '';

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

let liffInstance: any = null;
let initPromise: Promise<void> | null = null;

export async function initLiff(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (typeof window === 'undefined') return;

    const liff = (await import('@line/liff')).default;
    await liff.init({ liffId: LIFF_ID });
    liffInstance = liff;
  })();

  return initPromise;
}

export function getLiff() {
  return liffInstance;
}

export function isInLiff(): boolean {
  return liffInstance?.isInClient() ?? false;
}

export function isLoggedIn(): boolean {
  return liffInstance?.isLoggedIn() ?? false;
}

export function liffLogin(): void {
  if (!liffInstance) return;
  liffInstance.login({ redirectUri: window.location.href });
}

export function liffLogout(): void {
  if (!liffInstance) return;
  liffInstance.logout();
  window.location.reload();
}

export async function getLiffProfile(): Promise<LiffProfile | null> {
  if (!liffInstance || !liffInstance.isLoggedIn()) return null;
  try {
    const profile = await liffInstance.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      statusMessage: profile.statusMessage,
    };
  } catch {
    return null;
  }
}

export function getLiffAccessToken(): string | null {
  return liffInstance?.getAccessToken() ?? null;
}

export async function sendLiffMessage(messages: Array<{ type: string; text: string }>): Promise<boolean> {
  if (!liffInstance || !isInLiff()) return false;
  try {
    await liffInstance.sendMessages(messages);
    return true;
  } catch {
    return false;
  }
}

export function closeLiff(): void {
  if (liffInstance && isInLiff()) {
    liffInstance.closeWindow();
  }
}
