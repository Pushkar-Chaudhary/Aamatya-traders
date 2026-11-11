import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 48 },
    brand: { type: String, trim: true, maxlength: 100 },
    category: { type: String, trim: true, maxlength: 100 },
    unit: {
      type: String,
      enum: ["piece", "carton", "box", "packet", "jar", "bottle", "bag", "other"],
      required: true
    },
    purchasePricePaisa: { type: Number, min: 0 },
    wholesalePricePaisa: { type: Number, min: 0 },
    status: { type: String, enum: ["DRAFT", "ACTIVE", "INACTIVE"], default: "DRAFT", required: true }
  },
  { timestamps: true }
);

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: "text", brand: "text", category: "text" });
productSchema.index({ status: 1, updatedAt: -1 });

type ProductDocument = InferSchemaType<typeof productSchema>;

export const Product =
  (mongoose.models.Product as Model<ProductDocument> | undefined) ??
  mongoose.model<ProductDocument>("Product", productSchema);
