import {
  Facility as IFacility, FacilityType, Shipment as IShipment, ShipmentStatus, Contaminant as IContaminant, RiskLevel, Inspection as IInspection,
  InspectionStatus,
  InspectionType
} from "../../shared/types/tool.js";
import { randomChoice, randomInt, randomFloat, generateDate } from "./seed-utils.js";
import { faker } from "@faker-js/faker/locale/de";

const GERMAN_CITIES = [
  'Hamburg', 'Berlin', 'Munich', 'Frankfurt', 'Stuttgart', 'Cologne',
  'Hannover', 'Dresden', 'Leipzig', 'Dortmund', 'Düsseldorf', 'Essen',
  'Bremen', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
  'Bonn', 'Mannheim'
];
const FACILITY_TYPES = ["sorting", "processing", "disposal"];
const WASTE_TYPES = ["plastic", "metal", "paper", "industrial", "electronic", "organic"];

// European waste codes for realistic data
const EUROPEAN_WASTE_CODES = [
  "191212", // Other wastes from mechanical treatment (mixed plastics)
  "150101", // Paper and cardboard packaging
  "150102", // Plastic packaging
  "170201", // Wood
  "170203", // Plastic
  "200101", // Paper and cardboard (municipal)
  "160601", // Electronic waste
  "020107", // Organic waste
];

const PRODUCER_TYPES = ["industrial", "commercial", "municipal"];
const CONTRACT_STATUSES = ["active", "expired", "suspended"];
const DETECTION_METHODS = ["camera", "manual", "sensor"];


export const generateFacilities = (amount: number) => {
  const facilities: IFacility[] = [];
  for (let i = 0; i < amount; i++) {
    facilities.push({
      id: `facility-${i + 1}`,
      name: faker.company.name(),
      location: randomChoice(GERMAN_CITIES),
      type: randomChoice(FACILITY_TYPES) as FacilityType,
      capacity_tons: randomInt(1000, 10000),
      current_load_tons: randomInt(0, 10000),
      coordinates: {
        lat: randomFloat(10, 100),
        lon: randomFloat(10, 100),
      },
      accepted_waste_types: Array.from((new Set(randomChoice(WASTE_TYPES) as unknown as string[]))),
      rejected_waste_types: Array.from(new Set(randomChoice(WASTE_TYPES) as unknown as string[])),
      contact_email: faker.internet.email(),
      contact_phone: faker.phone.number(),
      operating_hours: `Mon-Fri ${randomInt(7, 18)}:00-${randomInt(18, 24)}:00, Sat ${randomInt(8, 14)}:00-${randomInt(14, 20)}:00`,
    });
  }
  return facilities;
}

const SHIPMENT_STATUSES = ["pending", "in_transit", "delivered", "rejected"];
export const generateShipments = (amount: number, facilities: IFacility[]) => {
  const shipments: IShipment[] = [];
  for (let i = 0; i < amount; i++) {
    shipments.push({
      id: `shipment-${i + 1}`,
      facility_id: randomChoice(facilities).id,
      date: generateDate(randomInt(0, 90)),
      status: randomChoice(SHIPMENT_STATUSES) as unknown as ShipmentStatus,
      weight_kg: randomInt(1000, 10000),
      has_contaminants: faker.datatype.boolean(),
      origin: randomChoice(GERMAN_CITIES),
      destination: randomChoice(GERMAN_CITIES),
      waste_type: randomChoice(WASTE_TYPES),
      waste_code: faker.string.uuid(),
      carrier: faker.company.name(),
      composition_notes: faker.lorem.sentence(),
    });
  }
  return shipments;
}

const RISK_LEVELS = ["low", "medium", "high", "critical"];

export const generateContaminants = (amount: number, shipments: IShipment[]) => {
  const contaminants: IContaminant[] = [];
  for (let i = 0; i < amount; i++) {
    contaminants.push({
      id: `contaminant-${i + 1}`,
      shipment_id: randomChoice(shipments).id as unknown as string,
      type: randomChoice(WASTE_TYPES) as unknown as string,
      concentration_ppm: randomInt(0, 1000),
      risk_level: randomChoice(RISK_LEVELS) as unknown as RiskLevel,
      detected_at: generateDate(randomInt(0, 90)),
    });
  }
  return contaminants;
}

