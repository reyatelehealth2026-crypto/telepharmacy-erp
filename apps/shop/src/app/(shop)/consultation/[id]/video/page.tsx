'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, PhoneOff, Mic, MicOff, VideoIcon, VideoOff, RotateCcw } from 'lucide-react';
import { useAuthGuard } from '@/lib/use-auth-guard';
import { getPatientToken, startSession, endSession, type AgoraToken } from '@/lib/telemedicine';
import { toast } from 'sonner';

type CallState = 'connecting' | 'connected' | 'reconnecting' | 'ended';

export default function VideoCallPage() {
  const { id } = useParams();
  const router = useRouter();
  const { loading: authLoading, token } = useAuthGuard();

  const [callState, setCallState] = useState<CallState>('connecting');
  const [agoraToken, setAgoraToken] = useState<AgoraToken | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const localTracksRef = useRef<{ audioTrack: any; videoTrack: any }>({ audioTrack: null, videoTrack: null });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Agora token
  useEffect(() => {
    if (!token || !id) return;
    getPatientToken(token, id as string)
      .then(data => setAgoraToken(data))
      .catch(err => { setError(err.message); setCallState('ended'); });
  }, [token, id]);

  // Initialize Agora
  useEffect(() => {
    if (!agoraToken) return;
    let mounted = true;

    async function initAgora() {
      try {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;

        // Handle remote user
        client.on('user-published', async (user: any, mediaType: 'video' | 'audio') => {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video' && remoteVideoRef.current) {
            user.videoTrack?.play(remoteVideoRef.current);
          }
          if (mediaType === 'audio') {
            user.audioTrack?.play();
          }
        });

        client.on('user-unpublished', (user: any, mediaType: 'video' | 'audio') => {
          if (mediaType === 'video' && remoteVideoRef.current) {
            remoteVideoRef.current.innerHTML = '';
          }
        });

        client.on('connection-state-change', (cur: string) => {
          if (!mounted) return;
          if (cur === 'CONNECTED') setCallState('connected');
          else if (cur === 'RECONNECTING') setCallState('reconnecting');
          else if (cur === 'DISCONNECTED') setCallState('ended');
        });

        // Join channel
        if (!agoraToken) throw new Error('Agora token not available');
        await client.join(agoraToken.appId, agoraToken.channelName, agoraToken.token, agoraToken.uid);

        // Create local tracks
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = { audioTrack, videoTrack };

        if (localVideoRef.current) videoTrack.play(localVideoRef.current);
        await client.publish([audioTrack, videoTrack]);

        if (mounted) {
          setCallState('connected');
          // Notify backend session started
          if (token) startSession(token, id as string).catch(() => {});
          // Start timer
          timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        }
      } catch (err: any) {
        if (mounted) { setError(err.message || 'ไม่สามารถเชื่อมต่อวิดีโอได้'); setCallState('ended'); }
      }
    }

    initAgora();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      localTracksRef.current.audioTrack?.close();
      localTracksRef.current.videoTrack?.close();
      clientRef.current?.leave();
    };
  }, [agoraToken, token, id]);

  const toggleMic = useCallback(() => {
    const track = localTracksRef.current.audioTrack;
    if (track) { track.setEnabled(!micOn); setMicOn(!micOn); }
  }, [micOn]);

  const toggleCam = useCallback(() => {
    const track = localTracksRef.current.videoTrack;
    if (track) { track.setEnabled(!camOn); setCamOn(!camOn); }
  }, [camOn]);

  const handleEndCall = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    localTracksRef.current.audioTrack?.close();
    localTracksRef.current.videoTrack?.close();
    await clientRef.current?.leave();
    setCallState('ended');
    if (token) endSession(token, id as string).catch(() => {});
    router.push(`/consultation/${id}`);
  }, [token, id, router]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="relative flex h-screen flex-col bg-black">
      {/* Remote Video (full screen) */}
      <div ref={remoteVideoRef} className="flex-1 bg-gray-900">
        {callState === 'connecting' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">กำลังเชื่อมต่อ...</p>
          </div>
        )}
        {callState === 'reconnecting' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
            <RotateCcw className="h-8 w-8 animate-spin" />
            <p className="text-sm">กำลังเชื่อมต่อใหม่...</p>
          </div>
        )}
        {error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => router.push(`/consultation/${id}`)} className="rounded-lg bg-white/20 px-4 py-2 text-sm">กลับ</button>
          </div>
        )}
      </div>

      {/* Local Video (PiP) */}
      <div ref={localVideoRef} className="absolute right-4 top-4 h-32 w-24 overflow-hidden rounded-xl border-2 border-white/30 bg-gray-800 shadow-lg" />

      {/* Duration */}
      {callState === 'connected' && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1 text-sm font-mono text-white">
          {formatTime(duration)}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6">
        <button onClick={toggleMic} className={`flex h-12 w-12 items-center justify-center rounded-full ${micOn ? 'bg-white/20' : 'bg-red-500'} text-white`}>
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>
        <button onClick={handleEndCall} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
          <PhoneOff className="h-6 w-6" />
        </button>
        <button onClick={toggleCam} className={`flex h-12 w-12 items-center justify-center rounded-full ${camOn ? 'bg-white/20' : 'bg-red-500'} text-white`}>
          {camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
