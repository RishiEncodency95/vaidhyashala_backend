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
  productInfo: string;
  directions: string;
  /** Lines of the info callout in the modal, one per line */
  usageNotes: string;
  image: string;
  imageAlt: string;
  galleryImage1: string;
  galleryImage2: string;
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
    productInfo: str,
    directions: str,
    usageNotes: str,
    image: str,
    imageAlt: str,
    galleryImage1: str,
    galleryImage2: str,
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Product = mongoose.model<IProduct>("Product", productSchema);
