import mongoose, { Document, Schema } from "mongoose";
import { publishSchema, seoSchema } from "./shared/pageMeta.schema";

/**
 * Content of a website page managed from Pages & CMS (About Us, About Story, …): one
 * document per page. `sections` is validated against the page's definition in
 * modules/pageContent/pages before it is saved.
 */
export interface ICmsPageContent extends Document {
  key: string;
  sections: Record<string, Record<string, any>>;
  seo: Record<string, any>;
  publish: Record<string, any>;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cmsPageContentSchema = new Schema<ICmsPageContent>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    sections: { type: Schema.Types.Mixed, default: {} },
    seo: { type: seoSchema, default: () => ({}) },
    publish: { type: publishSchema, default: () => ({}) },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true, minimize: false }
);

export const CmsPageContent = mongoose.model<ICmsPageContent>("CmsPageContent", cmsPageContentSchema);
