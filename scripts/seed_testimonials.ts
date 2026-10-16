import mongoose from "mongoose";
import { connectDB } from "../src/config/db";
import { seedTestimonials } from "../src/modules/testimonials/testimonials.service";

/**
 * Loads the website's testimonial cards into MongoDB.
 *   npm run seed:testimonials            → adds missing ones (admin edits are kept)
 *   npm run seed:testimonials -- --reset → restores the website cards (published patient feedback is kept)
 * The page texts are seeded with `npm run seed:pages -- --page=testimonials`.
 */
async function seed() {
  const reset = process.argv.includes("--reset");
  try {
    await connectDB();
    console.log(`Testimonials seed${reset ? " (reset)" : ""}:`, await seedTestimonials({ reset }));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Testimonials seed error:", err);
    process.exit(1);
  }
}

seed();
