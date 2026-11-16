import {
  C,
  FONT,
  breakdownTable,
  card,
  checkList,
  createImages,
  detailRow,
  emailDocument,
  esc,
  footer,
  formatDateTime,
  infoAndAssistance,
  scoreAndVerdict,
  sectionHead,
  signOffAndValues,
  statusPill,
  stepsSection,
  twoColumns,
  type Verdict,
} from "./emailShared";

/**
 * "Forward to HR" email (admin Applications & AI Response), in the Vaidhyashala HR
 * notification design (admin HRNotificationTemplate, preview at /email-preview/hr-notification). Only the parts the admin ticked in
 * the forward popup are included. Shared pieces are in emailShared.ts.
 */

export interface HrForwardEmailData {
  applicationId: string;
  forwardedBy: string;
  forwardedAt: Date;
  appliedAt: Date | null;
  note: string;
  share: string[];
  candidate: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    photoUrl: string; // public https URL, or "" for none
    totalExperience: string;
    currentCompany: string;
    currentDesignation: string;
    currentCtc: string;
    expectedCtc: string;
    noticePeriod: string;
    willingToRelocate: string;
    skills: string[];
  };
  job: { title: string; department: string };
  analysis: {
    score: number;
    verdict: Verdict;
    summary: string;
    strengths: string[];
    gaps: string[];
    breakdown: { key: string; score: number }[] | null;
  };
  whyInterested: string;
  screeningAnswers: { question: string; answer: string }[];
  cvFileName: string; // empty when no CV is attached
  cvUrl: string; // public link to the CV, or ""
  cvShared: boolean;
}

const VERDICT: Record<Verdict, { icon: string; label: string; title: string; color: string; bg: string; text: string; rec: string }> = {
  ELIGIBLE: {
    icon: "result-eligible",
    label: "AI Result",
    title: "Eligible to Apply",
    color: C.green,
    bg: "#EAF4E6",
    text: "The candidate's profile matches well with the job requirements and qualifications derived from the job description.",
    rec: "Strong Match",
  },
  PARTIAL: {
    icon: "result-partial",
    label: "AI Result",
    title: "Partial Match",
    color: "#B45309",
    bg: "#FEF6E7",
    text: "The candidate meets several key requirements; a few areas need to be verified during review.",
    rec: "Partial Match",
  },
  NOT_ELIGIBLE: {
    icon: "result-review",
    label: "AI Result",
    title: "Not Eligible",
    color: "#B91C1C",
    bg: "#FEF2F2",
    text: "Several key requirements were not found in the candidate's CV. Please review before deciding.",
    rec: "Weak Match",
  },
};

