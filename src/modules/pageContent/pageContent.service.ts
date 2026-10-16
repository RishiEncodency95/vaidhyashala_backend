import { ZodError } from "zod";
import { CmsPageContent } from "../../models/CmsPageContent.model";
import { AppointmentRequest } from "../../models/home2/AppointmentRequest.model";
import ContactEnquiry from "../../models/contact/contactEnquiry.model";
import { ApiError } from "../../utils/ApiError";
import { PageContentDefinition } from "./pageContent.types";
import { PAGE_DEFINITIONS, getPageDefinition } from "./pages";

export const requireDefinition = (key: string): PageContentDefinition => {
  const def = getPageDefinition(key);
  if (!def) throw ApiError.notFound(`Unknown page "${key}".`);
  return def;
};

const zodToApiError = (error: unknown) => {
  if (error instanceof ZodError) {
    return ApiError.badRequest(
      "Validation failed",
      error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
    );
  }
  return error;
};

/** The page document, created from the website defaults the first time it is read */
const getOrCreate = async (def: PageContentDefinition) => {
  const existing = await CmsPageContent.findOne({ key: def.key });
  if (existing) return existing;
  return CmsPageContent.create({ key: def.key, sections: def.defaults, seo: def.seoDefaults });
};

/** Stored sections with any section added to the definition later filled from the defaults */
const withAllSections = (def: PageContentDefinition, sections: Record<string, unknown> = {}) =>
  Object.fromEntries(Object.keys(def.sections).map((key) => [key, sections[key] ?? def.defaults[key]]));

const toResponse = (def: PageContentDefinition, doc: { toObject: () => any }) => {
  const page = doc.toObject();
  return {
    key: def.key,
    title: def.title,
    path: def.path,
    sectionOrder: Object.keys(def.sections),
    sections: withAllSections(def, page.sections),
    seo: page.seo,
    publish: page.publish,
    updatedBy: page.updatedBy,
    updatedAt: page.updatedAt,
  };
};

export const getPage = async (key: string) => {
  const def = requireDefinition(key);
  return toResponse(def, await getOrCreate(def));
};

export const getDefaults = (key: string) => {
  const def = requireDefinition(key);
  return { sections: def.defaults, seo: def.seoDefaults };
};

export const listPages = () => PAGE_DEFINITIONS.map(({ key, title, path }) => ({ key, title, path }));

const setFields = async (def: PageContentDefinition, prefix: string, data: Record<string, unknown>, updatedBy?: string) => {
  await getOrCreate(def);
  const $set: Record<string, unknown> = { updatedBy };
  for (const [field, value] of Object.entries(data)) $set[`${prefix}.${field}`] = value;
  return CmsPageContent.findOneAndUpdate({ key: def.key }, { $set }, { new: true, runValidators: true });
};

/** Saves a section. Every field is optional (send only what changed); lists are replaced whole. */
export const updateSection = async (key: string, sectionKey: string, body: unknown, updatedBy?: string) => {
  const def = requireDefinition(key);
  const schema = def.sections[sectionKey];
  if (!schema) throw ApiError.badRequest(`Unknown section "${sectionKey}" for ${def.title}.`);

  let data: Record<string, unknown>;
  try {
    data = schema.partial().strict().parse(body ?? {}) as Record<string, unknown>;
  } catch (error) {
    throw zodToApiError(error);
  }

  // A section that was never saved starts from its defaults so partial saves stay complete
  const current = await getOrCreate(def);
  if (!current.sections?.[sectionKey]) {
    await CmsPageContent.updateOne({ key: def.key }, { $set: { [`sections.${sectionKey}`]: def.defaults[sectionKey] } });
  }

  const doc = await setFields(def, `sections.${sectionKey}`, data, updatedBy);
  return toResponse(def, doc!).sections[sectionKey];
};

export const updateSeo = async (key: string, data: Record<string, unknown>, updatedBy?: string) => {
  const def = requireDefinition(key);
  return toResponse(def, (await setFields(def, "seo", data, updatedBy))!).seo;
};

