import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

interface AdminOverview {
  users: Array<{ id: string; email: string; role: string; is_active: boolean; monthly_token_limit: number }>;
  usageLogs: Array<{ id: string; provider: string; model: string; operation: string; total_tokens: number; status: string }>;
  renderJobs: Array<{ id: string; status: string; resolution: string; profiles?: { email: string } }>;
}

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    apiRequest<AdminOverview>('/admin/overview').then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (userId: string, current: boolean) => {
    await apiRequest(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !current }),
    });
    load();
  };

  if (error) return <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">{error}</div>;
  if (!data) return <div className="text-sm text-slate-400">Loading admin metrics...</div>;

  const totalTokens = data.usageLogs.reduce((acc, l) => acc + (l.total_tokens || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Control Panel</h1>
        <p className="text-sm text-slate-400">Monitor 50–100 user accounts, AI token consumption, and render queue health.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Registered Users</div>
          <div className="text-2xl font-bold mt-1">{data.users.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Recent AI Tokens</div>
          <div className="text-2xl font-bold mt-1">{totalTokens.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400">Render Jobs Tracked</div>
          <div className="text-2xl font-bold mt-1">{data.renderJobs.length}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-sm">User Accounts & Quotas</h2>
        <div className="divide-y divide-slate-800 text-xs">
          {data.users.map((u) => (
            <div key={u.id} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-200">{u.email}</span>
                <span className="ml-2 text-slate-400">({u.role}) · Limit: {u.monthly_token_limit.toLocaleString()} tokens</span>
              </div>
              <button
                onClick={() => toggleActive(u.id, u.is_active)}
                className={`px-3 py-1 rounded ${u.is_active ? 'bg-emerald-600/20 text-emerald-300' : 'bg-rose-600/20 text-rose-300'}`}
              >
                {u.is_active ? 'Active' : 'Suspended'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
