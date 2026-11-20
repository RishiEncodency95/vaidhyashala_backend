import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const text = (max: number) => z.string().trim().max(max);

export const createOrderSchema = z.object({
  body: z
    .object({
      customer: z.object({
        name: text(100).min(1, "Please enter your name"),
        mobile: z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, "Please enter a valid mobile number"),
        email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
      }),
      address: z.object({
        line1: text(200).min(1, "Please enter your address"),
        line2: text(200).optional(),
        city: text(100).min(1, "Please enter your city"),
        state: text(100).min(1, "Please enter your state"),
        pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits"),
      }),
      /** Customer's delivery instructions (optional) */
      notes: text(500).optional(),
      /** Coupon the customer applied; the server checks it again and works out the discount */
      couponCode: text(30).optional(),
      // Only the product and how many: prices always come from the database
      items: z.array(z.object({ id: objectId, qty: z.number().int().min(1).max(20) })).min(1, "Your cart is empty").max(50),
    })
    .strict(),
});

export const couponSchema = z.object({
  body: z
    .object({
      code: text(30).min(1, "Please enter a coupon code"),
      items: z.array(z.object({ id: objectId, qty: z.number().int().min(1).max(20) })).min(1, "Your cart is empty").max(50),
    })
    .strict(),
});

export const verifyPaymentSchema = z.object({
  body: z
    .object({
      orderId: objectId,
      razorpay_order_id: text(100).min(1),
      razorpay_payment_id: text(100).min(1),
      razorpay_signature: text(200).min(1),
    })
    .strict(),
});

export const orderIdSchema = z.object({ params: z.object({ id: objectId }) });

export const updateOrderSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      status: z.enum(["new", "confirmed", "shipped", "delivered", "cancelled"]).optional(),
      adminNote: text(1000).optional(),
    })
    .strict(),
});
