import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { enquiryLimiter } from "../../middlewares/rateLimiter.middleware";
import * as controller from "./home2.controller";
import {
  sectionParamSchema,
  seoSchema,
  publishSchema,
  createAppointmentSchema,
  createConsultationSchema,
  updateAppointmentSchema,
  idParamSchema,
} from "./home2.schema";

/** Admin panel: /api/cms/home2 — login + Content / Enquiries permission required */
export const home2AdminRouter = Router();

const canView = requirePermission("perm_content_view", "perm_content_edit");
const canEdit = requirePermission("perm_content_edit");
const canViewEnquiries = requirePermission("perm_enquiries_view", "perm_enquiries_reply");
const canReplyEnquiries = requirePermission("perm_enquiries_reply");

home2AdminRouter.use(protect);

home2AdminRouter.get("/", canView, controller.getPage);
home2AdminRouter.get("/defaults", canView, controller.getDefaults);
home2AdminRouter.put("/sections/:section", canEdit, validateRequest(sectionParamSchema), controller.updateSection);
home2AdminRouter.put("/seo", canEdit, validateRequest(seoSchema), controller.updateSeo);
home2AdminRouter.put("/publish", canEdit, validateRequest(publishSchema), controller.updatePublish);

home2AdminRouter.get("/appointments", canViewEnquiries, controller.listAppointments);
home2AdminRouter.patch("/appointments/:id", canReplyEnquiries, validateRequest(updateAppointmentSchema), controller.updateAppointment);
home2AdminRouter.delete("/appointments/:id", canReplyEnquiries, validateRequest(idParamSchema), controller.deleteAppointment);

/** Website: /api/website/home2 — public */
export const home2PublicRouter = Router();

home2PublicRouter.get("/", controller.getPublicHome2);
home2PublicRouter.get("/seo", controller.getPublicSeo);
home2PublicRouter.post("/consultations", enquiryLimiter, validateRequest(createConsultationSchema), controller.createConsultation);
home2PublicRouter.post("/appointments", enquiryLimiter, validateRequest(createAppointmentSchema), controller.createAppointment);
