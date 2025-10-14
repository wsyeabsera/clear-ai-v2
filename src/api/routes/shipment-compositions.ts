// Shipment Compositions route handlers
import { Router, Request, Response, NextFunction } from "express";
import { ShipmentCompositionModel } from "../models/ShipmentComposition.js";
import { z } from "zod";
import { validateRequest, idParamSchema } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const createShipmentCompositionSchema = z.object({
  body: z.object({
    id: z.string().min(1),
    shipment_id: z.string().min(1),
    waste_code: z.string().min(1),
    waste_description: z.string().min(1),
    percentage: z.number().min(0).max(100),
    weight_kg: z.number().positive(),
    detected_by: z.enum(["camera", "manual", "sensor"]),
    confidence: z.number().min(0).max(1),
  }),
});

const updateShipmentCompositionSchema = z.object({
  body: z.object({
    shipment_id: z.string().min(1).optional(),
    waste_code: z.string().min(1).optional(),
    waste_description: z.string().min(1).optional(),
    percentage: z.number().min(0).max(100).optional(),
    weight_kg: z.number().positive().optional(),
    detected_by: z.enum(["camera", "manual", "sensor"]).optional(),
    confidence: z.number().min(0).max(1).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/shipment-compositions - List shipment compositions with filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      shipment_id, 
      waste_code, 
      detected_by,
      min_confidence,
      max_confidence,
      limit = "100" 
    } = req.query;

    const query: any = {};

    if (shipment_id) query.shipment_id = shipment_id;
    if (waste_code) query.waste_code = waste_code;
    if (detected_by) query.detected_by = detected_by;
    if (min_confidence || max_confidence) {
      query.confidence = {};
      if (min_confidence) query.confidence.$gte = parseFloat(min_confidence as string);
      if (max_confidence) query.confidence.$lte = parseFloat(max_confidence as string);
    }

    const compositions = await ShipmentCompositionModel.find(query).limit(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: compositions,
      count: compositions.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/shipment-compositions/:id - Get single shipment composition
router.get("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const composition = await ShipmentCompositionModel.findOne({ id: req.params.id });

    if (!composition) {
      res.status(404).json({
        success: false,
        error: { message: "Shipment composition not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: composition,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/shipment-compositions - Create shipment composition
router.post("/", validateRequest(createShipmentCompositionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const composition = new ShipmentCompositionModel(req.body);
    await composition.save();

    res.status(201).json({
      success: true,
      data: composition,
      message: "Shipment composition created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { message: "Shipment composition with this ID already exists" },
      });
      return;
    }
    next(error);
  }
});

// PUT /api/shipment-compositions/:id - Update shipment composition
router.put("/:id", validateRequest(updateShipmentCompositionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const composition = await ShipmentCompositionModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!composition) {
      res.status(404).json({
        success: false,
        error: { message: "Shipment composition not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: composition,
      message: "Shipment composition updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
