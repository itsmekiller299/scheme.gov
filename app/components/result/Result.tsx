"use client";
import Link from "next/link";

interface SchemeData {
  id: string;
  name: string;
  name_hi?: string;
  description: string;
  description_hi?: string;
  benefits: string[];
  documents_required: string[];
}

interface MatchResult {
  scheme: SchemeData;
  score: number;
  matchingFactors: string[];
}

export function Result({ matches }: { matches: MatchResult[] }) {
  if (matches.length === 0) {
    return (
      <div className="border rounded p-6 mt-8">
        <h2 className="text-xl font-medium mb-4">No Matching Schemes</h2>
        <p className="text-lg text-muted-foreground">
          No schemes match your criteria. Try adjusting your income, category, or language preference.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded overflow-shadow p-6 mt-6 max-w-md">
      <h2 className="text-xl font-bold mb-4">
        Matching Schemes{" "}
        {matches.length > 1 ? `(${matches.length} found)` : ""}
      </h2>

      {matches.map((match, idx) => (
        <div key={idx} className="pt-4 border-t">
          <h3 className="text-lg font-medium">
            {match.scheme.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {match.scheme.description}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Benefits:</strong> {match.scheme.benefits.join(", ")}
            </div>
            <div>
              <strong>Documents:</strong> {match.scheme.documents_required.join(", ")}
            </div>
          </div>
          <p className="mt-2 text-xs">
            Eligibility score: {Math.round(match.score * 100)}%
          </p>
          <p className="mt-1 text-xs">
            Matching factors: {match.matchingFactors.join(", ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/apply/${match.scheme.id}`}
              className="inline-flex items-center text-xs px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
            >
              Apply Now →
            </Link>
            <Link
              href={`/apply/${match.scheme.id}`}
              className="inline-flex items-center text-xs px-3 py-2 border rounded-lg hover:bg-zinc-50"
            >
              View Documents ({match.scheme.documents_required.length})
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}