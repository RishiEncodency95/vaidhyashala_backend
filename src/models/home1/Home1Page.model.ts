import mongoose, { Document, Schema } from "mongoose";
import { publishSchema, seoSchema } from "../shared/pageMeta.schema";

/**
 * Home 1 page (website "/" — Health Journal): one document holding every section's
 * content and the page SEO. Articles and categories live in their own collections.
 */
export interface IHome1Page extends Document {
  key: string;
  sections: {
    hero: Record<string, any>;
    searchFilter: Record<string, any>;
    featured: Record<string, any>;
    articlesSection: Record<string, any>;
    cta: Record<string, any>;
  };
  seo: Record<string, any>;
  publish: Record<string, any>;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sectionsSchema = new Schema(
  {
    hero: {
      isActive: { type: Boolean, default: true },
      breadcrumbHomeLabel: { type: String, trim: true, default: "" },
      breadcrumbHomeHref: { type: String, trim: true, default: "" },
      breadcrumbCurrentLabel: { type: String, trim: true, default: "" },
      titleLine1: { type: String, trim: true, default: "" },
      titleLine2: { type: String, trim: true, default: "" },
      titleAccent: { type: String, trim: true, default: "" },
      subtitle: { type: String, trim: true, default: "" },
      backgroundImage: { type: String, trim: true, default: "" },
      backgroundImageAlt: { type: String, trim: true, default: "" },
    },
    searchFilter: {
      isActive: { type: Boolean, default: true },
      searchPlaceholder: { type: String, trim: true, default: "" },
      allCategoryLabel: { type: String, trim: true, default: "" },
      noResultsMessage: { type: String, trim: true, default: "" },
    },
    featured: {
      isActive: { type: Boolean, default: true },
      eyebrow: { type: String, trim: true, default: "" },
      buttonLabel: { type: String, trim: true, default: "" },
      decorativeImage: { type: String, trim: true, default: "" },
      decorativeImageAlt: { type: String, trim: true, default: "" },
    },
    articlesSection: {
      isActive: { type: Boolean, default: true },
      eyebrow: { type: String, trim: true, default: "" },
      heading: { type: String, trim: true, default: "" },
      notice: { type: String, trim: true, default: "" },
      readMoreLabel: { type: String, trim: true, default: "" },
      loadMoreLabel: { type: String, trim: true, default: "" },
      initialCount: { type: Number, default: 6, min: 1 },
      loadMoreStep: { type: Number, default: 3, min: 1 },
    },
    cta: {
      isActive: { type: Boolean, default: true },
      heading: { type: String, trim: true, default: "" },
      subtitle: { type: String, trim: true, default: "" },
      buttonLabel: { type: String, trim: true, default: "" },
      buttonLink: { type: String, trim: true, default: "" },
      backgroundImage: { type: String, trim: true, default: "" },
      backgroundImageAlt: { type: String, trim: true, default: "" },
    },
  },
  { _id: false }
);

const home1PageSchema = new Schema<IHome1Page>(
  {
    key: { type: String, required: true, unique: true, default: "home1" },
    sections: { type: sectionsSchema, default: () => ({}) },
    seo: { type: seoSchema, default: () => ({}) },
    publish: { type: publishSchema, default: () => ({}) },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Home1Page = mongoose.model<IHome1Page>("Home1Page", home1PageSchema);
