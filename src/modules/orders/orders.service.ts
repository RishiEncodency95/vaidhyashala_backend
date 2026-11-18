import crypto from "crypto";
import { Product } from "../../models/products/Product.model";
import { Order } from "../../models/products/Order.model";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";
import { sendOrderEmails } from "../../services/orderEmail.service";

interface CreateOrderInput {
  customer: { name: string; mobile: string; email?: string };
  address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  items: { id: string; qty: number }[];
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

/** Builds the order from the database's prices and opens a Razorpay payment for the total */
export const createOrder = async (input: CreateOrderInput) => {
  const { keyId, keySecret } = keys();

  // Same product twice in the list -> one line
  const qtyById = new Map<string, number>();
  for (const i of input.items) qtyById.set(i.id, Math.min(20, (qtyById.get(i.id) ?? 0) + i.qty));

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
  const number = orderNumber();

  const order = await Order.create({
    orderNumber: number,
    customer: { ...input.customer, email: input.customer.email ?? "" },
    address: { ...input.address, line2: input.address.line2 ?? "" },
    items,
    subtotal,
    discount,
    total: subtotal,
  });

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount: Math.round(subtotal * 100), currency: "INR", receipt: number }),
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
    total: subtotal,
    razorpay: { keyId, orderId: rz.id, amount: rz.amount, currency: rz.currency },
  };
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
  const given = Buffer.from(input.razorpay_signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    order.paymentStatus = "failed";
    await order.save();
    throw ApiError.badRequest("Payment could not be verified. If money was deducted, please contact the clinic.");
  }
  order.paymentStatus = "paid";
  order.status = "confirmed";
  order.razorpayPaymentId = input.razorpay_payment_id;
  await order.save();
  void sendOrderEmails(order.toObject());
  return { orderNumber: order.orderNumber, total: order.total };
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
