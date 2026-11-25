import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import Chat from "../../models/chat/Chat.model";
import ChatBlock from "../../models/chat/ChatBlock.model";
import Otp from "../../models/contact/otp.model";
import ContactEnquiry from "../../models/contact/contactEnquiry.model";
import asyncHandler from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { logger } from "../../utils/logger";
import { env } from "../../config/env";
import { otpProofRequired } from "../../utils/otpProof";
import { sendWhatsAppTemplate } from "../../services/whatsapp.service";
import { buildInstructions, FALLBACK_REPLY, NO_ANSWER_MARKER, KNOWLEDGE, CONTACT } from "./chat.prompt";
import { CREATOR_ATTRIBUTION } from "./creatorGuard";
import { callAvailable, openCall, endCall, isLive, callInstructions, isRealName } from "./chat.call";
import { placeOutboundCall, type OutboundCallResult } from "./chat.outbound";
import { getBotContext, getOpenAI, routingFor } from "../chatbot/chatbot.service";
import { notifyAssignment, routeEnquiry } from "./enquiryRouting.service";
import ChatbotConfig from "../../models/chat/ChatbotConfig.model";
import { toTenDigitMobile } from "./chat.schema";

const HISTORY_LIMIT = 10;
const WHATSAPP_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_ENQUIRY_MS = 24 * 60 * 60 * 1000;
const CHATBOT_SERVICE = "Chatbot (Salu)";
const NO_QUESTION_PREFIX = "Started a chat with Salu on";
const DAY_MS = 24 * 60 * 60 * 1000;
const STRIKES_TO_BLOCK = 3;
const STRIKE_BLOCK_MS = 24 * 60 * 60 * 1000;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The visitor's IP and browser; a chat is saved as "Visitor <ip>" until the mobile number is verified */
const visitorOf = (req: Request) => {
  const raw = String(req.ip || req.socket.remoteAddress || "").replace(/^::ffff:/, "");
  const ip = raw === "::1" ? "127.0.0.1" : raw || "unknown";
  return {
    visitorName: `Visitor ${ip}`,
    visitor: { ip, userAgent: String(req.get("user-agent") || "").slice(0, 300) },
  };
};

const blockOf = async (ip: string) => {
  const block = await ChatBlock.findOne({ ip });
  if (!block) return null;
  if (block.manual) return { reason: block.reason || "Blocked by team", manual: true, leftMs: null };
  if (block.blockedUntil && block.blockedUntil.getTime() > Date.now()) {
    return { reason: block.reason || "Temporary block", manual: false, leftMs: block.blockedUntil.getTime() - Date.now() };
  }
  return null;
};

// POST /api/chat/abuse — records abusive strikes, 3 strikes block the IP for 24 hours
export const reportAbuse = asyncHandler(async (req: Request, res: Response) => {
  const { visitor } = visitorOf(req);
  const block = (await ChatBlock.findOne({ ip: visitor.ip })) || new ChatBlock({ ip: visitor.ip });
  if (block.blockedUntil && block.blockedUntil.getTime() > Date.now()) {
    res.status(200).json(ApiResponse.ok("Blocked", { blocked: true, blockedFor: block.manual ? null : block.blockedUntil.getTime() - Date.now(), strikes: STRIKES_TO_BLOCK }));
    return;
  }
  block.strikes = (block.strikes || 0) + 1;
  let blocked = false;
  if (block.strikes >= STRIKES_TO_BLOCK) {
    block.blockedUntil = new Date(Date.now() + STRIKE_BLOCK_MS);
    block.manual = false;
    block.reason = "Abusive messages";
    block.strikes = 0;
    blocked = true;
    await Chat.updateMany({ "visitor.ip": visitor.ip }, { $set: { blocked: true } });
  }
  await block.save();
  res.status(200).json(ApiResponse.ok(blocked ? "Blocked" : "Warning", { blocked, blockedFor: blocked ? STRIKE_BLOCK_MS : 0, strikes: block.strikes }));
});

// POST /api/chat/track — saves what a visitor does before the details form (topic / option
// clicks, scripted replies, a waiting question) and the 👍 / 👎 feedback, under the visitor's IP
export const trackChat = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.body.sessionId).trim();
  const pageUrl = req.body.pageUrl ? String(req.body.pageUrl).slice(0, 500) : "";
  const messages: { role: "user" | "assistant"; content: string }[] = req.body.messages || [];
  const { visitorName, visitor } = visitorOf(req);
  const now = Date.now();

  await Chat.updateOne(
    { sessionId },
    {
      $setOnInsert: { visitorName },
      $set: {
        visitor,
        ...(pageUrl ? { pageUrl } : {}),
        ...(req.body.feedback ? { feedback: req.body.feedback } : {}),
      },
      ...(messages.length
        ? { $push: { messages: { $each: messages.map((m, i) => ({ ...m, createdAt: new Date(now + i) })) } } }
        : {}),
    },
    { upsert: true }
  );

  res.status(200).json(ApiResponse.ok("Saved", null));
});

type ChatRequest = { type: string; stallSize?: string; company?: string; preferredTime?: string };

/** One line for the WhatsApp templates: "Chat enquiry", "Stall quotation – 9 sqm (Acme)", "Callback – Morning" */
const describeEnquiry = (request: ChatRequest | null): string => {
  if (!request) return "Chat enquiry";
  const parts =
    request.type === "sales-callback"
      ? ["Callback request", request.stallSize, request.preferredTime]
      : ["Stall quotation", request.stallSize, request.company];
  return parts.filter(Boolean).join(" – ");
};

/**
 * Sent once the mobile number is verified with the WhatsApp OTP: a confirmation with the
 * visitor's details to the visitor, plus an enquiry copy to the admin number.
 * Template variables — visitor: {{1}} name, {{2}} mobile, {{3}} enquiry;
 * admin: {{1}} name, {{2}} mobile, {{3}} enquiry, {{4}} page.
 * A plain chat start notifies at most once per number per 24 hours; quotation and callback
 * requests always notify.
 */
