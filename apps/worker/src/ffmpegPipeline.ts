import ffmpeg from 'fluent-ffmpeg';
import { CustomizationConfig } from '@animforge/shared';

export async function mixAudioAndExportMp4(params: {
  silentVideoPath: string;
  voiceFilePath?: string;
  musicFilePath?: string;
  outputPath: string;
  audioConfig: CustomizationConfig['audio'];
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(params.silentVideoPath);

    if (params.voiceFilePath && params.musicFilePath) {
      cmd
        .input(params.voiceFilePath)
        .input(params.musicFilePath)
        .complexFilter([
          `[1:a]volume=${params.audioConfig?.voiceVolume ?? 1.0}[v]`,
          `[2:a]volume=${params.audioConfig?.musicVolume ?? 0.25},afade=t=in:st=0:d=${params.audioConfig?.fadeInSeconds ?? 1}[m]`,
          `[v][m]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
        ])
        .outputOptions(['-map 0:v', '-map [aout]', '-c:v copy', '-c:a aac', '-b:a 192k', '-shortest']);
    } else if (params.voiceFilePath) {
      // Preserve user's original voice unchanged
      cmd
        .input(params.voiceFilePath)
        .outputOptions(['-map 0:v', '-map 1:a', '-c:v copy', '-c:a aac', '-b:a 192k', '-shortest']);
    } else {
      cmd.outputOptions(['-c:v copy']);
    }

    cmd
      .output(params.outputPath)
      .on('end', () => resolve(params.outputPath))
      .on('error', reject)
      .run();
  });
}
