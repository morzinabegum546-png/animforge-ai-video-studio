import { CustomizationConfig, SceneVisualPlan } from '@animforge/shared';
import { stylePromptFor } from './storyStyle';
import { getAIProvider } from './provider';
import { validateAnimationCode } from '../sandbox/codeValidator';

function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```(?:tsx|typescript|jsx|javascript)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

export async function generateSceneAnimationCode(params: {
  userId: string;
  projectId: string;
  sceneTitle: string;
  narrationSegment: string;
  durationSeconds: number;
  animationType: '2d' | '3d';
  visualPlan: SceneVisualPlan;
  customization: CustomizationConfig;
}): Promise<{ code: string; valid: boolean; errors: string[]; warnings: string[] }> {
  const provider = getAIProvider('codecraft');
  const allowedImports =
    params.animationType === '3d'
      ? `react, remotion, three, @react-three/fiber, @react-three/drei`
      : `react, remotion`;

  const systemPrompt = `You are a Senior Remotion & Three.js Motion Graphics Programmer.
Write a complete, self-contained, executable React TypeScript (.tsx) component for a single animated scene.
STRICT RULES:
1. Allowed imports ONLY: ${allowedImports}.
2. NEVER import fs, path, child_process, http, or external npm packages.
3. Export a default React component: \`export default function SceneComponent() { ... }\`.
4. Use Remotion hooks (\`useCurrentFrame()\`, \`useVideoConfig()\`, \`interpolate()\`, \`spring()\`, \`AbsoluteFill\`) for frame-accurate animation.
5. For 3D scenes, wrap Three.js meshes/lights/camera inside \`<ThreeCanvas>\` or a standard R3F \`<Canvas>\` driven deterministically by \`useCurrentFrame()\`.
6. Render clean original SVG vector graphics (2D) or Three.js geometry/lighting (3D) matching the scene's visualPlan, colors, typography, and cameraMovement.
7. Output ONLY raw TypeScript/TSX code with no markdown fences or explanations.${stylePromptFor(params.customization?.videoStyle)}`;

  const userPrompt = JSON.stringify({
    sceneTitle: params.sceneTitle,
    narrationSegment: params.narrationSegment,
    durationSeconds: params.durationSeconds,
    animationType: params.animationType,
    visualPlan: params.visualPlan,
    colors: params.customization.colors,
    typography: params.customization.typography,
    output: params.customization.output,
  });

  const firstAttempt = await provider.complete(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    {
      userId: params.userId,
      projectId: params.projectId,
      operation: `generate_${params.animationType}_scene_code`,
      temperature: 0.35,
      maxTokens: 4096,
    }
  );

  let code = stripMarkdownFences(firstAttempt.text);
  let validation = validateAnimationCode(code);

  // One automatic repair pass if TypeScript/AST validation catches issues
  if (!validation.valid) {
    const repairAttempt = await provider.complete(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Fix the following TypeScript/security validation errors in this TSX scene component and return ONLY the corrected code:\nErrors:\n${validation.errors.join('\n')}\n\nCode:\n${code}`,
        },
      ],
      {
        userId: params.userId,
        projectId: params.projectId,
        operation: 'repair_scene_code',
        temperature: 0.15,
        maxTokens: 4096,
      }
    );
    code = stripMarkdownFences(repairAttempt.text);
    validation = validateAnimationCode(code);
  }

  return {
    code,
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}
