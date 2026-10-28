import Seo, { ISeo } from "../../models/seo.model";

// Website addresses: local dev (the frontend's own port) and the live domain
const LOCAL_BASE_URL = (process.env.SITE_URL || process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
const LIVE_BASE_URL = (process.env.LIVE_SITE_URL || "https://www.vaidhyashala.com").replace(/\/+$/, "");
const SITE_NAME = "Vaidhyashala";
const DEFAULT_DESCRIPTION =
  "Doctor consultations, Panchakarma therapies, yoga and authentic Ayurvedic medicines at Vaidhyashala, with care tailored to you.";
const DEFAULT_KEYWORDS =
  "Vaidhyashala, Ayurvedic clinic, Panchakarma centre, Ayurvedic doctor, Ayurvedic treatments, Ayurvedic medicines, yoga";
const DEFAULT_OG_IMAGE = "/home/h1.webp";

/** CMS page keys whose website path is not "/<key>" (used when the admin does not send the path) */
const PAGE_PATHS: Record<string, string> = { home: "/", home2: "/home", home1: "/blog", "about-us": "/about" };

export function normalizePageKey(key: string): string {
  let cleaned = (key || "").toLowerCase().trim().replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned === "home" || cleaned === "index") {
    return "home";
  }
  return cleaned;
}

export function getBaseUrl(envType?: string): string {
  if (envType === "local" || process.env.NODE_ENV !== "production") {
    return LOCAL_BASE_URL;
  }
  return LIVE_BASE_URL;
}

/** "/home/h1.webp" -> "<base>/home/h1.webp"; full URLs are kept */
const absoluteUrl = (baseUrl: string, url: string) => (/^(https?:)?\/\//i.test(url) ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`);

const escapeAttr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function generateSeoDefaults(
  pageKey: string,
  envType: "local" | "live" = "local",
  customTitle?: string,
  customDesc?: string,
  options: { path?: string; ogImage?: string } = {}
) {
  const normKey = normalizePageKey(pageKey);
  const baseUrl = envType === "live" ? LIVE_BASE_URL : LOCAL_BASE_URL;
  // The admin sends the page's own website path; otherwise it is worked out from the key
  const rawPath = (options.path ?? PAGE_PATHS[normKey] ?? `/${normKey}`).trim();
  const path = rawPath === "/" || rawPath === "" ? "" : `/${rawPath.replace(/^\/+/, "")}`;
  // "/" and "/home" are the same Home page: its canonical address is the root
  const isHome = path === "" || path === "/home";
  const fullUrl = isHome ? `${baseUrl}/` : `${baseUrl}${path}`;

  const pageName = (path.split("/").pop() || "home").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const metaTitle =
    customTitle || (isHome ? `${SITE_NAME} | Ayurvedic Clinic & Panchakarma Centre` : `${pageName} | ${SITE_NAME}`);
  const metaDescription = customDesc || DEFAULT_DESCRIPTION;
  const metaKeywords = DEFAULT_KEYWORDS;

  const canonicalUrl = fullUrl;
  const canonicalTag = `<link rel="canonical" href="${fullUrl}" />`;

  const ogImage = absoluteUrl(baseUrl, options.ogImage?.trim() || DEFAULT_OG_IMAGE);

  const openGraphTags = `<meta property="og:title" content="${escapeAttr(metaTitle)}" />
<meta property="og:description" content="${escapeAttr(metaDescription)}" />
<meta property="og:url" content="${fullUrl}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:image" content="${ogImage}" />`;

  const organization = { "@type": "Organization", name: SITE_NAME, url: baseUrl };
  const schemaMarkup = JSON.stringify(
    isHome
      ? {
          "@context": "https://schema.org",
          "@type": "MedicalClinic",
          name: SITE_NAME,
          description: metaDescription,
          url: fullUrl,
          image: ogImage,
          medicalSpecialty: "Ayurveda",
        }
      : {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: metaTitle,
          description: metaDescription,
          url: fullUrl,
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: baseUrl },
          publisher: organization,
        },
    null,
    2
  );

  return {
    page: normKey,
    metaTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    canonicalTag,
    openGraphTags,
    schemaMarkup,
    ogTitle: metaTitle,
    ogDescription: metaDescription,
    ogImage,
    robotsIndex: true,
    robotsFollow: true,
    isActive: true,
    envType,
  };
}

