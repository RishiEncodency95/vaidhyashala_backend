import { C, EMAIL_CONTACT, FONT, esc, formatDateTime } from "./emailShared";

/**
 * Order emails, sent once Razorpay confirms the payment (modules/orders/orders.service.ts):
 *  - customer: "Your order is confirmed" with the items, totals and delivery address
 *  - clinic:   "New paid order" so the team can pack and deliver it
 * Tables + inline styles only, like the other Vaidhyashala emails.
 */

export interface OrderEmailData {
  orderNumber: string;
  createdAt: Date;
  customer: { name: string; mobile: string; email: string };
  address: { line1: string; line2: string; city: string; state: string; pincode: string };
  items: { title: string; price: number; mrp: number; qty: number }[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  couponDiscount?: number;
  total: number;
  razorpayPaymentId?: string;
}

const rupees = (n: number) => `&#8377;${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const plainRupees = (n: number) => `Rs. ${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const addressLines = (a: OrderEmailData["address"]) =>
  [a.line1, a.line2, `${a.city}, ${a.state} - ${a.pincode}`].filter(Boolean);

const itemsTable = (d: OrderEmailData) => {
  const rows = d.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${C.cardLine};font:600 14px ${FONT};color:${C.heading};">
          ${esc(i.title)}<br><span style="font:400 12px ${FONT};color:#6B7A71;">${rupees(i.price)} &times; ${i.qty}</span>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${C.cardLine};font:700 14px ${FONT};color:${C.heading};white-space:nowrap;">
          ${rupees(i.price * i.qty)}
        </td>
      </tr>`,
    )
    .join("");
  const line = (label: string, value: string, style = `font:400 14px ${FONT};color:#4A5950;`) => `
      <tr>
        <td style="padding:6px 0;${style}">${label}</td>
        <td align="right" style="padding:6px 0;${style}">${value}</td>
      </tr>`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows}
      ${line("M.R.P. total", rupees(d.subtotal + d.discount))}
      ${d.discount > 0 ? line("Discount", `&minus; ${rupees(d.discount)}`, `font:600 14px ${FONT};color:${C.green};`) : ""}
      ${d.couponDiscount ? line(`Coupon (${esc(d.couponCode || "")})`, `&minus; ${rupees(d.couponDiscount)}`, `font:600 14px ${FONT};color:${C.green};`) : ""}
      ${line("Total paid", rupees(d.total), `font:800 17px ${FONT};color:${C.dark};border-top:2px solid ${C.cardLine};padding-top:10px;`)}
    </table>`;
};

const shell = (title: string, intro: string, body: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
        <tr><td style="background:${C.dark};padding:22px 28px;font:700 20px ${FONT};color:#ffffff;">The Vaidhyashala</td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 8px;font:800 22px ${FONT};color:${C.heading};">${esc(title)}</h1>
          <p style="margin:0 0 20px;font:400 14px/1.6 ${FONT};color:#4A5950;">${intro}</p>
          ${body}
        </td></tr>
        <tr><td style="background:${C.footer};padding:18px 28px;font:400 12px/1.6 ${FONT};color:#C9D8CF;">
          ${esc(EMAIL_CONTACT.clinic)} &middot; ${esc(EMAIL_CONTACT.address)}<br>
          ${esc(EMAIL_CONTACT.phone)} &middot; ${esc(EMAIL_CONTACT.website)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const infoBox = (label: string, html: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:${C.card};border:1px solid ${C.cardLine};border-radius:10px;">
    <tr><td style="padding:14px 16px;">
      <div style="font:700 11px ${FONT};letter-spacing:1px;text-transform:uppercase;color:#6B7A71;">${label}</div>
      <div style="margin-top:6px;font:400 14px/1.6 ${FONT};color:${C.heading};">${html}</div>
    </td></tr>
  </table>`;

/** To the customer */
export const renderOrderConfirmationEmail = (d: OrderEmailData) => {
  const subject = `Order confirmed: ${d.orderNumber} | The Vaidhyashala`;
  const body = `
    ${infoBox("Order", `<b>${esc(d.orderNumber)}</b> &middot; ${esc(formatDateTime(d.createdAt))}`)}
    <div style="margin-top:18px;">${itemsTable(d)}</div>
    ${infoBox("Delivery address", `${esc(d.customer.name)}<br>${addressLines(d.address).map(esc).join("<br>")}<br>${esc(d.customer.mobile)}`)}
    <p style="margin:20px 0 0;font:400 13px/1.6 ${FONT};color:#6B7A71;">Our team will call you to confirm delivery. Use the products as directed on the label or by your doctor.</p>`;
  const html = shell(
    "Thank you, your order is confirmed!",
    `Hi ${esc(d.customer.name)}, we have received your payment of <b>${rupees(d.total)}</b>.`,
    body,
  );
  const text = [
    `Hi ${d.customer.name}, your order ${d.orderNumber} is confirmed.`,
    "",
    ...d.items.map((i) => `${i.title} x ${i.qty} = ${plainRupees(i.price * i.qty)}`),
    d.discount > 0 ? `Discount: -${plainRupees(d.discount)}` : "",
    d.couponDiscount ? `Coupon (${d.couponCode}): -${plainRupees(d.couponDiscount)}` : "",
    `Total paid: ${plainRupees(d.total)}`,
    "",
    "Delivery address:",
    d.customer.name,
    ...addressLines(d.address),
    d.customer.mobile,
    "",
    `${EMAIL_CONTACT.clinic} · ${EMAIL_CONTACT.phone}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { subject, html, text };
};

/** To the clinic */
export const renderOrderAdminEmail = (d: OrderEmailData) => {
  const subject = `New paid order ${d.orderNumber} - ${plainRupees(d.total)} - ${d.customer.name}`;
  const body = `
    ${infoBox(
      "Customer",
      `${esc(d.customer.name)}<br>${esc(d.customer.mobile)}${d.customer.email ? `<br>${esc(d.customer.email)}` : ""}`,
    )}
    ${infoBox("Deliver to", addressLines(d.address).map(esc).join("<br>"))}
    <div style="margin-top:18px;">${itemsTable(d)}</div>
    ${d.razorpayPaymentId ? `<p style="margin:16px 0 0;font:400 12px ${FONT};color:#6B7A71;">Razorpay payment: ${esc(d.razorpayPaymentId)}</p>` : ""}`;
  const html = shell(
    `New order ${d.orderNumber}`,
    `Payment of <b>${rupees(d.total)}</b> received on ${esc(formatDateTime(d.createdAt))}. Open Admin &rarr; Orders to manage it.`,
    body,
  );
  const text = [
    `New paid order ${d.orderNumber}: ${plainRupees(d.total)}`,
    `Customer: ${d.customer.name}, ${d.customer.mobile} ${d.customer.email}`,
    `Address: ${addressLines(d.address).join(", ")}`,
    ...d.items.map((i) => `${i.title} x ${i.qty} = ${plainRupees(i.price * i.qty)}`),
  ].join("\n");
  return { subject, html, text };
};
