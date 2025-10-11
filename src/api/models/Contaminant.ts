// Contaminant Mongoose Model
import mongoose, { Schema, Document } from "mongoose";
import { Contaminant as IContaminant } from "../../tools/types.js";

export interface ContaminantDocument extends Omit<IContaminant, "id">, Document {
  id: string;
}

const contaminantSchema = new Schema<ContaminantDocument>(
  {
    id: { type: String, required: true, unique: true },
    shipment_id: { type: String, required: true },
    facility_id: { type: String },
    type: { type: String, required: true },
    concentration_ppm: { type: Number, required: true },
    risk_level: {
      type: String,
      required: true,
      enum: ["low", "medium", "high", "critical"],
    },
    detected_at: { type: String, required: true },
    notes: { type: String },
    analysis_notes: { type: String },
    waste_item_detected: { type: String },
    explosive_level: {
      type: String,
      enum: ["low", "medium", "high"],
    },
    so2_level: {
      type: String,
      enum: ["low", "medium", "high"],
    },
    hcl_level: {
      type: String,
      enum: ["low", "medium", "high"],
    },
    estimated_size: { type: Number },
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
contaminantSchema.index({ shipment_id: 1 });
contaminantSchema.index({ facility_id: 1 });
contaminantSchema.index({ type: 1 });
contaminantSchema.index({ risk_level: 1 });
contaminantSchema.index({ detected_at: 1 });

export const ContaminantModel = mongoose.model<ContaminantDocument>(
  "Contaminant",
  contaminantSchema
);

