// Expanded Seed Data with Programmatic Generation
// 20 facilities, 100 shipments, 40 contaminants, 80 inspections

import { ShipmentModel } from "../models/Shipment.js";
import { FacilityModel } from "../models/Facility.js";
import { ContaminantModel } from "../models/Contaminant.js";
import { InspectionModel } from "../models/Inspection.js";

// ============================================================================
// HELPER FUNCTIONS FOR DATA GENERATION
// ============================================================================

/**
 * Generate a date N days ago from today
 */
function generateDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const isoString = date.toISOString();
  const datePart = isoString.split('T')[0];
  if (!datePart) {
    throw new Error('Failed to generate date');
  }
  return datePart;
}

/**
 * Get a random element from an array
 */
function randomChoice<T>(array: T[]): T {
  const element = array[Math.floor(Math.random() * array.length)];
  if (element === undefined) {
    throw new Error('Array is empty or element not found');
  }
  return element;
}

/**
 * Get a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random date within last N days (unused but kept for future use)
 */
// function randomDateWithinDays(maxDaysAgo: number): string {
//   return generateDate(randomInt(0, maxDaysAgo));
// }

// ============================================================================
// FACILITIES (20 German cities)
// ============================================================================

export const facilities = [
  {
    id: "F1",
    name: "Hannover Sorting Center",
    location: "Hannover",
    type: "sorting",
    capacity_tons: 500,
    current_load_tons: 320,
    coordinates: { lat: 52.3759, lon: 9.732 },
    accepted_waste_types: ["plastic", "metal", "paper", "glass"],
    rejected_waste_types: ["hazardous", "medical"],
    contact_email: "info@hannover-sort.de",
    contact_phone: "+49-511-123456",
    operating_hours: "Mon-Fri 7:00-18:00, Sat 8:00-14:00",
  },
  {
    id: "F2",
    name: "Berlin Processing Plant",
    location: "Berlin",
    type: "processing",
    capacity_tons: 1000,
    current_load_tons: 750,
    coordinates: { lat: 52.52, lon: 13.405 },
    accepted_waste_types: ["plastic", "metal", "electronic", "organic"],
    rejected_waste_types: ["radioactive", "explosive"],
    contact_email: "contact@berlin-process.de",
    contact_phone: "+49-30-789012",
    operating_hours: "24/7",
  },
  {
    id: "F3",
    name: "Munich Disposal Center",
    location: "Munich",
    type: "disposal",
    capacity_tons: 800,
    current_load_tons: 450,
    coordinates: { lat: 48.1351, lon: 11.582 },
    accepted_waste_types: ["general", "construction", "industrial"],
    rejected_waste_types: ["chemical", "biological"],
    contact_email: "disposal@munich-waste.de",
    contact_phone: "+49-89-345678",
    operating_hours: "Mon-Sat 6:00-20:00",
  },
  {
    id: "F4",
    name: "Frankfurt Sorting Hub",
    location: "Frankfurt",
    type: "sorting",
    capacity_tons: 600,
    current_load_tons: 380,
    coordinates: { lat: 50.1109, lon: 8.6821 },
    accepted_waste_types: ["plastic", "paper", "glass", "metal"],
    rejected_waste_types: ["hazardous"],
    contact_email: "hub@frankfurt-sort.de",
    contact_phone: "+49-69-456789",
    operating_hours: "Mon-Fri 6:00-18:00",
  },
  {
    id: "F5",
    name: "Hamburg Processing Center",
    location: "Hamburg",
    type: "processing",
    capacity_tons: 900,
    current_load_tons: 650,
    coordinates: { lat: 53.5511, lon: 9.9937 },
    accepted_waste_types: ["plastic", "metal", "electronic"],
    rejected_waste_types: ["radioactive"],
    contact_email: "process@hamburg-waste.de",
    contact_phone: "+49-40-567890",
    operating_hours: "24/7",
  },
  {
    id: "F6",
    name: "Stuttgart Disposal Facility",
    location: "Stuttgart",
    type: "disposal",
    capacity_tons: 700,
    current_load_tons: 420,
    coordinates: { lat: 48.7758, lon: 9.1829 },
    accepted_waste_types: ["general", "construction"],
    rejected_waste_types: ["chemical"],
    contact_email: "disposal@stuttgart-waste.de",
    contact_phone: "+49-711-678901",
    operating_hours: "Mon-Sat 7:00-19:00",
  },
  {
    id: "F7",
    name: "Cologne Sorting Station",
    location: "Cologne",
    type: "sorting",
    capacity_tons: 550,
    current_load_tons: 310,
    coordinates: { lat: 50.9375, lon: 6.9603 },
    accepted_waste_types: ["plastic", "paper", "glass"],
    rejected_waste_types: ["hazardous"],
    contact_email: "sort@cologne-waste.de",
    contact_phone: "+49-221-789012",
    operating_hours: "Mon-Fri 7:00-17:00",
  },
  {
    id: "F8",
    name: "Dresden Processing Plant",
    location: "Dresden",
    type: "processing",
    capacity_tons: 750,
    current_load_tons: 490,
    coordinates: { lat: 51.0504, lon: 13.7373 },
    accepted_waste_types: ["plastic", "metal", "organic"],
    rejected_waste_types: ["radioactive"],
    contact_email: "process@dresden-waste.de",
    contact_phone: "+49-351-890123",
    operating_hours: "24/7",
  },
  {
    id: "F9",
    name: "Leipzig Disposal Center",
    location: "Leipzig",
    type: "disposal",
    capacity_tons: 650,
    current_load_tons: 390,
    coordinates: { lat: 51.3397, lon: 12.3731 },
    accepted_waste_types: ["general", "industrial"],
    rejected_waste_types: ["chemical", "biological"],
    contact_email: "disposal@leipzig-waste.de",
    contact_phone: "+49-341-901234",
    operating_hours: "Mon-Sat 6:00-20:00",
  },
  {
    id: "F10",
    name: "Dortmund Sorting Center",
    location: "Dortmund",
    type: "sorting",
    capacity_tons: 580,
    current_load_tons: 340,
    coordinates: { lat: 51.5136, lon: 7.4653 },
    accepted_waste_types: ["plastic", "paper", "metal"],
    rejected_waste_types: ["hazardous"],
    contact_email: "sort@dortmund-waste.de",
    contact_phone: "+49-231-012345",
    operating_hours: "Mon-Fri 7:00-18:00",
  },
  // NEW FACILITIES (11-20)
  {
    id: "F11",
    name: "Düsseldorf Processing Hub",
    location: "Düsseldorf",
    type: "processing",
    capacity_tons: 850,
    current_load_tons: 620,
    coordinates: { lat: 51.2277, lon: 6.7735 },
    accepted_waste_types: ["plastic", "metal", "electronic", "industrial"],
    rejected_waste_types: ["radioactive", "explosive"],
    contact_email: "hub@duesseldorf-waste.de",
    contact_phone: "+49-211-123456",
    operating_hours: "24/7",
  },
  {
    id: "F12",
    name: "Essen Disposal Facility",
    location: "Essen",
    type: "disposal",
    capacity_tons: 720,
    current_load_tons: 480,
    coordinates: { lat: 51.4556, lon: 7.0116 },
    accepted_waste_types: ["general", "construction", "industrial"],
    rejected_waste_types: ["chemical", "hazardous"],
    contact_email: "disposal@essen-waste.de",
    contact_phone: "+49-201-234567",
    operating_hours: "Mon-Sat 6:00-20:00",
  },
  {
    id: "F13",
    name: "Bremen Sorting Station",
    location: "Bremen",
    type: "sorting",
    capacity_tons: 530,
    current_load_tons: 295,
    coordinates: { lat: 53.0793, lon: 8.8017 },
    accepted_waste_types: ["plastic", "paper", "glass", "metal"],
    rejected_waste_types: ["hazardous", "medical"],
    contact_email: "sort@bremen-waste.de",
    contact_phone: "+49-421-345678",
    operating_hours: "Mon-Fri 7:00-17:00",
  },
  {
    id: "F14",
    name: "Nuremberg Processing Center",
    location: "Nuremberg",
    type: "processing",
    capacity_tons: 780,
    current_load_tons: 550,
    coordinates: { lat: 49.4521, lon: 11.0767 },
    accepted_waste_types: ["plastic", "metal", "electronic"],
    rejected_waste_types: ["radioactive"],
    contact_email: "process@nuremberg-waste.de",
    contact_phone: "+49-911-456789",
    operating_hours: "24/7",
  },
  {
    id: "F15",
    name: "Duisburg Disposal Plant",
    location: "Duisburg",
    type: "disposal",
    capacity_tons: 680,
    current_load_tons: 410,
    coordinates: { lat: 51.4344, lon: 6.7623 },
    accepted_waste_types: ["general", "industrial", "construction"],
    rejected_waste_types: ["chemical", "biological"],
    contact_email: "plant@duisburg-waste.de",
    contact_phone: "+49-203-567890",
    operating_hours: "Mon-Sat 6:00-19:00",
  },
  {
    id: "F16",
    name: "Bochum Sorting Facility",
    location: "Bochum",
    type: "sorting",
    capacity_tons: 520,
    current_load_tons: 280,
    coordinates: { lat: 51.4818, lon: 7.2162 },
    accepted_waste_types: ["plastic", "paper", "metal"],
    rejected_waste_types: ["hazardous"],
    contact_email: "facility@bochum-waste.de",
    contact_phone: "+49-234-678901",
    operating_hours: "Mon-Fri 7:00-18:00",
  },
  {
    id: "F17",
    name: "Wuppertal Processing Station",
    location: "Wuppertal",
    type: "processing",
    capacity_tons: 640,
    current_load_tons: 445,
    coordinates: { lat: 51.2562, lon: 7.1508 },
    accepted_waste_types: ["plastic", "metal", "organic"],
    rejected_waste_types: ["radioactive"],
    contact_email: "station@wuppertal-waste.de",
    contact_phone: "+49-202-789012",
    operating_hours: "Mon-Fri 6:00-20:00",
  },
  {
    id: "F18",
    name: "Bielefeld Disposal Center",
    location: "Bielefeld",
    type: "disposal",
    capacity_tons: 590,
    current_load_tons: 355,
    coordinates: { lat: 52.0302, lon: 8.5325 },
    accepted_waste_types: ["general", "construction"],
    rejected_waste_types: ["chemical"],
    contact_email: "center@bielefeld-waste.de",
    contact_phone: "+49-521-890123",
    operating_hours: "Mon-Sat 7:00-19:00",
  },
  {
    id: "F19",
    name: "Bonn Sorting Hub",
    location: "Bonn",
    type: "sorting",
    capacity_tons: 510,
    current_load_tons: 275,
    coordinates: { lat: 50.7374, lon: 7.0982 },
    accepted_waste_types: ["plastic", "paper", "glass", "metal"],
    rejected_waste_types: ["hazardous", "medical"],
    contact_email: "hub@bonn-waste.de",
    contact_phone: "+49-228-901234",
    operating_hours: "Mon-Fri 7:00-17:00",
  },
  {
    id: "F20",
    name: "Mannheim Processing Facility",
    location: "Mannheim",
    type: "processing",
    capacity_tons: 820,
    current_load_tons: 595,
    coordinates: { lat: 49.4875, lon: 8.4660 },
    accepted_waste_types: ["plastic", "metal", "electronic", "industrial"],
    rejected_waste_types: ["radioactive", "explosive"],
    contact_email: "facility@mannheim-waste.de",
    contact_phone: "+49-621-012345",
    operating_hours: "24/7",
  },
];

