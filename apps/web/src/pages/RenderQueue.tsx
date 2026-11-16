import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { apiRequest, getRenderDownloadUrl } from '../lib/api';

interface RenderJobRow {
  id: string;
  status: string;
  progress: number;
  resolution: string;
  aspect_ratio: string;
  error_message?: string;
  created_at: string;
  projects?: { title: string };
}

export const RenderQueue: React.FC<{ completedOnly?: boolean }> = ({ completedOnly = false }) => {
  const [jobs, setJobs] = useState<RenderJobRow[]>([]);

  useEffect(() => {
    const load = () =>
      apiRequest<{ jobs: RenderJobRow[] }>('/render')
        .then((r) => setJobs(completedOnly ? r.jobs.filter((j) => j.status === 'completed') : r.jobs))
        .catch(() => {});
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [completedOnly]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{completedOnly ? 'Export History' : 'Render Queue'}</h1>
        <p className="text-sm text-slate-400">
          Real background Remotion + Three.js + FFmpeg job progress (polls every 4s).
        </p>
      </div>

      <div className="space-y-3">
        {jobs.map((j) => (
          <div key={j.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="font-semibold text-sm">{j.projects?.title || j.id}</div>
              <div className="text-xs text-slate-400">
                {j.resolution} · {j.aspect_ratio} · Status: <span className="text-indigo-400 uppercase">{j.status}</span>
              </div>
              {j.error_message && <div className="text-xs text-rose-400">{j.error_message}</div>}
              <div className="w-full max-w-md h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${j.progress}%` }} />
              </div>
            </div>
            {j.status === 'completed' && (
              <a
                href={getRenderDownloadUrl(j.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                Download MP4
              </a>
            )}
          </div>
        ))}
        {jobs.length === 0 && <div className="text-sm text-slate-500">No render jobs found.</div>}
      </div>
    </div>
  );
};
