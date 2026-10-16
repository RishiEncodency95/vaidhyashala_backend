import { z } from "zod";

const text = (max = 500) => z.string().trim().max(max);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens")
  .max(160);

const categoryBody = z.object({
  name: text(80).min(1, "Category name is required"),
  slug: slug.optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const createCategorySchema = z.object({ body: categoryBody.strict() });
export const updateCategorySchema = z.object({ params: z.object({ id: objectId }), body: categoryBody.partial().strict() });

const productBody = z.object({
  title: text(160).min(1, "Product name is required"),
  slug: slug.optional(),
  category: objectId,
  shortDescription: text(300).optional(),
  description: text(2000).optional(),
  productType: text(120).optional(),
  packOptions: text(300).optional(),
  availability: text(200).optional(),
  productInfo: text(3000).optional(),
  directions: text(3000).optional(),
  usageNotes: text(1000).optional(),
  image: text(1000).optional(),
  imageAlt: text(300).optional(),
  galleryImage1: text(1000).optional(),
  galleryImage2: text(1000).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const createProductSchema = z.object({ body: productBody.strict() });
export const updateProductSchema = z.object({ params: z.object({ id: objectId }), body: productBody.partial().strict() });

export const idParamSchema = z.object({ params: z.object({ id: objectId }) });

const mobile = z.string().trim().regex(/^[+\d][\d\s-]{6,18}$/, "Please enter a valid mobile number");

export const createEnquirySchema = z.object({
  body: z
    .object({
      name: text(100).min(1, "Please enter your name"),
      mobile,
      email: z.string().trim().email("Invalid email").max(200).optional().or(z.literal("")),
      // Free text on the page form; the modal also sends the product's id
      productName: text(160).min(1, "Please tell us the product you are interested in"),
      productId: objectId.optional(),
      enquiryType: text(120).optional(),
      message: text(2000).optional(),
      source: z.enum(["page-form", "product-modal"]).optional(),
    })
    .strict(),
});

export const updateEnquirySchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({ status: z.enum(["new", "contacted", "closed"]).optional(), adminNote: text(1000).optional() })
    .strict(),
});

export type CategoryInput = z.infer<typeof categoryBody>;
export type ProductInput = z.infer<typeof productBody>;
