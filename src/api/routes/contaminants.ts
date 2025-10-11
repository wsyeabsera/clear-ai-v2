// Contaminants route handlers
import { Router, Request, Response, NextFunction } from "express";
import { ContaminantModel } from "../models/Contaminant.js";
import { z } from "zod";
import { validateRequest, idParamSchema } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const createContaminantSchema = z.object({
  body: z.object({
    id: z.string().min(1),
    shipment_id: z.string().min(1),
    facility_id: z.string().optional(),
    type: z.string().min(1),
    concentration_ppm: z.number().nonnegative(),
    risk_level: z.enum(["low", "medium", "high", "critical"]),
    detected_at: z.string(),
    notes: z.string().optional(),
    analysis_notes: z.string().optional(),
    waste_item_detected: z.string().optional(),
    explosive_level: z.enum(["low", "medium", "high"]).optional(),
    so2_level: z.enum(["low", "medium", "high"]).optional(),
    hcl_level: z.enum(["low", "medium", "high"]).optional(),
    estimated_size: z.number().nonnegative().optional(),
  }),
});

const updateContaminantSchema = z.object({
  body: z.object({
    shipment_id: z.string().min(1).optional(),
    facility_id: z.string().optional(),
    type: z.string().min(1).optional(),
    concentration_ppm: z.number().nonnegative().optional(),
    risk_level: z.enum(["low", "medium", "high", "critical"]).optional(),
    detected_at: z.string().optional(),
    notes: z.string().optional(),
    analysis_notes: z.string().optional(),
    waste_item_detected: z.string().optional(),
    explosive_level: z.enum(["low", "medium", "high"]).optional(),
    so2_level: z.enum(["low", "medium", "high"]).optional(),
    hcl_level: z.enum(["low", "medium", "high"]).optional(),
    estimated_size: z.number().nonnegative().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/contaminants-detected - List contaminants with filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shipment_ids, facility_id, date_from, date_to, type, risk_level } = req.query;

    const query: any = {};

    if (shipment_ids) {
      const idArray = (shipment_ids as string).split(",");
      query.shipment_id = { $in: idArray };
    }
    if (facility_id) query.facility_id = facility_id;
    if (date_from || date_to) {
      query.detected_at = {};
      if (date_from) query.detected_at.$gte = date_from;
      if (date_to) query.detected_at.$lte = date_to;
    }
    if (type) query.type = type;
    if (risk_level) query.risk_level = risk_level;

    const contaminants = await ContaminantModel.find(query);

    res.json({
      success: true,
      data: contaminants,
      count: contaminants.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contaminants-detected/:id - Get single contaminant
router.get("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contaminant = await ContaminantModel.findOne({ id: req.params.id });

    if (!contaminant) {
      res.status(404).json({
        success: false,
        error: { message: "Contaminant not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: contaminant,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contaminants-detected - Create contaminant detection
router.post("/", validateRequest(createContaminantSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contaminant = new ContaminantModel(req.body);
    await contaminant.save();

    res.status(201).json({
      success: true,
      data: contaminant,
      message: "Contaminant detection created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { message: "Contaminant with this ID already exists" },
      });
      return;
    }
    next(error);
  }
});

// PUT /api/contaminants-detected/:id - Update contaminant
router.put("/:id", validateRequest(updateContaminantSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contaminant = await ContaminantModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!contaminant) {
      res.status(404).json({
        success: false,
        error: { message: "Contaminant not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: contaminant,
      message: "Contaminant updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/contaminants-detected/:id - Delete contaminant
router.delete("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contaminant = await ContaminantModel.findOneAndDelete({ id: req.params.id });

    if (!contaminant) {
      res.status(404).json({
        success: false,
        error: { message: "Contaminant not found" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Contaminant deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;

