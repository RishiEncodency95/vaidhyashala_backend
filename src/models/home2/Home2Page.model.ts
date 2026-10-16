import mongoose, { Document, Schema } from "mongoose";
import { publishSchema, seoSchema } from "../shared/pageMeta.schema";

/**
 * Home 2 page (website "/home"): one document with every section's content, including the
 * repeatable lists (highlights, care cards, approach steps, concerns, services, FAQs),
 * plus the page SEO and Publish settings. List order = array order.
 */
export interface IHome2Page extends Document {
  key: string;
  sections: Record<string, Record<string, any>>;
  seo: Record<string, any>;
  publish: Record<string, any>;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const str = { type: String, trim: true, default: "" };
const active = { type: Boolean, default: true };
const list = (fields: Record<string, unknown>) => ({
  type: [new Schema(fields, { _id: false })],
  default: [],
});

const sectionsSchema = new Schema(
  {
    hero: {
      isActive: active,
      eyebrow: str,
      titleLine1: str,
      titleLine2: str,
      titleHighlight: str,
      subtitle: str,
      primaryButtonLabel: str,
      primaryButtonLink: str,
      secondaryButtonLabel: str,
      secondaryButtonLink: str,
      image: str,
      imageAlt: str,
    },
    highlights: {
      isActive: active,
      items: list({ label: str }),
    },
    carePillars: {
      isActive: active,
      eyebrow: str,
      heading: str,
      description: str,
      linkLabel: str,
      items: list({ number: str, title: str, description: str, image: str, imageAlt: str, link: str }),
    },
    approach: {
      isActive: active,
      eyebrow: str,
      headingLine1: str,
      headingHighlight: str,
      description: str,
      image: str,
      imageAlt: str,
      items: list({ number: str, title: str, description: str }),
    },
    concerns: {
      isActive: active,
      eyebrow: str,
      heading: str,
      description: str,
      image: str,
      imageAlt: str,
      items: list({ label: str, iconImage: str, link: str }),
    },
    products: {
      isActive: active,
      eyebrow: str,
      headingLine1: str,
      headingLine2: str,
      description: str,
      buttonLabel: str,
      buttonLink: str,
      image: str,
      imageAlt: str,
    },
    appointment: {
      isActive: active,
      eyebrow: str,
      heading: str,
      description: str,
      serviceLabel: str,
      servicePlaceholder: str,
      dateLabel: str,
      typeLabel: str,
      clinicLabel: str,
      onlineLabel: str,
      buttonLabel: str,
      successMessage: str,
      // Options of the "Service" dropdown
      items: list({ label: str, value: str }),
    },
    faq: {
      isActive: active,
      eyebrow: str,
      heading: str,
      description: str,
      items: list({ question: str, answer: str }),
    },
    cta: {
      isActive: active,
      heading: str,
      subtitle: str,
      buttonLabel: str,
      buttonLink: str,
      backgroundImage: str,
      backgroundImageAlt: str,
    },
  },
  { _id: false }
);

const home2PageSchema = new Schema<IHome2Page>(
  {
    key: { type: String, required: true, unique: true, default: "home2" },
    sections: { type: sectionsSchema, default: () => ({}) },
    seo: { type: seoSchema, default: () => ({}) },
    publish: { type: publishSchema, default: () => ({}) },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Home2Page = mongoose.model<IHome2Page>("Home2Page", home2PageSchema);
