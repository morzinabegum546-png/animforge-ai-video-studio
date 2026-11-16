import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Upload } from 'lucide-react';
import { apiRequest } from '../lib/api';

interface ReferenceItem {
  id: string;
  title: string;
  status: string;
}

interface AssetItem {
  id: string;
  name: string;
  asset_type: string;
}

export const NewProject: React.FC<{ easyMode: boolean }> = ({ easyMode }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [topicOrScript, setTopicOrScript] = useState('');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [animationMode, setAnimationMode] = useState<'2d' | '3d' | 'mixed' | 'ai-assisted'>('2d');
  const [referenceMode, setReferenceMode] = useState<'ref1' | 'ref2' | 'combined' | 'custom'>('combined');
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);
  const [voiceAssetId, setVoiceAssetId] = useState<string>('');
  const [musicAssetId, setMusicAssetId] = useState<string>('');

  // Customization State
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#1e293b');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [fontFamily, setFontFamily] = useState('Hind Siliguri');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
  const [cameraMovement, setCameraMovement] = useState('Slow Cinematic Push-In');
  const [transitionType, setTransitionType] = useState('Smooth Crossfade');

  const [refs, setRefs] = useState<ReferenceItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<{ references: ReferenceItem[] }>('/references').then((r) => setRefs(r.references)).catch(() => {});
    apiRequest<{ assets: AssetItem[] }>('/assets').then((r) => setAssets(r.assets)).catch(() => {});
  }, []);

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('assetType', 'voice');
    form.append('name', file.name);
    const res = await apiRequest<{ asset: AssetItem }>('/assets/upload', { method: 'POST', body: form });
    setAssets((prev) => [res.asset, ...prev]);
    setVoiceAssetId(res.asset.id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await apiRequest<{ project: { id: string } }>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          title,
          topicOrScript,
          language,
          animationMode,
          referenceMode,
          referenceIds: selectedRefIds,
          voiceAssetId: voiceAssetId || null,
          musicAssetId: musicAssetId || null,
          customization: {
            videoStyle: animationMode === '3d' ? '3D Cinematic Storytelling' : language === 'bn' ? 'Bengali Village Story (2D flat)' : '2D Motion Graphics',
            colors: { primary: primaryColor, secondary: secondaryColor, background: bgColor, accent: accentColor },
            typography: {
              fontFamily,
              fontSize: 32,
              fontWeight: 700,
              textColor: '#ffffff',
              highlightColor: accentColor,
              position: 'bottom',
              alignment: 'center',
              lineSpacing: 1.3,
              letterSpacing: 0,
              entranceAnimation: 'fade-up',
              exitAnimation: 'fade',
              animatedSubtitles: true,
            },
            animation: {
              presets: ['fade', 'zoom', 'parallax'],
              cameraMovement,
              lightingMood: 'cinematic',
              shadowsEnabled: true,
            },
            transitions: { defaultTransition: transitionType, durationFrames: 12 },
            audio: { voiceVolume: 1, musicVolume: 0.25, fadeInSeconds: 1, fadeOutSeconds: 1.5, keepOriginalVoice: true },
            output: { aspectRatio, resolution, fps: 30 },
          },
        }),
      });
      navigate(`/projects/${res.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Video Project</h1>
        <p className="text-sm text-slate-400">
          Configure your story, voice narration, reference quality benchmark, and 2D/3D creative controls.
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Project Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., History of Sundarbans / বাবার স্মৃতি"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Primary Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'bn' | 'en')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
              >
                <option value="bn">Bengali (বাংলা)</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Animation Mode</label>
              <select
                value={animationMode}
                onChange={(e) => setAnimationMode(e.target.value as typeof animationMode)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
              >
                <option value="2d">2D Animation (Remotion)</option>
                <option value="3d">3D Animation (Three.js / R3F)</option>
                <option value="mixed">Mixed 2D + 3D</option>
                <option value="ai-assisted">AI-Assisted Selection</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Story, Topic, or Narration Script</label>
          <textarea
            rows={4}
            value={topicOrScript}
            onChange={(e) => setTopicOrScript(e.target.value)}
            placeholder="Paste your Bengali or English script, or describe the story you want animated..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bengali"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Upload Voice Narration (Original Voice Preserved)</label>
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-dashed border-slate-700 rounded-lg text-xs text-slate-300 cursor-pointer hover:border-indigo-500">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>{voiceAssetId ? 'Voice uploaded & linked' : 'Choose MP3 / WAV / M4A voice file'}</span>
              <input type="file" accept="audio/*" onChange={handleVoiceUpload} className="hidden" />
            </label>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Background Music (from Asset Library)</label>
            <select
              value={musicAssetId}
              onChange={(e) => setMusicAssetId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
            >
              <option value="">None</option>
              {assets
                .filter((a) => a.asset_type === 'music')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reference Benchmark Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Reference Quality Benchmark (Non-Template)</h2>
          <select
            value={referenceMode}
            onChange={(e) => setReferenceMode(e.target.value as typeof referenceMode)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
          >
            <option value="ref1">Reference Video 1 Style</option>
            <option value="ref2">Reference Video 2 Style</option>
            <option value="combined">Combined Style</option>
            <option value="custom">Custom Style</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {refs.map((r) => {
            const active = selectedRefIds.includes(r.id);
            return (
              <button
                type="button"
                key={r.id}
                onClick={() =>
                  setSelectedRefIds((prev) => (active ? prev.filter((id) => id !== r.id) : [...prev, r.id]))
                }
                className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                  active ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {r.title} ({r.status})
              </button>
            );
          })}
          {refs.length === 0 && <span className="text-xs text-slate-500">No reference videos uploaded yet.</span>}
        </div>
      </div>

      {/* Creative Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Output & Creative Customization</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
            >
              <option value="16:9">16:9 Landscape</option>
              <option value="9:16">9:16 Vertical</option>
              <option value="1:1">1:1 Square</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as typeof resolution)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm"
            >
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Primary Color</label>
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full h-9 bg-slate-950 rounded cursor-pointer" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Highlight / Accent</label>
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-full h-9 bg-slate-950 rounded cursor-pointer" />
          </div>
        </div>

        {!easyMode && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Background HEX</label>
              <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Font Family</label>
              <input value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Camera Direction</label>
              <input value={cameraMovement} onChange={(e) => setCameraMovement(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Default Transition</label>
              <input value={transitionType} onChange={(e) => setTransitionType(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs" />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold text-sm transition"
      >
        <Sparkles className="w-4 h-4" />
        {submitting ? 'Creating Project...' : 'Create & Open Production Studio'}
      </button>
    </form>
  );
};
