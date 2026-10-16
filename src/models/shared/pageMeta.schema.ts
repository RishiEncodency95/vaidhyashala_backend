import { Schema } from "mongoose";

/* SEO and Publish settings shared by the CMS-managed pages (Home 1, Home 2) */

export const seoSchema = new Schema(
  {
    metaTitle: { type: String, trim: true, default: "" },
    metaDescription: { type: String, trim: true, default: "" },
    metaKeywords: { type: String, trim: true, default: "" },
    canonicalUrl: { type: String, trim: true, default: "" },
    ogTitle: { type: String, trim: true, default: "" },
    ogDescription: { type: String, trim: true, default: "" },
    ogImage: { type: String, trim: true, default: "" },
    robotsIndex: { type: Boolean, default: true },
    robotsFollow: { type: Boolean, default: true },
    schemaMarkup: { type: String, default: "" },
    canonicalTag: { type: String, trim: true, default: "" },
    openGraphTags: { type: String, default: "" },
    h1Tag: { type: String, trim: true, default: "" },
    breadcrumbName: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

// Publish box + Page Settings in the Pages & CMS editor
export const publishSchema = new Schema(
  {
    status: { type: String, enum: ["Published", "Draft"], default: "Published" },
    visibility: { type: String, enum: ["Public", "Private"], default: "Public" },
    publishedAt: { type: Date, default: () => new Date() },
    author: { type: String, trim: true, default: "" },
    showInNavigation: { type: Boolean, default: true },
    menuOrder: { type: Number, default: 1 },
  },
  { _id: false }
);
