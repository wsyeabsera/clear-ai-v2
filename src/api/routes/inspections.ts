// Inspections route handlers
import { Router, Request, Response, NextFunction } from "express";
import { InspectionModel } from "../models/Inspection.js";
import { z } from "zod";
import { validateRequest, idParamSchema } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const createInspectionSchema = z.object({
  body: z.object({
    id: z.string().min(1),
    shipment_id: z.string().min(1),
    facility_id: z.string().min(1),
    date: z.string(),
    status: z.enum(["accepted", "rejected", "pending"]),
    inspector: z.string().min(1),
    notes: z.string().optional(),
    contaminants_detected: z.array(z.string()).optional(),
    risk_assessment: z.string().optional(),
    inspection_type: z.enum(["arrival", "processing", "departure", "random"]).optional(),
    duration_minutes: z.number().positive().optional(),
    passed: z.boolean().optional(),
    follow_up_required: z.boolean().optional(),
    photos: z.array(z.string()).optional(),
  }),
});

const updateInspectionSchema = z.object({
  body: z.object({
    shipment_id: z.string().min(1).optional(),
    facility_id: z.string().min(1).optional(),
    date: z.string().optional(),
    status: z.enum(["accepted", "rejected", "pending"]).optional(),
    inspector: z.string().min(1).optional(),
    notes: z.string().optional(),
    contaminants_detected: z.array(z.string()).optional(),
    risk_assessment: z.string().optional(),
    inspection_type: z.enum(["arrival", "processing", "departure", "random"]).optional(),
    duration_minutes: z.number().positive().optional(),
    passed: z.boolean().optional(),
    follow_up_required: z.boolean().optional(),
    photos: z.array(z.string()).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/inspections - List inspections with filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date_from, date_to, status, facility_id, shipment_id, has_risk_contaminants } = req.query;

    const query: any = {};

    if (date_from || date_to) {
      query.date = {};
      if (date_from) query.date.$gte = date_from;
      if (date_to) query.date.$lte = date_to;
    }
    if (status) query.status = status;
    if (facility_id) query.facility_id = facility_id;
    if (shipment_id) query.shipment_id = shipment_id;
    if (has_risk_contaminants === "true") {
      query.contaminants_detected = { $exists: true, $ne: [] };
    }

    const inspections = await InspectionModel.find(query);

    res.json({
      success: true,
      data: inspections,
      count: inspections.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/inspections/:id - Get single inspection
router.get("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inspection = await InspectionModel.findOne({ id: req.params.id });

    if (!inspection) {
      res.status(404).json({
        success: false,
        error: { message: "Inspection not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/inspections - Create inspection
router.post("/", validateRequest(createInspectionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inspection = new InspectionModel(req.body);
    await inspection.save();

    res.status(201).json({
      success: true,
      data: inspection,
      message: "Inspection created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { message: "Inspection with this ID already exists" },
      });
      return;
    }
    next(error);
  }
});

// PUT /api/inspections/:id - Update inspection
router.put("/:id", validateRequest(updateInspectionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inspection = await InspectionModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!inspection) {
      res.status(404).json({
        success: false,
        error: { message: "Inspection not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: inspection,
      message: "Inspection updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/inspections/:id - Delete inspection
router.delete("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inspection = await InspectionModel.findOneAndDelete({ id: req.params.id });

    if (!inspection) {
      res.status(404).json({
        success: false,
        error: { message: "Inspection not found" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Inspection deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;

