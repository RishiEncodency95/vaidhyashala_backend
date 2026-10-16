import mongoose, { Document, Schema, Types } from "mongoose";

/** "Enquire about a product" form and the product modal's "Enquire About This Product" */
export type ProductEnquiryStatus = "new" | "contacted" | "closed";

export interface IProductEnquiry extends Document {
  source: "page-form" | "product-modal";
  name: string;
  mobile: string;
  email?: string;
  productName: string;
  product?: Types.ObjectId;
  enquiryType?: string;
  message?: string;
  status: ProductEnquiryStatus;
  adminNote?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productEnquirySchema = new Schema<IProductEnquiry>(
  {
    source: { type: String, enum: ["page-form", "product-modal"], default: "page-form", index: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    productName: { type: String, required: true, trim: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    enquiryType: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["new", "contacted", "closed"], default: "new", index: true },
    adminNote: { type: String, trim: true, default: "" },
    ip: { type: String, trim: true },
  },
  { timestamps: true }
);

productEnquirySchema.index({ createdAt: -1 });

export const ProductEnquiry = mongoose.model<IProductEnquiry>("ProductEnquiry", productEnquirySchema);
