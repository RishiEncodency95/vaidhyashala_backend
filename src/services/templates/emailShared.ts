import fs from "fs";
import path from "path";

/**
 * Pieces shared by the Vaidhyashala emails (candidate "Application Submitted" and the
 * "Forward to HR" email): contact details, design tokens, images and the common sections.
 * Mail apps drop SVG, absolute positioning and stylesheets, so everything is tables with
 * inline styles. Images live in backend/assets/email/<email>/ and are linked from Cloudinary
 * (assets/email/hosted.json, written by `npm run upload:email-assets`) so emails stay small
 * and open fast; an image missing from hosted.json is attached to the email instead (cid:).
 */

// Shown in the "Need Assistance?" boxes and the footer.
export const EMAIL_CONTACT = {
  website: "www.vaidhyashala.com",
  email: "careers@vaidhyashala.com",
  phone: "+91 98765 43210",
  phoneHours: "Mon – Fri, 10 AM – 6 PM",
  clinic: "Vaidhyashala Clinic",
  address: "Kalkaji, New Delhi – 110019",
  // Social icons link here; leave a URL empty to show that icon without a link.
  social: { linkedin: "", instagram: "", facebook: "", youtube: "" },
};

export const C = {
  green: "#0B6B44",
  greenBright: "#0B8A4F",
  dark: "#0A3D2B",
  heading: "#0D2E26",
  navy: "#1B2A7A",
  label: "#3B4C78",
  card: "#F5F9F3",
  cardLine: "#E3ECE1",
  stepCard: "#F2F8EF",
  blueSoft: "#EAF1FB",
  blueInk: "#1B2468",
  footer: "#013528",
  page: "#EDF2EB",
};
export const FONT = "Lato,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

export const formatDateTime = (d: Date) =>
  new Date(d)
    .toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());

export type Verdict = "ELIGIBLE" | "PARTIAL" | "NOT_ELIGIBLE";

// Same areas and labels as the website's screening result (frontend lib/careersScreening.ts)
export const AREAS: { key: string; label: string; icon: string }[] = [
  { key: "education", label: "Educational Qualification", icon: "b-education" },
  { key: "relevantExperience", label: "Relevant Experience", icon: "b-experience" },
  { key: "skills", label: "Skills Match", icon: "b-skills" },
  { key: "industryExperience", label: "Ayurveda / Healthcare Experience", icon: "b-industry" },
  { key: "roleFit", label: "Role Fit", icon: "b-rolefit" },
  { key: "location", label: "Location", icon: "b-location" },
];

/* ---------------- Images ---------------- */

const ASSET_DIRS = [
  path.resolve(process.cwd(), "assets/email"),
  path.resolve(__dirname, "../../../assets/email"),
  path.resolve(__dirname, "../../../../assets/email"),
];
const assetDir = () => ASSET_DIRS.find((d) => fs.existsSync(d)) ?? null;

const fileCache = new Map<string, Buffer | null>();
const readAsset = (file: string): Buffer | null => {
  if (!fileCache.has(file)) {
    const dir = assetDir();
    const full = dir ? path.join(dir, file) : "";
    fileCache.set(file, full && fs.existsSync(full) ? fs.readFileSync(full) : null);
  }
  return fileCache.get(file) ?? null;
};

let hostedCache: Record<string, string> | undefined;
const hostedUrls = (): Record<string, string> => {
  if (hostedCache === undefined) {
    try {
      const dir = assetDir();
      hostedCache = dir ? JSON.parse(fs.readFileSync(path.join(dir, "hosted.json"), "utf8")) : {};
    } catch {
      hostedCache = {};
    }
  }
  return hostedCache!;
};

export interface InlineImage {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
}

export type ImgFn = (file: string, w: number, h: number, alt?: string, style?: string) => string;

/**
 * Image helpers for one email. `file` is relative to assets/email ("candidate/header.jpg");
 * `icon(name)` is a shared icon from assets/email/candidate. `attachments()` lists the
 * images that had to be embedded because they are not on Cloudinary.
 */
export const createImages = () => {
  const used = new Map<string, string>(); // cid -> asset file
  const img: ImgFn = (file, w, h, alt = "", style = "") => {
    let src = hostedUrls()[file];
    if (!src) {
      if (!readAsset(file)) return alt ? esc(alt) : "";
      const cid = `${file.replace(/[^a-z0-9]/gi, "-")}@vaidhyashala`;
      used.set(cid, file);
      src = `cid:${cid}`;
    }
    return `<img src="${esc(src)}" width="${w}" height="${h}" alt="${esc(alt)}" style="display:block;width:${w}px;height:${h}px;border:0;outline:none;${style}" />`;
  };
  const icon = (name: string, w: number, h: number) => img(`candidate/${name}.png`, w, h);
  const attachments = (): InlineImage[] =>
    [...used].map(([cid, file]) => ({
      filename: path.basename(file),
      content: readAsset(file)!,
      cid,
      contentType: file.endsWith(".jpg") ? "image/jpeg" : "image/png",
    }));
  return { img, icon, attachments };
};

