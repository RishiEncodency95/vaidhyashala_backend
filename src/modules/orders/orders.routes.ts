import { Router } from "express";
import asyncHandler from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { validateRequest } from "../../middlewares/validate.middleware";
import { enquiryLimiter } from "../../middlewares/rateLimiter.middleware";
import { protect } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/permission.middleware";
import { couponSchema, createOrderSchema, orderIdSchema, updateOrderSchema, verifyPaymentSchema } from "./orders.schema";
import * as service from "./orders.service";

/** Website: /api/website/orders — checkout and payment check */
export const ordersPublicRouter = Router();

ordersPublicRouter.post(
  "/",
  enquiryLimiter,
  validateRequest(createOrderSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(ApiResponse.created("Order created", await service.createOrder(req.body)));
  }),
);

ordersPublicRouter.post(
  "/coupon",
  enquiryLimiter,
  validateRequest(couponSchema),
  asyncHandler(async (req, res) => {
    res.status(200).json(ApiResponse.ok("Coupon applied", await service.quoteCoupon(req.body)));
  }),
);

ordersPublicRouter.post(
  "/verify",
  validateRequest(verifyPaymentSchema),
  asyncHandler(async (req, res) => {
    res.status(200).json(ApiResponse.ok("Payment confirmed", await service.verifyPayment(req.body)));
  }),
);

// Razorpay calls this directly: no rate limit, the signature is the check
ordersPublicRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    const raw = (req as typeof req & { rawBody?: Buffer }).rawBody;
    const data = await service.handleWebhook(raw, req.get("x-razorpay-signature"));
    res.status(200).json(ApiResponse.ok("Webhook received", data));
  }),
);

/** Admin panel: /api/cms/orders — same permissions as the enquiries */
export const ordersAdminRouter = Router();
ordersAdminRouter.use(protect);
const canView = requirePermission("perm_enquiries_view", "perm_enquiries_reply");
const canEdit = requirePermission("perm_enquiries_reply");

ordersAdminRouter.get(
  "/",
  canView,
  asyncHandler(async (req, res) => {
    const q = req.query;
    const payment = q.payment === "pending" || q.payment === "paid" || q.payment === "failed" ? q.payment : undefined;
    const data = await service.listOrders({
      search: typeof q.search === "string" ? q.search : undefined,
      status: typeof q.status === "string" ? q.status : undefined,
      payment,
      page: Number(q.page) || undefined,
      limit: Number(q.limit) || undefined,
    });
    res.status(200).json(ApiResponse.ok("Orders fetched", data));
  }),
);
ordersAdminRouter.patch(
  "/:id",
  canEdit,
  validateRequest(updateOrderSchema),
  asyncHandler(async (req, res) => {
    res.status(200).json(ApiResponse.ok("Order updated", await service.updateOrder(String(req.params.id), req.body)));
  }),
);
ordersAdminRouter.delete(
  "/:id",
  canEdit,
  validateRequest(orderIdSchema),
  asyncHandler(async (req, res) => {
    res.status(200).json(ApiResponse.ok("Order deleted", await service.deleteOrder(String(req.params.id))));
  }),
);
