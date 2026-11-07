import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Search,
  Download,
  RefreshCw,
  X,
  Factory,
  Briefcase,
  Calendar,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface TrackedUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  industry?: string;
  role?: string;
  plantScale?: string;
  createdAt?: string;
  lastLoginAt?: string;
  updatedAt?: string;
  dailyUsage?: { date: string; count: number };
}

interface AdminUserTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ADMIN_EMAIL = 'scannota.support@gmail.com';

export const AdminUserTrackerModal: React.FC<AdminUserTrackerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<TrackedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAuthorized = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // Load registered users from Firestore
  useEffect(() => {
    if (!isOpen || !isAuthorized) {
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const usersColRef = collection(db, 'users');

    const unsubscribe = onSnapshot(
      usersColRef,
      (snapshot) => {
        const list: TrackedUser[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          list.push({
            id: doc.id,
            email: d.email || 'Tanpa Email',
            displayName: d.displayName || 'Praktisi Industri',
            photoURL: d.photoURL || '',
            industry: d.industry || 'Belum diatur',
            role: d.role || '-',
            plantScale: d.plantScale || '-',
            createdAt: d.createdAt || '',
            lastLoginAt: d.lastLoginAt || d.updatedAt || d.createdAt || '',
            updatedAt: d.updatedAt || '',
            dailyUsage: d.dailyUsage || undefined,
          });
        });

        // Sort by newest joined first
        list.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setUsers(list);
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to listen to users collection:', err);
        setErrorMsg('Gagal memuat data pengguna: Akses dibatasi untuk akun admin terverifikasi.');
        setIsLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
    );

    return () => unsubscribe();
  }, [isOpen, isAuthorized]);

  const handleManualRefresh = async () => {
    if (!isAuthorized) return;
    setIsRefreshing(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: TrackedUser[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          email: d.email || 'Tanpa Email',
          displayName: d.displayName || 'Praktisi Industri',
          photoURL: d.photoURL || '',
          industry: d.industry || 'Belum diatur',
          role: d.role || '-',
          plantScale: d.plantScale || '-',
          createdAt: d.createdAt || '',
          lastLoginAt: d.lastLoginAt || d.updatedAt || d.createdAt || '',
          updatedAt: d.updatedAt || '',
          dailyUsage: d.dailyUsage || undefined,
        });
      });

      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setUsers(list);
    } catch (err) {
      console.error('Manual refresh error:', err);
      handleFirestoreError(err, OperationType.LIST, 'users');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    if (users.length === 0) return;

    const todayKey = new Date().toISOString().slice(0, 10);

    const headers = [
      'No',
      'User ID',
      'Nama Display',
      'Email Google',
      'Sektor Industri',
      'Peran di Pabrik',
      'Skala Pabrik',
      'Tanya Hari Ini (Max 10)',
      'Tanggal Bergabung (UTC/ISO)',
      'Terakhir Aktif',
    ];

    const rows = users.map((u, idx) => {
      const todayCount = u.dailyUsage && u.dailyUsage.date === todayKey ? u.dailyUsage.count : 0;
      return [
        idx + 1,
        `"${u.id}"`,
        `"${u.displayName.replace(/"/g, '""')}"`,
        `"${u.email}"`,
        `"${(u.industry || '').replace(/"/g, '""')}"`,
        `"${(u.role || '').replace(/"/g, '""')}"`,
        `"${(u.plantScale || '').replace(/"/g, '""')}"`,
        todayCount,
        `"${u.createdAt || ''}"`,
        `"${u.lastLoginAt || ''}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `daftar_user_q_pabrik_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  // Security gate: only scannota.support@gmail.com
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Akses Khusus Admin</h3>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Halaman ini hanya dapat diakses oleh akun admin resmi:{' '}
            <span className="font-semibold text-rose-700 underline">{ADMIN_EMAIL}</span>.
          </p>
          <p className="text-[11px] text-slate-400 mb-5">
            Akun Anda saat ini:{' '}
            <span className="font-semibold text-slate-700">{user?.email || 'Belum Login'}</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // Filter calculations
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.industry && u.industry.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesIndustry =
      selectedIndustryFilter === 'ALL' || u.industry === selectedIndustryFilter;

    return matchesSearch && matchesIndustry;
  });

  // Analytics
  const totalUsersCount = users.length;
  const nowMs = Date.now();
  const activeThisWeekCount = users.filter((u) => {
    const lastActive = new Date(u.lastLoginAt || u.createdAt || 0).getTime();
    return nowMs - lastActive <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  // Industry breakdown counts
  const industryCounts: Record<string, number> = {};
  users.forEach((u) => {
    const ind = u.industry || 'Belum diatur';
    industryCounts[ind] = (industryCounts[ind] || 0) + 1;
  });

  const uniqueIndustries = Object.keys(industryCounts).sort(
    (a, b) => industryCounts[b] - industryCounts[a]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Admin Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Panel Admin & Pelacak Pengguna
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider">
                  Admin Master
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Terautentikasi sebagai <span className="font-semibold text-amber-300">{ADMIN_EMAIL}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Perbarui data pengguna langsung dari Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Tutup Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Analytics Highlights Card */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Metric 1: Total Users */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-medium">Total User Join</span>
                <Users className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {isLoading ? '...' : totalUsersCount}
              </div>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 inline" /> Akun Terverifikasi
              </p>
            </div>

            {/* Metric 2: Active This Week */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-medium">Aktif Minggu Ini</span>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                {isLoading ? '...' : activeThisWeekCount}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {totalUsersCount > 0
                  ? `${Math.round((activeThisWeekCount / totalUsersCount) * 100)}% dari total user`
                  : '0%'}
              </p>
            </div>

            {/* Metric 3: Top Industry */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-2">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span className="font-medium">Distribusi Sektor Terbanyak</span>
                <Factory className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-12 overflow-y-auto">
                {uniqueIndustries.slice(0, 4).map((ind) => (
                  <span
                    key={ind}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-semibold"
                  >
                    <span>{ind}</span>
                    <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {industryCounts[ind]}
                    </span>
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Toolbar: Search, Filter, Export */}
        <div className="p-4 sm:px-6 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari user (nama, email, industri)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Industry Filter dropdown */}
            <select
              value={selectedIndustryFilter}
              onChange={(e) => setSelectedIndustryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Sektor ({users.length})</option>
              {uniqueIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind} ({industryCounts[ind]})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={users.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-300" />
            <span>Unduh CSV ({filteredUsers.length})</span>
          </button>
        </div>

        {/* Table / User List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-xs font-medium">Memuat basis data pengguna dari Firestore...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              {searchQuery || selectedIndustryFilter !== 'ALL'
                ? 'Tidak ada pengguna yang cocok dengan filter pencarian.'
                : 'Belum ada pengguna yang mendaftar.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="text-[11px] uppercase font-bold text-slate-400 bg-slate-50 rounded-xl">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Pengguna</th>
                    <th className="py-2.5 px-3">Email Google</th>
                    <th className="py-2.5 px-3">Sektor Industri & Peran</th>
                    <th className="py-2.5 px-3 text-center">Tanya Hari Ini</th>
                    <th className="py-2.5 px-3">Waktu Bergabung</th>
                    <th className="py-2.5 px-3">Terakhir Aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u, index) => {
                    const todayKey = new Date().toISOString().slice(0, 10);
                    const todayCount = u.dailyUsage && u.dailyUsage.date === todayKey ? u.dailyUsage.count : 0;

                    const joinDate = u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-';

                    const lastActive = u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : joinDate;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-400">{index + 1}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5 min-w-[140px]">
                            {u.photoURL ? (
                              <img
                                src={u.photoURL}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {(u.displayName || 'U')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {u.displayName}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono truncate block">
                                ID: {u.id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <span className="truncate">{u.email}</span>
                            {u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-extrabold shrink-0">
                                OWNER
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="min-w-[140px]">
                            <p className="font-semibold text-indigo-700 truncate">
                              {u.industry || 'Belum diatur'}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{u.role || '-'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {todayCount >= 10 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                              10/10 (Limit)
                            </span>
                          ) : todayCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                              {todayCount} / 10
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-medium">0 / 10</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{joinDate}</td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {lastActive}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Menampilkan <strong className="text-slate-800">{filteredUsers.length}</strong> dari{' '}
            <strong className="text-slate-800">{totalUsersCount}</strong> total pengguna terdaftar.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
