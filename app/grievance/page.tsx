"use client";
import { useState } from "react";

export default function GrievancePage() {
  const [submitted, setSubmitted] = useState(false);
  const [grievanceId, setGrievanceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const aadhaarNumber = (formData.get("aadhaarNumber") as string | null)?.replace(/\s/g, "") || null;
    const contact = formData.get("contact") as string | null;
    const description = formData.get("description") as string;

    // Frontend → Backend → MongoDB: POST /api/grievances → Grievance collection
    if (!description?.trim()) {
      setError("Please describe your grievance");
      setLoading(false);
      return;
    }
    if (aadhaarNumber && !/^\d{12}$/.test(aadhaarNumber)) {
      setError("Aadhaar must be 12 digits (e.g. 123456789012)");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/grievances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aadhaarNumber,
          aadhaarLast4: aadhaarNumber ? aadhaarNumber.slice(-4) : null,
          contact,
          description,
          schemeId: null,
          referenceNumber: null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Submission failed");
      }

      setSubmitted(true);
      setGrievanceId(result.grievanceId);
    } catch (err) {
      console.error("Grievance submission error:", err);
      setError((err as Error).message || "Failed to submit. Check MongoDB connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">
          Lodge a Grievance
        </h1>

        {submitted ? (
          <div className="border rounded p-6 mt-6 text-center">
            <p className="text-green-600 text-2xl mb-2">
              Grievance submitted successfully! Grievance ID: {grievanceId}
            </p>
            <p className="text-sm text-muted-foreground">
              You\u0027ll receive a response within 48 hours. Track your grievance status below.
            </p>
          </div>
        ) : (
          <div className="border rounded p-6 mb-6">
            <h2 className="text-xl font-bold mb-6">Grievance Redressal</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Aadhaar Number (12 digits) *
                </label>
                <input
                  name="aadhaarNumber"
                  type="text"
                  placeholder="123456789012"
                  inputMode="numeric"
                  maxLength={12}
                  pattern="\d{12}"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-[11px] text-zinc-500 mt-1">Full 12-digit Aadhaar for verification. Stored as <code>aadhaarNumber</code> in MongoDB (also saves last 4).</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contact email / mobile
                </label>
                <input
                  name="contact"
                  type="text"
                  placeholder="test@welfare.gov.in / 9999999999"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Describe your grievance (scheme name, issue, reference number) *
                </label>
                <textarea
                  name="description"
                  rows={4}
                  required
                  placeholder="Describe your grievance (scheme name, issue, reference number)"
                  className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5">
                  {error} — check Backend → MongoDB connection
                </div>
              )}
              <div className="text-xs text-zinc-500">
                Frontend → <code className="px-1 bg-zinc-100 rounded">POST /api/grievances</code> → Backend → MongoDB <code className="px-1 bg-zinc-100 rounded">grievances</code> collection
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting to MongoDB..." : "Submit Grievance"}
              </button>
            </form>
          </div>
        )}

        {grievanceId && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              Track your grievance: <a
                href={`/api/grievances?id=${grievanceId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Check Status
              </a>
            </p>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            All grievances are tracked with tamper-evident audit logs. Your data is
            processed per DPDP Act 2023 — consent required for any follow-up contact.
          </p>
        </div>
      </div>
    </main>
  );
}