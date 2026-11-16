import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { SceneSpec, CustomizationConfig } from '@animforge/shared';

interface ScenePreviewProps {
  scenes: SceneSpec[];
  activeSceneIndex: number;
  onSelectScene: (idx: number) => void;
  customization: Partial<CustomizationConfig>;
}

const ThreePreviewMesh: React.FC<{ progress: number; primaryColor: string; accentColor: string }> = ({
  progress,
  primaryColor,
  accentColor,
}) => {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} />
      <mesh rotation={[progress * Math.PI * 0.5, progress * Math.PI * 2, 0]} position={[0, 0.2, 0]}>
        <dodecahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color={primaryColor} roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color={accentColor} opacity={0.25} transparent />
      </mesh>
      <OrbitControls enableZoom={false} />
    </>
  );
};

export const ScenePreview: React.FC<ScenePreviewProps> = ({
  scenes,
  activeSceneIndex,
  onSelectScene,
  customization,
}) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const activeScene = scenes[activeSceneIndex];
  const duration = activeScene?.durationSeconds || 5;

  useEffect(() => {
    setCurrentTime(0);
    setPlaying(false);
  }, [activeSceneIndex]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev + 0.05 >= duration) {
          if (activeSceneIndex + 1 < scenes.length) {
            onSelectScene(activeSceneIndex + 1);
            return 0;
          }
          setPlaying(false);
          return duration;
        }
        return prev + 0.05;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [playing, duration, activeSceneIndex, scenes.length, onSelectScene]);

  const progress = Math.min(1, currentTime / Math.max(0.1, duration));
  const bg = customization.colors?.background || '#0f172a';
  const primary = customization.colors?.primary || '#6366f1';
  const accent = customization.colors?.accent || '#f59e0b';
  const aspect = customization.output?.aspectRatio || '16:9';

  const aspectClass =
    aspect === '9:16' ? 'aspect-[9/16] max-h-[460px]' : aspect === '1:1' ? 'aspect-square max-h-[420px]' : 'aspect-video';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Live Preview — Scene {activeScene?.sceneOrder || 1} ({activeScene?.animationType?.toUpperCase() || '2D'})
        </span>
        <span>
          {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
        </span>
      </div>

      <div className="flex justify-center bg-slate-950 rounded-lg p-3 border border-slate-800">
        <div
          className={`relative w-full ${aspectClass} rounded-lg overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center`}
          style={{ backgroundColor: bg }}
        >
          {activeScene?.animationType === '3d' ? (
            <Canvas camera={{ position: [0, 1.2, 4.2], fov: 45 }}>
              <ThreePreviewMesh progress={progress} primaryColor={primary} accentColor={accent} />
            </Canvas>
          ) : (
            <svg viewBox="0 0 800 450" className="w-full h-full">
              <defs>
                <radialGradient id="sceneGlow" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor={primary} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={bg} stopOpacity="1" />
                </radialGradient>
              </defs>
              <rect width="800" height="450" fill="url(#sceneGlow)" />
              <g transform={`translate(${progress * 30 - 15}, 0) scale(${1 + progress * 0.04})`}>
                <circle cx="400" cy="180" r="78" fill={primary} opacity="0.22" stroke={primary} strokeWidth="3" />
                <text
                  x="400"
                  y="186"
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="22"
                  fontWeight="700"
                  fontFamily="Hind Siliguri, Inter, sans-serif"
                >
                  {activeScene?.title || 'Scene Preview'}
                </text>
                <text x="400" y="220" textAnchor="middle" fill={accent} fontSize="14">
                  {activeScene?.visualPlan?.cameraMovement || 'Slow Push-In'}
                </text>
              </g>
            </svg>
          )}

          {/* Subtitle Bar */}
          {activeScene?.narrationSegment && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 max-w-[85%] bg-slate-950/90 border border-slate-700/80 px-4 py-2 rounded-full text-center shadow-lg">
              <span
                className="text-sm md:text-base font-bold font-bengali"
                style={{ color: customization.typography?.textColor || '#ffffff' }}
              >
                {activeScene.narrationSegment}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls & Timeline Scrubber */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPlaying(!playing)}
          className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            setCurrentTime(0);
          }}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={currentTime}
          onChange={(e) => setCurrentTime(Number(e.target.value))}
          className="flex-1 accent-indigo-500"
        />
      </div>
    </div>
  );
};
