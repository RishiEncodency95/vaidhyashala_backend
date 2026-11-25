import { randomBytes } from "crypto";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { buildInstructions, CONTACT, type BotContext, type VisitorContact } from "./chat.prompt";
import { CREATOR_ATTRIBUTION } from "./creatorGuard";

/*
 * Spoken call with Vaidhya Mitra over WebRTC (OpenAI Realtime).
 * The browser sends its connection offer here and this server opens the call with OpenAI,
 * so the API key never reaches the browser. Sound then goes straight between the browser
 * and OpenAI; this server can still end any call, which keeps the cost in hand.
 */

const API = "https://api.openai.com/v1";
const FALLBACK_MODELS = ["gpt-realtime-mini", "gpt-realtime"];
const TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
const maxCallMinutes = () => Number(process.env.CHAT_CALL_MAX_MINUTES) || 10;
const maxMinutesPerDay = () => Number(process.env.CHAT_CALL_DAILY_MINUTES) || 240;

const HINDI_STYLE =
  "natural everyday polite Hindi, as spoken in Delhi. Speak with respect and warmth (आप, जी, नमस्कार). Use the common English terms Indians use naturally (clinic, doctor, consultation, appointment, Panchakarma, therapy, medicine, helpline, timing). Never sound robotic, overly bookish, or bureaucratic.";

export const VOICE_RULES = `THIS IS A LIVE VOICE CALL WITH VAIDHYASHALA AYURVEDIC CLINIC.
These voice rules apply specifically to spoken communication:

Language & Tone (STRICT):
- Speak polite, warm, and comforting Hindi by default: ${HINDI_STYLE}
- CRITICAL LANGUAGE RULE: Whatever language the visitor speaks OR asks you to speak in (for example: English, Hindi, Punjabi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Urdu, Bhojpuri, Haryanvi, or any other language), IMMEDIATELY switch and speak fluently, naturally, and respectfully in THAT exact language! Never refuse or stick to Hindi if the visitor requests another language.
- Always be empathetic, respectful, and reassuring. In Ayurveda, mental peace and care are half the healing.
- When they share a chronic pain, disease, or problem (like arthritis, migraine, digestive issues, skin troubles):
  1. Acknowledge with compassion first: "जी, मैं समझ सकती हूँ, यह काफ़ी तकलीफ़देह हो सकता है।"
  2. Explain the Ayurvedic perspective simply (restoring balance of Vata, Pitta, or Kapha and detoxifying Ama).
  3. Suggest personalized consultation with our Vaidyas at Kalkaji clinic or online.

How you sound:
- You are "Salu" (शालू), a sweet, warm, gentle, and caring female Ayurveda Care Assistant of Vaidhyashala. Always use feminine Hindi grammar for yourself (e.g., "मैं शालू बोल रही हूँ", "करती हूँ", "सकती हूँ").
- Sweet, calm, affectionate, respectful, and reassuring female voice. Speak slowly, gently, and clearly at a relaxed, unhurried pace — never rush or speak fast.
- Pronounce Ayurvedic and Vedic terms cleanly: नमस्कार, आयुर्वेद, पंचकर्म, नाड़ी परीक्षा, वात, पित्त, कफ, आम दोष, वमन, विरेचन, बस्ति, नस्य, शिरोधरा, कालकाजी.

Call Flow:
- When the call starts, if the visitor's name is not known, greet them warmly and ask for their name: "मैं आपको किस नाम से संबोधित करूँ? आपका शुभ नाम क्या है?"
- CRITICAL: Do NOT repeat "नमस्कार" / "Namaskar" or re-introduce yourself on follow-up turns! After the initial greeting, answer every question directly and naturally.
- When the visitor shares their name, call update_visitor and address them politely (e.g. "[Name] ji").
- If they ask for a consultation or appointment:
  - If mobile number is not yet known, politely ask: "जी, क्या आप अपना 10 अंकों का मोबाइल नंबर साझा कर सकते हैं ताकि हमारे डॉक्टर आपके साथ कंसल्टेशन का समय तय कर सकें?"
  - When they say their number, repeat it to confirm ("क्या आपका नंबर [Number] है?"), then call update_visitor and request_callback.
- If they would rather type than speak, call continue_typing and transition.
- Keep spoken replies concise and conversational: 1 to 3 short sentences, then pause and listen. Avoid reading long lists.
- For our clinic address and contacts:
  - Phone: ${CONTACT.phone} / ${CONTACT.alternatePhone}
  - Address: First Floor, E-1, Opposite KFC, Kalkaji Main Market, Kalkaji, Delhi
  - Timings: 10:00 AM to 7:00 PM
- If anyone asks who created or developed this chatbot / call assistant ("kisne banaya", "tumhe kisne banaya", "who created you", "who developed this"):
  - Answer warmly and proudly: "${CREATOR_ATTRIBUTION.hi}"
- When finishing, say a warm Ayurvedic farewell ("वैद्यशाला में संपर्क करने के लिए धन्यवाद। आपका स्वास्थ्य सदा उत्तम रहे! नमस्कार। 🙏") and call end_conversation.`;

