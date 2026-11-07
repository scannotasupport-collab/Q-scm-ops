import React, { useState } from 'react';
import { Factory, Briefcase, X, ChevronRight, Sparkles } from 'lucide-react';
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

// Quick shortcut tags for 1-tap mobile selection
const QUICK_INDUSTRIES: Array<{ label: string; fullName: string; emoji: string }> = [
  { label: 'F&B / FMCG', fullName: 'Makanan & Minuman (F&B / FMCG)', emoji: '🥫' },
  { label: 'Otomotif', fullName: 'Otomotif & Komponen Mesin', emoji: '🚗' },
  { label: 'Logistik/SCM', fullName: 'Logistik, Pergudangan & Distribusi', emoji: '📦' },
  { label: 'Farmasi/Kimia', fullName: 'Farmasi, Kosmetik & Kimia', emoji: '💊' },
];

const QUICK_ROLES: Array<{ label: string; fullName: string }> = [
  { label: 'Supervisor', fullName: 'Supervisor / Shift Leader' },
  { label: 'Maintenance', fullName: 'Maintenance & Engineering' },
  { label: 'PPIC / SCM', fullName: 'PPIC / Supply Chain / Gudang' },
  { label: 'Plant Manager', fullName: 'Plant / Operations Manager' },
];

export const IndustrySelectorModal: React.FC<IndustrySelectorModalProps> = ({
  isOpen,
  currentProfile,
  onSelect,
  onClose,
  isInitialRequired = false,
}) => {
  const initialInd = currentProfile?.industry || DEFAULT_INDUSTRIES[0].name;
  const isKnownPredefined = DEFAULT_INDUSTRIES.some((d) => d.name === initialInd);

  const [selectedIndustry, setSelectedIndustry] = useState<string>(
    isKnownPredefined ? initialInd : 'custom'
  );
  const [customIndustry, setCustomIndustry] = useState<string>(
    isKnownPredefined ? '' : initialInd
  );
  const [selectedRole, setSelectedRole] = useState<string>(
    currentProfile?.role || COMMON_ROLES[0]
  );

  if (!isOpen) return null;

  const handleSave = () => {
    const finalIndustry =
      selectedIndustry === 'custom'
        ? customIndustry.trim() || 'Manufaktur Umum'
        : selectedIndustry;

    onSelect({
      industry: finalIndustry,
      role: selectedRole,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 px-4 py-3 sm:px-5 sm:py-4 text-white relative shrink-0">
          {!isInitialRequired && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                Konteks Pabrik & Operasional
              </h2>
              <p className="text-[11px] sm:text-xs text-indigo-100/90 leading-tight">
                Pilih sektor & peran agar analisa Q sesuai standar industri Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Compact Body - strictly fits in single screen with zero scroll */}
        <div className="p-4 sm:p-5 space-y-3.5">
          
          {/* Section 1: Sektor Industri */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sektor Industri Pabrik:</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Wajib</span>
            </div>

            {/* Quick 1-tap chips */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {QUICK_INDUSTRIES.map((q) => {
                const isSelected = selectedIndustry === q.fullName;
                return (
                  <button
                    key={q.fullName}
                    type="button"
                    onClick={() => {
                      setSelectedIndustry(q.fullName);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-medium border flex items-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-sm shrink-0">{q.emoji}</span>
                    <span className="truncate">{q.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Full Select Dropdown */}
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option disabled value="">── Pilih Dari Semua Sektor ──</option>
              {DEFAULT_INDUSTRIES.map((ind) => (
                <option key={ind.id} value={ind.name}>
                  {ind.emoji} {ind.name}
                </option>
              ))}
              <option value="custom">🏭 Sektor Lainnya (Kustom...)</option>
            </select>

            {/* Inline Custom Input */}
            {selectedIndustry === 'custom' && (
              <div className="mt-1.5 animate-in fade-in duration-150">
                <input
                  type="text"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  placeholder="Ketikkan nama sektor industri pabrik Anda..."
                  className="w-full px-3 py-2 rounded-xl border border-indigo-300 bg-indigo-50/40 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Section 2: Peran / Posisi */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>Posisi / Peran Anda:</span>
              </label>
            </div>

            {/* Quick Role Chips */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {QUICK_ROLES.map((r) => {
                const isSelected = selectedRole === r.fullName;
                return (
                  <button
                    key={r.fullName}
                    type="button"
                    onClick={() => setSelectedRole(r.fullName)}
                    className={`px-2.5 py-1.5 rounded-xl text-left text-xs font-medium border truncate transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* Role Select Dropdown */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              {COMMON_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Action Button - Always visible without scroll */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={selectedIndustry === 'custom' && !customIndustry.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 active:scale-[0.99] transition cursor-pointer"
            >
              <span>Mulai Diskusi Operasional</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-1.5">
              Dapat diubah kapan saja melalui menu atas
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
