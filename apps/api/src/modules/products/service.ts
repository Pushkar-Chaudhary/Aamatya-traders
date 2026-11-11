import { AuthError } from "../auth/errors.js";
import { Product } from "./model.js";
import type { createProductSchema, updateProductSchema } from "./schemas.js";
import type { z } from "zod";
import { randomBytes } from "node:crypto";

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function listProducts(page: number, pageSize: number, search: string) {
  const filter = search
    ? {
        $or: [
          { name: { $regex: escapeRegex(search), $options: "i" } },
          { sku: { $regex: escapeRegex(search), $options: "i" } },
          { brand: { $regex: escapeRegex(search), $options: "i" } }
        ]
      }
    : {};

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ updatedAt: -1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Product.countDocuments(filter)
  ]);
  return { products: products.map(serializeProduct), page, pageSize, total };
}

export async function productSummary() {
  const [total, active] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ status: "ACTIVE" })
  ]);
  return { total, active };
}

export async function createProduct(input: CreateProductInput) {
  try {
    const sku = input.sku ?? generateSku(input.name);
    const status = input.status ?? (input.wholesalePricePaisa === undefined ? "DRAFT" : "ACTIVE");
    return serializeProduct(await Product.create({ ...input, sku, status }));
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AuthError("A product with that SKU already exists.", 409, "SKU_EXISTS");
    }
    throw error;
  }
}

export async function updateProduct(productId: string, input: UpdateProductInput) {
  try {
    const product = await Product.findByIdAndUpdate(productId, input, {
      new: true,
      runValidators: true
    }).exec();
    if (!product) throw new AuthError("Product was not found.", 404, "PRODUCT_NOT_FOUND");
    return serializeProduct(product);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AuthError("A product with that SKU already exists.", 409, "SKU_EXISTS");
    }
    throw error;
  }
}

export async function seedSampleProducts(): Promise<void> {
  const count = await Product.countDocuments();
  if (count > 0) return;

  const samples = [
    {
      name: "Basmati Rice 25kg (Himalayan Premium)",
      sku: "RICE-BAS-25KG",
      brand: "Himalayan",
      category: "Grains & Rice",
      unit: "bag",
      purchasePricePaisa: 245000,
      wholesalePricePaisa: 285000,
      status: "ACTIVE"
    },
    {
      name: "Pure Mustard Oil 1L Jar (Shree शुद्ध तोरी तेल)",
      sku: "OIL-MUST-1L",
      brand: "Shree",
      category: "Edible Oils",
      unit: "jar",
      purchasePricePaisa: 23500,
      wholesalePricePaisa: 28000,
      status: "ACTIVE"
    },
    {
      name: "Chana Dal 30kg Sack (Super Fine)",
      sku: "DAL-CHANA-30KG",
      brand: "Trishuli",
      category: "Pulses & Lentils",
      unit: "bag",
      purchasePricePaisa: 360000,
      wholesalePricePaisa: 410000,
      status: "ACTIVE"
    },
    {
      name: "Refined Sugar 50kg Sack (Everest Pure)",
      sku: "SUGAR-EVR-50KG",
      brand: "Everest",
      category: "Essentials",
      unit: "bag",
      purchasePricePaisa: 460000,
      wholesalePricePaisa: 520000,
      status: "ACTIVE"
    },
    {
      name: "Wai Wai Noodles (Carton of 30 packets)",
      sku: "WAI-CARTON-30",
      brand: "Chaudhary Group",
      category: "Packaged Food",
      unit: "carton",
      purchasePricePaisa: 135000,
      wholesalePricePaisa: 160000,
      status: "ACTIVE"
    },
    {
      name: "Tata Iodized Salt 1kg (Carton of 25 packets)",
      sku: "SALT-TATA-25KG",
      brand: "Tata",
      category: "Essentials",
      unit: "carton",
      purchasePricePaisa: 52000,
      wholesalePricePaisa: 65000,
      status: "ACTIVE"
    },
    {
      name: "Sunflow Sunflower Oil 5L Jar",
      sku: "OIL-SUN-5L",
      brand: "Sunflow",
      category: "Edible Oils",
      unit: "jar",
      purchasePricePaisa: 110000,
      wholesalePricePaisa: 129000,
      status: "ACTIVE"
    },
    {
      name: "Red Cow Instant Full Cream Milk Powder 1kg",
      sku: "MILK-REDCOW-1KG",
      brand: "Red Cow",
      category: "Dairy & Beverages",
      unit: "packet",
      purchasePricePaisa: 82000,
      wholesalePricePaisa: 95000,
      status: "ACTIVE"
    }
  ];

  await Product.create(samples);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeProduct(product: {
  _id: { toString(): string };
  name: string;
  sku: string;
  brand?: string | null;
  category?: string | null;
  unit: string;
  purchasePricePaisa?: number | null;
  wholesalePricePaisa?: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: product._id.toString(),
    name: product.name,
    sku: product.sku,
    brand: product.brand ?? "",
    category: product.category ?? "",
    unit: product.unit,
    purchasePricePaisa: product.purchasePricePaisa ?? null,
    wholesalePricePaisa: product.wholesalePricePaisa ?? null,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

function generateSku(name: string): string {
  const prefix = name
    .trim()
    .slice(0, 3)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "X");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}
