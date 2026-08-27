"use client";
import { useState } from "react";
import { INDIAN_STATES_28 } from "@/app/data/indianStates";

interface FormData {
  language: string;
  income: number;
  category: string;
  state: string;
}

export default function SearchForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const [formData, setFormData] = useState<FormData>({
    language: "",
    income: 0,
    category: "",
    state: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === "number"
          ? Number(value)
          : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple validation
    if (!formData.language) {
      alert("Language required");
      return;
    }
    if (formData.income === undefined || formData.income < 0) {
      alert("Income required");
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="border rounded p-6 mb-6 max-w-md">
      <h2 className="text-xl font-bold mb-6">Scheme Discovery Search</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Language / भाषा</label>
          <select
            name="language"
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="">Select language</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="ml">Malayalam</option>
            <option value="bn">Bengali</option>
            <option value="gu">Gujarati</option>
            <option value="kn">Kannada</option>
            <option value="mr">Marathi</option>
            <option value="pa">Punjabi</option>
            <option value="or">Odia</option>
            <option value="as">Assamese</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Monthly Income (₹)</label>
          <input
            name="income"
            type="number"
            min={0}
            max={1000000}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            defaultValue={0}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category (94 schemes — Central Flagships + Handloom)</label>
          <select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded bg-white">
            <option value="">All categories (94 schemes)</option>
            <option value="farmer">Farmer & Agriculture — PM-KISAN, PMFBY, KCC, KUSUM, SMAM, Matsya, AHIDF (12)</option>
            <option value="health">Health — Ayushman PM-JAY, JSY, Indradhanush, ABDM, AYUSH (6)</option>
            <option value="employment">Employment & Skill — MGNREGA, Mudra, E-Shram, PMKVY, DDU-GKY, PMEGP, Startup, Vishwakarma, SVANidhi, NAPS, Skill Hub (14)</option>
            <option value="housing">Housing & Urban/Rural Infra — PMAY, Swachh Bharat, Jal Jeevan, SVAMITVA, AMRUT, Smart Cities, PMAY-U 2.0 (8)</option>
            <option value="finance">Finance — Jan Dhan, Stand-Up, CGTMSE (3)</option>
            <option value="women">Women & Child — Ujjwala, Sukanya, Matru Vandana, BBBP, POSHAN, ICDS, NRLM, Drone Didi, Lakhpati, Mission Shakti (10)</option>
            <option value="pension">Pension & Senior — APY, PM-KMY, Suraksha-maan, Vaya Vandana, IGNOAPS/WPS/DPS, PM-SYM (8)</option>
            <option value="insurance">Insurance — PMSBY, PMJJBY (2)</option>
            <option value="food">Food — PMGKAY, NFSA, ONORC (3)</option>
            <option value="education">Education & Scholarship — PM POSHAN, Samagra Shiksha, NSP, YASASVI, SC/OBC/Minority/Top-Class, NMMSS, PMSS, EMRS, Vidya Lakshmi, eVIDYA, BharatNet, PMGDISHA, AIM (18)</option>
            <option value="energy">Energy — PM Surya Ghar, UJALA, PM E-Drive (3)</option>
            <option value="disability">Disability — ADIP, Niramaya (2)</option>
            <option value="tribal">Tribal — Van Dhan, Janjatiya Utkarsh, ST Fellowship (3)</option>
            <option value="handloom">Handloom & Textiles — NHDP, YSS, CHCDS Mega Cluster, Weaver MUDRA/HSS, Welfare Insurance, Handloom Mark & India Brand (6)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">State (28 Indian States) — Select</label>
          <select
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full p-2 border rounded bg-white"
          >
            <option value="">Select state (optional)</option>
            {INDIAN_STATES_28.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500 mt-1">Only 28 states listed. Coverage: ALL states for current schemes.</p>
        </div>

        <div className="mt-6 border-t border-gray-200 pb-6">
<button
          type="submit"
          className="w-full py-3 bg-black text-white rounded mt-4 hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          aria-label="Search Schemes"
        >
          Search Schemes
        </button>
        </div>
      </form>
    </div>
  );
}