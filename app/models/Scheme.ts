import mongoose, { Schema, Document, Model } from "mongoose";

export interface IScheme extends Document {
  schemeId: string;
  name: string;
  name_hi?: string;
  description: string;
  description_hi?: string;
  eligibility: {
    min_landholding?: number;
    max_landholding?: number;
    min_income?: number | string;
    max_income?: number | string;
    resident_for_years?: number;
    caste?: string[];
    age_min?: number;
    age_max?: number | string;
    category?: string[];
  };
  benefits: string[];
  benefits_hi?: string[];
  documents_required: string[];
  documents_required_hi?: string[];
  category: string;
  state_coverage: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SchemeSchema = new Schema<IScheme>(
  {
    schemeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    name_hi: String,
    description: String,
    description_hi: String,
    eligibility: {
      min_landholding: Number,
      max_landholding: Number,
      min_income: Schema.Types.Mixed,
      max_income: Schema.Types.Mixed,
      resident_for_years: Number,
      caste: [String],
      age_min: Number,
      age_max: Schema.Types.Mixed,
      category: [String],
    },
    benefits: [String],
    benefits_hi: [String],
    documents_required: [String],
    documents_required_hi: [String],
    category: { type: String, index: true },
    state_coverage: [String],
  },
  { timestamps: true }
);

const Scheme: Model<IScheme> = mongoose.models.Scheme || mongoose.model<IScheme>("Scheme", SchemeSchema);
export default Scheme;
