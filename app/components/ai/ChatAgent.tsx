"use client";
import React from "react";
import Link from "next/link";

interface Match {
  scheme: { id: string; name: string; name_hi?: string; description: string; description_hi?: string; benefits: string[]; documents_required: string[]; category: string };
  score: number;
  matchingFactors: string[];
  reason?: string;
}

const QUICK_PROMPTS = [
  "I am a farmer from Bihar with 1 acre, income 1.2 lakh, need help",
  "I am a woman from Bihar, income 1 lakh, need gas and education for children",
  "Handloom weaver in Varanasi, need yarn subsidy and MUDRA loan",
  "Student SC, income 2 lakh, need scholarship for college",
  "Street vendor in Delhi, need 15k loan",
];

export default function ChatAgent() {
  const language = "en";
  const [income, setIncome] = React.useState("");
  const [state, setState] = React.useState("");
  const [input, setInput] = React.useState("");
  const [history, setHistory] = React.useState<{ role: "user" | "model"; text: string }[]>([]);
  const [answer, setAnswer] = React.useState<string | null>(null);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [demoMode, setDemoMode] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const recRef = React.useRef<any>(null);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 0.95;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const toggleListen = () => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { alert("Voice not supported in this browser — use Chrome"); return; }
    if (listening && recRef.current) { recRef.current.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setInput(t);
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
  };

  const [streaming, setStreaming] = React.useState(false);
  const send = async (msg?: string, useStream = true) => {
    const text = (msg ?? input).trim();
    if (!text) return;
    setLoading(true); setError(""); setAnswer(null); setMatches([]); setStreaming(useStream);
    // Try streaming first
    if (useStream) {
      try {
        const res = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, language, history: history.slice(-6), income: income ? Number(income) : undefined, state: state || undefined }),
        });
        if (res.ok && res.headers.get("content-type")?.includes("text/event-stream")) {
          const reader = res.body!.getReader();
          const dec = new TextDecoder();
          let acc = "";
          let buf = "";
          setAnswer("");
          setLoading(false);
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream:true });
            let idx;
            while ((idx = buf.indexOf("\n\n")) !== -1) {
              const chunk = buf.slice(0, idx); buf = buf.slice(idx+2);
              if (!chunk.startsWith("data: ")) continue;
              try {
                const j = JSON.parse(chunk.slice(6));
                if (j.token) { acc += j.token; setAnswer(acc); }
                if (j.done) {
                  // fetch matches via non-stream fallback in background
                  fetch("/api/ai/chat", { method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ message: text, language, history: history.slice(-6) })})
                    .then(r=>r.json()).then(d=> { if(d.matches) setMatches(d.matches); setDemoMode(!!d.demoMode); }).catch(()=>{});
                  setHistory((h) => [...h, { role: "user" as const, text }, { role: "model" as const, text: acc }].slice(-12) as any);
                  if (acc) speak(acc.slice(0,280));
                }
              } catch {}
            }
          }
          setInput(""); setStreaming(false);
          return;
        }
      } catch {}
      // fallback to non-stream
    }
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language, income: income ? Number(income) : undefined, state: state || undefined, history: history.slice(-6) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "AI failed");
      setAnswer(data.answer);
      setMatches(data.matches || []);
      setDemoMode(!!data.demoMode);
      setHistory((h) => [...h, { role: "user" as const, text }, { role: "model" as const, text: data.answer }].slice(-12) as any);
      setInput("");
      if (data.answer) speak(data.answer.slice(0, 280));
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); setStreaming(false); }
  };

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-white to-green-600 h-1.5" />
      <div className="p-4 border-b bg-zinc-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            AI Assist for Gov
            <span className="text-xs font-normal px-2 py-0.5 bg-black text-white rounded-full">Gemini 2.5 Flash</span>
          </h2>
          <p className="text-xs text-zinc-600">Ask in English (en-IN) — voice or text. Grounded in 94 central schemes. {!demoMode ? "● Live unlock" : "○ Demo mode — set GEMINI_API_KEY then GET /api/ai/verify"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full border ${demoMode ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-green-50 border-green-200 text-green-700"}`}>{demoMode ? "Demo (no key)" : "Gemini Live"}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 grid sm:grid-cols-2 gap-3 bg-white border-b">
        <div>
          <label className="block text-xs font-medium mb-1">Monthly Income (₹) optional</label>
          <input value={income} onChange={(e) => setIncome(e.target.value)} type="number" placeholder="e.g. 120000" className="w-full p-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">State optional</label>
          <input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Bihar" className="w-full p-2 border rounded-lg text-sm" />
        </div>
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b bg-zinc-50">
        {QUICK_PROMPTS.map((p) => (
          <button key={p} onClick={() => send(p)} className="shrink-0 text-xs px-3 py-1.5 border rounded-full bg-white hover:bg-zinc-900 hover:text-white transition-colors">
            {p.slice(0, 38)}…
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="p-4 space-y-3 min-h-[120px]">
        {!answer && !loading && !error && (
          <div className="text-sm text-zinc-500 border border-dashed rounded-lg p-4 text-center">
            <p className="font-medium text-zinc-700">Try: “I am a farmer, 1 acre, income 1.5L” or speak in English</p>
            <p className="text-xs mt-1">Gemini will explain eligibility in English, cite schemeId, and give next steps. Works offline in demo mode.</p>
          </div>
        )}
        {answer && (
          <div className="border rounded-lg p-3 bg-zinc-900 text-zinc-100">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{answer}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => speak(answer)} className="text-xs px-2 py-1 bg-white text-black rounded hover:bg-zinc-200">{speaking ? "■ Stop" : "▶ Speak"}</button>
              <button onClick={() => navigator.clipboard.writeText(answer)} className="text-xs px-2 py-1 border border-zinc-700 rounded">Copy</button>
            </div>
          </div>
        )}
        {error && <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">{error}</div>}
        {(loading || streaming) && <div className="text-sm text-zinc-600 flex items-center gap-2"><span className="h-4 w-4 border-2 border-zinc-300 border-t-black animate-spin rounded-full" /> {streaming ? "Gemini streaming (2.5 Flash)…" : "Gemini is reasoning over 94 schemes…"}</div>}
      </div>

      {/* Results */}
      {matches.length > 0 && (
        <div className="px-4 pb-4 space-y-3">
          <h3 className="text-sm font-semibold">Grounded Recommendations ({matches.length})</h3>
          {matches.map((m) => (
            <div key={m.scheme.id} className="border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-sm">{m.scheme.name}</h4>
                  <p className="text-xs text-zinc-600 mt-0.5">{m.scheme.description}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="text-[11px] px-2 py-0.5 bg-zinc-900 text-white rounded-full">{m.scheme.category}</span>
                    <span className="text-[11px] px-2 py-0.5 border rounded-full">Score {Math.round(m.score * 100)}%</span>
                    {m.matchingFactors.map((f) => <span key={f} className="text-[11px] px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded-full">{f}</span>)}
                  </div>
                  {m.reason && <p className="text-xs mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded">AI: {m.reason}</p>}
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Link href={`/apply/${m.scheme.id}`} className="text-xs px-3 py-1.5 bg-black text-white rounded-lg hover:bg-zinc-800">Apply Now →</Link>
                <Link href={`/apply/${m.scheme.id}`} className="text-xs px-3 py-1.5 border rounded-lg hover:bg-zinc-50">Docs: {m.scheme.documents_required.length}</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="p-3 border-t bg-zinc-50 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask — e.g. farmer with 1 acre, income 1 lakh"
          className="flex-1 p-2.5 border rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button onClick={toggleListen} title="Voice" className={`px-3 py-2 rounded-lg border text-sm ${listening ? "bg-red-600 text-white animate-pulse" : "bg-white hover:bg-zinc-900 hover:text-white"}`}>{listening ? "● Listening" : "🎙️ Voice"}</button>
        <button onClick={() => send(undefined, true)} disabled={loading || streaming || !input.trim()} className="px-5 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50 hover:bg-zinc-800">Send</button>
      </div>
      <p className="px-4 pb-3 text-[11px] text-zinc-500">Powered by <code>gemini-2.5-flash</code> + <code>text-embedding-004</code> RAG (top 8) • Grounded in <code>schemes.json (94)</code> • Routes: <code>POST /api/ai/chat</code> <code>/stream</code> • Voice: Web Speech API • English only</p>
    </div>
  );
}
