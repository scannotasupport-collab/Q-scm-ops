import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, MoreVertical, ArrowDown } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppButtonProps {
  className?: string;
  variant?: 'prominent' | 'compact' | 'badge';
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
  className = '',
  variant = 'prominent',
}) => {
  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running in standalone mode (already installed), hide completely
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const result = await install();
    if (result === 'accepted') {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 4000);
    } else if (result === 'manual_needed') {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'badge' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-emerald-800 transition shadow-2xs cursor-pointer ${className}`}
          title="Pasang aplikasi Q di Layar Utama HP"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>Install Aplikasi HP</span>
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold shadow-xs transition cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-indigo-300" />
          <span>Install Aplikasi</span>
        </button>
      ) : (
        /* Prominent Hero Variant for Opening Panel */
        <button
          type="button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/90 active:bg-emerald-200/80 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>Install Aplikasi di Layar HP</span>
        </button>
      )}

      {/* Success indicator toast */}
      {justInstalled && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Aplikasi Q berhasil dipasang di layar HP Anda!</span>
        </div>
      )}

      {/* Guided Manual Installation Modal (for iOS Safari or Chrome fallback) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 text-left">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center p-2 shrink-0">
                <img src="/logo.png" alt="Logo Q" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Install Aplikasi Q di HP
                </h3>
                <p className="text-xs text-slate-500">
                  Akses langsung 1-ketuk seperti aplikasi Play Store / App Store
                </p>
              </div>
            </div>

            {isIOS ? (
              /* iOS Safari instructions */
              <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    Ketuk tombol <strong className="text-slate-900">Share</strong> (ikon kotak tanda panah keluar <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />) di bilah bawah Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    Gulir ke bawah dan ketuk opsi <strong className="text-slate-900">"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    Ketuk <strong className="text-slate-900">"Tambah" (Add)</strong> di pojok kanan atas. Ikon aplikasi Q akan langsung muncul di beranda HP Anda!
                  </div>
                </div>
              </div>
            ) : (
              /* Android Chrome / Brave / Edge instructions */
              <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    Ketuk ikon <strong className="text-slate-900">Menu Titik Tiga</strong> (<MoreVertical className="w-3.5 h-3.5 inline text-slate-700" />) di pojok kanan atas browser Anda.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    Pilih menu <strong className="text-slate-900">"Install aplikasi"</strong> atau <strong className="text-slate-900">"Tambahkan ke Layar Utama"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    Konfirmasi <strong className="text-slate-900">"Install"</strong>. Aplikasi Q akan terpasang di HP Anda dan dapat dibuka tanpa membuka browser lagi.
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
