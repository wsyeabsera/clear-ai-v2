// Request validation helpers
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: "Validation failed",
            details: error.issues,
          },
        });
      } else {
        next(error);
      }
    }
  };
}

// Common validation schemas
export const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    limit: z.string().optional().transform((val: any) => (val ? parseInt(val, 10) : 100)),
    offset: z.string().optional().transform((val: any) => (val ? parseInt(val, 10) : 0)),
  }),
});

