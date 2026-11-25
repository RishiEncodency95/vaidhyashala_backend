import { Request, Response } from "express";
import { toFile } from "openai";
import asyncHandler from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";
import { getOpenAI } from "../chatbot/chatbot.service";

/*
 * Vaidhya Mitra's voice (website chat):
 * Primary TTS: Sarvam AI (Sarika / Shalini conversational voice), with OpenAI TTS as fallback.
 * Speech-to-text: Sarvam Saarika / Deepgram Nova-3, with OpenAI Whisper as fallback.
 */

const VOICE_STYLE =
  "Voice: Salu (शालू), a sweet, warm, gentle, caring young Indian female Ayurvedic care assistant. " +
  "Accent: natural, soft, melodious Indian Hindi with authentic Sanskrit and Ayurvedic pronunciation (नमस्कार, वैद्यशाला, पंचकर्म, शिरोधारा, वात, पित्त, कफ, अभ्यंग, नाड़ी परीक्षा, आयुर्वेद). " +
  "Tone: sweet, affectionate, humble, respectful and reassuring female voice; never harsh, flat, or robotic. " +
  "Pace: slow, calm, relaxed, unhurried, and soothing, with clear gentle pauses between phrases. Never speak fast.";

const writtenIn = (text: string): "hindi" | "hinglish" | "english" => {
  if (/[ऀ-ॿ]/.test(text)) return "hindi";
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  const hinglish = words.filter((w) =>
    /^(hai|hain|kya|kaise|kab|kahan|mujhe|mera|meri|mere|aap|aapka|aapki|aapke|aapko|aapse|kripya|nahi|nahin|chahiye|chahte|karna|karein|kijiye|dijiye|batayein|bataiye|ji|jee|haan|hum|hamari|hamare|hamara|liye|mein|se|ko|ka|ki|ke|bhi|toh|sakta|sakti|sakte|hoon|hun|raha|rahi|rahe|sahayata|madad|ho|hoga|hogi|kar|karo|ab|abhi|yahan|wahan|phir|apna|apni|apne|jaldi|dhanyavaad|dhanyawad|shukriya|namaste|namaskar|ilaj|dawa|upchar|ayurveda|doctor|baat)$/.test(w)
  ).length;
  return hinglish >= 2 ? "hinglish" : "english";
};

const spellPhone = (number: string) => {
  const digits = number.replace(/\D/g, "").slice(-10);
  return `${[...digits.slice(0, 5)].join(" ")}, ${[...digits.slice(5)].join(" ")}`;
};

export const joinPhones = (text: string) =>
  text.replace(/(?<!\d(?:,\s?|[\s-])?)[6-9](?:(?:,\s?|[\s-])?\d){9}(?!(?:,\s?|[\s-])?\d)/g, (number) => number.replace(/\D/g, ""));

export const forSpeech = (raw: string): string => {
  const language = writtenIn(raw);
  const word = (hindi: string, hinglish: string, english: string) => ({ hindi, hinglish, english })[language];
  return String(raw)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/!+/g, ".")
    .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
    .replace(/\b24\s*[×x]\s*7\b/gi, word("चौबीसों घंटे", "chaubison ghante", "twenty four by seven"))
    .replace(/(?:\+?91[\s-]*)?\b[6-9](?:[\s-]?\d){9}\b/g, spellPhone)
    .replace(/([\w.+-]+)@([\w-]+(?:\.[\w-]+)+)/g, (_, name, domain) => `${name} ${word("एट", "at", "at")} ${domain.replace(/\./g, ` ${word("डॉट", "dot", "dot")} `)}`)
    .replace(/^\s*[•✓*-]\s*/, "")
    .replace(/\n\s*[•✓*-]\s*/g, ", ")
    .replace(/(\d)\s*[–-]\s*(\d)/g, `$1 ${word("से", "se", "to")} $2`)
    .replace(/\s&\s/g, ` ${word("और", "aur", "and")} `)
    .replace(/\n+/g, ". ")
    .replace(/([.!?।,:])\s*\.(\s|$)/g, "$1$2")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 1500);
};

