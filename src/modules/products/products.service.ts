import { Types } from "mongoose";
import { Product } from "../../models/products/Product.model";
import { ProductCategory } from "../../models/products/ProductCategory.model";
import { ProductEnquiry, ProductEnquiryStatus } from "../../models/products/ProductEnquiry.model";
import { ApiError } from "../../utils/ApiError";
import { slugify } from "../home1/home1.service";
import { CategoryInput, ProductInput } from "./products.schema";
import { defaultProductCategories, defaultProducts } from "./products.defaults";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── Categories ──────────────────────────────────────────────────────────────

const assertCategorySlugFree = async (slug: string, exceptId?: string) => {
  if (await ProductCategory.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })) {
    throw ApiError.badRequest(`A category with the slug "${slug}" already exists.`);
  }
};

export const listCategories = async (onlyActive = false) => {
  const categories = await ProductCategory.find(onlyActive ? { isActive: true } : {}).sort({ order: 1, name: 1 }).lean();
  const counts = await Product.aggregate<{ _id: Types.ObjectId; count: number }>([
    ...(onlyActive ? [{ $match: { isActive: true } }] : []),
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  return categories.map((c) => ({ ...c, productCount: countMap.get(String(c._id)) ?? 0 }));
};

export const createCategory = async (input: CategoryInput) => {
  const slug = input.slug || slugify(input.name);
  if (!slug) throw ApiError.badRequest("Please give the category a name with letters or numbers.");
  await assertCategorySlugFree(slug);
  const order = input.order ?? (await ProductCategory.countDocuments()) + 1;
  return (await ProductCategory.create({ ...input, slug, order })).toObject();
};

export const updateCategory = async (id: string, input: Partial<CategoryInput>) => {
  const category = await ProductCategory.findById(id);
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
  const category = await ProductCategory.findById(id);
  if (!category) throw ApiError.notFound("Category not found.");
  const inUse = await Product.countDocuments({ category: id });
  if (inUse > 0) {
    throw ApiError.badRequest(
      `"${category.name}" is used by ${inUse} product${inUse === 1 ? "" : "s"}. Move or delete those products first.`
    );
  }
  await category.deleteOne();
  return { deleted: true };
};

// ─── Products ────────────────────────────────────────────────────────────────

const assertProductSlugFree = async (slug: string, exceptId?: string) => {
  if (await Product.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })) {
    throw ApiError.badRequest(`A product with the slug "${slug}" already exists.`);
  }
};

const assertCategoryExists = async (id: string) => {
  if (!(await ProductCategory.exists({ _id: id }))) throw ApiError.badRequest("The selected category does not exist.");
};

export interface ListProductsQuery {
  search?: string;
  category?: string; // id or slug
  status?: "active" | "inactive";
  page?: number;
  limit?: number;
}