const notifyOnWhatsApp = async (
  sessionId: string,
  lead: { name: string; phone: string },
  pageUrl: string,
  request: ChatRequest | null
) => {
  if (!request) {
    const recentlySent = await Chat.exists({
      "lead.phone": lead.phone,
      whatsappSentAt: { $gte: new Date(Date.now() - WHATSAPP_COOLDOWN_MS) },
    });
    if (recentlySent) return;
  }

  const userCampaign = process.env.AISENSY_CAMPAIGN_CHAT_USER;
  const adminCampaign = process.env.AISENSY_CAMPAIGN_CHAT_ADMIN;
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!userCampaign) logger.warn("Chatbot WhatsApp to visitor skipped: AISENSY_CAMPAIGN_CHAT_USER is not set");
  if (!adminCampaign || !adminNumber) {
    logger.warn("Chatbot WhatsApp to admin skipped: AISENSY_CAMPAIGN_CHAT_ADMIN or ADMIN_WHATSAPP_NUMBER is not set");
  }

  const enquiry = describeEnquiry(request);
  const [userSent] = await Promise.all([
    userCampaign
      ? sendWhatsAppTemplate({
          campaignName: userCampaign,
          phone: lead.phone,
          userName: lead.name,
          templateParams: [lead.name, `+91 ${lead.phone}`, enquiry],
          source: "website-chatbot",
        })
      : Promise.resolve(false),
    adminCampaign && adminNumber
      ? sendWhatsAppTemplate({
          campaignName: adminCampaign,
          phone: adminNumber,
          userName: "Admin",
          templateParams: [lead.name, `+91 ${lead.phone}`, enquiry, pageUrl || "Website"],
          source: "website-chatbot-admin",
        })
      : Promise.resolve(false),
  ]);

  if (userSent) {
    await Chat.updateOne({ sessionId }, { $set: { whatsappSentAt: new Date() } });
  }
};

/**
 * Sends a quotation / callback request to the team set in the Manager's Forms & Routing, with its
 * priority and a first follow-up due by the form's response target. Notification Settings (once
 * saved) pick the team and, for an enquiry nobody owns yet, the employee.
 */
const routeRequest = async (sessionId: string, lead: { name: string; phone: string }, request: ChatRequest) => {
  const route = await routingFor(request.type);
  const routed = await Chat.findOne({ sessionId }).select("workflow.status workflow.assignedTo").lean<any>();
  const reopen = !routed?.workflow?.status || routed.workflow.status === "Resolved";
  const owner = routed?.workflow?.assignedTo || "Unassigned";
  const rule = await routeEnquiry({ text: `stall booking ${request.type.replace(/-/g, " ")}`, phone: lead.phone, chatId: routed?._id });
  const team = rule?.team || route.team;
  const assign = reopen && owner === "Unassigned" && rule && rule.owner !== "Unassigned" ? rule.owner : null;
  await Chat.updateOne(
    { sessionId },
    {
      $set: {
        "workflow.team": team,
        "workflow.priority": route.priority,
        "workflow.followUpKind": "date",
        "workflow.followUpAt": route.followUpAt,
        "workflow.updatedAt": new Date(),
        ...(rule?.rule ? { "workflow.rule": rule.rule } : {}),
        ...(reopen ? { "workflow.status": assign ? "Assigned" : "New", "workflow.assignedTo": assign || owner } : {}),
      },
      $unset: { "workflow.resolvedAt": "", "workflow.escalatedAt": "" },
      $push: {
        "workflow.activity": {
          $each: [
            { kind: "event", text: `${route.form} from the website — routed to ${team} (${route.priority}, reply within ${route.target})`, by: "Organic Mitra", at: new Date() },
            ...(assign ? [{ kind: "event", text: `Assigned to ${assign} (${rule?.note})`, by: "Notification Settings", at: new Date() }] : []),
          ],
          $slice: -200,
        },
      },
    },
    { timestamps: false }
  );
  if (assign) notifyAssignment(assign, { name: lead.name, phone: lead.phone, topic: rule?.rule || route.form }, { sessionId }).catch(() => {});
};

/** Must match LEAD_OTP_PROFILE in the website's chat panel */
export const CHAT_LEAD_OTP_PROFILE = "CHAT_LEAD";

// POST /api/chat/lead — visitor details collected before the chat starts
export const startChat = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.body.sessionId).trim();
  const pageUrl = String(req.body.pageUrl || "").slice(0, 500);
  const lead = {
    name: String(req.body.name).trim().replace(/\s+/g, " "),
    phone: toTenDigitMobile(String(req.body.phone)),
    ...(req.body.email ? { email: String(req.body.email).trim().toLowerCase() } : {}),
  };
  const request = req.body.enquiryType
    ? {
        type: req.body.enquiryType,
        stallSize: req.body.stallSize || undefined,
        company: req.body.company || undefined,
        preferredTime: req.body.preferredTime || undefined,
      }
    : null;

  const existing = await Chat.findOne({ sessionId }).select("enquiryId lead.phone phoneVerifiedAt").lean();

  // The details, quotation and callback forms prove the visitor owns this number with a WhatsApp
  // OTP, verified in the browser; here the server confirms (and consumes) the verified record.
  // Not asked again when this chat already has the same number. Only when otpProofRequired()
  // (see otpProof.ts).
  // A number only typed in the chat (not verified) still needs the OTP proof
  const newNumber = existing?.lead?.phone !== lead.phone || !existing?.phoneVerifiedAt;
  // Used up only after the lead is saved, so a retry after a failed save still works
  const proof = newNumber ? await Otp.findOne({ phone: lead.phone, isVerified: true, profile: CHAT_LEAD_OTP_PROFILE }).select("_id").lean() : null;
  if (newNumber) {
    if (!proof && otpProofRequired()) {
      throw ApiError.badRequest("Please verify your mobile number with the WhatsApp OTP.");
    }
  }
  const { visitorName, visitor } = visitorOf(req);

  // Shows up in the admin panel's Contact Enquiries list. The same phone number within
  // 24 hours (e.g. a new chat after the old one expired) reuses its enquiry instead of a duplicate.
  let enquiryId = existing?.enquiryId;
  if (!enquiryId) {
    const recent = await ContactEnquiry.findOne({
      phone: lead.phone,
      service: CHATBOT_SERVICE,
      createdAt: { $gte: new Date(Date.now() - DUPLICATE_ENQUIRY_MS) },
    })
      .sort({ createdAt: -1 })
      .select("_id")
      .lean();
    enquiryId = recent?._id;
  }
  if (!enquiryId) {
    const enquiry = await ContactEnquiry.create({
      ...lead,
      subject: "Chatbot enquiry",
      service: CHATBOT_SERVICE,
      message: `${NO_QUESTION_PREFIX} ${pageUrl || "the website"}.`,
    });
    enquiryId = enquiry._id;
  }

  await Chat.updateOne(
    { sessionId },
    {
      $set: { lead, pageUrl, enquiryId, visitor, ...(newNumber ? { phoneVerifiedAt: new Date() } : {}) },
      $setOnInsert: { visitorName },
      ...(request ? { $push: { requests: request } } : {}),
    },
    { upsert: true }
  );
  if (proof) await Otp.deleteOne({ _id: proof._id });

  // A quotation / callback request goes to the team set in the Manager's Forms & Routing
  if (request) await routeRequest(sessionId, lead, request);

  notifyOnWhatsApp(sessionId, lead, pageUrl, request).catch((error) =>
    logger.warn(`Chatbot WhatsApp notification failed: ${error?.message}`)
  );

  res.status(201).json(ApiResponse.created("Chat started", { sessionId }));
});

