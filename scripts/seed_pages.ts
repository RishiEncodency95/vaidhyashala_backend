import mongoose from "mongoose";
import { connectDB } from "../src/config/db";
import { seedPages } from "../src/modules/pageContent/pageContent.service";

/**
 * Loads the website content of the Pages & CMS pages (About Us, About Story, …).
 *   npm run seed:pages                        → creates missing pages only (admin edits are kept)
 *   npm run seed:pages -- --page=about-us     → one page
 *   npm run seed:pages -- --reset             → restores the website content
 */
async function seed() {
  const reset = process.argv.includes("--reset");
  const key = process.argv.find((a) => a.startsWith("--page="))?.slice("--page=".length);
  try {
    await connectDB();
    console.log(`Pages seed${reset ? " (reset)" : ""}:`, await seedPages({ key, reset }));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Pages seed error:", err);
    process.exit(1);
  }
}

seed();
