"use client";
import React from "react";

export default function DocAnalyzer({ schemeId }: { schemeId: string }) {
  const [docs, setDocs] = React.useState("");
  const [income, setIncome] = React.useState("");
  const [state, setState] = React.useState("");
  const [lang, setLang] = React.useState("en");
  const [result, setResult] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [fileInfo, setFileInfo] = React.useState<{ base64?: string; mime?: string; name?: string } | null>(null);

  const onFile = (f: File | null) => {
    if (!f) { setFileInfo(null); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      setFileInfo({ base64: b64, mime: f.type, name: f.name });
    };
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemeId,
          documents: docs.split(",").map((s) => s.trim()).filter(Boolean),
          language: lang,
          applicantIncome: income ? Number(income) : undefined,
          applicantState: state || undefined,
          fileBase64: fileInfo?.base64,
          mimeType: fileInfo?.mime,
          fileName: fileInfo?.name,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ success: false, error: (e as Error).message });
    } finally { setLoading(false); }
  };

  return (
    <div className="border rounded-xl bg-white p-4 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2">AI Document Check <span className="text-xs px-2 py-0.5 bg-black text-white rounded-full">Gemini Vision</span></h3>
      <p className="text-xs text-zinc-600">Gemini validates completeness + eligibility + optional OCR.</p>
      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium">Documents you have (comma-separated)</label>
          <input value={docs} onChange={(e) => setDocs(e.target.value)} placeholder="Aadhaar, Land records, Bank account" className="w-full p-2 border rounded-lg text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium">Upload file for AI OCR (optional)</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => onFile(e.target.files?.[0] || null)} className="w-full text-xs mt-1 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-black file:text-white" />
          {fileInfo && <span className="text-xs text-green-600">✓ {fileInfo.name}</span>}
        </div>
        <div>
          <label className="text-xs font-medium">Income (₹)</label>
          <input value={income} onChange={(e) => setIncome(e.target.value)} type="number" placeholder="120000" className="w-full p-2 border rounded-lg text-sm mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium">State + Language</label>
          <div className="flex gap-2 mt-1">
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Bihar" className="flex-1 p-2 border rounded-lg text-sm" />
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="p-2 border rounded-lg text-sm bg-white">
              <option value="en">EN</option><option value="hi">HI</option>
            </select>
          </div>
        </div>
      </div>
      <button onClick={analyze} disabled={loading} className="mt-3 w-full py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50">{loading ? "Analyzing with Gemini…" : "Analyze with AI"}</button>
      {result && (
        <div className="mt-3 border rounded-lg p-3 bg-zinc-50 text-sm">
          {result.success ? (
            <>
              <p><span className="font-medium">Completeness:</span> {result.completeness}% — <span className={result.completeness === 100 ? "text-green-600" : "text-amber-600"}>{result.missing?.length ? `Missing: ${result.missing.join(", ")}` : "All docs ready ✓"}</span></p>
              <p className="mt-1"><span className="font-medium">Eligible:</span> <span className={result.eligibility?.eligible ? "text-green-600" : "text-red-600"}>{result.eligibility?.eligible ? "Likely YES ✓" : "Check required"}</span> {result.eligibility?.incomeOk === false && "(income exceeds)"} {result.eligibility?.stateOk === false && "(state not covered)"}</p>
              {result.aiAdvice && <p className="mt-2 p-2 bg-white border rounded">AI: {result.aiAdvice}</p>}
              {result.vision && <pre className="mt-2 text-xs bg-black text-white p-2 rounded overflow-auto">{JSON.stringify(result.vision, null, 2)}</pre>}
              <p className="text-[11px] text-zinc-500 mt-1">Model: {result.model}</p>
            </>
          ) : <p className="text-red-600">{result.error}</p>}
        </div>
      )}
    </div>
  );
}
