// Shipments route handlers
import { Router, Request, Response, NextFunction } from "express";
import { ShipmentModel } from "../models/Shipment.js";
import { z } from "zod";
import { validateRequest, idParamSchema } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const createShipmentSchema = z.object({
  body: z.object({
    id: z.string().min(1),
    facility_id: z.string().min(1),
    date: z.string(),
    status: z.enum(["pending", "in_transit", "delivered", "rejected"]),
    weight_kg: z.number().positive(),
    has_contaminants: z.boolean(),
    origin: z.string().optional(),
    destination: z.string().optional(),
    waste_type: z.string().optional(),
    waste_code: z.string().optional(),
    carrier: z.string().optional(),
    composition_notes: z.string().optional(),
  }),
});

const updateShipmentSchema = z.object({
  body: z.object({
    facility_id: z.string().min(1).optional(),
    date: z.string().optional(),
    status: z.enum(["pending", "in_transit", "delivered", "rejected"]).optional(),
    weight_kg: z.number().positive().optional(),
    has_contaminants: z.boolean().optional(),
    origin: z.string().optional(),
    destination: z.string().optional(),
    waste_type: z.string().optional(),
    waste_code: z.string().optional(),
    carrier: z.string().optional(),
    composition_notes: z.string().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/shipments - List shipments with filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date_from, date_to, facility_id, status, has_contaminants, limit = "100" } = req.query;

    const query: any = {};

    if (date_from || date_to) {
      query.date = {};
      if (date_from) query.date.$gte = date_from;
      if (date_to) query.date.$lte = date_to;
    }
    if (facility_id) query.facility_id = facility_id;
    if (status) query.status = status;
    if (has_contaminants !== undefined) {
      query.has_contaminants = has_contaminants === "true";
    }

    const shipments = await ShipmentModel.find(query).limit(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: shipments,
      count: shipments.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/shipments/:id - Get single shipment
router.get("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipment = await ShipmentModel.findOne({ id: req.params.id });

    if (!shipment) {
      res.status(404).json({
        success: false,
        error: { message: "Shipment not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/shipments - Create shipment
router.post("/", validateRequest(createShipmentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipment = new ShipmentModel(req.body);
    await shipment.save();

    res.status(201).json({
      success: true,
      data: shipment,
      message: "Shipment created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { message: "Shipment with this ID already exists" },
      });
      return;
    }
    next(error);
  }
});

// PUT /api/shipments/:id - Update shipment
router.put("/:id", validateRequest(updateShipmentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipment = await ShipmentModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!shipment) {
      res.status(404).json({
        success: false,
        error: { message: "Shipment not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: shipment,
      message: "Shipment updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/shipments/:id - Delete shipment
router.delete("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shipment = await ShipmentModel.findOneAndDelete({ id: req.params.id });

    if (!shipment) {
      res.status(404).json({
        success: false,
        error: { message: "Shipment not found" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Shipment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;

