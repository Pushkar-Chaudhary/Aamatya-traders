import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaisa: { type: Number, required: true, min: 0 },
    totalPaisa: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyerName: { type: String, required: true },
    buyerPhone: { type: String, required: true },
    buyerBusinessName: { type: String },
    deliveryAddress: { type: String, required: true },
    items: { type: [orderItemSchema], required: true },
    subtotalPaisa: { type: Number, required: true, min: 0 },
    taxPaisa: { type: Number, default: 0, min: 0 },
    totalPaisa: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "DISPATCHED", "DELIVERED", "CANCELLED"],
      default: "PENDING",
      required: true,
      index: true
    },
    notes: { type: String }
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

export type OrderDocument = InferSchemaType<typeof orderSchema>;

export const Order =
  (mongoose.models.Order as Model<OrderDocument> | undefined) ??
  mongoose.model<OrderDocument>("Order", orderSchema);

