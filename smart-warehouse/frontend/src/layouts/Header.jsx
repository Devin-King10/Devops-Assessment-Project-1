import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  QrCode,
  Bell,
  LogOut,
  Shield,
  UserCheck,
  PackageCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Header({ onMenuClick }) {
  const { user, logout, demoLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/barcode-locator?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery('');
  };

  const handleRoleSwitch = async (role) => {
    try {
      await demoLogin(role);
      toast.success(`Switched role to ${role}`);
    } catch (err) {
      toast.error('Failed to switch role');
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">ADMIN</span>;
      case 'MANAGER':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">MANAGER</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">PICKER</span>;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 lg:hidden rounded-lg hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Instant Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Scan / Search SKU, Barcode, Bin Code (e.g. 890123400001, A01)..."
            className="w-full pl-9 pr-24 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-mono"
          />
          <button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-medium bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded transition-colors"
          >
            LOCATE
          </button>
        </form>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Launch Barcode Scanner */}
        <button
          onClick={() => navigate('/barcode-locator')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
        >
          <QrCode className="w-4 h-4 text-blue-600" />
          <span>Scanner</span>
        </button>

        {/* Demo Role Switcher (Convenient for evaluators) */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-[10px] text-slate-600 px-1.5 font-bold uppercase">Role:</span>
          <button
            onClick={() => handleRoleSwitch('ADMIN')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              user?.role === 'ADMIN' ? 'bg-white shadow text-purple-700 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleRoleSwitch('MANAGER')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              user?.role === 'MANAGER' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manager
          </button>
          <button
            onClick={() => handleRoleSwitch('PICKER')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
              user?.role === 'PICKER' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Picker
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
              {user?.username}
              {getRoleBadge(user?.role)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {user?.employee_id || 'ID-001'}
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
