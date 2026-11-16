import React, { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

type Status = { codecraftConfigured: boolean; geminiConfigured: boolean; sttConfigured: boolean };

const FIELDS: Array<{ name: string; label: string; hint: string; secret: boolean; status?: keyof Status }> = [
  { name: 'codecraftApiKey', label: 'CodeCraft API Key', hint: 'Storyboard + animation code (main)', secret: true, status: 'codecraftConfigured' },
  { name: 'geminiApiKey', label: 'Gemini API Key (optional)', hint: 'Reference video & story analysis', secret: true, status: 'geminiConfigured' },
  { name: 'sttApiKey', label: 'Speech-to-Text API Key (optional)', hint: 'Auto-transcribe your voice file', secret: true },
  { name: 'sttBaseUrl', label: 'Speech-to-Text Base URL (optional)', hint: 'e.g. https://api.openai.com/v1', secret: false },
];

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<Status>('/settings/keys').then(setStatus).catch((e) => setMsg(e.message));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const next = await apiRequest<Status>('/settings/keys', { method: 'PUT', body: JSON.stringify(values) });
      setStatus(next);
      setValues({});
      setMsg('Saved. Keys are stored on the server and never sent back to the browser.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-sm text-slate-400">
          Paste your keys here instead of editing server files. Leave a field empty to keep the current value; type a single space to clear it.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-sm">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <div className="flex justify-between mb-1">
              <label className="text-slate-300">{f.label}</label>
              {f.status && (
                <span className={status?.[f.status] ? 'text-emerald-400 text-xs' : 'text-amber-400 text-xs'}>
                  {status?.[f.status] ? 'Configured' : 'Missing'}
                </span>
              )}
            </div>
            <input
              type={f.secret ? 'password' : 'text'}
              autoComplete="off"
              value={values[f.name] || ''}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              placeholder={f.hint}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          </div>
        ))}
        <button
          onClick={save}
          disabled={saving || Object.values(values).every((v) => !v)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-medium"
        >
          {saving ? 'Saving...' : 'Save keys'}
        </button>
        {msg && <p className="text-xs text-slate-400">{msg}</p>}
      </div>
    </div>
  );
};
