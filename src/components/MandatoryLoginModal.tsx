import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Cloud, Bell, BrainCircuit, FileText, X, AlertCircle, Loader2 } from 'lucide-react';

interface MandatoryLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'audio_input' | 'text_input' | 'new_discussion' | 'general';
}

export const MandatoryLoginModal: React.FC<MandatoryLoginModalProps> = ({
  isOpen,
  onClose,
  reason = 'general',
}) => {
  const { signInWithGoogle, loading, error: authError } = useAuth();
  const [internalError, setInternalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setInternalError(null);
    try {
      await signInWithGoogle();
      // On success, the AuthContext updates `user` and App will close modal
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setInternalError(err?.message || 'Gagal masuk dengan Google. Silakan coba kembali.');
    }
  };

  const getReasonLabel = () => {
    switch (reason) {
      case 'audio_input':
        return 'Merekam Suara Masalah Ke-2';
      case 'text_input':
        return 'Mengirim Masalah Ke-2';
      case 'new_discussion':
        return 'Membuka Sesi Masalah Baru';
      default:
        return 'Masukan Masalah Ke-2';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Box */}
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden z-10 my-8">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 px-6 pt-6 pb-7 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
            title="Tutup (Kembali ke tinjauan sesi sebelumnya)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-300 text-xs font-semibold mb-3 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Wajib Login Google • {getReasonLabel()}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Masuk untuk Melanjutkan Masalah Kedua
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1.5 leading-relaxed">
            Sesi konsultasi pertama Anda telah selesai. Login diperlukan untuk keamanan akun user dan penyimpanan data yang rapi.
          </p>
        </div>

        {/* Benefits Card Body */}
        <div className="p-6">
          {/* Exact Required Security & Organization Notice Banner */}
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center gap-2.5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="leading-relaxed font-semibold">
              Login diperlukan untuk keamanan akun user dan penyimpanan data yang rapi.
            </p>
          </div>

          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Keuntungan Tersimpan di Akun Anda:
          </p>

          <div className="space-y-2.5 mb-6">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <Cloud className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Penyimpanan Terstruktur & Rapi</h4>
                <p className="text-[11px] text-slate-500">
                  Data percakapan teknis, draf laporan, dan catatan lini tertata rapi di cloud.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Keamanan Akun Terlindungi</h4>
                <p className="text-[11px] text-slate-500">
                  Autentikasi resmi Firebase Google memastikan data sensitif pabrik hanya dapat diakses oleh Anda.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <BrainCircuit className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Memori Pabrik Terpadu</h4>
                <p className="text-[11px] text-slate-500">
                  Q mengingat mesin, kendala masa lalu, dan karakter lini pabrik Anda.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Alarm & Reminder Tindak Lanjut</h4>
                <p className="text-[11px] text-slate-500">
                  Notifikasi jadwal perbaikan dan kalibrasi otomatis disinkronkan ke seluruh perangkat.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {(internalError || authError) && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{internalError || authError}</p>
                  {(String(internalError || authError).includes('Authorized domains') ||
                    String(internalError || authError).includes('unauthorized-domain')) && (
                    <div className="mt-2 p-2 bg-white rounded-xl border border-rose-200 text-[11px] text-slate-700 space-y-1">
                      <p className="font-bold text-slate-900">Cara Mengatasi (1 Menit):</p>
                      <p>1. Buka <strong>Firebase Console</strong> project Anda.</p>
                      <p>2. Masuk ke <strong>Authentication ➔ Settings ➔ Authorized domains</strong>.</p>
                      <p>3. Klik <strong>Add domain</strong> lalu masukkan: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">q.maravva-tech.com</code>.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Primary Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold text-sm rounded-2xl shadow-lg shadow-slate-900/20 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Menghubungkan Akun Google...</span>
              </>
            ) : (
              <>
                {/* Official Google G Logo */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Akun Google</span>
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Autentikasi Resmi Firebase
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Lihat sesi sebelumnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
