import { Request, Response } from "express";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import Chat from "../../models/chat/Chat.model";
import { getOpenAI } from "../chatbot/chatbot.service";
import { buildInstructions, CONTACT } from "./chat.prompt";

/**
 * Outbound AI Calling Agent (Twilio Programmable Voice + AI Conversation).
 * Places real PSTN phone calls to visitors who ask "call me" / "mujhe call karo"
 * and conducts a two-way Hindi/English Ayurvedic conversation over the phone.
 */

const xmlEscape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const isOutboundCallConfigured = (): boolean =>
  Boolean(env.TWILIO_ACCOUNT_SID?.trim() && env.TWILIO_AUTH_TOKEN?.trim() && env.TWILIO_PHONE_NUMBER?.trim());

export const normalizePhoneE164 = (raw: string): string | null => {
  const cleaned = raw.trim();
  if (/^\+\d{10,15}$/.test(cleaned)) return cleaned;
  const digits = cleaned.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;
  return null;
};

const publicBaseUrl = () => {
  const url = (env.PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (!url || /localhost|127\.0\.0\.1/i.test(url)) return "";
  return url;
};

export interface OutboundCallResult {
  ok: boolean;
  configured: boolean;
  code?: string;
  callSid?: string;
  to?: string;
  error?: string;
}

/** Places a real outbound phone call via Twilio REST API. */
export async function placeOutboundCall(params: {
  phone: string;
  visitorName?: string;
  sessionId?: string;
  reason?: string;
}): Promise<OutboundCallResult> {
  if (!isOutboundCallConfigured()) {
    return { ok: false, configured: false, code: "TELEPHONY_NOT_CONFIGURED" };
  }

  const to = normalizePhoneE164(params.phone);
  if (!to) {
    return { ok: false, configured: true, code: "INVALID_PHONE", error: "Invalid mobile number" };
  }

  const sid = env.TWILIO_ACCOUNT_SID!.trim();
  const token = env.TWILIO_AUTH_TOKEN!.trim();
  const from = env.TWILIO_PHONE_NUMBER!.trim();
  const base = publicBaseUrl();

  const body = new URLSearchParams();
  body.set("To", to);
  body.set("From", from);

  if (base && params.sessionId) {
    body.set("Url", `${base}/api/chat/twilio/voice?sessionId=${encodeURIComponent(params.sessionId)}`);
    body.set("Method", "POST");
  } else {
    const who = params.visitorName && params.visitorName !== "Visitor" ? `${params.visitorName} जी` : "";
    const greeting = `नमस्कार ${who}! मैं शालू, वैद्यशाला आयुर्वेदिक क्लिनिक से बोल रही हूँ। आपने कॉल के लिए अनुरोध किया था। हमारी डॉक्टर टीम शीघ्र ही आपसे संपर्क करेगी। आप सीधे ${CONTACT.phone} पर भी कॉल कर सकते हैं। धन्यवाद, नमस्कार!`;
    body.set(
      "Twiml",
      `<Response><Say language="hi-IN" voice="Google.hi-IN-Wavenet-A">${xmlEscape(greeting)}</Say></Response>`
    );
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    const data = (await res.json().catch(() => null)) as { sid?: string; message?: string } | null;
    if (!res.ok || !data?.sid) {
      logger.error(`Twilio outbound call failed (${res.status}): ${data?.message || "Unknown error"}`);
      return { ok: false, configured: true, code: "CALL_FAILED", error: data?.message || "Twilio call failed" };
    }
    logger.info(`Outbound call initiated to ${to} (SID: ${data.sid})`);
    return { ok: true, configured: true, callSid: data.sid, to };
  } catch (err: any) {
    logger.error(`Twilio outbound call error: ${err?.message}`);
    return { ok: false, configured: true, code: "CALL_FAILED", error: err?.message };
  }
}

const FAREWELL_RE = /\b(bye|goodbye|thank you|thanks|dhanyavaad|dhanyawad|shukriya|bas|ok bye|theek hai bye)\b|धन्यवाद|शुक्रिया|नमस्कार|बाय/i;

const detectTwilioLocale = (text: string): { lang: string; voice: string } => {
  if (/[\u0A00-\u0A7F]/.test(text) || /\bpunjabi\b/i.test(text)) return { lang: "pa-IN", voice: "Google.pa-IN-Wavenet-A" };
  if (/[\u0A80-\u0AFF]/.test(text) || /\bgujarati\b/i.test(text)) return { lang: "gu-IN", voice: "Google.gu-IN-Wavenet-A" };
  if (/[\u0980-\u09FF]/.test(text) || /\bbengali|bangla\b/i.test(text)) return { lang: "bn-IN", voice: "Google.bn-IN-Wavenet-A" };
  if (/[\u0B80-\u0BFF]/.test(text) || /\btamil\b/i.test(text)) return { lang: "ta-IN", voice: "Google.ta-IN-Wavenet-A" };
  if (/[\u0C00-\u0C7F]/.test(text) || /\btelugu\b/i.test(text)) return { lang: "te-IN", voice: "Google.te-IN-Wavenet-A" };
  if (/[\u0C80-\u0CFF]/.test(text) || /\bkannada\b/i.test(text)) return { lang: "kn-IN", voice: "Google.kn-IN-Wavenet-A" };
  if (/[\u0D00-\u0D7F]/.test(text) || /\bmalayalam\b/i.test(text)) return { lang: "ml-IN", voice: "Google.ml-IN-Wavenet-A" };
  if (/\bmarathi\b/i.test(text)) return { lang: "mr-IN", voice: "Google.mr-IN-Wavenet-A" };
  if (/[ऀ-ॿ]/.test(text)) return { lang: "hi-IN", voice: "Google.hi-IN-Wavenet-A" };
  return { lang: "en-IN", voice: "Google.en-IN-Wavenet-A" };
};

const generatePhoneReply = async (sessionId: string, userSpeech: string): Promise<string> => {
  const chat = sessionId ? await Chat.findOne({ sessionId }).select({ lead: 1, messages: { $slice: -10 } }).lean<any>() : null;
  const visitorName = chat?.lead?.name && chat.lead.name !== "Visitor" ? chat.lead.name : undefined;
  const instructions =
    buildInstructions(visitorName, {}, { phone: chat?.lead?.phone, email: chat?.lead?.email }) +
    "\n\nPHONE CALL RULES: You are currently speaking on a live phone call. Reply in 1 to 3 short, natural spoken sentences. ALWAYS reply in the exact language the caller speaks or requests (Hindi, English, Punjabi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, etc.). Do NOT repeat 'नमस्कार' or re-introduce yourself on follow-up turns — answer directly. Do not use markdown, bullet points, or URLs.";

  const history = ((chat?.messages || []) as Array<{ role: string; content: string }>)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-8)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let reply = "";
  const client = getOpenAI();
  if (client) {
    try {
      const resp = await client.responses.create({
        model: env.OPENAI_MODEL,
        instructions,
        input: [...history, { role: "user", content: userSpeech }],
      });
      reply = (resp.output_text || "").trim();
    } catch (err: any) {
      logger.warn(`Twilio AI OpenAI error: ${err?.message}`);
    }
  }

  if (!reply && env.GEMINI_API_KEY) {
    try {
      const gemRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: instructions }] },
            contents: [
              ...history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
              { role: "user", parts: [{ text: userSpeech }] },
            ],
          }),
        }
      );
      const gemData = (await gemRes.json()) as any;
      reply = gemData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } catch (err: any) {
      logger.warn(`Twilio AI Gemini error: ${err?.message}`);
    }
  }

  if (!reply) {
    reply = "जी, धन्यवाद। हमारे आयुर्वेदिक डॉक्टर आपकी समस्या के लिए शीघ्र संपर्क करेंगे।";
  }

  if (sessionId) {
    await Chat.updateOne(
      { sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: "user", content: userSpeech, createdAt: new Date() },
              { role: "assistant", content: reply, createdAt: new Date() },
            ],
          },
        },
      }
    ).catch(() => {});
  }

  return reply;
};

