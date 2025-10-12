# Agent Tester - Test Data Management

## Overview

Proper test data management ensures tests run in a clean, predictable environment with realistic data while maintaining data isolation and reproducibility.

## Principles

1. **Isolation** - Each test starts with clean state
2. **Reproducibility** - Same test produces same results
3. **Realism** - Data resembles production
4. **Safety** - Never touches production data
5. **Efficiency** - Fast setup and teardown

## Test Database Strategy

### Separate Test Database

```bash
# Environment configuration
MONGODB_URI=mongodb://localhost:27017/wasteer-production
MONGODB_TEST_URI=mongodb://localhost:27017/wasteer-test

# Agent tester always uses test database
WASTEER_API_URL=http://localhost:4000/api
WASTEER_DB=test
```

### Database Reset Strategies

**Strategy 1: Drop and Recreate (Slowest, Most Complete)**
```typescript
async function resetDatabase(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await seedDatabase();
}
```

**Strategy 2: Delete All Documents (Faster)**
```typescript
async function resetDatabase(): Promise<void> {
  await Promise.all([
    ShipmentModel.deleteMany({}),
    FacilityModel.deleteMany({}),
    ContaminantModel.deleteMany({}),
    InspectionModel.deleteMany({})
  ]);
  await seedDatabase();
}
```

**Strategy 3: Transactions (Fastest, Most Isolated)**
```typescript
async function runTestInTransaction(test: () => Promise<void>): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    await test();
    await session.abortTransaction();  // Always rollback
  } finally {
    session.endSession();
  }
}
```

**Recommendation:** Strategy 2 for agent tester (good balance of speed and completeness)

## Test Data Fixtures

### Fixture Structure

```typescript
interface DataFixture {
  shipments: Shipment[];
  facilities: Facility[];
  contaminants: Contaminant[];
  inspections: Inspection[];
}

const standardFixture: DataFixture = {
  shipments: [
    {
      id: 'S001',
      facility_id: 'F001',
      date: '2025-10-01',
      status: 'delivered',
      weight_kg: 1500,
      has_contaminants: false,
      waste_type: 'plastic',
      origin: 'Berlin',
      destination: 'Recycling Center A'
    },
    {
      id: 'S002',
      facility_id: 'F002',
      date: '2025-10-05',
      status: 'rejected',
      weight_kg: 800,
      has_contaminants: true,
      waste_type: 'industrial',
      origin: 'Hamburg',
      destination: 'Processing Plant B'
    }
    // ... more shipments
  ],
  
  facilities: [
    {
      id: 'F001',
      name: 'Recycling Center A',
      location: 'Berlin',
      type: 'sorting',
      capacity_tons: 5000,
      current_load_tons: 2500,
      accepted_waste_types: ['plastic', 'metal', 'paper']
    }
    // ... more facilities
  ],
  
  contaminants: [
    {
      id: 'C001',
      shipment_id: 'S002',
      facility_id: 'F002',
      type: 'Lead',
      concentration_ppm: 150,
      risk_level: 'high',
      detected_at: '2025-10-05T10:30:00Z'
    }
    // ... more contaminants
  ],
  
  inspections: [
    {
      id: 'I001',
      shipment_id: 'S001',
      facility_id: 'F001',
      date: '2025-10-01',
      status: 'accepted',
      inspector: 'John Doe',
      passed: true
    }
    // ... more inspections
  ]
};
```

### Fixture Variants

```typescript
const fixtures = {
  // Standard dataset (50 entities of each type)
  standard: standardFixture,
  
  // Large dataset (1000+ entities)
  large: largeDa tasetFixture,
  
  // Edge cases (empty, minimal, extreme values)
  edge: edgeCaseFixture,
  
  // Specific scenarios
  contamination: contaminationHeavyFixture,
  capacity: capacityTestingFixture,
  temporal: temporalTestingFixture
};

async function loadFixture(name: string): Promise<void> {
  const fixture = fixtures[name];
  await resetDatabase();
  await seedFixture(fixture);
}
```

## Seeding Strategy

### Seed Implementation

```typescript
async function seedDatabase(fixture: DataFixture = standardFixture): Promise<void> {
  console.log('Seeding test database...');
  
  // Clear existing data
  await Promise.all([
    ShipmentModel.deleteMany({}),
    FacilityModel.deleteMany({}),
    ContaminantModel.deleteMany({}),
    InspectionModel.deleteMany({})
  ]);
  
  // Insert in order (respect foreign keys)
  console.log(`Seeding ${fixture.facilities.length} facilities...`);
  await FacilityModel.insertMany(fixture.facilities);
  
  console.log(`Seeding ${fixture.shipments.length} shipments...`);
  await ShipmentModel.insertMany(fixture.shipments);
  
  console.log(`Seeding ${fixture.contaminants.length} contaminants...`);
  await ContaminantModel.insertMany(fixture.contaminants);
  
  console.log(`Seeding ${fixture.inspections.length} inspections...`);
  await InspectionModel.insertMany(fixture.inspections);
  
  console.log('Seeding complete!');
}
```

### Dynamic Data Generation

