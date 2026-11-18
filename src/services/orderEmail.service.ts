import EmailLog from "../models/careers/EmailLog.model";
import { getTransporter } from "./email.service";
import { renderOrderAdminEmail, renderOrderConfirmationEmail, type OrderEmailData } from "./templates/orderEmail";

const send = async (to: string, template: string, mail: { subject: string; html: string; text: string }) => {
  const log = await EmailLog.create({ recipient: to, subject: mail.subject, template, status: "QUEUED" });
  const transporter = getTransporter();
  if (!transporter) {
    log.status = "FAILED";
    log.error = "SMTP credentials not configured";
    await log.save();
    return false;
  }
  try {
    const fromName = process.env.FROM_NAME || "The Vaidhyashala";
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
    await transporter.sendMail({ from: `"${fromName}" <${fromEmail}>`, to, ...mail });
    log.status = "SENT";
    log.sentAt = new Date();
    await log.save();
    return true;
  } catch (err) {
    console.error(`[${template}] email failed:`, err);
    log.status = "FAILED";
    log.error = (err as Error).message;
    await log.save();
    return false;
  }
};

/** Customer confirmation (when they gave an email) + clinic notification. Never throws. */
export const sendOrderEmails = async (order: OrderEmailData) => {
  try {
    const jobs: Promise<boolean>[] = [];
    if (order.customer.email) jobs.push(send(order.customer.email, "ORDER_CONFIRMATION", renderOrderConfirmationEmail(order)));
    const adminEmail = process.env.ORDER_ADMIN_EMAIL || process.env.CONTACT_ADMIN_EMAIL || process.env.SMTP_USER;
    if (adminEmail) jobs.push(send(adminEmail, "ORDER_ADMIN_NOTIFICATION", renderOrderAdminEmail(order)));
    await Promise.all(jobs);
  } catch (err) {
    console.error("Order emails failed:", err);
  }
};