export const listProducts = async (query: ListProductsQuery, publicView = false) => {
  const filter: Record<string, unknown> = {};
  if (publicView || query.status === "active") filter.isActive = true;
  else if (query.status === "inactive") filter.isActive = false;

  if (query.category && query.category !== "all") {
    const category = Types.ObjectId.isValid(query.category)
      ? await ProductCategory.findById(query.category).lean()
      : await ProductCategory.findOne({ slug: query.category.toLowerCase() }).lean();
    if (!category || (publicView && !category.isActive)) return { items: [], total: 0, page: 1, limit: 0, totalPages: 0 };
    filter.category = category._id;
  } else if (publicView) {
    filter.category = { $in: await ProductCategory.find({ isActive: true }).distinct("_id") };
  }

  if (query.search?.trim()) {
    const re = new RegExp(escapeRegex(query.search.trim()), "i");
    const categoryIds = await ProductCategory.find({ name: re }).distinct("_id");
    filter.$or = [{ title: re }, { shortDescription: re }, { description: re }, { category: { $in: categoryIds } }];
  }

  const limit = Math.min(Math.max(Number(query.limit) || 0, 0), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const total = await Product.countDocuments(filter);
  let cursor = Product.find(filter).sort({ order: 1, createdAt: -1 }).populate("category", "name slug isActive");
  if (limit > 0) cursor = cursor.skip((page - 1) * limit).limit(limit);
  return { items: await cursor.lean(), total, page, limit, totalPages: limit > 0 ? Math.ceil(total / limit) : 1 };
};

export const getProduct = async (id: string) => {
  const product = await Product.findById(id).populate("category", "name slug isActive").lean();
  if (!product) throw ApiError.notFound("Product not found.");
  return product;
};

export const getPublicProductBySlug = async (slug: string) => {
  const product = await Product.findOne({ slug: slug.toLowerCase(), isActive: true })
    .populate("category", "name slug isActive")
    .lean();
  const category = product?.category as unknown as { isActive?: boolean } | undefined;
  if (!product || category?.isActive === false) throw ApiError.notFound("Product not found.");
  return product;
};

export const createProduct = async (input: ProductInput) => {
  await assertCategoryExists(input.category);
  const slug = input.slug || slugify(input.title);
  if (!slug) throw ApiError.badRequest("Please give the product a name with letters or numbers.");
  await assertProductSlugFree(slug);
  const order = input.order ?? (await Product.countDocuments()) + 1;
  const product = await Product.create({ ...input, slug, order });
  return getProduct(String(product._id));
};

export const updateProduct = async (id: string, input: Partial<ProductInput>) => {
  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound("Product not found.");
  if (input.category) await assertCategoryExists(input.category);
  if (input.slug !== undefined && input.slug !== product.slug) await assertProductSlugFree(input.slug, id);
  const { category, ...rest } = input;
  Object.assign(product, rest);
  if (category) product.category = new Types.ObjectId(category);
  await product.save();
  return getProduct(id);
};

export const deleteProduct = async (id: string) => {
  if (!(await Product.findByIdAndDelete(id))) throw ApiError.notFound("Product not found.");
  return { deleted: true };
};

// ─── Enquiries ───────────────────────────────────────────────────────────────

export const createEnquiry = async (
  input: {
    name: string;
    mobile: string;
    email?: string;
    productName: string;
    productId?: string;
    enquiryType?: string;
    message?: string;
    source?: "page-form" | "product-modal";
  },
  ip?: string,
) => {
  const { productId, ...rest } = input;
  if (productId && !(await Product.exists({ _id: productId, isActive: true }))) {
    throw ApiError.badRequest("This product is not available.");
  }
  const doc = await ProductEnquiry.create({
    ...rest,
    source: input.source ?? (productId ? "product-modal" : "page-form"),
    product: productId,
    ip,
  });
  return { _id: doc._id, status: doc.status };
};

export const listEnquiries = async (query: { status?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = {};
  if (query.status && ["new", "contacted", "closed"].includes(query.status)) filter.status = query.status;
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const [items, total, counts] = await Promise.all([
    ProductEnquiry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("-ip").populate("product", "title slug").lean(),
    ProductEnquiry.countDocuments(filter),
    ProductEnquiry.aggregate<{ _id: ProductEnquiryStatus; count: number }>([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit), counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) };
};

export const updateEnquiry = async (id: string, data: { status?: ProductEnquiryStatus; adminNote?: string }) => {
  const doc = await ProductEnquiry.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).select("-ip").lean();
  if (!doc) throw ApiError.notFound("Enquiry not found.");
  return doc;
};

export const deleteEnquiry = async (id: string) => {
  if (!(await ProductEnquiry.findByIdAndDelete(id))) throw ApiError.notFound("Enquiry not found.");
  return { deleted: true };
};

// ─── Seed ────────────────────────────────────────────────────────────────────

/** Loads the website catalogue. Without `reset` it only adds what is missing. */
export const seedProducts = async ({ reset = false } = {}) => {
  if (reset) await Promise.all([Product.deleteMany({}), ProductCategory.deleteMany({})]);
  const summary = { categoriesCreated: 0, productsCreated: 0 };
  const idBySlug = new Map<string, Types.ObjectId>();
  for (const category of defaultProductCategories) {
    let doc = await ProductCategory.findOne({ slug: category.slug });
    if (!doc) {
      doc = await ProductCategory.create(category);
      summary.categoriesCreated++;
    }
    idBySlug.set(category.slug, doc._id as Types.ObjectId);
  }
  for (const { category, ...product } of defaultProducts) {
    if (await Product.exists({ slug: product.slug })) continue;
    await Product.create({ ...product, category: idBySlug.get(category) });
    summary.productsCreated++;
  }
  return summary;
};
