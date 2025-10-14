// Routes index - Export all route modules
import { Router } from "express";
import shipmentsRouter from "./shipments.js";
import facilitiesRouter from "./facilities.js";
import contaminantsRouter from "./contaminants.js";
import inspectionsRouter from "./inspections.js";
import analyticsRouter from "./analytics.js";
import resetRouter from "./reset.js";
import contractsRouter from "./contracts.js";
import wasteProducersRouter from "./waste-producers.js";
import shipmentCompositionsRouter from "./shipment-compositions.js";
import shipmentLoadsRouter from "./shipment-loads.js";

const router = Router();

// Mount all routes
router.use("/shipments", shipmentsRouter);
router.use("/facilities", facilitiesRouter);
router.use("/contaminants-detected", contaminantsRouter);
router.use("/inspections", inspectionsRouter);
router.use("/analytics", analyticsRouter);
router.use("/reset", resetRouter);
router.use("/contracts", contractsRouter);
router.use("/waste-producers", wasteProducersRouter);
router.use("/shipment-compositions", shipmentCompositionsRouter);
router.use("/shipment-loads", shipmentLoadsRouter);

export default router;

