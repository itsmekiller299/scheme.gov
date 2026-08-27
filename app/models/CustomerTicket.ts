import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomerTicket extends Document {
  ticketId: string;
  email: string;
  name?: string;
  subject: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  schemeId?: string | null;
  assignedTo?: string | null;
  messages: { sender: string; senderRole: string; message: string; at: Date }[];
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerTicketSchema = new Schema<ICustomerTicket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    name: String,
    subject: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, required: true, enum: ["general", "scheme", "application", "grievance", "technical", "handloom", "other"], default: "general" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    status: { type: String, enum: ["open", "in_progress", "waiting", "resolved", "closed"], default: "open", index: true },
    schemeId: { type: String, default: null },
    assignedTo: { type: String, default: null },
    messages: [
      {
        sender: String,
        senderRole: String,
        message: String,
        at: { type: Date, default: Date.now },
      },
    ],
    userId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CustomerTicketSchema.index({ email: 1, createdAt: -1 });
CustomerTicketSchema.index({ status: 1, priority: 1 });

const CustomerTicket: Model<ICustomerTicket> =
  mongoose.models.CustomerTicket || mongoose.model<ICustomerTicket>("CustomerTicket", CustomerTicketSchema);
export default CustomerTicket;
