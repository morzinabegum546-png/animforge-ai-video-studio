import {
  AnimationMode,
  CustomizationConfig,
  LanguageCode,
  SceneVisualPlan,
  StyleBenchmark,
  TranscriptSegment,
} from '@animforge/shared';
import { getAIProvider } from './provider';
import { stylePromptFor } from './storyStyle';

export interface GeneratedStoryboardScene {
  sceneOrder: number;
  title: string;
  narrationSegment: string;
  startTime: number;
  durationSeconds: number;
  animationType: '2d' | '3d';
  visualPlan: SceneVisualPlan;
}

export async function generateStoryboard(params: {
  userId: string;
  projectId: string;
  title: string;
  topicOrScript: string;
  language: LanguageCode;
  animationMode: AnimationMode;
  transcriptSegments: TranscriptSegment[];
  benchmarks: StyleBenchmark[];
  customization: CustomizationConfig;
}): Promise<GeneratedStoryboardScene[]> {
  const provider = getAIProvider('codecraft');
  const res = await provider.complete(
    [
      {
        role: 'system',
        content: `You are a Creative Animation Director. Design a completely ORIGINAL scene-by-scene storyboard for the user's topic.
CRITICAL RULES:
- Never copy scenes, characters, or plots from reference benchmarks; use benchmarks ONLY for production quality, pacing, and lighting inspiration.
- Support 2D (Remotion/SVG/Canvas) and 3D (Three.js/R3F) scenes per animationMode=${params.animationMode}.
- Return JSON: { "scenes": [ { "sceneOrder", "title", "narrationSegment", "startTime", "durationSeconds", "animationType" ("2d"|"3d"), "visualPlan": { "background", "mainVisual", "characterAction", "textOverlay", "motionGraphics": [], "cameraMovement", "lighting", "transition", "soundEffect" } } ] }.${stylePromptFor(params.customization?.videoStyle)}`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          projectTitle: params.title,
          language: params.language,
          topicOrScript: params.topicOrScript,
          transcriptSegments: params.transcriptSegments,
          styleBenchmarks: params.benchmarks,
          customization: params.customization,
        }),
      },
    ],
    {
      userId: params.userId,
      projectId: params.projectId,
      operation: 'storyboard_generation',
      responseFormatJson: true,
      temperature: 0.65,
      maxTokens: 4096,
    }
  );

  const parsed = JSON.parse(res.text) as { scenes?: GeneratedStoryboardScene[] };
  return parsed.scenes || [];
}

export async function regenerateSingleScenePlan(params: {
  userId: string;
  projectId: string;
  existingScene: GeneratedStoryboardScene;
  userInstruction: string;
  customization: CustomizationConfig;
}): Promise<GeneratedStoryboardScene> {
  const provider = getAIProvider('codecraft');
  const res = await provider.complete(
    [
      {
        role: 'system',
        content:
          'You are a Creative Animation Director. Regenerate ONLY this single scene according to the user instruction while keeping startTime and durationSeconds aligned. Return JSON with one scene object.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          existingScene: params.existingScene,
          userInstruction: params.userInstruction,
          customization: params.customization,
        }),
      },
    ],
    {
      userId: params.userId,
      projectId: params.projectId,
      operation: 'single_scene_regeneration',
      responseFormatJson: true,
      temperature: 0.7,
    }
  );

  return JSON.parse(res.text) as GeneratedStoryboardScene;
}
