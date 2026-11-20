import { describe, expect, it } from "vitest";
import { applyCoupon, type Coupon } from "../src/modules/orders/coupons";

const list: Coupon[] = [
  { code: "TEN", type: "percent", value: 10, active: true },
  { code: "CAP", type: "percent", value: 50, maxDiscount: 100, active: true },
  { code: "FLAT", type: "flat", value: 150, minSubtotal: 500, active: true },
  { code: "OLD", type: "percent", value: 10, validUntil: "2026-01-31", active: true },
  { code: "OFF", type: "percent", value: 10, active: false },
];

describe("applyCoupon", () => {
  it("works out percent and flat discounts, case-insensitively", () => {
    expect(applyCoupon("ten", 2720, list)).toEqual({ code: "TEN", discount: 272 });
    expect(applyCoupon("FLAT", 600, list)).toEqual({ code: "FLAT", discount: 150 });
  });

  it("caps a percent coupon at its maximum", () => {
    expect(applyCoupon("CAP", 1000, list).discount).toBe(100);
  });

  it("refuses unknown, switched-off and expired codes", () => {
    expect(() => applyCoupon("NOPE", 1000, list)).toThrow(/not valid/);
    expect(() => applyCoupon("OFF", 1000, list)).toThrow(/not valid/);
    expect(() => applyCoupon("OLD", 1000, list, new Date("2026-02-01T00:00:00+05:30"))).toThrow(/not valid/);
    expect(applyCoupon("OLD", 1000, list, new Date("2026-01-31T22:00:00+05:30")).discount).toBe(100);
  });

  it("explains the minimum order and never discounts below ₹1", () => {
    expect(() => applyCoupon("FLAT", 400, list)).toThrow(/₹500 or more/);
    expect(applyCoupon("FLAT", 500, [{ code: "FLAT", type: "flat", value: 900, active: true }]).discount).toBe(499);
  });
});
