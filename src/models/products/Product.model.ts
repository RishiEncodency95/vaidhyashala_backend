import mongoose, { Document, Schema, Types } from "mongoose";

/** A catalogue product: card on the Products page plus the "View Details" modal */
export interface IProduct extends Document {
  title: string;
  slug: string;
  category: Types.ObjectId;
  /** Card text under the title */
  shortDescription: string;
  /** Modal text */
  description: string;
  productType: string;
  packOptions: string;
  availability: string;
  /** Selling price in rupees (0 = not for sale online, "price on request") */
  price: number;
  /** Original price (MRP) in rupees; shown struck through when higher than price */
  mrp: number;
  productInfo: string;
  directions: string;
  /** Lines of the info callout in the modal, one per line */
  usageNotes: string;
  image: string;
  imageAlt: string;
  galleryImage1: string;
  galleryImage2: string;
  galleryImage3: string;
  /** Product video: an uploaded file (mp4/webm) or a YouTube link. Shown after the pictures. */
  video: string;
  /** Usage guide 3 steps */
  howToStep1: string;
  howToStep2: string;
  howToStep3: string;
  /** Key ingredients: one per line, e.g. "Amla (Emblica officinalis)" */
  keyIngredients: string;
  /** Precautions: one per line */
  precautions: string;
  /** Product specifications */
  netQuantity: string;
  formulationType: string;
  manufacturer: string;
  shelfLife: string;
  batchExpiry: string;
  countryOfOrigin: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const str = { type: String, trim: true, default: "" };

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    category: { type: Schema.Types.ObjectId, ref: "ProductCategory", required: true, index: true },
    shortDescription: str,
    description: str,
    productType: str,
    packOptions: str,
    availability: str,
    price: { type: Number, default: 0, min: 0 },
    mrp: { type: Number, default: 0, min: 0 },
    productInfo: str,
    directions: str,
    usageNotes: str,
    image: str,
    imageAlt: str,
    galleryImage1: str,
    galleryImage2: str,
    galleryImage3: str,
    video: str,
    howToStep1: str,
    howToStep2: str,
    howToStep3: str,
    keyIngredients: str,
    precautions: str,
    netQuantity: str,
    formulationType: str,
    manufacturer: str,
    shelfLife: str,
    batchExpiry: str,
    countryOfOrigin: { type: String, trim: true, default: "India" },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>("Product", productSchema);
