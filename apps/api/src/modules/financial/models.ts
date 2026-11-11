import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const invoiceItemSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaisa: { type: Number, required: true, min: 0 },
    totalPaisa: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyerName: { type: String, required: true },
    buyerPhone: { type: String },
    buyerBusinessName: { type: String },
    issuedDate: { type: Date, default: Date.now, required: true },
    dueDate: { type: Date, required: true },
    totalAmountPaisa: { type: Number, required: true, min: 0 },
    paidAmountPaisa: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PAID", "OVERDUE"],
      default: "PENDING",
      required: true,
      index: true
    },
    items: { type: [invoiceItemSchema], required: true },
    notes: { type: String }
  },
  { timestamps: true }
);

invoiceSchema.index({ createdAt: -1 });

const paymentSchema = new Schema(
  {
    paymentNumber: { type: String, required: true, unique: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyerName: { type: String, required: true },
    amountPaisa: { type: Number, required: true, min: 1 },
    method: {
      type: String,
      enum: ["CASH", "BANK_TRANSFER", "ESEWA", "KHALTI", "CHEQUE"],
      required: true
    },
    reference: { type: String },
    receivedDate: { type: Date, default: Date.now, required: true },
    notes: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

paymentSchema.index({ receivedDate: -1 });

const expenseSchema = new Schema(
  {
    expenseNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["RENT", "SALARIES", "TRANSPORT", "UTILITIES", "SUPPLIES", "MAINTENANCE", "INVENTORY", "OTHER"],
      required: true,
      index: true
    },
    amountPaisa: { type: Number, required: true, min: 1 },
    paidTo: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK_TRANSFER", "CHEQUE"],
      default: "CASH",
      required: true
    },
    expenseDate: { type: Date, default: Date.now, required: true },
    notes: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

expenseSchema.index({ expenseDate: -1 });

export type InvoiceDocument = InferSchemaType<typeof invoiceSchema>;
export type PaymentDocument = InferSchemaType<typeof paymentSchema>;
export type ExpenseDocument = InferSchemaType<typeof expenseSchema>;

export const Invoice =
  (mongoose.models.Invoice as Model<InvoiceDocument> | undefined) ??
  mongoose.model<InvoiceDocument>("Invoice", invoiceSchema);

export const Payment =
  (mongoose.models.Payment as Model<PaymentDocument> | undefined) ??
  mongoose.model<PaymentDocument>("Payment", paymentSchema);

export const Expense =
  (mongoose.models.Expense as Model<ExpenseDocument> | undefined) ??
  mongoose.model<ExpenseDocument>("Expense", expenseSchema);
