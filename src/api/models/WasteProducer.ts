// Waste Producer Mongoose Model
import mongoose, { Schema, Document } from "mongoose";

export interface IWasteProducer {
  id: string;
  name: string;
  type: "industrial" | "commercial" | "municipal";
  location: string;
  contact_email: string;
  contact_phone: string;
  license_number: string;
  active_contracts: number;
}

export interface WasteProducerDocument extends Omit<IWasteProducer, "id">, Document {
  id: string;
}

const wasteProducerSchema = new Schema<WasteProducerDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["industrial", "commercial", "municipal"],
    },
    location: { type: String, required: true },
    contact_email: { type: String, required: true },
    contact_phone: { type: String, required: true },
    license_number: { type: String, required: true },
    active_contracts: { type: Number, required: true, default: 0 },
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
wasteProducerSchema.index({ name: 1 });
wasteProducerSchema.index({ type: 1 });
wasteProducerSchema.index({ location: 1 });
wasteProducerSchema.index({ license_number: 1 });

export const WasteProducerModel = mongoose.model<WasteProducerDocument>("WasteProducer", wasteProducerSchema);
