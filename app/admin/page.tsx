"use client";
import React from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.success && setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-zinc-500">Loading dashboard…</div>;
  if (!data) return <div className="text-sm text-red-600">Failed to load stats. Ensure you are admin.</div>;

  const { stats, breakdown, recent } = data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-zinc-500">Overview of schemes, users, applications, grievances & customer service</p>
        <div className="mt-2 text-xs bg-amber-50 border border-amber-200 px-3 py-2 rounded">
          Demo admins: <b>admin@welfare.gov.in / Admin1234</b> (admin), <b>staff@welfare.gov.in / Staff1234</b> (staff), demo user: <b>demo@welfare.gov.in / demo123</b>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card label="Users" value={stats.users} href="/admin/users" />
        <Card label="Schemes" value={stats.schemes} href="/admin/schemes" sub="94 total" />
        <Card label="Applications" value={stats.applications} href="/admin/applications" />
        <Card label="Grievances" value={stats.grievances} href="/admin/grievances" />
        <Card label="Tickets" value={stats.tickets} href="/admin/customer-service" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Breakdown title="Applications by status" data={breakdown.appByStatus} />
        <Breakdown title="Grievances by status" data={breakdown.grievByStatus} />
        <Breakdown title="Tickets by status" data={breakdown.ticketByStatus} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-2">Recent Applications</h3>
          {recent.applications.length === 0 ? <p className="text-sm text-zinc-500">No data</p> : recent.applications.map((a: any) => (
            <div key={a._id} className="text-xs py-1.5 border-b last:border-0 flex justify-between">
              <span className="truncate">{a.schemeName} — {a.applicantName}</span>
              <span className="ml-2 text-zinc-500">{a.status}</span>
            </div>
          ))}
          <Link href="/admin/applications" className="text-xs text-blue-600 hover:underline mt-2 inline-block">View all →</Link>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-2">Recent Tickets</h3>
          {recent.tickets.length === 0 ? <p className="text-sm text-zinc-500">No tickets</p> : recent.tickets.map((t: any) => (
            <div key={t._id} className="text-xs py-1.5 border-b last:border-0">
              <div className="flex justify-between"><span className="font-medium truncate">{t.subject}</span><span className={`px-1.5 py-0.5 rounded text-[10px] ${t.status==="open"?"bg-red-100 text-red-700": t.status==="resolved"?"bg-green-100 text-green-700":"bg-zinc-100"}`}>{t.status}</span></div>
              <div className="text-zinc-500">{t.email} • {t.category}</div>
            </div>
          ))}
          <Link href="/admin/customer-service" className="text-xs text-blue-600 hover:underline mt-2 inline-block">Manage tickets →</Link>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, href, sub }: any) {
  return (
    <Link href={href} className="bg-white border rounded-lg p-4 hover:shadow-sm transition">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-[11px] text-zinc-400">{sub}</div>}
    </Link>
  );
}
function Breakdown({ title, data }: any) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-sm font-medium mb-2">{title}</h3>
      {(!data || data.length===0) ? <p className="text-xs text-zinc-500">—</p> : data.map((d: any) => (
        <div key={d._id} className="flex justify-between text-xs py-1">
          <span className="capitalize">{String(d._id)}</span><span>{d.count}</span>
        </div>
      ))}
    </div>
  );
}
