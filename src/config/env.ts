import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Validate all environment variables at startup — server will exit if any required variable is missing
const envSchema = z.object({
  PORT: z.string().default("5001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  ACCESS_TOKEN_SECRET: z.string().min(1, "ACCESS_TOKEN_SECRET is required"),
  ACCESS_TOKEN_EXPIRE: z.string().default("15m"),
  REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
  REFRESH_TOKEN_EXPIRE: z.string().default("7d"),
  TOTP_APP_NAME: z.string().default("VedhshalaAdmin"),
  ALLOWED_ORIGIN: z.string().default("http://localhost:5173"),
  COOKIE_SECRET: z.string().min(1, "COOKIE_SECRET is required"),

  // AI Keys
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_REALTIME_MODEL: z.string().default("gpt-realtime-mini"),
  OPENAI_REALTIME_VOICE: z.string().default("coral"),
  CHAT_CALL_MAX_MINUTES: z.string().default("10"),
  CHAT_CALL_DAILY_MINUTES: z.string().default("240"),
  CALL_ENGINE: z.string().default("realtime"),
  GEMINI_API_KEY: z.string().optional(),
  SARVAM_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),

  // Outbound Calling Agent (Twilio Programmable Voice)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  PUBLIC_URL: z.string().optional(),

  // Website chatbot: comma-separated origins allowed to call /api/chat (empty = any)
  ALLOWED_ORIGINS: z.string().default(""),

  // "true" switches off the per-IP API blocks and the website form rate limits (login/2FA and chatbot limits stay)
  DISABLE_API_LIMITS: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // SMTP Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().optional(),
  FROM_NAME: z.string().optional(),
  // SEO & Google Keys
  PAGESPEED_API_KEY: z.string().optional(),
  GA4_PROPERTY_ID: z.string().optional(),
  SEARCH_CONSOLE_SITE_URL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),

  // Website cache refresh after admin saves (frontend app/api/revalidate). Both optional:
  // without them the website picks up admin changes within its 60s cache window.
  FRONTEND_URL: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

