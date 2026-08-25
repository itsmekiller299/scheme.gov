"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React from "react";

interface Scheme {
  id: string;
  name: string;
  name_hi?: string;
  description: string;
  description_hi?: string;
  eligibility: any;
  benefits: string[];
  benefits_hi?: string[];
  documents_required: string[];
  documents_required_hi?: string[];
  category: string;
  state_coverage: string[];
}

export default function ApplyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const schemeId = params.id as string;

  const [scheme, setScheme] = React.useState<Scheme | null>(null);
  const [loadingScheme, setLoadingScheme] = React.useState(true);
  const [schemeError, setSchemeError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [appError, setAppError] = React.useState("");
  const [successId, setSuccessId] = React.useState<string | null>(null);

  // form state
  const [form, setForm] = React.useState({
    applicantName: "",
    email: "",
    phone: "",
    aadhaarLast4: "",
    state: "",
    income: "",
    address: "",
  });
  const [docsChecked, setDocsChecked] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/schemes?id=${encodeURIComponent(schemeId)}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Scheme not found");
        setScheme(data.scheme);
        // init checklist false
        const init: Record<string, boolean> = {};
        data.scheme.documents_required.forEach((d: string) => (init[d] = false));
        setDocsChecked(init);
      } catch (e) {
        setSchemeError((e as Error).message);
      } finally {
        setLoadingScheme(false);
      }
    }
    load();
  }, [schemeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDocToggle = (doc: string) => {
    setDocsChecked((prev) => ({ ...prev, [doc]: !prev[doc] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppError("");
    if (!scheme) return;
    if (!form.applicantName || !form.email || !form.phone) {
      setAppError("Name, email and phone are required");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        schemeId: scheme.id,
        schemeName: scheme.name,
        applicantName: form.applicantName,
        email: form.email,
        phone: form.phone,
        aadhaarLast4: form.aadhaarLast4 || null,
        state: form.state || null,
        income: form.income ? Number(form.income) : null,
        address: form.address || null,
        documents_required: scheme.documents_required,
        documents: docsChecked,
      };

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Application failed");

      setSuccessId(data.applicationId);
    } catch (err) {
      setAppError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingScheme) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-3 border-2 border-zinc-300 border-t-black animate-spin rounded-full" />
          <p className="text-sm text-zinc-600">Loading scheme...</p>
        </div>
      </main>
    );
  }

  if (schemeError || !scheme) {
    return (
      <main className="flex-1 p-6 max-w-2xl mx-auto">
        <div className="border border-red-200 bg-red-50 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium">{schemeError || "Scheme not found"}</p>
          <Link href="/" className="inline-block mt-4 text-sm px-4 py-2 bg-black text-white rounded-lg">
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (successId) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center">
        <div className="max-w-lg w-full border rounded-xl p-8 bg-white shadow-sm text-center">
          <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-green-100 grid place-items-center text-green-600 text-xl">✓</div>
          <h2 className="text-2xl font-semibold">Application Submitted!</h2>
          <p className="text-sm text-zinc-600 mt-2">
            Your application for <span className="font-medium text-black">{scheme.name}</span> has been saved to MongoDB.
          </p>
          <div className="mt-4 p-3 bg-zinc-50 border rounded-lg text-xs font-mono break-all">
            Application ID: {successId}
          </div>
          <div className="mt-2 p-3 bg-zinc-900 text-white rounded-lg text-xs text-left">
            <p>Backend: <code>POST /api/applications</code> → <code>applications</code> collection</p>
            <p className="mt-1 text-zinc-400">Documents: {scheme.documents_required.join(", ")}</p>
          </div>
          <div className="mt-6 flex gap-2 justify-center">
            <Link href="/" className="px-5 py-2 border rounded-lg text-sm hover:bg-zinc-50">
              Home
            </Link>
            <a
              href={`/api/applications?id=${successId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 bg-black text-white rounded-lg text-sm hover:bg-zinc-800"
            >
              View in DB
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-zinc-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm text-zinc-600 hover:text-black">← Back to schemes</Link>

        {/* Scheme header */}
        <div className="mt-4 border rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">
                {scheme.name} {scheme.name_hi && <span className="text-base font-normal text-zinc-500">({scheme.name_hi})</span>}
              </h1>
              <p className="text-sm text-zinc-600 mt-1">
                {scheme.description} {scheme.description_hi && <span className="text-zinc-500">({scheme.description_hi})</span>}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-xs px-2 py-1 bg-zinc-900 text-white rounded-full">{scheme.category}</span>
                <span className="text-xs px-2 py-1 border rounded-full">{scheme.state_coverage.join(", ")}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
            <div className="border rounded-lg p-3 bg-zinc-50">
              <h3 className="font-medium mb-1">Benefits</h3>
              <ul className="list-disc list-inside text-zinc-700 space-y-0.5">
                {scheme.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              {scheme.benefits_hi && (
                <ul className="list-disc list-inside text-zinc-500 mt-1 space-y-0.5">
                  {scheme.benefits_hi.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
              <h3 className="font-medium mb-1">Required Documents *</h3>
              <p className="text-xs text-zinc-600 mb-2">Keep these ready before applying. Check each when you have it.</p>
              <div className="space-y-1.5">
                {scheme.documents_required.map((doc, idx) => (
                  <label key={doc} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!docsChecked[doc]}
                      onChange={() => handleDocToggle(doc)}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                    />
                    <span className="flex-1">
                      <span className="font-medium">{doc}</span>
                      {scheme.documents_required_hi?.[idx] && (
                        <span className="text-zinc-500"> — {scheme.documents_required_hi[idx]}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-amber-700 mt-2">You can submit even if some are pending — status will be “submitted”.</p>
            </div>
          </div>

          {scheme.eligibility && (
            <div className="mt-3 text-xs text-zinc-600 border rounded-lg p-3 bg-white">
              <span className="font-medium">Eligibility:</span>{" "}
              {scheme.eligibility.max_income && `Income ≤ ₹${scheme.eligibility.max_income} • `}
              {scheme.eligibility.min_landholding !== undefined && `Landholding ${scheme.eligibility.min_landholding}-${scheme.eligibility.max_landholding} ha • `}
              {scheme.eligibility.caste && `Caste: ${scheme.eligibility.caste.join(", ")} • `}
              {scheme.eligibility.age_min && `Age ${scheme.eligibility.age_min}-${scheme.eligibility.age_max} • `}
              State: {scheme.state_coverage.join(", ")}
            </div>
          )}
        </div>

        {/* Application form */}
        <div className="mt-6 border rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Apply for {scheme.name}</h2>
          <p className="text-xs text-zinc-500 mb-4">
            Frontend → <code className="px-1 bg-zinc-100 rounded">POST /api/applications</code> → Backend → MongoDB <code className="px-1 bg-zinc-100 rounded">applications</code> collection
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Applicant Name *</label>
                <input
                  name="applicantName"
                  value={form.applicantName}
                  onChange={handleChange}
                  required
                  placeholder="Full name"
                  className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone *</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="9999999999"
                  className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Aadhaar (last 4 digits)</label>
                <input
                  name="aadhaarLast4"
                  value={form.aadhaarLast4}
                  onChange={handleChange}
                  maxLength={4}
                  placeholder="1234"
                  className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="e.g. Maharashtra"
                  className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Income (₹)</label>
                <input
                  name="income"
                  type="number"
                  value={form.income}
                  onChange={handleChange}
                  placeholder="50000"
                  className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={2}
                placeholder="Full address"
                className="w-full p-2.5 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="border rounded-lg p-3 bg-zinc-50">
              <p className="text-sm font-medium">Documents Checklist (required: {scheme.documents_required.length})</p>
              <p className="text-xs text-zinc-600 mb-2">Tick what you have. This is saved with your application in MongoDB.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {scheme.documents_required.map((doc) => (
                  <label key={doc} className="flex items-center gap-2 text-sm p-2 border rounded bg-white cursor-pointer hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={!!docsChecked[doc]}
                      onChange={() => handleDocToggle(doc)}
                      className="h-4 w-4"
                    />
                    {doc}
                    {docsChecked[doc] && <span className="ml-auto text-green-600 text-xs">✓ ready</span>}
                  </label>
                ))}
              </div>
            </div>

            {appError && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5">{appError}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
            >
              {submitting ? "Submitting to MongoDB..." : `Apply for ${scheme.name}`}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
