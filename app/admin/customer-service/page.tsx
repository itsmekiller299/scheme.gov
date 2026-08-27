"use client";
import React from "react";

export default function AdminTickets() {
  const [tickets,setTickets]=React.useState<any[]>([]);
  const [filter,setFilter]=React.useState("");
  const [selected,setSelected]=React.useState<any>(null);
  const [reply,setReply]=React.useState("");
  const [loading,setLoading]=React.useState(true);

  const load=React.useCallback(()=>{
    const q= filter? `?status=${filter}`:"";
    fetch(`/api/admin/tickets${q}`,{cache:"no-store"}).then(r=>r.json()).then(d=>d.success&&setTickets(d.tickets)).finally(()=>setLoading(false));
  },[filter]);

  React.useEffect(()=>{ load(); },[load]);

  const openTicket= async(id:string)=>{
    const r=await fetch(`/api/customer-service?ticketId=${id}`,{cache:"no-store"});
    const d=await r.json(); if(d.success) setSelected(d.ticket);
  };

  const updateStatus= async(ticketId:string, status:string)=>{
    const r=await fetch("/api/customer-service",{method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ticketId,status})});
    const d=await r.json(); if(d.success){ setSelected(d.ticket); load(); } else alert(d.error);
  };

  const sendReply= async()=>{
    if(!selected||!reply.trim()) return;
    const r=await fetch("/api/admin/tickets",{method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ticketId:selected.ticketId, message:reply})});
    const d=await r.json(); if(d.success){ setSelected(d.ticket); setReply(""); load(); } else alert(d.error);
  };

  if(loading) return <div className="text-sm text-zinc-500">Loading…</div>;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Customer Service ({tickets.length})</h1>
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="text-sm border rounded px-2 py-1">
            <option value="">All</option><option value="open">open</option><option value="in_progress">in_progress</option><option value="resolved">resolved</option><option value="closed">closed</option>
          </select>
        </div>
        <div className="bg-white border rounded-lg divide-y max-h-[70vh] overflow-auto">
          {tickets.length===0? <p className="p-4 text-sm text-zinc-500">No tickets</p> :
            tickets.map((t:any)=>(
              <button key={t.ticketId} onClick={()=>openTicket(t.ticketId)} className={`w-full text-left p-3 hover:bg-zinc-50 ${selected?.ticketId===t.ticketId?"bg-zinc-100":""}`}>
                <div className="flex justify-between"><span className="font-medium text-sm truncate">{t.subject}</span><span className={`text-[10px] px-1.5 py-0.5 rounded ${t.status==="open"?"bg-red-100 text-red-700": t.status==="resolved"?"bg-green-100 text-green-700":"bg-zinc-100"}`}>{t.status}</span></div>
                <div className="text-xs text-zinc-500">{t.email} • {t.category} • {t.priority}</div>
                <div className="text-xs truncate text-zinc-600">{t.description}</div>
              </button>
            ))
          }
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        {!selected? <p className="text-sm text-zinc-500">Select a ticket →</p> : (
          <div className="space-y-3">
            <div>
              <h2 className="font-semibold">{selected.subject}</h2>
              <p className="text-xs text-zinc-500">{selected.ticketId} • {selected.email} • {selected.category} • {selected.priority}</p>
              <div className="flex gap-2 mt-2">
                <select value={selected.status} onChange={e=>updateStatus(selected.ticketId, e.target.value)} className="text-xs border rounded px-2 py-1">
                  <option value="open">open</option><option value="in_progress">in_progress</option><option value="waiting">waiting</option><option value="resolved">resolved</option><option value="closed">closed</option>
                </select>
                <span className="text-xs text-zinc-400">Updated: {new Date(selected.updatedAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="border-t pt-3 space-y-2 max-h-[40vh] overflow-auto">
              {selected.messages?.map((m:any, idx:number)=>(
                <div key={idx} className={`p-2 rounded text-sm ${m.senderRole==="admin"||m.senderRole==="staff" ? "bg-blue-50 border border-blue-100 ml-4":"bg-zinc-50 border ml-0 mr-4"}`}>
                  <div className="text-xs text-zinc-500 flex justify-between"><span>{m.sender} ({m.senderRole})</span><span>{new Date(m.at).toLocaleString()}</span></div>
                  <div>{m.message}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={reply} onChange={e=>setReply(e.target.value)} placeholder="Reply as admin/staff…" className="flex-1 border rounded px-2 py-2 text-sm" />
              <button onClick={sendReply} className="bg-black text-white px-4 rounded text-sm">Reply</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
