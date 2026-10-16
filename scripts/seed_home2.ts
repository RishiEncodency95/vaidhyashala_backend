import mongoose from "mongoose";
import { connectDB } from "../src/config/db";
import { seedHome2 } from "../src/modules/home2/home2.service";

/**
 * Loads the website's Home 2 ("/home") content into MongoDB.
 *   npm run seed:home2            → creates it only if missing (admin edits are kept)
 *   npm run seed:home2 -- --reset → restores the website content
 */
async function seed() {
  const reset = process.argv.includes("--reset");
  try {
    await connectDB();
    console.log(`Home 2 seed${reset ? " (reset)" : ""}:`, await seedHome2({ reset }));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Home 2 seed error:", err);
    process.exit(1);
  }
}

seed();
