import schemes from "@/app/data/schemes.json";
import { getGeminiNew, GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_FALLBACK, hasGeminiKey } from "@/app/lib/gemini";

// Lightweight RAG: embedding + cosine similarity. Falls back to keyword score when no key.
let cachedEmbeddings: { id: string; vector: number[] }[] | null = null;

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) + 1e-9);
}

// Build in-memory keyword vector for fallback (TF-ish over category + desc)
function keywordScore(query: string, scheme: any): number {
  const q = query.toLowerCase();
  const hay = `${scheme.id} ${scheme.name} ${scheme.description} ${scheme.category} ${scheme.benefits?.join(" ")}`.toLowerCase();
  let score = 0;
  for (const tok of q.split(/\W+/).filter(Boolean)) {
    if (hay.includes(tok)) score += 1;
  }
  // boost exact category mention
  if (q.includes(scheme.category)) score += 2;
  // income hint
  if (q.includes("farmer") && scheme.category==="farmer") score+=1.5;
  if (q.includes("weaver") && scheme.category==="handloom") score+=2;
  return score;
}

export async function retrieveTopSchemes(query: string, topK = 8): Promise<{ scheme: any; score: number; reason: string }[]> {
  const all = schemes as any[];
  // Try Gemini embeddings if key available
  if (hasGeminiKey()) {
    try {
      const genAI = getGeminiNew();
      if (genAI) {
        // Lazy build embeddings once
        if (!cachedEmbeddings) {
          // Build all scheme embeddings in parallel (batch to avoid rate limit)
          const chunk = 10;
          cachedEmbeddings = [];
          for (let i=0;i<all.length;i+=chunk) {
            const batch = all.slice(i, i+chunk);
            const res = await Promise.all(batch.map(async (s) => {
              const text = `${s.name} ${s.description} category:${s.category} benefits:${s.benefits?.join(",")} eligibility:${JSON.stringify(s.eligibility)}`;
              try {
                let r: any;
                try {
                  r = await genAI.models.embedContent({ model: GEMINI_EMBEDDING_MODEL, contents: [{ parts: [{ text }] }] });
                } catch {
                  r = await genAI.models.embedContent({ model: GEMINI_EMBEDDING_FALLBACK, contents: [{ parts: [{ text }] }] });
                }
                const vec = r.embeddings?.[0]?.values || r.embedding?.values;
                return { id: s.id, vector: vec || [] };
              } catch { return { id: s.id, vector: [] }; }
            }));
            cachedEmbeddings.push(...res.filter(r=>r.vector.length>0));
            if (cachedEmbeddings.length === 0) throw new Error("no embeddings");
          }
        }
        // Query embedding with fallback
        let qRes: any;
        try {
          qRes = await genAI.models.embedContent({ model: GEMINI_EMBEDDING_MODEL, contents: [{ parts: [{ text: query }] }] });
        } catch {
          qRes = await genAI.models.embedContent({ model: GEMINI_EMBEDDING_FALLBACK, contents: [{ parts: [{ text: query }] }] });
        }
        const qVec = qRes.embeddings?.[0]?.values || qRes.embedding?.values;
        if (qVec && cachedEmbeddings.length > 0) {
          const scored = all.map((s) => {
            const e = cachedEmbeddings!.find(c=>c.id===s.id);
            const sim = e ? cosine(qVec, e.vector) : 0;
            return { scheme: s, score: sim, reason: `embedding cosine ${sim.toFixed(3)}` };
          }).sort((a,b)=>b.score-a.score).slice(0, topK);
          if (scored[0].score > 0.05) return scored;
        }
      }
    } catch (e) {
      console.warn("embed retrieval fallback:", (e as Error).message);
    }
  }
  // Fallback keyword
  const kw = all.map((s)=> ({ scheme:s, score: keywordScore(query, s), reason: "keyword" }))
    .sort((a,b)=>b.score-a.score).slice(0, topK).filter(r=>r.score>0);
  if (kw.length===0) return all.slice(0, topK).map(s=> ({ scheme:s, score:0.1, reason:"default" }));
  return kw;
}

export function clearEmbeddingCache(){ cachedEmbeddings=null; }
