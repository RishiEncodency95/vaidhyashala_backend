import { Types } from "mongoose";
import { Testimonial } from "../../models/testimonials/Testimonial.model";
import { PatientFeedback, PatientFeedbackStatus } from "../../models/testimonials/PatientFeedback.model";
import { ApiError } from "../../utils/ApiError";
import { getPage } from "../pageContent/pageContent.service";
import { TestimonialInput } from "./testimonials.schema";
import { defaultTestimonials } from "./testimonials.defaults";

type Option = { label: string; value: string };

/** Filter categories and form options come from the Patient Testimonials page texts */
const pageOptions = async () => {
  const page = await getPage("testimonials");
  const sections = page.sections as Record<string, { items?: Option[]; experienceOptions?: string; isActive?: boolean; successMessage?: string }>;
  return {
    categories: sections.categoryFilter?.items ?? [],
    services: sections.feedbackForm?.items ?? [],
    experiences: (sections.feedbackForm?.experienceOptions ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    formActive: sections.feedbackForm?.isActive !== false,
    successMessage: sections.feedbackForm?.successMessage,
  };
};

const assertCategory = async (category: string) => {
  const { categories } = await pageOptions();
  if (!categories.some((c) => c.value === category)) {
    throw ApiError.badRequest(
      `"${category}" is not one of the page's categories (${categories.map((c) => c.value).join(", ")}).`
    );
  }
};

/** Only one testimonial can be featured */
const clearOtherFeatured = (keepId: Types.ObjectId | string) =>
  Testimonial.updateMany({ _id: { $ne: keepId }, isFeatured: true }, { $set: { isFeatured: false } });

// ─── Testimonials ────────────────────────────────────────────────────────────

export interface ListTestimonialsQuery {
  category?: string;
  status?: "active" | "inactive";
  page?: number;
  limit?: number;
}

export const listTestimonials = async (query: ListTestimonialsQuery, publicView = false) => {
  const filter: Record<string, unknown> = {};
  if (publicView || query.status === "active") filter.isActive = true;
  else if (query.status === "inactive") filter.isActive = false;
  if (query.category && query.category.toLowerCase() !== "all") filter.category = query.category;

  const limit = Math.min(Math.max(Number(query.limit) || 0, 0), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const total = await Testimonial.countDocuments(filter);
  let cursor = Testimonial.find(filter).sort({ order: 1, createdAt: -1 });
  if (limit > 0) cursor = cursor.skip((page - 1) * limit).limit(limit);
  return { items: await cursor.lean(), total, page, limit, totalPages: limit > 0 ? Math.ceil(total / limit) : 1 };
};

export const getFeaturedTestimonial = async () =>
  (await Testimonial.findOne({ isFeatured: true, isActive: true }).lean()) ??
  (await Testimonial.findOne({ isActive: true }).sort({ order: 1 }).lean());

export const createTestimonial = async (input: TestimonialInput) => {
  await assertCategory(input.category);
  const order = input.order ?? (await Testimonial.countDocuments()) + 1;
  const doc = await Testimonial.create({ ...input, order });
  if (doc.isFeatured) await clearOtherFeatured(doc._id);
  return doc.toObject();
};

export const updateTestimonial = async (id: string, input: Partial<TestimonialInput>) => {
  const doc = await Testimonial.findById(id);
  if (!doc) throw ApiError.notFound("Testimonial not found.");
  if (input.category && input.category !== doc.category) await assertCategory(input.category);
  Object.assign(doc, input);
  await doc.save();
  if (doc.isFeatured) await clearOtherFeatured(doc._id);
  return doc.toObject();
};

export const deleteTestimonial = async (id: string) => {
  const doc = await Testimonial.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound("Testimonial not found.");
  if (doc.feedback) await PatientFeedback.updateOne({ _id: doc.feedback }, { $set: { status: "reviewed" }, $unset: { testimonial: 1 } });
  return { deleted: true };
};

// ─── Patient feedback ────────────────────────────────────────────────────────

export const createFeedback = async (
  input: {
    fullName: string;
    mobile?: string;
    email?: string;
    service: string;
    experience?: string;
    feedback: string;
    mediaUrl?: string;
    consentToPublish?: boolean;
  },
  ip?: string,
) => {
  const options = await pageOptions();
  if (!options.formActive) throw ApiError.badRequest("Feedback is closed right now.");
  const service = options.services.find((s) => s.value === input.service);
  if (!service) throw ApiError.badRequest("Please choose one of the listed services.");
  if (input.experience && !options.experiences.includes(input.experience)) {
    throw ApiError.badRequest("Please choose one of the listed experience options.");
  }
  const doc = await PatientFeedback.create({
    ...input,
    serviceLabel: service.label,
    consentToPublish: input.consentToPublish === true,
    ip,
  });
  return { _id: doc._id, message: options.successMessage || "Thank you for sharing your experience." };
};

export const listFeedback = async (query: { status?: string; consent?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = {};
  if (query.status && ["new", "reviewed", "published", "archived"].includes(query.status)) filter.status = query.status;
  if (query.consent === "true") filter.consentToPublish = true;
  else if (query.consent === "false") filter.consentToPublish = false;
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const [items, total, counts] = await Promise.all([
    PatientFeedback.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("-ip").lean(),
    PatientFeedback.countDocuments(filter),
    PatientFeedback.aggregate<{ _id: PatientFeedbackStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit), counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) };
};

export const updateFeedback = async (id: string, data: { status?: PatientFeedbackStatus; adminNote?: string }) => {
  const doc = await PatientFeedback.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).select("-ip").lean();
  if (!doc) throw ApiError.notFound("Feedback not found.");
  return doc;
};

export const deleteFeedback = async (id: string) => {
  const doc = await PatientFeedback.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound("Feedback not found.");
  // A testimonial made from it stays, but no longer points at a deleted feedback
  if (doc.testimonial) await Testimonial.updateOne({ _id: doc.testimonial }, { $unset: { feedback: 1 } });
  return { deleted: true };
};

/** Publishes a consented feedback as a (visible) testimonial */
export const publishFeedback = async (id: string, overrides: { name?: string; category?: string; quote?: string; photo?: string }) => {
  const feedback = await PatientFeedback.findById(id);
  if (!feedback) throw ApiError.notFound("Feedback not found.");
  if (!feedback.consentToPublish) throw ApiError.badRequest("This patient did not consent to publication.");
  if (feedback.testimonial && (await Testimonial.exists({ _id: feedback.testimonial }))) {
    throw ApiError.badRequest("This feedback is already published as a testimonial.");
  }

  const { categories } = await pageOptions();
  const category =
    overrides.category ??
    categories.find((c) => c.value === feedback.service || c.label === feedback.serviceLabel)?.value ??
    categories[0]?.value;
  if (!category) throw ApiError.badRequest("Add a category on the page first.");

  const testimonial = await createTestimonial({
    name: overrides.name ?? feedback.fullName,
    category,
    quote: overrides.quote ?? feedback.feedback.slice(0, 1000),
    photo: overrides.photo ?? (/\.(jpe?g|png|webp)$/i.test(feedback.mediaUrl ?? "") ? feedback.mediaUrl : ""),
    isSample: false,
    isActive: true,
  });
  await Testimonial.updateOne({ _id: testimonial._id }, { $set: { feedback: feedback._id } });
  feedback.status = "published";
  feedback.testimonial = testimonial._id as Types.ObjectId;
  await feedback.save();
  return { ...testimonial, feedback: feedback._id };
};

// ─── Seed ────────────────────────────────────────────────────────────────────

export const seedTestimonials = async ({ reset = false } = {}) => {
  if (reset) await Testimonial.deleteMany({ feedback: { $exists: false } });
  let created = 0;
  for (const t of defaultTestimonials) {
    if (await Testimonial.exists({ name: t.name, quote: t.quote })) continue;
    await Testimonial.create(t);
    created++;
  }
  return { testimonialsCreated: created };
};