const NOT_A_NAME = new Set(
  (
    "hi hello helo hey hlo namaste namaskar namaskaar pranam ok okay yes no haan han ha ji jee hmm thanks thank you sir madam mam " +
    "kya kaise kab kahan kitna kaun bataiye batao mujhe main mera naam name is my please plz help doctor consultation appointment clinic " +
    "हाय हेलो हैलो हलो नमस्ते नमस्कार प्रणाम ओके हाँ हां हा जी हम्म थैंक्यू धन्यवाद सर मैडम क्या कैसे कब कहाँ कितना कौन बताइए मुझे मैं मेरा नाम " +
    "kisne banaya banaya developer creator kisne"
  ).split(" ")
);

export const isRealName = (name: string) => {
  const words = name.toLowerCase().split(" ");
  return words.length <= 3 && !words.some((w) => NOT_A_NAME.has(w));
};

export const TOOLS = [
  {
    type: "function",
    name: "update_visitor",
    description: "Save the visitor's name, email, or 10-digit mobile number once confirmed.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The visitor's name" },
        salutation: { type: "string", description: "How they like to be addressed without ji (e.g. Rahul)" },
        phone: { type: "string", description: "Their 10-digit Indian mobile number" },
        email: { type: "string", description: "Their email address" },
      },
    },
  },
  {
    type: "function",
    name: "request_callback",
    description: "Note a doctor consultation or callback request once the visitor confirmed their number.",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string", description: "10-digit mobile number" },
        preferred_time: { type: "string", description: "Preferred date or time for the consultation" },
      },
    },
  },
  {
    type: "function",
    name: "search_knowledge",
    description: "Search Vaidhyashala clinic treatments, Panchakarma therapies, and timings.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Search query" } },
      required: ["query"],
    },
  },
  {
    type: "function",
    name: "continue_typing",
    description: "The visitor prefers to type instead of talking on voice. The call closes gracefully and chat carries on in text.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "end_conversation",
    description: "End the call after wishing good health. Always say farewell before calling this.",
    parameters: { type: "object", properties: {} },
  },
];

export const callInstructions = (
  visitorName?: string,
  ctx: BotContext = {},
  contact: VisitorContact = {},
  earlier: { role: string; content: string }[] = []
) => {
  const earlierTalk = earlier.length
    ? `\n\nEARLIER IN THIS CHAT:\n` +
      earlier.map((m) => `${m.role === "user" ? "Visitor" : "Salu"}: ${m.content.slice(0, 300)}`).join("\n")
    : "";

  return [buildInstructions(visitorName, ctx, contact), VOICE_RULES, earlierTalk]
    .filter(Boolean)
    .join("\n\n");
};

