import crypto from "crypto";
import { Product } from "../../models/products/Product.model";
import { Order, type IOrder } from "../../models/products/Order.model";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";
import { sendOrderEmails } from "../../services/orderEmail.service";
import { applyCoupon } from "./coupons";

interface CreateOrderInput {
  customer: { name: string; mobile: string; email?: string };
  address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  items: { id: string; qty: number }[];
  notes?: string;
  couponCode?: string;
}

const money = (n: number) => Math.round(n * 100) / 100;

const keys = () => {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new ApiError(503, "Online payment is not set up yet. Please contact the clinic to place your order.");
  }
  return { keyId, keySecret };
};

const orderNumber = () => `VDS-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

/** The cart priced from the database (never from the browser) */
const priceCart = async (lines: { id: string; qty: number }[]) => {
  // Same product twice in the list -> one line
  const qtyById = new Map<string, number>();
  for (const i of lines) qtyById.set(i.id, Math.min(20, (qtyById.get(i.id) ?? 0) + i.qty));

  const products = await Product.find({ _id: { $in: [...qtyById.keys()] }, isActive: true }).lean();
  if (products.length !== qtyById.size) throw ApiError.badRequest("Some products in your cart are no longer available.");

  const items = products.map((p) => {
    if (!(p.price > 0)) throw ApiError.badRequest(`"${p.title}" cannot be ordered online yet. Please enquire.`);
    return {
      product: p._id,
      title: p.title,
      image: p.image || "",
      price: p.price,
      mrp: p.mrp > p.price ? p.mrp : p.price,
      qty: qtyById.get(String(p._id)) as number,
    };
  });
  const subtotal = money(items.reduce((n, i) => n + i.price * i.qty, 0));
  const discount = money(items.reduce((n, i) => n + (i.mrp - i.price) * i.qty, 0));
  return { items, subtotal, discount };
};

/** Checkout "Apply" button: what the coupon takes off this cart */
export const quoteCoupon = async (input: { code: string; items: { id: string; qty: number }[] }) => {
  const { subtotal } = await priceCart(input.items);
  const coupon = applyCoupon(input.code, subtotal);
  return { code: coupon.code, discount: coupon.discount, subtotal, total: money(subtotal - coupon.discount) };
};

/** Builds the order from the database's prices and opens a Razorpay payment for the total */
export const createOrder = async (input: CreateOrderInput) => {
  const { keyId, keySecret } = keys();
  const { items, subtotal, discount } = await priceCart(input.items);
  const coupon = input.couponCode?.trim() ? applyCoupon(input.couponCode, subtotal) : null;
  const total = money(subtotal - (coupon?.discount ?? 0));
  const number = orderNumber();

  const order = await Order.create({
    orderNumber: number,
    customer: { ...input.customer, email: input.customer.email ?? "" },
    address: { ...input.address, line2: input.address.line2 ?? "" },
    notes: input.notes ?? "",
    items,
    subtotal,
    discount,
    couponCode: coupon?.code ?? "",
    couponDiscount: coupon?.discount ?? 0,
    total,
  });

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount: Math.round(total * 100), currency: "INR", receipt: number }),
  });
  if (!res.ok) {
    await Order.findByIdAndUpdate(order._id, { paymentStatus: "failed" });
    throw new ApiError(502, "Could not start the payment. Please try again in a moment.");
  }
  const rz = (await res.json()) as { id: string; amount: number; currency: string };
  order.razorpayOrderId = rz.id;
  await order.save();

  return {
    orderId: String(order._id),
    orderNumber: number,
    subtotal,
    couponCode: coupon?.code ?? "",
    couponDiscount: coupon?.discount ?? 0,
    total,
    razorpay: { keyId, orderId: rz.id, amount: rz.amount, currency: rz.currency },
  };
};

const sameHex = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * Marks the order paid exactly once (the browser and the webhook can both report the same
 * payment): only the call that actually flips it sends the confirmation emails.
 */
const markPaid = async (orderId: IOrder["_id"], paymentId: string) => {
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: "paid" } },
    { paymentStatus: "paid", status: "confirmed", razorpayPaymentId: paymentId },
    { new: true },
  );
  if (updated) void sendOrderEmails(updated.toObject() as IOrder);
  return updated;
};

/** Checks Razorpay's signature so only a real payment marks the order paid */
export const verifyPayment = async (input: {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  const { keySecret } = keys();
  const order = await Order.findById(input.orderId);
  if (!order || order.razorpayOrderId !== input.razorpay_order_id) throw ApiError.badRequest("Order not found.");
  if (order.paymentStatus === "paid") return { orderNumber: order.orderNumber, total: order.total };

  const expected = crypto.createHmac("sha256", keySecret).update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`).digest("hex");
  if (!sameHex(input.razorpay_signature, expected)) {
    order.paymentStatus = "failed";
    await order.save();
    throw ApiError.badRequest("Payment could not be verified. If money was deducted, please contact the clinic.");
  }
  await markPaid(order._id, input.razorpay_payment_id);
  return { orderNumber: order.orderNumber, total: order.total };
};

