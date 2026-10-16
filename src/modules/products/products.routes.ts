import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { enquiryLimiter } from "../../middlewares/rateLimiter.middleware";
import * as controller from "./products.controller";
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  idParamSchema,
  createEnquirySchema,
  updateEnquirySchema,
} from "./products.schema";

/** Admin panel: /api/cms/products — catalogue (Content permission) and enquiries (Enquiries permission) */
export const productsAdminRouter = Router();

const canView = requirePermission("perm_content_view", "perm_content_edit");
const canEdit = requirePermission("perm_content_edit");
const canViewEnquiries = requirePermission("perm_enquiries_view", "perm_enquiries_reply");
const canReplyEnquiries = requirePermission("perm_enquiries_reply");

productsAdminRouter.use(protect);

productsAdminRouter.get("/categories", canView, controller.listCategories);
productsAdminRouter.post("/categories", canEdit, validateRequest(createCategorySchema), controller.createCategory);
productsAdminRouter.put("/categories/:id", canEdit, validateRequest(updateCategorySchema), controller.updateCategory);
productsAdminRouter.delete("/categories/:id", canEdit, validateRequest(idParamSchema), controller.deleteCategory);

productsAdminRouter.get("/enquiries", canViewEnquiries, controller.listEnquiries);
productsAdminRouter.patch("/enquiries/:id", canReplyEnquiries, validateRequest(updateEnquirySchema), controller.updateEnquiry);
productsAdminRouter.delete("/enquiries/:id", canReplyEnquiries, validateRequest(idParamSchema), controller.deleteEnquiry);

productsAdminRouter.get("/", canView, controller.listProducts);
productsAdminRouter.get("/:id", canView, validateRequest(idParamSchema), controller.getProduct);
productsAdminRouter.post("/", canEdit, validateRequest(createProductSchema), controller.createProduct);
productsAdminRouter.put("/:id", canEdit, validateRequest(updateProductSchema), controller.updateProduct);
productsAdminRouter.delete("/:id", canEdit, validateRequest(idParamSchema), controller.deleteProduct);

/** Website: /api/website/products — public catalogue (active only) and the enquiry forms */
export const productsPublicRouter = Router();

productsPublicRouter.get("/", controller.getPublicProducts);
productsPublicRouter.get("/categories", controller.getPublicCategories);
productsPublicRouter.post("/enquiries", enquiryLimiter, validateRequest(createEnquirySchema), controller.createEnquiry);
productsPublicRouter.get("/:slug", controller.getPublicProduct);