type Images = ReturnType<typeof createImages>;

/* ---------------- Sections ---------------- */

export const sectionHead = (iconHtml: string, title: string, sub = "") => `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="padding-right:12px;">${iconHtml}</td>
      <td valign="middle">
        <div style="font-family:${FONT};font-size:19px;font-weight:700;color:${C.heading};line-height:1.2;">${title}</div>
        ${sub ? `<div style="font-family:${FONT};font-size:12px;color:${C.navy};margin-top:3px;">${esc(sub)}</div>` : ""}
      </td>
    </tr></table>`;

/** A full-width green card holding `inner` rows. */
export const card = (inner: string, padTop = 14) => `
    <tr><td style="padding:${padTop}px 24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.card};border:1px solid ${C.cardLine};border-radius:10px;">
        ${inner}
      </table>
    </td></tr>`;

/** Icon · label over value, on a white rounded row (Application Details). */
export const detailRow = (iconHtml: string, label: string, value: string) => `
    <tr><td style="padding:3px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:6px;">
        <tr>
          <td width="42" align="center" valign="middle" style="padding:8px 0 8px 6px;">${iconHtml}</td>
          <td valign="middle" style="padding:7px 10px 7px 6px;">
            <div style="font-family:${FONT};font-size:11.5px;color:${C.label};">${esc(label)}</div>
            <div style="font-family:${FONT};font-size:13.5px;font-weight:700;color:${C.navy};margin-top:2px;">${value}</div>
          </td>
        </tr>
      </table>
    </td></tr>`;

export const twoColumns = (left: string, right: string) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="50%" valign="top" class="stack" style="padding:0 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${left}</table></td>
      <td width="50%" valign="top" class="stack" style="padding:0 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${right}</table></td>
    </tr></table>`;

export const statusPill = (text: string) =>
  `<span style="display:inline-block;padding:3px 8px;background:#E2F0DC;border-radius:5px;font-weight:400;color:${C.heading};">${esc(text)}</span>`;

/** Score ring (pre-rendered 0–100) beside the eligibility box. */
export const scoreAndVerdict = (
  { img, icon }: Images,
  score: number,
  v: { icon: string; label: string; title: string; color: string; bg: string; text: string }
) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="144" valign="middle" class="stack center" style="padding:4px 12px 4px 0;">${img(`candidate/score/${score}.png`, 132, 132, `${score}% Match Score`)}</td>
            <td valign="middle" class="stack" style="padding:4px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${v.bg};border-radius:8px;">
                <tr>
                  <td width="40" valign="top" style="padding:14px 0 14px 12px;">${icon(v.icon, 28, 28)}</td>
                  <td valign="top" style="padding:14px 14px 14px 10px;">
                    <div style="font-family:${FONT};font-size:14px;font-weight:700;color:${C.heading};">${esc(v.label)}</div>
                    <div style="font-family:${FONT};font-size:19px;font-weight:700;color:${v.color};margin-top:4px;">${esc(v.title)}</div>
                    <div style="font-family:${FONT};font-size:12px;line-height:1.45;color:${C.navy};margin-top:6px;">${esc(v.text)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr></table>`;

/** The six match areas as labelled bars, two per row. */
export const breakdownTable = ({ icon }: Images, breakdown: { key: string; score: number }[]) => {
  const bar = (value: number) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#E3E5E4;border-radius:999px;">
        <tr><td width="${Math.max(value, 1)}%" style="height:8px;line-height:8px;font-size:0;background:${C.green};border-radius:999px;">&nbsp;</td>${
          value < 100 ? `<td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td>` : ""
        }</tr>
      </table>`;
  const cell = (area: (typeof AREAS)[number] | undefined) => {
    if (!area) return `<td width="50%" class="stack" style="padding:6px 8px;">&nbsp;</td>`;
    const value = Math.max(0, Math.min(100, Math.round(breakdown.find((b) => b.key === area.key)?.score ?? 0)));
    return `
        <td width="50%" valign="top" class="stack" style="padding:6px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="34" valign="middle">${icon(area.icon, 24, 21)}</td>
            <td valign="middle">
              <div style="font-family:${FONT};font-size:12px;color:${C.navy};line-height:1.3;">${esc(area.label)}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:5px;"><tr>
                <td valign="middle">${bar(value)}</td>
                <td width="42" align="right" valign="middle" style="font-family:${FONT};font-size:12px;font-weight:700;color:${C.heading};">${value}%</td>
              </tr></table>
            </td>
          </tr></table>
        </td>`;
  };
  const rows = [];
  for (let i = 0; i < AREAS.length; i += 2) rows.push(`<tr>${cell(AREAS[i])}${cell(AREAS[i + 1])}</tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join("")}</table>`;
};

/** Blue "i" note. */
export const infoNote = ({ icon }: Images, text: string) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.blueSoft};border-radius:8px;">
            <tr>
              <td width="34" valign="top" style="padding:10px 0 10px 10px;">${icon("h-info", 24, 24)}</td>
              <td style="padding:10px 12px 10px 4px;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.navy};">${esc(text)}</td>
            </tr>
          </table>`;