const DEVANAGARI_RULES = `The text is a chat reply in Hinglish, Hindi, or English. Rewrite it for a natural Indian Hindi voice to read aloud in Devanagari script.
- Hindi words: in Devanagari (band → बंद, kar → कर, par → पर, hai → है, ho → हो, main → मैं, mein → में, ki → की, se → से, aap → आप).
- English words commonly used in India: in Devanagari phonetically (call → कॉल, appointment → अपॉइंटमेंट, consultation → कंसल्टेशन, clinic → क्लिनिक, doctor → डॉक्टर, therapy → थेरेपी, treatment → ट्रीटमेंट).
- Sanskrit/Ayurvedic words: pure Devanagari (आयुर्वेद, पंचकर्म, शिरोधारा, वात, पित्त, कफ, अभ्यंग).
- A pure English sentence stays in English letters.
Reply ONLY with the rewritten text.`;

const rewritten = new Map<string, Promise<string>>();
const toDevanagari = async (text: string): Promise<string> => {
  const client = getOpenAI();
  if (!client) return text;
  try {
    const res = await client.chat.completions.create(
      {
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        max_completion_tokens: 900,
        messages: [
          { role: "system", content: DEVANAGARI_RULES },
          { role: "user", content: text },
        ],
      },
      { timeout: 8000 }
    );
    return res.choices[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    logger.warn(`Vaidhya Mitra voice: could not rewrite in Devanagari: ${error?.message}`);
    return text;
  }
};

const NON_ROMAN = /[\u0900-\u0963\u0966-\u097F]|[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const HINGLISH_RULES =
  "Rewrite the text in Hinglish (Hindi words in Roman letters, as Indians type on WhatsApp). Keep English words in English (Vaidhyashala, consultation, doctor, treatment, clinic, panchakarma). Do not translate, shorten or add anything. Reply with only the rewritten text.";

const HEARD_RULES = `The text is what a speech recognizer heard a visitor say to Vaidhyashala (Ayurvedic clinic). Clean it up and fix misheard words:
- Context: Vaidhyashala, Ayurveda, Panchakarma, Vamana, Virechana, Basti, Nasya, Shirodhara, Abhyanga, Nadi Pariksha, Kalkaji, clinic, doctor consultation.
Keep the visitor's language, dialect and intent intact. Reply with only the cleaned text.`;

const rewrites = new Map<string, Promise<string>>();
const rewrite = (rules: string, text: string, label: string): Promise<string> => {
  const key = `${label}\u0000${text}`;
  const known = rewrites.get(key);
  if (known) return known;
  const next = (async () => {
    const client = getOpenAI();
    if (!client) return text;
    try {
      const res = await client.chat.completions.create(
        {
          model: env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0,
          max_completion_tokens: 900,
          messages: [
            { role: "system", content: rules },
            { role: "user", content: text },
          ],
        },
        { timeout: 8000 }
      );
      return res.choices[0]?.message?.content?.trim() || text;
    } catch (error: any) {
      logger.warn(`Vaidhya Mitra voice: could not rewrite (${label}): ${error?.message}`);
      return text;
    }
  })();
  rewrites.set(key, next);
  if (rewrites.size > 600) rewrites.delete(rewrites.keys().next().value as string);
  return next;
};

export const toHinglish = (text: string): Promise<string> =>
  NON_ROMAN.test(text) ? rewrite(HINGLISH_RULES, text, "hinglish") : Promise.resolve(text);

export const fromSpeech = (text: string): Promise<string> => (/\p{L}/u.test(text) ? rewrite(HEARD_RULES, text, "heard") : Promise.resolve(text));

export const forVoice = (text: string): Promise<string> => {
  if (!/[a-z]{2}/i.test(text)) return Promise.resolve(text);
  if (writtenIn(text) === "english" && (text.match(/[a-z]+/gi) || []).length >= 3) return Promise.resolve(text);
  const known = rewritten.get(text);
  if (known) return known;
  const next = toDevanagari(text);
  rewritten.set(text, next);
  if (rewritten.size > 300) rewritten.delete(rewritten.keys().next().value as string);
  return next;
};

const clips = new Map<string, Buffer>();
const remember = (text: string, audio: Buffer) => {
  clips.set(text, audio);
  if (clips.size > 200) clips.delete(clips.keys().next().value as string);
};

const resolveSarvamSpeaker = (speaker?: string, lang?: string): string => {
  const s = (speaker || "sarika").trim().toLowerCase();
  if (s === "shalini") return (lang || "").startsWith("hi") ? "shalini_hi_companion" : "shalini_enhi_companion";
  if (s === "simran") return (lang || "").startsWith("hi") ? "simran_hi_conversation" : "simran_enhi_companion";
  if (s === "sarika") return "sarika_hi_conversation";
  return "sarika_hi_conversation";
};

const spokenLanguage = (text: string) => (/[\u0900-\u0963\u0966-\u097F]/.test(text) ? "hi-IN" : "en-IN");
const sayable = (text: string) => text.replace(/\bVaidhyashala\b/gi, "वैद्यशाला").replace(/\bAyurveda\b/gi, "आयुर्वेद");

const sarvamApiKey = process.env.SARVAM_API_KEY || "sk_pc8ip2ij_WQJjqJpiz7lK706nQALs8mXw";

const sarvamRequest = (text: string, signal: AbortSignal) =>
  fetch("https://api.sarvam.ai/text-to-speech/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": sarvamApiKey,
    },
    body: JSON.stringify({
      text: sayable(text),
      target_language_code: spokenLanguage(text),
      speaker: "priya",
      model: "bulbul:v3",
      pace: 0.88,
      speech_sample_rate: 24000,
    }),
    signal,
  });

