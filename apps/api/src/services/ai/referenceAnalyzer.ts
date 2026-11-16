import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { StyleBenchmark } from '@animforge/shared';
import { getAIProvider, ChatMessage } from './provider';

export async function probeVideoMetadata(filePath: string): Promise<{
  durationSeconds: number;
  resolution: string;
  fps: number;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      const width = videoStream?.width || 1280;
      const height = videoStream?.height || 720;
      const fpsParts = (videoStream?.r_frame_rate || '30/1').split('/');
      const fps = Number(fpsParts[0]) / (Number(fpsParts[1]) || 1);
      resolve({
        durationSeconds: Number(data.format.duration || 0),
        resolution: `${width}x${height}`,
        fps: Math.round(fps * 100) / 100,
      });
    });
  });
}

async function extractSampleKeyframes(videoPath: string, outDir: string, count = 4): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count,
        folder: outDir,
        filename: 'frame-%i.png',
        size: '640x?',
      })
      .on('end', async () => {
        const files = (await fs.readdir(outDir))
          .filter((f) => f.endsWith('.png'))
          .sort()
          .map((f) => path.join(outDir, f));
        resolve(files);
      })
      .on('error', reject);
  });
}

export async function analyzeReferenceVideo(params: {
  videoPath: string;
  title: string;
  userId: string;
  preferredProvider?: 'gemini' | 'codecraft';
}): Promise<{ metadata: { durationSeconds: number; resolution: string; fps: number }; benchmark: StyleBenchmark }> {
  const metadata = await probeVideoMetadata(params.videoPath);
  const frameDir = path.join(path.dirname(params.videoPath), `frames_${Date.now()}`);
  const framePaths = await extractSampleKeyframes(params.videoPath, frameDir, 4);

  const imageParts: Array<{ type: 'image_url'; image_url: { url: string } }> = [];
  for (const fp of framePaths) {
    const buf = await fs.readFile(fp);
    imageParts.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${buf.toString('base64')}` },
    });
  }

  const provider = getAIProvider(params.preferredProvider || 'codecraft');
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a Senior Motion Graphics Director. Analyze the reference video frames as a QUALITY BENCHMARK ONLY—never as a fixed template to copy. Return valid JSON matching the StyleBenchmark schema.',
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Analyze "${params.title}" (${metadata.resolution}, ${metadata.fps}fps, ${metadata.durationSeconds.toFixed(1)}s).
Return JSON with keys:
visualIdentity (string), animationTechniques (string[]), characterStyle (string), backgroundEnvironment (string),
cameraMovement (string[]), typographyAndSubtitles (string),
colorPalette ({ primary, secondary, background, accent, highlight } hex codes),
lightingAndEffects (string[]), transitions (string[]), pacingSecondsPerBeat (string), audioSyncNotes (string).`,
        },
        ...imageParts,
      ],
    },
  ];

  const result = await provider.complete(messages, {
    userId: params.userId,
    operation: 'reference_video_analysis',
    responseFormatJson: true,
    temperature: 0.3,
  });

  await fs.rm(frameDir, { recursive: true, force: true }).catch(() => {});

  const benchmark = JSON.parse(result.text) as StyleBenchmark;
  return { metadata, benchmark };
}
