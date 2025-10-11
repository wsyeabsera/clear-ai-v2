// Inspection Mongoose Model
import mongoose, { Schema, Document } from "mongoose";
import { Inspection as IInspection } from "../../tools/types.js";

export interface InspectionDocument extends Omit<IInspection, "id">, Document {
  id: string;
}

const inspectionSchema = new Schema<InspectionDocument>(
  {
    id: { type: String, required: true, unique: true },
    shipment_id: { type: String, required: true },
    facility_id: { type: String, required: true },
    date: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["accepted", "rejected", "pending"],
    },
    inspector: { type: String, required: true },
    notes: { type: String },
    contaminants_detected: [{ type: String }],
    risk_assessment: { type: String },
    inspection_type: {
      type: String,
      enum: ["arrival", "processing", "departure", "random"],
    },
    duration_minutes: { type: Number },
    passed: { type: Boolean },
    follow_up_required: { type: Boolean },
    photos: [{ type: String }],
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
inspectionSchema.index({ shipment_id: 1 });
inspectionSchema.index({ facility_id: 1 });
inspectionSchema.index({ date: 1 });
inspectionSchema.index({ status: 1 });

export const InspectionModel = mongoose.model<InspectionDocument>(
  "Inspection",
  inspectionSchema
);

