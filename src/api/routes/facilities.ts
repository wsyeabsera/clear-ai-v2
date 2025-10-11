// Facilities route handlers
import { Router, Request, Response, NextFunction } from "express";
import { FacilityModel } from "../models/Facility.js";
import { z } from "zod";
import { validateRequest, idParamSchema } from "../middleware/validation.js";

const router = Router();

// Validation schemas
const createFacilitySchema = z.object({
  body: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    location: z.string().min(1),
    type: z.enum(["sorting", "processing", "disposal"]),
    capacity_tons: z.number().positive(),
    current_load_tons: z.number().nonnegative().optional(),
    coordinates: z
      .object({
        lat: z.number(),
        lon: z.number(),
      })
      .optional(),
    accepted_waste_types: z.array(z.string()).optional(),
    rejected_waste_types: z.array(z.string()).optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().optional(),
    operating_hours: z.string().optional(),
  }),
});

const updateFacilitySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    type: z.enum(["sorting", "processing", "disposal"]).optional(),
    capacity_tons: z.number().positive().optional(),
    current_load_tons: z.number().nonnegative().optional(),
    coordinates: z
      .object({
        lat: z.number(),
        lon: z.number(),
      })
      .optional(),
    accepted_waste_types: z.array(z.string()).optional(),
    rejected_waste_types: z.array(z.string()).optional(),
    contact_email: z.string().email().optional(),
    contact_phone: z.string().optional(),
    operating_hours: z.string().optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

// GET /api/facilities - List facilities with filters
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, type, min_capacity, ids } = req.query;

    const query: any = {};

    if (location) query.location = new RegExp(location as string, "i");
    if (type) query.type = type;
    if (min_capacity) query.capacity_tons = { $gte: parseFloat(min_capacity as string) };
    if (ids) {
      const idArray = (ids as string).split(",");
      query.id = { $in: idArray };
    }

    const facilities = await FacilityModel.find(query);

    res.json({
      success: true,
      data: facilities,
      count: facilities.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/facilities/:id - Get single facility
router.get("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facility = await FacilityModel.findOne({ id: req.params.id });

    if (!facility) {
      res.status(404).json({
        success: false,
        error: { message: "Facility not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: facility,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/facilities - Create facility
router.post("/", validateRequest(createFacilitySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facility = new FacilityModel(req.body);
    await facility.save();

    res.status(201).json({
      success: true,
      data: facility,
      message: "Facility created successfully",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: { message: "Facility with this ID already exists" },
      });
      return;
    }
    next(error);
  }
});

// PUT /api/facilities/:id - Update facility
router.put("/:id", validateRequest(updateFacilitySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facility = await FacilityModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!facility) {
      res.status(404).json({
        success: false,
        error: { message: "Facility not found" },
      });
      return;
    }

    res.json({
      success: true,
      data: facility,
      message: "Facility updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/facilities/:id - Delete facility
router.delete("/:id", validateRequest(idParamSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const facility = await FacilityModel.findOneAndDelete({ id: req.params.id });

    if (!facility) {
      res.status(404).json({
        success: false,
        error: { message: "Facility not found" },
      });
      return;
    }

    res.json({
      success: true,
      message: "Facility deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;