/** Records a Razorpay payment.failed callback so the order shows as failed until retried */
export const markPaymentFailed = async (input: {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  reason?: string;
  code?: string;
}) => {
  const order = await Order.findById(input.orderId);
  if (!order || order.razorpayOrderId !== input.razorpay_order_id) throw ApiError.badRequest("Order not found.");
  if (order.paymentStatus === "paid") {
    return { orderNumber: order.orderNumber, paymentStatus: "paid" as const, total: order.total };
  }
  order.paymentStatus = "failed";
  if (input.razorpay_payment_id) order.razorpayPaymentId = input.razorpay_payment_id;
  if (input.reason || input.code) {
    const note = `Payment failed${input.code ? ` (${input.code})` : ""}: ${input.reason || "Transaction declined"}`;
    order.adminNote = order.adminNote ? `${order.adminNote}\n${note}`.slice(0, 1000) : note.slice(0, 1000);
  }
  await order.save();
  return { orderNumber: order.orderNumber, paymentStatus: order.paymentStatus, total: order.total };
};

/** Checks live payment status with Razorpay for pending orders (used by /payment-pending polling) */
export const checkPaymentStatus = async (input: { orderId: string; razorpay_order_id: string }) => {
  const order = await Order.findById(input.orderId);
  if (!order || order.razorpayOrderId !== input.razorpay_order_id) throw ApiError.badRequest("Order not found.");

  if (order.paymentStatus === "paid") {
    return { orderNumber: order.orderNumber, paymentStatus: "paid" as const, total: order.total };
  }

  try {
    const { keyId, keySecret } = keys();
    const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(input.razorpay_order_id)}/payments`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
    });
    if (res.ok) {
      const json = (await res.json()) as { items?: Array<{ id: string; status: string; error_description?: string; error_code?: string }> };
      const payments = json.items || [];
      const paid = payments.find((p) => p.status === "captured" || p.status === "authorized");
      if (paid) {
        await markPaid(order._id, paid.id);
        return { orderNumber: order.orderNumber, paymentStatus: "paid" as const, total: order.total };
      }
      const hasPending = payments.some((p) => p.status === "created");
      const failed = payments.find((p) => p.status === "failed");
      if (failed && !hasPending) {
        order.paymentStatus = "failed";
        order.razorpayPaymentId = failed.id;
        await order.save();
        return {
          orderNumber: order.orderNumber,
          paymentStatus: "failed" as const,
          total: order.total,
          reason: failed.error_description || "Payment was declined by your bank or UPI app.",
          code: failed.error_code || "",
        };
      }
    }
  } catch {
    // keep current DB status if Razorpay lookup momentarily fails
  }

  return { orderNumber: order.orderNumber, paymentStatus: order.paymentStatus, total: order.total };
};

/** Creates a fresh Razorpay order for an existing unpaid order so the user can retry payment cleanly */
export const retryOrderPayment = async (input: { orderId: string; razorpay_order_id: string }) => {
  const { keyId, keySecret } = keys();
  const order = await Order.findById(input.orderId);
  if (!order || order.razorpayOrderId !== input.razorpay_order_id) throw ApiError.badRequest("Order not found.");
  if (order.paymentStatus === "paid") {
    return {
      alreadyPaid: true,
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      total: order.total,
    };
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount: Math.round(order.total * 100), currency: "INR", receipt: order.orderNumber }),
  });
  if (!res.ok) throw new ApiError(502, "Could not restart payment. Please try again in a moment.");
  const rz = (await res.json()) as { id: string; amount: number; currency: string };
  order.razorpayOrderId = rz.id;
  order.paymentStatus = "pending";
  await order.save();

  return {
    alreadyPaid: false,
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    total: order.total,
    razorpay: { keyId, orderId: rz.id, amount: rz.amount, currency: rz.currency },
  };
};

/**
 * Razorpay webhook (Dashboard → Webhooks, events "payment.captured" and "order.paid").
 * Backup for when the customer pays but closes the tab before the site can confirm it.
 * `raw` must be the exact request body: the signature is computed over those bytes.
 */
export const handleWebhook = async (raw: Buffer | undefined, signature: string | undefined) => {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, "Razorpay webhook is not set up.");
  if (!raw?.length || !signature) throw ApiError.badRequest("Missing webhook signature.");
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (!sameHex(signature, expected)) throw ApiError.badRequest("Invalid webhook signature.");

  const event = JSON.parse(raw.toString("utf8")) as {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } }; order?: { entity?: { id?: string } } };
  };
  if (event.event !== "payment.captured" && event.event !== "order.paid") return { handled: false };

  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id || event.payload?.order?.entity?.id;
  if (!razorpayOrderId) return { handled: false };
  const order = await Order.findOne({ razorpayOrderId });
  if (!order) return { handled: false };
  // The amount paid must be this order's total
  if (payment?.amount !== undefined && payment.amount !== Math.round(order.total * 100)) return { handled: false };
  await markPaid(order._id, payment?.id ?? "");
  return { handled: true };
};

// ─── Admin ───────────────────────────────────────────────────────────────────

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ListOrdersQuery {
  search?: string;
  payment?: "pending" | "paid" | "failed";
  status?: string;
  page?: number;
  limit?: number;
}

export const listOrders = async (q: ListOrdersQuery) => {
  const filter: Record<string, unknown> = {};
  if (q.payment) filter.paymentStatus = q.payment;
  if (q.status) filter.status = q.status;
  if (q.search?.trim()) {
    const re = new RegExp(escapeRegex(q.search.trim()), "i");
    filter.$or = [{ orderNumber: re }, { "customer.name": re }, { "customer.mobile": re }, { "customer.email": re }];
  }
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100);
  const page = Math.max(Number(q.page) || 1, 1);
  const [items, total, byPayment] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
    Order.aggregate<{ _id: string; n: number; revenue: number }>([
      { $group: { _id: "$paymentStatus", n: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]),
  ]);
  const counts = Object.fromEntries(byPayment.map((c) => [c._id, c.n]));
  const revenue = byPayment.find((c) => c._id === "paid")?.revenue ?? 0;
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)), counts, revenue };
};

export const updateOrder = async (id: string, input: { status?: string; adminNote?: string }) => {
  const order = await Order.findByIdAndUpdate(id, input, { new: true, runValidators: true }).lean();
  if (!order) throw ApiError.notFound("Order not found.");
  return order;
};

export const deleteOrder = async (id: string) => {
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound("Order not found.");
  if (order.paymentStatus === "paid") throw ApiError.badRequest("A paid order cannot be deleted. Mark it as cancelled instead.");
  await order.deleteOne();
  return { deleted: true };
};