const streamFromSarvam = async (text: string, res: Response, signal: AbortSignal): Promise<boolean> => {
  if (!sarvamApiKey) return false;
  try {
    const upstream = await sarvamRequest(text, signal);
    if (!upstream.ok || !upstream.body) return false;

    res.type("audio/mpeg").set("Cache-Control", "no-store");
    const reader = upstream.body.getReader();
    const parts: Buffer[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      parts.push(chunk);
      res.write(chunk);
    }
    res.end();
    if (text.length <= 300) remember(text, Buffer.concat(parts));
    return true;
  } catch (error: any) {
    if (signal.aborted) {
      res.destroy();
      return true;
    }
    logger.warn(`Sarvam TTS failed, will try OpenAI TTS fallback: ${error?.message}`);
    return false;
  }
};

const ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

const streamFromElevenLabs = async (text: string, res: Response, signal: AbortSignal): Promise<boolean> => {
  const key = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!key) return false;
  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": key,
      },
      body: JSON.stringify({
        text: sayable(text).slice(0, 1200),
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.55, similarity_boost: 0.78, style: 0.35, use_speaker_boost: true },
      }),
      signal,
    });
    if (!upstream.ok || !upstream.body) {
      logger.warn(`ElevenLabs TTS failed (${upstream.status})`);
      return false;
    }

    res.type("audio/mpeg").set("Cache-Control", "no-store");
    const reader = upstream.body.getReader();
    const parts: Buffer[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      parts.push(chunk);
      res.write(chunk);
    }
    res.end();
    if (text.length <= 300) remember(text, Buffer.concat(parts));
    return true;
  } catch (error: any) {
    if (signal.aborted) {
      res.destroy();
      return true;
    }
    logger.warn(`ElevenLabs TTS error: ${error?.message}`);
    return false;
  }
};

const streamOpenAISpeech = async (text: string, res: Response, signal: AbortSignal) => {
  const client = getOpenAI();
  if (!client) throw ApiError.badRequest("No TTS voice service available");
  try {
    const upstream = await client.audio.speech.create(
      {
        model: "gpt-4o-mini-tts",
        voice: "coral",
        speed: 0.88,
        instructions: VOICE_STYLE,
        input: sayable(text),
        response_format: "mp3",
      },
      { signal }
    );
    res.type("audio/mpeg").set("Cache-Control", "no-store");
    const parts: Buffer[] = [];
    const reader = upstream.body?.getReader();
    if (!reader) throw new Error("No audio returned");
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      parts.push(chunk);
      res.write(chunk);
    }
    res.end();
    if (text.length <= 300) remember(text, Buffer.concat(parts));
  } catch (error: any) {
    if (signal.aborted) {
      res.destroy();
      return;
    }
    if (!res.headersSent) throw new ApiError(502, "The voice could not be generated right now");
    logger.error(`OpenAI voice failed: ${error?.message}`);
    res.destroy();
  }
};

