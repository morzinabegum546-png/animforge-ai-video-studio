export type AnimationMode = '2d' | '3d' | 'mixed' | 'ai-assisted';
export type ReferenceMode = 'ref1' | 'ref2' | 'combined' | 'custom';
export type LanguageCode = 'bn' | 'en';
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type Resolution = '720p' | '1080p' | '4k';

export interface StyleBenchmark {
  visualIdentity: string;
  animationTechniques: string[];
  characterStyle: string;
  backgroundEnvironment: string;
  cameraMovement: string[];
  typographyAndSubtitles: string;
  colorPalette: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
    highlight: string;
  };
  lightingAndEffects: string[];
  transitions: string[];
  pacingSecondsPerBeat: string;
  audioSyncNotes: string;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  importantWords: string[];
  emotion?: string;
}

export interface CustomizationConfig {
  videoStyle: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
    gradient?: string;
  };
  typography: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    textColor: string;
    highlightColor: string;
    position: 'bottom' | 'center' | 'top';
    alignment: 'left' | 'center' | 'right';
    lineSpacing: number;
    letterSpacing: number;
    entranceAnimation: string;
    exitAnimation: string;
    animatedSubtitles: boolean;
  };
  animation: {
    presets: string[];
    cameraMovement: string;
    lightingMood: string;
    shadowsEnabled: boolean;
  };
  transitions: {
    defaultTransition: string;
    durationFrames: number;
  };
  audio: {
    voiceVolume: number;
    musicVolume: number;
    fadeInSeconds: number;
    fadeOutSeconds: number;
    keepOriginalVoice: boolean;
  };
  output: {
    aspectRatio: AspectRatio;
    resolution: Resolution;
    fps: number;
  };
}

export interface SceneVisualPlan {
  background: string;
  mainVisual: string;
  characterAction: string;
  textOverlay: string;
  motionGraphics: string[];
  cameraMovement: string;
  lighting: string;
  transition: string;
  soundEffect?: string;
}

export interface SceneSpec {
  id: string;
  projectId: string;
  sceneOrder: number;
  title: string;
  narrationSegment: string;
  startTime: number;
  durationSeconds: number;
  animationType: '2d' | '3d';
  visualPlan: SceneVisualPlan;
  generatedCode: string;
  codeValid: boolean;
  validationErrors: string[];
  isLocked: boolean;
}

export interface CodeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RenderJobPayload {
  jobId: string;
  projectId: string;
  userId: string;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  fps: number;
  scenes: SceneSpec[];
  customization: CustomizationConfig;
  voiceFilePath?: string;
  musicFilePath?: string;
  transcriptSegments: TranscriptSegment[];
}
