import { Request, Response } from "express";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bharatorganicexpo.com";

// Static pages with their SEO priority and changeFreq
const staticPages = [
  { path: "", priority: 1.0, changeFreq: "weekly" },
  { path: "/about", priority: 0.9, changeFreq: "monthly" },
  { path: "/contact", priority: 0.8, changeFreq: "monthly" },
  { path: "/careers", priority: 0.6, changeFreq: "monthly" },
];

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function buildSitemapXml(
  urls: Array<{
    loc: string;
    lastmod: string;
    changefreq: string;
    priority: number;
  }>
): string {
  const urlsXml = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlsXml}
</urlset>`;
}

export async function generateSitemapXml(_req: Request, res: Response) {
  try {
    const today = toISODate(new Date());

    const staticEntries = staticPages.map((page) => ({
      loc: `${SITE_URL}${page.path}`,
      lastmod: today,
      changefreq: page.changeFreq,
      priority: page.priority,
    }));

    const xml = buildSitemapXml(staticEntries);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    return res.status(200).send(xml);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate sitemap",
    });
  }
}