// ============================================================================
// SHIPMENTS (100 programmatically generated)
// ============================================================================

const WASTE_TYPES = ['plastic', 'metal', 'paper', 'industrial', 'electronic', 'organic'];
// const STATUSES = ['delivered', 'in_transit', 'rejected', 'pending']; // Defined inline
const CARRIERS = [
  'EcoTrans GmbH',
  'WasteLogistics AG',
  'GreenTransport SE',
  'CleanHaul GmbH',
  'EnviroMove AG',
  'SafeWaste Transport',
  'EcoLogistics DE',
  'GreenShip Solutions',
];

const GERMAN_CITIES = [
  'Hamburg', 'Berlin', 'Munich', 'Frankfurt', 'Stuttgart', 'Cologne',
  'Hannover', 'Dresden', 'Leipzig', 'Dortmund', 'Düsseldorf', 'Essen',
  'Bremen', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
  'Bonn', 'Mannheim'
];

function generateShipments(count: number) {
  const shipments = [];
  
  for (let i = 1; i <= count; i++) {
    // Date distribution: 30% last week, 40% last month, 30% older
    let daysAgo;
    const rand = Math.random();
    if (rand < 0.3) {
      daysAgo = randomInt(0, 7);
    } else if (rand < 0.7) {
      daysAgo = randomInt(8, 30);
    } else {
      daysAgo = randomInt(31, 90);
    }

    const hasContaminants = Math.random() < 0.3; // 30% with contaminants
    
    // Status based on contamination
    let status;
    if (hasContaminants && Math.random() < 0.33) {
      status = 'rejected'; // 10% of all shipments rejected
    } else {
      const statusRand = Math.random();
      if (statusRand < 0.6) status = 'delivered';
      else if (statusRand < 0.75) status = 'in_transit';
      else status = 'pending';
    }

    const waste_type = randomChoice(WASTE_TYPES);
    const origin = randomChoice(GERMAN_CITIES);
    let destination = randomChoice(GERMAN_CITIES);
    while (destination === origin) {
      destination = randomChoice(GERMAN_CITIES);
    }

    shipments.push({
      id: `S${i}`,
      facility_id: `F${randomInt(1, 20)}`,
      date: generateDate(daysAgo),
      status,
      weight_kg: randomInt(500, 2500),
      has_contaminants: hasContaminants,
      origin,
      destination,
      waste_type,
      waste_code: `${waste_type.substring(0, 3).toUpperCase()}-${randomInt(100, 999)}`,
      carrier: randomChoice(CARRIERS),
      composition_notes: hasContaminants
        ? `${waste_type} waste with contamination detected`
        : `Clean ${waste_type} waste from ${origin} collection`,
    });
  }

  return shipments;
}

