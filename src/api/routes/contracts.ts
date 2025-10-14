// Contracts route handlers
import { Router, Request, Response, NextFunction } from "express";
import { ContractModel } from "../models/Contract.js";
import { z } from "zod";
import { validateRequest, idParamSchema } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const createContractSchema = z.object({
  body: z.object({
    id: z.string().min(1),
    producer_id: z.string().min(1),
    facility_id: z.string().min(1),
    waste_types_declared: z.array(z.string()),
    start_date: z.string(),
    end_date: z.string(),
    max_weight_kg: z.number().positive(),
    status: z.enum(["active", "expired", "suspended"]),
    terms: z.string(),
  }),
});

const updateContractSchema = z.object({
  body: z.object({
    producer_id: z.string().min(1).optional(),
    facility_id: z.string().min(1).optional(),
    waste_types_declared: z.array(z.string()).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    max_weight_kg: z.number().positive().optional(),
    status: z.enum(["active", "expired", "suspended"]).optional(),
    terms: z.string().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/contracts - List contracts with filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      producer_id, 
      facility_id, 
      status, 
      start_date, 
      end_date, 
      waste_type,
      limit = "100" 
    } = req.query;

    const query: any = {};

    if (producer_id) query.producer_id = producer_id;
    if (facility_id) query.facility_id = facility_id;
    if (status) query.status = status;
    if (start_date || end_date) {
      query.start_date = {};
      if (start_date) query.start_date.$gte = start_date;
      if (end_date) query.end_date.$lte = end_date;
    }
    if (waste_type) {
      query.waste_types_declared = { $in: [waste_type] };
    }

    const contracts = await ContractModel.find(query).limit(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: contracts,
      count: contracts.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contracts/:id - Get single contract
router.get("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await ContractModel.findOne({ id: req.params.id });

    if (!contract) {
      res.status(404).json({
        success: false,
        error: { message: "Contract not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: contract,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contracts - Create contract
router.post("/", validateRequest(createContractSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = new ContractModel(req.body);
    await contract.save();

    res.status(201).json({
      success: true,
      data: contract,
      message: "Contract created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { message: "Contract with this ID already exists" },
      });
      return;
    }
    next(error);
  }
});

// PUT /api/contracts/:id - Update contract
router.put("/:id", validateRequest(updateContractSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await ContractModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!contract) {
      res.status(404).json({
        success: false,
        error: { message: "Contract not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: contract,
      message: "Contract updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/contracts/:id - Delete contract
router.delete("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await ContractModel.findOneAndDelete({ id: req.params.id });

    if (!contract) {
      res.status(404).json({
        success: false,
        error: { message: "Contract not found" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Contract deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
