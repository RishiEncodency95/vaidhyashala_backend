import { z } from "zod";

const text = (max = 500) => z.string().trim().max(max);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const mediaUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || /^https:\/\//i.test(v) || v.startsWith("/uploads/"), "Media must be an uploaded file or an https link");

const testimonialBody = z.object({
  name: text(100).min(1, "Name is required"),
  category: text(120).min(1, "Category is required"),
  quote: text(1000).min(1, "Quote is required"),
  photo: text(1000).optional(),
  isSample: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const createTestimonialSchema = z.object({ body: testimonialBody.strict() });
export const updateTestimonialSchema = z.object({ params: z.object({ id: objectId }), body: testimonialBody.partial().strict() });
export const idParamSchema = z.object({ params: z.object({ id: objectId }) });

export const createFeedbackSchema = z.object({
  body: z
    .object({
      fullName: text(100).min(1, "Please enter your full name"),
      mobile: z
        .string()
        .trim()
        .regex(/^[+\d][\d\s-]{6,18}$/, "Please enter a valid mobile number")
        .optional()
        .or(z.literal("")),
      email: z.string().trim().email("Please enter a valid email").max(200).optional().or(z.literal("")),
      service: text(120).min(1, "Please choose the service you used"),
      experience: text(60).optional(),
      feedback: text(3000).min(1, "Please share your feedback"),
      mediaUrl: mediaUrl.optional(),
      consentToPublish: z.boolean().optional(),
    })
    .strict(),
});

export const updateFeedbackSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      status: z.enum(["new", "reviewed", "published", "archived"]).optional(),
      adminNote: text(1000).optional(),
    })
    .strict(),
});

/** Turn a consented feedback into a testimonial (fields default to the feedback's) */
export const publishFeedbackSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: text(100).min(1).optional(),
      category: text(120).min(1).optional(),
      quote: text(1000).min(1).optional(),
      photo: text(1000).optional(),
    })
    .strict(),
});

export type TestimonialInput = z.infer<typeof testimonialBody>;
