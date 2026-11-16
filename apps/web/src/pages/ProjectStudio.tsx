import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  Wand2,
  Lock,
  Unlock,
  RefreshCw,
  Code2,
  Clapperboard,
  CheckCircle2,
  AlertTriangle,
  Mic,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { SceneSpec, CustomizationConfig } from '@animforge/shared';
import { apiRequest } from '../lib/api';
import { ScenePreview } from '../components/ScenePreview';

interface ApiScene {
  id: string;
  project_id: string;
  scene_order: number;
  title: string;
  narration_segment: string;
  start_time: number;
  duration_seconds: number;
  animation_type: '2d' | '3d';
  visual_plan: SceneSpec['visualPlan'];
  generated_code: string;
  code_valid: boolean;
  validation_errors: string[];
  is_locked: boolean;
}

export const ProjectStudio: React.FC<{ easyMode: boolean }> = ({ easyMode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<{ title: string; status: string; customization: Partial<CustomizationConfig> } | null>(null);
  const [scenes, setScenes] = useState<SceneSpec[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [regenPrompt, setRegenPrompt] = useState('');

  const mapScenes = (rows: ApiScene[]): SceneSpec[] =>
    rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      sceneOrder: r.scene_order,
      title: r.title,
      narrationSegment: r.narration_segment,
      startTime: Number(r.start_time),
      durationSeconds: Number(r.duration_seconds),
      animationType: r.animation_type,
      visualPlan: r.visual_plan,
      generatedCode: r.generated_code || '',
      codeValid: r.code_valid,
      validationErrors: r.validation_errors || [],
      isLocked: r.is_locked,
    }));

  const loadProject = useCallback(async () => {
    if (!id) return;
    const res = await apiRequest<{ project: typeof project; scenes: ApiScene[] }>(`/projects/${id}`);
    setProject(res.project);
    setScenes(mapScenes(res.scenes));
  }, [id]);

  useEffect(() => {
    loadProject().catch((e) => setMessage(e.message));
  }, [loadProject]);

  const activeScene = scenes[activeIdx];

  const runAction = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMessage('');
    try {
      await fn();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setBusy('');
    }
  };

  const handleAnalyzeVoice = () =>
    runAction('Analyzing voice & timing...', async () => {
      const res = await apiRequest<{ segments: unknown[]; source: string }>(`/projects/${id}/analyze-voice`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setMessage(`Segmented ${res.segments.length} beats (${res.source}).`);
    });

  const handleGenerateStoryboard = () =>
    runAction('Generating original storyboard...', async () => {
      const res = await apiRequest<{ scenes: ApiScene[] }>(`/projects/${id}/storyboard`, { method: 'POST' });
      setScenes(mapScenes(res.scenes));
      setActiveIdx(0);
    });

  const handleGenerateSceneCode = (sceneId: string) =>
    runAction('Writing Remotion/Three.js scene code via CodeCraft API...', async () => {
      const res = await apiRequest<{ scene: ApiScene }>(`/scenes/${sceneId}/generate-code`, { method: 'POST' });
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? mapScenes([res.scene])[0] : s)));
    });

  const handleToggleLock = async (scene: SceneSpec) => {
    const res = await apiRequest<{ scene: ApiScene }>(`/scenes/${scene.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_locked: !scene.isLocked }),
    });
    setScenes((prev) => prev.map((s) => (s.id === scene.id ? mapScenes([res.scene])[0] : s)));
  };

  const handleRegenerateScene = (sceneId: string) =>
    runAction('Regenerating single scene...', async () => {
      const res = await apiRequest<{ scene: ApiScene }>(`/scenes/${sceneId}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({ instruction: regenPrompt || 'Enhance visual motion and camera framing.' }),
      });
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? mapScenes([res.scene])[0] : s)));
      setRegenPrompt('');
    });

  const handleMoveScene = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= scenes.length) return;
    const copy = [...scenes];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    const reindexed = copy.map((s, idx) => ({ ...s, sceneOrder: idx + 1 }));
    setScenes(reindexed);
    setActiveIdx(target);
    await apiRequest('/scenes/reorder', {
      method: 'POST',
      body: JSON.stringify({ projectId: id, orderedSceneIds: reindexed.map((s) => s.id) }),
    });
  };

  const handleSaveCode = (sceneId: string, code: string) =>
    runAction('Validating & saving TSX code...', async () => {
      const res = await apiRequest<{ scene: ApiScene }>(`/scenes/${sceneId}`, {
        method: 'PATCH',
        body: JSON.stringify({ generated_code: code }),
      });
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? mapScenes([res.scene])[0] : s)));
    });

  const handleRenderVideo = () =>
    runAction('Enqueuing isolated Remotion + FFmpeg render...', async () => {
      await apiRequest('/render/enqueue', { method: 'POST', body: JSON.stringify({ projectId: id }) });
      navigate('/queue');
    });

  if (!project) return <div className="text-sm text-slate-400">Loading studio...</div>;

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div>
          <h1 className="text-lg font-bold">{project.title}</h1>
          <p className="text-xs text-slate-400">
            Status: <span className="text-indigo-400 capitalize">{project.status.replace('_', ' ')}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAnalyzeVoice}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium"
          >
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            1. Analyze Voice
          </button>
          <button
            onClick={handleGenerateStoryboard}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
            2. Generate Storyboard
          </button>
          <button
            onClick={handleRenderVideo}
            disabled={Boolean(busy) || scenes.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold"
          >
            <Clapperboard className="w-3.5 h-3.5" />
            3. Render MP4
          </button>
        </div>
      </div>

      {(busy || message) && (
        <div className="px-4 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200">
          {busy || message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Scene List */}
        <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 max-h-[760px] overflow-y-auto">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Storyboard Scenes ({scenes.length})
          </h2>
          {scenes.map((scene, idx) => (
            <div
              key={scene.id}
              onClick={() => setActiveIdx(idx)}
              className={`p-3 rounded-lg border cursor-pointer transition space-y-2 ${
                idx === activeIdx
                  ? 'bg-indigo-600/15 border-indigo-500/60'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">
                  #{scene.sceneOrder} {scene.title}
                </span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleMoveScene(idx, -1)} className="p-1 hover:bg-slate-800 rounded">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleMoveScene(idx, 1)} className="p-1 hover:bg-slate-800 rounded">
                    <ArrowDown className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleToggleLock(scene)} className="p-1 hover:bg-slate-800 rounded">
                    {scene.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 font-bengali">{scene.narrationSegment}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {scene.durationSeconds}s · {scene.animationType.toUpperCase()}
                </span>
                {scene.codeValid ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Code Valid
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Needs Code
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Preview + Scene Inspector + Monaco Code Editor */}
        <div className="xl:col-span-8 space-y-5">
          <ScenePreview
            scenes={scenes}
            activeSceneIndex={activeIdx}
            onSelectScene={setActiveIdx}
            customization={project.customization}
          />

          {activeScene && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Scene #{activeScene.sceneOrder} Controls</h3>
                <div className="flex items-center gap-2">
                  <input
                    value={regenPrompt}
                    onChange={(e) => setRegenPrompt(e.target.value)}
                    placeholder="Instruction to regenerate this scene..."
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs w-56"
                  />
                  <button
                    onClick={() => handleRegenerateScene(activeScene.id)}
                    disabled={activeScene.isLocked || Boolean(busy)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate Scene
                  </button>
                  <button
                    onClick={() => handleGenerateSceneCode(activeScene.id)}
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Write AI Code
                  </button>
                </div>
              </div>

              {!easyMode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Remotion / Three.js Scene Code (TSX — Sandboxed)</span>
                    <button
                      onClick={() => handleSaveCode(activeScene.id, activeScene.generatedCode)}
                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                    >
                      Validate & Save Code
                    </button>
                  </div>
                  {activeScene.validationErrors.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                      {activeScene.validationErrors.join(' | ')}
                    </div>
                  )}
                  <div className="h-72 border border-slate-800 rounded-lg overflow-hidden">
                    <Editor
                      height="100%"
                      defaultLanguage="typescript"
                      theme="vs-dark"
                      value={activeScene.generatedCode}
                      onChange={(val) =>
                        setScenes((prev) =>
                          prev.map((s, i) => (i === activeIdx ? { ...s, generatedCode: val || '' } : s))
                        )
                      }
                      options={{ minimap: { enabled: false }, fontSize: 12 }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
