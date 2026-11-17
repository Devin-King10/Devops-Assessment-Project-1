import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Box,
  Warehouse,
  Edit2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export default function WarehouseLayout() {
  const [activeTab, setActiveTab] = useState('zones'); // 'zones', 'aisles', 'racks', 'bins'
  const [zones, setZones] = useState([]);
  const [aisles, setAisles] = useState([]);
  const [racks, setRacks] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Zone Create/Edit Modal
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [newZone, setNewZone] = useState({
    zone_code: '',
    name: '',
    description: '',
    color_hex: '#2563EB',
    status: 'ACTIVE',
  });

  const toast = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'zones') {
        const res = await api.get('/zones/');
        setZones(res.data.results || []);
      } else if (activeTab === 'aisles') {
        const res = await api.get('/aisles/');
        setAisles(res.data.results || []);
      } else if (activeTab === 'racks') {
        const res = await api.get('/racks/');
        setRacks(res.data.results || []);
      } else if (activeTab === 'bins') {
        const res = await api.get('/bins/');
        setBins(res.data.results || []);
      }
    } catch (err) {
      toast.error(`Failed to load ${activeTab} data.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleCreateZone = async (e) => {
    e.preventDefault();
    try {
      await api.post('/zones/', newZone);
      toast.success('Warehouse Zone created successfully!');
      setShowZoneModal(false);
      loadData();
    } catch (err) {
      toast.error('Failed to create zone.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-blue-600" />
            Warehouse Hierarchy & Spatial Layout Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure Zones → Aisles → Racks → Levels → Bins with physical coordinates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/3d-warehouse')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors border border-blue-200"
          >
            <Box className="w-4 h-4" />
            View in 3D
          </button>
          {activeTab === 'zones' && (
            <button
              onClick={() => setShowZoneModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add Zone
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        {[
          { key: 'zones', label: 'Warehouse Zones' },
          { key: 'aisles', label: 'Aisles' },
          { key: 'racks', label: 'Racks' },
          { key: 'bins', label: 'Storage Bins' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content for Zones */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {zones.map((z) => (
            <div key={z.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: z.color_hex }} />
                  <span className="font-bold text-sm text-slate-900">{z.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 font-mono text-slate-700">
                  {z.zone_code}
                </span>
              </div>
              <p className="text-xs text-slate-500">{z.description || 'General warehouse storage zone.'}</p>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Aisles</span>
                  <span className="font-bold text-slate-900">{z.aisles_count || z.aisles?.length || 5}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                  <span className="font-bold text-emerald-600">{z.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content for Aisles */}
      {activeTab === 'aisles' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-5 py-3">Aisle Code</th>
                  <th className="px-5 py-3">Zone</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3 text-right">Position X / Y</th>
                  <th className="px-5 py-3 text-right">Length / Width</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aisles.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{a.aisle_code}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{a.zone_code}</td>
                    <td className="px-5 py-3 text-slate-600">{a.aisle_name}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600">({a.position_x}, {a.position_y})</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600">{a.length}m × {a.width}m</td>
                    <td className="px-5 py-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content for Racks */}
      {activeTab === 'racks' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-5 py-3">Rack Code</th>
                  <th className="px-5 py-3">Aisle</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3 text-right">Levels</th>
                  <th className="px-5 py-3 text-right">Bins / Level</th>
                  <th className="px-5 py-3 text-right">Coordinates</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {racks.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{r.rack_code}</td>
                    <td className="px-5 py-3 text-slate-800 font-mono">{r.aisle_code}</td>
                    <td className="px-5 py-3 text-slate-600">{r.rack_type}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">{r.number_of_levels}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">{r.bins_per_level}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-500">({r.position_x}, {r.position_y})</td>
                    <td className="px-5 py-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content for Bins */}
      {activeTab === 'bins' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-5 py-3">Bin Code</th>
                  <th className="px-5 py-3">Barcode</th>
                  <th className="px-5 py-3">Hierarchy Breadcrumb</th>
                  <th className="px-5 py-3 text-right">Level / Pos</th>
                  <th className="px-5 py-3 text-right">Capacity</th>
                  <th className="px-5 py-3 text-right">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bins.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-bold text-blue-600">{b.bin_code}</td>
                    <td className="px-5 py-3 font-mono text-slate-500">{b.barcode}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{b.full_location_path}</td>
                    <td className="px-5 py-3 text-right font-mono">L{b.level} - P{b.position}</td>
                    <td className="px-5 py-3 text-right font-bold">{b.current_quantity} / {b.capacity}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'OCCUPIED' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'LOW_STOCK' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => navigate(`/barcode-locator?q=${b.barcode}`)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                      >
                        Locate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add Warehouse Zone
            </h3>

            <form onSubmit={handleCreateZone} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Zone Code</label>
                <input
                  type="text"
                  required
                  value={newZone.zone_code}
                  onChange={(e) => setNewZone({ ...newZone, zone_code: e.target.value.toUpperCase() })}
                  placeholder="e.g. ZONE-D"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Zone Name</label>
                <input
                  type="text"
                  required
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  placeholder="e.g. Zone D - Hazardous & Flammable"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={newZone.description}
                  onChange={(e) => setNewZone({ ...newZone, description: e.target.value })}
                  placeholder="Zone details..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  Save Zone
                </button>
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
