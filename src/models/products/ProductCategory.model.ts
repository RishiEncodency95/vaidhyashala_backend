import mongoose, { Document, Schema } from "mongoose";

/** Filter pills on the Products page (Ayurvedic Preparations, Therapy Oils, …) */
export interface IProductCategory extends Document {
  name: string;
  slug: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productCategorySchema = new Schema<IProductCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ProductCategory = mongoose.model<IProductCategory>("ProductCategory", productCategorySchema);
