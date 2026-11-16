# AnimForge AI Studio — 2D & 3D Programmatic Video Generation Platform

A full-stack, multi-user AI Motion Graphics & Storytelling Video Studio built with **React + TypeScript + Tailwind CSS**, **Monaco Editor**, **Remotion**, **Three.js / React Three Fiber**, **Node.js + Express**, **Supabase**, **Redis + BullMQ**, and **FFmpeg**.

---

## 1. CodeCraft API Inspection & Capabilities

Verified against [CodeCraft API Documentation](https://codecraftapi.com/docs) (`https://codecraftapi.com/v1`):
- **Supported:** OpenAI-compatible `/chat/completions`, SSE streaming, `/models`, `/embeddings`, Tool Calling, Vision (image input), and Reasoning models across 33 AI models.
- **Not Supported Natively:** CodeCraft API does **not** provide audio transcription (Whisper), text-to-speech, or direct video-file generation endpoints.
- **How AnimForge Handles This:**
  - **CodeCraft API** powers storyboard generation, script timing segmentation, and original 2D (Remotion) / 3D (Three.js/R3F) TSX animation code generation.
  - **FFmpeg** extracts sample keyframes from uploaded reference videos so Vision-capable models can extract a non-template `StyleBenchmark`.
  - **Speech-to-Text (`STT_API_BASE_URL` / `STT_API_KEY`)** handles optional Whisper-compatible audio transcription, falling back to `FFprobe` duration probing + script-to-time segmentation if no STT key is configured.

---

## 2. Architecture & Project Structure

```text
animforge-studio/
├── packages/shared/       # Shared TypeScript interfaces (StyleBenchmark, SceneSpec, RenderJobPayload)
├── supabase/migrations/   # PostgreSQL schema + Row-Level Security (RLS) for 50-100 users
├── apps/api/              # Express API, Auth/Admin middleware, AI providers, AST Code Validator, BullMQ Producer
├── apps/worker/           # Isolated Remotion + Three.js/R3F + FFmpeg render worker
├── apps/web/              # Dark-themed React Studio UI (Easy & Advanced modes, Monaco, Live 2D/3D Preview)
├── docker-compose.yml     # Redis + API + Resource-limited Render Worker
└── .env.example           # Backend-only API key configuration
```

### Security & Sandboxed Code Execution
- AI-generated TSX code is **never** executed on the main API server.
- Every scene passes TypeScript AST & static security validation (`apps/api/src/services/sandbox/codeValidator.ts`) allowing only `react`, `remotion`, `three`, `@react-three/fiber`, and `@react-three/drei`, blocking `fs`, `child_process`, `net`, `http`, `eval`, `Function`, `process`, and `require`.
- Rendering runs in an isolated `apps/worker` container (`no-new-privileges:true`, CPU/memory limits, `RENDER_TIMEOUT_MS`).

---

## 3. Running & Testing Locally

1. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, CODECRAFT_API_KEY, and REDIS_URL
   ```
2. **Initialize Database:**
   Run `supabase/migrations/001_init.sql` in your Supabase SQL Editor.
3. **Install Dependencies:**
   ```bash
   npm install
   ```
4. **Start Redis + Backend + Worker + Frontend:**
   ```bash
   docker compose up -d redis
   npm run dev:api
   npm run dev:worker
   npm run dev:web
   ```
5. **Typecheck & Build:**
   ```bash
   npm run typecheck
   npm run build
   ```
