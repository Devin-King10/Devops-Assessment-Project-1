import React, { useState } from 'react';
import { Settings, Database, Shield, Sliders, Bell, Check, Terminal } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function SettingsPage() {
  const toast = useToast();
  const [supabaseConnected, setSupabaseConnected] = useState(true);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          System Configuration & Database Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Supabase PostgreSQL connection, algorithm heuristic weights, and warehouse parameters.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 text-xs">
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Database & Supabase Infrastructure
          </h3>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-sm">PostgreSQL Engine</span>
                <span className="text-slate-500 block text-[11px]">Transactional row-level locking (select_for_update) enabled</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3" /> Online & Active
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-600 bg-white p-3 rounded-lg border border-slate-200 space-y-1">
              <div>DATABASE_URL: postgresql://postgres:***@db.supabase.co:5432/postgres</div>
              <div>FALLBACK_STORAGE: SQLite3 (Automatic Zero-Config Resilience)</div>
              <div>TRANSACTION_ISOLATION: READ COMMITTED / ROW LOCKING</div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            Pathfinding & Algorithm Parameters
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block">Default Walking Speed</span>
              <span className="text-[11px] text-slate-500">1.25 m/s (~75 meters/min)</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 block">2-Opt TSP Max Iterations</span>
              <span className="text-[11px] text-slate-500">100 iterations local search</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
