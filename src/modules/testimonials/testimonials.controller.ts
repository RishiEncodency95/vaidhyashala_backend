import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { clientIp } from "../../utils/clientIp";
import { revalidateWebsite } from "../../utils/revalidateWebsite";
import * as service from "./testimonials.service";

const id = (req: Request) => String(req.params.id);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const listQuery = (req: Request): service.ListTestimonialsQuery => ({
  category: str(req.query.category),
  status: req.query.status === "active" || req.query.status === "inactive" ? req.query.status : undefined,
  page: Number(req.query.page) || undefined,
  limit: Number(req.query.limit) || undefined,
});

// Admin: testimonials
export const listTestimonials = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Testimonials fetched", await service.listTestimonials(listQuery(req))));
});
export const createTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.createTestimonial(req.body);
  revalidateWebsite();
  res.status(201).json(ApiResponse.created("Testimonial created", data));
});
export const updateTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.updateTestimonial(id(req), req.body);
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Testimonial updated", data));
});
export const deleteTestimonial = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.deleteTestimonial(id(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Testimonial deleted", data));
});

// Admin: patient feedback
export const listFeedback = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.listFeedback({
    status: str(req.query.status),
    consent: str(req.query.consent),
    page: Number(req.query.page) || undefined,
    limit: Number(req.query.limit) || undefined,
  });
  res.status(200).json(ApiResponse.ok("Feedback fetched", data));
});
export const updateFeedback = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Feedback updated", await service.updateFeedback(id(req), req.body)));
});
export const deleteFeedback = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Feedback deleted", await service.deleteFeedback(id(req))));
});
export const publishFeedback = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.publishFeedback(id(req), req.body ?? {});
  revalidateWebsite();
  res.status(201).json(ApiResponse.created("Published as a testimonial", data));
});

// Public
export const getPublicTestimonials = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Testimonials", await service.listTestimonials(listQuery(req), true)));
});
export const getPublicFeatured = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Featured testimonial", await service.getFeaturedTestimonial()));
});
export const createFeedback = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.createFeedback(req.body, clientIp(req));
  res.status(201).json(ApiResponse.created(data.message, data));
});
