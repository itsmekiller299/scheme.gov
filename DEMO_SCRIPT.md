# 60-Second Demo Script (for judges) — English-only

**0:00 Problem** (show home): "80cr miss benefits. Scattered portals vs one AI grounded search over 94 schemes."
**0:10 Voice AI** (click 🎙️ Voice, speak English en-IN): "I am a woman in Bihar, income 1 lakh, need gas connection" → Show streaming answer + 2 schemes (Ujjwala, PMMVY) with English + Apply buttons.
**0:25 RAG** (type): "Handloom weaver Varanasi need yarn" → Show NHDP, YSS top-2, Score 87%, groundedIds.
**0:35 Doc Intelligence** (go /apply/nhdp): Show DocAnalyzer → enter docs "Aadhaar, Bank", upload image → Analyze → "50% Missing: Weaver ID, Yarn passbook" + AI advice.
**0:50 Admin Copilot** (login admin@welfare.gov.in/Admin1234 → /admin): Show Gemini Insights English bullets + Customer Service → AI Triage draft English reply.

Keep camera on browser, speak English, show `GET /api/ai/verify` live:true, mention `gemini-2.5-flash` + `text-embedding-004` RAG top-8.

# 3-Min Full Script
Add 1min: Try `POST /api/ai/translate` (en→hi), `POST /api/ai/triage` ticket, and `POST /api/ai/chat/stream` network SSE inspector.
