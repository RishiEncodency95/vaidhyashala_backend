import { Request, Response } from "express";
import { ZodError } from "zod";
import asyncHandler from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { revalidateWebsite } from "../../utils/revalidateWebsite";
import { Home1SectionKey } from "./home1.defaults";
import { sectionSchemas } from "./home1.schema";
import * as home1Service from "./home1.service";

const adminId = (req: Request) => (req.user as { id?: string } | undefined)?.id;
const param = (req: Request, name: string) => String(req.params[name]);

const listQuery = (req: Request): home1Service.ListArticlesQuery => ({
  search: typeof req.query.search === "string" ? req.query.search : undefined,
  category: typeof req.query.category === "string" ? req.query.category : undefined,
  status: req.query.status === "active" || req.query.status === "inactive" ? req.query.status : undefined,
  featured: req.query.featured === "true" || req.query.featured === "false" ? req.query.featured : undefined,
  page: Number(req.query.page) || undefined,
  limit: Number(req.query.limit) || undefined,
});

// ─── Admin: page, sections, SEO ──────────────────────────────────────────────

export const getPage = asyncHandler(async (_req: Request, res: Response) => {
  const page = await home1Service.getPage();
  res.status(200).json(ApiResponse.ok("Home 1 page fetched", page));
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const section = param(req, "section") as Home1SectionKey;
  let data: Record<string, unknown>;
  try {
    data = sectionSchemas[section].parse(req.body ?? {});
  } catch (error) {
    if (error instanceof ZodError) {
      throw ApiError.badRequest(
        "Validation failed",
        error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      );
    }
    throw error;
  }
  const updated = await home1Service.updateSection(section, data, adminId(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Section saved", updated));
});

export const updatePublish = asyncHandler(async (req: Request, res: Response) => {
  const publish = await home1Service.updatePublish(req.body, adminId(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Publish settings saved", publish));
});

export const getDefaults = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Website defaults", home1Service.getDefaults()));
});

export const updateSeo = asyncHandler(async (req: Request, res: Response) => {
  const seo = await home1Service.updateSeo(req.body, adminId(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("SEO saved", seo));
});

// ─── Admin: categories ───────────────────────────────────────────────────────

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Categories fetched", await home1Service.listCategories()));
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await home1Service.createCategory(req.body);
  revalidateWebsite();
  res.status(201).json(ApiResponse.created("Category created", category));
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await home1Service.updateCategory(param(req, "id"), req.body);
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Category updated", category));
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await home1Service.deleteCategory(param(req, "id"));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Category deleted", result));
});

// ─── Admin: articles ─────────────────────────────────────────────────────────

export const listArticles = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Articles fetched", await home1Service.listArticles(listQuery(req))));
});

export const getArticle = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Article fetched", await home1Service.getArticle(param(req, "id"))));
});

export const createArticle = asyncHandler(async (req: Request, res: Response) => {
  const article = await home1Service.createArticle(req.body);
  revalidateWebsite();
  res.status(201).json(ApiResponse.created("Article created", article));
});

export const updateArticle = asyncHandler(async (req: Request, res: Response) => {
  const article = await home1Service.updateArticle(param(req, "id"), req.body);
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Article updated", article));
});

export const deleteArticle = asyncHandler(async (req: Request, res: Response) => {
  const result = await home1Service.deleteArticle(param(req, "id"));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Article deleted", result));
});

// ─── Public (website) ────────────────────────────────────────────────────────

export const getPublicHome1 = asyncHandler(async (_req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json(ApiResponse.ok("Home 1 content", await home1Service.getPublicHome1()));
});

export const getPublicSeo = asyncHandler(async (_req: Request, res: Response) => {
  const page = await home1Service.getPage();
  res.set("Cache-Control", "no-store");
  res.status(200).json(ApiResponse.ok("Home 1 SEO", page.seo));
});

export const getPublicCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await home1Service.listCategories(true);
  res.status(200).json(
    ApiResponse.ok("Categories", categories.map(({ _id, name, slug }) => ({ _id, name, slug })))
  );
});

export const getPublicArticles = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Articles", await home1Service.listArticles(listQuery(req), true)));
});

export const getPublicArticleBySlug = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Article", await home1Service.getPublicArticleBySlug(param(req, "slug"))));
});
