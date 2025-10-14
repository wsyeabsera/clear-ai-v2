#!/usr/bin/env ts-node

/**
 * Comprehensive Seed Data Generator
 * Creates realistic test data for extensive multi-agent system testing
 * 
 * Generates:
 * - 50+ facilities (sorting, processing, disposal)
 * - 200+ shipments across 6 months
 * - 100+ contaminants (various risk levels)
 * - 150+ inspections (passed, rejected, pending)
 * - 30+ waste producers with contracts
 * - Shipment compositions and loads
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Configuration
const CONFIG = {
  facilities: {
    total: 60,
    sorting: 20,
    processing: 20,
    disposal: 20
  },
  shipments: {
    total: 250,
    months: 6
  },
  contaminants: {
    total: 120,
    highRisk: 30,
    mediumRisk: 40,
    lowRisk: 50
  },
  inspections: {
    total: 180,
    passed: 108, // 60%
    rejected: 54, // 30%
    pending: 18  // 10%
  },
  wasteProducers: {
    total: 35
  }
};

// Data templates
const FACILITY_TYPES = ['sorting', 'processing', 'disposal'] as const;
const WASTE_TYPES = ['plastic', 'metal', 'paper', 'organic', 'electronic', 'industrial'] as const;
const LOCATIONS = [
  'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf',
  'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden', 'Hannover', 'Nuremberg',
  'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster'
];
const SHIPMENT_STATUSES = ['pending', 'in_transit', 'delivered', 'rejected'] as const;
const INSPECTION_STATUSES = ['accepted', 'rejected', 'pending'] as const;
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const CONTAMINANT_TYPES = ['Lead', 'Mercury', 'Plastic', 'Chemical', 'Biological', 'Heavy Metal'] as const;

// Helper functions
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
}

function generateCoordinates(): { lat: number; lon: number } {
  // German coordinates roughly
  return {
    lat: randomFloat(47.0, 55.0),
    lon: randomFloat(5.0, 15.0)
  };
}

function generateEmail(name: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'company.de'];
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}${randomInt(1, 99)}@${randomChoice(domains)}`;
}

function generatePhone(): string {
  const formats = [
    '+49-{area}-{number}',
    '({area}) {number}',
    '+49-{area}-{number}'
  ];
  const area = randomInt(100, 999);
  const number = randomInt(10000000, 99999999);
  return randomChoice(formats)
    .replace('{area}', area.toString())
    .replace('{number}', number.toString());
}

function generateOperatingHours(): string {
  const weekdays = `${randomInt(6, 10)}:00-${randomInt(16, 24)}:00`;
  const saturday = `${randomInt(8, 12)}:00-${randomInt(14, 20)}:00`;
  return `Mon-Fri ${weekdays}, Sat ${saturday}`;
}

// API helper
async function apiCall(endpoint: string, data: any) {
  try {
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, data);
    return response.data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

async function createFacilities() {
  console.log('🏭 Creating facilities...');
  
  const facilities = [];
  
  for (let i = 1; i <= CONFIG.facilities.total; i++) {
    const type = randomChoice(FACILITY_TYPES);
    const location = randomChoice(LOCATIONS);
    const coordinates = generateCoordinates();
    const capacity = randomInt(1000, 10000);
    const currentLoad = randomInt(0, capacity);
    
    // Generate accepted/rejected waste types
    const allWasteTypes = [...WASTE_TYPES];
    const acceptedCount = randomInt(2, 4);
    const accepted = [];
    for (let j = 0; j < acceptedCount; j++) {
      const wasteType = randomChoice(allWasteTypes);
      accepted.push(wasteType);
      allWasteTypes.splice(allWasteTypes.indexOf(wasteType), 1);
    }
    const rejected = allWasteTypes.slice(0, randomInt(1, 3));
    
    const facility = {
      id: `facility-${i}`,
      name: `Test Facility ${i} - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      location,
      type,
      capacity_tons: capacity,
      current_load_tons: currentLoad,
      coordinates,
      accepted_waste_types: accepted,
      rejected_waste_types: rejected,
      contact_email: generateEmail(`facility${i}`),
      contact_phone: generatePhone(),
      operating_hours: generateOperatingHours()
    };
    
    try {
      await apiCall('/facilities', facility);
      facilities.push(facility);
      console.log(`  ✓ Created ${facility.id}: ${facility.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to create ${facility.id}`);
    }
  }
  
  return facilities;
}

async function createWasteProducers() {
  console.log('🏢 Creating waste producers...');
  
  const producers = [];
  
  for (let i = 1; i <= CONFIG.wasteProducers.total; i++) {
    const producer = {
      id: `producer-${i}`,
      name: `Waste Producer ${i}`,
      location: randomChoice(LOCATIONS),
      contact_email: generateEmail(`producer${i}`),
      contact_phone: generatePhone(),
      waste_types: randomChoice(WASTE_TYPES),
      compliance_rating: randomFloat(0.5, 1.0)
    };
    
    try {
      await apiCall('/waste-producers', producer);
      producers.push(producer);
      console.log(`  ✓ Created ${producer.id}: ${producer.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to create ${producer.id}`);
    }
  }
  
  return producers;
}

async function createShipments(facilities: any[], producers: any[]) {
  console.log('🚛 Creating shipments...');
  
  const shipments = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - CONFIG.shipments.months);
  
  for (let i = 1; i <= CONFIG.shipments.total; i++) {
    const facility = randomChoice(facilities);
    const producer = randomChoice(producers);
    const status = randomChoice(SHIPMENT_STATUSES);
    const weight = randomInt(500, 5000);
    const hasContaminants = Math.random() < 0.3; // 30% chance
    const date = randomDate(startDate, new Date());
    
    const shipment = {
      id: `shipment-${i}`,
      facility_id: facility.id,
      date,
      status,
      weight_kg: weight,
      has_contaminants: hasContaminants,
      origin: `${randomChoice(LOCATIONS)} Industrial Zone`,
      destination: facility.location,
      waste_type: randomChoice(WASTE_TYPES),
      waste_code: `WC-${randomInt(1000, 9999)}`,
      carrier: `Transport Company ${randomInt(1, 50)}`,
      composition_notes: `Mixed ${randomChoice(WASTE_TYPES)} waste from ${producer.name}`
    };
    
    try {
      await apiCall('/shipments', shipment);
      shipments.push(shipment);
      console.log(`  ✓ Created ${shipment.id}: ${shipment.waste_type} to ${facility.name}`);
    } catch (error) {
      console.error(`  ✗ Failed to create ${shipment.id}`);
    }
  }
  
  return shipments;
}

async function createContaminants(shipments: any[], facilities: any[]) {
  console.log('☢️ Creating contaminants...');
  
  const contaminants = [];
  
  for (let i = 1; i <= CONFIG.contaminants.total; i++) {
    const shipment = randomChoice(shipments.filter(s => s.has_contaminants));
    const facility = randomChoice(facilities);
    const type = randomChoice(CONTAMINANT_TYPES);
    const concentration = randomFloat(10, 1000);
    
    // Determine risk level based on concentration and type
    let riskLevel: string;
    if (concentration > 500 || ['Lead', 'Mercury'].includes(type)) {
      riskLevel = randomChoice(['high', 'critical']);
    } else if (concentration > 200) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }
    
    const contaminant = {
      id: `contaminant-${i}`,
      shipment_id: shipment.id,
      facility_id: facility.id,
      type,
      concentration_ppm: Math.round(concentration),
      risk_level: riskLevel,
      detected_at: randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()),
      notes: `Detected during routine inspection`,
      analysis_notes: `Detailed analysis shows ${type} contamination at ${concentration.toFixed(2)} ppm`,
      waste_item_detected: `${type} residue in ${shipment.waste_type} waste`,
      explosive_level: randomChoice(['low', 'medium', 'high']),
      so2_level: randomChoice(['low', 'medium', 'high']),
      hcl_level: randomChoice(['low', 'medium', 'high']),
      estimated_size: randomFloat(0.1, 5.0)
    };
    
    try {
      await apiCall('/contaminants', contaminant);
      contaminants.push(contaminant);
      console.log(`  ✓ Created ${contaminant.id}: ${type} (${riskLevel} risk)`);
    } catch (error) {
      console.error(`  ✗ Failed to create ${contaminant.id}`);
    }
  }
  
  return contaminants;
}

async function createInspections(shipments: any[], facilities: any[]) {
  console.log('🔍 Creating inspections...');
  
  const inspections = [];
  
  for (let i = 1; i <= CONFIG.inspections.total; i++) {
    const shipment = randomChoice(shipments);
    const facility = randomChoice(facilities);
    const status = randomChoice(INSPECTION_STATUSES);
    const date = randomDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date());
    const duration = randomInt(15, 120);
    const passed = status === 'accepted';
    const followUpRequired = status === 'rejected' || Math.random() < 0.2;
    
    // Generate contaminants detected based on shipment
    const contaminantsDetected = shipment.has_contaminants 
      ? [randomChoice(CONTAMINANT_TYPES)]
      : [];
    
    const inspection = {
      id: `inspection-${i}`,
      shipment_id: shipment.id,
      facility_id: facility.id,
      date,
      status,
      inspector: `Inspector ${randomChoice(['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson'])}`,
      notes: `Routine inspection of ${shipment.waste_type} shipment`,
      contaminants_detected: contaminantsDetected,
      risk_assessment: `Risk level: ${randomChoice(RISK_LEVELS)}`,
      inspection_type: randomChoice(['arrival', 'processing', 'departure', 'random']),
      duration_minutes: duration,
      passed,
      follow_up_required: followUpRequired,
      photos: [`inspection_${i}_photo1.jpg`, `inspection_${i}_photo2.jpg`]
    };
    
    try {
      await apiCall('/inspections', inspection);
      inspections.push(inspection);
      console.log(`  ✓ Created ${inspection.id}: ${status} (${duration}min)`);
    } catch (error) {
      console.error(`  ✗ Failed to create ${inspection.id}`);
    }
  }
  
  return inspections;
}

async function createShipmentCompositions(shipments: any[]) {
  console.log('📦 Creating shipment compositions...');
  
  const compositions = [];
  
  for (let i = 1; i <= shipments.length; i++) {
    const shipment = shipments[i - 1];
    const composition = {
      id: `composition-${i}`,
      shipment_id: shipment.id,
      waste_type: shipment.waste_type,
      percentage: randomFloat(60, 95),
      weight_kg: Math.round(shipment.weight_kg * randomFloat(0.8, 1.0)),
      notes: `Primary composition of ${shipment.waste_type}`
    };
    
    try {
      await apiCall('/shipment-compositions', composition);
      compositions.push(composition);
      console.log(`  ✓ Created composition for ${shipment.id}`);
    } catch (error) {
      console.error(`  ✗ Failed to create composition for ${shipment.id}`);
    }
  }
  
  return compositions;
}

async function createShipmentLoads(shipments: any[]) {
  console.log('⚖️ Creating shipment loads...');
  
  const loads = [];
  
  for (let i = 1; i <= shipments.length; i++) {
    const shipment = shipments[i - 1];
    const load = {
      id: `load-${i}`,
      shipment_id: shipment.id,
      weight_kg: shipment.weight_kg,
      volume_m3: randomFloat(10, 50),
      density_kg_m3: shipment.weight_kg / randomFloat(10, 50),
      loading_date: shipment.date,
      notes: `Load details for ${shipment.id}`
    };
    
    try {
      await apiCall('/shipment-loads', load);
      loads.push(load);
      console.log(`  ✓ Created load for ${shipment.id}`);
    } catch (error) {
      console.error(`  ✗ Failed to create load for ${shipment.id}`);
    }
  }
  
  return loads;
}

async function resetDatabase() {
  console.log('🗑️ Resetting database...');
  try {
    await apiCall('/database/reset', {});
    console.log('  ✓ Database reset successfully');
  } catch (error) {
    console.error('  ✗ Failed to reset database');
  }
}

async function main() {
  console.log('🚀 Starting comprehensive seed data generation...');
  console.log(`📊 Target: ${CONFIG.facilities.total} facilities, ${CONFIG.shipments.total} shipments, ${CONFIG.contaminants.total} contaminants`);
  
  try {
    // Reset database first
    await resetDatabase();
    
    // Create entities in order
    const facilities = await createFacilities();
    const producers = await createWasteProducers();
    const shipments = await createShipments(facilities, producers);
    const contaminants = await createContaminants(shipments, facilities);
    const inspections = await createInspections(shipments, facilities);
    const compositions = await createShipmentCompositions(shipments);
    const loads = await createShipmentLoads(shipments);
    
    console.log('\n🎉 Seed data generation completed!');
    console.log(`📈 Generated:`);
    console.log(`  - ${facilities.length} facilities`);
    console.log(`  - ${producers.length} waste producers`);
    console.log(`  - ${shipments.length} shipments`);
    console.log(`  - ${contaminants.length} contaminants`);
    console.log(`  - ${inspections.length} inspections`);
    console.log(`  - ${compositions.length} compositions`);
    console.log(`  - ${loads.length} loads`);
    
    console.log('\n✅ Ready for comprehensive testing!');
    
  } catch (error) {
    console.error('❌ Seed data generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as generateSeedData };