```typescript
interface DataGeneratorConfig {
  shipmentCount: number;
  facilityCount: number;
  contaminationRate: number;  // 0.0 - 1.0
  dateRange: { start: Date; end: Date };
}

function generateTestData(config: DataGeneratorConfig): DataFixture {
  const facilities = generateFacilities(config.facilityCount);
  const shipments = generateShipments(
    config.shipmentCount,
    facilities,
    config.dateRange
  );
  
  const contaminatedShipments = shipments
    .filter(() => Math.random() < config.contaminationRate);
    
  const contaminants = contaminatedShipments.map(s => 
    generateContaminant(s)
  );
  
  const inspections = shipments.map(s => 
    generateInspection(s)
  );
  
  return { facilities, shipments, contaminants, inspections };
}
```

## State Management

### Test Lifecycle

```typescript
class TestDataManager {
  async beforeAll(): Promise<void> {
    // One-time setup
    await connectToTestDatabase();
    await loadInitialFixtures();
  }
  
  async beforeEach(scenario: Scenario): Promise<void> {
    // Reset state for each test
    if (scenario.requiresCleanState) {
      await resetDatabase();
      await seedFixture(scenario.fixture || 'standard');
    }
  }
  
  async afterEach(scenario: Scenario): Promise<void> {
    // Cleanup after test
    if (scenario.cleanupAfter) {
      await cleanupResources();
    }
  }
  
  async afterAll(): Promise<void> {
    // Final cleanup
    await resetDatabase();
    await disconnectFromDatabase();
  }
}
```

### Memory State Management

```typescript
class MemoryStateManager {
  async resetMemory(): Promise<void> {
    // Clear Neo4j episodic memory
    await neo4j.run('MATCH (n) DETACH DELETE n');
    
    // Clear Pinecone semantic memory
    await pinecone.deleteAll({ namespace: 'test' });
  }
  
  async seedMemory(context: MemoryContext): Promise<void> {
    // Seed with conversation history
    for (const event of context.events) {
      await memoryManager.storeEpisodic(event);
    }
    
    // Seed with semantic memories
    for (const memory of context.semantic) {
      await memoryManager.storeSemantic(memory);
    }
  }
}
```

## Mock Data Generation

### Realistic Data Generators

```typescript
function generateRealisticShipment(): Shipment {
  return {
    id: `S${randomInt(1000, 9999)}`,
    facility_id: randomChoice(facilityIds),
    date: randomDateInPast(90),  // Last 90 days
    status: randomChoice(['pending', 'in_transit', 'delivered', 'rejected']),
    weight_kg: randomInt(100, 5000),
    has_contaminants: Math.random() < 0.15,  // 15% contamination rate
    waste_type: randomChoice(['plastic', 'metal', 'paper', 'industrial']),
    origin: randomChoice(['Berlin', 'Hamburg', 'Munich', 'Cologne']),
    destination: randomChoice(facilityNames),
    carrier: randomChoice(['TruckCo', 'WasteLog', 'EcoTrans'])
  };
}

function generateRealisticContaminant(shipment: Shipment): Contaminant {
  const contaminantTypes = {
    plastic: ['Microplastics', 'PVC'],
    metal: ['Lead', 'Mercury', 'Cadmium'],
    industrial: ['PCB', 'Asbestos', 'Chemical Residue'],
    paper: ['Ink Contamination', 'Adhesives']
  };
  
  const types = contaminantTypes[shipment.waste_type] || ['Unknown'];
  
  return {
    id: `C${randomInt(1000, 9999)}`,
    shipment_id: shipment.id,
    facility_id: shipment.facility_id,
    type: randomChoice(types),
    concentration_ppm: randomInt(10, 500),
    risk_level: calculateRiskLevel(randomInt(10, 500)),
    detected_at: shipment.date
  };
}
```

## PII and Privacy

### No Production Data

```typescript
// ❌ NEVER do this
async function copyProductionData(): Promise<void> {
  // DO NOT copy from production!
}

// ✅ Generate synthetic data instead
async function generateSyntheticData(): Promise<void> {
  const data = generateTestData({ shipmentCount: 100 });
  await seedDatabase(data);
}
```

### Data Anonymization (If needed)

```typescript
function anonymize(data: any[]): any[] {
  return data.map(item => ({
    ...item,
    // Remove PII
    customerName: undefined,
    contactInfo: undefined,
    // Anonymize IDs
    id: `anon-${hashId(item.id)}`,
    // Generalize locations
    location: generalizeLocation(item.location)
  }));
}
```

## Configuration

```typescript
interface DataManagementConfig {
  // Database
  databaseUrl: string;
  resetStrategy: 'drop' | 'delete' | 'transaction';
  
  // Fixtures
  defaultFixture: string;
  fixturesPath: string;
  
  // Generation
  enableDynamicGeneration: boolean;
  cacheGeneratedData: boolean;
  
  // Memory
  resetMemoryBetweenTests: boolean;
  memoryFixturesPath: string;
}
```

---

**Next Document:** [09-implementation-phases.md](./09-implementation-phases.md) - Build roadmap

