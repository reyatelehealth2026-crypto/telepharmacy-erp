'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { livenessCheck, faceCompare } from '@/lib/kyc';
import { toast } from 'sonner';

type Step = 'camera' | 'recording' | 'selfie' | 'processing' | 'done';

export default function KycLivenessPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuthGuard();
  const [step, setStep] = useState<Step>('camera');
  const [error, setError] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get verificationId from sessionStorage
  useEffect(() => {
    const vid = sessionStorage.getItem('kyc_verification_id');
    if (vid) setVerificationId(vid);
  }, []);

  // Start camera
  useEffect(() => {
    if (step !== 'camera' && step !== 'recording') return;
    let mounted = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      })
      .catch(() => setError('ไม่สามารถเข้าถึงกล้องได้'));
    return () => { mounted = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [step]);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setStep('processing');
      try {
        const res = await livenessCheck(verificationId, blob);
        if (res.passed) {
          toast.success('ผ่านการตรวจสอบ');
          setStep('selfie');
        } else {
          setError('ไม่ผ่านการตรวจสอบ กรุณาลองใหม่');
          setStep('camera');
        }
      } catch (err: any) {
        setError(err.message);
        setStep('camera');
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setStep('recording');
    // Auto stop after 5 seconds
    setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 5000);
  };

  const handleSelfie = async (file: File) => {
    setStep('processing');
    try {
      const res = await faceCompare(verificationId, file);
      if (res.matched) {
        toast.success('เปรียบเทียบใบหน้าสำเร็จ');
        setStep('done');
      } else if (res.requiresReview) {
        toast.info('ส่งข้อมูลให้เจ้าหน้าที่ตรวจสอบแล้ว');
        setStep('done');
      } else {
        setError('ใบหน้าไม่ตรงกับบัตรประชาชน กรุณาลองใหม่');
        setStep('selfie');
      }
    } catch (err: any) {
      setError(err.message);
      setStep('selfie');
    }
  };

  if (authLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/profile/kyc" className="rounded-full p-1 hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">{step === 'selfie' ? 'ถ่ายเซลฟี่' : 'ตรวจสอบใบหน้า'}</h1>
      </div>

      <div className="space-y-4 px-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {(step === 'camera' || step === 'recording') && (
          <>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              หันหน้าตรงกล้อง กระพริบตา และหันซ้าย-ขวาช้าๆ
            </div>
            <div className="relative overflow-hidden rounded-xl border bg-black">
              <video ref={videoRef} autoPlay playsInline muted className="w-full" style={{ transform: 'scaleX(-1)' }} />
              {step === 'recording' && (
                <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-xs text-white">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-white" /> กำลังบันทึก
                </div>
              )}
            </div>
            {step === 'camera' && (
              <button onClick={startRecording} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
                <Camera className="h-4 w-4" /> เริ่มตรวจสอบ
              </button>
            )}
          </>
        )}

        {step === 'selfie' && (
          <>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              ถ่ายเซลฟี่เพื่อเปรียบเทียบกับรูปในบัตรประชาชน
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => { if (e.target.files?.[0]) handleSelfie(e.target.files[0]); }} />
            <button onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 hover:bg-muted/50">
              <Camera className="h-10 w-10 text-primary" />
              <p className="text-sm font-medium">ถ่ายเซลฟี่</p>
            </button>
          </>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">กำลังตรวจสอบ...</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <p className="font-medium">ตรวจสอบใบหน้าสำเร็จ</p>
            <button onClick={() => router.push('/profile/kyc/otp')} className="mt-4 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
              ถัดไป: ยืนยัน OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
