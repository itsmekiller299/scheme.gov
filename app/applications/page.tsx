"use client";

import Link from "next/link";
import React from "react";

interface AppData {
  _id: string;
  schemeId: string;
  schemeName: string;
  applicantName: string;
  email: string;
  status: string;
  documents_required: string[];
  documents: { name: string; provided: boolean; fileUrl?: string; fileName?: string }[];
  createdAt: string;
}

export default function ApplicationsPage() {
  const [apps, setApps] = React.useState<AppData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterEmail, setFilterEmail] = React.useState("");

  const load = React.useCallback(async (email?: string) => {
    setLoading(true);
    try {
      const url = email ? `/api/applications?email=${encodeURIComponent(email)}` : "/api/applications";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setApps(data.applications);
    } catch {}
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="flex-1 bg-zinc-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">My Applications</h1>
        <p className="text-sm text-zinc-600">Stored in MongoDB <code className="bg-white border px-1 rounded">applications</code> collection • Frontend → <code className="bg-white border px-1 rounded">GET /api/applications</code></p>

        <div className="mt-4 flex gap-2">
          <input
            placeholder="Filter by email"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            className="flex-1 max-w-xs p-2 border rounded-lg bg-white"
          />
          <button onClick={() => load(filterEmail)} className="px-4 py-2 bg-black text-white rounded-lg text-sm">Search</button>
          <button onClick={() => { setFilterEmail(""); load(); }} className="px-4 py-2 border bg-white rounded-lg text-sm">Clear</button>
        </div>

        {loading ? (
          <div className="mt-6 text-center text-sm text-zinc-600">Loading from MongoDB...</div>
        ) : apps.length === 0 ? (
          <div className="mt-6 border rounded-xl p-8 bg-white text-center">
            <p className="text-zinc-600">No applications found. Apply for a scheme first.</p>
            <Link href="/" className="inline-block mt-3 px-4 py-2 bg-black text-white rounded-lg text-sm">Browse Schemes</Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {apps.map((a) => (
              <div key={a._id} className="border rounded-xl p-4 bg-white shadow-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{a.schemeName} <span className="text-xs text-zinc-500">({a.schemeId})</span></h3>
                    <p className="text-xs text-zinc-600">{a.applicantName} • {a.email} • {new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border h-fit ${a.status === "submitted" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-green-50 border-green-200 text-green-700"}`}>{a.status}</span>
                </div>
                <div className="mt-2 text-xs">
                  <span className="font-medium">Documents:</span> {a.documents_required.join(", ")}
                </div>
                <div className="mt-1 flex gap-1 flex-wrap">
                  {a.documents.map((d) => (
                    <span key={d.name} className={`text-[11px] px-2 py-0.5 rounded-full border ${d.provided ? "bg-green-50 border-green-200 text-green-700" : "bg-zinc-50 border-zinc-200 text-zinc-500"}`}>
                      {d.name} {d.provided ? "✓" : "○"}
                      {d.fileUrl && (
                        <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline">
                          View
                        </a>
                      )}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-[11px] font-mono text-zinc-500 break-all">ID: {a._id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
