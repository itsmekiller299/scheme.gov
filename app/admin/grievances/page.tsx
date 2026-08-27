"use client";
import React from "react";

export default function AdminGrievances() {
  const [list,setList]=React.useState<any[]>([]);
  const [loading,setLoading]=React.useState(true);
  const load=React.useCallback(()=>{ fetch("/api/admin/grievances",{cache:"no-store"}).then(r=>r.json()).then(d=>d.success&&setList(d.grievances)).finally(()=>setLoading(false)); },[]);
  React.useEffect(()=>load(),[load]);
  const update= async(id:string,status:string)=>{
    const res= await fetch("/api/admin/grievances",{method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({id,status})});
    const d=await res.json(); if(d.success) load(); else alert(d.error);
  };
  if(loading) return <div className="text-sm text-zinc-500">Loading…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Grievances ({list.length})</h1>
      <div className="bg-white border rounded-lg overflow-hidden">
        {list.length===0? <p className="p-4 text-sm text-zinc-500">No grievances</p> :
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500"><tr><th className="p-2 text-left">Description</th><th className="p-2">Status</th><th className="p-2">Contact</th><th className="p-2">Date</th><th className="p-2">Action</th></tr></thead>
            <tbody>
              {list.map((g:any)=>(
                <tr key={g._id} className="border-t">
                  <td className="p-2 max-w-[300px] truncate">{g.description}</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${g.status==="resolved"?"bg-green-100 text-green-700": g.status==="rejected"?"bg-red-100":"bg-zinc-100"}`}>{g.status}</span></td>
                  <td className="p-2 text-xs">{g.contact||"—"}</td>
                  <td className="p-2 text-xs">{new Date(g.createdAt).toLocaleDateString()}</td>
                  <td className="p-2">
                    <select value={g.status} onChange={e=>update(g._id, e.target.value)} className="text-xs border rounded px-1 py-1">
                      <option value="submitted">submitted</option><option value="in_progress">in_progress</option><option value="resolved">resolved</option><option value="rejected">rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}
