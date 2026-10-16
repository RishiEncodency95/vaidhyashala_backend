import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { seoSchema } from "../home1/home1.schema";
import { consultationRequestSchema, contactEnquirySchema, pagePublishSchema } from "./pageContent.types";
import { enquiryLimiter } from "../../middlewares/rateLimiter.middleware";
import * as controller from "./pageContent.controller";

/** Admin panel: /api/cms/pages/:pageKey — login + Content permission required */
export const pageContentAdminRouter = Router();

const canView = requirePermission("perm_content_view", "perm_content_edit");
const canEdit = requirePermission("perm_content_edit");

pageContentAdminRouter.use(protect);
pageContentAdminRouter.get("/", canView, controller.listPages);
pageContentAdminRouter.get("/:pageKey", canView, controller.getPage);
pageContentAdminRouter.get("/:pageKey/defaults", canView, controller.getDefaults);
pageContentAdminRouter.put("/:pageKey/sections/:section", canEdit, controller.updateSection);
pageContentAdminRouter.put("/:pageKey/seo", canEdit, validateRequest(seoSchema), controller.updateSeo);
pageContentAdminRouter.put("/:pageKey/publish", canEdit, validateRequest(pagePublishSchema), controller.updatePublish);

/** Website: /api/website/pages/:pageKey — public, read-only */
export const pageContentPublicRouter = Router();

// Before "/:pageKey" so it is never read as a page key
pageContentPublicRouter.post(
  "/panchakarma/consultation-requests",
  enquiryLimiter,
  validateRequest(consultationRequestSchema),
  controller.createConsultationRequest
);
pageContentPublicRouter.post(
  "/contact/enquiries",
  enquiryLimiter,
  validateRequest(contactEnquirySchema),
  controller.createContactEnquiry
);
pageContentPublicRouter.get("/:pageKey", controller.getPublicPage);
pageContentPublicRouter.get("/:pageKey/seo", controller.getPublicSeo);
