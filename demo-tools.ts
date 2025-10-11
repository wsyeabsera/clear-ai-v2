#!/usr/bin/env node
// Comprehensive MCP Tools Demonstration

import { ShipmentsListTool } from "./dist/tools/shipments/list.js";
import { ShipmentsCreateTool } from "./dist/tools/shipments/create.js";
import { ShipmentsUpdateTool } from "./dist/tools/shipments/update.js";
import { ContaminantsListTool } from "./dist/tools/contaminants/list.js";
import { FacilitiesGetTool } from "./dist/tools/facilities/get.js";
import { InspectionsGetTool } from "./dist/tools/inspections/get.js";
import { AnalyticsWasteDistributionTool } from "./dist/tools/analytics/waste-distribution.js";
import { ShipmentsDetailedTool } from "./dist/tools/relationships/shipments-detailed.js";
import { InspectionsDetailedTool } from "./dist/tools/relationships/inspections-detailed.js";

const API_URL = "http://localhost:4000/api";

async function demo() {
  console.log("🎬 MCP Tools Comprehensive Demo\n");

  try {
    // Demo 1: Query with filters
    console.log("📦 Demo 1: List all plastic waste shipments");
    const listTool = new ShipmentsListTool(API_URL);
    const plastic = await listTool.execute({ waste_type: "plastic" });
    console.log(`   Found ${plastic.data?.data?.length || 0} plastic shipments`);
    plastic.data?.data?.forEach((s: any) => {
      console.log(`   - ${s.id}: ${s.weight_kg}kg, Carrier: ${s.carrier}`);
    });

    // Demo 2: Get specific resource
    console.log("\n🏭 Demo 2: Get facility details");
    const facilityTool = new FacilitiesGetTool(API_URL);
    const facility = await facilityTool.execute({ id: "F2" });
    const f = facility.data?.data;
    console.log(`   Name: ${f?.name}`);
    console.log(`   Location: ${f?.location}`);
    console.log(`   Accepted types: ${f?.accepted_waste_types?.join(", ")}`);
    console.log(`   Contact: ${f?.contact_email}`);

    // Demo 3: Analytics
    console.log("\n📊 Demo 3: Waste type distribution analytics");
    const analyticsTool = new AnalyticsWasteDistributionTool(API_URL);
    const distribution = await analyticsTool.execute({});
    console.log(`   Waste types analyzed: ${distribution.data?.data?.length || 0}`);
    distribution.data?.data?.slice(0, 3).forEach((w: any) => {
      console.log(`   - ${w.waste_type}: ${w.shipment_count} shipments, ${w.total_weight_kg}kg total`);
    });

    // Demo 4: Relationship query - Shipment with details
    console.log("\n🔗 Demo 4: Get shipment with all related data");
    const detailedTool = new ShipmentsDetailedTool(API_URL);
    const detailed = await detailedTool.execute({
      id: "S2",
      include: ["contaminants", "inspection", "facility"],
    });
    console.log(`   Shipment: ${detailed.data?.data?.id} - ${detailed.data?.data?.waste_type}`);
    console.log(`   Contaminants: ${detailed.data?.contaminants?.length || 0} found`);
    console.log(`   Inspections: ${detailed.data?.inspections?.length || 0} performed`);
    console.log(`   Facility: ${detailed.data?.facility?.name || "N/A"}`);

    // Demo 5: Detailed inspection with full context
    console.log("\n🔍 Demo 5: Get inspection with full context");
    const inspDetailedTool = new InspectionsDetailedTool(API_URL);
    const inspDetailed = await inspDetailedTool.execute({ id: "I2" });
    const insp = inspDetailed.data?.data;
    console.log(`   Inspection: ${insp?.id} by ${insp?.inspector}`);
    console.log(`   Status: ${insp?.status} (${insp?.passed ? "PASSED" : "FAILED"})`);
    console.log(`   Duration: ${insp?.duration_minutes} minutes`);
    console.log(`   Shipment: ${insp?.shipment_details?.id} - ${insp?.shipment_details?.waste_type}`);
    console.log(`   Facility: ${insp?.facility_details?.name}`);
    console.log(`   Contaminants: ${insp?.contaminants_found?.length || 0} detected`);

    // Demo 6: High-risk contaminants
    console.log("\n⚠️  Demo 6: Find all high-risk contaminants");
    const contamTool = new ContaminantsListTool(API_URL);
    const highRisk = await contamTool.execute({ risk_level: "high" });
    console.log(`   Found ${highRisk.data?.data?.length || 0} high-risk contaminants:`);
    highRisk.data?.data?.forEach((c: any) => {
      console.log(`   - ${c.id}: ${c.type} (${c.waste_item_detected})`);
      console.log(`     Explosive: ${c.explosive_level}, SO2: ${c.so2_level}, HCl: ${c.hcl_level}`);
    });

    // Demo 7: Create new shipment
    console.log("\n➕ Demo 7: Create a new shipment");
    const createTool = new ShipmentsCreateTool(API_URL);
    const newShipment = await createTool.execute({
      id: "S_TEST_" + Date.now(),
      facility_id: "F1",
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      weight_kg: 1500,
      has_contaminants: false,
      waste_type: "electronic",
      carrier: "TestTransport GmbH",
      composition_notes: "E-waste from office equipment",
      origin: "Munich",
      destination: "Hannover",
    });
    console.log(`   Result: ${newShipment.success ? "✅ CREATED" : "❌ FAILED"}`);
    console.log(`   New shipment ID: ${newShipment.data?.data?.id}`);

    // Demo 8: Update shipment
    console.log("\n✏️  Demo 8: Update the shipment we just created");
    const updateTool = new ShipmentsUpdateTool(API_URL);
    const updated = await updateTool.execute({
      id: newShipment.data?.data?.id,
      status: "in_transit",
      composition_notes: "E-waste - verified and packaged for transport",
    });
    console.log(`   Result: ${updated.success ? "✅ UPDATED" : "❌ FAILED"}`);
    console.log(`   New status: ${updated.data?.data?.status}`);

    console.log("\n" + "=".repeat(60));
    console.log("\n🎉 All demos completed successfully!");
    console.log("\n💡 These tools are now available in Cursor for:");
    console.log("   - Natural language queries");
    console.log("   - Complex data retrieval");
    console.log("   - CRUD operations");
    console.log("   - Analytics and reporting");
    console.log("   - Relationship-based queries\n");
  } catch (error: any) {
    console.error("\n❌ Demo failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("\n⚠️  Make sure the API server is running:");
      console.error("   yarn api:dev\n");
    }
    process.exit(1);
  }
}

demo();


