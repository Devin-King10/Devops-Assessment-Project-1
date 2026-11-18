import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, OrbitControls, Text, Html, Center } from '@react-three/drei';
import * as THREE from 'three';
import {
  Search,
  Maximize2,
  Minimize2,
  Eye,
  Layers,
  MapPin,
  Package,
  Info,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Navigation,
  Compass
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

// Color map for Bin status
const STATUS_COLORS = {
  AVAILABLE: '#16A34A', // Green
  OCCUPIED: '#2563EB',  // Blue
  LOW_STOCK: '#F59E0B', // Yellow / Amber
  FULL: '#DC2626',      // Red
  BLOCKED: '#DC2626',   // Red
  INACTIVE: '#64748B',  // Gray
};

// 3D Individual Bin Object
function BinMesh({ bin, position, isSelected, isHighlighted, onClick }) {
  const meshRef = useRef();
  const color = isSelected
    ? '#FBBF24' // Glowing amber when selected
    : isHighlighted
      ? '#EC4899' // Bright pink when searched/highlighted
      : (STATUS_COLORS[bin.status] || '#2563EB');

  useFrame((state) => {
    if ((isSelected || isHighlighted) && meshRef.current) {
      // Subtle breathing pulse for active/selected bin
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      meshRef.current.scale.set(scale, scale, scale);
    } else if (meshRef.current) {
      meshRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick(bin);
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.5, 0.4, 0.5]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.2}
        emissive={isSelected || isHighlighted ? color : '#000000'}
        emissiveIntensity={isSelected || isHighlighted ? 0.4 : 0.0}
      />
    </mesh>
  );
}

// 3D Rack Structure with vertical metal posts, horizontal shelves, and bins
function Rack3D({ rack, aisleX, aisleY, selectedBinId, highlightedBinId, onSelectBin }) {
  const levels = rack.number_of_levels || 5;
  const binsPerLevel = rack.bins_per_level || 4;
  const rackHeight = levels * 0.8;
  const rackWidth = binsPerLevel * 0.65;
  const rackDepth = 0.8;

  const rx = parseFloat(rack.position_x) || aisleX;
  const ry = parseFloat(rack.position_y) || aisleY;

  return (
    <group position={[rx, 0, ry]}>
      {/* Rack Metal Uprights (4 corner posts) */}
      {[
        [-rackWidth / 2, -rackDepth / 2],
        [rackWidth / 2, -rackDepth / 2],
        [-rackWidth / 2, rackDepth / 2],
        [rackWidth / 2, rackDepth / 2],
      ].map(([px, pz], idx) => (
        <mesh key={idx} position={[px, rackHeight / 2, pz]}>
          <boxGeometry args={[0.08, rackHeight, 0.08]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Horizontal Shelves & Bins for each level */}
      {Array.from({ length: levels }).map((_, lvlIdx) => {
        const lvlNumber = lvlIdx + 1;
        const shelfY = lvlIdx * 0.8 + 0.1;

        return (
          <group key={lvlIdx}>
            {/* Shelf metal beam */}
            <mesh position={[0, shelfY, 0]}>
              <boxGeometry args={[rackWidth + 0.1, 0.04, rackDepth]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Bins on this shelf level */}
            {rack.bins
              ?.filter((b) => b.level === lvlNumber)
              .map((b) => {
                const binX = (b.position - (binsPerLevel + 1) / 2) * 0.6;
                const binY = shelfY + 0.22;
                const binZ = 0;

                return (
                  <BinMesh
                    key={b.id}
                    bin={b}
                    position={[binX, binY, binZ]}
                    isSelected={b.id === selectedBinId}
                    isHighlighted={b.bin_code === highlightedBinId || b.barcode === highlightedBinId}
                    onClick={onSelectBin}
                  />
                );
              })}
          </group>
        );
      })}

      {/* Rack Identification Label */}
      <Text
        position={[0, rackHeight + 0.4, 0]}
        fontSize={0.35}
        color="#F8FAFC"
        anchorX="center"
        anchorY="middle"
      >
        {rack.rack_code}
      </Text>
    </group>
  );
}

// 3D Warehouse Floor, Boundaries, and Zones
function WarehouseScene({ zones, selectedBinId, highlightedBinId, onSelectBin, routeCoords }) {
  // Compute overall bounds
  const floorWidth = 55;
  const floorLength = 85;

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[30, 45, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 20, 30]} intensity={0.8} />

      {/* Concrete Warehouse Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.05, 35]} receiveShadow>
        <planeGeometry args={[floorWidth, floorLength]} />
        <meshStandardMaterial color="#0F172A" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Grid Floor Lines for industrial look */}
      <gridHelper
        args={[80, 40, '#334155', '#1E293B']}
        position={[20, 0, 35]}
      />

      {/* Dispatch Station Hub */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[4, 0.4, 4]} />
          <meshStandardMaterial color="#2563EB" metalness={0.5} roughness={0.3} />
        </mesh>
        <Text position={[0, 1.2, 0]} fontSize={0.6} color="#60A5FA">
          DISPATCH HUB
        </Text>
      </group>

      {/* Zones, Aisles, Racks */}
      {zones.map((zone) => (
        <group key={zone.id}>
          {/* Zone Title in 3D */}
          <Text
            position={[2, 4.0, (zone.aisles?.[0]?.position_y || 10) - 2]}
            fontSize={0.9}
            color={zone.color_hex || '#38BDF8'}
            anchorX="left"
          >
            {zone.name}
          </Text>

          {/* Aisles & Racks */}
          {zone.aisles?.map((aisle) => (
            <group key={aisle.id}>
              {/* Walkable aisle line marking */}
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[parseFloat(aisle.position_x), 0.01, parseFloat(aisle.position_y) + 10]}
              >
                <planeGeometry args={[1.6, 20]} />
                <meshStandardMaterial color="#1E293B" opacity={0.6} transparent />
              </mesh>

              {/* Racks in this aisle */}
              {aisle.racks?.map((rack) => (
                <Rack3D
                  key={rack.id}
                  rack={rack}
                  aisleX={parseFloat(aisle.position_x)}
                  aisleY={parseFloat(aisle.position_y)}
                  selectedBinId={selectedBinId}
                  highlightedBinId={highlightedBinId}
                  onSelectBin={onSelectBin}
                />
              ))}
            </group>
          ))}
        </group>
      ))}

      {/* 3D Route Path Rendering */}
      {routeCoords && routeCoords.length > 1 && (
        <group>
          {routeCoords.map((coord, idx) => {
            if (idx === routeCoords.length - 1) return null;
            const next = routeCoords[idx + 1];
            const start = new THREE.Vector3(coord.x, 0.2, coord.y);
            const end = new THREE.Vector3(next.x, 0.2, next.y);
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            const distance = start.distanceTo(end);

            return (
              <group key={idx}>
                {/* Route segment cylinder */}
                <mesh
                  position={mid}
                  quaternion={new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    new THREE.Vector3().subVectors(end, start).normalize()
                  )}
                >
                  <cylinderGeometry args={[0.1, 0.1, distance, 8]} />
                  <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.6} />
                </mesh>
                {/* Waypoint beacon marker */}
                <mesh position={[coord.x, 0.4, coord.y]}>
                  <sphereGeometry args={[0.2, 16, 16]} />
                  <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.8} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </>
  );
}

// 2D Warehouse Layout Fallback
function Warehouse2DFallback({ zones, onSelectBin, selectedBinId }) {
  return (
    <div className="p-6 bg-slate-900 rounded-xl overflow-x-auto text-white min-h-[500px]">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          2D Warehouse Floor Plan Map
        </h3>
        <span className="text-xs text-slate-400">Click any bin to inspect inventory</span>
      </div>

      <div className="space-y-8 min-w-[700px]">
        {zones.map((zone) => (
          <div key={zone.id} className="p-4 rounded-lg bg-slate-800/60 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color_hex }} />
              <span className="font-bold text-xs uppercase tracking-wider">{zone.name}</span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {zone.aisles?.map((aisle) => (
                <div key={aisle.id} className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] font-mono font-bold text-blue-400 mb-2">
                    Aisle {aisle.aisle_code}
                  </div>
                  <div className="space-y-2">
                    {aisle.racks?.map((rack) => (
                      <div key={rack.id} className="bg-slate-800/80 p-1.5 rounded border border-slate-700/60">
                        <div className="text-[10px] text-slate-300 font-mono mb-1">
                          {rack.rack_code}
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {rack.bins?.map((b) => (
                            <button
                              key={b.id}
                              onClick={() => onSelectBin(b)}
                              title={`${b.bin_code} (${b.status})`}
                              className={`h-5 rounded text-[9px] font-mono flex items-center justify-center font-bold transition-transform hover:scale-110 ${b.id === selectedBinId ? 'ring-2 ring-amber-400 scale-105' : ''
                                }`}
                              style={{ backgroundColor: STATUS_COLORS[b.status] || '#2563EB' }}
                            >
                              L{b.level}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// MAIN 3D WAREHOUSE COMPONENT
export default function Warehouse3D() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('3D'); // '3D' or '2D'
  const [selectedBin, setSelectedBin] = useState(null);
  const [binInventory, setBinInventory] = useState([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [searchTarget, setSearchTarget] = useState('');
  const [routeCoords, setRouteCoords] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bins/tree/');
      setZones(res.data);
    } catch (err) {
      toast.error('Failed to load 3D warehouse layout data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  // Fetch SKU details when a bin is clicked
  const handleSelectBin = async (bin) => {
    setSelectedBin(bin);
    setLoadingInv(true);
    try {
      const res = await api.get(`/barcodes/${bin.barcode}/`);
      setBinInventory(res.data.contained_skus || []);
    } catch (err) {
      setBinInventory([]);
    } finally {
      setLoadingInv(false);
    }
  };

  const handleSearchHighlight = () => {
    if (!searchTarget.trim()) return;
    const q = searchTarget.trim().toUpperCase();

    // Check if bin exists
    let found = false;
    for (const z of zones) {
      for (const a of z.aisles || []) {
        for (const r of a.racks || []) {
          for (const b of r.bins || []) {
            if (b.bin_code.toUpperCase().includes(q) || b.barcode.toUpperCase() === q) {
              handleSelectBin(b);
              toast.success(`Highlighted bin: ${b.bin_code}`);
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }
      if (found) break;
    }

    if (!found) {
      toast.warning(`No bin found matching "${searchTarget}".`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            3D Warehouse Visualizer & Digital Twin
          </h1>
          <p className="text-xs text-slate-500">
            Real-time 3D spatial mapping of zones, aisles, racks, and 1,200 bins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bin Search and Highlight */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <input
              type="text"
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchHighlight()}
              placeholder="Bin code or barcode..."
              className="bg-transparent text-xs px-2 py-1 outline-none font-mono text-slate-800 placeholder:text-slate-400 w-44"
            />
            <button
              onClick={handleSearchHighlight}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Highlight
            </button>
          </div>

          {/* 3D / 2D Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('3D')}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === '3D' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              3D View
            </button>
            <button
              onClick={() => setViewMode('2D')}
              className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === '2D' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              2D Plan
            </button>
          </div>

          <button
            onClick={fetchTree}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh layout data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas / 2D Plan Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Visualizer Area */}
        <div className="lg:col-span-3 bg-slate-950 rounded-xl overflow-hidden relative shadow-lg min-h-[580px] h-[650px] border border-slate-800">
          {/* Status Legend Overlay */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md p-3 rounded-lg border border-slate-800 text-xs text-white space-y-1.5 shadow-md">
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
              Bin Status Legend
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#16A34A]" />
              <span>Available (Empty)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#2563EB]" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#F59E0B]" />
              <span>Low Stock (≤20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#DC2626]" />
              <span>Full / Blocked</span>
            </div>
          </div>

          {/* Navigation Controls Hint */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono">
            Left Click: Rotate • Right Click: Pan • Scroll: Zoom
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
              Loading 3D warehouse geometry and racks...
            </div>
          ) : viewMode === '3D' ? (
            <Canvas
              camera={{ position: [25, 30, 60], fov: 45 }}
              shadows
              className="three-canvas-container"
            >
              <WarehouseScene
                zones={zones}
                selectedBinId={selectedBin?.id}
                highlightedBinId={searchTarget.trim().toUpperCase()}
                onSelectBin={handleSelectBin}
                routeCoords={routeCoords}
              />
              <OrbitControls
                maxPolarAngle={Math.PI / 2 - 0.05} // don't go below floor
                minDistance={5}
                maxDistance={120}
              />
            </Canvas>
          ) : (
            <Warehouse2DFallback
              zones={zones}
              selectedBinId={selectedBin?.id}
              onSelectBin={handleSelectBin}
            />
          )}
        </div>

        {/* Selected Bin Inspector Side Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Bin Location Details
              </h3>
              {selectedBin && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: STATUS_COLORS[selectedBin.status] }}
                >
                  {selectedBin.status}
                </span>
              )}
            </div>

            {selectedBin ? (
              <div className="mt-4 space-y-4">
                {/* Location Breadcrumb */}
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Location Hierarchy
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1 break-all">
                    {selectedBin.full_location_path || selectedBin.bin_code}
                  </div>
                </div>

                {/* Key specs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Bin Code</span>
                    <span className="font-mono font-bold text-slate-800">{selectedBin.bin_code}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Barcode</span>
                    <span className="font-mono font-bold text-slate-800">{selectedBin.barcode}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Shelf Level</span>
                    <span className="font-bold text-slate-800">Level {selectedBin.level}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Capacity</span>
                    <span className="font-bold text-slate-800">{selectedBin.current_quantity} / {selectedBin.capacity} pcs</span>
                  </div>
                </div>

                {/* Contained Products */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-500" />
                    Stored SKU Inventory
                  </h4>

                  {loadingInv ? (
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 py-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Loading inventory records...
                    </div>
                  ) : binInventory.length === 0 ? (
                    <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-200 text-center">
                      Bin is currently empty (Available for put-away).
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {binInventory.map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] font-mono text-blue-600">{item.sku}</div>
                          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                            <span>Available: <strong className="text-slate-800">{item.available_quantity}</strong></span>
                            <span>Reserved: <strong>{item.reserved_quantity}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                <Box className="w-8 h-8 mx-auto text-slate-300" />
                <p>Click on any rack or bin in the 3D warehouse to inspect coordinates, barcode, and stored products.</p>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          {selectedBin && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={() => navigate(`/barcode-locator?q=${selectedBin.barcode}`)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                View & Print Barcode Label
              </button>
              <button
                onClick={() => navigate(`/routes?dest=${selectedBin.bin_code}`)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Calculate Route to this Bin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
