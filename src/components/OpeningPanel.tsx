import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, Volume2, AlertCircle, Factory } from 'lucide-react';
import {
  playChimeSound,
  blobToBase64,
  getSupportedAudioMimeType,
  isMobileDevice,
  fetchLiveTranscription,
} from '../utils/audio';
import { UserIndustryProfile } from '../types';
import { LiveVoiceTranscriber } from './LiveVoiceTranscriber';
import { UserAuthBadge } from './UserAuthBadge';
import { InstallAppButton } from './InstallAppButton';
import { cleanTranscript } from '../utils/speechUtils';

interface OpeningPanelProps {
  onAudioSubmit: (audioBase64: string, durationSeconds: number, mimeType: string, interimText?: string) => Promise<void>;
  onTextSubmit: (text: string) => Promise<void>;
  isProcessing: boolean;
  userProfile: UserIndustryProfile | null;
  onChangeIndustry: () => void;
  isGuestExhausted?: boolean;
  onRequireLogin?: (reason: 'audio_input' | 'text_input' | 'new_discussion' | 'general') => void;
}

export const OpeningPanel: React.FC<OpeningPanelProps> = ({
  onAudioSubmit,
  onTextSubmit,
  isProcessing,
  userProfile,
  onChangeIndustry,
  isGuestExhausted = false,
  onRequireLogin,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [fallbackInput, setFallbackInput] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const liveSlicerTimerRef = useRef<number | null>(null);
  const isLiveTranscribingRef = useRef(false);
  const lastLocalTranscriptTimeRef = useRef<number>(0);
  const baseTranscriptRef = useRef('');
  const currentSessionFinalRef = useRef('');
  const currentSessionInterimRef = useRef('');
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionRunningRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioVolumeLevels, setAudioVolumeLevels] = useState<number[]>([8, 12, 16, 20, 16, 12, 8]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (liveSlicerTimerRef.current) clearInterval(liveSlicerTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const startRecording = async () => {
    if (isGuestExhausted && onRequireLogin) {
      onRequireLogin('audio_input');
      return;
    }
    setAudioError(null);
    setInterimTranscript('');
    baseTranscriptRef.current = '';
    currentSessionFinalRef.current = '';
    currentSessionInterimRef.current = '';
    lastLocalTranscriptTimeRef.current = 0;
    audioChunksRef.current = [];

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      // Direct, real-time native speech-to-text path
      // By giving SpeechRecognition direct microphone access WITHOUT competing getUserMedia,
      // mobile Android and iOS devices can stream words word-by-word in real time!
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          isRecognitionRunningRef.current = true;
        };

        recognition.onresult = (event: any) => {
          let sessionFinal = '';
          let sessionInterim = '';

          for (let i = 0; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              sessionFinal += res[0].transcript + ' ';
            } else {
              sessionInterim += res[0].transcript;
            }
          }

          currentSessionFinalRef.current = sessionFinal;
          currentSessionInterimRef.current = sessionInterim;

          const combined = (baseTranscriptRef.current + ' ' + sessionFinal + ' ' + sessionInterim).replace(/\s+/g, ' ').trim();
          const cleanText = cleanTranscript(combined);
          if (cleanText) {
            setInterimTranscript(cleanText);
            lastLocalTranscriptTimeRef.current = Date.now();
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition notice:', event.error);
          if (event.error === 'not-allowed') {
            isRecognitionRunningRef.current = false;
            setAudioError('Izin mikrofon tidak diberikan. Silakan izinkan browser atau gunakan mode teks.');
          }
        };

        recognition.onend = () => {
          isRecognitionRunningRef.current = false;
          // Commit whatever was accumulated in this recognition session to baseTranscriptRef
          const finishedChunk = (currentSessionFinalRef.current || currentSessionInterimRef.current).trim();
          if (finishedChunk) {
            baseTranscriptRef.current = cleanTranscript(baseTranscriptRef.current + ' ' + finishedChunk) + ' ';
            currentSessionFinalRef.current = '';
            currentSessionInterimRef.current = '';
          }
          // Auto-restart if user is still actively recording
          if (isRecordingRef.current) {
            if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
            restartTimerRef.current = window.setTimeout(() => {
              if (isRecordingRef.current && !isRecognitionRunningRef.current) {
                try {
                  recognition.start();
                } catch (e) {}
              }
            }, 100);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;

        setIsRecording(true);
        isRecordingRef.current = true;
        setRecordDuration(0);
        playChimeSound('record_start');

        // Dynamic visual waveform animation while listening
        const animateVisualizer = () => {
          if (!isRecordingRef.current) return;
          const time = Date.now() / 150;
          const isRecentlySpeaking = Date.now() - lastLocalTranscriptTimeRef.current < 800;
          const base = isRecentlySpeaking ? 28 : 12;
          const bars = [
            Math.max(8, base + Math.sin(time * 1.1) * 16),
            Math.max(10, base + Math.sin(time * 1.3 + 1) * 24),
            Math.max(14, base + Math.sin(time * 1.5 + 2) * 32),
            Math.max(16, base + Math.sin(time * 1.7 + 3) * 38),
            Math.max(14, base + Math.sin(time * 1.5 + 4) * 32),
            Math.max(10, base + Math.sin(time * 1.3 + 5) * 24),
            Math.max(8, base + Math.sin(time * 1.1 + 6) * 16),
          ];
          setAudioVolumeLevels(bars);
          animationFrameRef.current = requestAnimationFrame(animateVisualizer);
        };
        animateVisualizer();

        timerRef.current = window.setInterval(() => {
          setRecordDuration((prev) => prev + 1);
        }, 1000);

        return;
      } catch (e) {
        console.warn('SpeechRecognition failed to start, falling back to MediaRecorder:', e);
      }
    }

    // Fallback path: MediaRecorder with audio slicer (for browsers without SpeechRecognition)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const selectedMime = getSupportedAudioMimeType();
      const mediaRecorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordDuration(0);
      playChimeSound('record_start');

      // Live Audio Slicer for fallback mode
      liveSlicerTimerRef.current = window.setInterval(async () => {
        if (!isRecordingRef.current || audioChunksRef.current.length < 2) return;
        if (isLiveTranscribingRef.current) return;
        isLiveTranscribingRef.current = true;

        try {
          const mime = mediaRecorderRef.current?.mimeType || selectedMime || 'audio/webm';
          const sliceBlob = new Blob(audioChunksRef.current, { type: mime });
          if (sliceBlob.size > 800) {
            const liveText = await fetchLiveTranscription(sliceBlob, mime);
            if (liveText && isRecordingRef.current) {
              setInterimTranscript(liveText);
            }
          }
        } catch (e) {
        } finally {
          isLiveTranscribingRef.current = false;
        }
      }, 2000);

      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setAudioError(
        'Akses mikrofon tidak diizinkan atau tidak tersedia. Pastikan izin mikrofon telah aktif di browser Anda atau gunakan mode teks.'
      );
      setShowTextFallback(true);
    }
  };

  const cancelRecording = () => {
    isRecordingRef.current = false;
    isRecognitionRunningRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (liveSlicerTimerRef.current) clearInterval(liveSlicerTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  const stopRecording = async (customTranscript?: string) => {
    if (!isRecording) return;

    isRecordingRef.current = false;
    isRecognitionRunningRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (liveSlicerTimerRef.current) clearInterval(liveSlicerTimerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    playChimeSound('record_stop');

    const duration = recordDuration;
    const rawTranscript =
      typeof customTranscript === 'string'
        ? customTranscript
        : (interimTranscript || (baseTranscriptRef.current + ' ' + currentSessionFinalRef.current + ' ' + currentSessionInterimRef.current));
    const finalTranscriptText = cleanTranscript(rawTranscript);
    setIsRecording(false);

    // Fallback MediaRecorder mode:
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }

        const mimeType = mediaRecorderRef.current?.mimeType || getSupportedAudioMimeType() || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        if (audioBlob.size < 100 && duration < 1 && !finalTranscriptText.trim()) {
          setAudioError('Rekaman terlalu singkat. Silakan tekan mikrofon dan coba bicara kembali.');
          return;
        }

        try {
          const base64 = await blobToBase64(audioBlob);
          await onAudioSubmit(base64, duration, mimeType, finalTranscriptText);
        } catch (e: any) {
          console.error('Error submitting audio:', e);
          setAudioError('Gagal memproses audio. Silakan coba kembali.');
        }
      };
      mediaRecorderRef.current.stop();
      return;
    }

    // Direct SpeechRecognition mode:
    if (!finalTranscriptText.trim()) {
      if (duration < 1) {
        setAudioError('Belum ada ucapan terdeteksi. Silakan coba tekan mikrofon dan mulai berbicara.');
      } else {
        setAudioError('Suara tidak terdengar jelas. Pastikan mikrofon aktif atau gunakan ketik teks.');
        setShowTextFallback(true);
      }
      return;
    }

    try {
      await onAudioSubmit('', duration, 'text/plain', finalTranscriptText);
    } catch (e: any) {
      console.error('Error submitting transcript:', e);
      setAudioError('Gagal memproses ucapan. Silakan coba kembali.');
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackInput.trim() || isProcessing) return;
    if (isGuestExhausted && onRequireLogin) {
      onRequireLogin('text_input');
      return;
    }
    onTextSubmit(fallbackInput.trim());
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 text-slate-800 relative">
      {/* Background subtle factory grid ambiance */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e140_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e140_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none" />

      {/* Floating Top Header: Left = Install App Button, Right = Auth Badge */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <InstallAppButton variant="compact" />
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <UserAuthBadge userProfile={userProfile} onOpenIndustryModal={onChangeIndustry} />
      </div>

      {/* Main Single Centered Opening Panel */}
      <div className="relative w-full max-w-xl mx-auto rounded-3xl bg-white/95 border border-slate-200/90 shadow-2xl shadow-indigo-900/10 backdrop-blur-xl p-8 sm:p-12 text-center transition-all">
        
        {/* Q Avatar Branding */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border border-slate-200/90 shadow-xl shadow-slate-900/10 ring-4 ring-slate-100 mb-4 mx-auto flex items-center justify-center p-2 overflow-hidden select-none">
          <img
            src="/logo.png"
            alt="Logo Q - Rekan Diskusi Pabrik & SCM"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Badges: Expert status & Install App & Industry Profile selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-xs font-semibold text-indigo-700">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Q • Rekan Diskusi Operasional & SCM</span>
          </div>

          {/* Prominent Install Button on Home Screen */}
          <InstallAppButton variant="prominent" />

          {userProfile && (
            <button
              type="button"
              onClick={onChangeIndustry}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs font-medium text-slate-700 hover:text-indigo-700 transition cursor-pointer shadow-2xs"
              title="Ganti sektor industri pabrik"
            >
              <Factory className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-semibold text-slate-800">{userProfile.industry}</span>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100/80 px-1.5 py-0.2 rounded ml-0.5">
                Ganti
              </span>
            </button>
          )}
        </div>

        {/* The Exact Required Opening Greeting */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2 leading-tight">
          Hi, aku Q, rekan diskusimu. Apa yang mau kamu diskusikan saat ini?
        </h1>

        {userProfile && (
          <p className="text-xs text-slate-500 mb-4">
            Konteks: <span className="font-semibold text-indigo-700">{userProfile.industry}</span> {userProfile.role ? `• ${userProfile.role}` : ''}
          </p>
        )}

        {/* Guest Session Notice if guest already used their free 1st problem */}
        {isGuestExhausted && (
          <div
            onClick={() => onRequireLogin && onRequireLogin('general')}
            className="my-3 p-3 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-100 transition shadow-xs text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span className="font-medium text-[11px] sm:text-xs">
                Sesi 1x uji coba selesai. <span className="font-bold">Login diperlukan untuk keamanan akun user dan penyimpanan data yang rapi.</span>
              </span>
            </div>
            <span className="shrink-0 px-2.5 py-1 bg-slate-900 text-white rounded-xl font-bold text-[11px] shadow-sm">
              Masuk Google
            </span>
          </div>
        )}

        {/* Central Audio Recording Sphere & Status */}
        <div className="my-8 flex flex-col items-center justify-center">
          {!isRecording && !isProcessing && (
            <div className="relative group">
              {/* Outer pulsing gentle ring */}
              <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-emerald-500/20 blur-lg group-hover:opacity-100 opacity-60 transition duration-700 animate-pulse" />
              
              <button
                type="button"
                onClick={startRecording}
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-all duration-300 transform active:scale-95 group-hover:scale-105 cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
                aria-label="Mulai Bicara"
              >
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 text-white transition-transform group-hover:scale-110" />
              </button>
            </div>
          )}

          {/* Active Recording State: Parallel Interactive Text & Soundwave */}
          {isRecording && (
            <div className="w-full my-2 animate-fade-in">
              <LiveVoiceTranscriber
                mode="inline"
                isRecording={isRecording}
                recordDuration={recordDuration}
                audioVolumeLevels={audioVolumeLevels}
                transcript={interimTranscript}
                onTranscriptChange={setInterimTranscript}
                onStopAndSubmit={(finalVal) => stopRecording(finalVal)}
                onCancel={cancelRecording}
                industryContext={userProfile?.industry}
                isProcessing={isProcessing}
              />
            </div>
          )}

          {/* Processing Spinner */}
          {isProcessing && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-600 animate-spin" />
                <Volume2 className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Menganalisis situasi pabrik & supply chain...
              </p>
            </div>
          )}
        </div>

        {/* Audio helper guidance */}
        {!isRecording && !isProcessing && (
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
            Tekan mikrofon untuk menceritakan kendala lini produksi, mesin, vendor, atau logistik Anda
          </p>
        )}

        {/* Audio Error message */}
        {audioError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{audioError}</span>
          </div>
        )}

        {/* Unobtrusive fallback typing toggle (only if mic fails or user requests) */}
        {!isRecording && !isProcessing && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            {!showTextFallback ? (
              <button
                type="button"
                onClick={() => setShowTextFallback(true)}
                className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-4 transition cursor-pointer"
              >
                Atau ingin mengetik situasi pabrik?
              </button>
            ) : (
              <form onSubmit={handleFallbackSubmit} className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={fallbackInput}
                  onChange={(e) => setFallbackInput(e.target.value)}
                  placeholder="Ketik kendala operasional pabrik atau supply chain..."
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!fallbackInput.trim() || isProcessing}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition cursor-pointer shadow-sm"
                >
                  Kirim
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
