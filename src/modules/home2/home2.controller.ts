import { Request, Response } from "express";
import { ZodError } from "zod";
import asyncHandler from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { clientIp } from "../../utils/clientIp";
import { revalidateWebsite } from "../../utils/revalidateWebsite";
import { Home2SectionKey } from "./home2.defaults";
import { partialSectionSchemas } from "./home2.schema";
import * as home2Service from "./home2.service";

const adminId = (req: Request) => (req.user as { id?: string } | undefined)?.id;

// ─── Admin: page ─────────────────────────────────────────────────────────────

export const getPage = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Home 2 page fetched", await home2Service.getPage()));
});

export const getDefaults = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Website defaults", home2Service.getDefaults()));
});

export const updateSection = asyncHandler(async (req: Request, res: Response) => {
  const section = String(req.params.section) as Home2SectionKey;
  let data: Record<string, unknown>;
  try {
    data = partialSectionSchemas[section].parse(req.body ?? {});
  } catch (error) {
    if (error instanceof ZodError) {
      throw ApiError.badRequest(
        "Validation failed",
        error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      );
    }
    throw error;
  }
  const updated = await home2Service.updateSection(section, data, adminId(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Section saved", updated));
});

export const updateSeo = asyncHandler(async (req: Request, res: Response) => {
  const seo = await home2Service.updateSeo(req.body, adminId(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("SEO saved", seo));
});

export const updatePublish = asyncHandler(async (req: Request, res: Response) => {
  const publish = await home2Service.updatePublish(req.body, adminId(req));
  revalidateWebsite();
  res.status(200).json(ApiResponse.ok("Publish settings saved", publish));
});

// ─── Admin: appointment requests ─────────────────────────────────────────────

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const result = await home2Service.listAppointments({
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    source: typeof req.query.source === "string" ? req.query.source : undefined,
    page: Number(req.query.page) || undefined,
    limit: Number(req.query.limit) || undefined,
  });
  res.status(200).json(ApiResponse.ok("Appointment requests fetched", result));
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const doc = await home2Service.updateAppointment(String(req.params.id), req.body);
  res.status(200).json(ApiResponse.ok("Appointment request updated", doc));
});

export const deleteAppointment = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(ApiResponse.ok("Appointment request deleted", await home2Service.deleteAppointment(String(req.params.id))));
});

// ─── Public (website) ────────────────────────────────────────────────────────

export const getPublicHome2 = asyncHandler(async (_req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json(ApiResponse.ok("Home 2 content", await home2Service.getPublicHome2()));
});

export const getPublicSeo = asyncHandler(async (_req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json(ApiResponse.ok("Home 2 SEO", (await home2Service.getPage()).seo));
});

export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const result = await home2Service.createAppointment(req.body, clientIp(req));
  res.status(201).json(ApiResponse.created(result.message, result));
});