/** How far back a returning visitor's chat (same IP + same name) is picked up again */
const RESUME_WITHIN_DAYS = 90;
/** Messages sent back to show the earlier conversation */
const RESTORE_MESSAGES = 40;

const isKnownName = (name?: string | null): boolean => {
  if (!name) return false;
  const n = name.trim();
  if (!n || n.length < 2) return false;
  const lower = n.toLowerCase();
  return lower !== "visitor" && lower !== "null" && lower !== "undefined" && lower !== "unknown";
};

// POST /api/chat/start — the name the visitor types first. The chat is saved under that name; if the
// same IP chatted under the same name before (and that chat has no verified number from another
// device), that chat continues and its messages are returned to show again.
export const startByName = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.body.sessionId).trim();
  const pageUrl = String(req.body.pageUrl || "").slice(0, 500);
  const name = String(req.body.name).trim().replace(/\s+/g, " ");
  const salutation = req.body.salutation ? String(req.body.salutation).trim().slice(0, 40) : undefined;
  const { visitor } = visitorOf(req);

  const current = await Chat.findOne({ sessionId }).select("lead messages").lean<any>();
  let target = sessionId;
  let resumed = false;
  const validName = isKnownName(name) ? name : "";

  // A page reload of the same chat keeps it; otherwise look for this visitor's earlier chat
  if (validName) {
    const sameChat = current?.lead?.name && current.lead.name.toLowerCase() === validName.toLowerCase();
    if (!sameChat && !current?.lead?.phone) {
      const previous = await Chat.findOne({
        sessionId: { $ne: sessionId },
        source: { $ne: "manual" },
        "visitor.ip": visitor.ip,
        "lead.name": { $regex: `^${escapeRegex(validName)}$`, $options: "i" },
        "workflow.spam": { $ne: true },
        updatedAt: { $gte: new Date(Date.now() - RESUME_WITHIN_DAYS * DAY_MS) },
      })
        .sort({ updatedAt: -1 })
        .select("sessionId")
        .lean<any>();
      if (previous) {
        target = previous.sessionId;
        resumed = true;
        // Anything this browser saved before the name was given joins the earlier chat
        if (current?.messages?.length) await Chat.updateOne({ sessionId: target }, { $push: { messages: { $each: current.messages } } });
        if (current) await Chat.deleteOne({ sessionId });
      }
    }
  }

  await Chat.updateOne(
    { sessionId: target },
    {
      $set: {
        ...(validName ? { "lead.name": validName, visitorName: validName } : {}),
        ...(salutation && validName ? { "lead.salutation": salutation } : {}),
        visitor,
        ...(pageUrl ? { pageUrl } : {}),
      },
    },
    { upsert: true }
  );

  const chat = await Chat.findOne({ sessionId: target }).select({ messages: { $slice: -RESTORE_MESSAGES } }).lean<any>();
  const messages = (chat?.messages || []).map((m: { role: string; content: string; createdAt?: Date }) => ({
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  }));

  res.status(200).json(ApiResponse.ok(resumed ? "Welcome back" : "Chat started", { sessionId: target, name: validName, resumed, messages }));
});

// ─── Contact details typed in the chat ───────────────────────────────────────

/** "Call me" / "mujhe call karo" / "baat karni hai" / "फोन करें" … */
const CALL_INTENT = /\b(call|calls|callback|ring|phone|contact me|baat|sampark)\b|कॉल|फोन|फ़ोन|बात|संपर्क/i;
const MOBILE_IN_TEXT = /(?<!\d)(?:\+?91[\s-]?|0)?([6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}|[6-9]\d{4}[\s-]?\d{5})(?!\d)/;
const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/** A 10-digit mobile number and / or an email found in the visitor's message */
const contactIn = (text: string) => {
  const mobile = text.match(MOBILE_IN_TEXT)?.[1]?.replace(/\D/g, "");
  const email = text.match(EMAIL_IN_TEXT)?.[0]?.toLowerCase();
  return {
    phone: mobile && /^[6-9]\d{9}$/.test(mobile) ? mobile : undefined,
    email: email && email.length <= 100 ? email : undefined,
  };
};

/**
 * Saves a mobile number / email the visitor typed in the chat on the chat and on its enquiry
 * (Contact Enquiries), and logs it for Inbox & Leads. A number given after asking for a call
 * becomes a callback request routed to the team. Typed numbers are not OTP-verified.
 */
