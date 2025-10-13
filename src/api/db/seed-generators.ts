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