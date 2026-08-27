# Submission Checklist — Gemini Hackathon

- [ ] Set `GEMINI_API_KEY` in `.env.local` and Vercel env (aistudio.google.com/app/apikey)
- [ ] `npm run build` passes (done: 37 routes, 6 AI)
- [ ] Seed DB: `curl -X POST http://localhost:3000/api/seed -H "x-seed-secret: local-dev-seed-secret"` → {schemes:94}
- [ ] Test AI: `curl -X POST http://localhost:3000/api/ai/chat -H "Content-Type: application/json" -d '{"message":"farmer Bihar","language":"en"}'` → matches pm-kisan
- [ ] Test stream: curl with SSE or browser ChatAgent Send (see streaming badge)
- [ ] Test voice: Chrome → ChatAgent → 🎙️ Voice → english
- [ ] Test analyze: /apply/nhdp → DocAnalyzer → Analyze
- [ ] Test insights: /admin (admin@welfare.gov.in/Admin1234) → Gemini Insights
- [ ] Video: 3-min demo following DEMO_SCRIPT.md, voice english first 30s, architecture slide
- [ ] Devpost: paste DEVPOST.md + link to public GitHub + live Vercel URL (no login wall)
- [ ] Docs: docs/architecture.md + README AI section updated + GEMINI_MODEL badge