export const renderHrForwardEmail = (d: HrForwardEmailData) => {
  const images = createImages();
  const { img, icon } = images;
  const { candidate: c, job, analysis: a } = d;
  const v = VERDICT[a.verdict];
  const score = Math.max(0, Math.min(100, Math.round(a.score)));
  const shares = (part: string) => d.share.includes(part);
  const subject = `Candidate for review: ${c.name} – ${job.title} (${d.applicationId}) | Vaidhyashala`;
  const link = (href: string, text: string) => `<a href="${esc(href)}" style="color:${C.navy};text-decoration:none;">${esc(text)}</a>`;
  const blocks: string[] = [];

  /* ---------- Note from the person who forwarded ---------- */
  if (d.note) {
    blocks.push(`
    <tr><td style="padding:16px 24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF8EB;border:1px solid #F5E1B8;border-left:4px solid #C99C4B;border-radius:8px;">
        <tr><td style="padding:12px 14px;">
          <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#946C22;">Note from ${esc(d.forwardedBy)}</div>
          <div style="font-family:${FONT};font-size:14px;line-height:1.55;color:${C.heading};margin-top:4px;">${esc(d.note).replace(/\n/g, "<br/>")}</div>
        </td></tr>
      </table>
    </td></tr>`);
  }

  /* ---------- Candidate profile ---------- */
  if (shares("Application Form Details")) {
    const contactLine = (iconHtml: string, html: string) =>
      html
        ? `<tr>
            <td width="30" valign="middle" style="padding:4px 0;">${iconHtml}</td>
            <td valign="middle" style="padding:4px 0;font-family:${FONT};font-size:13.5px;color:${C.navy};">${html}</td>
          </tr>`
        : "";
    const linkedin = c.linkedin ? (c.linkedin.startsWith("http") ? c.linkedin : `https://${c.linkedin}`) : "";
    const photo = c.photoUrl
      ? `<img src="${esc(c.photoUrl)}" width="110" height="124" alt="${esc(c.name)}" style="display:block;width:110px;height:124px;object-fit:cover;border:0;border-radius:7px;" />`
      : `<div style="width:110px;height:124px;line-height:124px;border-radius:7px;background:#E2EEE5;text-align:center;font-family:${FONT};font-size:34px;font-weight:700;color:${C.green};">${esc(
          c.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("") || "?"
        )}</div>`;
    blocks.push(
      card(`
        <tr><td style="padding:14px 16px 6px;">${sectionHead(img("hr/h-user.png", 30, 32), "Candidate Profile")}</td></tr>
        <tr><td style="padding:4px 12px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:8px;"><tr>
            <td width="126" valign="top" style="padding:10px 0 10px 10px;">${photo}</td>
            <td valign="top" style="padding:10px 12px 10px 16px;">
              <div style="font-family:${FONT};font-size:20px;font-weight:700;color:${C.heading};">${esc(c.name)}</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">
                ${contactLine(icon("c-mail", 17, 14), c.email ? link(`mailto:${c.email}`, c.email) : "")}
                ${contactLine(icon("c-phone", 15, 15), c.phone ? link(`tel:${c.phone.replace(/[^\d+]/g, "")}`, c.phone) : "")}
                ${contactLine(icon("c-pin", 16, 16), esc(c.location))}
                ${contactLine(img("hr/p-linkedin.png", 17, 17), linkedin ? link(linkedin, c.linkedin.replace(/^https?:\/\/(www\.)?/, "")) : "")}
              </table>
            </td>
          </tr></table>
        </td></tr>`)
    );
  }

  /* ---------- Application details (always) ---------- */
  const professional = shares("Application Form Details")
    ? ([
        ["Total Experience", c.totalExperience],
        ["Current Company", c.currentCompany],
        ["Current Designation", c.currentDesignation],
        ["Current CTC", c.currentCtc],
        ["Expected CTC", c.expectedCtc],
        ["Notice Period", c.noticePeriod],
        ["Willing to Relocate", c.willingToRelocate],
      ].filter(([, value]) => value && value.trim()) as [string, string][])
    : [];
  const proRows = professional.map(([label, value]) => detailRow(icon("check-sm", 16, 16), label, esc(value)));
  blocks.push(
    card(`
        <tr><td style="padding:14px 16px 6px;">${sectionHead(icon("h-doc", 30, 32), "Application Details")}</td></tr>
        <tr><td style="padding:2px 12px ${proRows.length || c.skills.length ? 4 : 12}px;">${twoColumns(
          [
            detailRow(icon("d-id", 24, 21), "Application ID", esc(d.applicationId)),
            detailRow(img("hr/d-cap.png", 24, 19), "Position Applied For", esc(job.title)),
            job.department ? detailRow(icon("d-briefcase", 24, 21), "Department", esc(job.department)) : "",
          ].join(""),
          [
            detailRow(icon("d-calendar", 22, 22), "Application Date", esc(d.appliedAt ? formatDateTime(d.appliedAt) : "—")),
            detailRow(img("hr/d-cap.png", 24, 19), "Application Source", "Vaidhyashala Careers Portal"),
            detailRow(icon("d-clock", 22, 22), "Application Status", statusPill("Received – Under HR Review")),
          ].join("")
        )}</td></tr>
        ${
          proRows.length
            ? `<tr><td style="padding:8px 16px 2px;font-family:${FONT};font-size:14px;font-weight:700;color:${C.heading};">Professional Details</td></tr>
        <tr><td style="padding:2px 12px ${c.skills.length ? 4 : 12}px;">${twoColumns(
          proRows.filter((_, i) => i % 2 === 0).join(""),
          proRows.filter((_, i) => i % 2 === 1).join("")
        )}</td></tr>`
            : ""
        }
        ${
          shares("Application Form Details") && c.skills.length
            ? `<tr><td style="padding:8px 16px 14px;">
          <div style="font-family:${FONT};font-size:14px;font-weight:700;color:${C.heading};margin-bottom:8px;">Key Skills</div>
          <div style="line-height:30px;">${c.skills
            .map(
              (s) =>
                `<span style="display:inline-block;margin:0 6px 6px 0;padding:3px 10px;background:#E2F0DC;border-radius:6px;font-family:${FONT};font-size:12.5px;font-weight:700;color:${C.green};line-height:20px;">${esc(
                  s
                )}</span>`
            )
            .join("")}</div>
        </td></tr>`
            : ""
        }`)
  );

  /* ---------- AI screening ---------- */
  if (shares("AI Analysis Result")) {
    blocks.push(
      card(`
        <tr><td style="padding:16px 16px 6px;">
          ${sectionHead(icon("h-chart", 40, 40), "AI Screening Result", "Here is the candidate's profile match and analysis based on the job requirements.")}
        </td></tr>
        <tr><td style="padding:6px 16px 4px;">${scoreAndVerdict(images, score, v)}</td></tr>
        ${
          a.breakdown
            ? `<tr><td style="padding:14px 16px 0;">
          ${sectionHead(icon("h-mortar", 34, 34), "Match Breakdown", "Here's how the candidate's profile aligns with the key requirements:")}
        </td></tr>
        <tr><td style="padding:6px 8px 0;">${breakdownTable(images, a.breakdown)}</td></tr>`
            : ""
        }
        ${
          a.strengths.length || a.gaps.length
            ? `<tr><td style="padding:12px 12px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="50%" valign="top" class="stack" style="padding:4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:8px;">
                <tr><td style="padding:12px;">
                  <div style="font-family:${FONT};font-size:14px;font-weight:700;color:${C.heading};margin-bottom:6px;">Key Highlights <span style="font-size:11px;font-weight:400;color:${C.label};">(from CV &amp; AI Analysis)</span></div>
                  ${a.strengths.length ? checkList(images, a.strengths, C.navy) : `<div style="font-family:${FONT};font-size:12.5px;color:${C.label};">—</div>`}
                </td></tr>
              </table>
            </td>
            <td width="50%" valign="top" class="stack" style="padding:4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;">
                <tr><td style="padding:12px;">
                  <div style="font-family:${FONT};font-size:14px;font-weight:700;color:#92400E;margin-bottom:6px;">Areas to Verify</div>
                  ${
                    a.gaps.length
                      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${a.gaps
                          .map(
                            (g) => `<tr>
                    <td width="18" valign="top" style="padding:3px 0;font-family:${FONT};font-size:13px;font-weight:700;color:#D97706;">&#9679;</td>
                    <td valign="top" style="padding:3px 0;font-family:${FONT};font-size:12.5px;line-height:1.4;color:${C.navy};">${esc(g)}</td>
                  </tr>`
                          )
                          .join("")}</table>`
                      : `<div style="font-family:${FONT};font-size:12.5px;color:${C.label};">No gaps flagged.</div>`
                  }
                </td></tr>
              </table>
            </td>
          </tr></table>
        </td></tr>`
            : ""
        }
        <tr><td style="padding:14px 16px 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="middle" style="padding-right:10px;">${img("hr/h-star.png", 22, 22)}</td>
            <td valign="middle" style="font-family:${FONT};font-size:17px;font-weight:700;color:${C.heading};">AI Recommendation</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:4px 12px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EAF4E6;border-radius:8px;"><tr>
            <td width="60" valign="top" style="padding:12px 0 12px 12px;">${img("hr/rec-people.png", 46, 46)}</td>
            <td valign="top" style="padding:12px 14px 12px 12px;">
              <div style="font-family:${FONT};font-size:16px;font-weight:700;color:${v.color};">${esc(v.rec)}</div>
              <div style="font-family:${FONT};font-size:12.5px;line-height:1.5;color:${C.navy};margin-top:4px;">${esc(
                a.summary || v.text
              )} Final decision to be taken by HR after detailed review.</div>
            </td>
          </tr></table>
        </td></tr>`)
    );
  }

  /* ---------- Resume ---------- */
  if (d.cvShared) {
    blocks.push(
      card(`
        <tr><td style="padding:14px 16px 6px;">${sectionHead(icon("h-doc", 30, 32), "Resume &amp; Documents")}</td></tr>
        <tr><td style="padding:4px 12px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:8px;"><tr>
            <td width="44" valign="middle" style="padding:12px 0 12px 12px;">${img("hr/pdf.png", 28, 34)}</td>
            <td valign="middle" style="padding:12px;">
              <div style="font-family:${FONT};font-size:14px;font-weight:700;color:${C.navy};">${esc(d.cvFileName || "Resume could not be attached")}</div>
              <div style="font-family:${FONT};font-size:12px;color:${C.label};margin-top:2px;">${
                d.cvFileName ? "Attached to this email" : "Please view it in the admin panel under Applications &amp; AI Response."
              }</div>
            </td>
            ${
              d.cvUrl
                ? `<td width="140" align="right" valign="middle" style="padding:12px;">
              <a href="${esc(d.cvUrl)}" target="_blank" style="display:inline-block;padding:9px 14px;background:${C.green};border-radius:6px;font-family:${FONT};font-size:13px;font-weight:700;color:#FFFFFF;text-decoration:none;">Download CV</a>
            </td>`
                : ""
            }
          </tr></table>
        </td></tr>`)
    );
  }

  /* ---------- Screening answers ---------- */
  if (shares("Screening Questions & Answers")) {
    const qa = [
      ...(d.whyInterested ? [{ question: "Why are you interested in this role?", answer: d.whyInterested }] : []),
      ...d.screeningAnswers.filter((x) => x.question),
    ];
    blocks.push(
      card(`
        <tr><td style="padding:14px 16px 6px;">${sectionHead(icon("h-doc", 30, 32), "Screening Response")}</td></tr>
        <tr><td style="padding:4px 12px 12px;">${
          qa.length
            ? qa
                .map(
                  (x, i) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:8px;margin-top:${i ? 8 : 0}px;">
            <tr><td style="padding:10px 12px;">
              <div style="font-family:${FONT};font-size:13px;font-weight:700;color:${C.heading};">${esc(x.question)}</div>
              <div style="font-family:${FONT};font-size:13px;line-height:1.55;color:${x.answer ? C.navy : C.label};margin-top:4px;${
                    x.answer ? "" : "font-style:italic;"
                  }">${x.answer ? esc(x.answer).replace(/\n/g, "<br/>") : "Not answered."}</div>
            </td></tr>
          </table>`
                )
                .join("")
            : `<div style="font-family:${FONT};font-size:13px;color:${C.label};font-style:italic;">The candidate did not answer any screening questions.</div>`
        }</td></tr>`)
    );
  }

  const rows = `
    <!-- Header artwork: logo, HR NOTIFICATION, title -->
    <tr><td style="padding:0;">${img(
      "hr/header.jpg",
      640,
      146,
      "Vaidhyashala – HR Notification: New Application Received",
      "width:100%;max-width:640px;height:auto;"
    )}</td></tr>

    <!-- Greeting -->
    <tr><td style="padding:10px 24px 0;">
      <div style="font-family:${FONT};font-size:17px;color:#183649;">Candidate Details, AI Screening Result &amp; Recommendation</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr>
        <td valign="top" class="stack" style="font-family:${FONT};font-size:14px;line-height:1.6;color:${C.navy};">
          <div style="font-size:16px;font-weight:700;">Dear HR Team,</div>
          <div style="margin-top:4px;">
            <b>${esc(d.forwardedBy)}</b> has forwarded an application for the position of <b>${esc(job.title)}</b> at <b>Vaidhyashala</b>.
            Please find below the candidate's profile, AI screening result and analysis. Kindly review the details and take the next steps as per the recruitment process.
          </div>
        </td>
        <td width="170" valign="top" class="hide-sm" style="padding-left:16px;">${img(
          "hr/quote.jpg",
          170,
          99,
          "Be a part of meaningful healthcare that blends tradition with innovation."
        )}</td>
      </tr></table>
    </td></tr>

    ${blocks.join("")}

    ${stepsSection(images, "Suggested Next Steps for HR", [
      { icon: "s-review", w: 30, h: 32, title: "Review Application", text: "Go through the candidate's profile, CV and AI analysis in detail." },
      { icon: "s-shortlist", w: 36, h: 30, title: "Shortlisting Decision", text: "Mark as shortlisted or not shortlisted in the recruitment system." },
      { icon: "s-interview", w: 30, h: 30, title: "Schedule Interview", text: "If shortlisted, coordinate for initial interview (phone / video / in-person)." },
      { icon: "s-final", w: 32, h: 28, title: "Update Candidate", text: "Share the status with the candidate via email through the system." },
    ])}

    ${infoAndAssistance(
      images,
      "Important Note",
      [
        "The AI screening score is a preliminary assessment and does not guarantee selection.",
        "Final shortlisting and recruitment decisions are to be made by the HR team.",
        "Please verify the candidate's qualifications, experience and documents as per company policy.",
        "Keep the candidate updated through the recruitment system.",
      ],
      "Need Any Assistance?",
      "If you need any further information or have queries regarding this application, please feel free to reach out to the recruitment team."
    )}

    ${signOffAndValues(
      images,
      `Please update the candidate's status in the admin panel once reviewed.<br/><br/>
          Warm regards,<br/>
          <b style="color:#0B1040;">Talent Acquisition Team</b><br/>
          <b style="color:#0B1040;">Vaidhyashala – Innovative Healing</b>`
    )}

    ${footer(
      images,
      `Forwarded by ${esc(d.forwardedBy)} on ${esc(formatDateTime(d.forwardedAt))} IST. This email contains confidential candidate information intended only for the hiring team. Please do not share it outside the organisation.`
    )}`;

  const html = emailDocument(subject, `${c.name} · ${job.title} · ${score}% ${v.rec} — forwarded by ${d.forwardedBy}`, rows);

  // Plain-text version for mail apps that don't show HTML.
  const lines = [
    `Candidate forwarded for review: ${c.name} – ${job.title} (${d.applicationId})`,
    `Forwarded by ${d.forwardedBy} on ${formatDateTime(d.forwardedAt)} IST`,
    d.note ? `\nNote: ${d.note}` : "",
    shares("Application Form Details")
      ? `\nEmail: ${c.email}\nPhone: ${c.phone}\nLocation: ${c.location}\nExperience: ${c.totalExperience}\nNotice period: ${c.noticePeriod}\nExpected CTC: ${c.expectedCtc}`
      : "",
    shares("AI Analysis Result") ? `\nAI match: ${score}% (${v.title})\n${a.summary}` : "",
    shares("Screening Questions & Answers") && d.whyInterested ? `\nWhy interested: ${d.whyInterested}` : "",
    d.cvShared ? (d.cvFileName ? `\nResume attached: ${d.cvFileName}` : "\nResume could not be attached.") : "",
    "\n— Talent Acquisition Team, Vaidhyashala – Innovative Healing",
  ];

  return { subject, html, text: lines.filter(Boolean).join("\n"), attachments: images.attachments() };
};
