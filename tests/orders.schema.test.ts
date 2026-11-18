import { describe, expect, it } from "vitest";
import { createOrderSchema, updateOrderSchema, verifyPaymentSchema } from "../src/modules/orders/orders.schema";

const ok = {
  customer: { name: "Asha", mobile: "+91 99999 99999", email: "" },
  address: { line1: "12 MG Road", city: "Delhi", state: "Delhi", pincode: "110019" },
  items: [{ id: "6ad1afbd55cbafe58ac0a94f", qty: 2 }],
};
const parse = (body: unknown) => createOrderSchema.safeParse({ body });

describe("checkout form validation", () => {
  it("accepts a normal order", () => expect(parse(ok).success).toBe(true));
  it("rejects an empty cart", () => expect(parse({ ...ok, items: [] }).success).toBe(false));
  it("rejects a 5-digit pincode", () => expect(parse({ ...ok, address: { ...ok.address, pincode: "11001" } }).success).toBe(false));
  it("rejects a bad mobile number", () => expect(parse({ ...ok, customer: { ...ok.customer, mobile: "abc" } }).success).toBe(false));
  it("rejects quantity above 20", () => expect(parse({ ...ok, items: [{ ...ok.items[0], qty: 21 }] }).success).toBe(false));
  it("rejects a price sent from the browser at the top level", () => expect(parse({ ...ok, total: 1 }).success).toBe(false));
  it("ignores a price inside an item (prices always come from the database)", () => {
    const r = parse({ ...ok, items: [{ ...ok.items[0], price: 1 }] });
    expect(r.success && "price" in r.data.body.items[0]).toBe(false);
  });
  it("needs all Razorpay fields to verify", () =>
    expect(verifyPaymentSchema.safeParse({ body: { orderId: ok.items[0].id, razorpay_order_id: "x" } }).success).toBe(false));
  it("only allows known order statuses in the admin", () => {
    const params = { id: ok.items[0].id };
    expect(updateOrderSchema.safeParse({ params, body: { status: "shipped" } }).success).toBe(true);
    expect(updateOrderSchema.safeParse({ params, body: { status: "lost" } }).success).toBe(false);
  });
});
