'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, X, Plus, Trash2 } from 'lucide-react';
import { syncProductsFromOdoo, staffLogin } from '@/lib/products';
import { useRouter } from 'next/navigation';

type SyncState = 'idle' | 'loading' | 'success' | 'error';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('access_token') ?? '';
}

export function OdooSyncButton() {
  const [state, setState] = useState<SyncState>('idle');
  const [result, setResult] = useState<{ synced: number; errors: number; details?: string[] } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-focus input when modal opens
  useEffect(() => {
    if (showModal) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showModal]);

  const addCode = () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) return;
    // Support comma/space separated input
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    setCodes((prev) => [...new Set([...prev, ...parts])]);
    setInputCode('');
    inputRef.current?.focus();
  };

  const removeCode = (code: string) => setCodes((prev) => prev.filter((c) => c !== code));

  const handleSync = async () => {
    setState('loading');
    setResult(null);
    setErrorMsg('');

    try {
      let token = getToken();

      // If no token, try auto-login with dev credentials
      if (!token) {
        try {
          token = await staffLogin('pharmacist@reya.com', 'Password123!');
          localStorage.setItem('access_token', token);
        } catch {
          setErrorMsg('ไม่มี token — กรุณา Login ก่อน');
          setState('error');
          setTimeout(() => setState('idle'), 4000);
          return;
        }
      }

      const res = await syncProductsFromOdoo(token, codes.length ? codes : undefined);
      setResult(res);
      setState('success');
      setShowModal(false);
      router.refresh();
      setTimeout(() => setState('idle'), 8000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync ล้มเหลว');
      setState('error');
      setTimeout(() => { setState('idle'); setErrorMsg(''); }, 5000);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setShowModal(true)}
        disabled={state === 'loading'}
        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
          state === 'success'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : state === 'error'
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'hover:bg-muted'
        }`}
      >
        {state === 'loading' ? (
          <><RefreshCw className="h-4 w-4 animate-spin" />กำลัง Sync...</>
        ) : state === 'success' ? (
          <><CheckCircle2 className="h-4 w-4" />Sync แล้ว ({result?.synced ?? 0} รายการ)</>
        ) : state === 'error' ? (
          <><AlertCircle className="h-4 w-4" />Sync ล้มเหลว</>
        ) : (
          <><RefreshCw className="h-4 w-4" />Sync จาก Odoo</>
        )}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Sync สินค้าจาก Odoo</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ใส่ PRODUCT_CODE จาก Odoo เพื่อ sync (เช่น 0001, 3238)
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-5 py-4">
              {/* Input */}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCode(); } }}
                  placeholder="กรอก PRODUCT_CODE (เช่น 0001) แล้วกด Enter"
                  className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none ring-ring/20 transition-shadow placeholder:text-muted-foreground focus:ring-2"
                />
                <button
                  onClick={addCode}
                  className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่ม
                </button>
              </div>

              {/* Code chips */}
              {codes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {codes.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium"
                    >
                      {code}
                      <button
                        onClick={() => removeCode(code)}
                        className="ml-0.5 rounded-full hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setCodes([])}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    ล้างทั้งหมด
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  ไม่มี code → จะ re-sync สินค้าที่มี odooCode อยู่แล้วใน DB
                </p>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Result details */}
              {result?.details && result.details.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/50 p-2 text-xs font-mono">
                  {result.details.map((d, i) => (
                    <div key={i} className={d.startsWith('OK') ? 'text-emerald-700' : d.startsWith('ERR') ? 'text-red-700' : 'text-muted-foreground'}>
                      {d}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button
                onClick={() => setShowModal(false)}
                className="inline-flex h-9 items-center rounded-lg border px-4 text-sm hover:bg-muted"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSync}
                disabled={state === 'loading'}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {state === 'loading' ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" />กำลัง Sync...</>
                ) : (
                  <><RefreshCw className="h-4 w-4" />เริ่ม Sync ({codes.length || 'existing'})</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
