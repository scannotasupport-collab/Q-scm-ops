import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, LogOut, Cloud, ShieldCheck, Factory, ChevronDown, ShieldAlert } from 'lucide-react';
import { UserIndustryProfile } from '../types';

interface UserAuthBadgeProps {
  userProfile: UserIndustryProfile | null;
  onOpenIndustryModal: () => void;
  onOpenAdminModal?: () => void;
}

export const UserAuthBadge: React.FC<UserAuthBadgeProps> = ({
  userProfile,
  onOpenIndustryModal,
  onOpenAdminModal,
}) => {
  const { user, loading, error, signInWithGoogle, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="h-9 w-24 bg-slate-100 animate-pulse rounded-full border border-slate-200"></div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {error && (
          <span className="hidden sm:inline-block text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
            {error}
          </span>
        )}
        <button
          onClick={() => signInWithGoogle()}
          className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-full border border-slate-300 shadow-xs hover:border-slate-400 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Login dengan Akun Google untuk simpan percakapan & pengingat di cloud"
        >
          {/* Google G logo */}
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
          <span className="text-[11px] sm:text-xs font-semibold text-slate-800">Masuk</span>
        </button>
      </div>
    );
  }

  const isAdmin = user.email?.toLowerCase() === 'scannota.support@gmail.com';

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Direct Admin Quick Access Button for scannota.support@gmail.com */}
      {isAdmin && onOpenAdminModal && (
        <button
          type="button"
          onClick={onOpenAdminModal}
          className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-slate-950 font-black text-xs rounded-full shadow-sm hover:shadow transition-all cursor-pointer shrink-0 animate-in fade-in"
          title="Buka Panel Admin & Pelacak Pengguna"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-slate-950" />
          <span>Panel Admin</span>
        </button>
      )}

      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-xs transition-all cursor-pointer shrink-0"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-slate-200 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight max-w-[110px] truncate">
              {user.displayName?.split(' ')[0] || 'User'}
            </span>
            <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Cloud Aktif
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 px-3 z-50 text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* User Profile Card */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.displayName || 'Praktisi Industri'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md inline-flex border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Tersinkronisasi Firebase</span>
                </div>
              </div>
            </div>

            {/* Special Admin Item for scannota.support@gmail.com */}
            {isAdmin && onOpenAdminModal && (
              <div className="mt-2.5 pb-2.5 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenAdminModal();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-bold text-xs transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="leading-tight">Panel Admin</div>
                      <div className="text-[10px] text-amber-700 font-normal">Track Jumlah User Join</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                    Owner
                  </span>
                </button>
              </div>
            )}

            {/* Sektor Industri Aktif */}
            <div className="my-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <Factory className="w-3.5 h-3.5 text-slate-600" />
                Sektor Industri
              </span>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenIndustryModal();
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                Ubah
              </button>
            </div>
            <p className="font-semibold text-slate-800 text-xs truncate">
              {userProfile?.industry || 'Belum diatur'}
            </p>
            {userProfile?.role && (
              <p className="text-[11px] text-slate-500 mt-0.5">{userProfile.role}</p>
            )}
          </div>

          {/* Cloud Info */}
          <div className="px-2 py-1.5 text-[11px] text-slate-500 flex items-center gap-2">
            <Cloud className="w-3.5 h-3.5 text-blue-500" />
            <span>Semua pengingat & memori pabrik tersimpan aman di Firestore</span>
          </div>

          {/* Logout Action */}
          <div className="mt-2 pt-2 border-t border-slate-100">
            <button
              onClick={async () => {
                setDropdownOpen(false);
                await logout();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar dari Akun
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
