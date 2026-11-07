import React from 'react';
import { Bell, CheckCircle2, Clock, Trash2, X, AlertTriangle, Calendar } from 'lucide-react';
import { FollowUpReminder } from '../types';

interface ReminderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: FollowUpReminder[];
  onToggleStatus: (id: string, newStatus: 'pending' | 'completed') => void;
  onDelete: (id: string) => void;
}

export const ReminderDrawer: React.FC<ReminderDrawerProps> = ({
  isOpen,
  onClose,
  reminders,
  onToggleStatus,
  onDelete,
}) => {
  if (!isOpen) return null;

  const pendingReminders = reminders.filter((r) => r.status === 'pending');
  const completedReminders = reminders.filter((r) => r.status === 'completed');

  const formatSchedule = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'maintenance':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">Maintenance Mesin</span>;
      case 'supply_chain':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">Supply Chain</span>;
      case 'production':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Produksi / Lini</span>;
      case 'quality':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">Quality Control</span>;
      case 'vendor':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">Audit Vendor</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/30">Tindak Lanjut</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col text-slate-900 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Reminder Tindak Lanjut</h3>
              <p className="text-xs text-slate-500">
                {pendingReminders.length} pengingat aktif hasil diskusi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Pending Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Jadwal Pengingat Aktif ({pendingReminders.length})</span>
            </h4>

            {pendingReminders.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Belum ada reminder aktif. Saat berdiskusi, jika Anda menyetujui langkah tindak lanjut, Q otomatis membuatkan pengingat di sini.
              </div>
            ) : (
              pendingReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-indigo-300 transition flex flex-col gap-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-900 text-sm leading-snug">
                        {reminder.title}
                      </span>
                      {getCategoryBadge(reminder.category)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleStatus(reminder.id, 'completed')}
                      title="Tandai Selesai"
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>

                  {reminder.detail && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {reminder.detail}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                    <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatSchedule(reminder.dueTime)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(reminder.id)}
                      className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Completed Section */}
          {completedReminders.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Selesai Dilakukan ({completedReminders.length})</span>
              </h4>

              {completedReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="p-3 rounded-xl bg-slate-100 border border-slate-200 opacity-80 flex items-center justify-between text-xs text-slate-600"
                >
                  <div className="line-through flex-1 truncate pr-2">
                    {reminder.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(reminder.id, 'pending')}
                      className="text-indigo-600 hover:underline cursor-pointer font-medium"
                    >
                      Aktifkan
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(reminder.id)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
