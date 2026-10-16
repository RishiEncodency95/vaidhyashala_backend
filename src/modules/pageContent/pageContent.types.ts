import { z } from "zod";

/** One website page managed from Pages & CMS */
export interface PageContentDefinition {
  /** URL key: /api/cms/pages/<key>, /api/website/pages/<key> */
  key: string;
  title: string;
  /** Path on the website */
  path: string;
  /** Section key → full schema of that section (isActive included) */
  sections: Record<string, z.ZodObject<z.ZodRawShape>>;
  /** Website content, used by the seed and "Sync / Reset Website Data" */
  defaults: Record<string, Record<string, unknown>>;
  seoDefaults: Record<string, unknown>;
}

// ─── Small builders for section schemas ──────────────────────────────────────

export const text = (max = 500) => z.string().trim().max(max);
export const required = (max: number, message: string) => z.string().trim().min(1, message).max(max);
export const list = <T extends z.ZodRawShape>(shape: T, max = 30) => z.array(z.object(shape).strict()).max(max);
export const section = <T extends z.ZodRawShape>(shape: T) => z.object({ isActive: z.boolean(), ...shape });

/** Publish box + Page Settings. Unlike the home pages, these pages may be set to Draft. */
export const pagePublishSchema = z.object({
  body: z
    .object({
      status: z.enum(["Published", "Draft"]),
      visibility: z.enum(["Public", "Private"]),
      publishedAt: z.coerce.date(),
      author: text(120),
      showInNavigation: z.boolean(),
      menuOrder: z.coerce.number().int().min(0).max(999),
    })
    .partial()
    .strict(),
});

/** Panchakarma "Request a Consultation" form */
export const consultationRequestSchema = z.object({
  body: z
    .object({
      name: required(100, "Please enter your name"),
      mobile: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, "Please enter a valid mobile number"),
      therapy: text(120).optional(),
      preferredDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Preferred date must be YYYY-MM-DD")
        .refine((v) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const d = new Date(`${v}T00:00:00`);
          return !Number.isNaN(d.getTime()) && d >= today;
        }, "Preferred date cannot be in the past")
        .optional()
        .or(z.literal("")),
    })
    .strict(),
});

/** Contact Us "Send us an enquiry" form */
export const contactEnquirySchema = z.object({
  body: z
    .object({
      name: required(100, "Please enter your full name"),
      mobile: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, "Please enter a valid mobile number"),
      email: z.string().trim().email("Please enter a valid email").max(200).optional().or(z.literal("")),
      enquiryAbout: required(120, "Please choose what your enquiry is about"),
      message: required(3000, "Please enter your message"),
      consent: z.literal(true, { message: "Please agree to be contacted about your enquiry" }),
    })
    .strict(),
});
