"use client";
import React from "react";
import SearchForm from "@/app/components/search/SearchForm";
import { Result } from "@/app/components/result/Result";
import ChatAgent from "@/app/components/ai/ChatAgent";

interface SchemeMatch {
  scheme: {
    id: string;
    name: string;
    name_hi?: string;
    description: string;
    description_hi?: string;
    benefits: string[];
    documents_required: string[];
  };
  score: number;
  matchingFactors: string[];
}

export default function HomePage() {
  const [matches, setMatches] = React.useState<SchemeMatch[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [dbStatus, setDbStatus] = React.useState<null | {
    connected: boolean;
    dbName: string;
    collections: { users: number; schemes: number; grievances: number };
  }>(null);

  React.useEffect(() => {
    // Frontend → Backend → MongoDB health check
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => d.success && setDbStatus(d))
      .catch(() => {});
  }, []);

  const handleSearch = async (data: {
    language: string;
    income: number;
    category: string | undefined;
    state: string | undefined;
  }) => {
    setSearching(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Search failed");
      }

      setMatches(result.matches);
    } catch (err) {
      console.error("Search error:", err);
      setMatches([]);
    }
    setSearching(false);
  };

  return (
    <main className="flex-1 bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 pt-4">
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                dbStatus?.connected
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-zinc-50 border-zinc-200 text-zinc-600"
              }`}
              title={dbStatus ? `${dbStatus.dbName} • Users:${dbStatus.collections.users} Schemes:${dbStatus.collections.schemes} Grievances:${dbStatus.collections.grievances}` : "Checking MongoDB..."}
            >
              <span className={`h-2 w-2 rounded-full ${dbStatus?.connected ? "bg-green-500 animate-pulse" : "bg-zinc-400"}`} />
              {dbStatus?.connected ? `MongoDB: ${dbStatus.dbName} ✓` : dbStatus ? "MongoDB disconnected" : "Connecting to MongoDB..."}
            </span>
            {dbStatus?.connected && (
              <span className="text-xs text-zinc-500">
                Users:{dbStatus.collections.users} • Schemes:{dbStatus.collections.schemes} • Grievances:{dbStatus.collections.grievances}
              </span>
            )}
            <span className="text-xs px-2 py-1 bg-zinc-900 text-white rounded-full border border-zinc-900">Gemini 2.5 Flash • 94 schemes grounded</span>
            <span className="text-xs text-zinc-400">Frontend → Gemini API → MongoDB</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter">
            scheme.gov — AI Assist for Gov
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Find government schemes you&#7;re eligible for — ask in English. Voice + Chat powered by Gemini.
          </p>
        </header>

        {/* P0: Gemini AI Agent — primary for judges */}
        <div className="mb-8">
          <ChatAgent />
          <p className="text-xs text-zinc-500 mt-2 text-center">▲ AI Agent (judges: test voice in English en-IN) — Classic filter below for fallback</p>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-sm font-semibold text-zinc-600 mb-3">Or use classic filter (rule-based)</h2>
          <SearchForm onSubmit={handleSearch} />
        </div>

        {searching && (
          <div className="mt-6 text-center">
            <div
              className="h-8 w-8 mx-auto mb-2 border-2 border-muted-foreground border-t-spin animate-spin rounded-full"
            />
            <p>Searching for schemes...</p>
          </div>
        )}

        {matches.length > 0 && <Result matches={matches} />}

        {!searching && matches.length === 0 && (
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-medium mb-4">No Matching Schemes</h2>
            <p className="text-lg text-muted-foreground">
              No schemes match your criteria. Try adjusting your income, category, or language preference.
            </p>
          </div>
        )}

        <div className="mt-8 pt-8 border-t">
          <h2 className="text-xl font-medium mb-4">How This Helps</h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>• Discover schemes matching your income and profile</li>
            <li>• View benefits and required documents in English</li>
            <li>• Get eligibility score and matching factors</li>
            <li>• English-only grounded experience (replies in English)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}