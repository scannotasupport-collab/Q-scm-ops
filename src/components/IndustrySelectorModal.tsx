import React, { useState } from 'react';
import { Factory, Check, Sparkles, X, ChevronRight, Briefcase } from 'lucide-react';
import { UserIndustryProfile, IndustryOption } from '../types';
import { DEFAULT_INDUSTRIES } from '../utils/storage';

interface IndustrySelectorModalProps {
  isOpen: boolean;
  currentProfile: UserIndustryProfile | null;
  onSelect: (profile: UserIndustryProfile) => void;
  onClose?: () => void;
  isInitialRequired?: boolean;
}

const COMMON_ROLES = [
  'Supervisor / Shift Leader',
  'Maintenance & Engineering',
  'PPIC / Supply Chain / Gudang',
  'Quality Control (QC/QA)',
  'Plant / Operations Manager',
  'Direktur / Owner Pabrik',
];

export const IndustrySelectorModal: React.FC<IndustrySelectorModalProps> = ({
  isOpen,
  currentProfile,
  onSelect,
  onClose,
  isInitialRequired = false,
}) => {
  const [selectedIndustry, setSelectedIndustry] = useState<string>(
    currentProfile?.industry || DEFAULT_INDUSTRIES[0].name
  );
  const [customIndustry, setCustomIndustry] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<string>(
    currentProfile?.role || 'Supervisor / Shift Leader'
  );

  if (!isOpen) return null;

  const handleSave = () => {
    const finalIndustry = isCustom && customIndustry.trim() ? customIndustry.trim() : selectedIndustry;
    onSelect({
      industry: finalIndustry,
      role: selectedRole,
    });
  };

  const handleSelectPredefined = (ind: IndustryOption) => {
    setSelectedIndustry(ind.name);
    setIsCustom(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 p-6 sm:p-7 text-white relative">
          {!isInitialRequired && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold w-fit mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>Kustomisasi Konteks Ahli Pabrik</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Industri Apa yang Anda Kelola?
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-lg leading-relaxed">
            Pilih sektor industri Anda agar AI dapat memberikan analisa akar masalah, standar mesin, dan SOP yang tepat sasaran.
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Sektor Industri Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Factory className="w-4 h-4 text-indigo-600" />
              <span>Pilih Sektor Pabrik / Bisnis:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEFAULT_INDUSTRIES.map((ind) => {
                const isChecked = !isCustom && selectedIndustry === ind.name;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => handleSelectPredefined(ind)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-2xl shrink-0 p-1 rounded-xl bg-slate-100 border border-slate-200">
                      {ind.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {ind.name}
                        </span>
                        {isChecked && (
                          <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                        {ind.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Industry Option */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`w-full p-3 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                  isCustom
                    ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏭</span>
                  <span>Industri Lainnya (Tuliskan sektor Anda sendiri)</span>
                </div>
                {isCustom && <Check className="w-4 h-4 text-indigo-600" />}
              </button>

              {isCustom && (
                <div className="mt-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    placeholder="Contoh: Manufaktur Percetakan & Karton Box, Woodworking Furniture, dsb..."
                    className="w-full px-4 py-2.5 rounded-xl border border-indigo-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* Posisi / Peran Anda */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Peran / Posisi Anda di Pabrik:</span>
            </label>

            <div className="flex flex-wrap gap-2">
              {COMMON_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                    selectedRole === role
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Konteks dapat diubah kapan saja di menu atas.
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isCustom && !customIndustry.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
          >
            <span>Mulai Diskusi Operasional</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
