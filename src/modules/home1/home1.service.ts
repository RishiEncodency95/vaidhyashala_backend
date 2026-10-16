import { Types } from "mongoose";
import { Home1Page } from "../../models/home1/Home1Page.model";
import { Home1Category } from "../../models/home1/Home1Category.model";
import { Home1Article } from "../../models/home1/Home1Article.model";
import { ApiError } from "../../utils/ApiError";
import {
  HOME1_PAGE_KEY,
  Home1SectionKey,
  defaultHome1Sections,
  defaultHome1Seo,
  defaultHome1Categories,
  defaultHome1Articles,
} from "./home1.defaults";
import { ArticleInput, CategoryInput } from "./home1.schema";

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── Page (sections + SEO) ───────────────────────────────────────────────────

/** The page document, created from the website defaults the first time it is read */
const getOrCreatePage = async () => {
  const existing = await Home1Page.findOne({ key: HOME1_PAGE_KEY });
  if (existing) return existing;
  return Home1Page.create({ key: HOME1_PAGE_KEY, sections: defaultHome1Sections, seo: defaultHome1Seo });
};

export const getPage = async () => {
  const page = await getOrCreatePage();
  return page.toObject();
};

export const updateSection = async (section: Home1SectionKey, data: Record<string, unknown>, updatedBy?: string) => {
  await getOrCreatePage();
  const $set: Record<string, unknown> = { updatedBy };
  for (const [field, value] of Object.entries(data)) $set[`sections.${section}.${field}`] = value;

  const page = await Home1Page.findOneAndUpdate({ key: HOME1_PAGE_KEY }, { $set }, { new: true, runValidators: true });
  return page!.toObject().sections[section];
};

export const updateSeo = async (data: Record<string, unknown>, updatedBy?: string) => {
  await getOrCreatePage();
  const $set: Record<string, unknown> = { updatedBy };
  for (const [field, value] of Object.entries(data)) $set[`seo.${field}`] = value;

  const page = await Home1Page.findOneAndUpdate({ key: HOME1_PAGE_KEY }, { $set }, { new: true, runValidators: true });
  return page!.toObject().seo;
};

export const updatePublish = async (data: Record<string, unknown>, updatedBy?: string) => {
  await getOrCreatePage();
  const $set: Record<string, unknown> = { updatedBy };
  for (const [field, value] of Object.entries(data)) $set[`publish.${field}`] = value;

  const page = await Home1Page.findOneAndUpdate({ key: HOME1_PAGE_KEY }, { $set }, { new: true, runValidators: true });
  return page!.toObject().publish;
};

/** The website's own content, for "Sync / Reset Website Data" in the editor (nothing is saved) */
export const getDefaults = () => ({ sections: defaultHome1Sections, seo: defaultHome1Seo });

// ─── Categories ──────────────────────────────────────────────────────────────

