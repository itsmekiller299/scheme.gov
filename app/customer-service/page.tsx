"use client";
import React from "react";

export default function CustomerServiceUser() {
  const [tickets,setTickets]=React.useState<any[]>([]);
  const [subject,setSubject]=React.useState("");
  const [description,setDescription]=React.useState("");
  const [category,setCategory]=React.useState("general");
  const [priority,setPriority]=React.useState("medium");
  const [schemeId,setSchemeId]=React.useState("");
  const [selected,setSelected]=React.useState<any>(null);
  const [reply,setReply]=React.useState("");
  const [loading,setLoading]=React.useState(true);

  const load=React.useCallback(()=>{
    fetch("/api/customer-service",{cache:"no-store"}).then(r=>r.json()).then(d=> d.success && setTickets(d.tickets)).finally(()=>setLoading(false));
  },[]);
  React.useEffect(()=>{ load(); },[load]);

  const createTicket= async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!subject.trim()||!description.trim()) return alert("Subject & description required");
    const res= await fetch("/api/customer-service",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subject, description, category, priority, schemeId: schemeId||null })});
    const d=await res.json(); if(!d.success) return alert(d.error); setSubject("");setDescription("");setSchemeId(""); load();
  };

  const openTicket= async(ticketId:string)=>{
    const r=await fetch(`/api/customer-service?ticketId=${ticketId}`,{cache:"no-store"});
    const d=await r.json(); if(d.success) setSelected(d.ticket);
  };

  const sendReply= async()=>{
    if(!selected||!reply.trim()) return;
    const r=await fetch("/api/customer-service",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ticketId:selected.ticketId, message:reply})});
    const d=await r.json(); if(d.success){ setSelected(d.ticket); setReply(""); load(); } else alert(d.error);
  };

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Customer Service</h1>
        <p className="text-sm text-zinc-500">Get help for schemes, applications, handloom support etc. — response within 24h by staff/admin.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Create ticket */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Create Ticket</h2>
          <form onSubmit={createTicket} className="space-y-3">
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject (e.g. PM-KISAN payment not received)" className="w-full border rounded px-3 py-2 text-sm" />
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe your issue…" rows={4} className="w-full border rounded px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={category} onChange={e=>setCategory(e.target.value)} className="border rounded px-2 py-2 text-sm">
                <option value="general">general</option><option value="scheme">scheme</option><option value="application">application</option><option value="grievance">grievance</option><option value="technical">technical</option><option value="handloom">handloom</option><option value="other">other</option>
              </select>
              <select value={priority} onChange={e=>setPriority(e.target.value)} className="border rounded px-2 py-2 text-sm">
                <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option>
              </select>
            </div>
            <input value={schemeId} onChange={e=>setSchemeId(e.target.value)} placeholder="Scheme ID (optional, e.g. nhdp, pm-kisan)" className="w-full border rounded px-3 py-2 text-sm" />
            <button type="submit" className="w-full bg-black text-white rounded py-2 text-sm">Submit Ticket</button>
          </form>
          <p className="text-xs text-zinc-500 mt-2">You must be logged in. Tickets visible only to you + admin/staff.</p>
        </div>

        {/* My tickets */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-3">My Tickets ({tickets.length})</h2>
          {loading? <p className="text-sm text-zinc-500">Loading…</p> : tickets.length===0? <p className="text-sm text-zinc-500">No tickets yet.</p> :
            <div className="divide-y max-h-[400px] overflow-auto">
              {tickets.map((t:any)=>(
                <button key={t.ticketId} onClick={()=>openTicket(t.ticketId)} className={`w-full text-left p-2 hover:bg-zinc-50 ${selected?.ticketId===t.ticketId?"bg-zinc-100":""}`}>
                  <div className="flex justify-between"><span className="font-medium text-sm truncate">{t.subject}</span><span className={`text-[10px] px-1.5 py-0.5 rounded ${t.status==="open"?"bg-red-100 text-red-700": t.status==="resolved"?"bg-green-100 text-green-700":"bg-zinc-100"}`}>{t.status}</span></div>
                  <div className="text-xs text-zinc-500">{t.category} • {t.priority} • {new Date(t.createdAt).toLocaleDateString()}</div>
                </button>
              ))}
            </div>
          }
        </div>
      </div>

      {selected && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold">{selected.subject} <span className="text-xs font-normal text-zinc-500">({selected.ticketId})</span></h3>
          <p className="text-xs text-zinc-500">{selected.category} • {selected.priority} • {selected.status}</p>
          <div className="mt-3 space-y-2 max-h-[300px] overflow-auto border-t pt-3">
            {selected.messages?.map((m:any, i:number)=>(
              <div key={i} className={`p-2 rounded text-sm ${m.senderRole==="admin"||m.senderRole==="staff" ? "bg-blue-50 border border-blue-100":"bg-zinc-50 border"}`}>
                <div className="text-xs text-zinc-500 flex justify-between"><span>{m.sender} ({m.senderRole})</span><span>{new Date(m.at).toLocaleString()}</span></div>
                <div>{m.message}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input value={reply} onChange={e=>setReply(e.target.value)} placeholder="Reply…" className="flex-1 border rounded px-3 py-2 text-sm" />
            <button onClick={sendReply} className="bg-black text-white px-4 rounded text-sm">Reply</button>
          </div>
        </div>
      )}
    </main>
  );
}
