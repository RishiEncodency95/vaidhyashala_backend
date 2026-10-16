import mongoose, { Document, Schema, Types } from "mongoose";

/** "Share your experience" form on the Patient Testimonials page */
export type PatientFeedbackStatus = "new" | "reviewed" | "published" | "archived";

export interface IPatientFeedback extends Document {
  fullName: string;
  /** Private: never shown on the website */
  mobile?: string;
  email?: string;
  service: string;
  serviceLabel: string;
  experience?: string;
  feedback: string;
  mediaUrl?: string;
  /** "I consent to publication of my feedback and display name" */
  consentToPublish: boolean;
  status: PatientFeedbackStatus;
  adminNote?: string;
  testimonial?: Types.ObjectId;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const patientFeedbackSchema = new Schema<IPatientFeedback>(
  {
    fullName: { type: String, required: true, trim: true },
    mobile: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    service: { type: String, required: true, trim: true },
    serviceLabel: { type: String, trim: true, default: "" },
    experience: { type: String, trim: true, default: "" },
    feedback: { type: String, required: true, trim: true },
    mediaUrl: { type: String, trim: true, default: "" },
    consentToPublish: { type: Boolean, default: false },
    status: { type: String, enum: ["new", "reviewed", "published", "archived"], default: "new", index: true },
    adminNote: { type: String, trim: true, default: "" },
    testimonial: { type: Schema.Types.ObjectId, ref: "Testimonial" },
    ip: { type: String, trim: true },
  },
  { timestamps: true }
);

patientFeedbackSchema.index({ createdAt: -1 });

export const PatientFeedback = mongoose.model<IPatientFeedback>("PatientFeedback", patientFeedbackSchema);
