import { z } from "zod";

const text = (max = 500) => z.string().trim().max(max);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")
  .max(160);

// ─── Sections (every field optional: a save may send only what changed) ─────

export const sectionSchemas = {
  hero: z
    .object({
      isActive: z.boolean(),
      breadcrumbHomeLabel: text(60),
      breadcrumbHomeHref: text(300),
      breadcrumbCurrentLabel: text(80),
      titleLine1: text(120),
      titleLine2: text(120),
      titleAccent: text(10),
      subtitle: text(400),
      backgroundImage: text(1000),
      backgroundImageAlt: text(300),
    })
    .partial()
    .strict(),
  searchFilter: z
    .object({
      isActive: z.boolean(),
      searchPlaceholder: text(120),
      allCategoryLabel: text(40),
      noResultsMessage: text(200),
    })
    .partial()
    .strict(),
  featured: z
    .object({
      isActive: z.boolean(),
      eyebrow: text(80),
      buttonLabel: text(60),
      decorativeImage: text(1000),
      decorativeImageAlt: text(300),
    })
    .partial()
    .strict(),
  articlesSection: z
    .object({
      isActive: z.boolean(),
      eyebrow: text(80),
      heading: text(200),
      notice: text(300),
      readMoreLabel: text(60),
      loadMoreLabel: text(60),
      initialCount: z.number().int().min(1).max(60),
      loadMoreStep: z.number().int().min(1).max(60),
    })
    .partial()
    .strict(),
  cta: z
    .object({
      isActive: z.boolean(),
      heading: text(200),
      subtitle: text(400),
      buttonLabel: text(60),
      buttonLink: text(300),
      backgroundImage: text(1000),
      backgroundImageAlt: text(300),
    })
    .partial()
    .strict(),
};

export const sectionParamSchema = z.object({
  params: z.object({ section: z.enum(["hero", "searchFilter", "featured", "articlesSection", "cta"]) }),
});

// ─── SEO ─────────────────────────────────────────────────────────────────────

export const seoSchema = z.object({
  body: z
    .object({
      metaTitle: text(120),
      metaDescription: text(320),
      metaKeywords: text(500),
      canonicalUrl: text(500),
      ogTitle: text(100),
      ogDescription: text(250),
      ogImage: text(1000),
      robotsIndex: z.boolean(),
      robotsFollow: z.boolean(),
      schemaMarkup: z
        .string()
        .max(20000)
        .refine((v) => {
          if (!v.trim()) return true;
          try {
            JSON.parse(v);
            return true;
          } catch {
            return false;
          }
        }, "Schema markup must be valid JSON-LD"),
      canonicalTag: text(1000),
      openGraphTags: z.string().max(20000),
      h1Tag: text(200),
      breadcrumbName: text(120),
    })
    .partial()
    .strict(),
});

// ─── Publish box + Page Settings ────────────────────────────────────────────

export const publishSchema = z.object({
  body: z
    .object({
      // The website home page can never be unpublished
      status: z.literal("Published", { message: "The homepage cannot be unpublished" }),
      visibility: z.enum(["Public", "Private"]),
      publishedAt: z.coerce.date(),
      author: text(120),
      showInNavigation: z.boolean(),
      menuOrder: z.coerce.number().int().min(0).max(999),
    })
    .partial()
    .strict(),
});

// ─── Categories ──────────────────────────────────────────────────────────────

const categoryBody = z.object({
  name: text(60).min(1, "Name is required"),
  slug: slug.optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const createCategorySchema = z.object({ body: categoryBody.strict() });
export const updateCategorySchema = z.object({
  params: z.object({ id: objectId }),
  body: categoryBody.partial().strict(),
});

// ─── Articles ────────────────────────────────────────────────────────────────

const articleBody = z.object({
  title: text(200).min(1, "Title is required"),
  slug: slug.optional(),
  excerpt: text(1000).optional(),
  category: objectId,
  image: text(1000).optional(),
  imageAlt: text(300).optional(),
  link: text(500).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const createArticleSchema = z.object({ body: articleBody.strict() });
export const updateArticleSchema = z.object({
  params: z.object({ id: objectId }),
  body: articleBody.partial().strict(),
});

export const idParamSchema = z.object({ params: z.object({ id: objectId }) });

export type CategoryInput = z.infer<typeof categoryBody>;
export type ArticleInput = z.infer<typeof articleBody>;