export const updatePublish = async (key: string, data: Record<string, unknown>, updatedBy?: string) => {
  const def = requireDefinition(key);
  return toResponse(def, (await setFields(def, "publish", data, updatedBy))!).publish;
};

/** What the website needs for the page in one request. Hidden sections come back as null. */
export const getPublicPage = async (key: string) => {
  const page = await getPage(key);
  if (page.publish?.status === "Draft") throw ApiError.notFound("This page is not published.");
  const sections: Record<string, unknown> = {};
  for (const sectionKey of page.sectionOrder) {
    const s = page.sections[sectionKey] as { isActive?: boolean } | undefined;
    sections[sectionKey] = !s || s.isActive === false ? null : s;
  }
  return { key: page.key, path: page.path, seo: page.seo, publish: page.publish, sections, updatedAt: page.updatedAt };
};

/** Loads the website content for one page or all. Without `reset` existing pages are kept. */
export const seedPages = async ({ key, reset = false }: { key?: string; reset?: boolean } = {}) => {
  const defs = key ? [requireDefinition(key)] : PAGE_DEFINITIONS;
  const summary: Record<string, string> = {};
  for (const def of defs) {
    if (reset) await CmsPageContent.deleteOne({ key: def.key });
    if (await CmsPageContent.exists({ key: def.key })) {
      summary[def.key] = "kept";
      continue;
    }
    await CmsPageContent.create({ key: def.key, sections: def.defaults, seo: def.seoDefaults });
    summary[def.key] = "created";
  }
  return summary;
};

/** Panchakarma "Request a Consultation": saved with the Home 2 appointment requests (source "panchakarma") */
export const createConsultationRequest = async (
  input: { name: string; mobile: string; therapy?: string; preferredDate?: string },
  ip?: string,
) => {
  const page = await getPage("panchakarma");
  const form = page.sections.requestForm as { isActive?: boolean; items?: Array<{ label: string; value: string }>; successMessage?: string };
  if (!form || form.isActive === false) throw ApiError.badRequest("Consultation requests are closed right now.");

  let therapy: { label: string; value: string } | undefined;
  if (input.therapy) {
    therapy = (form.items ?? []).find((t) => t.value === input.therapy);
    if (!therapy) throw ApiError.badRequest("Please choose one of the listed therapies.");
  }

  const doc = await AppointmentRequest.create({
    source: "panchakarma",
    service: therapy?.value ?? "",
    serviceLabel: therapy?.label ?? "",
    preferredDate: input.preferredDate ? new Date(`${input.preferredDate}T00:00:00`) : undefined,
    name: input.name,
    phone: input.mobile,
    ip,
  });
  return {
    _id: doc._id,
    status: doc.status,
    message: form.successMessage || "Your consultation request has been received.",
  };
};

/** Contact Us "Send us an enquiry": saved with the existing contact enquiries (Admin → Contact Us Messages) */
export const createContactEnquiry = async (input: {
  name: string;
  mobile: string;
  email?: string;
  enquiryAbout: string;
  message: string;
  consent: true;
}) => {
  const page = await getPage("contact");
  const form = page.sections.enquiryForm as { isActive?: boolean; items?: Array<{ label: string; value: string }>; successMessage?: string };
  if (!form || form.isActive === false) throw ApiError.badRequest("Enquiries are closed right now.");
  const option = (form.items ?? []).find((o) => o.value === input.enquiryAbout);
  if (!option) throw ApiError.badRequest("Please choose one of the listed enquiry options.");

  const doc = await ContactEnquiry.create({
    name: input.name,
    phone: input.mobile,
    email: input.email ?? "",
    subject: option.label,
    service: option.value,
    message: input.message,
    consent: input.consent,
    source: "contact-page",
    eventName: "Vaidhyashala",
  });
  return { _id: doc._id, message: form.successMessage || "Thank you for your enquiry." };
};
