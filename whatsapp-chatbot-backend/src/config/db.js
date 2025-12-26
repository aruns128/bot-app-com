
import mongoose from "mongoose";

export async function connectDB() {
  if (process.env.USE_MOCK === "true") {
    console.log("ℹ️ Mock mode: MongoDB skipped");
    return;
  }
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not defined");
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");
}
