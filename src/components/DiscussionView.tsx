import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Send,
  Bell,
  BrainCircuit,
  RotateCcw,
  Volume2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  BookOpen,
  FileText,
  Copy,
  Check,
  MessageCircle,
  Factory,
  Download,
} from 'lucide-react';
import { ChatMessage, FactoryFact, FollowUpReminder, UserIndustryProfile } from '../types';
import { MarkdownView } from './MarkdownView';
import {
  blobToBase64,
  playChimeSound,
  getSupportedAudioMimeType,
  isMobileDevice,
  fetchLiveTranscription,
} from '../utils/audio';
import { LiveVoiceTranscriber } from './LiveVoiceTranscriber';
import { UserAuthBadge } from './UserAuthBadge';
import { InstallAppButton } from './InstallAppButton';
import { cleanTranscript, mergeSpeechTranscripts } from '../utils/speechUtils';
import { downloadAdviceDocReport, downloadAdviceTextReport } from '../utils/reportExport';

interface DiscussionViewProps {
  messages: ChatMessage[];
  reminders: FollowUpReminder[];
  factoryFacts: FactoryFact[];
  isProcessing: boolean;
  userProfile: UserIndustryProfile | null;
  onChangeIndustry: () => void;
  onAudioSubmit: (audioBase64: string, durationSeconds: number, mimeType: string, interimText?: string) => Promise<void>;
  onTextSubmit: (text: string) => Promise<void>;
  onNewDiscussion: () => void;
  onOpenReminders: () => void;
  onOpenMemory: () => void;
  onToggleReminderStatus: (id: string, newStatus: 'pending' | 'completed') => void;
  onRetryMessage?: (messageId: string, originalText: string) => void;
  isGuestExhausted?: boolean;
  onRequireLogin?: (reason: 'audio_input' | 'text_input' | 'new_discussion' | 'general') => void;
  onOpenAdminModal?: () => void;
  remainingDailyQuota?: number;
  isDailyQuotaExhausted?: boolean;
  onOpenDailyQuotaModal?: () => void;
}

