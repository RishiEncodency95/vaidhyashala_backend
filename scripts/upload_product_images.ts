import fs from "fs";
import path from "path";
import cloudinary, { isCloudinaryConfigured } from "../src/config/cloudinary";
import { connectDB, disconnectDB } from "../src/config/db";
import { env } from "../src/config/env";
import { Product } from "../src/models/products/Product.model";
import { CmsPageContent } from "../src/models/CmsPageContent.model";
import { WEBSITE_IMAGE_DIR } from "../src/modules/products/productImages";

// Uploads the Products page pictures (assets/products: 12 product cards + hero, guidance and
// points images) to Cloudinary and writes assets/products/hosted.json, so the default catalogue
// and page texts use the Cloudinary copies. Products and page texts already in the database that
// still point at the website's own copy are switched to the Cloudinary URL.
// Run again whenever a picture in assets/products changes:
//   npm run upload:product-images
const DIR = path.resolve(__dirname, "../assets/products");
const FOLDER = "vedhshala/products";
const PRODUCT_IMAGE_FIELDS = ["image", "galleryImage1", "galleryImage2"] as const;

/** Every string in a page's content equal to a website copy, replaced by its Cloudinary URL */
const replaceIn = (value: unknown, byPath: Map<string, string>): { value: unknown; changed: number } => {
  if (typeof value === "string") {
    const url = byPath.get(value) ?? byPath.get(`/${value}`);
    return url ? { value: url, changed: 1 } : { value, changed: 0 };
  }
  if (Array.isArray(value)) {
    let changed = 0;
    const next = value.map((v) => {
      const r = replaceIn(v, byPath);
      changed += r.changed;
      return r.value;
    });
    return { value: next, changed };
  }
  if (value && typeof value === "object") {
    let changed = 0;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = replaceIn(v, byPath);
      changed += r.changed;
      next[k] = r.value;
    }
    return { value: next, changed };
  }
  return { value, changed: 0 };
};

async function run() {
  if (!isCloudinaryConfigured()) {
    console.error("❌ CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are missing in backend/.env");
    process.exit(1);
  }

  // 1. Upload
  const files = fs.readdirSync(DIR).filter((f) => /\.(webp|png|jpe?g)$/i.test(f));
  const hosted: Record<string, string> = {};
  console.log(`Uploading ${files.length} images to ${FOLDER}...`);
  for (let i = 0; i < files.length; i += 5) {
    await Promise.all(
      files.slice(i, i + 5).map(async (file) => {
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
  }
  const sorted = Object.fromEntries(Object.entries(hosted).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  fs.writeFileSync(path.join(DIR, "hosted.json"), JSON.stringify(sorted, null, 2) + "\n");
  console.log(`✅ Uploaded ${files.length} images. URLs saved to assets/products/hosted.json`);

  // 2. Database: products and the Products page texts that still use the website's copies
  const byPath = new Map(Object.entries(hosted).map(([file, url]) => [`${WEBSITE_IMAGE_DIR}/${file}`, url]));
  await connectDB();
  let productFields = 0;
  for (const [websitePath, url] of byPath) {
    for (const field of PRODUCT_IMAGE_FIELDS) {
      const res = await Product.updateMany({ [field]: websitePath }, { $set: { [field]: url } });
      productFields += res.modifiedCount;
    }
  }
  console.log(`✅ Products: ${productFields} image link(s) switched to Cloudinary`);

  const page = await CmsPageContent.findOne({ key: "products" });
  if (page) {
    const sections = replaceIn(page.sections, byPath);
    const seo = replaceIn(page.seo?.toObject ? page.seo.toObject() : page.seo, byPath);
    if (sections.changed || seo.changed) {
      page.sections = sections.value as typeof page.sections;
      page.seo = seo.value as typeof page.seo;
      page.markModified("sections");
      page.markModified("seo");
      await page.save();
    }
    console.log(`✅ Products page texts: ${sections.changed + seo.changed} image link(s) switched to Cloudinary`);
  } else {
    console.log("ℹ️  Products page texts are not in the database yet (the defaults already use Cloudinary)");
  }
  await disconnectDB();

  // 3. Ask the website to drop its cached pages
  const base = env.FRONTEND_URL?.replace(/\/+$/, "");
  if (base && env.REVALIDATE_SECRET) {
    await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": env.REVALIDATE_SECRET },
      signal: AbortSignal.timeout(5000),
    }).catch(() => console.warn("⚠️  Could not reach the website to refresh its cache; it will update on its own"));
  }
}

run().catch((err) => {
  console.error("❌ Failed:", err?.message || err);
  process.exit(1);
});
