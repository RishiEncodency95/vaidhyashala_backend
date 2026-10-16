import mongoose from "mongoose";
import { connectDB } from "../src/config/db";
import { seedHome1 } from "../src/modules/home1/home1.service";

/**
 * Loads the website's Home 1 (Health Journal) content into MongoDB.
 *   npm run seed:home1            → fills only what is missing (admin edits are kept)
 *   npm run seed:home1 -- --reset → wipes Home 1 and restores the website content
 */
async function seed() {
  const reset = process.argv.includes("--reset");
  try {
    await connectDB();
    const summary = await seedHome1({ reset });
    console.log(`Home 1 seed${reset ? " (reset)" : ""}:`, summary);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Home 1 seed error:", err);
    process.exit(1);
  }
}

seed();
