import mongoose, { Document, Schema, Types } from "mongoose";

export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface IOrderItem {
  product: Types.ObjectId;
  title: string;
  image: string;
  /** Price per unit when the order was placed (taken from the database, never from the browser) */
  price: number;
  mrp: number;
  qty: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: { name: string; mobile: string; email: string };
  address: { line1: string; line2: string; city: string; state: string; pincode: string };
  items: IOrderItem[];
  /** Customer's delivery instructions */
  notes: string;
  subtotal: number;
  /** Product discounts (M.R.P. − price) */
  discount: number;
  /** Coupon the customer used ("" = none) and what it took off the subtotal */
  couponCode: string;
  couponDiscount: number;
  total: number;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: OrderStatus;
  /** Clinic-only note (courier, call outcome …) */
  adminNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const str = { type: String, trim: true, default: "" };

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { name: str, mobile: str, email: str },
    address: { line1: str, line2: str, city: str, state: str, pincode: str },
    notes: str,
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        title: str,
        image: str,
        price: { type: Number, required: true },
        mrp: { type: Number, default: 0 },
        qty: { type: Number, required: true, min: 1 },
        _id: false,
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: str,
    couponDiscount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending", index: true },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: String,
    status: { type: String, enum: ["new", "confirmed", "shipped", "delivered", "cancelled"], default: "new", index: true },
    adminNote: str,
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", orderSchema);
