// MongoDB connection helper
import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(uri?: string): Promise<void> {
  if (isConnected) {
    console.log("Already connected to MongoDB");
    return;
  }

  const mongoUri = uri || process.env.MONGODB_URI || "mongodb://localhost:27017/wasteer";

  try {
    await mongoose.connect(mongoUri);
    isConnected = true;
    console.log(`✓ Connected to MongoDB: ${mongoUri}`);
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log("✓ Disconnected from MongoDB");
  } catch (error) {
    console.error("Failed to disconnect from MongoDB:", error);
    throw error;
  }
}

export function getConnectionStatus(): boolean {
  return isConnected;
}

