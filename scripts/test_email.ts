import dotenv from "dotenv";
import { getTransporter } from "../src/services/email.service";
import { renderCandidateSubmittedEmail } from "../src/services/templates/candidateSubmittedEmail";

dotenv.config();

// Checks the SMTP settings in .env and sends the candidate "Application Submitted" email
// with sample data. Usage: npm run test:email -- you@example.com
async function run() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npm run test:email -- you@example.com");
    process.exit(1);
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.error("❌ SMTP_USER / SMTP_PASS are empty in backend/.env");
    process.exit(1);
  }

  console.log(`Connecting to ${process.env.SMTP_HOST || "smtp.gmail.com"}:${process.env.SMTP_PORT || "587"} as ${process.env.SMTP_USER}...`);
  await transporter.verify();
  console.log("✅ SMTP login works");

  const email = renderCandidateSubmittedEmail({
    candidateName: "Test Candidate",
    jobTitle: "Ayurvedic Doctor",
    applicationId: "TEST-000001",
    submittedAt: new Date(),
    preferredLocation: "Delhi NCR",
    screening: {
      score: 85,
      verdict: "ELIGIBLE",
      breakdown: [
        { key: "education", score: 100 },
        { key: "relevantExperience", score: 85 },
        { key: "skills", score: 90 },
        { key: "industryExperience", score: 80 },
        { key: "roleFit", score: 80 },
        { key: "location", score: 75 },
      ],
    },
  });

  const fromName = process.env.FROM_NAME || "Vaidhyashala Careers";
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: `[TEST] ${email.subject}`,
    html: email.html,
    text: email.text,
    attachments: email.attachments,
  });
  console.log(`✅ Test email sent to ${to} (${info.messageId}). Check the inbox, and Spam the first time.`);
}

run().catch((err) => {
  console.error("❌ Email test failed:", err.message);
  if (/535|Invalid login|Username and Password not accepted/i.test(err.message)) {
    console.error("   → Wrong SMTP_USER / SMTP_PASS. For Gmail, use the 16-letter App Password (no spaces).");
  } else if (/ETIMEDOUT|ECONNREFUSED|ECONNECTION/i.test(err.message)) {
    console.error("   → Could not reach the mail server. Check SMTP_HOST, or try SMTP_PORT=465.");
  }
  process.exit(1);
});
