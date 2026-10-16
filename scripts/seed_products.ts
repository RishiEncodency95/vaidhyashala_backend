import mongoose from "mongoose";
import { connectDB } from "../src/config/db";
import { seedProducts } from "../src/modules/products/products.service";

/**
 * Loads the website's product catalogue (categories + products) into MongoDB.
 *   npm run seed:products            → adds what is missing (admin edits are kept)
 *   npm run seed:products -- --reset → restores the website catalogue
 * The Products page texts are seeded with `npm run seed:pages -- --page=products`.
 */
async function seed() {
  const reset = process.argv.includes("--reset");
  try {
    await connectDB();
    console.log(`Products seed${reset ? " (reset)" : ""}:`, await seedProducts({ reset }));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Products seed error:", err);
    process.exit(1);
  }
}

seed();