export const shipments = generateShipments(100);

// ============================================================================
// CONTAMINANTS (40 linked to contaminated shipments)
// ============================================================================

const CONTAMINANT_TYPES = [
  'Lead', 'Mercury', 'PCBs', 'Asbestos', 'Cadmium', 'Chromium',
  'Arsenic', 'Benzene', 'Dioxins', 'Heavy Metals'
];
// const RISK_LEVELS = ['low', 'medium', 'high', 'critical']; // Defined inline
const CHEMICAL_LEVELS = ['low', 'medium', 'high'];

function generateContaminants() {
  const contaminants: any[] = [];
  const contaminatedShipments = shipments.filter(s => s.has_contaminants);
  
  contaminatedShipments.forEach((shipment) => {
    // Some shipments may have multiple contaminants
    const numContaminants = Math.random() < 0.3 ? 2 : 1;
    
    for (let i = 0; i < numContaminants; i++) {
      const type = randomChoice(CONTAMINANT_TYPES);
      const riskRand = Math.random();
      let risk_level;
      if (riskRand < 0.2) risk_level = 'critical';
      else if (riskRand < 0.5) risk_level = 'high';
      else if (riskRand < 0.8) risk_level = 'medium';
      else risk_level = 'low';

      contaminants.push({
        id: `C${contaminants.length + 1}`,
        shipment_id: shipment.id,
        facility_id: shipment.facility_id,
        type,
        concentration_ppm: randomInt(10, 500),
        risk_level,
        detected_at: shipment.date,
        hcl_level: randomChoice(CHEMICAL_LEVELS),
        so2_level: randomChoice(CHEMICAL_LEVELS),
        explosive_level: randomChoice(CHEMICAL_LEVELS),
        waste_item_detected: `${type} contamination in ${shipment.waste_type} waste`,
        estimated_size: randomInt(5, 50),
        notes: `Detected during ${shipment.status === 'rejected' ? 'inspection, shipment rejected' : 'processing'}`,
        analysis_notes: `${type} concentration above acceptable limits`,
      });

      // Stop if we've reached 40 contaminants
      if (contaminants.length >= 40) break;
    }
    
    if (contaminants.length >= 40) return;
  });

  return contaminants;
}

