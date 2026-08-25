"use client";
import { useState } from "react";

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
          <label className="block text-sm font-medium mb-2">Category</label>
          <select name="category" onChange={handleChange} className="w-full p-2 border rounded">
            <option value="">Select category</option>
            <option value="farmer">Farmer</option>
            <option value="health">Health</option>
            <option value="employment">Employment</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">State /州</label>
          <input
            name="state"
            type="text"
            placeholder="State (optional)"
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
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