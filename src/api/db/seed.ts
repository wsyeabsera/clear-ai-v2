#!/usr/bin/env node

// Database seed script
import dotenv from "dotenv";
import { connectDB, disconnectDB } from "./connection.js";
import { seedCollections } from "./seed-collections.js";

// Load environment variables
dotenv.config();

async function seedDatabase() {
  try {
    console.log("\n🌱 Starting database seed...\n");

    // Connect to database
    await connectDB();

    // Seed all collections
    console.log("Clearing existing data and seeding...");
    const summary = await seedCollections();

    console.log("\n✅ Database seeded successfully!\n");
    console.log("Summary:");
    console.log(`  - ${summary.facilities} facilities`);
    console.log(`  - ${summary.producers} waste producers`);
    console.log(`  - ${summary.contracts} contracts`);
    console.log(`  - ${summary.shipments} shipments`);
    console.log(`  - ${summary.compositions} shipment compositions`);
    console.log(`  - ${summary.loads} shipment loads`);
    console.log(`  - ${summary.contaminants} contaminants`);
    console.log(`  - ${summary.inspections} inspections`);
    console.log("");
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Run seed
seedDatabase();
