import mongoose, { Schema, Document, Model } from "mongoose";

export interface IApplication extends Document {
  schemeId: string;
  schemeName: string;
  applicantName: string;
  email: string;
  phone: string;
  aadhaarLast4?: string;
  state?: string;
  income?: number;
  address?: string;
  documents: { name: string; provided: boolean }[];
  documents_required: string[];
  status: string;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    schemeId: { type: String, required: true, index: true },
    schemeName: { type: String, required: true },
    applicantName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    aadhaarLast4: String,
    state: String,
    income: Number,
    address: String,
    documents: [
      {
        name: String,
        provided: Boolean,
      },
    ],
    documents_required: [String],
    status: {
      type: String,
      default: "submitted",
      enum: ["submitted", "under_review", "approved", "rejected"],
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

ApplicationSchema.index({ email: 1, createdAt: -1 });
ApplicationSchema.index({ schemeId: 1, status: 1 });

const Application: Model<IApplication> =
  mongoose.models.Application || mongoose.model<IApplication>("Application", ApplicationSchema);
export default Application;
