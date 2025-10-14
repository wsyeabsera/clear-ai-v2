// Shipment Load Mongoose Model
import mongoose, { Schema, Document } from "mongoose";

export interface IShipmentLoad {
  id: string;
  shipment_id: string;
  detected_at: string;
  camera_id: string;
  waste_codes_detected: string[];
  total_weight_kg: number;
  image_url?: string;
  analysis_confidence: number;
  matches_contract: boolean;
}

export interface ShipmentLoadDocument extends Omit<IShipmentLoad, "id">, Document {
  id: string;
}

const shipmentLoadSchema = new Schema<ShipmentLoadDocument>(
  {
    id: { type: String, required: true, unique: true },
    shipment_id: { type: String, required: true },
    detected_at: { type: String, required: true },
    camera_id: { type: String, required: true },
    waste_codes_detected: { type: [String], required: true },
    total_weight_kg: { type: Number, required: true },
    image_url: { type: String },
    analysis_confidence: { type: Number, required: true, min: 0, max: 1 },
    matches_contract: { type: Boolean, required: true },
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
shipmentLoadSchema.index({ shipment_id: 1 });
shipmentLoadSchema.index({ camera_id: 1 });
shipmentLoadSchema.index({ detected_at: 1 });
shipmentLoadSchema.index({ matches_contract: 1 });

export const ShipmentLoadModel = mongoose.model<ShipmentLoadDocument>("ShipmentLoad", shipmentLoadSchema);
