// Contract Mongoose Model
import mongoose, { Schema, Document } from "mongoose";

export interface IContract {
  id: string;
  producer_id: string;
  facility_id: string;
  waste_types_declared: string[];
  start_date: string;
  end_date: string;
  max_weight_kg: number;
  status: "active" | "expired" | "suspended";
  terms: string;
}

export interface ContractDocument extends Omit<IContract, "id">, Document {
  id: string;
}

const contractSchema = new Schema<ContractDocument>(
  {
    id: { type: String, required: true, unique: true },
    producer_id: { type: String, required: true },
    facility_id: { type: String, required: true },
    waste_types_declared: { type: [String], required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    max_weight_kg: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: ["active", "expired", "suspended"],
    },
    terms: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_: any, ret: any) => {
        delete ret._id;
        delete ret.__v;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
  }
);

// Create indexes for common queries
contractSchema.index({ producer_id: 1 });
contractSchema.index({ facility_id: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ start_date: 1 });
contractSchema.index({ end_date: 1 });

export const ContractModel = mongoose.model<ContractDocument>("Contract", contractSchema);
