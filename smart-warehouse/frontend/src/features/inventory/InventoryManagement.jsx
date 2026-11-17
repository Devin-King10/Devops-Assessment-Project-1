import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  MapPin,
  RefreshCw,
  QrCode,
  Edit2,
  Trash2,
  History,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function InventoryManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Stock Adjustment Modal
  const [adjustModalData, setAdjustModalData] = useState(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState('');

  // Movement History Modal
  const [historyModalData, setHistoryModalData] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'Electronics',
    barcode: '',
    unit: 'pcs',
    weight: 0.5,
    reorder_level: 15,
  });

  const toast = useToast();
  const { isManager } = useAuth();
  const navigate = useNavigate();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      const res = await api.get('/products/', { params });
      let list = res.data.results || [];
      if (lowStockOnly) {
        list = list.filter((p) => p.is_low_stock);
      }
      setProducts(list);
    } catch (err) {
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories/');
      setCategories(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [selectedCategory, lowStockOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleOpenAdjust = (product) => {
    setAdjustModalData(product);
    setAdjustQty(product.total_quantity);
    setAdjustNotes('Physical cycle count adjustment');
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustModalData) return;

    try {
      // Pick first bin location or adjust
      const loc = adjustModalData.inventory_locations?.[0];
      if (!loc) {
        toast.warning('Product has no assigned bin location.');
        return;
      }

      await api.post('/inventory/adjust-stock/', {
        inventory_id: loc.id,
        new_quantity: parseInt(adjustQty, 10),
        notes: adjustNotes,
      });

      toast.success('Stock adjusted successfully!');
      setAdjustModalData(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to adjust stock.');
    }
  };

  const handleOpenHistory = async (product) => {
    setHistoryModalData(product);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/movements/?search=${product.sku}`);
      setMovements(res.data.results || []);
    } catch (err) {
      toast.error('Failed to load movement audit trail.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products/', newProduct);
      toast.success('Product created successfully!');
      setShowAddModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create product.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-600" />
            SKU Inventory & Multi-Bin Stock
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock quantities, safety reserves, multi-bin allocations, and complete audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add Product SKU
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by SKU, product name, or barcode..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="flex items-center gap-1 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock Alert Only
            </span>
          </label>

          <button
            onClick={fetchProducts}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            Loading SKU inventory...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-xs">
            No products match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">SKU / Barcode</th>
                  <th className="px-5 py-3.5">Product Name</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Storage Locations</th>
                  <th className="px-5 py-3.5 text-right">Physical Stock</th>
                  <th className="px-5 py-3.5 text-right">Available</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-blue-600">{prod.sku}</div>
                      <div className="text-[10px] font-mono text-slate-400">{prod.barcode}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{prod.name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{prod.description}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {prod.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {prod.inventory_locations?.map((loc) => (
                          <button
                            key={loc.id}
                            onClick={() => navigate(`/barcode-locator?q=${loc.bin_details?.barcode || ''}`)}
                            className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-mono font-semibold transition-colors"
                          >
                            {loc.bin_details?.bin_code} ({loc.quantity})
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">
                      {prod.total_quantity} {prod.unit}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600">
                      {prod.total_available} {prod.unit}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {prod.is_low_stock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          OPTIMAL
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAdjust(prod)}
                          title="Adjust Stock"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenHistory(prod)}
                          title="Movement History"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {adjustModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-blue-600" />
              Adjust Stock Quantity
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900">{adjustModalData.name}</div>
              <div className="text-blue-600 font-mono text-[11px]">{adjustModalData.sku}</div>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">New Physical Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900 font-mono text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Adjustment Reason / Notes</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Cycle count, restock, damage..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  Commit Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustModalData(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movement Audit History Modal */}
      {historyModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  Inventory Audit Trail: {historyModalData.sku}
                </h3>
                <span className="text-xs text-slate-500">{historyModalData.name}</span>
              </div>
              <button
                onClick={() => setHistoryModalData(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {loadingHistory ? (
                <div className="text-center py-10 text-slate-400">Loading audit log...</div>
              ) : movements.length === 0 ? (
                <div className="text-center py-10 text-slate-400">No movement records recorded yet.</div>
              ) : (
                movements.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.movement_type === 'STOCK_IN' ? 'bg-emerald-100 text-emerald-800' :
                          m.movement_type === 'PICK' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {m.movement_type}
                        </span>
                        <span className="font-mono text-slate-800 font-bold">{m.quantity} pcs</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {m.notes || `Reference: ${m.reference_id || 'N/A'}`}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <div>{new Date(m.timestamp).toLocaleDateString()}</div>
                      <div>{new Date(m.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add New Product SKU
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                    placeholder="e.g. SKU-ELEC-099"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Barcode</label>
                  <input
                    type="text"
                    required
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    placeholder="e.g. 890123400099"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g. Industrial Sensor Kit"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="1"
                    value={newProduct.reorder_level}
                    onChange={(e) => setNewProduct({ ...newProduct, reorder_level: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-xs"
                >
                  Save Product
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
