import nodemailer from "nodemailer";
import EmailLog from "../models/careers/EmailLog.model";
import { renderCandidateSubmittedEmail, type CandidateSubmittedEmailData } from "./templates/candidateSubmittedEmail";

export interface SendApplicationEmailOptions {
  recipientEmail: string;
  candidateName: string;
  jobTitle: string;
  applicationId: string;
  matchScore: number;
  submittedAt: Date;
}

export const getTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("⚠️ SMTP credentials not fully configured.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

export interface CandidateConfirmationEmailOptions extends SendApplicationEmailOptions {
  preferredLocation: string;
  screening: CandidateSubmittedEmailData["screening"];
}

// "Your Application Has Been Successfully Submitted!" — sent when a candidate submits on the careers website
export const sendCandidateConfirmationEmail = async (options: CandidateConfirmationEmailOptions): Promise<boolean> => {
  const { recipientEmail, candidateName, jobTitle, applicationId, submittedAt, preferredLocation, screening } = options;
  const { subject, html, text, attachments } = renderCandidateSubmittedEmail({
    candidateName,
    jobTitle,
    applicationId,
    submittedAt,
    preferredLocation,
    screening,
  });

  const fromName = process.env.FROM_NAME || "Vaidhyashala Careers";
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || "careers@vaidhyashala.com";

  // Create Email Log
  const log = await EmailLog.create({
    recipient: recipientEmail,
    subject,
    template: "CANDIDATE_APPLICATION_CONFIRMATION",
    status: "QUEUED",
  });

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[EMAIL SKIPPED] No SMTP credentials. Email log ID: ${log._id}`);
    log.status = "FAILED";
    log.error = "SMTP credentials not configured";
    await log.save();
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      html,
      text,
      attachments,
    });

    log.status = "SENT";
    log.sentAt = new Date();
    await log.save();
    return true;
  } catch (err) {
    console.error("Failed to send candidate email:", err);
    log.status = "FAILED";
    log.error = (err as Error).message;
    await log.save();
    return false;
  }
};

export const sendAdminNotificationEmail = async (
  options: SendApplicationEmailOptions
): Promise<boolean> => {
  const adminEmail = process.env.CONTACT_ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return false;

  const { recipientEmail, candidateName, jobTitle, applicationId, matchScore } = options;
  const subject = `New Job Application Received: ${applicationId} - ${candidateName}`;

  const html = `
  <h3>New Candidate Application</h3>
  <p><strong>Application ID:</strong> ${applicationId}</p>
  <p><strong>Candidate Name:</strong> ${candidateName}</p>
  <p><strong>Candidate Email:</strong> ${recipientEmail}</p>
  <p><strong>Applied Position:</strong> ${jobTitle}</p>
  <p><strong>Match Score:</strong> ${matchScore}%</p>
  <p>Log into the admin portal to review full CV analysis and profile snapshot.</p>
  `;

  const transporter = getTransporter();
  if (!transporter) return false;

  try {
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'Vaidhyashala Careers'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: adminEmail,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("Admin notification email error:", err);
    return false;
  }
};

export interface SendHrForwardEmailOptions {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  text?: string;
  // `cid` marks an image shown inside the email (the logo) rather than a downloadable file.
  attachments?: { filename: string; content: Buffer; cid?: string; contentType?: string }[];
}

// "Forward to HR" from admin Applications & AI Response; recipients come from
// Career Settings → HR & Workflow with their To / CC / BCC choice.
export const sendHrForwardEmail = async (options: SendHrForwardEmailOptions): Promise<{ sent: boolean; error?: string }> => {
  const { to, cc, bcc, subject, html, text, attachments } = options;
  if (to.length === 0) return { sent: false, error: "No To recipient" };

  const log = await EmailLog.create({
    recipient: [...to, ...cc.map((e) => `cc:${e}`), ...bcc.map((e) => `bcc:${e}`)].join(", "),
    subject,
    template: "HR_FORWARD_APPLICATION",
    status: "QUEUED",
  });

  const transporter = getTransporter();
  if (!transporter) {
    log.status = "FAILED";
    log.error = "SMTP credentials not configured";
    await log.save();
    return { sent: false, error: "SMTP credentials not configured" };
  }

  const fromName = process.env.FROM_NAME || "Vaidhyashala Careers";
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || "careers@vaidhyashala.com";
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject,
      html,
      text,
      attachments,
    });
    log.status = "SENT";
    log.sentAt = new Date();
    await log.save();
    return { sent: true };
  } catch (err) {
    console.error("HR forward email error:", err);
    log.status = "FAILED";
    log.error = (err as Error).message;
    await log.save();
    return { sent: false, error: (err as Error).message };
  }
};
