import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  QrCode,
  Search,
  Camera,
  Printer,
  Compass,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  MapPin,
  RefreshCw,
  Box,
  Layers,
  Sparkles
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function BarcodeLocator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [barcodeInput, setBarcodeInput] = useState(searchParams.get('q') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [printModalData, setPrintModalData] = useState(null);

  const inputRef = useRef(null);

  const performLookup = async (codeToLookup) => {
    const query = (codeToLookup || barcodeInput).trim();
    if (!query) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await api.get(`/barcodes/${encodeURIComponent(query)}/`);
      setResult(res.data);
      toast.success(`Located ${res.data.type}: ${res.data.bin_code || res.data.sku}`);
    } catch (err) {
      toast.error(err.response?.data?.error || `No location or product found matching "${query}".`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setBarcodeInput(q);
      performLookup(q);
    } else {
      inputRef.current?.focus();
    }
  }, [searchParams]);

  // Handle Camera Scanner with html5-qrcode
  useEffect(() => {
    let scanner = null;
    if (isCameraActive) {
      scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          setBarcodeInput(decodedText);
          setIsCameraActive(false);
          scanner.clear();
          performLookup(decodedText);
        },
        (error) => {
          // ignore scan frame errors
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [isCameraActive]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-6 h-6 text-blue-600" />
              Smart Barcode & Bin Locator
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Scan or enter any Product Barcode, SKU, or Bin Barcode to instantly reveal its 3D warehouse position.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCameraActive(!isCameraActive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                isCameraActive
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Camera className="w-4 h-4" />
              {isCameraActive ? 'Close Camera' : 'Camera Scanner'}
            </button>
          </div>
        </div>

        {/* Search Bar (USB Scanner & Manual Input) */}
        <div className="mt-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              performLookup();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan with USB Barcode Scanner or type Barcode / SKU (e.g. 890123400001, BIN-A1111)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
              Locate
            </button>
          </form>

          {/* Quick Demo Barcode Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500">
            <span className="font-semibold text-[11px] text-slate-400">Quick Test Samples:</span>
            <button
              onClick={() => {
                setBarcodeInput('BIN-A1111');
                performLookup('BIN-A1111');
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
            >
              BIN-A1111 (Bin)
            </button>
            <button
              onClick={() => {
                setBarcodeInput('890123400001');
                performLookup('890123400001');
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
            >
              890123400001 (Laptop SKU)
            </button>
            <button
              onClick={() => {
                setBarcodeInput('890123400016');
                performLookup('890123400016');
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
            >
              890123400016 (Drill 20V)
            </button>
          </div>
        </div>
      </div>

      {/* Camera Live Scanner Container */}
      {isCameraActive && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-md mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              Live Camera Scanner
            </span>
            <span className="text-[11px] text-slate-400">Hold barcode in frame</span>
          </div>
          <div id="qr-reader-container" className="rounded-lg overflow-hidden border border-slate-200" />
        </div>
      )}

      {/* Result Display Card */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-slide-up">
          {/* Card Header with Location Breadcrumb */}
          <div className="bg-[#14213D] text-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-mono font-bold">
                  {result.type} LOCATED
                </span>
                <span className="text-xs text-slate-400">Status: Active Storage</span>
              </div>

              {/* Printable Barcode Label button */}
              <button
                onClick={() => setPrintModalData(result)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Label
              </button>
            </div>

            {/* Breadcrumb Hierarchy Display */}
            <div className="mt-4 p-3.5 bg-[#0B132B] rounded-lg border border-slate-700">
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                Warehouse Navigation Breadcrumb
              </div>
              <div className="text-base sm:text-lg font-mono font-bold text-amber-400 flex flex-wrap items-center gap-1.5">
                {result.type === 'BIN'
                  ? result.hierarchy?.breadcrumb
                  : result.primary_location?.breadcrumb || 'Multiple Storage Locations'}
              </div>
            </div>
          </div>

          {/* Result Body */}
          <div className="p-6">
            {result.type === 'BIN' ? (
              <div className="space-y-6">
                {/* Bin Parameters Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block">Bin Code</span>
                    <span className="text-base font-mono font-bold text-slate-900">{result.bin_code}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block">Barcode</span>
                    <span className="text-base font-mono font-bold text-slate-900">{result.barcode}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block">Shelf Level</span>
                    <span className="text-base font-bold text-slate-900">Level {result.level} (Pos {result.position})</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block">Current Capacity</span>
                    <span className="text-base font-bold text-slate-900">{result.current_quantity} / {result.capacity} pcs</span>
                  </div>
                </div>

                {/* Stored SKUs */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                    <Box className="w-4 h-4 text-blue-600" />
                    Stored Products in this Bin
                  </h3>

                  {result.contained_skus?.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                      This bin is currently empty.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="px-4 py-3">SKU</th>
                            <th className="px-4 py-3">Product Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3 text-right">Physical Qty</th>
                            <th className="px-4 py-3 text-right">Available</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {result.contained_skus.map((sku, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="px-4 py-3 font-mono font-bold text-blue-600">{sku.sku}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">{sku.name}</td>
                              <td className="px-4 py-3 text-slate-600">{sku.category}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{sku.quantity}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">{sku.available_quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Product Result */
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block">Product Name</span>
                    <span className="text-sm font-bold text-slate-900">{result.name}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block">SKU Code</span>
                    <span className="text-sm font-mono font-bold text-blue-600">{result.sku}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block">Total In Stock</span>
                    <span className="text-sm font-bold text-slate-900">{result.total_quantity} {result.unit}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 block">Available Qty</span>
                    <span className="text-sm font-bold text-emerald-600">{result.total_available} {result.unit}</span>
                  </div>
                </div>

                {/* Storage Locations Table */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Storage Locations for this SKU
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="px-4 py-3">Location Breadcrumb</th>
                          <th className="px-4 py-3">Bin Code</th>
                          <th className="px-4 py-3">Bin Barcode</th>
                          <th className="px-4 py-3 text-right">Quantity</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.storage_locations?.map((loc, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 font-bold text-slate-800">{loc.breadcrumb}</td>
                            <td className="px-4 py-3 font-mono text-blue-600">{loc.bin_code}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{loc.bin_barcode}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{loc.quantity}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => navigate(`/routes?dest=${loc.bin_code}`)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-[11px] transition-colors"
                              >
                                Route
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Barcode Label Modal */}
      {printModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                Printable Warehouse Label
              </span>
              <button
                onClick={() => setPrintModalData(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Realistic Barcode Label Card */}
            <div className="p-5 bg-white border-2 border-slate-900 rounded-xl space-y-3 font-mono text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                SMART WAREHOUSE LOCATOR
              </div>
              <div className="text-base font-black text-slate-900">
                {printModalData.bin_code || printModalData.sku}
              </div>
              <div className="text-xs text-slate-600">
                {printModalData.hierarchy?.breadcrumb || printModalData.name}
              </div>

              {/* Simulated 1D Barcode bars */}
              <div className="h-14 flex items-center justify-center gap-[2px] bg-slate-50 p-2 rounded border border-slate-200">
                {Array.from({ length: 42 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-black h-full"
                    style={{
                      width: (i % 3 === 0 ? '3px' : (i % 2 === 0 ? '1.5px' : '2px')),
                      opacity: i % 7 === 0 ? 0.3 : 1
                    }}
                  />
                ))}
              </div>

              <div className="text-xs font-bold text-slate-800 tracking-wider">
                *{printModalData.barcode || printModalData.bin_barcode}*
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Print to Zebra / Laser
              </button>
              <button
                onClick={() => setPrintModalData(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
