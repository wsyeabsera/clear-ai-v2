// Facility Mongoose Model
import mongoose, { Schema, Document } from "mongoose";
import { Facility as IFacility } from "../../shared/types/tool.js";

export interface FacilityDocument extends Omit<IFacility, "id">, Document {
  id: string;
}

const facilitySchema = new Schema<FacilityDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["sorting", "processing", "disposal"],
    },
    capacity_tons: { type: Number, required: true },
    current_load_tons: { type: Number },
    coordinates: {
      lat: { type: Number },
      lon: { type: Number },
    },
    accepted_waste_types: [{ type: String }],
    rejected_waste_types: [{ type: String }],
    contact_email: { type: String },
    contact_phone: { type: String },
    operating_hours: { type: String },
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
facilitySchema.index({ location: 1 });
facilitySchema.index({ type: 1 });
facilitySchema.index({ capacity_tons: 1 });

export const FacilityModel = mongoose.model<FacilityDocument>("Facility", facilitySchema);

