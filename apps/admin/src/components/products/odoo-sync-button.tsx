'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, X, Plus, Trash2, ChevronDown, PackageX, Pill } from 'lucide-react';
import { syncProductsFromOdoo } from '@/lib/products';
import { apiFetch } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

type SyncState = 'idle' | 'streaming' | 'success' | 'error';
type SyncMode = 'batch' | 'codes';

interface ProgressEvent {
  type: 'start' | 'progress' | 'done' | 'error';
  done?: number;
  total?: number;
  current?: string;
  status?: 'ok' | 'skip' | 'error';
  synced?: number;
  errors?: number;
  skipped?: number;
  message?: string;
}

const BATCH_PRESETS = [
  { label: '0001 – 0200', from: 1, to: 200 },
  { label: '0201 – 0400', from: 201, to: 400 },
  { label: '0401 – 0600', from: 401, to: 600 },
  { label: '0601 – 0800', from: 601, to: 800 },
  { label: '0801 – 1000', from: 801, to: 1000 },
  { label: '1001 – 1200', from: 1001, to: 1200 },
  { label: '1201 – 1500', from: 1201, to: 1500 },
  { label: '1501 – 2000', from: 1501, to: 2000 },
];

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('access_token') ?? '';
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.re-ya.com';

export function OdooSyncButton() {
  const router = useRouter();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<SyncMode>('batch');

  // Batch mode state
  const [selectedBatch, setSelectedBatch] = useState(BATCH_PRESETS[0]!);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustomRange, setUseCustomRange] = useState(false);

  // Codes mode state
  const [codes, setCodes] = useState<string[]>([]);
  const [inputCode, setInputCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Progress state
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [progress, setProgress] = useState<{ done: number; total: number; current: string; synced: number; errors: number } | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState<{ synced: number; errors: number; skipped: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  // Bulk close state
  const [closingAll, setClosingAll] = useState(false);
  const [closingRx, setClosingRx] = useState(false);

  useEffect(() => {
    if (showModal && mode === 'codes') setTimeout(() => inputRef.current?.focus(), 50);
  }, [showModal, mode]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  const addCode = () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (!trimmed) return;
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    setCodes((prev) => [...new Set([...prev, ...parts])]);
    setInputCode('');
    inputRef.current?.focus();
  };

  const reset = () => {
    setSyncState('idle');
    setProgress(null);
    setLogLines([]);
    setFinalResult(null);
    setErrorMsg('');
  };

  const closeModal = () => {
    if (syncState === 'streaming') return;
    setShowModal(false);
    reset();
  };

  // ── SSE Batch Sync ────────────────────────────────────────────────────────
  const handleBatchSync = async () => {
    const token = getToken();
    if (!token) { setErrorMsg('ไม่มี token — กรุณา Login ก่อน'); return; }

    const from = useCustomRange ? Number(customFrom) : selectedBatch.from;
    const to = useCustomRange ? Number(customTo) : selectedBatch.to;
    if (!from || !to || from > to) { setErrorMsg('ช่วงรหัสไม่ถูกต้อง'); return; }

    reset();
    setSyncState('streaming');

    try {
      const res = await fetch(`${API_BASE}/v1/products/sync-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ from, to }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const evt: ProgressEvent = JSON.parse(line);
            if (evt.type === 'progress') {
              setProgress({ done: evt.done!, total: evt.total!, current: evt.current!, synced: evt.synced!, errors: evt.errors! });
              const icon = evt.status === 'ok' ? '✅' : evt.status === 'error' ? '❌' : '⏭️';
              setLogLines((prev) => [...prev.slice(-199), `${icon} ${evt.current} — ${evt.status}`]);
            } else if (evt.type === 'done') {
              setFinalResult({ synced: evt.synced!, errors: evt.errors!, skipped: evt.skipped! });
              setSyncState('success');
              router.refresh();
            } else if (evt.type === 'error') {
              setErrorMsg(evt.message ?? 'เกิดข้อผิดพลาด');
              setSyncState('error');
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync ล้มเหลว');
      setSyncState('error');
    }
  };

  // ── Codes Sync (legacy) ───────────────────────────────────────────────────
  const handleCodesSync = async () => {
    const token = getToken();
    if (!token) { setErrorMsg('ไม่มี token — กรุณา Login ก่อน'); return; }
    reset();
    setSyncState('streaming');
    try {
      const res = await syncProductsFromOdoo(token, codes.length ? codes : undefined);
      setFinalResult({ synced: res.synced, errors: res.errors, skipped: 0 });
      if (res.details) setLogLines(res.details.slice(-200));
      setSyncState('success');
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync ล้มเหลว');
      setSyncState('error');
    }
  };

  // ── Bulk Close ────────────────────────────────────────────────────────────
  const handleBulkClose = async (type: 'all' | 'rx') => {
    const label = type === 'all' ? 'สินค้าทั้งหมด' : 'ยา Rx';
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการปิด${label}? การกระทำนี้จะเปลี่ยนสถานะสินค้าเป็น inactive`)) return;
    type === 'all' ? setClosingAll(true) : setClosingRx(true);
    try {
      const endpoint = type === 'all' ? '/v1/products/bulk-close-all' : '/v1/products/bulk-close-rx';
      const { data } = await apiFetch<{ updated: number }>(endpoint, { method: 'POST' });
      alert(`ปิด${label}สำเร็จ: ${data.updated} รายการ`);
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      type === 'all' ? setClosingAll(false) : setClosingRx(false);
    }
  };

  const isStreaming = syncState === 'streaming';
  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <>
      {/* Header buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleBulkClose('rx')}
          disabled={closingRx}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
        >
          <Pill className="h-3.5 w-3.5" />
          {closingRx ? 'กำลังปิด...' : 'ปิดยา Rx'}
        </button>
        <button
          onClick={() => handleBulkClose('all')}
          disabled={closingAll}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
        >
          <PackageX className="h-3.5 w-3.5" />
          {closingAll ? 'กำลังปิด...' : 'ปิดสินค้าทั้งหมด'}
        </button>
        <button
          onClick={() => { setShowModal(true); reset(); }}
          disabled={isStreaming}
          className={`inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
            syncState === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : syncState === 'error'
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'hover:bg-muted'
          }`}
        >
          {isStreaming ? (
            <><RefreshCw className="h-4 w-4 animate-spin" />กำลัง Sync...</>
          ) : syncState === 'success' ? (
            <><CheckCircle2 className="h-4 w-4" />Sync แล้ว ({finalResult?.synced ?? 0})</>
          ) : syncState === 'error' ? (
            <><AlertCircle className="h-4 w-4" />Sync ล้มเหลว</>
          ) : (
            <><RefreshCw className="h-4 w-4" />Sync จาก Odoo</>
          )}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-xl border bg-background shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">Sync สินค้าจาก Odoo ERP</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">ซิงค์ชื่อ, ราคา, สต็อก, หมวดหมู่, ผู้ผลิต</p>
              </div>
              <button onClick={closeModal} disabled={isStreaming} className="rounded-md p-1 hover:bg-muted disabled:opacity-40">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4" style={{ maxHeight: '70vh' }}>
              {/* Mode tabs */}
              {!isStreaming && syncState !== 'success' && (
                <div className="flex rounded-lg border p-0.5">
                  {(['batch', 'codes'] as SyncMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      {m === 'batch' ? '📦 ซิงค์ตามช่วงรหัส' : '🔢 ระบุรหัสเอง'}
                    </button>
                  ))}
                </div>
              )}

              {/* Batch mode */}
              {mode === 'batch' && !isStreaming && syncState !== 'success' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">เลือกช่วงรหัส Odoo ที่ต้องการซิงค์ (แนะนำ 200 รายการต่อครั้งเพื่อป้องกัน timeout)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {BATCH_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => { setSelectedBatch(p); setUseCustomRange(false); }}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${!useCustomRange && selectedBatch.from === p.from ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'}`}
                      >
                        {p.label}
                        <span className="ml-1 text-xs text-muted-foreground">({p.to - p.from + 1} items)</span>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-lg border p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={useCustomRange} onChange={(e) => setUseCustomRange(e.target.checked)} />
                      กำหนดช่วงเอง
                    </label>
                    {useCustomRange && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number" min={1} max={9999}
                          value={customFrom}
                          onChange={(e) => setCustomFrom(e.target.value)}
                          placeholder="จาก (เช่น 1)"
                          className="h-8 flex-1 rounded border px-2 text-sm outline-none focus:ring-1"
                        />
                        <span className="text-muted-foreground">–</span>
                        <input
                          type="number" min={1} max={9999}
                          value={customTo}
                          onChange={(e) => setCustomTo(e.target.value)}
                          placeholder="ถึง (เช่น 300)"
                          className="h-8 flex-1 rounded border px-2 text-sm outline-none focus:ring-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Codes mode */}
              {mode === 'codes' && !isStreaming && syncState !== 'success' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCode(); } }}
                      placeholder="กรอก PRODUCT_CODE (เช่น 0001) แล้วกด Enter"
                      className="flex h-9 flex-1 rounded-lg border px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/20"
                    />
                    <button onClick={addCode} className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      <Plus className="h-4 w-4" /> เพิ่ม
                    </button>
                  </div>
                  {codes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {codes.map((code) => (
                        <span key={code} className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-xs font-medium">
                          {code}
                          <button onClick={() => setCodes((p) => p.filter((c) => c !== code))} className="ml-0.5 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <button onClick={() => setCodes([])} className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" /> ล้าง
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">ไม่มี code → จะ re-sync สินค้าที่มี odooCode อยู่แล้วใน DB</p>
                  )}
                </div>
              )}

              {/* Progress bar (during streaming) */}
              {isStreaming && progress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">กำลังซิงค์รหัส <span className="font-mono text-primary">{progress.current}</span></span>
                    <span className="text-muted-foreground">{progress.done} / {progress.total} ({pct}%)</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-3 rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-emerald-600">✅ OK: {progress.synced}</span>
                    <span className="text-red-600">❌ Error: {progress.errors}</span>
                    <span className="text-muted-foreground">⏭️ Skip: {progress.done - progress.synced - progress.errors}</span>
                  </div>
                </div>
              )}

              {/* Log output */}
              {(isStreaming || logLines.length > 0) && (
                <div
                  ref={logRef}
                  className="h-40 overflow-y-auto rounded-lg border bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
                >
                  {logLines.map((line, i) => (
                    <div
                      key={i}
                      className={line.startsWith('✅') ? 'text-emerald-400' : line.startsWith('❌') ? 'text-red-400' : 'text-zinc-400'}
                    >
                      {line}
                    </div>
                  ))}
                  {isStreaming && <div className="mt-1 animate-pulse text-zinc-500">▌</div>}
                </div>
              )}

              {/* Final result */}
              {syncState === 'success' && finalResult && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-800">✅ ซิงค์เสร็จสมบูรณ์</p>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span className="text-emerald-700">OK: <strong>{finalResult.synced}</strong></span>
                    <span className="text-red-600">Error: <strong>{finalResult.errors}</strong></span>
                    <span className="text-muted-foreground">Skip: <strong>{finalResult.skipped}</strong></span>
                  </div>
                </div>
              )}

              {/* Error */}
              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t px-5 py-3">
              <button
                onClick={closeModal}
                disabled={isStreaming}
                className="inline-flex h-9 items-center rounded-lg border px-4 text-sm hover:bg-muted disabled:opacity-40"
              >
                {syncState === 'success' ? 'ปิด' : 'ยกเลิก'}
              </button>
              {syncState !== 'success' && (
                <button
                  onClick={mode === 'batch' ? handleBatchSync : handleCodesSync}
                  disabled={isStreaming}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {isStreaming ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" />กำลัง Sync...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4" />เริ่ม Sync</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
