// Mock data fixtures for waste management tests
import {
  Shipment,
  Facility,
  Contaminant,
  Inspection,
} from "../../tools/types.js";

export const mockShipments: Shipment[] = [
  {
    id: "S1",
    facility_id: "F1",
    date: "2025-10-05",
    status: "delivered",
    weight_kg: 1500,
    has_contaminants: false,
    origin: "Hamburg",
    destination: "Hannover",
  },
  {
    id: "S2",
    facility_id: "F2",
    date: "2025-10-06",
    status: "rejected",
    weight_kg: 800,
    has_contaminants: true,
    origin: "Berlin",
    destination: "Munich",
  },
  {
    id: "S3",
    facility_id: "F1",
    date: "2025-10-07",
    status: "in_transit",
    weight_kg: 2000,
    has_contaminants: false,
    origin: "Frankfurt",
    destination: "Hannover",
  },
  {
    id: "S4",
    facility_id: "F3",
    date: "2025-10-04",
    status: "delivered",
    weight_kg: 1200,
    has_contaminants: true,
    origin: "Stuttgart",
    destination: "Karlsruhe",
  },
];

export const mockFacilities: Facility[] = [
  {
    id: "F1",
    name: "Hannover Sorting Center",
    location: "Hannover",
    type: "sorting",
    capacity_tons: 500,
    current_load_tons: 320,
    coordinates: {
      lat: 52.3759,
      lon: 9.732,
    },
  },
  {
    id: "F2",
    name: "Berlin Processing Plant",
    location: "Berlin",
    type: "processing",
    capacity_tons: 1000,
    current_load_tons: 750,
    coordinates: {
      lat: 52.52,
      lon: 13.405,
    },
  },
  {
    id: "F3",
    name: "Munich Disposal Center",
    location: "Munich",
    type: "disposal",
    capacity_tons: 800,
    current_load_tons: 450,
    coordinates: {
      lat: 48.1351,
      lon: 11.582,
    },
  },
];

export const mockContaminants: Contaminant[] = [
  {
    id: "C1",
    shipment_id: "S2",
    facility_id: "F2",
    type: "Lead",
    concentration_ppm: 150,
    risk_level: "high",
    detected_at: "2025-10-06T10:30:00Z",
    notes: "Exceeds safety threshold",
  },
  {
    id: "C2",
    shipment_id: "S4",
    facility_id: "F3",
    type: "Mercury",
    concentration_ppm: 75,
    risk_level: "medium",
    detected_at: "2025-10-04T14:20:00Z",
    notes: "Within acceptable limits but requires monitoring",
  },
  {
    id: "C3",
    shipment_id: "S2",
    facility_id: "F2",
    type: "Plastic",
    concentration_ppm: 200,
    risk_level: "low",
    detected_at: "2025-10-06T10:35:00Z",
    notes: "Standard contamination",
  },
];

export const mockInspections: Inspection[] = [
  {
    id: "I1",
    shipment_id: "S1",
    facility_id: "F1",
    date: "2025-10-05",
    status: "accepted",
    inspector: "John Doe",
    notes: "Clean shipment, no issues detected",
  },
  {
    id: "I2",
    shipment_id: "S2",
    facility_id: "F2",
    date: "2025-10-06",
    status: "rejected",
    inspector: "Jane Smith",
    notes: "High lead concentration detected",
    contaminants_detected: ["Lead", "Plastic"],
    risk_assessment: "High risk - immediate action required",
  },
  {
    id: "I3",
    shipment_id: "S3",
    facility_id: "F1",
    date: "2025-10-07",
    status: "pending",
    inspector: "Mike Johnson",
    notes: "Inspection in progress",
  },
  {
    id: "I4",
    shipment_id: "S4",
    facility_id: "F3",
    date: "2025-10-04",
    status: "accepted",
    inspector: "Sarah Williams",
    notes: "Mercury levels within acceptable range",
    contaminants_detected: ["Mercury"],
    risk_assessment: "Low risk - continue monitoring",
  },
];

// Helper function to get shipments with contaminants
export function getContaminatedShipments(): Shipment[] {
  return mockShipments.filter((s) => s.has_contaminants);
}

// Helper function to get shipments by date range
export function getShipmentsByDateRange(
  dateFrom: string,
  dateTo: string
): Shipment[] {
  return mockShipments.filter(
    (s) => s.date >= dateFrom && s.date <= dateTo
  );
}

// Helper function to get facilities by location
export function getFacilitiesByLocation(location: string): Facility[] {
  return mockFacilities.filter((f) =>
    f.location.toLowerCase().includes(location.toLowerCase())
  );
}

// Helper function to get high-risk contaminants
export function getHighRiskContaminants(): Contaminant[] {
  return mockContaminants.filter(
    (c) => c.risk_level === "high" || c.risk_level === "critical"
  );
}

// Helper function to get rejected inspections
export function getRejectedInspections(): Inspection[] {
  return mockInspections.filter((i) => i.status === "rejected");
}