const saveTypedContact = async (o: {
  sessionId: string;
  chat: any;
  phone?: string;
  email?: string;
  question: string;
  wantsCall: boolean;
  visitor: { ip: string; userAgent: string };
}) => {
  const name = o.chat?.lead?.name || "Website visitor";
  const phone = o.phone || o.chat?.lead?.phone || "";
  const email = o.email || o.chat?.lead?.email || "";
  const summary = o.wantsCall && o.phone ? "Asked for a call back in the chat" : "Shared contact details in the chat";

  let enquiryId = o.chat?.enquiryId;
  if (!enquiryId && phone) {
    const recent = await ContactEnquiry.findOne({ phone, service: CHATBOT_SERVICE, createdAt: { $gte: new Date(Date.now() - DUPLICATE_ENQUIRY_MS) } })
      .sort({ createdAt: -1 })
      .select("_id")
      .lean();
    enquiryId = recent?._id;
  }
  if (enquiryId) {
    await ContactEnquiry.updateOne(
      { _id: enquiryId },
      { $set: { name, ...(phone ? { phone } : {}), ...(email ? { email } : {}), ...(o.wantsCall && o.phone ? { subject: "Chatbot callback request" } : {}) } }
    );
  } else {
    const enquiry = await ContactEnquiry.create({
      name,
      phone,
      email,
      subject: o.wantsCall && o.phone ? "Chatbot callback request" : "Chatbot enquiry",
      service: CHATBOT_SERVICE,
      message: `${summary}: ${o.question}`.slice(0, 1000),
    });
    enquiryId = enquiry._id;
  }

  const shared = [o.phone && `mobile +91 ${o.phone}`, o.email && `email ${o.email}`].filter(Boolean).join(" and ");
  await Chat.updateOne(
    { sessionId: o.sessionId },
    {
      $set: {
        enquiryId,
        visitor: o.visitor,
        ...(o.phone ? { "lead.phone": o.phone } : {}),
        ...(o.email ? { "lead.email": o.email } : {}),
        // Shown in Inbox & Leads as a new lead until the team picks it up
        ...(!o.chat?.workflow?.status ? { "workflow.status": "New" } : {}),
        "workflow.updatedAt": new Date(),
      },
      // A different number than the one verified with the OTP is not verified
      ...(o.phone ? { $unset: { phoneVerifiedAt: "" } } : {}),
      $push: {
        "workflow.activity": { $each: [{ kind: "event", text: `Visitor shared ${shared} in the chat (not verified)`, by: "Organic Mitra", at: new Date() }], $slice: -200 },
        ...(o.wantsCall && o.phone ? { requests: { type: "sales-callback" } } : {}),
      },
      $setOnInsert: { visitorName: name },
    },
    { upsert: true }
  );

  if (o.wantsCall && o.phone) await routeRequest(o.sessionId, { name, phone: o.phone }, { type: "sales-callback" });
};

export const CHAT_HISTORY_OTP_PROFILE = "CHAT_HISTORY";
const HISTORY_RESULTS = 5;

// POST /api/chat/history — a returning visitor's previous chats, only after OTP verification
export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const phone = req.body.phone ? toTenDigitMobile(String(req.body.phone)) : "";
  const email = phone ? "" : String(req.body.email || "").trim().toLowerCase();

  // The OTP is verified in the browser; here the server confirms (and consumes) the verified
  // record so nobody can read someone else's chats by just posting a number. Outside production
  // the dev master OTP verifies without a record, so the check is skipped there.
  const proof = await Otp.findOneAndDelete({
    ...(phone ? { phone } : { email }),
    isVerified: true,
    profile: CHAT_HISTORY_OTP_PROFILE,
  });
  if (!proof && env.NODE_ENV === "production") {
    throw ApiError.badRequest("Please verify with OTP to view your previous enquiry.");
  }

  // Enquiries the team added by hand are internal records, not the visitor's own chats
  const chats = await Chat.find({ ...(phone ? { "lead.phone": phone } : { "lead.email": email }), source: { $ne: "manual" } })
    .sort({ updatedAt: -1 })
    .limit(HISTORY_RESULTS)
    .select("lead.name requests messages createdAt updatedAt")
    .lean();

  // Session ids stay private: they would let anyone continue the chat as this visitor
  const history = chats.map((chat) => ({
    name: chat.lead?.name || "",
    startedAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    requests: (chat.requests || []).map(({ type, stallSize, preferredTime, createdAt }) => ({ type, stallSize, preferredTime, createdAt })),
    question: chat.messages?.find((m) => m.role === "user")?.content?.slice(0, 200) || "",
    messageCount: chat.messages?.length || 0,
  }));

  res.status(200).json(ApiResponse.ok("Previous chats", history));
});

/** AI questions a visitor may ask before sharing name + mobile (same as the website FREE_QUESTIONS) */
const FREE_AI_QUESTIONS = 3;

