// Waste Producers route handlers
import { Router, Request, Response, NextFunction } from "express";
import { WasteProducerModel } from "../models/WasteProducer.js";
import { z } from "zod";
import { validateRequest, idParamSchema } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const createWasteProducerSchema = z.object({
  body: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(["industrial", "commercial", "municipal"]),
    location: z.string().min(1),
    contact_email: z.string().email(),
    contact_phone: z.string().min(1),
    license_number: z.string().min(1),
    active_contracts: z.number().min(0).optional(),
  }),
});

const updateWasteProducerSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    type: z.enum(["industrial", "commercial", "municipal"]).optional(),
    location: z.string().min(1).optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().min(1).optional(),
    license_number: z.string().min(1).optional(),
    active_contracts: z.number().min(0).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/waste-producers - List waste producers with filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      type, 
      location, 
      license_number,
      min_contracts,
      max_contracts,
      limit = "100" 
    } = req.query;

    const query: any = {};

    if (type) query.type = type;
    if (location) query.location = { $regex: location, $options: "i" };
    if (license_number) query.license_number = license_number;
    if (min_contracts || max_contracts) {
      query.active_contracts = {};
      if (min_contracts) query.active_contracts.$gte = parseInt(min_contracts as string, 10);
      if (max_contracts) query.active_contracts.$lte = parseInt(max_contracts as string, 10);
    }

    const producers = await WasteProducerModel.find(query).limit(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: producers,
      count: producers.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/waste-producers/:id - Get single waste producer
router.get("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producer = await WasteProducerModel.findOne({ id: req.params.id });

    if (!producer) {
      res.status(404).json({
        success: false,
        error: { message: "Waste producer not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: producer,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/waste-producers - Create waste producer
router.post("/", validateRequest(createWasteProducerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producer = new WasteProducerModel(req.body);
    await producer.save();

    res.status(201).json({
      success: true,
      data: producer,
      message: "Waste producer created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { message: "Waste producer with this ID already exists" },
      });
      return;
    }
    next(error);
  }
});

// PUT /api/waste-producers/:id - Update waste producer
router.put("/:id", validateRequest(updateWasteProducerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producer = await WasteProducerModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!producer) {
      res.status(404).json({
        success: false,
        error: { message: "Waste producer not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: producer,
      message: "Waste producer updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/waste-producers/:id - Delete waste producer
router.delete("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const producer = await WasteProducerModel.findOneAndDelete({ id: req.params.id });

    if (!producer) {
      res.status(404).json({
        success: false,
        error: { message: "Waste producer not found" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Waste producer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