/** POST /api/chat/twilio/voice — Twilio webhook when visitor answers the outbound call */
export const twilioVoiceWebhook = async (req: Request, res: Response) => {
  const sessionId = String(req.query.sessionId || "").trim();
  const chat = sessionId ? await Chat.findOne({ sessionId }).select("lead.name lead.salutation").lean<any>() : null;
  const rawName = chat?.lead?.salutation || chat?.lead?.name;
  const name = rawName && rawName !== "Visitor" ? `${rawName} जी` : "";
  const base = publicBaseUrl();
  const action = `${base}/api/chat/twilio/gather?sessionId=${encodeURIComponent(sessionId)}`;

  const greeting = `नमस्कार ${name}! मैं शालू, वैद्यशाला आयुर्वेदिक क्लिनिक से बोल रही हूँ। आपने कॉल का अनुरोध किया था। बताइए, आज आपके स्वास्थ्य के लिए मैं आपकी क्या सहायता कर सकती हूँ?`;

  res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="hi-IN" speechTimeout="auto" action="${xmlEscape(action)}" method="POST">
    <Say language="hi-IN" voice="Google.hi-IN-Wavenet-A">${xmlEscape(greeting)}</Say>
  </Gather>
  <Say language="hi-IN" voice="Google.hi-IN-Wavenet-A">कोई आवाज़ नहीं आई। आप कभी भी वेबसाइट चैट या ${xmlEscape(CONTACT.phone)} पर संपर्क कर सकते हैं। नमस्कार।</Say>
</Response>`);
};

/** POST /api/chat/twilio/gather — Handles each spoken turn from Twilio phone call */
export const twilioGatherWebhook = async (req: Request, res: Response) => {
  const sessionId = String(req.query.sessionId || "").trim();
  const speech = String(req.body?.SpeechResult || "").trim();
  const base = publicBaseUrl();
  const action = `${base}/api/chat/twilio/gather?sessionId=${encodeURIComponent(sessionId)}`;

  if (!speech) {
    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="hi-IN" speechTimeout="auto" action="${xmlEscape(action)}" method="POST">
    <Say language="hi-IN" voice="Google.hi-IN-Wavenet-A">क्षमा करें, मैं सुन नहीं पाया। कृपया दोबारा बोलिए।</Say>
  </Gather>
</Response>`);
    return;
  }

  const reply = await generatePhoneReply(sessionId, speech);
  const { lang, voice } = detectTwilioLocale(`${speech} ${reply}`);

  if (FAREWELL_RE.test(speech)) {
    res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${lang}" voice="${voice}">${xmlEscape(reply)}</Say>
  <Hangup/>
</Response>`);
    return;
  }

  res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="${lang}" speechTimeout="auto" action="${xmlEscape(action)}" method="POST">
    <Say language="${lang}" voice="${voice}">${xmlEscape(reply)}</Say>
  </Gather>
</Response>`);
};