// POST /api/chat — streams the assistant reply as Server-Sent Events
export const sendChatMessage = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.body.sessionId).trim();
  const message = String(req.body.message).trim().slice(0, 1000);
  const pageUrl = req.body.pageUrl ? String(req.body.pageUrl).slice(0, 500) : undefined;

  const { visitorName, visitor } = visitorOf(req);

  // Check if IP is blocked due to abuse
  const block = await blockOf(visitor.ip);
  if (block) {
    res.status(403).json({ success: false, code: "BLOCKED", message: block.reason, leftMs: block.leftMs });
    return;
  }

  // Visitors chat freely: until the mobile number is verified the chat is saved as "Visitor <ip>"
  const chat = await Chat.findOne({ sessionId })
    .select({ lead: 1, enquiryId: 1, aiQuestions: 1, "workflow.status": 1, messages: { $slice: -HISTORY_LIMIT } })
    .lean<any>();

  // A visitor who gave their name (asked first in the chat) chats freely. Older chats without a
  // name get a few free questions; after that the website asks for name + mobile (OTP) first.
  if (!chat?.lead?.phone && !chat?.lead?.name && (chat?.aiQuestions || 0) >= FREE_AI_QUESTIONS) {
    res.status(403).json({ success: false, code: "DETAILS_REQUIRED", message: "Please share your name and mobile number to continue the chat." });
    return;
  }
  const { ctx, settings } = await getBotContext("live");
  if (settings.enabled === false) {
    throw new ApiError(503, "The chat assistant is switched off right now.");
  }

  // A question already saved by trackChat (asked just before) is not saved or sent twice
  const history = chat?.messages || [];
  const last = history[history.length - 1];
  const alreadySaved = last?.role === "user" && last.content.trim() === message;
  const context = alreadySaved ? history.slice(0, -1) : history;

  // A mobile number / email typed in this message is saved on the enquiry before the reply, so
  // the assistant can confirm it. A number counts as a callback request when the visitor asked
  // for a call in this or their last few messages.
  const found = contactIn(message);
  const newPhone = found.phone && found.phone !== chat?.lead?.phone ? found.phone : undefined;
  const newEmail = found.email && found.email !== chat?.lead?.email ? found.email : undefined;
  const recentAsks = [...context.filter((m: { role: string }) => m.role === "user").slice(-3).map((m: { content: string }) => m.content), message].join(" \n ");
  if (newPhone || newEmail) {
    try {
      await saveTypedContact({ sessionId, chat, phone: newPhone, email: newEmail, question: message, wantsCall: CALL_INTENT.test(recentAsks), visitor });
    } catch (error: any) {
      logger.error(`Could not save contact details for chat ${sessionId}: ${error?.message}`);
    }
  }
  const contact = {
    phone: newPhone || chat?.lead?.phone,
    email: newEmail || chat?.lead?.email,
    saved: [...(newPhone ? ["phone" as const] : []), ...(newEmail ? ["email" as const] : [])],
  };

  let outboundCallResult: OutboundCallResult | null = null;
  const wantsCallNow = CALL_INTENT.test(message) || (Boolean(newPhone) && CALL_INTENT.test(recentAsks));
  if (wantsCallNow && contact.phone) {
    outboundCallResult = await placeOutboundCall({
      phone: contact.phone,
      visitorName: chat?.lead?.name,
      sessionId,
      reason: message,
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: Record<string, unknown>) => {
    if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Stop paying for tokens nobody will read
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  // The model ends an unanswerable reply with NO_ANSWER_MARKER. Text that could be the start of
  // the marker is held back until it is clear, so the visitor never sees it.
  let reply = "";
  let sent = 0;
  const flush = (final: boolean) => {
    const clean = reply.split(NO_ANSWER_MARKER).join("");
    let safe = clean.length;
    if (!final) {
      for (let k = Math.min(NO_ANSWER_MARKER.length - 1, clean.length); k > 0; k--) {
        if (NO_ANSWER_MARKER.startsWith(clean.slice(-k))) {
          safe = clean.length - k;
          break;
        }
      }
    }
    if (safe > sent) {
      send({ delta: clean.slice(sent, safe) });
      sent = safe;
    }
  };

  try {
    let aiSucceeded = false;
    const client = getOpenAI();
    let instructions = buildInstructions(chat?.lead?.name || undefined, ctx, contact);
    if (outboundCallResult?.ok) {
      instructions += `\n\nOUTBOUND CALL STATUS: An automated AI phone call from Vaidhya Mitra has JUST BEEN PLACED to ${contact.phone}. Inform the visitor warmly that their phone is ringing right now and to please pick up!`;
    } else if (outboundCallResult && !outboundCallResult.configured) {
      instructions += `\n\nOUTBOUND CALL STATUS: Live automated phone dialing (Twilio/telephony trunk) is not yet configured on the server, so DO NOT pretend their phone is ringing right now. Confirm that their number (${contact.phone}) is saved and our Vaidhyashala clinic team will call them back shortly, or they can talk live right here using the "वॉइस कॉल" button.`;
    }

    // 1. Try OpenAI streaming first
    if (client) {
      try {
        const model = env.OPENAI_MODEL;
        const stream = await client.responses.create(
          {
            model,
            instructions,
            input: [
              ...context.map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content })),
              { role: "user" as const, content: message },
            ],
            max_output_tokens: 800,
            ...(/^(gpt-5|o\d)/.test(model) ? { reasoning: { effort: "low" as const } } : {}),
            stream: true,
          },
          { signal: controller.signal }
        );

        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            reply += event.delta;
            flush(false);
          } else if (event.type === "response.failed" || event.type === "error") {
            throw new Error(`OpenAI stream failed: ${JSON.stringify(event)}`);
          }
        }
        aiSucceeded = true;
      } catch (openAiErr: any) {
        logger.warn(`OpenAI streaming failed: ${openAiErr.message}. Attempting Gemini fallback...`);
      }
    }

    // 2. Gemini fallback if OpenAI was unavailable or failed
    if (!aiSucceeded && !controller.signal.aborted) {
      const geminiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (geminiKey) {
        const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"];
        for (const m of models) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse&key=${encodeURIComponent(geminiKey)}`;
            const contents = [
              ...context.map((m: { role: "user" | "assistant"; content: string }) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
              })),
              { role: "user", parts: [{ text: message }] },
            ];

            const gRes = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: instructions }] },
                contents,
                generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
              }),
              signal: controller.signal,
            });

            if (gRes.ok && gRes.body) {
              const reader = gRes.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const raw = line.slice(6).trim();
                    if (!raw) continue;
                    try {
                      const data = JSON.parse(raw);
                      const deltaText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (deltaText) {
                        reply += deltaText;
                        flush(false);
                      }
                    } catch {
                      // ignore parse errors
                    }
                  }
                }
              }
              aiSucceeded = true;
              break;
            }
          } catch (gErr: any) {
            logger.warn(`Gemini ${m} stream attempt failed: ${gErr.message}`);
          }
        }
      }
    }

    // 3. Smart local Ayurvedic fallback if all external AI keys are out of credits
    if (!aiSucceeded && !reply) {
      const q = message.toLowerCase();
      if (/kisne banaya|created you|made you|developed|developer|rohit/i.test(q)) {
        reply = CREATOR_ATTRIBUTION.hi;
      } else if (/address|pata|location|kahan|timing|time|kab|open|hours|clinic|पता|समय/i.test(q)) {
        reply = `हमारा वैद्यशाला क्लिनिक **${CONTACT.address}** पर स्थित है। समय: **${CONTACT.hours}**। आप अपॉइंटमेंट के लिए **${CONTACT.phone}** या **${CONTACT.alternatePhone}** पर कॉल/व्हाट्सएप कर सकते हैं।`;
      } else if (/panchakarma|पंचकर्म|vamana|virechana|basti|nasya|shirodhara/i.test(q)) {
        reply = `वैद्यशाला में शास्त्रीय **पंचकर्म चिकित्सा** (वमन, विरेचन, बस्ति, नस्य, रक्तमोक्षण) और शिरोधारा, अभ्यंग, कटि बस्ति जैसी विशिष्ट थैरेपीज़ उपलब्ध हैं। अधिक जानकारी के लिए [पंचकर्म पेज](${CONTACT.panchakarmaPage}) देखें या **${CONTACT.phone}** पर संपर्क करें।`;
      } else if (/consult|appointment|doctor|vaidya|book|कंसल्टेशन|डॉक्टर|अपॉइंटमेंट/i.test(q)) {
        reply = `आप हमारे अनुभवी आयुर्वेदिक डॉक्टरों (BAMS/MD) से क्लिनिक में या ऑनलाइन टेली-कंसल्टेशन बुक कर सकते हैं। कृपया अपना 10 अंकों का मोबाइल नंबर यहाँ साझा करें या [कंसल्टेशन पेज](${CONTACT.contactPage}) पर जाएँ।`;
      } else if (/product|medicine|aushadhi|herbal|दवा|औषधि/i.test(q)) {
        reply = `वैद्यशाला में प्रामाणिक आयुर्वेदिक औषधियाँ, तैल, चूर्ण और रसायन उपलब्ध हैं। आप इन्हें [प्रोडक्ट्स पेज](${CONTACT.productsPage}) पर देख सकते हैं।`;
      }
      if (!reply) reply = FALLBACK_REPLY;
      flush(true);
      send({ done: true });
    } else {
      flush(true);
      send({ done: true });
    }
  } catch (error: any) {
    if (!controller.signal.aborted) {
      logger.error(`Chatbot reply failed: ${error?.message}`);
      send({ error: FALLBACK_REPLY });
    }
  } finally {
    res.end();
  }

  // Save even a partial reply when the visitor closed the chat mid-stream
  const needsReview = reply.includes(NO_ANSWER_MARKER);
  const replyText = reply.split(NO_ANSWER_MARKER).join("").trim();
  const now = new Date();
  const toSave: { role: "user" | "assistant"; content: string; createdAt: Date; needsReview?: boolean }[] = alreadySaved
    ? []
    : [{ role: "user", content: message, createdAt: now }];
  if (replyText) toSave.push({ role: "assistant", content: replyText, createdAt: new Date(), ...(needsReview ? { needsReview } : {}) });

  try {
    await Chat.updateOne(
      { sessionId },
      {
        $push: { messages: { $each: toSave } },
        $set: { visitor, ...(pageUrl ? { pageUrl } : {}) },
        // Only an answered question uses up one of the free questions
        ...(replyText ? { $inc: { aiQuestions: 1 } } : {}),
        $setOnInsert: { visitorName },
      },
      { upsert: true }
    );
    // Put the visitor's first question on their enquiry so the team sees what they asked
    // (only while it still has no question — a reused enquiry keeps the earlier one)
    if (chat?.enquiryId) {
      await ContactEnquiry.updateOne(
        { _id: chat.enquiryId, message: { $regex: `^${NO_QUESTION_PREFIX}` } },
        { $set: { message: `Chatbot question: ${message}` } }
      );
    }
  } catch (error: any) {
    logger.error(`Could not save chat ${sessionId}: ${error?.message}`);
  }
});

// ─── Admin panel ─────────────────────────────────────────────────────────────

/** Chats started between ?from and ?to (ISO dates), optionally matching ?search. */
const buildChatFilter = (query: Request["query"]) => {
  // ?source=all also returns enquiries added by hand in Inbox & Leads
  const filter: Record<string, any> = query.source === "all" ? {} : { source: { $ne: "manual" } };
  const from = query.from ? new Date(String(query.from)) : null;
  const to = query.to ? new Date(String(query.to)) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    throw ApiError.badRequest("Invalid date range");
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }
  const search = String(query.search || "").trim().slice(0, 100);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { "lead.name": rx },
      { "lead.email": rx },
      { "lead.phone": rx },
      { visitorName: rx },
      { "visitor.ip": rx },
      { "messages.content": rx },
    ];
  }
  return filter;
};

const userMessages = { $filter: { input: "$messages", as: "m", cond: { $eq: ["$$m.role", "user"] } } };
const assistantMessages = { $filter: { input: "$messages", as: "m", cond: { $eq: ["$$m.role", "assistant"] } } };

// GET /api/admin/chats — paginated chat list (without full transcripts)
export const getRecentChats = asyncHandler(async (req: Request, res: Response) => {
  const filter = buildChatFilter(req.query);
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50));

  const [result] = await Chat.aggregate([
    { $match: filter },
    { $sort: { updatedAt: -1 } },
    {
      $facet: {
        chats: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              sessionId: 1,
              lead: 1,
              visitorName: 1,
              visitor: 1,
              phoneVerifiedAt: 1,
              feedback: 1,
              requests: 1,
              pageUrl: 1,
              enquiryId: 1,
              whatsappSentAt: 1,
              source: 1,
              manual: 1,
              workflow: 1,
              createdAt: 1,
              updatedAt: 1,
              messageCount: { $size: "$messages" },
              questionCount: { $size: userMessages },
              firstQuestion: { $arrayElemAt: [userMessages, 0] },
              lastMessage: { $arrayElemAt: ["$messages", -1] },
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const total = result?.total?.[0]?.count || 0;
  const chats: any[] = result?.chats || [];

  res.status(200).json(
    ApiResponse.ok("Chats fetched successfully", {
      chats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  );
});

// GET /api/admin/chats/stats — totals, day-wise counts, top pages and latest questions
export const getChatStats = asyncHandler(async (req: Request, res: Response) => {
  const filter = buildChatFilter(req.query);

  const [result] = await Chat.aggregate([
    { $match: filter },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              chats: { $sum: 1 },
              leads: { $sum: { $cond: [{ $ifNull: ["$lead.phone", false] }, 1, 0] } },
              questions: { $sum: { $size: userMessages } },
              replies: { $sum: { $size: { $filter: { input: "$messages", as: "m", cond: { $eq: ["$$m.role", "assistant"] } } } } },
              whatsappSent: { $sum: { $cond: [{ $ifNull: ["$whatsappSentAt", false] }, 1, 0] } },
              engaged: { $sum: { $cond: [{ $gt: [{ $size: userMessages }, 0] }, 1, 0] } },
              verifiedLeads: { $sum: { $cond: [{ $ifNull: ["$phoneVerifiedAt", false] }, 1, 0] } },
              // Quotation / callback requests: the sales team takes these over
              handovers: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$requests", []] } }, 0] }, 1, 0] } },
              feedbackYes: { $sum: { $cond: [{ $eq: ["$feedback", "yes"] }, 1, 0] } },
              feedbackNo: { $sum: { $cond: [{ $eq: ["$feedback", "no"] }, 1, 0] } },
              // Questions with no reply saved after them (AI failed, or the visitor left at the details form)
              unanswered: { $sum: { $max: [0, { $subtract: [{ $size: userMessages }, { $size: assistantMessages }] }] } },
            },
          },
        ],
        // Numbers that started more than one chat
        returning: [
          { $match: { "lead.phone": { $nin: [null, ""] } } },
          { $group: { _id: "$lead.phone", chats: { $sum: 1 } } },
          { $match: { chats: { $gt: 1 } } },
          { $count: "count" },
        ],
        popularQuestions: [
          { $unwind: "$messages" },
          { $match: { "messages.role": "user" } },
          { $group: { _id: { $toLower: { $trim: { input: "$messages.content" } } }, question: { $first: "$messages.content" }, count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $limit: 5 },
        ],
        daily: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
              chats: { $sum: 1 },
              questions: { $sum: { $size: userMessages } },
            },
          },
          { $sort: { _id: 1 } },
        ],
        topPages: [
          { $group: { _id: "$pageUrl", chats: { $sum: 1 } } },
          { $sort: { chats: -1 } },
          { $limit: 6 },
        ],
        latestQuestions: [
          { $unwind: "$messages" },
          { $match: { "messages.role": "user" } },
          { $sort: { "messages.createdAt": -1 } },
          { $limit: 8 },
          { $project: { chatId: "$_id", name: { $ifNull: ["$lead.name", "$visitorName"] }, content: "$messages.content", createdAt: "$messages.createdAt" } },
        ],
      },
    },
  ]);

  // Team follow-up: the current queue (every record, whatever the date range), spam left out
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const open = { "workflow.spam": { $ne: true }, "workflow.status": { $ne: "Resolved" } };
  // Filters on nested workflow paths (Mongoose types only know the top-level fields)
  const count = (where: Record<string, unknown>) => Chat.countDocuments(where as Record<string, never>);
  const [unassigned, overdue, dueToday, openComplaints, config] = await Promise.all([
    count({ ...open, $or: [{ "lead.phone": { $nin: [null, ""] } }, { source: "manual" }, { "requests.0": { $exists: true } }], "workflow.assignedTo": { $in: [null, "", "Unassigned"] } }),
    count({ ...open, "workflow.followUpKind": "date", "workflow.followUpAt": { $lt: now } }),
    count({ ...open, "workflow.followUpKind": "date", "workflow.followUpAt": { $gte: now, $lt: todayEnd } }),
    count({ ...open, "manual.category": "complaint" }),
    ChatbotConfig.findOne({ key: "main" }).select("versions.date updatedAt").lean<any>(),
  ]);
  const versions = config?.versions || [];
  const contentUpdatedAt = versions.length ? versions[versions.length - 1].date : null;

  res.status(200).json(
    ApiResponse.ok("Chat stats fetched successfully", {
      followUp: { unassigned, overdue, dueToday, openComplaints },
      contentUpdatedAt,
      totals: {
        ...(result?.totals?.[0] || {
          chats: 0,
          leads: 0,
          questions: 0,
          replies: 0,
          whatsappSent: 0,
          engaged: 0,
          verifiedLeads: 0,
          handovers: 0,
          feedbackYes: 0,
          feedbackNo: 0,
          unanswered: 0,
        }),
        returningVisitors: result?.returning?.[0]?.count || 0,
      },
      popularQuestions: (result?.popularQuestions || []).map((q: any) => ({ question: q.question, count: q.count })),
      daily: (result?.daily || []).map((d: any) => ({ date: d._id, chats: d.chats, questions: d.questions })),
      topPages: (result?.topPages || []).map((p: any) => ({ pageUrl: p._id || "", chats: p.chats })),
      latestQuestions: result?.latestQuestions || [],
    })
  );
});

// GET /api/admin/chats/:id — one chat with its full transcript
export const getChatById = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isValidObjectId(id)) throw ApiError.badRequest("Invalid chat id");
  const chat = await Chat.findById(id).lean();
  if (!chat) throw ApiError.notFound("Chat not found");
  res.status(200).json(ApiResponse.ok("Chat fetched successfully", chat));
});

// ─── Live Voice Call (OpenAI Realtime over WebRTC) ─────────────────────────

// POST /api/chat/call { sdp, sessionId, pageUrl, noise }
export const startCall = asyncHandler(async (req: Request, res: Response) => {
  const sdp = String(req.body.sdp || "").slice(0, 20000);
  if (!sdp) throw ApiError.badRequest("No connection offer received");
  const sessionId = String(req.body.sessionId || "").trim().slice(0, 100);
  if (!sessionId) throw ApiError.badRequest("sessionId is required");
  const pageUrl = String(req.body.pageUrl || "").slice(0, 500);
  const { visitor, visitorName } = visitorOf(req);

  const block = await blockOf(visitor.ip);
  if (block) {
    res.status(403).json({ success: false, code: "BLOCKED", message: block.reason, leftMs: block.leftMs });
    return;
  }
  if (!callAvailable()) {
    res.status(503).json({ success: false, code: "CALL_UNAVAILABLE", message: "Voice calls aren't available right now. Please type your message." });
    return;
  }

  let chat = await Chat.findOne({ sessionId }).select({ lead: 1, closed: 1, messages: { $slice: -10 } }).lean<any>();
  let target = sessionId;
  await Chat.updateOne({ sessionId: target }, { $set: { visitor, ...(pageUrl ? { pageUrl } : {}) }, $setOnInsert: { visitorName } }, { upsert: true });

  const name = chat?.lead?.name && isKnownName(chat.lead.name) ? chat.lead.name : undefined;
  const salutation = name ? chat?.lead?.salutation || undefined : undefined;
  const greeting = name
    ? `नमस्कार ${salutation || name} जी! वैद्यशाला में आपका स्वागत है। बताइए, मैं आपकी क्या सहायता करूँ?`
    : "नमस्कार! मैं शालू, आपकी आयुर्वेद साथी। वैद्यशाला में आपका स्वागत है। मैं आपको किस नाम से संबोधित करूँ? आपका शुभ नाम क्या है?";
  const earlier = ((chat?.messages || []) as any[]).map((m) => ({ role: m.role, content: m.content }));
  const instructions = callInstructions(salutation || name, {}, { phone: chat?.lead?.phone, email: chat?.lead?.email }, earlier);

  try {
    const { sdp: answer, maxSeconds } = await openCall({ sessionId: target, ip: visitor.ip, sdp, noise: req.body.noise !== false, instructions });
    res.status(200).json(ApiResponse.ok("Call started", { sdp: answer, sessionId: target, maxSeconds, name: salutation || name || "", greeting }));
  } catch (err: any) {
    logger.error(`StartCall failed: ${err?.message}`);
    res.status(503).json({ success: false, code: "CALL_UNAVAILABLE", message: "The voice call couldn't connect. Please type your message." });
  }
});

// POST /api/chat/call/turn { sessionId, role, text }
export const callTurn = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.body.sessionId || "").trim();
  const role = req.body.role === "user" ? "user" : "assistant";
  const heard = String(req.body.text || "").trim().slice(0, 3000);
  const { visitor, visitorName } = visitorOf(req);
  if (!heard || !isLive(sessionId, visitor.ip)) {
    res.status(200).json(ApiResponse.ok("Skipped", { saved: false }));
    return;
  }
  const text = heard;
  if (role === "user") {
    const found = contactIn(text);
    if (found.phone || found.email) {
      const chat = await Chat.findOne({ sessionId }).select({ lead: 1, enquiryId: 1, "workflow.status": 1, messages: { $slice: -6 } }).lean<any>();
      const newPhone = found.phone && found.phone !== chat?.lead?.phone ? found.phone : undefined;
      const newEmail = found.email && found.email !== chat?.lead?.email ? found.email : undefined;
      if (newPhone || newEmail) {
        await saveTypedContact({ sessionId, chat, phone: newPhone, email: newEmail, question: text, wantsCall: true, visitor }).catch((error: any) =>
          logger.error(`Could not save contact details from a call ${sessionId}: ${error?.message}`)
        );
      }
    }
  }
  await Chat.updateOne(
    { sessionId },
    {
      $push: { messages: { role, content: text, createdAt: new Date() } },
      $set: { visitor },
      ...(role === "assistant" ? { $inc: { aiQuestions: 1 } } : {}),
      $setOnInsert: { visitorName },
    },
    { upsert: true }
  );
  res.status(200).json(ApiResponse.ok("Saved", { saved: true, text }));
});

// POST /api/chat/call/tool { sessionId, name, args }
export const callTool = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.body.sessionId || "").trim();
  const name = String(req.body.name || "");
  const args = (req.body.args && typeof req.body.args === "object" ? req.body.args : {}) as Record<string, unknown>;
  const { visitor } = visitorOf(req);
  if (!isLive(sessionId, visitor.ip)) throw ApiError.notFound("No call going on");

  if (name === "update_visitor") {
    const saved: string[] = [];
    const said = String(args.name || "").trim().replace(/\s+/g, " ");
    const given = said && isRealName(said) ? said.slice(0, 40) : "";
    let savedName = "";
    if (given) {
      await Chat.updateOne({ sessionId }, { $set: { "lead.name": given, visitorName: given } });
      savedName = given;
      saved.push("name");
    }
    const toldSalutation = String(args.salutation || "").trim().replace(/\s+/g, " ").replace(/\s+(?:ji|jee|जी)$/iu, "");
    if (toldSalutation && isRealName(toldSalutation)) {
      await Chat.updateOne({ sessionId }, { $set: { "lead.salutation": toldSalutation } });
      saved.push("salutation");
    }
    const mobile = args.phone ? toTenDigitMobile(String(args.phone)) : "";
    const phone = /^[6-9]\d{9}$/.test(mobile) ? mobile : undefined;
    const emailRaw = String(args.email || "").trim().toLowerCase();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailRaw) && emailRaw.length <= 100 ? emailRaw : undefined;
    if (phone || email) {
      const chat = await Chat.findOne({ sessionId }).select({ lead: 1, enquiryId: 1, "workflow.status": 1 }).lean<any>();
      await saveTypedContact({ sessionId, chat, phone, email, question: "Shared in voice call with Vaidhya Mitra", wantsCall: Boolean(phone), visitor });
      if (phone) saved.push("phone");
      if (email) saved.push("email");
    }
    const output = { saved: saved.length ? saved : "nothing valid to save", ...(said && !given ? { name: "not a name: ask for their name again" } : {}) };
    res.status(200).json(ApiResponse.ok("Saved", { output, name: savedName }));
    return;
  }
  if (name === "request_callback") {
    const chat = await Chat.findOne({ sessionId }).select({ lead: 1, enquiryId: 1, "workflow.status": 1 }).lean<any>();
    const said = args.phone ? toTenDigitMobile(String(args.phone)) : "";
    const phone = /^[6-9]\d{9}$/.test(said) ? said : chat?.lead?.phone;
    if (!phone) {
      res.status(200).json(ApiResponse.ok("No number", { output: { ok: false, next: "no mobile number saved: ask for their 10-digit number" } }));
      return;
    }
    const when = String(args.preferred_time || "").trim().slice(0, 80);
    await saveTypedContact({ sessionId, chat, phone, question: `Requested consultation callback in voice call${when ? ` (preferred time: ${when})` : ""}`, wantsCall: true, visitor });
    const callRes = await placeOutboundCall({ phone, visitorName: chat?.lead?.name, sessionId });
    res.status(200).json(
      ApiResponse.ok("Noted", {
        output: {
          ok: true,
          outbound_call_dialed: callRes.ok,
          noted: callRes.ok ? "outbound phone call dialed right now" : "callback request for doctor consultation noted",
          number_ends_in: phone.slice(-4),
        },
      })
    );
    return;
  }
  if (name === "search_knowledge") {
    res.status(200).json(ApiResponse.ok("Found", { output: { results: [{ title: "Vaidhyashala Clinic & Panchakarma", text: KNOWLEDGE }] } }));
    return;
  }
  res.status(200).json(ApiResponse.ok("Done", { output: { ok: true } }));
});

// POST /api/chat/call/end { sessionId }
export const stopCall = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.body.sessionId || "").trim();
  const { visitor } = visitorOf(req);
  if (isLive(sessionId, visitor.ip)) {
    endCall(sessionId);
  }
  res.status(200).json(ApiResponse.ok("Call ended", null));
});

// POST /api/chat/call-me { sessionId, phone, name } — initiates an immediate outbound phone call to the visitor
export const requestPhoneCall = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = String(req.body.sessionId || "").trim();
  const rawPhone = String(req.body.phone || "").trim();
  const rawName = String(req.body.name || "").trim();
  const { visitor } = visitorOf(req);

  const phone = toTenDigitMobile(rawPhone);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw ApiError.badRequest("Please provide a valid 10-digit Indian mobile number.");
  }

  const chat = sessionId ? await Chat.findOne({ sessionId }).select({ lead: 1, enquiryId: 1, "workflow.status": 1 }).lean<any>() : null;
  if (sessionId) {
    await saveTypedContact({
      sessionId,
      chat,
      phone,
      question: "Requested immediate phone call via Calling Agent",
      wantsCall: true,
      visitor,
    });
  }

  const result = await placeOutboundCall({
    phone,
    visitorName: rawName || chat?.lead?.name,
    sessionId,
  });

  if (!result.configured) {
    res.status(200).json(
      ApiResponse.ok("Callback saved (telephony provider pending)", {
        dialed: false,
        code: result.code,
        phone,
        message: "Number saved for callback. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env for instant automated dialing.",
      })
    );
    return;
  }

  if (!result.ok) {
    res.status(502).json({ success: false, code: result.code || "CALL_FAILED", message: result.error || "Could not place call" });
    return;
  }

  res.status(200).json(ApiResponse.ok("Calling your number now", { dialed: true, callSid: result.callSid, to: result.to }));
});
