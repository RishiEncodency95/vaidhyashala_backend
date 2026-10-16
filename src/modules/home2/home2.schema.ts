import { z } from "zod";
import { HOME2_SECTION_KEYS } from "./home2.defaults";

// SEO and Publish bodies are the same as Home 1's
export { seoSchema, publishSchema } from "../home1/home1.schema";

const text = (max = 500) => z.string().trim().max(max);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const list = <T extends z.ZodRawShape>(shape: T, max = 30) => z.array(z.object(shape).strict()).max(max);

// ─── Sections: a save sends the whole section, lists included ────────────────

export const sectionSchemas = {
  hero: z.object({
    isActive: z.boolean(),
    eyebrow: text(120),
    titleLine1: text(80),
    titleLine2: text(80),
    titleHighlight: text(80),
    subtitle: text(400),
    primaryButtonLabel: text(60),
    primaryButtonLink: text(300),
    secondaryButtonLabel: text(60),
    secondaryButtonLink: text(300),
    image: text(1000),
    imageAlt: text(300),
  }),
  highlights: z.object({
    isActive: z.boolean(),
    items: list({ label: text(100).min(1, "Highlight text is required") }, 12),
  }),
  carePillars: z.object({
    isActive: z.boolean(),
    eyebrow: text(120),
    heading: text(200),
    description: text(500),
    linkLabel: text(60),
    items: list(
      {
        number: text(20),
        title: text(120).min(1, "Card title is required"),
        description: text(500),
        image: text(1000),
        imageAlt: text(300),
        link: text(300),
      },
      12,
    ),
  }),
  approach: z.object({
    isActive: z.boolean(),
    eyebrow: text(120),
    headingLine1: text(120),
    headingHighlight: text(120),
    description: text(500),
    image: text(1000),
    imageAlt: text(300),
    items: list(
      { number: text(20), title: text(120).min(1, "Step title is required"), description: text(300) },
      10,
    ),
  }),
  concerns: z.object({
    isActive: z.boolean(),
    eyebrow: text(120),
    heading: text(200),
    description: text(500),
    image: text(1000),
    imageAlt: text(300),
    items: list({ label: text(80).min(1, "Concern name is required"), iconImage: text(1000), link: text(300) }, 20),
  }),
  products: z.object({
    isActive: z.boolean(),
    eyebrow: text(120),
    headingLine1: text(120),
    headingLine2: text(120),
    description: text(500),
    buttonLabel: text(60),
    buttonLink: text(300),
    image: text(1000),
    imageAlt: text(300),
  }),
  appointment: z.object({
    isActive: z.boolean(),
    eyebrow: text(120),
    heading: text(200),
    description: text(500),
    serviceLabel: text(60),
    servicePlaceholder: text(80),
    dateLabel: text(60),
    typeLabel: text(60),
    clinicLabel: text(60),
    onlineLabel: text(60),
    buttonLabel: text(60),
    successMessage: text(300),
    items: list(
      {
        label: text(100).min(1, "Service name is required"),
        value: text(60)
          .toLowerCase()
          .regex(/^[a-z0-9-]*$/, "Service value may only contain lowercase letters, numbers and hyphens"),
      },
      20,
    ).refine((items) => items.length > 0, "Add at least one service"),
  }),
  faq: z.object({
    isActive: z.boolean(),
    eyebrow: text(120),
    heading: text(200),
    description: text(500),
    items: list(
      { question: text(300).min(1, "Question is required"), answer: text(3000).min(1, "Answer is required") },
      40,
    ),
  }),
  cta: z.object({
    isActive: z.boolean(),
    heading: text(200),
    subtitle: text(400),
    buttonLabel: text(60),
    buttonLink: text(300),
    backgroundImage: text(1000),
    backgroundImageAlt: text(300),
  }),
};

// Every field optional (a save may send only what changed), unknown fields rejected
export const partialSectionSchemas = Object.fromEntries(
  Object.entries(sectionSchemas).map(([key, schema]) => [key, schema.partial().strict()]),
) as unknown as Record<keyof typeof sectionSchemas, z.ZodType<Record<string, unknown>>>;

export const sectionParamSchema = z.object({
  params: z.object({ section: z.enum(HOME2_SECTION_KEYS) }),
});

// ─── Appointment requests ────────────────────────────────────────────────────

export const createAppointmentSchema = z.object({
  body: z
    .object({
      service: text(60).min(1, "Please choose a service"),
      preferredDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Preferred date must be YYYY-MM-DD")
        .refine((v) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const d = new Date(`${v}T00:00:00`);
          return !Number.isNaN(d.getTime()) && d >= today;
        }, "Preferred date cannot be in the past"),
      consultationType: z.enum(["clinic", "online"]),
      // Optional contact details: the current website form does not ask for them yet
      name: text(100).optional(),
      phone: z
        .string()
        .trim()
        .regex(/^[+\d][\d\s-]{6,18}$/, "Invalid phone number")
        .optional()
        .or(z.literal("")),
      email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
      message: text(1000).optional(),
    })
    .strict(),
});

export const updateAppointmentSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      status: z.enum(["new", "contacted", "confirmed", "cancelled"]).optional(),
      adminNote: text(1000).optional(),
    })
    .strict(),
});

export const idParamSchema = z.object({ params: z.object({ id: objectId }) });