const INSPECTION_STATUSES = ["accepted", "rejected", "pending"];
const INSPECTION_TYPES = ["arrival", "processing", "departure", "random"];
export const generateInspections = (amount: number, shipments: IShipment[], facilities: IFacility[]) => {
  const inspections: IInspection[] = [];
  for (let i = 0; i < amount; i++) {
    inspections.push({
      id: `inspection-${i + 1}`,
      shipment_id: randomChoice(shipments).id as unknown as string,
      facility_id: randomChoice(facilities).id as unknown as string,
      date: generateDate(randomInt(0, 90)),
      status: randomChoice(INSPECTION_STATUSES) as unknown as InspectionStatus,
      inspector: faker.person.fullName(),
      notes: faker.lorem.sentence(),
      contaminants_detected: randomChoice(WASTE_TYPES) as unknown as string[],
      risk_assessment: faker.lorem.sentence(),
      inspection_type: randomChoice(INSPECTION_TYPES) as unknown as InspectionType,
      duration_minutes: randomInt(15, 90),
      passed: faker.datatype.boolean(),
      follow_up_required: faker.datatype.boolean(),
      photos: [],
    });
  }
  return inspections;
}

// Generate waste producers
export const generateWasteProducers = (amount: number) => {
  const producers = [];
  for (let i = 0; i < amount; i++) {
    producers.push({
      id: `producer-${i + 1}`,
      name: faker.company.name(),
      type: randomChoice(PRODUCER_TYPES),
      location: randomChoice(GERMAN_CITIES),
      contact_email: faker.internet.email(),
      contact_phone: faker.phone.number(),
      license_number: `LIC-${faker.string.alphanumeric(8).toUpperCase()}`,
      active_contracts: randomInt(0, 5),
    });
  }
  return producers;
}

// Generate contracts
export const generateContracts = (amount: number, producers: any[], facilities: any[]) => {
  const contracts = [];
  for (let i = 0; i < amount; i++) {
    const producer = randomChoice(producers);
    const facility = randomChoice(facilities);
    const startDate = generateDate(randomInt(0, 180)); // Start within last 6 months
    const endDate = generateDate(randomInt(180, 365)); // End within next 6 months
    
    contracts.push({
      id: `contract-${i + 1}`,
      producer_id: producer.id,
      facility_id: facility.id,
      waste_types_declared: [
        randomChoice(EUROPEAN_WASTE_CODES),
        randomChoice(EUROPEAN_WASTE_CODES)
      ].filter((code, index, arr) => arr.indexOf(code) === index), // Remove duplicates
      start_date: startDate,
      end_date: endDate,
      max_weight_kg: randomInt(5000, 50000),
      status: randomChoice(CONTRACT_STATUSES),
      terms: faker.lorem.paragraph(),
    });
  }
  return contracts;
}

// Generate shipment compositions
export const generateShipmentCompositions = (amount: number, shipments: any[]) => {
  const compositions = [];
  for (let i = 0; i < amount; i++) {
    const shipment = randomChoice(shipments);
    const wasteCode = randomChoice(EUROPEAN_WASTE_CODES);
    
    compositions.push({
      id: `composition-${i + 1}`,
      shipment_id: shipment.id,
      waste_code: wasteCode,
      waste_description: faker.lorem.words(3),
      percentage: randomFloat(5, 95),
      weight_kg: randomInt(100, 2000),
      detected_by: randomChoice(DETECTION_METHODS),
      confidence: randomFloat(0.7, 1.0),
    });
  }
  return compositions;
}

// Generate shipment loads
export const generateShipmentLoads = (amount: number, shipments: any[]) => {
  const loads = [];
  for (let i = 0; i < amount; i++) {
    const shipment = randomChoice(shipments);
    const wasteCodes = [
      randomChoice(EUROPEAN_WASTE_CODES),
      randomChoice(EUROPEAN_WASTE_CODES)
    ].filter((code, index, arr) => arr.indexOf(code) === index); // Remove duplicates
    
    loads.push({
      id: `load-${i + 1}`,
      shipment_id: shipment.id,
      detected_at: generateDate(randomInt(0, 90)),
      camera_id: `CAM-${faker.string.alphanumeric(6).toUpperCase()}`,
      waste_codes_detected: wasteCodes,
      total_weight_kg: randomInt(1000, 8000),
      image_url: faker.image.url(),
      analysis_confidence: randomFloat(0.8, 1.0),
      matches_contract: faker.datatype.boolean(),
    });
  }
  return loads;
}