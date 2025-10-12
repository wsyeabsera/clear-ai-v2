// Routes index - Export all route modules
import { Router } from "express";
import shipmentsRouter from "./shipments.js";
import facilitiesRouter from "./facilities.js";
import contaminantsRouter from "./contaminants.js";
import inspectionsRouter from "./inspections.js";
import analyticsRouter from "./analytics.js";
import resetRouter from "./reset.js";
import seedRouter from "./seed.js";

const router = Router();

// Mount all routes
router.use("/shipments", shipmentsRouter);
router.use("/facilities", facilitiesRouter);
router.use("/contaminants-detected", contaminantsRouter);
router.use("/inspections", inspectionsRouter);
router.use("/analytics", analyticsRouter);
router.use("/reset", resetRouter);
router.use("/seed", seedRouter);

export default router;