export const DiscussionView: React.FC<DiscussionViewProps> = ({
  messages,
  reminders,
  factoryFacts,
  isProcessing,
  userProfile,
  onChangeIndustry,
  onAudioSubmit,
  onTextSubmit,
  onNewDiscussion,
  onOpenReminders,
  onOpenMemory,
  onToggleReminderStatus,
  onRetryMessage,
  isGuestExhausted = false,
  onRequireLogin,
  onOpenAdminModal,
  remainingDailyQuota,
  isDailyQuotaExhausted = false,
  onOpenDailyQuotaModal,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [audioVolumeLevels, setAudioVolumeLevels] = useState<number[]>([10, 14, 18, 14, 10]);
  const [expandedDetailMessageIds, setExpandedDetailMessageIds] = useState<Set<string>>(new Set());

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedWaDraftIds, setExpandedWaDraftIds] = useState<Set<string>>(new Set());
  const toggleDetails = (id: string) => {
    setExpandedDetailMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleWaDraft = (id: string) => {
    setExpandedWaDraftIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getWhatsAppReport = (msg: ChatMessage): string => {
    if (msg.whatsappReportDraft && msg.whatsappReportDraft.trim().length > 10) {
      return msg.whatsappReportDraft;
    }

    const dateStr = new Date(msg.timestamp).toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const cleanText = msg.text
      .replace(/###/g, '')
      .replace(/\*\*/g, '*')
      .replace(/\n\s*\n/g, '\n');

    return `*📋 LAPORAN KENDALA & TINDAKAN LINI OPERASIONAL*\n📅 *Waktu:* ${dateStr}\n\n${cleanText.slice(0, 500)}\n\n📊 *Status:* Dalam pemantauan dan tindakan tim operasional shift.\n_Disusun via Q • Rekan Diskusi Operasional Pabrik & Supply Chain_`;
  };

  const handleCopyWhatsApp = async (msg: ChatMessage) => {
    const reportText = getWhatsAppReport(msg);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(reportText);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = reportText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedMessageId(msg.id);
      playChimeSound('success');
      setTimeout(() => {
        setCopiedMessageId((prev) => (prev === msg.id ? null : prev));
      }, 2500);
    } catch (err) {
      console.error('Failed to copy WhatsApp report:', err);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const isRecordingRef = useRef(false);
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

  const pendingRemindersCount = reminders.filter((r) => r.status === 'pending').length;
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    // When a new message is added to the conversation
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        if (lastMsg.role === 'model') {
          if (lastMsg.detailedExplanation || (lastMsg.glossary && lastMsg.glossary.length > 0)) {
            setExpandedDetailMessageIds((prev) => new Set([...prev, lastMsg.id]));
          }
          // Scroll smoothly to the START (top) of the bot's response
          // User begins reading from the start of the recommendation, not the bottom!
          setTimeout(() => {
            const el = document.getElementById(`msg-${lastMsg.id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 120);
        } else if (lastMsg.role === 'user') {
          setTimeout(() => {
            const el = document.getElementById(`msg-${lastMsg.id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

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

  const startRecording = async () => {
    if (isGuestExhausted && onRequireLogin) {
      onRequireLogin('audio_input');
      return;
    }
    if (isDailyQuotaExhausted && onOpenDailyQuotaModal) {
      onOpenDailyQuotaModal();
      return;
    }
    setAudioError(null);
    setInterimTranscript('');
    audioChunksRef.current = [];
    baseTranscriptRef.current = '';
    currentSessionFinalRef.current = '';
    currentSessionInterimRef.current = '';
    lastLocalTranscriptTimeRef.current = 0;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      // Direct, real-time native speech-to-text path
      // By giving SpeechRecognition direct microphone access WITHOUT competing getUserMedia,
      // mobile Android and iOS devices can stream words word-by-word with zero hardware lock!
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

          const { combined } = mergeSpeechTranscripts(
            baseTranscriptRef.current,
            sessionFinal,
            sessionInterim
          );

          if (combined) {
            setInterimTranscript(combined);
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
          // Commit session transcript without repeating Android Chrome flushed chunks
          const finishedChunk = (currentSessionFinalRef.current || currentSessionInterimRef.current).trim();
          if (finishedChunk) {
            const { newBase } = mergeSpeechTranscripts(baseTranscriptRef.current, finishedChunk, '');
            baseTranscriptRef.current = newBase;
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
      console.error('Microphone error:', err);
      setAudioError('Mikrofon tidak dapat diakses. Silakan gunakan ketik teks atau izinkan browser.');
      setShowTextInput(true);
    }
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
      typeof customTranscript === 'string' && customTranscript.trim()
        ? customTranscript
        : (interimTranscript || mergeSpeechTranscripts(baseTranscriptRef.current, currentSessionFinalRef.current, currentSessionInterimRef.current).combined);
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
        } catch (e) {
          console.error('Failed to submit audio:', e);
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
        setShowTextInput(true);
      }
      return;
    }

    try {
      await onAudioSubmit('', duration, 'text/plain', finalTranscriptText);
    } catch (e: any) {
      console.error('Failed to submit transcript:', e);
      setAudioError('Gagal memproses ucapan. Silakan coba kembali.');
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    if (isGuestExhausted && onRequireLogin) {
      onRequireLogin('text_input');
      return;
    }
    if (isDailyQuotaExhausted && onOpenDailyQuotaModal) {
      onOpenDailyQuotaModal();
      return;
    }
    const text = textInput.trim();
    setTextInput('');
    onTextSubmit(text);
  };

  const formatSchedule = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50 text-slate-900">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-2.5 sm:px-6 py-2 sm:py-3.5 flex items-center justify-between shadow-xs w-full max-w-full overflow-hidden">
        {/* Brand Left */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-0.5 shadow-xs select-none shrink-0 overflow-hidden">
            <img
              src="/logo.png"
              alt="Logo Q"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0 truncate">
            <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
              <span className="truncate">Q • Rekan Diskusi</span>
              <span className="hidden md:inline-flex px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Memori Aktif
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block truncate">
              Ahli operasional pabrik & supply chain berbasis suara
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
          {/* Install App Button */}
          <InstallAppButton variant="compact" />

          {/* Active Industry Context Pill */}
          {userProfile && (
            <button
              type="button"
              onClick={onChangeIndustry}
              className="inline-flex items-center gap-1 px-1.5 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[11px] sm:text-xs font-semibold text-indigo-900 transition cursor-pointer shadow-2xs shrink-0"
              title="Klik untuk mengubah sektor industri pabrik"
            >
              <Factory className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate max-w-[55px] xs:max-w-[75px] sm:max-w-[160px]">{userProfile.industry}</span>
              <span className="text-[9px] text-indigo-600 font-bold bg-white px-1 py-0.2 rounded border border-indigo-200 hidden sm:inline shrink-0">
                Ubah
              </span>
            </button>
          )}

          {/* Plant Memory Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenMemory}
            className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] sm:text-xs text-slate-700 transition cursor-pointer font-medium shrink-0"
            title="Lihat Memori Pabrik yang diingat AI"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden md:inline">Memori Pabrik</span>
            <span className="px-1 py-0.2 rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 shrink-0">
              {factoryFacts.length}
            </span>
          </button>

          {/* Follow-up Reminders Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenReminders}
            className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] sm:text-xs text-slate-700 transition relative cursor-pointer font-medium shrink-0"
            title="Lihat Reminder Tindak Lanjut"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden md:inline">Reminder</span>
            {pendingRemindersCount > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold animate-pulse shrink-0">
                {pendingRemindersCount}
              </span>
            )}
          </button>

          {/* Download Advice Report Button in Header (if advice exists) */}
          {messages.some((m) => m.role === 'model' && !m.isError) && (
            <button
              type="button"
              onClick={() => {
                const latestModelMsg = [...messages].reverse().find((m) => m.role === 'model' && !m.isError);
                if (latestModelMsg) {
                  const prevMsg = messages.find((_, i) => messages[i + 1]?.id === latestModelMsg.id);
                  downloadAdviceDocReport(latestModelMsg, userProfile, prevMsg);
                  playChimeSound('success');
                }
              }}
              className="inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition cursor-pointer shrink-0 shadow-2xs"
              title="Unduh laporan saran operasional terbaru (.doc Word)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden lg:inline">Unduh Saran</span>
            </button>
          )}

          {/* Daily Quota Counter Badge */}
          {typeof remainingDailyQuota === 'number' && (
            <button
              type="button"
              onClick={onOpenDailyQuotaModal}
              className={`inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold transition cursor-pointer border shrink-0 shadow-2xs ${
                isDailyQuotaExhausted
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  : remainingDailyQuota <= 3
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
              title="Batas kuota pertanyaan harian (Max 10 / hari)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kuota:</span>
              <span>{isDailyQuotaExhausted ? '0/10' : remainingDailyQuota >= 999 ? 'Bebas' : `${remainingDailyQuota}/10`}</span>
            </button>
          )}

          {/* New Discussion / Reset to simple greeting */}
          <button
            type="button"
            onClick={() => {
              if (isGuestExhausted && onRequireLogin) {
                onRequireLogin('new_discussion');
                return;
              }
              onNewDiscussion();
            }}
            className="inline-flex items-center justify-center p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs transition cursor-pointer border border-slate-300 font-medium shrink-0"
            title="Mulai Diskusi Baru (Kembali ke panel pembuka)"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Diskusi Baru</span>
          </button>

          {/* User Auth Profile Badge */}
          <div className="shrink-0">
            <UserAuthBadge
              userProfile={userProfile}
              onOpenIndustryModal={onChangeIndustry}
              onOpenAdminModal={onOpenAdminModal}
            />
          </div>
        </div>
      </header>

      {/* Main Conversation Feed */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 overflow-y-auto">
        {messages.map((message) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={message.id}
              id={`msg-${message.id}`}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all scroll-mt-24`}
            >
              {/* Message Header Label */}
              <div className="flex items-center gap-2 mb-1.5 px-1">
                {isUser ? (
                  <>
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Mic className="w-3 h-3 text-indigo-600" />
                      <span>Input Suara Anda</span>
                      {message.audioDurationSeconds && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({message.audioDurationSeconds}s)
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(message.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-white border border-slate-200 flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
                        <img src="/logo.png" alt="Q" className="w-full h-full object-contain" />
                      </span>
                      <span>Q • Rekan Diskusi Pabrik & SCM</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(message.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                )}
              </div>

              {/* Message Card */}
              <div
                className={`w-full max-w-3xl rounded-2xl p-5 shadow-sm transition-all ${
                  isUser
                    ? 'bg-gradient-to-br from-indigo-50 to-blue-50/70 border border-indigo-200 text-slate-900'
                    : 'bg-white border border-slate-200 text-slate-900 shadow-xs'
                }`}
              >
                {isUser ? (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm leading-relaxed text-slate-800 font-medium">
                        &ldquo;{message.transcription || message.text}&rdquo;
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header badge for quick view */}
                    {message.isError ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-[11px] font-bold text-amber-900">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Koneksi Jaringan Terputus</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 text-[11px] font-bold text-indigo-800">
                        <span>💡 Solusi & Analisis Operasional Q</span>
                      </div>
                    )}

                    {/* Bot response in clean formatted markdown */}
                    <div className="prose max-w-none text-slate-800">
                      <MarkdownView content={message.text} />
                    </div>

                    {/* Direct Retry Action Card on network errors */}
                    {message.isError && onRetryMessage && (
                      <div className="mt-2 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="text-xs text-amber-900">
                          <p className="font-semibold">Pertanyaan Anda telah tersimpan.</p>
                          <p className="text-amber-800 text-[11px] mt-0.5">Tekan tombol di samping untuk langsung menghubungkan kembali ke server Q.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRetryMessage(message.id, message.originalUserInput || '')}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kirim Ulang Pertanyaan</span>
                        </button>
                      </div>
                    )}

                    {/* Auto-detected Follow-up Reminder Card if created this turn */}
                    {message.detectedReminder && (
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-white to-indigo-50/60 border border-emerald-300 shadow-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                              <Bell className="w-4 h-4 animate-bounce" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                                  Pengingat Otomatis Disimpan
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  {message.detectedReminder.category}
                                </span>
                              </div>
                              <h4 className="text-sm font-semibold text-slate-900 mt-1">
                                {message.detectedReminder.title}
                              </h4>
                              {message.detectedReminder.detail && (
                                <p className="text-xs text-slate-600 mt-0.5">
                                  {message.detectedReminder.detail}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-emerald-700 font-semibold">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Jadwal: {formatSchedule(message.detectedReminder.dueTime)}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onToggleReminderStatus(
                                message.detectedReminder!.id,
                                message.detectedReminder!.status === 'completed'
                                    ? 'pending'
                                    : 'completed'
                              )
                            }
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Tandai Status"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Download Advice & Report Toolbar */}
                    {!message.isError && (
                      <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/90 via-slate-50 to-blue-50/60 border border-indigo-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Download className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                              <span>Unduh Rekomendasi Solusi</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-200/70 text-indigo-900 font-bold">
                                Lengkap
                              </span>
                            </span>
                            <p className="text-[11px] text-indigo-700">
                              Simpan hasil saran ke perangkat untuk laporan shift atau evaluasi manajemen
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const prevMsg = messages.find((_, i) => messages[i + 1]?.id === message.id);
                              downloadAdviceDocReport(message, userProfile, prevMsg);
                              playChimeSound('success');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-800 text-xs font-bold shadow-2xs transition cursor-pointer active:scale-95"
                            title="Unduh laporan dalam format Word / .doc"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Unduh (.doc)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const prevMsg = messages.find((_, i) => messages[i + 1]?.id === message.id);
                              downloadAdviceTextReport(message, userProfile, prevMsg);
                              playChimeSound('success');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-95"
                            title="Unduh laporan dalam format teks (.txt)"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Unduh (.txt)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* WhatsApp Report Draft Box */}
                    {!message.isError && (
                      <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/90 to-green-50/70 border border-emerald-200/90 flex flex-col gap-2.5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                              <span>Draft Laporan WhatsApp ke Atasan</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-200/70 text-emerald-900 font-bold">
                                Siap Kirim
                              </span>
                            </span>
                            <p className="text-[11px] text-emerald-700">
                              Format pesan WA rapi untuk grup shift atau update manajer
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => toggleWaDraft(message.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-xs font-semibold hover:bg-emerald-50 transition cursor-pointer shadow-2xs"
                          >
                            {expandedWaDraftIds.has(message.id) ? 'Tutup Teks' : 'Pratinjau Teks'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyWhatsApp(message)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer ${
                              copiedMessageId === message.id
                                ? 'bg-emerald-800 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin Teks WA</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded WhatsApp Draft Preview & Edit */}
                      {expandedWaDraftIds.has(message.id) && (
                        <div className="mt-1 pt-2 border-t border-emerald-200/80 flex flex-col gap-2 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                            <span>Teks di bawah siap dipaste langsung ke WhatsApp:</span>
                            <span className="text-[10px] text-slate-400">Termasuk format *bold* & emoji</span>
                          </div>
                          <div className="p-3 rounded-lg bg-white border border-emerald-300 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner max-h-56 overflow-y-auto select-all">
                            {getWhatsAppReport(message)}
                          </div>
                          <div className="flex justify-end gap-2">
                            <a
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(getWhatsAppReport(message))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Buka di Aplikasi WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                    )}

                    {/* Expandable In-Depth Technical Explanation & Factory Glossary */}
                    {!message.isError && (message.detailedExplanation || (message.glossary && message.glossary.length > 0)) && (
                      <div className="mt-4 pt-3 border-t border-slate-200/90 flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDetails(message.id)}
                          className="inline-flex items-center justify-between w-full p-3 rounded-xl bg-gradient-to-r from-indigo-50/90 to-blue-50/70 hover:from-indigo-100/90 hover:to-blue-100/80 text-indigo-950 border border-indigo-200 transition cursor-pointer text-xs font-semibold shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>
                              {expandedDetailMessageIds.has(message.id)
                                ? 'Sembunyikan Analisa Mendalam & Glosarium'
                                : 'Lihat Analisa Mendalam & Glosarium Istilah Pabrik'}
                            </span>
                            {message.glossary && message.glossary.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-bold">
                                {message.glossary.length} Istilah
                              </span>
                            )}
                          </div>
                          {expandedDetailMessageIds.has(message.id) ? (
                            <ChevronUp className="w-4 h-4 text-indigo-700 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-indigo-700 shrink-0" />
                          )}
                        </button>

                        {expandedDetailMessageIds.has(message.id) && (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
                            {/* In-depth technical guide */}
                            {message.detailedExplanation && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-800">
                                  <FileText className="w-4 h-4 text-indigo-600" />
                                  <span>Bedah Teknis & Metodologi Lengkap</span>
                                </div>
                                <div className="prose max-w-none text-slate-800 text-xs sm:text-sm">
                                  <MarkdownView content={message.detailedExplanation} />
                                </div>
                              </div>
                            )}

                            {/* Glossary of Terms */}
                            {message.glossary && message.glossary.length > 0 && (
                              <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                                  <span>Glosarium Istilah Pabrik & Supply Chain</span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  Penjelasan istilah teknis yang dipakai agar mudah dipahami bagi pemula:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {message.glossary.map((item, gIdx) => (
                                    <div
                                      key={gIdx}
                                      className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col gap-1"
                                    >
                                      <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                                        {item.term}
                                      </span>
                                      <span className="text-[11px] text-slate-600 leading-relaxed font-sans">
                                        {item.definition}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Processing Indicator Turn */}
        {isProcessing && (
          <div className="flex flex-col items-start max-w-3xl">
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <span className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-spin text-indigo-600" />
                <span>Konsultan sedang menganalisis audio & riwayat...</span>
              </span>
            </div>
            <div className="w-full rounded-2xl p-5 bg-white border border-slate-200 text-slate-700 flex items-center gap-3 shadow-xs">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-800">
                  Mendengarkan rekaman dan mengorelasikan data lini & supply chain...
                </p>
                <p className="text-xs text-slate-500">
                  Mengecek histori downtime, OEE, lead time, serta potensi tindak lanjut.
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-28" />
      </main>

      {/* Floating Bottom Audio Input Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 sm:px-4 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-lg">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
          
          {/* Guest Second Input Alert Banner */}
          {isGuestExhausted && !isRecording && (
            <div
              onClick={() => onRequireLogin && onRequireLogin('general')}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-amber-50/95 border border-amber-300 text-amber-900 text-xs cursor-pointer hover:bg-amber-100 transition shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0 text-left">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span className="font-medium text-[11px] sm:text-xs truncate">
                  <strong className="font-bold">Masalah Ke-2:</strong> Login diperlukan untuk keamanan akun user dan penyimpanan data yang rapi
                </span>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded-lg font-bold text-[11px] shadow-sm">
                Masuk Google
              </span>
            </div>
          )}

          {/* Active Recording Overlay inside bottom bar */}
          {isRecording ? (
            <div className="w-full flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-2xl border border-rose-300">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shrink-0">
                  {audioVolumeLevels.map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}px` }}
                      className="w-1.5 bg-gradient-to-t from-indigo-600 to-rose-500 rounded-full transition-all duration-75"
                    />
                  ))}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>Merekam ({recordDuration}s)</span>
                  </span>
                  {interimTranscript && (
                    <span className="text-[11px] text-slate-600 italic truncate max-w-[140px] sm:max-w-xs">
                      &ldquo;{interimTranscript}&rdquo;
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => stopRecording()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-600/30 cursor-pointer transition active:scale-95 shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Selesai</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-2 sm:gap-3">
              {/* Voice Trigger Button (Primary) */}
              <button
                type="button"
                onClick={isDailyQuotaExhausted && onOpenDailyQuotaModal ? onOpenDailyQuotaModal : startRecording}
                disabled={isProcessing}
                className={`flex-1 py-3 px-4 sm:px-5 rounded-2xl font-semibold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ${
                  isDailyQuotaExhausted
                    ? 'bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 shadow-rose-600/10'
                    : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white shadow-indigo-600/20'
                }`}
              >
                {isDailyQuotaExhausted ? (
                  <>
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0" />
                    <span>Batas Kuota Hari Ini Tercapai (10/10) • Klik Info</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
                    <span>Tekan untuk Bicara & Diskusi</span>
                  </>
                )}
              </button>

              {/* Text Input Toggle */}
              <button
                type="button"
                onClick={() => setShowTextInput(!showTextInput)}
                className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer shrink-0"
                title="Ketik Pesan Teks"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {audioError && (
            <div className="text-xs text-rose-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{audioError}</span>
            </div>
          )}

          {/* Optional Text input bar toggle */}
          {showTextInput && !isRecording && (
            <form onSubmit={handleTextSubmit} className="w-full flex gap-2 pt-1 animate-fade-in">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isDailyQuotaExhausted}
                placeholder={
                  isDailyQuotaExhausted
                    ? "Batas kuota harian tercapai (10/10). Reset besok pukul 00:00 WIB."
                    : "Ketik situasi pabrik atau konfirmasi follow-up (misal: 'Oke buatkan reminder besok jam 10')..."
                }
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isProcessing || isDailyQuotaExhausted}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
              >
                Kirim
              </button>
            </form>
          )}
        </div>
      </footer>
      {/* Live Parallel Speech-to-Text Interactive Modal HUD */}
      {isRecording && (
        <LiveVoiceTranscriber
          mode="modal"
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
      )}
    </div>
  );
};
