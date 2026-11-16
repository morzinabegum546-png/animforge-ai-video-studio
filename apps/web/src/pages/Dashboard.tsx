import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Film, Clock, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface ProjectRow {
  id: string;
  title: string;
  language: string;
  animation_mode: string;
  status: string;
  updated_at: string;
}

export const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<{ projects: ProjectRow[] }>('/projects')
      .then((res) => setProjects(res.projects))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Production Dashboard</h1>
          <p className="text-sm text-slate-400">Manage your AI-generated 2D & 3D storytelling projects.</p>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition"
        >
          <PlusCircle className="w-4 h-4" />
          New Video Project
        </Link>
      </div>

      {error && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-400">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
          <Film className="w-10 h-10 text-indigo-400 mx-auto" />
          <h2 className="font-semibold">No projects yet</h2>
          <p className="text-sm text-slate-400">Upload a reference video or start a new 2D/3D story project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 space-y-3 transition group"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold group-hover:text-indigo-300 transition">{p.title}</h3>
                <span className="text-[11px] uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {p.animation_mode}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(p.updated_at).toLocaleDateString()}
                </span>
                <span className="capitalize text-indigo-400 flex items-center gap-1">
                  {p.status.replace('_', ' ')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
