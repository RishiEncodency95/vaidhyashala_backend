import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* Orders: the cart total is built from database prices, Razorpay is opened for that total,
   and only a correctly signed payment marks the order paid. No database or network is used. */

const h = vi.hoisted(() => ({
  env: { RAZORPAY_KEY_ID: "rzp_test_key", RAZORPAY_KEY_SECRET: "secret123" } as Record<string, string | undefined>,
  products: [] as Record<string, unknown>[],
  orders: new Map<string, Record<string, unknown>>(),
  sendOrderEmails: vi.fn(),
}));

vi.mock("../src/config/env", () => ({ env: h.env }));
vi.mock("../src/services/orderEmail.service", () => ({ sendOrderEmails: h.sendOrderEmails }));
vi.mock("../src/models/products/Product.model", () => ({
  Product: {
    find: (filter: { _id: { $in: string[] } }) => ({
      lean: async () => h.products.filter((p) => filter._id.$in.includes(String(p._id)) && p.isActive !== false),
    }),
  },
}));
vi.mock("../src/models/products/Order.model", () => {
  const makeDoc = (data: Record<string, unknown>) => {
    const doc: Record<string, unknown> = {
      ...data,
      save: async () => {
        h.orders.set(String(doc._id), doc);
        return doc;
      },
      toObject: () => ({ ...doc }),
    };
    return doc;
  };
  return {
    Order: {
      create: async (data: Record<string, unknown>) => {
        const doc = makeDoc({ _id: `order${h.orders.size + 1}`, paymentStatus: "pending", status: "new", ...data });
        h.orders.set(String(doc._id), doc);
        return doc;
      },
      findById: async (id: string) => h.orders.get(id) ?? null,
      findByIdAndUpdate: async (id: string, patch: Record<string, unknown>) => {
        const doc = h.orders.get(id);
        if (doc) Object.assign(doc, patch);
        return doc;
      },
    },
  };
});

import { createOrder, verifyPayment } from "../src/modules/orders/orders.service";

const P1 = "6ad1afbd55cbafe58ac0a94f";
const P2 = "6ad1afbd55cbafe58ac0a950";
const customer = { name: "Asha", mobile: "9999999999", email: "asha@example.com" };
const address = { line1: "12 MG Road", city: "Delhi", state: "Delhi", pincode: "110019" };
const sign = (orderId: string, paymentId: string, secret = "secret123") =>
  crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  h.env.RAZORPAY_KEY_ID = "rzp_test_key";
  h.env.RAZORPAY_KEY_SECRET = "secret123";
  h.orders.clear();
  h.sendOrderEmails.mockReset();
  h.products = [
    { _id: P1, title: "Triphala Juice", image: "a.webp", price: 450, mrp: 600, isActive: true },
    { _id: P2, title: "Herbal Tea", image: "b.webp", price: 200, mrp: 0, isActive: true },
  ];
  fetchMock = vi.fn(async (_url: string, init: { body: string }) => ({
    ok: true,
    json: async () => ({ id: "order_rzp_1", amount: JSON.parse(init.body).amount, currency: "INR" }),
  }));
  vi.stubGlobal("fetch", fetchMock);
});

describe("createOrder", () => {
  it("totals the cart from database prices and opens Razorpay for that amount in paise", async () => {
    const res = await createOrder({ customer, address, items: [{ id: P1, qty: 2 }, { id: P2, qty: 1 }] });

    expect(res.total).toBe(1100); // 2 × 450 + 1 × 200
    expect(res.razorpay).toMatchObject({ keyId: "rzp_test_key", orderId: "order_rzp_1", amount: 110000, currency: "INR" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.razorpay.com/v1/orders");
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from("rzp_test_key:secret123").toString("base64")}`);
    expect(JSON.parse(init.body)).toMatchObject({ amount: 110000, currency: "INR", receipt: res.orderNumber });

    const saved = h.orders.get(res.orderId)!;
    expect(saved.subtotal).toBe(1100);
    expect(saved.discount).toBe(300); // (600 − 450) × 2; Herbal Tea has no MRP so no discount
    expect(saved.razorpayOrderId).toBe("order_rzp_1");
    expect(saved.paymentStatus).toBe("pending");
  });

  it("merges the same product listed twice and caps the quantity at 20", async () => {
    const res = await createOrder({ customer, address, items: [{ id: P1, qty: 15 }, { id: P1, qty: 15 }] });
    const saved = h.orders.get(res.orderId)! as { items: { qty: number }[] };
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0].qty).toBe(20);
    expect(res.total).toBe(9000);
  });

  it("refuses a product without a price", async () => {
    h.products[0].price = 0;
    await expect(createOrder({ customer, address, items: [{ id: P1, qty: 1 }] })).rejects.toThrow(/cannot be ordered online/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a hidden or missing product", async () => {
    h.products[0].isActive = false;
    await expect(createOrder({ customer, address, items: [{ id: P1, qty: 1 }] })).rejects.toThrow(/no longer available/);
  });

  it("explains when Razorpay keys are not set", async () => {
    h.env.RAZORPAY_KEY_SECRET = undefined;
    await expect(createOrder({ customer, address, items: [{ id: P1, qty: 1 }] })).rejects.toMatchObject({ statusCode: 503 });
  });

  it("marks the order failed when Razorpay refuses", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(createOrder({ customer, address, items: [{ id: P1, qty: 1 }] })).rejects.toMatchObject({ statusCode: 502 });
    expect([...h.orders.values()][0].paymentStatus).toBe("failed");
  });
});

describe("verifyPayment", () => {
  const placeOrder = () => createOrder({ customer, address, items: [{ id: P1, qty: 1 }] });

  it("marks the order paid and sends the emails for a correct signature", async () => {
    const { orderId } = await placeOrder();
    const res = await verifyPayment({
      orderId,
      razorpay_order_id: "order_rzp_1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: sign("order_rzp_1", "pay_1"),
    });
    expect(res.total).toBe(450);
    const saved = h.orders.get(orderId)!;
    expect(saved).toMatchObject({ paymentStatus: "paid", status: "confirmed", razorpayPaymentId: "pay_1" });
    expect(h.sendOrderEmails).toHaveBeenCalledOnce();
  });

  it("rejects a wrong signature and marks the order failed", async () => {
    const { orderId } = await placeOrder();
    await expect(
      verifyPayment({ orderId, razorpay_order_id: "order_rzp_1", razorpay_payment_id: "pay_1", razorpay_signature: sign("order_rzp_1", "pay_1", "other") }),
    ).rejects.toThrow(/could not be verified/);
    expect(h.orders.get(orderId)!.paymentStatus).toBe("failed");
    expect(h.sendOrderEmails).not.toHaveBeenCalled();
  });

  it("rejects a signature for a different Razorpay order", async () => {
    const { orderId } = await placeOrder();
    await expect(
      verifyPayment({ orderId, razorpay_order_id: "order_other", razorpay_payment_id: "pay_1", razorpay_signature: sign("order_other", "pay_1") }),
    ).rejects.toThrow(/Order not found/);
  });

  it("does not send emails twice when the same payment is confirmed again", async () => {
    const { orderId } = await placeOrder();
    const body = { orderId, razorpay_order_id: "order_rzp_1", razorpay_payment_id: "pay_1", razorpay_signature: sign("order_rzp_1", "pay_1") };
    await verifyPayment(body);
    await verifyPayment(body);
    expect(h.sendOrderEmails).toHaveBeenCalledOnce();
  });
});
