import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  MapPin,
  Box,
  Boxes,
  ClipboardList,
  PlaySquare,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  QrCode,
  ArrowRight,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const PIE_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard/');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-slate-400 text-xs gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        Loading warehouse metrics and analytics...
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const lowStock = data?.low_stock_products || [];
  const activities = data?.recent_activities || [];
  const categoryData = (data?.category_distribution || []).map((c) => ({
    name: c.category,
    value: c.total_stock || 0,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600" />
            Warehouse Operations Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry across storage zones, bin status, SKU inventory, and active picking operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/barcode-locator')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <QrCode className="w-4 h-4" />
            Scan Barcode
          </button>
          <button
            onClick={fetchDashboardData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Zones</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis.total_zones}</div>
          <span className="text-[10px] text-blue-600 font-semibold">{kpis.total_aisles} Aisles</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Racks & Bins</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis.total_bins}</div>
          <span className="text-[10px] text-slate-500 font-semibold">{kpis.total_racks} Racks</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total SKUs</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis.total_skus}</div>
          <span className="text-[10px] text-slate-500 font-semibold">50 active catalogs</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Physical Stock</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{kpis.total_inventory_quantity?.toLocaleString()}</div>
          <span className="text-[10px] text-slate-500 font-semibold">{kpis.total_available_quantity?.toLocaleString()} available</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pending Picks</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{kpis.pending_pick_lists}</div>
          <span className="text-[10px] text-slate-500 font-semibold">{kpis.active_sessions} active sessions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Low Stock Alert</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{kpis.low_stock_count}</div>
          <span className="text-[10px] text-amber-700 font-semibold">Below reorder point</span>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              Inventory Distribution by Product Category
            </h3>
            <span className="text-xs text-slate-400">Total units</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" stroke="#64748B" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bin Status Donut Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Warehouse Bins Status (1,200)
            </h3>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(data?.bin_status_breakdown || []).map((b) => ({ name: b.status, value: b.count }))}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"

                >
                  {(data?.bin_status_breakdown || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            {(data?.bin_status_breakdown || []).map((b, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                <span className="text-slate-600 truncate">{b.status}: <strong className="text-slate-900">{b.count}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Real-Time Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Critical Low-Stock Alerts
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
              {lowStock.length} Items Flagged
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {lowStock.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                All inventory quantities are above safe reorder thresholds.
              </div>
            ) : (
              lowStock.map((prod) => (
                <div key={prod.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{prod.name}</div>
                    <div className="font-mono text-blue-600 text-[11px]">{prod.sku} • {prod.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-800 font-bold font-mono">
                      {prod.available_quantity} / {prod.reorder_level} {prod.unit}
                    </div>
                    <span className="text-[10px] text-amber-600 font-semibold">Reorder Required</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Activity Audit Feed */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Recent Warehouse Activity & Movements
            </h3>
            <span className="text-xs text-slate-400">Live Audit</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">No recent movement events.</div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${act.movement_type === 'PICK' ? 'bg-blue-100 text-blue-800' :
                        act.movement_type === 'STOCK_IN' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                        {act.movement_type}
                      </span>
                      <span className="font-mono font-bold text-slate-800">{act.quantity} pcs</span>
                      <span className="text-slate-600 truncate">{act.product_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      By {act.user_name || 'System'} • {act.notes || 'Automated reconcile'}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
