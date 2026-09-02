# Devpost Submission — scheme.gov AI Assist for Gov

## Inspiration
80 crore Indians miss welfare benefits due to document confusion and scattered portals. A weaver in Varanasi or farmer in Bihar cannot easily filter 94 schemes by eligibility. We built a voice-first AI that uses Gemini grounded RAG to cite real gov schemes in English.

## What it does
- **Voice/Chat in English (grounded):** User speaks/types "I am a handloom weaver in Varanasi need yarn" → Gemini RAG (text-embedding-004 top-8) returns NHDP, YSS with English explanation + Apply link.
- **Grounded in 94 schemes:** Top-8 retrieved via `text-embedding-004`, only those cited. No hallucination.
- **Doc Intelligence:** Upload Aadhaar/land record → Gemini Vision OCR → completeness + income/state eligibility + missing list.
- **Streaming:** Typewriter SSE `/api/ai/chat/stream` for live feel.
- **Admin Copilot:** `/api/ai/insights` summarizes 94-scheme usage, `/api/ai/triage` auto-classifies tickets (urgency, sentiment, draft English reply), `/api/ai/translate` and `/tts` (English-only replies).

## How we built it
Next.js 16 (Turbopack) + MongoDB + `@google/generative-ai` + `@google/genai` (`gemini-2.5-flash`, `text-embedding-004`). `app/lib/gemini.ts` central, `app/lib/embeddings.ts` cosine RAG. `ChatAgent.tsx` uses Web Speech API with `Permissions-Policy: microphone=(self)`. All `/api/ai/*` rate-limited, cached no-store.

## Challenges
Voice STT accuracy, embedding rate limits (fallback keyword), streaming parsing, keeping 94-scheme context under token limit (RAG top-8 solves).

## Accomplishments
94 schemes live seeded, build passing, demo works without key (rule fallback), voice end-to-end (English en-IN), admin insights.

## What's next
Atlas Vector Search, Imagen posters, full Gemma on-device for offline villages.

## Gemini Integration (200 words)
We use `gemini-2.5-flash` as core reasoning, `text-embedding-004` for retrieval, and `gemini-1.5-flash` vision for docs. Every chat: embed query → cosine rank 94 schemes → inject top 8 into system prompt → stream answer with cited schemeIds. This makes model grounded and auditable (`groundedIds` returned). Vision path: base64 doc → `inlineData` → JSON `{valid, confidence}`. Insights/triage/translate each call Gemini with structured JSON prompts. Streaming uses `generateContentStream` → SSE. Local fallback ensures judges can run without key. SDK: `@google/generative-ai@0.24` + `@google/genai@2.19` (embedding). Model selectable via `GEMINI_MODEL` env.

## Built With
Next.js, Gemini 2.5, MongoDB, Tailwind, Web Speech

## Try it
`npm install && cp .env.example .env.local` (set GEMINI_API_KEY) `&& npm run dev` → http://localhost:3000
Admin: admin@welfare.gov.in / Admin1234
Test voice: Chrome → English (en-IN) → "I need PM Kisan for 1 acre in Bihar"
APIs: `POST /api/ai/chat {message, language}`, `POST /api/ai/chat/stream`, `POST /api/ai/analyze {schemeId, fileBase64}`