export const streamSpeech = async (text: string, res: Response) => {
  const cached = clips.get(text);
  if (cached) {
    res.type("audio/mpeg").set("Cache-Control", "no-store").send(cached);
    return;
  }
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 60000);
  res.on("close", () => abort.abort());
  try {
    // Try ElevenLabs first (active sweet female multilingual voice), then Sarvam, then OpenAI
    if (await streamFromElevenLabs(text, res, abort.signal)) return;
    if (res.headersSent) return;
    if (await streamFromSarvam(text, res, abort.signal)) return;
    if (res.headersSent) return;
    // OpenAI fallback
    await streamOpenAISpeech(text, res, abort.signal);
  } finally {
    clearTimeout(timer);
  }
};

// POST /api/chat/speak { text } — MP3 audio
export const speakText = asyncHandler(async (req: Request, res: Response) => {
  const spoken = forSpeech(String(req.body.text || ""));
  if (!spoken) throw ApiError.badRequest("Nothing to read out");
  await streamSpeech(await forVoice(spoken), res);
});

type Recording = { buffer: Buffer; mimetype: string };

const transcribeWithSarvam = async ({ buffer, mimetype }: Recording, timeoutMs = 5000): Promise<{ text: string } | null> => {
  if (!sarvamApiKey || !buffer.length) return null;
  const ext = /wav/.test(mimetype) ? "wav" : /mp4|m4a|aac/.test(mimetype) ? "m4a" : /mpeg|mp3/.test(mimetype) ? "mp3" : /ogg/.test(mimetype) ? "ogg" : "webm";
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(buffer)], { type: mimetype || "audio/wav" }), `speech.${ext}`);
  form.set("model", "saarika:v2");
  form.set("language_code", "unknown");
  try {
    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": sarvamApiKey },
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { transcript?: string };
    return { text: String(body.transcript || "").trim() };
  } catch (error: any) {
    logger.warn(`Sarvam STT failed: ${error?.message}`);
    return null;
  }
};

const deepgramApiKey = process.env.DEEPGRAM_API_KEY || "66b0aedc277c72dd9ffe720178ad01d668515cfd";

const transcribeWithDeepgram = async ({ buffer, mimetype }: Recording): Promise<string | null> => {
  if (!deepgramApiKey) return null;
  const params = new URLSearchParams({
    model: "nova-3",
    language: "hi",
    smart_format: "true",
    punctuate: "true",
  });
  try {
    const upstream = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: "POST",
      headers: { Authorization: `Token ${deepgramApiKey}`, "Content-Type": mimetype || "audio/webm" },
      body: new Uint8Array(buffer),
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) return null;
    const body = (await upstream.json()) as {
      results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
    };
    return String(body.results?.channels?.[0]?.alternatives?.[0]?.transcript || "").trim();
  } catch (error: any) {
    logger.warn(`Deepgram STT failed: ${error?.message}`);
    return null;
  }
};

const transcribeWithOpenAI = async ({ buffer, mimetype }: Recording): Promise<string> => {
  const client = getOpenAI();
  if (!client) throw new ApiError(503, "Voice input is not available right now");
  const ext = /mp4|m4a|aac/.test(mimetype) ? "m4a" : /mpeg|mp3/.test(mimetype) ? "mp3" : /ogg/.test(mimetype) ? "ogg" : /wav/.test(mimetype) ? "wav" : "webm";
  try {
    const result = await client.audio.transcriptions.create(
      {
        file: await toFile(buffer, `speech.${ext}`, { type: mimetype }),
        model: "whisper-1",
        prompt: "Vaidhyashala Ayurvedic Clinic and Panchakarma Centre: consultations, panchakarma therapies, Vata, Pitta, Kapha, shirodhara, abhyanga, herbal treatments, appointments.",
      },
      { timeout: 30000 }
    );
    return String((result as { text?: string }).text || "").trim();
  } catch (error: any) {
    logger.error(`OpenAI transcription failed: ${error?.message}`);
    throw new ApiError(502, "Sorry, the recording could not be understood. Please try again or type your message.");
  }
};

// POST /api/chat/transcribe
export const transcribeAudio = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file?.buffer?.length) throw ApiError.badRequest("No recording received");
  const recording = { buffer: file.buffer, mimetype: file.mimetype };
  const heard = (await transcribeWithSarvam(recording, 6000))?.text || ((await transcribeWithDeepgram(recording)) ?? (await transcribeWithOpenAI(recording)));
  const text = await fromSpeech(heard);
  res.status(200).json(ApiResponse.ok("Transcribed", { text }));
});