const sessionConfig = (instructions: string, noise: boolean, model: string) => ({
  type: "realtime",
  model,
  instructions,
  tools: TOOLS,
  tool_choice: "auto",
  max_output_tokens: 2500,
  include: ["item.input_audio_transcription.logprobs"],
  audio: {
    input: {
      noise_reduction: { type: noise ? "near_field" : "far_field" },
      transcription: {
        model: TRANSCRIBE_MODEL,
        prompt:
          "हिंदी बातचीत देवनागरी में लिखें। English stays in English. वैद्यशाला (Vaidhyashala), पंचकर्म, वात, पित्त, कफ, वमन, विरेचन, बस्ति, नस्य, शिरोधरा, कालकाजी, नाड़ी परीक्षा, डॉ कंसल्टेशन।",
      },
      turn_detection: { type: "semantic_vad", eagerness: "medium", create_response: true, interrupt_response: true },
    },
    output: { voice: env.OPENAI_REALTIME_VOICE || "coral" },
  },
});

const createCall = async (sdp: string, session: object) => {
  const form = new FormData();
  form.set("sdp", sdp);
  form.set("session", JSON.stringify(session));
  const res = await fetch(`${API}/realtime/calls`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI call failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return { sdp: await res.text(), callId: (res.headers.get("location") || "").split("/").pop() || "" };
};

const hangUp = async (callId: string) => {
  if (!callId) return;
  const res = await fetch(`${API}/realtime/calls/${callId}/hangup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok && res.status !== 404) throw new Error(`OpenAI hangup failed (${res.status})`);
};

/* ── Active calls map ── */
type LiveCall = { callId: string; ip: string; startedAt: number; timer: ReturnType<typeof setTimeout> };
const calls = new Map<string, LiveCall>();
let today = { date: "", minutes: 0 };

const usedToday = () => {
  const date = new Date().toISOString().slice(0, 10);
  if (today.date !== date) today = { date, minutes: 0 };
  let running = 0;
  calls.forEach((call) => {
    running += (Date.now() - call.startedAt) / 60000;
  });
  return today.minutes + running;
};

const forget = (sessionId: string, call: LiveCall) => {
  calls.delete(sessionId);
  clearTimeout(call.timer);
  usedToday();
  today.minutes += (Date.now() - call.startedAt) / 60000;
};

export const endCall = (sessionId: string) => {
  const call = calls.get(sessionId);
  if (!call) return;
  forget(sessionId, call);
  hangUp(call.callId).catch((error) => logger.warn(`VaidhyaMitra: could not end call: ${error?.message}`));
};

export const callAvailable = () => Boolean(env.OPENAI_API_KEY) && usedToday() < maxMinutesPerDay();

export const isLive = (sessionId: string, ip: string) => calls.get(sessionId)?.ip === ip;

/** Opens Realtime WebRTC call with OpenAI */
export const openCall = async (o: { sessionId: string; ip: string; sdp: string; noise: boolean; instructions: string }) => {
  endCall(o.sessionId);
  let opened: { sdp: string; callId: string } | null = null;
  let lastError: unknown = null;

  const models = [...new Set([env.OPENAI_REALTIME_MODEL || "gpt-realtime-mini", ...FALLBACK_MODELS])];
  for (const model of models) {
    try {
      opened = await createCall(o.sdp, sessionConfig(o.instructions, o.noise, model));
      break;
    } catch (error: any) {
      lastError = error;
      logger.error(`VaidhyaMitra: could not open call with ${model}: ${error?.message}`);
      if (/\((401|403|429)\)/.test(String(error?.message))) break;
    }
  }
  if (!opened) throw lastError;

  const maxSeconds = maxCallMinutes() * 60;
  calls.set(o.sessionId, {
    callId: opened.callId,
    ip: o.ip,
    startedAt: Date.now(),
    timer: setTimeout(() => endCall(o.sessionId), (maxSeconds + 20) * 1000),
  });
  return { sdp: opened.sdp, maxSeconds };
};