export const seoService = {
  async getSeoByPage(pageKey: string, envType: "local" | "live" = "local") {
    const normKey = normalizePageKey(pageKey);
    let existing = await Seo.findOne({ page: normKey });
    if (!existing && !normKey.includes("/")) {
      existing = await Seo.findOne({ page: `participate/${normKey}` }) || await Seo.findOne({ page: `about/${normKey}` });
    } else if (!existing && normKey.includes("/")) {
      const parts = normKey.split("/");
      const lastPart = parts[parts.length - 1];
      existing = await Seo.findOne({ page: lastPart });
    }

    if (existing) {
      const data = existing.toObject();
      const defaults = generateSeoDefaults(normKey, envType, data.metaTitle, data.metaDescription);

      let canonicalUrl = (data.canonicalUrl || "").trim();
      let canonicalTag = (data.canonicalTag || "").trim();

      if (!canonicalUrl && !canonicalTag) {
        canonicalUrl = defaults.canonicalUrl;
        canonicalTag = defaults.canonicalTag;
      } else if (!canonicalTag && canonicalUrl) {
        canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />`;
      } else if (canonicalTag && !canonicalUrl) {
        const match = canonicalTag.match(/href=["']([^"']+)["']/i);
        canonicalUrl = match ? match[1] : canonicalTag.replace(/<[^>]*>/g, "").trim();
      }

      // Convert domain if standard domain and envType is specified
      if (envType === "local") {
        canonicalUrl = canonicalUrl.replace(LIVE_BASE_URL, LOCAL_BASE_URL);
        canonicalTag = canonicalTag.replace(LIVE_BASE_URL, LOCAL_BASE_URL);
      } else if (envType === "live") {
        canonicalUrl = canonicalUrl.replace(/http:\/\/(localhost|127\.0\.0\.1):\d+/, LIVE_BASE_URL);
        canonicalTag = canonicalTag.replace(/http:\/\/(localhost|127\.0\.0\.1):\d+/, LIVE_BASE_URL);
      }

      return {
        ...defaults,
        ...data,
        canonicalUrl: canonicalUrl || defaults.canonicalUrl,
        canonicalTag: canonicalTag || defaults.canonicalTag,
        openGraphTags: data.openGraphTags || defaults.openGraphTags,
        schemaMarkup: data.schemaMarkup || defaults.schemaMarkup,
      };
    }

    // Default fallback
    return generateSeoDefaults(normKey, envType);
  },

  async getAllSeo() {
    return Seo.find().sort({ updatedAt: -1 });
  },

  async upsertSeo(data: any) {
    const normKey = normalizePageKey(data.page || "home");
    const payload: Partial<ISeo> = {
      page: normKey,
      metaTitle: data.metaTitle || "",
      metaDescription: data.metaDescription || "",
      metaKeywords: data.metaKeywords || "",
      canonicalUrl: data.canonicalUrl || "",
      canonicalTag: data.canonicalTag || "",
      openGraphTags: data.openGraphTags || "",
      schemaMarkup: data.schemaMarkup || "",
      ogTitle: data.ogTitle || data.metaTitle || "",
      ogDescription: data.ogDescription || data.metaDescription || "",
      ogImage: data.ogImage || "",
      robotsIndex: data.robotsIndex !== false,
      robotsFollow: data.robotsFollow !== false,
      isActive: data.isActive !== false,
      updatedBy: data.updatedBy || "Admin User",
    };

    const updated = await Seo.findOneAndUpdate(
      { page: normKey },
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return updated;
  },

  autoGenerate(
    pageKey: string,
    envType: "local" | "live",
    title?: string,
    desc?: string,
    options: { path?: string; ogImage?: string } = {}
  ) {
    return generateSeoDefaults(pageKey, envType, title, desc, options);
  },
};
