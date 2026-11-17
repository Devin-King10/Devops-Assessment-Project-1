import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Box,
  Boxes,
  Compass,
  QrCode,
  ClipboardList,
  Navigation,
  BarChart3,
  Users,
  Settings,
  Layers,
  MapPin,
  PlaySquare,
  Warehouse,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, section: 'Overview' },
  { name: 'Warehouse Layout', path: '/layout', icon: Warehouse, section: 'Warehouse' },
  { name: '3D Warehouse', path: '/3d-warehouse', icon: Box, section: 'Warehouse', badge: '3D' },
  { name: 'Zones & Aisles', path: '/zones-aisles', icon: Layers, section: 'Warehouse' },
  { name: 'Racks & Bins', path: '/racks-bins', icon: MapPin, section: 'Warehouse' },
  { name: 'SKU Inventory', path: '/inventory', icon: Boxes, section: 'Inventory' },
  { name: 'Barcode Locator', path: '/barcode-locator', icon: QrCode, section: 'Inventory', highlight: true },
  { name: 'Pick Lists', path: '/pick-lists', icon: ClipboardList, section: 'Operations' },
  { name: 'Picking Sessions', path: '/picking-sessions', icon: PlaySquare, section: 'Operations' },
  { name: 'Route Optimization', path: '/routes', icon: Navigation, section: 'Operations' },
  { name: 'Analytics & Reports', path: '/analytics', icon: BarChart3, section: 'Intelligence' },
  { name: 'User Management', path: '/users', icon: Users, section: 'Administration', adminOnly: true },
  { name: 'Settings', path: '/settings', icon: Settings, section: 'Administration' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#14213D] text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-[#0B132B]">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold tracking-tight text-sm leading-tight">
              SMART LOCATOR
            </div>
            <div className="text-xs text-blue-400 font-mono tracking-wider">
              WAREHOUSE 3D
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item, index) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  } ${item.highlight ? 'ring-1 ring-blue-500/30' : ''}`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Card */}
        <div className="p-3 border-t border-slate-800 bg-[#0B132B]/60">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-bold text-xs text-blue-400">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {user?.username || 'Operator'}
              </div>
              <div className="text-[11px] text-blue-400 font-mono truncate">
                {user?.role || 'PICKER'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
