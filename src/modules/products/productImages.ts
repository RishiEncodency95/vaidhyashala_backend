import fs from "fs";
import path from "path";

/**
 * Products page pictures (12 product cards + hero, guidance and points images).
 * The originals are in assets/products; `npm run upload:product-images` puts them on Cloudinary
 * and writes assets/products/hosted.json. Until then the website's own copies are used.
 */

/** Where the website (frontend /public) keeps its own copies */
export const WEBSITE_IMAGE_DIR = "/product/vaidhyashala_product_page_images";

const HOSTED_FILES = [
  path.resolve(process.cwd(), "assets/products/hosted.json"),
  path.resolve(__dirname, "../../../assets/products/hosted.json"), // src/modules/products
  path.resolve(__dirname, "../../../../assets/products/hosted.json"), // dist/src/modules/products
];

let hostedCache: Record<string, string> | undefined;
const hostedUrls = (): Record<string, string> => {
  if (hostedCache === undefined) {
    try {
      const file = HOSTED_FILES.find((f) => fs.existsSync(f));
      hostedCache = file ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    } catch {
      hostedCache = {};
    }
  }
  return hostedCache!;
};

/** Cloudinary URL of a Products page picture, e.g. "01_ayurvedic_tablets.webp" (website path until uploaded) */
export const productPageImage = (file: string): string => hostedUrls()[file] ?? `${WEBSITE_IMAGE_DIR}/${file}`;
