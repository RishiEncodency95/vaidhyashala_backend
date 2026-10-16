import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { clientIp } from "../../utils/clientIp";
import { revalidateWebsite } from "../../utils/revalidateWebsite";
import * as service from "./products.service";

const id = (req: Request) => String(req.params.id);
const listQuery = (req: Request): service.ListProductsQuery => ({
  search: typeof req.query.search === "string" ? req.query.search : undefined,
  category: typeof req.query.category === "string" ? req.query.category : undefined,
  status: req.query.status === "active" || req.query.status === "inactive" ? req.query.status : undefined,
  page: Number(req.query.page) || undefined,
  limit: Number(req.query.limit) || undefined,
});

// Admin: categories
export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Categories fetched", await service.listCategories()));
});
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.createCategory(req.body);
  revalidateWebsite();
  res.status(201).json(ApiResponse.created("Category created", data));
});
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.updateCategory(id(req), req.body);
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Category updated", data));
});
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.deleteCategory(id(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Category deleted", data));
});

// Admin: products
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Products fetched", await service.listProducts(listQuery(req))));
});
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Product fetched", await service.getProduct(id(req))));
});
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.createProduct(req.body);
  revalidateWebsite();
  res.status(201).json(ApiResponse.created("Product created", data));
});
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.updateProduct(id(req), req.body);
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Product updated", data));
});
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.deleteProduct(id(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Product deleted", data));
});

// Admin: enquiries
export const listEnquiries = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.listEnquiries({
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    page: Number(req.query.page) || undefined,
    limit: Number(req.query.limit) || undefined,
  });
  res.status(200).json(ApiResponse.ok("Enquiries fetched", data));
});
export const updateEnquiry = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Enquiry updated", await service.updateEnquiry(id(req), req.body)));
});
export const deleteEnquiry = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Enquiry deleted", await service.deleteEnquiry(id(req))));
});

// Public
export const getPublicProducts = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Products", await service.listProducts(listQuery(req), true)));
});
export const getPublicCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await service.listCategories(true);
  res.status(200).json(ApiResponse.ok("Categories", categories.map(({ _id, name, slug, productCount }) => ({ _id, name, slug, productCount }))));
});
export const getPublicProduct = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Product", await service.getPublicProductBySlug(String(req.params.slug))));
});
export const createEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.createEnquiry(req.body, clientIp(req));
  res.status(201).json(ApiResponse.created("Thank you for your enquiry. Our team will contact you shortly.", data));
});