/** Ticked list (green check dots). */
export const checkList = ({ icon }: Images, items: string[], color = C.blueInk) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${items
    .map(
      (p) => `
                <tr>
                  <td width="26" valign="top" style="padding:3px 0;">${icon("check-sm", 16, 16)}</td>
                  <td valign="top" style="padding:3px 0;font-family:${FONT};font-size:12.5px;line-height:1.4;color:${color};">${esc(p)}</td>
                </tr>`
    )
    .join("")}</table>`;

/** Four numbered step cards ("What Happens Next?" / "Suggested Next Steps for HR"). */
export const stepsSection = (
  { icon }: Images,
  title: string,
  steps: { icon: string; w: number; h: number; title: string; text: string }[]
) => `
    <tr><td style="padding:20px 24px 4px;">${sectionHead(icon("h-gear", 28, 28), esc(title))}</td></tr>
    <tr><td style="padding:0 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${steps
        .map(
          (st, i) => `
        <td width="25%" valign="top" class="stack" style="padding:4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.stepCard};border:1px solid ${C.cardLine};border-radius:8px;">
            <tr><td style="padding:10px 10px 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td valign="middle" style="width:30px;height:30px;background:${C.greenBright};border-radius:50%;text-align:center;font-family:${FONT};font-size:15px;font-weight:700;color:#FFFFFF;line-height:30px;">${i + 1}</td>
                <td valign="middle" style="padding-left:10px;">${icon(st.icon, st.w, st.h)}</td>
              </tr></table>
              <div style="font-family:${FONT};font-size:13.5px;font-weight:700;color:${C.heading};margin-top:8px;line-height:1.3;">${esc(st.title)}</div>
              <div style="font-family:${FONT};font-size:12px;line-height:1.45;color:${C.navy};margin-top:4px;">${esc(st.text)}</div>
            </td></tr>
          </table>
        </td>`
        )
        .join("")}</tr></table>
    </td></tr>`;

/** Blue "Important …" list beside the green "Need Assistance?" contact box. */
export const infoAndAssistance = (
  images: Images,
  infoTitle: string,
  points: string[],
  assistTitle: string,
  assistText: string
) => {
  const { icon } = images;
  const contact = EMAIL_CONTACT;
  const row = (iconHtml: string, label: string, value: string) => `
                <tr>
                  <td width="26" valign="middle" style="padding:5px 0 5px 10px;">${iconHtml}</td>
                  <td width="80" valign="middle" style="padding:5px 4px;font-family:${FONT};font-size:11.5px;color:#0F2A2C;">${esc(label)}</td>
                  <td valign="middle" style="padding:5px 10px 5px 0;font-family:${FONT};font-size:12px;color:#1B2A68;">${value}</td>
                </tr>`;
  return `
    <tr><td style="padding:12px 20px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="54%" valign="top" class="stack" style="padding:4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.blueSoft};border-radius:10px;">
            <tr><td style="padding:12px 12px 10px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td valign="middle" style="padding-right:10px;">${icon("h-info", 22, 22)}</td>
                <td valign="middle" style="font-family:${FONT};font-size:16px;font-weight:700;color:#0C1456;">${esc(infoTitle)}</td>
              </tr></table>
              <div style="margin-top:8px;">${checkList(images, points)}</div>
            </td></tr>
          </table>
        </td>
        <td width="46%" valign="top" class="stack" style="padding:4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.card};border:1px solid ${C.cardLine};border-radius:10px;">
            <tr><td style="padding:10px 10px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td valign="top" style="padding-right:10px;">${icon("h-lotus", 46, 37)}</td>
                <td valign="top">
                  <div style="font-family:${FONT};font-size:15px;font-weight:700;color:#0A1A14;">${esc(assistTitle)}</div>
                  <div style="font-family:${FONT};font-size:12px;line-height:1.4;color:#1A2552;margin-top:3px;">${esc(assistText)}</div>
                </td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:6px 10px 10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid ${C.cardLine};border-radius:8px;">
                ${row(icon("c-mail", 17, 14), "HR Email", `<a href="mailto:${esc(contact.email)}" style="color:#1B2A68;text-decoration:none;">${esc(contact.email)}</a>`)}
                ${row(
                  icon("c-phone", 15, 15),
                  "HR Phone",
                  `<a href="tel:${esc(contact.phone.replace(/[^\d+]/g, ""))}" style="color:#1B2A68;text-decoration:none;">${esc(
                    contact.phone
                  )}</a><br/><span style="color:${C.green};font-size:11px;">${esc(contact.phoneHours)}</span>`
                )}
                ${row(icon("c-pin", 16, 16), "HR Location", `${esc(contact.clinic)}, <span style="color:${C.green};">${esc(contact.address)}</span>`)}
              </table>
            </td></tr>
          </table>
        </td>
      </tr></table>
    </td></tr>`;
};

/** Sign-off text beside the four value badges. */
export const signOffAndValues = ({ img }: Images, signOffHtml: string) => {
  const values = [
    { icon: "v-ayurveda", label: "Authentic<br/>Ayurveda" },
    { icon: "v-wellness", label: "Holistic<br/>Wellness" },
    { icon: "v-care", label: "Compassionate<br/>Care" },
    { icon: "v-natural", label: "Natural<br/>Living" },
  ];
  return `
    <tr><td style="padding:18px 24px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top" class="stack" style="font-family:${FONT};font-size:14px;line-height:1.55;color:#151B5A;padding-bottom:12px;">${signOffHtml}</td>
        <td width="272" valign="top" class="stack">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${values
            .map(
              (v) => `
            <td width="68" align="center" valign="top">
              ${img(`candidate/${v.icon}.png`, 46, 46, "", "margin:0 auto;")}
              <div style="font-family:${FONT};font-size:10.5px;line-height:1.2;color:#1A2060;margin-top:5px;">${v.label}</div>
            </td>`
            )
            .join("")}</tr></table>
        </td>
      </tr></table>
    </td></tr>`;
};

export const footer = ({ img, icon }: Images, note = "") => {
  const contact = EMAIL_CONTACT;
  const socials = (["linkedin", "instagram", "facebook", "youtube"] as const).map((k) => {
    const label = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook", youtube: "YouTube" }[k];
    const pic = img(`candidate/f-${k}.png`, 30, 30, label);
    const url = contact.social[k];
    return `<td style="padding-right:8px;">${url ? `<a href="${esc(url)}" target="_blank">${pic}</a>` : pic}</td>`;
  });
  const line = (iconName: string, html: string) => `
            <tr>
              <td width="24" valign="middle" style="padding:3px 0;">${icon(iconName, 16, 16)}</td>
              <td valign="middle" style="padding:3px 0;font-family:${FONT};font-size:13px;color:#FFFFFF;">${html}</td>
            </tr>`;
  const link = (href: string, text: string) => `<a href="${esc(href)}" style="color:#FFFFFF;text-decoration:none;">${esc(text)}</a>`;
  return `
    <tr><td style="background:${C.footer};padding:16px 20px;border-radius:28px 28px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="196" valign="middle" class="stack" style="padding:4px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:8px;"><tr>
            <td style="padding:8px 10px;">${img("candidate/footer-logo.png", 172, 40, "Vaidhyashala – Innovative Healing")}</td>
          </tr></table>
        </td>
        <td valign="middle" class="stack" style="padding:4px 0 4px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            ${line("f-globe", link(`https://${contact.website}`, contact.website))}
            ${line("f-mail", link(`mailto:${contact.email}`, contact.email))}
            ${line("f-pin", esc(contact.address))}
          </table>
        </td>
        <td width="160" valign="middle" class="stack" style="padding:4px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${socials.join("")}</tr></table>
          <div style="font-family:${FONT};font-size:12px;color:#FFFFFF;margin-top:8px;white-space:nowrap;">Healing People | Enriching Lives</div>
        </td>
      </tr></table>
      ${
        note
          ? `<div style="font-family:${FONT};font-size:11px;line-height:1.5;color:#9CB8A6;margin-top:10px;border-top:1px solid rgba(255,255,255,.15);padding-top:10px;">${note}</div>`
          : ""
      }
    </td></tr>`;
};

/** The page around an email's rows: head, preheader, 640px card. */
export const emailDocument = (subject: string, preheader: string, rows: string) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${esc(subject)}</title>
<style>
  @media only screen and (max-width:620px) {
    .stack { display:block !important; width:100% !important; box-sizing:border-box; }
    .center img { margin:0 auto !important; }
    .hide-sm { display:none !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:20px 8px;">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:#FEFEFD;border-radius:12px;overflow:hidden;border:1px solid #DDE7DA;">
${rows}
  </table>
</td></tr>
</table>
</body></html>`;
