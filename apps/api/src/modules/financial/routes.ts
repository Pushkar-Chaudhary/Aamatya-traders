import { Router } from "express";
import { z } from "zod";
import { AuthError } from "../auth/errors.js";
import { authContext, requireAuth, requireCsrf, requireRoles, requireTrustedOrigin } from "../auth/middleware.js";
import {
  createInvoice,
  getFinancialSummary,
  listExpenses,
  listInvoices,
  recordExpense,
  recordPayment
} from "./service.js";

export const financialRouter = Router();

financialRouter.use(requireAuth);

financialRouter.get(
  "/summary",
  requireRoles("OWNER", "ADMIN", "ACCOUNTANT", "SALES"),
  async (_request, response) => {
    response.json(await getFinancialSummary());
  }
);

financialRouter.get("/invoices", async (request, response) => {
  const auth = authContext(response);
  const status = typeof request.query.status === "string" ? request.query.status : undefined;
  const page = typeof request.query.page === "string" ? Number(request.query.page) : 1;
  const pageSize = typeof request.query.pageSize === "string" ? Number(request.query.pageSize) : 25;

  // Retailers can only view their own invoices
  const buyerId = auth.user.role === "RETAILER" ? auth.user.id : (typeof request.query.buyerId === "string" ? request.query.buyerId : undefined);

  response.json(await listInvoices({ buyerId, status, page, pageSize }));
});

const createInvoiceSchema = z.object({
  buyerId: z.string().min(1),
  dueDate: z.coerce.date(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().int().min(1),
      unitPricePaisa: z.number().int().min(0),
      totalPaisa: z.number().int().min(0)
    })
  ).min(1),
  notes: z.string().optional()
});

financialRouter.post(
  "/invoices",
  requireTrustedOrigin,
  requireCsrf,
  requireRoles("OWNER", "ADMIN", "ACCOUNTANT"),
  async (request, response) => {
    const parsed = createInvoiceSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AuthError("Invoice data is invalid.", 400, "INVALID_INPUT");
    }
    const invoice = await createInvoice(parsed.data);
    response.status(201).json({ invoice });
  }
);

const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amountPaisa: z.number().int().min(1),
  method: z.enum(["CASH", "BANK_TRANSFER", "ESEWA", "KHALTI", "CHEQUE"]),
  reference: z.string().optional(),
  notes: z.string().optional()
});

financialRouter.post(
  "/payments",
  requireTrustedOrigin,
  requireCsrf,
  requireRoles("OWNER", "ADMIN", "ACCOUNTANT"),
  async (request, response) => {
    const parsed = recordPaymentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AuthError("Payment details are invalid.", 400, "INVALID_INPUT");
    }
    const auth = authContext(response);
    const payment = await recordPayment({
      ...parsed.data,
      recordedByUserId: auth.user.id
    });
    response.status(201).json({ payment });
  }
);

financialRouter.get(
  "/expenses",
  requireRoles("OWNER", "ADMIN", "ACCOUNTANT"),
  async (request, response) => {
    const category = typeof request.query.category === "string" ? request.query.category : undefined;
    const page = typeof request.query.page === "string" ? Number(request.query.page) : 1;
    const pageSize = typeof request.query.pageSize === "string" ? Number(request.query.pageSize) : 25;

    response.json(await listExpenses({ category, page, pageSize }));
  }
);

const recordExpenseSchema = z.object({
  title: z.string().min(1),
  category: z.enum(["RENT", "SALARIES", "TRANSPORT", "UTILITIES", "SUPPLIES", "MAINTENANCE", "INVENTORY", "OTHER"]),
  amountPaisa: z.number().int().min(1),
  paidTo: z.string().min(1),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE"]).default("CASH"),
  notes: z.string().optional(),
  expenseDate: z.coerce.date().optional()
});

financialRouter.post(
  "/expenses",
  requireTrustedOrigin,
  requireCsrf,
  requireRoles("OWNER", "ADMIN", "ACCOUNTANT"),
  async (request, response) => {
    const parsed = recordExpenseSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AuthError("Expense details are invalid.", 400, "INVALID_INPUT");
    }
    const auth = authContext(response);
    const expense = await recordExpense({
      ...parsed.data,
      recordedByUserId: auth.user.id
    });
    response.status(201).json({ expense });
  }
);

