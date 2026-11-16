import React, { useEffect, useState } from 'react';
import { Upload, Film } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface ReferenceVideo {
  id: string;
  title: string;
  resolution: string;
  fps: number;
  duration_seconds: number;
  status: string;
  style_benchmark: Record<string, unknown>;
}

export const ReferenceLibrary: React.FC = () => {
  const [refs, setRefs] = useState<ReferenceVideo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    apiRequest<{ references: ReferenceVideo[] }>('/references')
      .then((r) => setRefs(r.references))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('video', file);
      form.append('title', file.name);
      await apiRequest('/references/upload', { method: 'POST', body: form });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reference Video Library</h1>
          <p className="text-sm text-slate-400">
            Upload 2+ reference videos to extract quality benchmarks (pacing, lighting, motion style—never fixed templates).
          </p>
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading ? 'Analyzing...' : 'Upload Reference Video'}
          <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {error && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {refs.map((r) => (
          <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <Film className="w-4 h-4 text-indigo-400" />
                <span>{r.title}</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300">{r.status}</span>
            </div>
            <div className="text-xs text-slate-400">
              {r.resolution || '—'} · {r.fps || '—'} fps · {r.duration_seconds ? `${Number(r.duration_seconds).toFixed(1)}s` : '—'}
            </div>
            <pre className="text-[11px] bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto max-h-48 text-slate-300">
              {JSON.stringify(r.style_benchmark, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
