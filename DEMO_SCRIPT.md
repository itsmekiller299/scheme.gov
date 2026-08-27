# 60-Second Demo Script (for judges)

**0:00 Problem** (show home): "80cr miss benefits. English portals vs Hindi speaker in Bihar."
**0:10 Voice AI** (click 🎙️ Voice, speak Hindi): "बिहार में महिला हूँ, आय 1 लाख, गैस चाहिए" → Show streaming answer + 2 schemes (Ujjwala, PMMVY) with Hindi + Apply buttons.
**0:25 English RAG** (type): "Handloom weaver Varanasi need yarn" → Show NHDP, YSS top-2, Score 87%, groundedIds.
**0:35 Doc Intelligence** (go /apply/nhdp): Show DocAnalyzer → enter docs "Aadhaar, Bank", upload image → Analyze → "50% Missing: Weaver ID, Yarn passbook" + AI advice.
**0:50 Admin Copilot** (login admin@welfare.gov.in/Admin1234 → /admin): Show Gemini Insights bilingual bullets + Customer Service → AI Triage draft reply.

Keep camera on browser, speak Hindi once, show `GET /api/ai/chat` hasKey:false→true after key, mention `gemini-2.5-flash` + `text-embedding-004` RAG top-8.

# 3-Min Full Script
Add 1min: Try `POST /api/ai/translate` (en→hi), `POST /api/ai/triage` ticket, and `POST /api/ai/chat/stream` network SSE inspector.
