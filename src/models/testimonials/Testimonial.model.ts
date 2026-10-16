import mongoose, { Document, Schema, Types } from "mongoose";

/** A patient testimonial card on the Patient Testimonials page */
export interface ITestimonial extends Document {
  name: string;
  /** Value of a category in the page's filter list (e.g. "Consultation") */
  category: string;
  quote: string;
  photo: string;
  /** Shows the "Sample" badge: illustrative, not a real patient */
  isSample: boolean;
  /** The one testimonial shown in the large featured card */
  isFeatured: boolean;
  isActive: boolean;
  order: number;
  /** The patient feedback it was published from, if any */
  feedback?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    quote: { type: String, required: true, trim: true },
    photo: { type: String, trim: true, default: "" },
    isSample: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
    feedback: { type: Schema.Types.ObjectId, ref: "PatientFeedback" },
  },
  { timestamps: true }
);

export const Testimonial = mongoose.model<ITestimonial>("Testimonial", testimonialSchema);
