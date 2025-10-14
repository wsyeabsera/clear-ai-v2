// Shipment Loads route handlers
import { Router, Request, Response, NextFunction } from "express";
import { ShipmentLoadModel } from "../models/ShipmentLoad.js";
import { z } from "zod";
import { validateRequest, idParamSchema } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const createShipmentLoadSchema = z.object({
  body: z.object({
    id: z.string().min(1),
    shipment_id: z.string().min(1),
    detected_at: z.string(),
    camera_id: z.string().min(1),
    waste_codes_detected: z.array(z.string()),
    total_weight_kg: z.number().positive(),
    image_url: z.string().optional(),
    analysis_confidence: z.number().min(0).max(1),
    matches_contract: z.boolean(),
  }),
});

const updateShipmentLoadSchema = z.object({
  body: z.object({
    shipment_id: z.string().min(1).optional(),
    detected_at: z.string().optional(),
    camera_id: z.string().min(1).optional(),
    waste_codes_detected: z.array(z.string()).optional(),
    total_weight_kg: z.number().positive().optional(),
    image_url: z.string().optional(),
    analysis_confidence: z.number().min(0).max(1).optional(),
    matches_contract: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/shipment-loads - List shipment loads with filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      shipment_id, 
      camera_id, 
      detected_at_from,
      detected_at_to,
      waste_code,
      matches_contract,
      min_confidence,
      max_confidence,
      limit = "100" 
    } = req.query;

    const query: any = {};

    if (shipment_id) query.shipment_id = shipment_id;
    if (camera_id) query.camera_id = camera_id;
    if (detected_at_from || detected_at_to) {
      query.detected_at = {};
      if (detected_at_from) query.detected_at.$gte = detected_at_from;
      if (detected_at_to) query.detected_at.$lte = detected_at_to;
    }
    if (waste_code) {
      query.waste_codes_detected = { $in: [waste_code] };
    }
    if (matches_contract !== undefined) {
      query.matches_contract = matches_contract === "true";
    }
    if (min_confidence || max_confidence) {
      query.analysis_confidence = {};
      if (min_confidence) query.analysis_confidence.$gte = parseFloat(min_confidence as string);
      if (max_confidence) query.analysis_confidence.$lte = parseFloat(max_confidence as string);
    }

    const loads = await ShipmentLoadModel.find(query).limit(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: loads,
      count: loads.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/shipment-loads/:id - Get single shipment load
router.get("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const load = await ShipmentLoadModel.findOne({ id: req.params.id });

    if (!load) {
      res.status(404).json({
        success: false,
        error: { message: "Shipment load not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: load,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/shipment-loads - Create shipment load
router.post("/", validateRequest(createShipmentLoadSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const load = new ShipmentLoadModel(req.body);
    await load.save();

    res.status(201).json({
      success: true,
      data: load,
      message: "Shipment load created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { message: "Shipment load with this ID already exists" },
      });
      return;
    }
    next(error);
  }
});

// PUT /api/shipment-loads/:id - Update shipment load
router.put("/:id", validateRequest(updateShipmentLoadSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const load = await ShipmentLoadModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!load) {
      res.status(404).json({
        success: false,
        error: { message: "Shipment load not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: load,
      message: "Shipment load updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
