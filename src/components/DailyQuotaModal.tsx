import React from 'react';
import { X, Clock, ShieldCheck, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

interface DailyQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  usedCount: number;
  maxLimit?: number;
  userEmail?: string | null;
}

export const DailyQuotaModal: React.FC<DailyQuotaModalProps> = ({
  isOpen,
  onClose,
  usedCount,
  maxLimit = 10,
  userEmail,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 sm:p-7">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <Clock className="w-8 h-8" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
          <span>Kuota Harian Tercapai:</span>
          <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-[11px]">
            {usedCount} / {maxLimit} Tanya
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
          Batas Konsultasi Hari Ini Telah Tercapai
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
          Untuk menjaga kualitas analisa operasional dan stabilitas kuota AI industri, setiap pengguna dibatasi maksimal <strong>{maxLimit} sesi tanya</strong> per hari.
        </p>

        {/* Information Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3 mb-6 text-xs text-slate-700">
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Jadwal Reset Otomatis</p>
              <p className="text-slate-500 text-[11px]">
                Kuota Anda akan di-reset kembali menjadi <strong>{maxLimit} pertanyaan</strong> besok tepat pukul <strong>00:00 WIB</strong> (tengah malam).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Riwayat Percakapan Aman</p>
              <p className="text-slate-500 text-[11px]">
                Seluruh draf solusi, memori parameter mesin, dan alarm jadwal tindakan Anda tetap tersimpan rapi dan dapat ditinjau kembali kapan saja.
              </p>
            </div>
          </div>
        </div>

        {userEmail && (
          <p className="text-[11px] text-slate-400 mb-5">
            Akun terdaftar: <span className="font-semibold text-slate-700">{userEmail}</span>
          </p>
        )}

        {/* CTA Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
        >
          Mengerti, Lanjutkan Besok
        </button>

      </div>
    </div>
  );
};
