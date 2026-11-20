import { ApiError } from "../../utils/ApiError";

/**
 * Website coupon codes. The discount is always worked out here on the server, from the
 * database prices, so the amount Razorpay charges always matches what the customer sees.
 *
 * To add a coupon, add one line below. To stop one, set `active: false` (or delete the line).
 */
export interface Coupon {
  code: string;
  /** "percent": `value`% off the subtotal. "flat": ₹`value` off. */
  type: "percent" | "flat";
  value: number;
  /** Smallest subtotal (₹) the coupon works on */
  minSubtotal?: number;
  /** Largest discount (₹) a percent coupon can give */
  maxDiscount?: number;
  /** Last day the coupon works (YYYY-MM-DD, inclusive, India time) */
  validUntil?: string;
  active: boolean;
}

export const COUPONS: Coupon[] = [{ code: "WELLNESS10", type: "percent", value: 10, active: true }];

const money = (n: number) => Math.round(n * 100) / 100;

const expired = (c: Coupon, now: Date) => {
  if (!c.validUntil) return false;
  // End of that day in India (UTC+5:30)
  return now.getTime() > new Date(`${c.validUntil}T23:59:59.999+05:30`).getTime();
};

/** The coupon's discount on this subtotal, or an error the customer can read */
export const applyCoupon = (rawCode: string, subtotal: number, list: Coupon[] = COUPONS, now = new Date()) => {
  const code = rawCode.trim().toUpperCase();
  const coupon = list.find((c) => c.code.toUpperCase() === code);
  if (!coupon || !coupon.active || expired(coupon, now)) throw ApiError.badRequest("This coupon code is not valid.");
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    throw ApiError.badRequest(`This coupon works on orders of ₹${coupon.minSubtotal.toLocaleString("en-IN")} or more.`);
  }
  let discount = coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.type === "percent" && coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  // Never more than the order itself, and Razorpay needs at least ₹1
  discount = money(Math.max(0, Math.min(discount, subtotal - 1)));
  return { code: coupon.code, discount };
};
