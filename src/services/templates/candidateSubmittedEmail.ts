import {
  C,
  FONT,
  EMAIL_CONTACT,
  breakdownTable,
  card,
  createImages,
  detailRow,
  emailDocument,
  esc,
  footer,
  formatDateTime,
  infoAndAssistance,
  infoNote,
  scoreAndVerdict,
  sectionHead,
  signOffAndValues,
  statusPill,
  stepsSection,
  twoColumns,
  type Verdict,
} from "./emailShared";

/**
 * "Your Application Has Been Successfully Submitted!" email sent to the candidate when they
 * submit a job application on the careers website. Same design as the admin's
 * CandidateApplicationSubmittedTemplate (preview at /email-preview/candidate-application-submitted);
 * shared pieces are in emailShared.ts.
 */

export type CandidateVerdict = Verdict;

export interface CandidateSubmittedEmailData {
  candidateName: string;
  jobTitle: string;
  applicationId: string;
  submittedAt: Date;
  preferredLocation: string;
  // null when the candidate applied without a CV screening, or the job hides the score
  screening: null | {
    score: number;
    verdict: CandidateVerdict;
    // null when the job hides the match breakdown from candidates
    breakdown: { key: string; score: number }[] | null;
  };
}

const VERDICT: Record<CandidateVerdict, { icon: string; label: string; title: string; color: string; bg: string; text: string }> = {
  ELIGIBLE: {
    icon: "result-eligible",
    label: "Eligibility Result",
    title: "Eligible to Apply",
    color: C.green,
    bg: "#EAF4E6",
    text: "You are eligible to apply for this position based on our AI screening.",
  },
  PARTIAL: {
    icon: "result-partial",
    label: "Eligibility Result",
    title: "Partial Match",
    color: "#B45309",
    bg: "#FEF6E7",
    text: "Your profile matches several key requirements. Our team will review it in full.",
  },
  NOT_ELIGIBLE: {
    icon: "result-review",
    label: "Eligibility Result",
    title: "Under HR Review",
    color: "#475569",
    bg: "#F1F5F9",
    text: "Some key requirements were not found in your CV. Our team will still review your full application.",
  },
};

