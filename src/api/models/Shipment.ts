// Shipment Mongoose Model
import mongoose, { Schema, Document } from "mongoose";
import { Shipment as IShipment } from "../../tools/types.js";

export interface ShipmentDocument extends Omit<IShipment, "id">, Document {
  id: string;
}

const shipmentSchema = new Schema<ShipmentDocument>(
  {
    id: { type: String, required: true, unique: true },
    facility_id: { type: String, required: true },
    date: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "in_transit", "delivered", "rejected"],
    },
    weight_kg: { type: Number, required: true },
    has_contaminants: { type: Boolean, required: true },
    origin: { type: String },
    destination: { type: String },
    waste_type: { type: String },
    waste_code: { type: String },
    carrier: { type: String },
    composition_notes: { type: String },
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
shipmentSchema.index({ facility_id: 1 });
shipmentSchema.index({ date: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ has_contaminants: 1 });

export const ShipmentModel = mongoose.model<ShipmentDocument>("Shipment", shipmentSchema);

