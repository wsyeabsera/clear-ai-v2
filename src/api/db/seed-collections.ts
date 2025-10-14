import { FacilityModel } from "../models/Facility.js";
import { ShipmentModel } from "../models/Shipment.js";
import { ContaminantModel } from "../models/Contaminant.js";
import { InspectionModel } from "../models/Inspection.js";
import { ContractModel } from "../models/Contract.js";
import { WasteProducerModel } from "../models/WasteProducer.js";
import { ShipmentCompositionModel } from "../models/ShipmentComposition.js";
import { ShipmentLoadModel } from "../models/ShipmentLoad.js";
import { generateFacilities, generateShipments, generateContaminants, generateInspections, generateWasteProducers, generateContracts, generateShipmentCompositions, generateShipmentLoads } from "./seed-generators.js";

/**
 * Clear all collections in the database
 */
export async function clearCollections() {
  await ShipmentModel.deleteMany({});
  await FacilityModel.deleteMany({});
  await ContaminantModel.deleteMany({});
  await InspectionModel.deleteMany({});
  await ContractModel.deleteMany({});
  await WasteProducerModel.deleteMany({});
  await ShipmentCompositionModel.deleteMany({});
  await ShipmentLoadModel.deleteMany({});
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
  const insertedFacilities = await FacilityModel.insertMany(generatedFacilities);
  
  // Insert waste producers
  const generatedProducers = generateWasteProducers(15);
  const insertedProducers = await WasteProducerModel.insertMany(generatedProducers);
  
  // Insert contracts
  const generatedContracts = generateContracts(25, insertedProducers, insertedFacilities);
  await ContractModel.insertMany(generatedContracts);
  
  // Insert shipments
  const generatedShipments = generateShipments(100, insertedFacilities);
  const insertedShipments = await ShipmentModel.insertMany(generatedShipments);
  
  // Insert shipment compositions
  const generatedCompositions = generateShipmentCompositions(150, insertedShipments);
  await ShipmentCompositionModel.insertMany(generatedCompositions);
  
  // Insert shipment loads
  const generatedLoads = generateShipmentLoads(80, insertedShipments);
  await ShipmentLoadModel.insertMany(generatedLoads);
  
  // Insert contaminants
  const generatedContaminants = generateContaminants(40, insertedShipments);
  await ContaminantModel.insertMany(generatedContaminants);

  // Insert inspections
  const generatedInspections = generateInspections(80, insertedShipments, insertedFacilities);
  await InspectionModel.insertMany(generatedInspections);

  return {
    facilities: generatedFacilities.length,
    producers: generatedProducers.length,
    contracts: generatedContracts.length,
    shipments: generatedShipments.length,
    compositions: generatedCompositions.length,
    loads: generatedLoads.length,
    contaminants: generatedContaminants.length,
    inspections: generatedInspections.length,
  };
}

