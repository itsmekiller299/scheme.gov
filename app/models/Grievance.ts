import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGrievance extends Document {
  aadhaarNumber?: string | null; // full 12-digit
  aadhaarLast4: string | null;
  contact: string | null;
  description: string;
  schemeId: string | null;
  referenceNumber: string | null;
  status: string;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GrievanceSchema = new Schema<IGrievance>(
  {
    aadhaarNumber: { type: String, default: null, validate: { validator: (v: string | null) => !v || /^\d{12}$/.test(v as string), message: "Aadhaar must be 12 digits" } },
    aadhaarLast4: { type: String, default: null },
    contact: { type: String, default: null },
    description: { type: String, required: true },
    schemeId: { type: String, default: null },
    referenceNumber: { type: String, default: null },
    status: { type: String, default: "submitted", enum: ["submitted", "in_progress", "resolved", "rejected"] },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

GrievanceSchema.index({ status: 1, createdAt: -1 });

const Grievance: Model<IGrievance> =
  mongoose.models.Grievance || mongoose.model<IGrievance>("Grievance", GrievanceSchema);
export default Grievance;
