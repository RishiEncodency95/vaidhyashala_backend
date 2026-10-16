import { Home2Page } from "../../models/home2/Home2Page.model";
import { AppointmentRequest, AppointmentStatus } from "../../models/home2/AppointmentRequest.model";
import { ApiError } from "../../utils/ApiError";
import { HOME2_PAGE_KEY, HOME2_SECTION_KEYS, Home2SectionKey, defaultHome2Sections, defaultHome2Seo } from "./home2.defaults";

// ─── Page (sections + SEO + publish) ─────────────────────────────────────────

const getOrCreatePage = async () => {
  const existing = await Home2Page.findOne({ key: HOME2_PAGE_KEY });
  if (existing) return existing;
  return Home2Page.create({ key: HOME2_PAGE_KEY, sections: defaultHome2Sections, seo: defaultHome2Seo });
};

export const getPage = async () => (await getOrCreatePage()).toObject();

const setFields = async (prefix: string, data: Record<string, unknown>, updatedBy?: string) => {
  await getOrCreatePage();
  const $set: Record<string, unknown> = { updatedBy };
  for (const [field, value] of Object.entries(data)) $set[`${prefix}.${field}`] = value;
  const page = await Home2Page.findOneAndUpdate({ key: HOME2_PAGE_KEY }, { $set }, { new: true, runValidators: true });
  return page!.toObject();
};

export const updateSection = async (section: Home2SectionKey, data: Record<string, unknown>, updatedBy?: string) =>
  (await setFields(`sections.${section}`, data, updatedBy)).sections[section];

export const updateSeo = async (data: Record<string, unknown>, updatedBy?: string) =>
  (await setFields("seo", data, updatedBy)).seo;

export const updatePublish = async (data: Record<string, unknown>, updatedBy?: string) =>
  (await setFields("publish", data, updatedBy)).publish;

/** The website's own content, for "Sync / Reset Website Data" (nothing is saved) */
export const getDefaults = () => ({ sections: defaultHome2Sections, seo: defaultHome2Seo });

/** Everything the website needs for /home in one request. Hidden sections come back as null. */
export const getPublicHome2 = async () => {
  const page = await getPage();
  const sections = page.sections as Record<string, Record<string, unknown>>;
  const result: Record<string, unknown> = { seo: page.seo, updatedAt: page.updatedAt };
  for (const key of HOME2_SECTION_KEYS) {
    result[key] = sections[key]?.isActive === false ? null : sections[key];
  }
  return result;
};

// ─── Appointment requests ────────────────────────────────────────────────────

export interface AppointmentInput {
  service: string;
  preferredDate: string;
  consultationType: "clinic" | "online";
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
}

export const createAppointment = async (input: AppointmentInput, ip?: string) => {
  const page = await getPage();
  const appointment = page.sections.appointment ?? {};
  if (appointment.isActive === false) throw ApiError.badRequest("Appointment requests are closed right now.");

  // Only services offered in the form are accepted
  const services = (appointment.items ?? []) as Array<{ label: string; value: string }>;
  const service = services.find((s) => s.value === input.service.toLowerCase());
  if (!service) throw ApiError.badRequest("Please choose one of the listed services.");

  const doc = await AppointmentRequest.create({
    ...input,
    source: "home2",
    service: service.value,
    serviceLabel: service.label,
    preferredDate: new Date(`${input.preferredDate}T00:00:00`),
    ip,
  });
  return {
    _id: doc._id,
    status: doc.status,
    message: appointment.successMessage || "Your appointment request has been received.",
  };
};

export const listAppointments = async (query: { status?: string; source?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = {};
  if (query.source === "home2" || query.source === "panchakarma") filter.source = query.source;
  if (query.status && ["new", "contacted", "confirmed", "cancelled"].includes(query.status)) filter.status = query.status;
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const [items, total, counts] = await Promise.all([
    AppointmentRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("-ip").lean(),
    AppointmentRequest.countDocuments(filter),
    AppointmentRequest.aggregate<{ _id: AppointmentStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])),
  };
};

export const updateAppointment = async (id: string, data: { status?: AppointmentStatus; adminNote?: string }) => {
  const doc = await AppointmentRequest.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
    .select("-ip")
    .lean();
  if (!doc) throw ApiError.notFound("Appointment request not found.");
  return doc;
};

export const deleteAppointment = async (id: string) => {
  const doc = await AppointmentRequest.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound("Appointment request not found.");
  return { deleted: true };
};

// ─── Seed ────────────────────────────────────────────────────────────────────

/** Loads the website content. Without `reset` an existing page is kept as it is. */
export const seedHome2 = async ({ reset = false } = {}) => {
  if (reset) await Home2Page.deleteMany({ key: HOME2_PAGE_KEY });
  if (await Home2Page.exists({ key: HOME2_PAGE_KEY })) return { page: "kept" };
  await Home2Page.create({ key: HOME2_PAGE_KEY, sections: defaultHome2Sections, seo: defaultHome2Seo });
  return { page: "created" };
};
