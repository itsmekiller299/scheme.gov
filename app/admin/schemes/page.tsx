"use client";
import React from "react";

export default function AdminSchemes() {
  const [schemes,setSchemes]=React.useState<any[]>([]);
  const [filter,setFilter]=React.useState("");
  const [loading,setLoading]=React.useState(true);

  const load=React.useCallback(()=>{
    fetch("/api/schemes",{cache:"no-store"}).then(r=>r.json()).then(d=> d.success && setSchemes(d.schemes));
  },[]);
  React.useEffect(()=>{ load(); setLoading(false); },[load]);

  const filtered= schemes.filter((s:any)=> !filter || s.category===filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Schemes ({filtered.length}/94)</h1>
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="text-sm border rounded px-2 py-1">
          <option value="">All categories</option>
          {[...new Set(schemes.map((s:any)=>s.category))].map((c:any)=> <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="bg-white border rounded-lg divide-y max-h-[70vh] overflow-auto">
        {filtered.map((s:any)=>(
          <div key={s.id} className="p-3 flex justify-between gap-4">
            <div>
              <div className="font-medium text-sm">{s.name} <span className="text-xs text-zinc-500">({s.id})</span></div>
              <div className="text-xs text-zinc-600 line-clamp-2">{s.description}</div>
              <div className="text-[11px] mt-1"><span className="bg-zinc-100 px-1.5 py-0.5 rounded">{s.category}</span> <span className="text-zinc-400">{s.state_coverage.join(",")}</span></div>
            </div>
            <a href={`/apply/${s.id}`} target="_blank" className="text-xs text-blue-600 hover:underline self-start">Apply →</a>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">Admin can add/edit via API: POST /api/admin/schemes (admin only). Handloom: 6 schemes.</p>
    </div>
  );
}
