import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Mail, Phone, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users/');
      setUsers(res.data.results || []);
    } catch (err) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Warehouse User & Role Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage administrative access, managers, and assigned picking personnel.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-50 border border-slate-200"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
            <tr>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Employee ID</th>
              <th className="px-5 py-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5 font-bold text-slate-900">
                  {u.first_name} {u.last_name} ({u.username})
                </td>
                <td className="px-5 py-3.5 text-slate-500">{u.email}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-slate-600">{u.employee_id || 'N/A'}</td>
                <td className="px-5 py-3.5 text-right font-bold text-emerald-600">Active</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