const assertCategorySlugFree = async (slug: string, exceptId?: string) => {
  const clash = await Home1Category.findOne({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).lean();
  if (clash) throw ApiError.badRequest(`A category with the slug "${slug}" already exists.`);
};

export const listCategories = async (onlyActive = false) => {
  const categories = await Home1Category.find(onlyActive ? { isActive: true } : {})
    .sort({ order: 1, name: 1 })
    .lean();
  const counts = await Home1Article.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  return categories.map((c) => ({ ...c, articleCount: countMap.get(String(c._id)) ?? 0 }));
};

export const createCategory = async (input: CategoryInput) => {
  const slug = input.slug || slugify(input.name);
  if (!slug) throw ApiError.badRequest("Please give the category a name with letters or numbers.");
  await assertCategorySlugFree(slug);
  const order = input.order ?? (await Home1Category.countDocuments()) + 1;
  return (await Home1Category.create({ ...input, slug, order })).toObject();
};

export const updateCategory = async (id: string, input: Partial<CategoryInput>) => {
  const category = await Home1Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found.");

  if (input.slug !== undefined || input.name !== undefined) {
    const nextSlug = input.slug || (input.name ? slugify(input.name) : category.slug);
    if (nextSlug !== category.slug) await assertCategorySlugFree(nextSlug, id);
    category.slug = nextSlug;
  }
  if (input.name !== undefined) category.name = input.name;
  if (input.order !== undefined) category.order = input.order;
  if (input.isActive !== undefined) category.isActive = input.isActive;
  await category.save();
  return category.toObject();
};

export const deleteCategory = async (id: string) => {
  const category = await Home1Category.findById(id);
  if (!category) throw ApiError.notFound("Category not found.");
  const inUse = await Home1Article.countDocuments({ category: id });
  if (inUse > 0) {
    throw ApiError.badRequest(
      `This category is used by ${inUse} article${inUse === 1 ? "" : "s"}. Move or delete those articles first.`
    );
  }
  await category.deleteOne();
  return { deleted: true };
};

// ─── Articles ────────────────────────────────────────────────────────────────

const assertArticleSlugFree = async (slug: string, exceptId?: string) => {
  const clash = await Home1Article.findOne({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).lean();
  if (clash) throw ApiError.badRequest(`An article with the slug "${slug}" already exists.`);
};

const assertCategoryExists = async (categoryId: string) => {
  const exists = await Home1Category.exists({ _id: categoryId });
  if (!exists) throw ApiError.badRequest("The selected category does not exist.");
};

/** Only one article can be featured: featuring one un-features the rest */
const clearOtherFeatured = (keepId: Types.ObjectId | string) =>
  Home1Article.updateMany({ _id: { $ne: keepId }, isFeatured: true }, { $set: { isFeatured: false } });

export interface ListArticlesQuery {
  search?: string;
  category?: string; // id or slug
  status?: "active" | "inactive";
  featured?: "true" | "false";
  page?: number;
  limit?: number;
}

export const listArticles = async (query: ListArticlesQuery, publicView = false) => {
  const filter: Record<string, unknown> = {};

  if (publicView) filter.isActive = true;
  else if (query.status === "active") filter.isActive = true;
  else if (query.status === "inactive") filter.isActive = false;

  if (query.featured === "true") filter.isFeatured = true;
  else if (query.featured === "false") filter.isFeatured = false;

  if (query.category && query.category !== "all") {
    const category = Types.ObjectId.isValid(query.category)
      ? await Home1Category.findById(query.category).lean()
      : await Home1Category.findOne({ slug: query.category.toLowerCase() }).lean();
    if (!category || (publicView && !category.isActive)) {
      return { items: [], total: 0, page: 1, limit: query.limit ?? 0, totalPages: 0 };
    }
    filter.category = category._id;
  } else if (publicView) {
    const activeIds = await Home1Category.find({ isActive: true }).distinct("_id");
    filter.category = { $in: activeIds };
  }

  if (query.search?.trim()) {
    const re = new RegExp(escapeRegex(query.search.trim()), "i");
    const matchingCategoryIds = await Home1Category.find({ name: re }).distinct("_id");
    filter.$or = [{ title: re }, { excerpt: re }, { category: { $in: matchingCategoryIds } }];
  }

  const limit = Math.min(Math.max(Number(query.limit) || 0, 0), 100);
  const page = Math.max(Number(query.page) || 1, 1);

  const total = await Home1Article.countDocuments(filter);
  let cursor = Home1Article.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .populate("category", "name slug isActive");
  if (limit > 0) cursor = cursor.skip((page - 1) * limit).limit(limit);
  const items = await cursor.lean();

  return { items, total, page, limit, totalPages: limit > 0 ? Math.ceil(total / limit) : 1 };
};

export const getArticle = async (id: string) => {
  const article = await Home1Article.findById(id).populate("category", "name slug isActive").lean();
  if (!article) throw ApiError.notFound("Article not found.");
  return article;
};

export const getPublicArticleBySlug = async (slug: string) => {
  const article = await Home1Article.findOne({ slug: slug.toLowerCase(), isActive: true })
    .populate("category", "name slug isActive")
    .lean();
  if (!article) throw ApiError.notFound("Article not found.");
  return article;
};

export const createArticle = async (input: ArticleInput) => {
  await assertCategoryExists(input.category);
  const slug = input.slug || slugify(input.title);
  if (!slug) throw ApiError.badRequest("Please give the article a title with letters or numbers.");
  await assertArticleSlugFree(slug);
  const order = input.order ?? (await Home1Article.countDocuments()) + 1;

  const article = await Home1Article.create({ ...input, slug, order });
  if (article.isFeatured) await clearOtherFeatured(article._id);
  return getArticle(String(article._id));
};

export const updateArticle = async (id: string, input: Partial<ArticleInput>) => {
  const article = await Home1Article.findById(id);
  if (!article) throw ApiError.notFound("Article not found.");

  if (input.category) await assertCategoryExists(input.category);
  if (input.slug !== undefined && input.slug !== article.slug) {
    await assertArticleSlugFree(input.slug, id);
  }

  const { category, ...rest } = input;
  Object.assign(article, rest);
  if (category) article.category = new Types.ObjectId(category);
  await article.save();

  if (article.isFeatured) await clearOtherFeatured(article._id);
  return getArticle(id);
};

export const deleteArticle = async (id: string) => {
  const article = await Home1Article.findByIdAndDelete(id);
  if (!article) throw ApiError.notFound("Article not found.");
  return { deleted: true };
};

// ─── Public payload for the website ──────────────────────────────────────────

/** Everything the website needs to render Home 1 in one request. Inactive sections come back as null. */
export const getPublicHome1 = async () => {
  const page = await getPage();
  const [categories, articles] = await Promise.all([
    listCategories(true),
    listArticles({}, true),
  ]);

  const featured = articles.items.find((a) => a.isFeatured) ?? null;
  const gridArticles = articles.items.filter((a) => !a.isFeatured);

  const sections = page.sections as Record<string, Record<string, unknown> & { isActive?: boolean }>;
  const activeOrNull = (key: Home1SectionKey) => (sections[key]?.isActive === false ? null : sections[key]);

  return {
    seo: page.seo,
    hero: activeOrNull("hero"),
    searchFilter: activeOrNull("searchFilter")
      ? { ...sections.searchFilter, categories: categories.map(({ _id, name, slug }) => ({ _id, name, slug })) }
      : null,
    featured: activeOrNull("featured") && featured ? { ...sections.featured, article: featured } : null,
    articlesSection: activeOrNull("articlesSection") ? { ...sections.articlesSection, articles: gridArticles } : null,
    cta: activeOrNull("cta"),
    updatedAt: page.updatedAt,
  };
};

// ─── Seed (website content → database) ───────────────────────────────────────

/**
 * Loads the website's current Home 1 content. Without `reset` it only fills what is
 * missing, so admin edits are never overwritten; with `reset` it restores the defaults.
 */
export const seedHome1 = async ({ reset = false } = {}) => {
  const summary = { page: "kept", categoriesCreated: 0, articlesCreated: 0 };

  if (reset) {
    await Promise.all([Home1Page.deleteMany({}), Home1Category.deleteMany({}), Home1Article.deleteMany({})]);
  }

  if (!(await Home1Page.exists({ key: HOME1_PAGE_KEY }))) {
    await Home1Page.create({ key: HOME1_PAGE_KEY, sections: defaultHome1Sections, seo: defaultHome1Seo });
    summary.page = "created";
  }

  const categoryIdBySlug = new Map<string, Types.ObjectId>();
  for (const category of defaultHome1Categories) {
    let doc = await Home1Category.findOne({ slug: category.slug });
    if (!doc) {
      doc = await Home1Category.create(category);
      summary.categoriesCreated++;
    }
    categoryIdBySlug.set(category.slug, doc._id as Types.ObjectId);
  }

  for (const { category, ...article } of defaultHome1Articles) {
    if (await Home1Article.exists({ slug: article.slug })) continue;
    await Home1Article.create({ ...article, category: categoryIdBySlug.get(category) });
    summary.articlesCreated++;
  }

  return summary;
};
