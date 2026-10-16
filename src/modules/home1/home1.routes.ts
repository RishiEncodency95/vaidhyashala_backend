import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import * as controller from "./home1.controller";
import {
  sectionParamSchema,
  seoSchema,
  publishSchema,
  createCategorySchema,
  updateCategorySchema,
  createArticleSchema,
  updateArticleSchema,
  idParamSchema,
} from "./home1.schema";

/** Admin panel: /api/cms/home1 — login + Content permission required */
export const home1AdminRouter = Router();

const canView = requirePermission("perm_content_view", "perm_content_edit");
const canEdit = requirePermission("perm_content_edit");

home1AdminRouter.use(protect);

home1AdminRouter.get("/", canView, controller.getPage);
home1AdminRouter.put("/sections/:section", canEdit, validateRequest(sectionParamSchema), controller.updateSection);
home1AdminRouter.put("/seo", canEdit, validateRequest(seoSchema), controller.updateSeo);
home1AdminRouter.put("/publish", canEdit, validateRequest(publishSchema), controller.updatePublish);
home1AdminRouter.get("/defaults", canView, controller.getDefaults);

home1AdminRouter.get("/categories", canView, controller.listCategories);
home1AdminRouter.post("/categories", canEdit, validateRequest(createCategorySchema), controller.createCategory);
home1AdminRouter.put("/categories/:id", canEdit, validateRequest(updateCategorySchema), controller.updateCategory);
home1AdminRouter.delete("/categories/:id", canEdit, validateRequest(idParamSchema), controller.deleteCategory);

home1AdminRouter.get("/articles", canView, controller.listArticles);
home1AdminRouter.get("/articles/:id", canView, validateRequest(idParamSchema), controller.getArticle);
home1AdminRouter.post("/articles", canEdit, validateRequest(createArticleSchema), controller.createArticle);
home1AdminRouter.put("/articles/:id", canEdit, validateRequest(updateArticleSchema), controller.updateArticle);
home1AdminRouter.delete("/articles/:id", canEdit, validateRequest(idParamSchema), controller.deleteArticle);

/** Website: /api/website/home1 — public, read-only, active content only */
export const home1PublicRouter = Router();

home1PublicRouter.get("/", controller.getPublicHome1);
home1PublicRouter.get("/seo", controller.getPublicSeo);
home1PublicRouter.get("/categories", controller.getPublicCategories);
home1PublicRouter.get("/articles", controller.getPublicArticles);
home1PublicRouter.get("/articles/:slug", controller.getPublicArticleBySlug);
