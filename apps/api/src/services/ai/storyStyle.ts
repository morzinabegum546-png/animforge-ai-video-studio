export const VILLAGE_STORY_STYLE = 'Bengali Village Story (2D flat)';

// Derived from the user's reference video: flat-vector Bengali village story, 16:9, ~30fps.
export const VILLAGE_STORY_PROMPT = `
STYLE PRESET "Bengali Village Story": match the production style of a flat-vector 2D Bengali village storytelling video.
- Look: flat shapes with thin dark outlines, muted earthy palette (tan walls, slate-blue rainy sky, olive greens, brick-red/teal clothing), simple round-faced characters (mustache, white skull cap, saree), tin-roof village houses, palm and mango trees, rain streaks, grass tufts in the foreground.
- Characters are built from SVG primitives (head, torso, arms, legs) with idle motion only: gentle bobbing, blinking, arm gestures, head turns. 2-3 characters per scene, shown medium shot or close-up.
- Camera: slow push-in or gentle pan on a static background per scene; cut or quick cross-fade between scenes.
- Thought bubbles: a circle with warm yellow glow containing a mini-scene, with two small trailing bubbles.
- Caption: bottom-centre rounded dark pill, bold Bengali font (Hind Siliguri), white text, ONE key word per line highlighted in yellow (#F5B301); captions follow the narration phrase by phrase and swap with a short fade.
- Mood follows the story: rainy/grey for conflict, bright sky for resolution.
- Do NOT add any voice-over or TTS: narration audio is supplied by the user and mixed in later.`;

export function stylePromptFor(videoStyle?: string): string {
  return videoStyle === VILLAGE_STORY_STYLE ? VILLAGE_STORY_PROMPT : '';
}
