import mongoose, { Document, Schema } from "mongoose";

/** Category filter pills on Home 1 (Ayurveda, Panchakarma, …) */
export interface IHome1Category extends Document {
  name: string;
  slug: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const home1CategorySchema = new Schema<IHome1Category>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Home1Category = mongoose.model<IHome1Category>("Home1Category", home1CategorySchema);
