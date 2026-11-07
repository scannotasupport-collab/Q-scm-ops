import React, { useState } from 'react';
import {
  BrainCircuit,
  Plus,
  Trash2,
  X,
  Factory,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  Clock,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { FactoryFact } from '../types';
import { playChimeSound } from '../utils/audio';

interface MemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  facts: FactoryFact[];
  onAddFact: (category: string, fact: string) => void;
  onDeleteFact: (id: string) => void;
  onDiscussFact?: (fact: FactoryFact) => void;
}

export const MemoryDrawer: React.FC<MemoryDrawerProps> = ({
  isOpen,
  onClose,
  facts,
  onAddFact,
  onDeleteFact,
  onDiscussFact,
}) => {
  const [newCategory, setNewCategory] = useState('Operasional Pabrik');
  const [newFact, setNewFact] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFact, setSelectedFact] = useState<FactoryFact | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    onAddFact(newCategory, newFact.trim());
    setNewFact('');
    setIsAdding(false);
    playChimeSound('success');
  };

  const generateWhatsAppDraft = (fact: FactoryFact) => {
    const dateFormatted = new Date(fact.date).toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `*📋 CATATAN MEMORI OPERASIONAL PABRIK*\n📅 *Waktu Dicatat:* ${dateFormatted}\n🏷️ *Kategori:* ${fact.category}\n\n*Kondisi / Fakta Lapangan:*\n${fact.fact}\n\n🔍 *Catatan Evaluasi:* Data ini tersimpan dalam basis pengetahuan AI Q untuk pemantauan stabilitas lini dan koordinasi lintas shift.\n\n_Disusun via Q • Rekan Diskusi Operasional & Supply Chain_`;
  };

  const handleCopyWhatsApp = async (fact: FactoryFact) => {
    const text = generateWhatsAppDraft(fact);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedReport(true);
      playChimeSound('success');
      setTimeout(() => setCopiedReport(false), 2500);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const handleDeleteWithFeedback = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onDeleteFact(id);
    if (selectedFact?.id === id) {
      setSelectedFact(null);
    }
    setConfirmDeleteId(null);
    playChimeSound('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col text-slate-900 animate-in slide-in-from-right duration-300 z-10">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            {selectedFact ? (
              <button
                type="button"
                onClick={() => setSelectedFact(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-600 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Kembali ke daftar memori"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Daftar</span>
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <BrainCircuit className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                {selectedFact ? 'Rincian Memori Pabrik' : 'Memori Pabrik & Rantai Pasok'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedFact
                  ? selectedFact.category
                  : `${facts.length} fakta tersimpan dalam memori aktif Q`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode: Selected Fact Detail (Mirrors the Application Answer Structure) */}
        {selectedFact ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Answer-like Banner Card */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-2xs">
                  <Factory className="w-3.5 h-3.5" />
                  <span>{selectedFact.category}</span>
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {new Date(selectedFact.date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Kondisi Lapangan / Fakta yang Diserap Q:
              </h4>
              <p className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed bg-white/90 p-3.5 rounded-xl border border-indigo-100">
                &ldquo;{selectedFact.fact}&rdquo;
              </p>
            </div>

            {/* Answer Operational Evaluation */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Sparkles className="w-4 h-4" />
                <h5 className="text-xs font-bold uppercase tracking-wider">
                  Analisis & Korelasi AI Q:
                </h5>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                Data ini terus diperhitungkan oleh Q setiap kali Anda mendiskusikan kendala baru. Q akan memastikan saran OEE, buffer stock, atau jadwal perawatan mesin sinkron dengan riwayat ini.
              </p>

              {/* Action: Diskusikan Ulang dengan Q */}
              {onDiscussFact && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onDiscussFact(selectedFact)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-98 transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>💬 Buka Sesi Diskusi Baru Mengenai Fakta Ini</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-1">
                    Q akan langsung menganalisis akar masalah & solusi langkah demi langkah di layar utama.
                  </p>
                </div>
              )}
            </div>

            {/* WhatsApp Draft Report Ready to Copy */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Share2 className="w-4 h-4" />
                  <h5 className="text-xs font-bold uppercase tracking-wider">
                    Draf Laporan WhatsApp Atasan:
                  </h5>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyWhatsApp(selectedFact)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  {copiedReport ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Draf WA</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="text-xs font-sans text-slate-800 bg-white/90 p-3 rounded-xl border border-emerald-200/80 whitespace-pre-wrap leading-relaxed select-all">
                {generateWhatsAppDraft(selectedFact)}
              </pre>
            </div>

            {/* Delete Fact Action with Confirmation */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedFact(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ← Kembali ke Daftar
              </button>

              {confirmDeleteId === selectedFact.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-600 font-semibold">Yakin hapus?</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteWithFeedback(selectedFact.id)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedFact.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Memori Ini</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* View Mode: Fact List */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Info Banner */}
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Basis Pengetahuan Pabrik Otomatis</p>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Setiap kendala mesin, reject rate, atau lead time yang Anda ceritakan tersimpan di sini. <strong>Klik salah satu memori</strong> untuk membuka rincian analisis & draf laporan WA.
                </p>
              </div>
            </div>

            {/* List Header & Manual Add Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Daftar Memori Tersimpan ({facts.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-bold cursor-pointer px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAdding ? 'Tutup Form' : 'Tambah Manual'}</span>
              </button>
            </div>

            {/* Manual Add Form */}
            {isAdding && (
              <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kategori Lini / Masalah
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="Lini Produksi">Lini Produksi & Mesin</option>
                    <option value="Supply Chain">Supply Chain & Vendor</option>
                    <option value="Operasional Pabrik">Operasional & OEE</option>
                    <option value="Quality Control">Quality Control & Reject</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Catatan Fakta Mesin / Pabrik
                  </label>
                  <textarea
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="Contoh: Suhu chiller Line 2 tidak boleh melebihi 4°C untuk menjaga shelf-life..."
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!newFact.trim()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs active:scale-95 transition"
                  >
                    Simpan ke Memori
                  </button>
                </div>
              </form>
            )}

            {/* Fact List Items */}
            {facts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <BrainCircuit className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Belum ada memori tercatat</p>
                <p className="text-[11px] mt-1">
                  Saat Anda berdiskusi via audio atau teks, hal-hal penting akan otomatis diserap ke memori ini.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {facts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedFact(item)}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group flex flex-col gap-2 relative text-left"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200/70">
                        {item.category}
                      </span>

                      {/* Visible, Touch-Friendly Action Buttons on Mobile & Desktop */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          {new Date(item.date).toLocaleDateString('id-ID')}
                        </span>

                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                            <span className="text-[10px] text-rose-700 font-bold px-1">Hapus?</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteWithFeedback(item.id, e)}
                              className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700"
                            >
                              Ya
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(item.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus data memori ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fact Text Body */}
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans line-clamp-3">
                      {item.fact}
                    </p>

                    {/* Bottom Tap to Open Indicator */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-medium group-hover:text-indigo-600 transition">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>Klik untuk buka rincian & draf WA</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
