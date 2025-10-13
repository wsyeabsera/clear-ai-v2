import { FacilityModel } from "../models/Facility.js";
import { ShipmentModel } from "../models/Shipment.js";
import { ContaminantModel } from "../models/Contaminant.js";
import { InspectionModel } from "../models/Inspection.js";
import { generateFacilities, generateShipments, generateContaminants, generateInspections } from "./seed-generators.js";

/**
 * Clear all collections in the database
 */
export async function clearCollections() {
  await ShipmentModel.deleteMany({});
  await FacilityModel.deleteMany({});
  await ContaminantModel.deleteMany({});
  await InspectionModel.deleteMany({});
}

/**
 * Seed the database with test data
 * @returns Summary of seeded data
 */
export async function seedCollections() {
  // Clear existing data first
  await clearCollections();

  // Insert facilities
  const generatedFacilities = generateFacilities(20);
  const insertedFacilities = await FacilityModel.insertMany(generatedFacilities)
  
  // Insert shipments
  const generatedShipments = generateShipments(100, insertedFacilities);
  const insertedShipments = await ShipmentModel.insertMany(generatedShipments);
  
  // Insert contaminants
  const generatedContaminants = generateContaminants(40, insertedShipments);
  await ContaminantModel.insertMany(generatedContaminants);

  // Insert inspections
  const generatedInspections = generateInspections(80, insertedShipments, insertedFacilities);
  await InspectionModel.insertMany(generatedInspections);

  return {
    facilities: generatedFacilities.length,
    shipments: generatedShipments.length,
    contaminants: generatedContaminants.length,
    inspections: generatedInspections.length,
  };
}

