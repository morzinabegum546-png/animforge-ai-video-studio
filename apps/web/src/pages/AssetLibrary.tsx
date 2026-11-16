import React, { useEffect, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface AssetRow {
  id: string;
  name: string;
  asset_type: string;
  size_bytes: number;
  created_at: string;
}

export const AssetLibrary: React.FC = () => {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [assetType, setAssetType] = useState<'voice' | 'music' | 'sfx' | 'image'>('image');

  const load = () =>
    apiRequest<{ assets: AssetRow[] }>('/assets').then((r) => setAssets(r.assets)).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('assetType', assetType);
    form.append('name', file.name);
    await apiRequest('/assets/upload', { method: 'POST', body: form });
    await load();
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/assets/${id}`, { method: 'DELETE' });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Asset Library</h1>
          <p className="text-sm text-slate-400">Private per-user storage for voiceovers, music, SFX, and visual assets.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as typeof assetType)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm"
          >
            <option value="image">Image / Illustration</option>
            <option value="voice">Voice Narration</option>
            <option value="music">Background Music</option>
            <option value="sfx">Sound Effect</option>
          </select>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload Asset
            <input type="file" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
        {assets.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{a.name}</div>
              <div className="text-xs text-slate-400">
                {a.asset_type.toUpperCase()} · {(a.size_bytes / 1024).toFixed(1)} KB
              </div>
            </div>
            <button onClick={() => handleDelete(a.id)} className="p-2 text-slate-400 hover:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {assets.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No assets uploaded yet.</div>}
      </div>
    </div>
  );
};
