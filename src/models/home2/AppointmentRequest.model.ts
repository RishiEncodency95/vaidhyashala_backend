import mongoose, { Document, Schema } from "mongoose";

/** Appointment / consultation requests: Home 2 "Plan your first visit", the "Plan your consultation" popup and the Panchakarma "Request a Consultation" form */
export type AppointmentStatus = "new" | "contacted" | "confirmed" | "cancelled";

export type AppointmentSource = "home2" | "panchakarma" | "consultation";

export interface IAppointmentRequest extends Document {
  source: AppointmentSource;
  service: string;
  serviceLabel: string;
  preferredDate?: Date;
  preferredTime?: string;
  consent?: boolean;
  consultationType?: "clinic" | "online";
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
  status: AppointmentStatus;
  adminNote?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentRequestSchema = new Schema<IAppointmentRequest>(
  {
    source: { type: String, enum: ["home2", "panchakarma", "consultation"], default: "home2", index: true },
    service: { type: String, trim: true, default: "" },
    serviceLabel: { type: String, trim: true, default: "" },
    preferredDate: { type: Date },
    preferredTime: { type: String, trim: true, default: "" },
    consent: { type: Boolean, default: false },
    consultationType: { type: String, enum: ["clinic", "online"] },
    name: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    message: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["new", "contacted", "confirmed", "cancelled"], default: "new", index: true },
    adminNote: { type: String, trim: true, default: "" },
    ip: { type: String, trim: true },
  },
  { timestamps: true }
);

appointmentRequestSchema.index({ createdAt: -1 });

export const AppointmentRequest = mongoose.model<IAppointmentRequest>("AppointmentRequest", appointmentRequestSchema);
