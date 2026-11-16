import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import { LanguageCode, TranscriptSegment } from '@animforge/shared';
import { env } from '../../config/env';
import { getKey } from '../keyStore';
import { getAIProvider } from './provider';

export async function probeAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(Number(data.format.duration || 0));
    });
  });
}

export async function transcribeAudioIfConfigured(
  filePath: string,
  language: LanguageCode
): Promise<{ text: string; segments: TranscriptSegment[]; source: 'stt_api' | 'unavailable' }> {
  const sttApiKey = await getKey('sttApiKey');
  const sttBaseUrl = await getKey('sttBaseUrl');
  if (!sttApiKey || !sttBaseUrl) {
    return { text: '', segments: [], source: 'unavailable' };
  }

  const fileBuf = await fs.readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([fileBuf]), 'narration.mp3');
  form.append('model', env.sttModel);
  form.append('language', language);
  form.append('response_format', 'verbose_json');

  const res = await fetch(`${sttBaseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sttApiKey}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Speech-to-Text API failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as {
    text?: string;
    segments?: Array<{ id?: number; start: number; end: number; text: string }>;
  };

  const segments: TranscriptSegment[] = (data.segments || []).map((s, idx) => ({
    id: `seg-${idx + 1}`,
    start: Number(s.start.toFixed(2)),
    end: Number(s.end.toFixed(2)),
    text: s.text.trim(),
    importantWords: [],
  }));

  return { text: data.text || '', segments, source: 'stt_api' };
}

export async function segmentScriptWithTiming(params: {
  scriptText: string;
  totalDurationSeconds: number;
  language: LanguageCode;
  userId: string;
  projectId: string;
}): Promise<TranscriptSegment[]> {
  const provider = getAIProvider('codecraft');
  const res = await provider.complete(
    [
      {
        role: 'system',
        content:
          'You are an audio-visual timing director. Split narration into meaningful scene-ready segments with start, end, text, importantWords (1-3 words), and emotion. Support Bengali (bn) and English (en) natively. Return JSON: { "segments": [...] }.',
      },
      {
        role: 'user',
        content: `Language: ${params.language}
Total audio duration: ${params.totalDurationSeconds.toFixed(2)} seconds.
Narration script:
${params.scriptText}`,
      },
    ],
    {
      userId: params.userId,
      projectId: params.projectId,
      operation: 'voice_script_segmentation',
      responseFormatJson: true,
      temperature: 0.2,
    }
  );

  const parsed = JSON.parse(res.text) as { segments?: TranscriptSegment[] };
  return (parsed.segments || []).map((seg, i) => ({
    id: seg.id || `seg-${i + 1}`,
    start: Number(seg.start ?? 0),
    end: Number(seg.end ?? 4),
    text: seg.text || '',
    importantWords: seg.importantWords || [],
    emotion: seg.emotion || 'neutral',
  }));
}
