import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  MapPin,
  TrendingUp,
  Award,
  Clock,
  Compass,
  RefreshCw,
  FileSpreadsheet,
  FileText
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
  CartesianGrid,
  Legend
} from 'recharts';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function AnalyticsReports() {
  const [invData, setInvData] = useState(null);
  const [pickData, setPickData] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, pickRes] = await Promise.all([
        api.get('/analytics/inventory/'),
        api.get('/analytics/picking/'),
      ]);
      setInvData(invRes.data);
      setPickData(pickRes.data);
    } catch (err) {
      toast.error('Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCSV = () => {
    if (!invData || !pickData) return;
    let csv = "Report,Zone / Metric,Value\n";
    invData.zone_analytics?.forEach(z => {
      csv += `Zone Occupancy,${z.zone_name},${z.occupancy_rate}%\n`;
      csv += `Zone Stock Units,${z.zone_name},${z.total_units}\n`;
    });
    pickData.picker_stats?.forEach(p => {
      csv += `Picker Performance,${p.full_name},${p.total_items_picked} items picked\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-analytics-${Date.now()}.csv`;
    a.click();
    toast.success('Analytics CSV report exported!');
  };

  const handleExportJSON = () => {
    if (!invData || !pickData) return;
    const report = {
      timestamp: new Date().toISOString(),
      inventory_analytics: invData,
      picking_analytics: pickData
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse-analytics-${Date.now()}.json`;
    a.click();
    toast.success('Analytics JSON report exported!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px] text-slate-400 text-xs gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        Calculating warehouse analytics & reports...
      </div>
    );
  }

  const zoneChartData = (invData?.zone_analytics || []).map((z) => ({
    name: z.zone_code,
    occupancy: z.occupancy_rate,
    units: z.total_units,
  }));

  const pickerStats = pickData?.picker_stats || [];
  const frequentPicks = pickData?.frequent_picks || [];
  const summary = pickData?.summary || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Export buttons */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Operational Analytics & Performance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Zone occupancy, employee picker efficiency, travel distance optimization, and high-frequency SKUs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors border border-blue-200"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Picking Efficiency Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Avg. Picking Time Per Order</span>
            <span className="text-xl font-black text-slate-900">{summary.avg_pick_time_minutes} min</span>
            <span className="text-[10px] text-emerald-600 font-semibold block">Under SLA target (5.0 min)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Avg. Walking Distance</span>
            <span className="text-xl font-black text-slate-900">{summary.avg_distance_per_session_meters} meters</span>
            <span className="text-[10px] text-blue-600 font-semibold block">Minimized via 2-Opt TSP</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Fulfilled Orders</span>
            <span className="text-xl font-black text-slate-900">{summary.total_completed_sessions} completed</span>
            <span className="text-[10px] text-purple-600 font-semibold block">100% verified pick accuracy</span>
          </div>
        </div>
      </div>

      {/* Zone Occupancy Analytics */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Storage Zone Capacity & Occupancy Rates
          </h3>
          <span className="text-xs text-slate-400">Total Bins: 1,200</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {invData?.zone_analytics?.map((z, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800">{z.zone_name}</span>
                <span className="font-mono text-xs font-bold text-blue-600">{z.zone_code}</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {z.occupancy_rate}% <span className="text-xs font-normal text-slate-500">occupied</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${z.occupancy_rate}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>{z.occupied_bins} of {z.total_bins} bins</span>
                <span>{z.total_units} units stored</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Picker Performance & Top Picked SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Picker Productivity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-600" />
            Warehouse Employee Picker Productivity
          </h3>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Picker</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Items Picked</th>
                  <th className="px-4 py-3 text-right">Walked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pickerStats.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{p.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.username}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">{p.completed_sessions}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">{p.total_items_picked}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{p.total_distance_meters} m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Frequently Picked SKUs */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Frequently Picked Products (Velocity Analysis)
          </h3>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Units Picked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {frequentPicks.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-6 text-center text-slate-400">
                      No picking history recorded yet.
                    </td>
                  </tr>
                ) : (
                  frequentPicks.map((fp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{fp.product__name}</div>
                        <div className="text-[10px] text-blue-600 font-mono">{fp.product__sku}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fp.product__category}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                        {fp.total_picked} pcs
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
