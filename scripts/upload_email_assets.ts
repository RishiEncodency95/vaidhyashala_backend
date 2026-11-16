import fs from "fs";
import path from "path";
import cloudinary, { isCloudinaryConfigured } from "../src/config/cloudinary";

// Uploads the email images (assets/email/candidate, assets/email/hr) to Cloudinary and writes
// assets/email/hosted.json. The emails then link to these URLs instead of attaching every
// image, so they are small and open fast. Run again whenever an image there changes:
//   npm run upload:email-assets
const DIR = path.resolve(__dirname, "../assets/email");
const FOLDER = "vedhshala/email";

const listImages = (dir: string, base = ""): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) return listImages(path.join(dir, e.name), rel);
    return /\.(png|jpe?g)$/i.test(e.name) ? [rel] : [];
  });

async function run() {
  if (!isCloudinaryConfigured()) {
    console.error("❌ CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are missing in backend/.env");
    process.exit(1);
  }

  const files = listImages(DIR);
  const hosted: Record<string, string> = {};
  console.log(`Uploading ${files.length} images to ${FOLDER}...`);

  // A few at a time, to stay well inside Cloudinary's rate limits
  for (let i = 0; i < files.length; i += 8) {
    await Promise.all(
      files.slice(i, i + 8).map(async (file) => {
        const result = await cloudinary.uploader.upload(path.join(DIR, file), {
          folder: FOLDER,
          public_id: file.replace(/\.[^.]+$/, ""),
          resource_type: "image",
          overwrite: true,
          invalidate: true,
        });
        hosted[file] = result.secure_url;
      })
    );
    process.stdout.write(`  ${Math.min(i + 8, files.length)}/${files.length}\r`);
  }

  const sorted = Object.fromEntries(Object.entries(hosted).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  fs.writeFileSync(path.join(DIR, "hosted.json"), JSON.stringify(sorted, null, 2) + "\n");
  console.log(`\n✅ Uploaded ${files.length} images. URLs saved to assets/email/hosted.json`);
}

run().catch((err) => {
  console.error("❌ Upload failed:", err?.message || err);
  process.exit(1);
});
