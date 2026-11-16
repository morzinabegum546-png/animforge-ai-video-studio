import fs from 'fs/promises';
import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { AspectRatio, RenderJobPayload, Resolution } from '@animforge/shared';

function getDimensions(resolution: Resolution, aspectRatio: AspectRatio): { width: number; height: number } {
  const base = resolution === '4k' ? 2160 : resolution === '1080p' ? 1080 : 720;
  if (aspectRatio === '9:16') return { width: base, height: Math.round((base * 16) / 9) };
  if (aspectRatio === '1:1') return { width: base, height: base };
  return { width: Math.round((base * 16) / 9), height: base };
}

export async function renderRemotionVideo(
  payload: RenderJobPayload,
  jobDir: string,
  onProgress: (pct: number) => Promise<void>
): Promise<string> {
  const srcDir = path.join(jobDir, 'remotion_src');
  await fs.mkdir(srcDir, { recursive: true });

  const { width, height } = getDimensions(payload.resolution, payload.aspectRatio);
  const fps = payload.fps || 30;

  // Write each validated AI-generated scene component into an isolated directory
  const imports: string[] = [];
  const seriesItems: string[] = [];
  let totalFrames = 0;

  for (let i = 0; i < payload.scenes.length; i++) {
    const scene = payload.scenes[i];
    const fileName = `Scene_${i + 1}.tsx`;
    await fs.writeFile(path.join(srcDir, fileName), scene.generatedCode, 'utf8');
    const frames = Math.max(15, Math.round(scene.durationSeconds * fps));
    totalFrames += frames;
    imports.push(`import Scene${i + 1} from './Scene_${i + 1}';`);
    seriesItems.push(
      `<Series.Sequence durationInFrames={${frames}}><Scene${i + 1} /></Series.Sequence>`
    );
  }

  const rootTsx = `import React from 'react';
import { Composition, Series, AbsoluteFill, registerRoot } from 'remotion';
${imports.join('\n')}

const MainStory: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '${payload.customization?.colors?.background || '#0f172a'}' }}>
      <Series>
        ${seriesItems.join('\n        ')}
      </Series>
    </AbsoluteFill>
  );
};

const RemotionRoot: React.FC = () => (
  <Composition
    id="AnimForgeMain"
    component={MainStory}
    durationInFrames={${Math.max(30, totalFrames)}}
    fps={${fps}}
    width={${width}}
    height={${height}}
  />
);

registerRoot(RemotionRoot);
`;

  const entryFile = path.join(srcDir, 'index.tsx');
  await fs.writeFile(entryFile, rootTsx, 'utf8');

  await onProgress(30);
  const bundleLocation = await bundle({
    entryPoint: entryFile,
    onProgress: () => {},
  });

  await onProgress(50);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'AnimForgeMain',
  });

  const silentVideoPath = path.join(jobDir, 'video_silent.mp4');
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: silentVideoPath,
    timeoutInMilliseconds: Number(process.env.RENDER_TIMEOUT_MS || 300000),
    onProgress: async ({ progress }) => {
      await onProgress(50 + Math.round(progress * 35));
    },
  });

  return silentVideoPath;
}
