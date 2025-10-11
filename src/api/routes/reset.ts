import { Router, Request, Response } from "express";
import { seedCollections } from "../db/seed-data.js";

const router = Router();

/**
 * POST /api/reset
 * Reset database - delete all data and reseed with test data
 * 
 * WARNING: This endpoint deletes ALL data in the database!
 * Use only in development/testing environments.
 */
router.post("/", async (_req: Request, res: Response) => {
  try {
    console.log("🔄 Database reset requested...");
    
    const summary = await seedCollections();
    
    console.log("✅ Database reset complete");

    res.status(200).json({
      success: true,
      message: "Database reset successfully. All data cleared and reseeded.",
      data: summary,
    });
  } catch (error: any) {
    console.error("❌ Reset failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to reset database",
    });
  }
});

export default router;

