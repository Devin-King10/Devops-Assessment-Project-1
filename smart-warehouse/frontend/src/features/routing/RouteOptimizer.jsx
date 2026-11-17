import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Navigation,
  GitCommit,
  CheckCircle2,
  Clock,
  Compass,
  Zap,
  ArrowRight,
  TrendingDown,
  Layers,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  BarChart2
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function RouteOptimizer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [startNode, setStartNode] = useState('HUB-DISPATCH');
  const [endNode, setEndNode] = useState('HUB-DISPATCH');
  const [pickStops, setPickStops] = useState(['A-A01-R01-L1P1', 'A-A02-R02-L2P2', 'B-B01-R01-L1P3']);
  const [newStopInput, setNewStopInput] = useState('');
  const [algorithm, setAlgorithm] = useState('astar'); // 'astar' or 'dijkstra'
  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState(null);

  // Comparison state
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  // Pick lists for quick loading
  const [pickLists, setPickLists] = useState([]);

  useEffect(() => {
    // Load pick lists so user can optimize route for an existing pick list in 1 click
    api.get('/pick-lists/').then((res) => {
      setPickLists(res.data.results || []);
    }).catch(() => {});

    // Check query param
    const dest = searchParams.get('dest');
    if (dest) {
      setPickStops([dest]);
      handleCalculateRoute([dest]);
    }
  }, [searchParams]);

  const handleAddStop = () => {
    const val = newStopInput.trim();
    if (!val) return;
    if (!pickStops.includes(val)) {
      setPickStops([...pickStops, val]);
      setNewStopInput('');
    } else {
      toast.warning('Stop is already in the route list.');
    }
  };

  const handleRemoveStop = (idx) => {
    setPickStops(pickStops.filter((_, i) => i !== idx));
  };

  const handleLoadPickList = (plId) => {
    const pl = pickLists.find((p) => p.id === plId);
    if (!pl) return;
    const bins = pl.items?.map((it) => it.bin_code) || [];
    if (bins.length > 0) {
      setPickStops(bins);
      toast.info(`Loaded ${bins.length} stops from Pick List ${pl.pick_list_number}`);
    }
  };

  const handleCalculateRoute = async (stopsToUse = null) => {
    const stops = stopsToUse || pickStops;
    if (stops.length === 0) {
      toast.warning('Please add at least one pick destination.');
      return;
    }

    setLoading(true);
    setRouteResult(null);
    try {
      const res = await api.post('/routes/optimize/', {
        start_node_id: startNode,
        end_node_id: endNode,
        pick_locations: stops,
        algorithm: algorithm,
      });
      setRouteResult(res.data);
      toast.success(`Optimized route generated: ${res.data.total_distance} meters`);
    } catch (err) {
      toast.error('Failed to calculate optimized route.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunComparison = async () => {
    if (pickStops.length === 0) return;
    setComparing(true);
    try {
      const res = await api.post('/routes/compare/', {
        start_node_id: startNode,
        goal_node_id: pickStops[0],
      });
      setComparisonResult(res.data);
      toast.success('Benchmark comparison completed!');
    } catch (err) {
      toast.error('Comparison benchmark failed.');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Navigation className="w-6 h-6 text-blue-600" />
              Intelligent Picking Path Optimization (Dijkstra / A* / 2-Opt)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Multi-stop Traveling Salesperson pathfinding minimizing warehouse travel distance and walking fatigue.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunComparison}
              disabled={comparing || pickStops.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <BarChart2 className="w-4 h-4 text-slate-600" />
              {comparing ? 'Benchmarking...' : 'Compare A* vs Dijkstra'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Route Configuration & Destinations */}
        <div className="space-y-4">
          {/* Quick Load Pick List */}
          {pickLists.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Import from Active Pick List
              </label>
              <select
                onChange={(e) => handleLoadPickList(e.target.value)}
                defaultValue=""
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              >
                <option value="" disabled>Select a Pick List...</option>
                {pickLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.pick_list_number} ({pl.items?.length || 0} items) - {pl.priority}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start and End Point */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Origin & Destination
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Starting Point</label>
                <input
                  type="text"
                  value={startNode}
                  onChange={(e) => setStartNode(e.target.value)}
                  placeholder="HUB-DISPATCH or Bin Code"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Ending Station</label>
                <input
                  type="text"
                  value={endNode}
                  onChange={(e) => setEndNode(e.target.value)}
                  placeholder="HUB-DISPATCH or Bin Code"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Pathfinding Algorithm</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAlgorithm('astar')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${
                      algorithm === 'astar'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    A* (Heuristic)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlgorithm('dijkstra')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${
                      algorithm === 'dijkstra'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Dijkstra (Exact)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Destination Stops Manager */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pick Stops ({pickStops.length})
              </h3>
              <button
                onClick={() => setPickStops([])}
                className="text-[11px] text-rose-600 hover:underline"
              >
                Clear all
              </button>
            </div>

            {/* Add new stop */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newStopInput}
                onChange={(e) => setNewStopInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
                placeholder="Enter Bin Code (e.g. A-A01-R02-L3P1)"
                className="flex-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800"
              />
              <button
                onClick={handleAddStop}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List of stops */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {pickStops.map((stop, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono"
                >
                  <span className="flex items-center gap-2 text-slate-800 font-bold">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    {stop}
                  </span>
                  <button
                    onClick={() => handleRemoveStop(idx)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleCalculateRoute()}
              disabled={loading || pickStops.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Generate Shortest Route
            </button>
          </div>
        </div>

        {/* Right Column: Route Optimization Results & Step-by-Step Directions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Algorithm Comparison Card (if triggered) */}
          {comparisonResult && (
            <div className="bg-blue-900 text-white p-5 rounded-xl shadow-md border border-blue-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-blue-800/80">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4" />
                  Algorithm Performance Benchmark
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">
                  {comparisonResult.comparison.visited_reduction_percent}% fewer states evaluated by A*
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-blue-950/60 p-3 rounded-lg border border-blue-800">
                  <div className="font-bold text-slate-300">Dijkstra's Algorithm</div>
                  <div className="text-lg font-mono font-bold mt-1 text-white">
                    {comparisonResult.dijkstra.distance} m
                  </div>
                  <div className="text-[11px] text-blue-300">
                    Visited {comparisonResult.dijkstra.visited_count} nodes in {comparisonResult.dijkstra.execution_time_ms} ms
                  </div>
                </div>

                <div className="bg-blue-950/60 p-3 rounded-lg border border-blue-800">
                  <div className="font-bold text-emerald-400">A* Pathfinding</div>
                  <div className="text-lg font-mono font-bold mt-1 text-white">
                    {comparisonResult.astar.distance} m
                  </div>
                  <div className="text-[11px] text-emerald-300">
                    Visited {comparisonResult.astar.visited_count} nodes in {comparisonResult.astar.execution_time_ms} ms
                  </div>
                </div>
              </div>
            </div>
          )}

          {routeResult ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
              {/* Route Summary KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-[10px] uppercase font-bold text-blue-600 block">Total Distance</span>
                  <span className="text-xl font-black text-slate-900">{routeResult.total_distance} m</span>
                </div>
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Est. Duration</span>
                  <span className="text-xl font-black text-slate-900">{routeResult.estimated_time_minutes} min</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Pick Stops</span>
                  <span className="text-xl font-black text-slate-900">{routeResult.number_of_stops}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Algorithm</span>
                  <span className="text-xs font-mono font-bold text-blue-600 mt-1 block">{routeResult.algorithm_used}</span>
                </div>
              </div>

              {/* Ordered Picking Sequence Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  Optimized Pick Stop Sequence (Nearest-Neighbor + 2-Opt)
                </h3>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                      <tr>
                        <th className="px-4 py-2.5">Stop #</th>
                        <th className="px-4 py-2.5">Location / Bin</th>
                        <th className="px-4 py-2.5">Type</th>
                        <th className="px-4 py-2.5 text-right">Cumulative Walk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {routeResult.stops_detail?.map((stop, sidx) => (
                        <tr key={sidx} className={`hover:bg-slate-50 ${stop.is_start || stop.is_end ? 'bg-slate-50/50' : ''}`}>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                              stop.is_start ? 'bg-blue-600 text-white' : stop.is_end ? 'bg-slate-800 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {stop.sequence}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                            {stop.code}
                            {stop.is_start && <span className="ml-2 text-[10px] text-blue-600 font-sans font-normal">(Start)</span>}
                            {stop.is_end && <span className="ml-2 text-[10px] text-slate-500 font-sans font-normal">(Return)</span>}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{stop.type}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{stop.cumulative_distance} m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step-by-Step Waypoint Guidance */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Continuous Waypoint Navigation Path ({routeResult.full_path?.length} waypoints)
                </h3>
                <div className="p-3 bg-slate-900 rounded-xl text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-nowrap">
                  {routeResult.full_path?.map((step, idx) => (
                    <span key={idx} className="inline-flex items-center">
                      <span className={step.startsWith('BIN-') ? 'text-amber-400 font-bold' : (step.startsWith('HUB') ? 'text-blue-400 font-bold' : 'text-slate-400')}>
                        {step}
                      </span>
                      {idx < routeResult.full_path.length - 1 && (
                        <ArrowRight className="w-3 h-3 mx-1 text-slate-600 inline" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <Navigation className="w-10 h-10 mx-auto text-slate-300" />
              <div className="font-semibold text-slate-700">No Route Generated Yet</div>
              <p className="text-xs max-w-sm mx-auto">
                Select or add your destination bins on the left, then click <strong>"Generate Shortest Route"</strong> to compute the optimized multi-stop path.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
