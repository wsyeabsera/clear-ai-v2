// Shipment Composition Mongoose Model
import mongoose, { Schema, Document } from "mongoose";

export interface IShipmentComposition {
  id: string;
  shipment_id: string;
  waste_code: string;
  waste_description: string;
  percentage: number;
  weight_kg: number;
  detected_by: "camera" | "manual" | "sensor";
  confidence: number;
}

export interface ShipmentCompositionDocument extends Omit<IShipmentComposition, "id">, Document {
  id: string;
}

const shipmentCompositionSchema = new Schema<ShipmentCompositionDocument>(
  {
    id: { type: String, required: true, unique: true },
    shipment_id: { type: String, required: true },
    waste_code: { type: String, required: true },
    waste_description: { type: String, required: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    weight_kg: { type: Number, required: true },
    detected_by: {
      type: String,
      required: true,
      enum: ["camera", "manual", "sensor"],
    },
    confidence: { type: Number, required: true, min: 0, max: 1 },
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
shipmentCompositionSchema.index({ shipment_id: 1 });
shipmentCompositionSchema.index({ waste_code: 1 });
shipmentCompositionSchema.index({ detected_by: 1 });

export const ShipmentCompositionModel = mongoose.model<ShipmentCompositionDocument>("ShipmentComposition", shipmentCompositionSchema);
