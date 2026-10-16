import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { enquiryLimiter } from "../../middlewares/rateLimiter.middleware";
import * as controller from "./testimonials.controller";
import {
  createTestimonialSchema,
  updateTestimonialSchema,
  idParamSchema,
  createFeedbackSchema,
  updateFeedbackSchema,
  publishFeedbackSchema,
} from "./testimonials.schema";

/** Admin panel: /api/cms/testimonials — cards (Content permission) and patient feedback (Enquiries permission) */
export const testimonialsAdminRouter = Router();

const canView = requirePermission("perm_content_view", "perm_content_edit");
const canEdit = requirePermission("perm_content_edit");
const canViewFeedback = requirePermission("perm_enquiries_view", "perm_enquiries_reply");
const canReplyFeedback = requirePermission("perm_enquiries_reply");

testimonialsAdminRouter.use(protect);

testimonialsAdminRouter.get("/feedback", canViewFeedback, controller.listFeedback);
testimonialsAdminRouter.patch("/feedback/:id", canReplyFeedback, validateRequest(updateFeedbackSchema), controller.updateFeedback);
testimonialsAdminRouter.delete("/feedback/:id", canReplyFeedback, validateRequest(idParamSchema), controller.deleteFeedback);
// Publishing creates website content, so it also needs the Content edit permission
testimonialsAdminRouter.post("/feedback/:id/publish", canReplyFeedback, canEdit, validateRequest(publishFeedbackSchema), controller.publishFeedback);

testimonialsAdminRouter.get("/", canView, controller.listTestimonials);
testimonialsAdminRouter.post("/", canEdit, validateRequest(createTestimonialSchema), controller.createTestimonial);
testimonialsAdminRouter.put("/:id", canEdit, validateRequest(updateTestimonialSchema), controller.updateTestimonial);
testimonialsAdminRouter.delete("/:id", canEdit, validateRequest(idParamSchema), controller.deleteTestimonial);

/** Website: /api/website/testimonials — visible cards and the "Share your experience" form */
export const testimonialsPublicRouter = Router();

testimonialsPublicRouter.get("/", controller.getPublicTestimonials);
testimonialsPublicRouter.get("/featured", controller.getPublicFeatured);
testimonialsPublicRouter.post("/feedback", enquiryLimiter, validateRequest(createFeedbackSchema), controller.createFeedback);
