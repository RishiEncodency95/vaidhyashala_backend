import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { revalidateWebsite } from "../../utils/revalidateWebsite";
import { clientIp } from "../../utils/clientIp";
import * as service from "./pageContent.service";

const adminId = (req: Request) => (req.user as { id?: string } | undefined)?.id;
const pageKey = (req: Request) => String(req.params.pageKey);

export const listPages = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Pages", service.listPages()));
});

export const getPage = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Page fetched", await service.getPage(pageKey(req))));
});

export const getDefaults = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Website defaults", service.getDefaults(pageKey(req))));
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.updateSection(pageKey(req), String(req.params.section), req.body, adminId(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Section saved", data));
});

export const updateSeo = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.updateSeo(pageKey(req), req.body, adminId(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("SEO saved", data));
});

export const updatePublish = asyncHandler(async (req: Request, res: Response) => {
  const data = await service.updatePublish(pageKey(req), req.body, adminId(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Publish settings saved", data));
});

export const getPublicPage = asyncHandler(async (req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json(ApiResponse.ok("Page content", await service.getPublicPage(pageKey(req))));
});

export const getPublicSeo = asyncHandler(async (req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json(ApiResponse.ok("Page SEO", (await service.getPage(pageKey(req))).seo));
});

export const createConsultationRequest = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.createConsultationRequest(req.body, clientIp(req));
  res.status(201).json(ApiResponse.created(result.message, result));
});

export const createContactEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.createContactEnquiry(req.body);
  res.status(201).json(ApiResponse.created(result.message, result));
});
