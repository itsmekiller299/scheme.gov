"use client";
import React from "react";

export default function AdminUsers() {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    fetch("/api/admin/users", { cache: "no-store" }).then(r=>r.json()).then(d=> d.success && setUsers(d.users)).finally(()=>setLoading(false));
  },[]);
  React.useEffect(()=>{ load(); },[load]);

  const changeRole = async (userId: string, role: string) => {
    const res = await fetch("/api/admin/users", { method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ userId, role }) });
    const d= await res.json(); if(d.success) load(); else alert(d.error);
  };

  if (loading) return <div className="text-sm text-zinc-500">Loading users…</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Users ({users.length})</h1>
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr><th className="p-2 text-left">Email</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">Role</th><th className="p-2 text-left">Created</th><th className="p-2">Action</th></tr>
          </thead>
          <tbody>
            {users.map((u:any)=>(
              <tr key={u._id} className="border-t">
                <td className="p-2 truncate max-w-[200px]">{u.email}</td>
                <td className="p-2">{u.name||"—"}</td>
                <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${u.role==="admin"?"bg-black text-white": u.role==="staff"?"bg-blue-100 text-blue-700":"bg-zinc-100"}`}>{u.role}</span></td>
                <td className="p-2 text-xs text-zinc-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-2">
                  <select value={u.role} onChange={e=>changeRole(u._id, e.target.value)} className="text-xs border rounded px-1 py-1">
                    <option value="user">user</option><option value="staff">staff</option><option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">Admin can promote users to staff/admin. Staff can handle tickets/applications/grievances but not change roles (UI enforces). Demo: admin@welfare.gov.in / Admin1234</p>
    </div>
  );
}
