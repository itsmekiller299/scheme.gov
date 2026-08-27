"use client";
import React from "react";

export default function AdminApplications() {
  const [list, setList] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(()=>{
    const q = status? `?status=${status}`:"";
    fetch(`/api/admin/applications${q}`, {cache:"no-store"}).then(r=>r.json()).then(d=> d.success && setList(d.applications)).finally(()=>setLoading(false));
  },[status]);
  React.useEffect(()=>{ setLoading(true); load(); },[load]);

  const update = async (id:string, newStatus:string)=>{
    const res = await fetch("/api/admin/applications", {method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, status:newStatus })});
    const d= await res.json(); if(d.success) load(); else alert(d.error);
  };

  if(loading) return <div className="text-sm text-zinc-500">Loading…</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Applications ({list.length})</h1>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="text-sm border rounded px-2 py-1">
          <option value="">All status</option>
          <option value="submitted">submitted</option><option value="under_review">under_review</option><option value="approved">approved</option><option value="rejected">rejected</option>
        </select>
      </div>
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="p-2 text-left">Scheme</th><th className="p-2 text-left">Applicant</th><th className="p-2">Email</th><th className="p-2">Status</th><th className="p-2">Docs</th><th className="p-2">Action</th></tr></thead>
          <tbody>
            {list.map((a:any)=>(
              <tr key={a._id} className="border-t">
                <td className="p-2 max-w-[150px] truncate">{a.schemeName} <span className="text-xs text-zinc-400">({a.schemeId})</span></td>
                <td className="p-2">{a.applicantName}</td>
                <td className="p-2 text-xs">{a.email}</td>
                <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${a.status==="approved"?"bg-green-100 text-green-700": a.status==="rejected"?"bg-red-100 text-red-700":"bg-zinc-100"}`}>{a.status}</span></td>
                <td className="p-2 text-xs">{a.documents?.map((d:any)=> <div key={d.name} className="flex gap-1"><span>{d.name}</span>{d.fileUrl && <a href={d.fileUrl} target="_blank" className="text-blue-600 underline">View</a>}</div>)}</td>
                <td className="p-2">
                  <select value={a.status} onChange={e=>update(a._id, e.target.value)} className="text-xs border rounded px-1 py-1">
                    <option value="submitted">submitted</option><option value="under_review">under_review</option><option value="approved">approved</option><option value="rejected">rejected</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
