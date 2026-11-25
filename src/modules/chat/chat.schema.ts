import { z } from "zod";

/** "+91 98765-43210" / "098765 43210" → "9876543210" */
export const toTenDigitMobile = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

const sessionId = z.string().trim().min(1, "sessionId is required").max(100, "sessionId is too long");
const pageUrl = z.string().max(500).optional();

export const chatLeadSchema = z.object({
  body: z.object({
    sessionId,
    pageUrl,
    name: z
      .string()
      .trim()
      .min(2, "Name is required")
      .max(60, "Name is too long")
      .regex(/^\p{L}[\p{L}\p{M} .'-]*$/u, "Name can only contain letters"),
    phone: z
      .string()
      .trim()
      .refine((v) => /^[6-9]\d{9}$/.test(toTenDigitMobile(v)), "Enter a valid 10-digit mobile number"),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address").max(100)]).optional(),
    enquiryType: z.string().max(50).optional(),
    preferredTime: z.string().trim().max(60).optional(),
  }),
});

// The name a visitor types when the chat asks "May I know your name?"
export const chatStartSchema = z.object({
  body: z.object({
    sessionId,
    pageUrl,
    name: z
      .string()
      .trim()
      .min(2, "Please type your name")
      .max(40, "Name is too long")
      .regex(/^\p{L}[\p{L}\p{M} .'-]*$/u, "Name can only contain letters"),
    salutation: z.union([z.literal(""), z.string().trim().max(40)]).optional(),
  }),
});

// Previous chats of a visitor who verified this mobile number / email with OTP
export const chatHistorySchema = z.object({
  body: z
    .object({
      phone: z
        .string()
        .trim()
        .refine((v) => /^[6-9]\d{9}$/.test(toTenDigitMobile(v)), "Enter a valid 10-digit mobile number")
        .optional(),
      email: z.string().trim().toLowerCase().email("Enter a valid email address").max(100).optional(),
    })
    .refine((b) => b.phone || b.email, "Mobile number or email is required"),
});

export const chatMessageSchema = z.object({
  body: z.object({
    sessionId,
    pageUrl,
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(1000, "Message must be at most 1000 characters"),
  }),
});

export const chatTrackSchema = z.object({
  body: z
    .object({
      sessionId,
      pageUrl,
      messages: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(2000),
          })
        )
        .max(10)
        .optional(),
      feedback: z.enum(["yes", "no"]).optional(),
    })
    .refine((b) => b.messages?.length || b.feedback, "Nothing to save"),
});

export const chatSpeakSchema = z.object({
  body: z.object({ text: z.string().trim().min(1, "Nothing to read out").max(1500, "Text is too long") }),
});

export const chatAbuseSchema = z.object({
  body: z.object({ sessionId: z.string().trim().max(100).optional() }),
});