export const renderCandidateSubmittedEmail = (d: CandidateSubmittedEmailData) => {
  const images = createImages();
  const { img, icon } = images;
  const contact = EMAIL_CONTACT;
  const s = d.screening;
  const score = s ? Math.max(0, Math.min(100, Math.round(s.score))) : 0;
  const verdict = s ? VERDICT[s.verdict] : null;
  const subject = `Application Received – ${d.jobTitle} (${d.applicationId}) | Vaidhyashala`;
  const submittedOn = formatDateTime(d.submittedAt);

  const details = twoColumns(
    [
      detailRow(icon("d-id", 24, 21), "Application ID", esc(d.applicationId)),
      detailRow(icon("d-briefcase", 24, 21), "Position Applied For", esc(d.jobTitle)),
      detailRow(icon("d-pin", 22, 22), "Preferred Location", esc(d.preferredLocation || "—")),
    ].join(""),
    [
      detailRow(icon("d-calendar", 22, 22), "Application Date", esc(submittedOn)),
      s ? detailRow(icon("d-people", 26, 21), "AI Profile Match", `<span style="color:${C.green};">${score}%</span>`) : "",
      detailRow(icon("d-clock", 22, 22), "Application Status", statusPill("Received – Awaiting HR Review")),
    ].join("")
  );

  const screening =
    s && verdict
      ? card(`
        <tr><td style="padding:16px 16px 6px;">
          ${sectionHead(icon("h-chart", 40, 40), "AI Screening Result", "Here is your profile match and analysis for the applied position.")}
        </td></tr>
        <tr><td style="padding:6px 16px 4px;">${scoreAndVerdict(images, score, verdict)}</td></tr>
        ${
          s.breakdown
            ? `<tr><td style="padding:14px 16px 0;">
          ${sectionHead(icon("h-mortar", 34, 34), "Match Breakdown", "Here's how your profile aligns with the job requirements:")}
        </td></tr>
        <tr><td style="padding:6px 8px 0;">${breakdownTable(images, s.breakdown)}</td></tr>`
            : ""
        }
        <tr><td style="padding:12px;">${infoNote(
          images,
          "This is a preliminary AI assessment based on the information provided in your application. Final recruitment decisions are made by our authorised recruitment team after a complete review of your application, documents and further evaluation."
        )}</td></tr>`)
      : "";

  const rows = `
    <!-- Header artwork with logo and title -->
    <tr><td style="padding:0;">${img(
      "candidate/header.jpg",
      640,
      251,
      "Vaidhyashala – Your Application Has Been Successfully Submitted!",
      "width:100%;max-width:640px;height:auto;"
    )}</td></tr>

    <!-- Greeting -->
    <tr><td style="padding:18px 24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top" class="stack" style="font-family:${FONT};font-size:14px;line-height:1.6;color:${C.navy};">
          <div style="font-size:18px;">Dear <b>${esc(d.candidateName)}</b>,</div>
          <div style="font-weight:700;margin-top:4px;">Namo Gange Namaskar!</div>
          <div style="margin-top:6px;">
            Thank you for your interest in becoming a part of <b>Vaidhyashala – Innovative Healing.</b>
            We are pleased to confirm that your application has been successfully received for the position of
            <b>${esc(d.jobTitle)}</b>. We appreciate the time and effort you have invested in sharing your professional
            qualifications, experience and aspirations with us.
          </div>
        </td>
        <td width="170" valign="top" class="hide-sm" style="padding-left:16px;">${img(
          "candidate/quote.jpg",
          170,
          111,
          "Be a part of meaningful healthcare that blends tradition with innovation."
        )}</td>
      </tr></table>
    </td></tr>

    ${card(
      `<tr><td style="padding:14px 16px 6px;">${sectionHead(icon("h-doc", 30, 32), "Your Application Details")}</td></tr>
        <tr><td style="padding:2px 12px 12px;">${details}</td></tr>`,
      18
    )}

    ${screening}

    ${stepsSection(images, "What Happens Next?", [
      { icon: "s-review", w: 30, h: 32, title: "Application Review", text: "Our recruitment team will review your application, qualifications and AI screening report." },
      { icon: "s-shortlist", w: 36, h: 30, title: "Shortlisting", text: "Candidates whose profiles align with the requirements may be shortlisted for further evaluation." },
      { icon: "s-interview", w: 30, h: 30, title: "Interview & Assessment", text: "If shortlisted, our HR team will contact you through your registered email or mobile number." },
      { icon: "s-final", w: 32, h: 28, title: "Final Communication", text: "You will receive further updates as the recruitment process progresses." },
    ])}

    ${infoAndAssistance(
      images,
      "Important Information",
      [
        "Your Application ID is your reference number for future correspondence.",
        s ? "Your AI screening score is a preliminary assessment and does not guarantee selection." : "",
        "Final recruitment decisions are made by our authorised recruitment team.",
        "Please monitor your registered email address for further updates.",
      ].filter(Boolean),
      "Need Assistance?",
      "If you have any queries regarding your application, please feel free to contact our HR Department."
    )}

    ${signOffAndValues(
      images,
      `We look forward to exploring the possibility of welcoming you to our team.<br/><br/>
          Warm regards,<br/>
          <b style="color:#0B1040;">Talent Acquisition Team</b><br/>
          <b style="color:#0B1040;">Vaidhyashala – Innovative Healing</b>`
    )}

    ${footer(images)}`;

  const html = emailDocument(subject, `Your application for ${d.jobTitle} has been received. Application ID: ${d.applicationId}.`, rows);

  const text = [
    `Dear ${d.candidateName},`,
    "",
    "Namo Gange Namaskar!",
    "",
    `Thank you for your interest in becoming a part of Vaidhyashala – Innovative Healing. We are pleased to confirm that your application has been successfully received for the position of ${d.jobTitle}.`,
    "",
    `Application ID: ${d.applicationId}`,
    `Position Applied For: ${d.jobTitle}`,
    `Preferred Location: ${d.preferredLocation || "—"}`,
    `Application Date: ${submittedOn}`,
    ...(s && verdict ? [`AI Profile Match: ${score}% (${verdict.title})`] : []),
    "Application Status: Received – Awaiting HR Review",
    "",
    "What happens next: our recruitment team will review your application. If shortlisted, our HR team will contact you through your registered email or mobile number.",
    "",
    `Need assistance? ${contact.email} · ${contact.phone} (${contact.phoneHours})`,
    "",
    "Warm regards,",
    "Talent Acquisition Team",
    "Vaidhyashala – Innovative Healing",
  ];

  return { subject, html, text: text.join("\n"), attachments: images.attachments() };
};
