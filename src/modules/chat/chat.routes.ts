import { Router } from "express";
import multer from "multer";
import { protect } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import {
  chatLimiter,
  chatLeadLimiter,
  chatHistoryLimiter,
  chatTrackLimiter,
  chatVoiceLimiter,
  chatTranscribeLimiter,
  chatCallLimiter,
  chatDuringCallLimiter,
} from "../../middlewares/rateLimiter.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import {
  chatAbuseSchema,
  chatHistorySchema,
  chatLeadSchema,
  chatMessageSchema,
  chatSpeakSchema,
  chatStartSchema,
  chatTrackSchema,
} from "./chat.schema";
import {
  startChat,
  startByName,
  trackChat,
  sendChatMessage,
  getChatHistory,
  getRecentChats,
  getChatStats,
  getChatById,
  reportAbuse,
  startCall,
  callTurn,
  callTool,
  stopCall,
  requestPhoneCall,
} from "./chat.controller";
import { twilioVoiceWebhook, twilioGatherWebhook } from "./chat.outbound";
import { speakText, transcribeAudio } from "./chat.voice";
import { createManualEnquiry, saveInboxWorkflow } from "./inbox.controller";
import { getRoutingSettingsAdmin, saveRoutingSettings } from "./routingSettings.controller";

const router = Router();

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /^audio\//.test(file.mimetype) || file.mimetype === "video/webm"),
});

// ---- Public: website chatbot (Vaidhya Mitra) ----
router.post("/chat/lead", chatLeadLimiter, validateRequest(chatLeadSchema), startChat);
router.post("/chat/start", chatLeadLimiter, validateRequest(chatStartSchema), startByName);
router.post("/chat/history", chatHistoryLimiter, validateRequest(chatHistorySchema), getChatHistory);
router.post("/chat/track", chatTrackLimiter, validateRequest(chatTrackSchema), trackChat);
router.post("/chat", chatLimiter, validateRequest(chatMessageSchema), sendChatMessage);
// Voice routes: speech-to-text (transcribe) and text-to-speech (speak)
router.post("/chat/speak", chatVoiceLimiter, validateRequest(chatSpeakSchema), speakText);
router.post("/chat/transcribe", chatTranscribeLimiter, uploadAudio.single("audio"), transcribeAudio);
// Abuse warning and IP rate block
router.post("/chat/abuse", chatTrackLimiter, validateRequest(chatAbuseSchema), reportAbuse);

// Live Spoken Voice Call (OpenAI Realtime over WebRTC)
router.post("/chat/call", chatCallLimiter, startCall);
router.post("/chat/call/turn", chatDuringCallLimiter, callTurn);
router.post("/chat/call/tool", chatDuringCallLimiter, callTool);
router.post("/chat/call/end", chatDuringCallLimiter, stopCall);

// Outbound Phone Calling Agent (Twilio PSTN + AI Voice)
router.post("/chat/call-me", chatLeadLimiter, requestPhoneCall);
router.post("/chat/twilio/voice", twilioVoiceWebhook);
router.post("/chat/twilio/gather", twilioGatherWebhook);

// ---- Admin ----
const canView = [protect, requirePermission("perm_enquiries_view")];
router.get("/admin/chats", ...canView, getRecentChats);
router.get("/admin/chats/stats", ...canView, getChatStats);
const canEdit = [protect, requirePermission("perm_enquiries_reply")];
router.put("/admin/chats/workflow", ...canEdit, saveInboxWorkflow);
router.post("/admin/chats/manual", ...canEdit, createManualEnquiry);
router.get("/admin/chats/routing", ...canView, getRoutingSettingsAdmin);
router.put("/admin/chats/routing", ...canEdit, saveRoutingSettings);
router.get("/admin/chats/:id", ...canView, getChatById);

export default router;
