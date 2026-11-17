import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlaySquare,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  MapPin,
  Package,
  ArrowRight,
  RefreshCw,
  Clock,
  Navigation,
  Check,
  XCircle,
  Camera,
  Layers,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function PickingSessionView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Pick confirmation state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState(1);
  const [isLocationValidated, setIsLocationValidated] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState('EMPTY_BIN');
  const [issueNotes, setIssueNotes] = useState('');

  const fetchSession = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/pick-sessions/${sessionId}/`);
      setSession(res.data);

      // Find first unpicked item index
      const items = res.data.pick_list_details?.items || [];
      const firstUnpicked = items.findIndex((it) => it.status !== 'PICKED');
      if (firstUnpicked !== -1) {
        setActiveItemIndex(firstUnpicked);
        setQuantityInput(items[firstUnpicked].quantity_requested);
      }
    } catch (err) {
      toast.error('Failed to load picking session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const items = session?.pick_list_details?.items || [];
  const activeItem = items[activeItemIndex];
  const isCompleted = session?.status === 'COMPLETED' || (items.length > 0 && items.every((it) => it.status === 'PICKED'));

  // Step 1: Scan & Validate Barcode
  const handleScanBarcode = async (e) => {
    e?.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      const res = await api.post(`/pick-sessions/${sessionId}/scan/`, {
        item_id: activeItem.id,
        scanned_barcode: barcodeInput.trim(),
      });

      if (res.data.valid) {
        setIsLocationValidated(true);
        toast.success(`Location validated! Please confirm picked quantity.`);
      }
    } catch (err) {
      setIsLocationValidated(false);
      toast.error(err.response?.data?.message || 'Invalid barcode! Scanned location does not match expected bin.');
    }
  };

  // Step 2: Confirm Pick with Concurrency Control & Row-Level Locking
  const handleConfirmPick = async () => {
    if (!isLocationValidated) {
      toast.warning('Please scan and validate the bin barcode first.');
      return;
    }

    setConfirming(true);
    try {
      const res = await api.post(`/pick-sessions/${sessionId}/confirm-pick/`, {
        item_id: activeItem.id,
        quantity: parseInt(quantityInput, 10),
      });

      toast.success(res.data.message);
      setIsLocationValidated(false);
      setBarcodeInput('');

      // Refresh session
      await fetchSession();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Concurrent pick failed: stock unavailable.');
    } finally {
      setConfirming(false);
    }
  };

  // Report issue
  const handleReportIssue = async () => {
    try {
      await api.post(`/pick-sessions/${sessionId}/report-issue/`, {
        item_id: activeItem.id,
        issue_type: issueType,
        notes: issueNotes,
      });

      toast.warning(`Reported issue "${issueType}" for item.`);
      setShowIssueModal(false);
      setIssueNotes('');
      await fetchSession();
    } catch (err) {
      toast.error('Failed to report issue.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        Loading picking session...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Session Progress Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 font-mono">
                SESSION #{session.id.substring(0, 8)}
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Pick List: {session.pick_list_number}
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <div>
              Progress: <strong className="text-slate-900">{session.picked_items}</strong> / {session.total_items} items
            </div>
            <div className="w-28 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${session.total_items ? (session.picked_items / session.total_items) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Item Sequence Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto py-3">
          {items.map((it, idx) => (
            <button
              key={it.id}
              onClick={() => {
                setActiveItemIndex(idx);
                setIsLocationValidated(false);
                setBarcodeInput('');
                setQuantityInput(it.quantity_requested);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold shrink-0 transition-all ${
                idx === activeItemIndex
                  ? 'bg-blue-600 text-white shadow-xs'
                  : it.status === 'PICKED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : it.status === 'SKIPPED' || it.status === 'SHORTAGE'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {it.status === 'PICKED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>#{idx + 1}</span>}
              <span>{it.bin_code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted ? (
        <div className="bg-emerald-900 text-white p-8 rounded-2xl shadow-lg border border-emerald-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto text-2xl">
            🎉
          </div>
          <h2 className="text-2xl font-bold">Picking Order Completed!</h2>
          <p className="text-xs text-emerald-200 max-w-md mx-auto">
            All {session.total_items} items have been verified and picked. Inventory records and reservations have been reconciled.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/pick-lists')}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              Return to Pick Lists
            </button>
          </div>
        </div>
      ) : activeItem ? (
        /* Active Item Picker Guidance */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target Location & Item Specs */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
            {/* Target Location Breadcrumb Banner */}
            <div className="p-4 bg-[#14213D] text-white rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                Navigate to Storage Location
              </span>
              <div className="text-base sm:text-lg font-mono font-bold text-amber-400">
                {activeItem.location_breadcrumb}
              </div>
            </div>

            {/* Product Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Product SKU</span>
                <span className="text-sm font-mono font-bold text-blue-600">{activeItem.product_sku}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2">
                <span className="text-xs text-slate-500 block">Product Name</span>
                <span className="text-sm font-bold text-slate-900">{activeItem.product_name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Target Bin Barcode</span>
                <span className="text-sm font-mono font-bold text-slate-900">{activeItem.bin_barcode}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Required Quantity</span>
                <span className="text-base font-bold text-slate-900">{activeItem.quantity_requested} {activeItem.product_unit}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">Category</span>
                <span className="text-xs font-semibold text-slate-700">{activeItem.product_category}</span>
              </div>
            </div>

            {/* Quick Demo Scan Autofill Button */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Testing without a handheld scanner?</span>
              <button
                type="button"
                onClick={() => setBarcodeInput(activeItem.bin_barcode)}
                className="text-blue-600 hover:underline font-semibold font-mono"
              >
                Autofill "{activeItem.bin_barcode}"
              </button>
            </div>
          </div>

          {/* Action Confirmation Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                Scan & Confirm Pick
              </h3>

              {/* Step 1: Scan Barcode */}
              <form onSubmit={handleScanBarcode} className="space-y-3">
                <label className="text-xs font-semibold text-slate-600 block">
                  1. Scan Bin Barcode
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => {
                      setBarcodeInput(e.target.value);
                      setIsLocationValidated(false);
                    }}
                    placeholder="Scan target barcode..."
                    className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                  >
                    Verify
                  </button>
                </div>

                {/* Validation badge */}
                {isLocationValidated && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Location Validated! Confirm quantity below.</span>
                  </div>
                )}
              </form>

              {/* Step 2: Confirm Picked Quantity */}
              <div className="mt-5 space-y-3">
                <label className="text-xs font-semibold text-slate-600 block">
                  2. Picked Quantity ({activeItem.product_unit})
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantityInput(Math.max(1, quantityInput - 1))}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={activeItem.quantity_requested}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(parseInt(e.target.value || 1, 10))}
                    className="w-20 text-center font-bold text-base p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantityInput(Math.min(activeItem.quantity_requested, quantityInput + 1))}
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Confirmation & Issue Buttons */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <button
                onClick={handleConfirmPick}
                disabled={confirming || !isLocationValidated}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                {confirming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm Pick & Update Inventory
              </button>

              <button
                onClick={() => setShowIssueModal(true)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Report Discrepancy / Damaged
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Discrepancy Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Report Location or Stock Discrepancy
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
                >
                  <option value="EMPTY_BIN">Empty Bin (Physical zero stock)</option>
                  <option value="SHORTAGE">Stock Shortage (Fewer units than requested)</option>
                  <option value="DAMAGED">Damaged / Defective Goods</option>
                  <option value="BLOCKED">Blocked Aisle / Bin Inaccessible</option>
                  <option value="WRONG_BARCODE">Mislabeled / Incorrect Barcode</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="Explain what was observed..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleReportIssue}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Submit Discrepancy & Skip
              </button>
              <button
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
