import { z } from "zod";

const productFields = {
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(48).transform((value) => value.toUpperCase()).optional(),
  brand: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  unit: z.enum(["piece", "carton", "box", "packet", "jar", "bottle", "bag", "other"]),
  purchasePricePaisa: z.number().int().min(0).optional(),
  wholesalePricePaisa: z.number().int().min(0).optional()
};

export const createProductSchema = z.object({
  ...productFields,
  status: z.enum(["DRAFT", "ACTIVE"]).optional()
}).refine(
  (product) => product.status !== "ACTIVE" || product.wholesalePricePaisa !== undefined,
  { message: "An active product requires a wholesale price.", path: ["wholesalePricePaisa"] }
);
export const updateProductSchema = z.object({
  ...productFields,
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"])
}).refine(
  (product) => product.status !== "ACTIVE" || product.wholesalePricePaisa !== undefined,
  { message: "An active product requires a wholesale price.", path: ["wholesalePricePaisa"] }
);
export const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).default("")
});
