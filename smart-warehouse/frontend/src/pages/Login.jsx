import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Warehouse,
  Lock,
  User,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Box,
  QrCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);

  const { login, demoLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Authenticated successfully!');
      navigate('/');
    } catch (err) {
      toast.error('Invalid credentials. Please verify your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (roleName) => {
    setLoading(true);
    try {
      await demoLogin(roleName);
      toast.success(`Logged in as ${roleName}!`);
      navigate('/');
    } catch (err) {
      toast.error(`Quick login for ${roleName} failed.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B132B] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Grid Lines */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#38BDF8 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 relative z-10 animate-fade-in">
        {/* Header */}
        <div className="bg-[#14213D] p-8 text-center text-white relative">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <Warehouse className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase">
            Smart Warehouse
          </h1>
          <p className="text-xs text-blue-300 font-mono tracking-wider mt-0.5">
            BIN & BARCODE LOCATOR 3D
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Username / ID</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin, manager, or picker1"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password123!"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Sign In to Terminal
            </button>
          </form>

          {/* Quick Demo Login Section */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-3">
              One-Click Evaluator Demo Sign-In
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('ADMIN')}
                disabled={loading}
                className="py-2 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-[11px] font-bold transition-all text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('MANAGER')}
                disabled={loading}
                className="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-bold transition-all text-center"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('PICKER')}
                disabled={loading}
                className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold transition-all text-center"
              >
                Picker
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
