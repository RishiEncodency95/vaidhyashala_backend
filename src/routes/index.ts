import { Router } from "express";
import uploadRouter from "../modules/upload/upload.routes";
import filesRouter from "../modules/files/files.routes";
import authRouter from "../modules/auth/auth.routes";
import staffRouter from "../modules/staff/staff.routes";
import rolesRouter from "../modules/roles/roles.routes";
import seoRouter from "../modules/seo/seo.routes";
import advancedSeoRouter from "../modules/seo/advancedSeo.routes";
import settingsRouter from "../modules/settings/settings.routes";
import contactEnquiryRouter from "../modules/contact/contactEnquiry.routes";
import verifyRouter from "../modules/contact/verify.routes";
import newsletterRouter from "../modules/newsletter/newsletter.routes";
import feedbackRouter from "../modules/feedback/feedback.routes";
import careersRouter from "./careers.routes";
import dashboardRouter from "../modules/dashboard/dashboard.routes";
import activityLogRouter from "../modules/activityLog/activityLog.routes";
import apiLimitsRouter from "../modules/apiLimits/apiLimits.routes";
import locationsRouter from "../modules/locations/locations.routes";
import systemServicesRouter from "../modules/systemServices/systemServices.routes";
import chatRouter from "../modules/chat/chat.routes";
import chatbotRouter from "../modules/chatbot/chatbot.routes";

const router = Router();

// Health Check Route
router.get("/health", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "Server is healthy and running smoothly.",
        timestamp: new Date().toISOString(),
    });
});

// API Routes
router.use("/system-services", systemServicesRouter);
router.use("/", chatRouter);
router.use("/", chatbotRouter);
router.use("/dashboard", dashboardRouter);
router.use("/activity-logs", activityLogRouter);
router.use("/api-limits", apiLimitsRouter);
router.use("/", locationsRouter);
router.use("/careers", careersRouter);
router.use("/admin/careers", careersRouter);
router.use("/uploads", uploadRouter);
router.use("/files", filesRouter);
router.use("/settings", settingsRouter);
router.use("/auth", authRouter);
router.use("/users/admin", staffRouter);
router.use("/roles", rolesRouter);
router.use("/seo", seoRouter);
router.use("/website/seo", seoRouter);
router.use("/seo-settings", advancedSeoRouter);
router.use("/website/seo-settings", advancedSeoRouter);
router.use("/newsletter", newsletterRouter);
router.use("/feedback", feedbackRouter);
router.use("/contact-enquiry", contactEnquiryRouter);
router.use("/website/contact-enquiry", contactEnquiryRouter);
router.use("/website/contact", contactEnquiryRouter);
router.use("/verify", verifyRouter);
router.use("/website/verify", verifyRouter);

export default router;
