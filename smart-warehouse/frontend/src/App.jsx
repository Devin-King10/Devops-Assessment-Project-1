import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layout
import MainLayout from './layouts/MainLayout';

// Pages & Features
import Login from './pages/Login';
import Dashboard from './features/dashboard/Dashboard';
import Warehouse3D from './features/warehouse/Warehouse3D';
import WarehouseLayout from './features/warehouse/WarehouseLayout';
import InventoryManagement from './features/inventory/InventoryManagement';
import BarcodeLocator from './features/barcode/BarcodeLocator';
import PickLists from './features/picking/PickLists';
import PickingSessionView from './features/picking/PickingSessionView';
import RouteOptimizer from './features/routing/RouteOptimizer';
import AnalyticsReports from './features/analytics/AnalyticsReports';
import UserManagement from './features/users/UserManagement';
import SettingsPage from './features/settings/SettingsPage';

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center text-xs font-semibold text-slate-500">
        Authenticating terminal session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Warehouse Terminal Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="layout" element={<WarehouseLayout />} />
              <Route path="3d-warehouse" element={<Warehouse3D />} />
              <Route path="zones-aisles" element={<WarehouseLayout />} />
              <Route path="racks-bins" element={<WarehouseLayout />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="barcode-locator" element={<BarcodeLocator />} />
              <Route path="pick-lists" element={<PickLists />} />
              <Route path="picking-sessions" element={<PickLists />} />
              <Route path="picking-sessions/:sessionId" element={<PickingSessionView />} />
              <Route path="routes" element={<RouteOptimizer />} />
              <Route path="analytics" element={<AnalyticsReports />} />
              <Route
                path="users"
                element={
                  <ProtectedRoute adminOnly>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
