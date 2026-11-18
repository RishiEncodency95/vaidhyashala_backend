import { describe, expect, it } from "vitest";
import { renderOrderAdminEmail, renderOrderConfirmationEmail } from "../src/services/templates/orderEmail";

const order = {
  orderNumber: "VDS-TEST1",
  createdAt: new Date("2026-11-18T10:00:00Z"),
  customer: { name: "Asha <script>", mobile: "9999999999", email: "asha@example.com" },
  address: { line1: "12 MG Road", line2: "", city: "Delhi", state: "Delhi", pincode: "110019" },
  items: [{ title: "Triphala Juice", price: 450, mrp: 600, qty: 2 }],
  subtotal: 900,
  discount: 300,
  total: 900,
  razorpayPaymentId: "pay_1",
};

describe("order email templates", () => {
  it("customer email shows the order, items, discount and total", () => {
    const m = renderOrderConfirmationEmail(order);
    expect(m.subject).toContain("VDS-TEST1");
    expect(m.html).toContain("Triphala Juice");
    expect(m.html).toContain("&#8377;1,200"); // M.R.P. total
    expect(m.html).toContain("&#8377;300");
    expect(m.text).toContain("Total paid: Rs. 900");
  });
  it("escapes customer-typed text", () => {
    const m = renderOrderConfirmationEmail(order);
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("Asha &lt;script&gt;");
  });
  it("clinic email has the customer contact and payment id", () => {
    const m = renderOrderAdminEmail(order);
    expect(m.subject).toContain("Rs. 900");
    expect(m.html).toContain("9999999999");
    expect(m.html).toContain("pay_1");
  });
});
