import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Plus,
  PlaySquare,
  Search,
  Filter,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function PickLists() {
  const [pickLists, setPickLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Pick List Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPickListNumber, setNewPickListNumber] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [assignedPickerId, setAssignedPickerId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  // Products and Pickers dropdown data
  const [products, setProducts] = useState([]);
  const [pickers, setPickers] = useState([]);

  const toast = useToast();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();

  const fetchPickLists = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await api.get('/pick-lists/', { params });
      setPickLists(res.data.results || []);
    } catch (err) {
      toast.error('Failed to load pick lists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickLists();
  }, [statusFilter, priorityFilter]);

  // Load products and pickers for creation modal
  useEffect(() => {
    api.get('/products/').then((res) => setProducts(res.data.results || []));
    api.get('/auth/users/?role=PICKER').then((res) => setPickers(res.data.results || []));
  }, []);

  const handleAddItemToForm = (productId) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    if (selectedItems.some((it) => it.product_id === productId)) {
      toast.warning('Product already added to list.');
      return;
    }
    setSelectedItems([
      ...selectedItems,
      {
        product_id: productId,
        product_name: prod.name,
        sku: prod.sku,
        quantity_requested: 1,
      },
    ]);
  };

  const handleCreatePickList = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.warning('Please add at least one product.');
      return;
    }

    try {
      const payload = {
        pick_list_number: newPickListNumber || `PL-${Date.now().toString().slice(-6)}`,
        priority: newPriority,
        assigned_to_id: assignedPickerId || null,
        notes: notes,
        items: selectedItems.map((it) => ({
          product_id: it.product_id,
          quantity_requested: it.quantity_requested,
        })),
      };

      await api.post('/pick-lists/', payload);
      toast.success('Pick list created successfully with reserved inventory!');
      setShowCreateModal(false);
      setSelectedItems([]);
      fetchPickLists();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create pick list.');
    }
  };

  const handleStartSession = async (pickListId) => {
    try {
      const res = await api.post('/pick-sessions/start/', { pick_list_id: pickListId });
      toast.success('Picking session started!');
      navigate(`/picking-sessions/${res.data.id}`);
    } catch (err) {
      toast.error('Failed to start picking session.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Pick List Management & Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, assign, schedule, and track picking tasks with concurrent row-level reservation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Create Pick List
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <button
          onClick={fetchPickLists}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Pick Lists Grid / Cards */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Loading pick lists...
        </div>
      ) : pickLists.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-xl border border-slate-200 text-xs">
          No pick lists found matching the filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pickLists.map((pl) => (
            <div
              key={pl.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {pl.pick_list_number}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    pl.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                    pl.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {pl.priority}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  Assigned to: <strong className="text-slate-800">{pl.assigned_to_name || 'Unassigned'}</strong>
                </div>

                {/* Items & Progress */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600 font-semibold">
                    <span>Progress: {pl.picked_items} / {pl.total_items} items</span>
                    <span>{pl.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${pl.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Items preview snippet */}
                <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Items to Pick</div>
                  <div className="text-xs font-mono text-slate-700 space-y-0.5">
                    {pl.items?.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="flex justify-between truncate">
                        <span className="truncate">{it.product_name}</span>
                        <span className="font-bold shrink-0">{it.quantity_requested} {it.product_unit}</span>
                      </div>
                    ))}
                    {(pl.items?.length || 0) > 3 && (
                      <div className="text-[10px] text-slate-400 pt-0.5">
                        +{pl.items.length - 3} more items...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                {pl.status === 'COMPLETED' ? (
                  <div className="w-full text-center py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg">
                    Completed
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartSession(pl.id)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <PlaySquare className="w-3.5 h-3.5" />
                    {pl.status === 'IN_PROGRESS' ? 'Resume Session' : 'Start Picking'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Pick List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Create New Warehouse Pick List
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePickList} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pick List Number (Optional)</label>
                <input
                  type="text"
                  value={newPickListNumber}
                  onChange={(e) => setNewPickListNumber(e.target.value)}
                  placeholder="Auto-generated if blank (e.g. PL-2026-901)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assign Picker</label>
                  <select
                    value={assignedPickerId}
                    onChange={(e) => setAssignedPickerId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                  >
                    <option value="">Unassigned</option>
                    {pickers.map((p) => (
                      <option key={p.id} value={p.id}>{p.username} ({p.first_name || 'Picker'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Add items to pick list */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Add Product to Pick</label>
                <select
                  onChange={(e) => {
                    handleAddItemToForm(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="" disabled>Select product to add...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} ({p.total_available} available)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Items Table */}
              {selectedItems.length > 0 && (
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Selected Pick Items</div>
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                      <div>
                        <div className="font-bold text-slate-900">{item.product_name}</div>
                        <div className="font-mono text-[10px] text-blue-600">{item.sku}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity_requested}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 1;
                            setSelectedItems(selectedItems.map((it, i) => i === idx ? { ...it, quantity_requested: val } : it));
                          }}
                          className="w-14 p-1 text-center font-bold bg-slate-50 border border-slate-200 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  Confirm & Reserve Stock
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
