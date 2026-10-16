import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Article cards on Home 1. The one with isFeatured = true fills the Featured Article
 * section; the rest fill the article grid.
 */
export interface IHome1Article extends Document {
  title: string;
  slug: string;
  excerpt: string;
  category: Types.ObjectId;
  image: string;
  imageAlt: string;
  link: string;
  isFeatured: boolean;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const home1ArticleSchema = new Schema<IHome1Article>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    excerpt: { type: String, trim: true, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "Home1Category", required: true, index: true },
    image: { type: String, trim: true, default: "" },
    imageAlt: { type: String, trim: true, default: "" },
    // Where "Read Article" goes; empty = the website builds it from the slug
    link: { type: String, trim: true, default: "" },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

home1ArticleSchema.index({ title: "text", excerpt: "text" });

export const Home1Article = mongoose.model<IHome1Article>("Home1Article", home1ArticleSchema);
