import React, { useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  RotateCcw,
  X,
  Activity,
} from 'lucide-react';

interface LiveVoiceTranscriberProps {
  mode?: 'inline' | 'modal';
  isRecording: boolean;
  recordDuration: number;
  audioVolumeLevels: number[];
  transcript: string;
  onTranscriptChange: (text: string) => void;
  onStopAndSubmit: (finalText?: string) => void;
  onCancel?: () => void;
  industryContext?: string;
  isProcessing?: boolean;
}

export const LiveVoiceTranscriber: React.FC<LiveVoiceTranscriberProps> = ({
  isRecording,
  recordDuration,
  audioVolumeLevels,
  transcript,
  onTranscriptChange,
  onStopAndSubmit,
  onCancel,
  industryContext,
  isProcessing,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the transcript as new words stream in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const avgLevel =
    audioVolumeLevels.length > 0
      ? audioVolumeLevels.reduce((a, b) => a + b, 0) / audioVolumeLevels.length
      : 8;
  const isSpeakingDetected = avgLevel > 16;

  if (!isRecording) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50/98 backdrop-blur-md flex flex-col justify-between p-5 sm:p-8 md:p-12 animate-in fade-in duration-200 select-none">
      {/* 1. Minimal Top Header */}
      <div className="w-full max-w-3xl mx-auto flex items-center justify-between pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                isSpeakingDetected ? 'bg-rose-500 animate-ping' : 'bg-rose-500 animate-pulse'
              }`}
            />
            <span className="absolute w-2.5 h-2.5 rounded-full bg-rose-600" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 tracking-tight">
              Merekam Suara
            </span>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
              {formatTimer(recordDuration)}
            </span>
          </div>

          {/* Equalizer soundwave indicator */}
          <div className="hidden sm:flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 ml-2">
            <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0 mr-1 animate-pulse" />
            {audioVolumeLevels.map((val, idx) => (
              <div
                key={idx}
                style={{
                  height: `${Math.max(4, Math.min(18, val))}px`,
                }}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isSpeakingDetected ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            title="Batal berbicara dan kembali"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Batal</span>
          </button>
        )}
      </div>

      {/* 2. Main Full-Screen Center Area: Running Speech-to-Text */}
      <div
        ref={scrollRef}
        className="flex-1 w-full max-w-3xl mx-auto flex flex-col justify-center py-6 sm:py-10 overflow-y-auto"
      >
        {transcript.trim() ? (
          <div className="w-full space-y-2">
            <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-800 leading-relaxed tracking-tight select-text">
              &ldquo;{transcript.trim()}&rdquo;
              <span className="inline-block w-2 h-6 sm:h-8 bg-indigo-600 ml-2 animate-pulse align-middle rounded-full" />
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center shadow-inner animate-pulse">
              <Mic className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
                Silakan Mulai Berbicara...
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Kata-kata Anda akan muncul langsung di layar ini secara otomatis dan paralel saat Anda berbicara.
              </p>
              {industryContext && (
                <span className="inline-block mt-3 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700">
                  Konteks: {industryContext}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Clean Bottom Action Bar */}
      <div className="w-full max-w-3xl mx-auto pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
        {transcript.trim() ? (
          <button
            type="button"
            onClick={() => onTranscriptChange('')}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Bersihkan teks dan ulangi bicara"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Ulangi Bicara</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={() => onStopAndSubmit()}
          disabled={isProcessing}
          className="flex-1 sm:flex-initial sm:min-w-[260px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-sm sm:text-base shadow-xl shadow-rose-600/25 flex items-center justify-center gap-2.5 transition cursor-pointer"
        >
          <Square className="w-4 h-4 fill-white" />
          <span>Selesai Bicara & Diskusikan</span>
          <Sparkles className="w-4 h-4 text-amber-200" />
        </button>
      </div>
    </div>
  );
};
