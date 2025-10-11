// Analytics route handlers
import { Router, Request, Response, NextFunction } from "express";
import { ShipmentModel } from "../models/Shipment.js";
import { FacilityModel } from "../models/Facility.js";
import { ContaminantModel } from "../models/Contaminant.js";
import { InspectionModel } from "../models/Inspection.js";

const router = Router();

// GET /api/analytics/contamination-rate - Overall contamination statistics
router.get("/contamination-rate", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const totalShipments = await ShipmentModel.countDocuments();
    const contaminatedShipments = await ShipmentModel.countDocuments({ has_contaminants: true });
    const contaminationRate = totalShipments > 0 ? (contaminatedShipments / totalShipments) * 100 : 0;

    // Count by risk level
    const riskLevelCounts = await ContaminantModel.aggregate([
      {
        $group: {
          _id: "$risk_level",
          count: { $sum: 1 },
        },
      },
    ]);

    const riskLevelStats: Record<string, number> = {};
    riskLevelCounts.forEach((item) => {
      riskLevelStats[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        total_shipments: totalShipments,
        contaminated_shipments: contaminatedShipments,
        clean_shipments: totalShipments - contaminatedShipments,
        contamination_rate_percent: Math.round(contaminationRate * 100) / 100,
        risk_level_distribution: riskLevelStats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/facility-performance - Facility acceptance/rejection rates
router.get("/facility-performance", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const facilities = await FacilityModel.find();
    const performanceData = [];

    for (const facility of facilities) {
      const inspections = await InspectionModel.find({ facility_id: facility.id });
      const acceptedCount = inspections.filter((i) => i.status === "accepted").length;
      const rejectedCount = inspections.filter((i) => i.status === "rejected").length;
      const pendingCount = inspections.filter((i) => i.status === "pending").length;

      const acceptanceRate = inspections.length > 0 ? (acceptedCount / inspections.length) * 100 : 0;

      performanceData.push({
        facility_id: facility.id,
        facility_name: facility.name,
        location: facility.location,
        total_inspections: inspections.length,
        accepted: acceptedCount,
        rejected: rejectedCount,
        pending: pendingCount,
        acceptance_rate_percent: Math.round(acceptanceRate * 100) / 100,
      });
    }

    res.json({
      success: true,
      data: performanceData,
      count: performanceData.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/waste-type-distribution - Breakdown by waste type
router.get("/waste-type-distribution", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const wasteTypeCounts = await ShipmentModel.aggregate([
      {
        $match: {
          waste_type: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$waste_type",
          count: { $sum: 1 },
          total_weight_kg: { $sum: "$weight_kg" },
          contaminated_count: {
            $sum: {
              $cond: ["$has_contaminants", 1, 0],
            },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const distributionData = wasteTypeCounts.map((item) => ({
      waste_type: item._id,
      shipment_count: item.count,
      total_weight_kg: item.total_weight_kg,
      contaminated_count: item.contaminated_count,
      contamination_rate_percent:
        item.count > 0 ? Math.round((item.contaminated_count / item.count) * 100 * 100) / 100 : 0,
    }));

    res.json({
      success: true,
      data: distributionData,
      count: distributionData.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/risk-trends - Contaminant risk trends over time
router.get("/risk-trends", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days = "30" } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string, 10));
    const cutoffDate = daysAgo.toISOString().split("T")[0];

    // Get contaminants detected since cutoff date
    const recentContaminants = await ContaminantModel.find({
      detected_at: { $gte: cutoffDate },
    }).sort({ detected_at: 1 });

    // Group by date and risk level
    const trendsByDate: Record<string, { low: number; medium: number; high: number; critical: number }> = {};

    recentContaminants.forEach((contaminant) => {
      const date = contaminant.detected_at.split("T")[0];
      if (!date) return;
      
      if (!trendsByDate[date]) {
        trendsByDate[date] = { low: 0, medium: 0, high: 0, critical: 0 };
      }
      const riskLevel = contaminant.risk_level as "low" | "medium" | "high" | "critical";
      const existingCounts = trendsByDate[date];
      if (existingCounts) {
        existingCounts[riskLevel] = (existingCounts[riskLevel] || 0) + 1;
      }
    });

    const trendsData = Object.entries(trendsByDate)
      .map(([date, counts]) => ({
        date,
        ...counts,
        total: (counts.low || 0) + (counts.medium || 0) + (counts.high || 0) + (counts.critical || 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        period_days: parseInt(days as string, 10),
        start_date: cutoffDate,
        trends: trendsData,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

