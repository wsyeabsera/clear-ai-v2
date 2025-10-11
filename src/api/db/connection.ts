// MongoDB connection helper
import mongoose from "mongoose";

export async function connectDB(uri?: string): Promise<void> {
  // Check actual Mongoose connection state
  if (mongoose.connection.readyState === 1) {
    console.log("Already connected to MongoDB");
    return;
  }
  
  // If there's a connection but to different URI, disconnect first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  const mongoUri = uri || process.env.MONGODB_URI || "mongodb://localhost:27017/wasteer";

  try {
    await mongoose.connect(mongoUri);
    console.log(`✓ Connected to MongoDB: ${mongoUri}`);
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return; // Already disconnected
  }

  try {
    await mongoose.disconnect();
    console.log("✓ Disconnected from MongoDB");
  } catch (error) {
    console.error("Failed to disconnect from MongoDB:", error);
    throw error;
  }
}

export function getConnectionStatus(): boolean {
  return mongoose.connection.readyState === 1;
}