export const contaminants = generateContaminants();

// ============================================================================
// INSPECTIONS (80 across all facilities)
// ============================================================================

// const INSPECTION_TYPES = ['arrival', 'processing', 'departure', 'random']; // Defined inline
const INSPECTORS = [
  'Hans Mueller', 'Anna Schmidt', 'Peter Wagner', 'Maria Fischer',
  'Klaus Weber', 'Sophie Becker', 'Thomas Schulz', 'Lisa Meyer'
];

function generateInspections() {
  const inspections: any[] = [];
  const recentShipments = shipments.filter(s => {
    const shipmentDate = new Date(s.date);
    const daysAgo = Math.floor((Date.now() - shipmentDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo <= 60; // Last 60 days
  });

  // Generate 4 inspections per facility
  facilities.forEach((facility) => {
    for (let i = 0; i < 4; i++) {
      const inspectionDate = generateDate(randomInt(1, 60));
      
      // Find a shipment for this facility around this date
      const relevantShipments = recentShipments.filter(s => s.facility_id === facility.id);
      const shipment = relevantShipments.length > 0
        ? randomChoice(relevantShipments)
        : (recentShipments.length > 0 ? recentShipments[randomInt(0, recentShipments.length - 1)] : null);
      
      // Skip if no shipments available
      if (!shipment) continue;

      const typeRand = Math.random();
      let inspection_type;
      if (typeRand < 0.5) inspection_type = 'arrival';
      else if (typeRand < 0.8) inspection_type = 'processing';
      else if (typeRand < 0.95) inspection_type = 'departure';
      else inspection_type = 'random';

      const passed = Math.random() < 0.85; // 85% pass rate
      const status = passed ? 'accepted' : 'rejected';
      
      const contaminantsDetected = shipment.has_contaminants
        ? contaminants
            .filter(c => c.shipment_id === shipment.id)
            .map(c => c.type)
        : [];

      inspections.push({
        id: `I${inspections.length + 1}`,
        shipment_id: shipment.id,
        facility_id: facility.id,
        date: inspectionDate,
        status,
        inspector: randomChoice(INSPECTORS),
        passed,
        contaminants_detected: contaminantsDetected,
        duration_minutes: randomInt(15, 90),
        inspection_type,
        notes: passed
          ? `${inspection_type} inspection completed successfully`
          : `Contamination detected during ${inspection_type} inspection`,
        follow_up_required: !passed,
        risk_assessment: passed ? 'Low risk' : 'Follow-up inspection required',
        photos: [],
      });

      // Stop if we've reached 80
      if (inspections.length >= 80) return;
    }
  });

  return inspections.slice(0, 80); // Ensure exactly 80
}

export const inspections = generateInspections();

// ============================================================================
// SEED FUNCTION
// ============================================================================

/**
 * Clear all collections
 */
async function clearCollections() {
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

  // Insert facilities first (referenced by other collections)
  await FacilityModel.insertMany(facilities);
  await ShipmentModel.insertMany(shipments);
  await ContaminantModel.insertMany(contaminants);
  await InspectionModel.insertMany(inspections);

  return {
    facilities: facilities.length,
    shipments: shipments.length,
    contaminants: contaminants.length,
    inspections: inspections.length,
  };
}

