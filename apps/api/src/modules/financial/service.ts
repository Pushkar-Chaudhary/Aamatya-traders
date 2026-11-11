import { Invoice, Payment, Expense } from "./models.js";
import { User } from "../auth/models.js";

export async function getFinancialSummary(): Promise<{
  totalRevenuePaisa: number;
  accountsReceivablePaisa: number;
  totalExpensesPaisa: number;
  netProfitPaisa: number;
  invoicesCount: {
    total: number;
    paid: number;
    pending: number;
    partial: number;
  };
  recentPayments: Array<{
    id: string;
    paymentNumber: string;
    buyerName: string;
    amountPaisa: number;
    method: string;
    receivedDate: Date;
    reference?: string | null;
  }>;
  recentExpenses: Array<{
    id: string;
    expenseNumber: string;
    title: string;
    category: string;
    amountPaisa: number;
    paidTo: string;
    expenseDate: Date;
  }>;
}> {
  const [payments, invoices, expenses] = await Promise.all([
    Payment.find().sort({ receivedDate: -1 }).limit(10).lean(),
    Invoice.find().lean(),
    Expense.find().sort({ expenseDate: -1 }).limit(10).lean()
  ]);

  let totalRevenuePaisa = 0;
  for (const p of await Payment.find().select("amountPaisa").lean()) {
    totalRevenuePaisa += p.amountPaisa;
  }

  let accountsReceivablePaisa = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let partialCount = 0;

  for (const inv of invoices) {
    const due = Math.max(0, inv.totalAmountPaisa - inv.paidAmountPaisa);
    if (inv.status === "PAID") {
      paidCount++;
    } else if (inv.status === "PARTIAL") {
      partialCount++;
      accountsReceivablePaisa += due;
    } else {
      pendingCount++;
      accountsReceivablePaisa += due;
    }
  }

  let totalExpensesPaisa = 0;
  for (const exp of await Expense.find().select("amountPaisa").lean()) {
    totalExpensesPaisa += exp.amountPaisa;
  }

  const netProfitPaisa = totalRevenuePaisa - totalExpensesPaisa;

  return {
    totalRevenuePaisa,
    accountsReceivablePaisa,
    totalExpensesPaisa,
    netProfitPaisa,
    invoicesCount: {
      total: invoices.length,
      paid: paidCount,
      pending: pendingCount,
      partial: partialCount
    },
    recentPayments: payments.map((p) => ({
      id: p._id.toString(),
      paymentNumber: p.paymentNumber,
      buyerName: p.buyerName,
      amountPaisa: p.amountPaisa,
      method: p.method,
      receivedDate: p.receivedDate,
      reference: p.reference
    })),
    recentExpenses: expenses.map((e) => ({
      id: e._id.toString(),
      expenseNumber: e.expenseNumber,
      title: e.title,
      category: e.category,
      amountPaisa: e.amountPaisa,
      paidTo: e.paidTo,
      expenseDate: e.expenseDate
    }))
  };
}

export async function listInvoices(params: {
  buyerId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const query: Record<string, unknown> = {};
  if (params.buyerId) query.buyerId = params.buyerId;
  if (params.status && params.status !== "ALL") query.status = params.status;

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Invoice.countDocuments(query)
  ]);

  return {
    invoices: invoices.map((inv) => ({
      id: inv._id.toString(),
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId?.toString(),
      buyerId: inv.buyerId.toString(),
      buyerName: inv.buyerName,
      buyerPhone: inv.buyerPhone,
      buyerBusinessName: inv.buyerBusinessName,
      issuedDate: inv.issuedDate,
      dueDate: inv.dueDate,
      totalAmountPaisa: inv.totalAmountPaisa,
      paidAmountPaisa: inv.paidAmountPaisa,
      balanceDuePaisa: Math.max(0, inv.totalAmountPaisa - inv.paidAmountPaisa),
      status: inv.status,
      items: inv.items,
      notes: inv.notes
    })),
    total,
    page,
    pageSize
  };
}

export async function createInvoice(input: {
  buyerId: string;
  dueDate: Date;
  items: Array<{ description: string; quantity: number; unitPricePaisa: number; totalPaisa: number }>;
  notes?: string;
  orderId?: string;
}) {
  const buyer = await User.findById(input.buyerId).lean();
  if (!buyer) throw new Error("Buyer not found");

  const count = await Invoice.countDocuments();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const totalAmountPaisa = input.items.reduce((sum, item) => sum + item.totalPaisa, 0);

  const invoice = await Invoice.create({
    invoiceNumber,
    orderId: input.orderId,
    buyerId: buyer._id,
    buyerName: buyer.name || "Customer",
    buyerPhone: buyer.phone,
    buyerBusinessName: buyer.businessName,
    dueDate: input.dueDate,
    totalAmountPaisa,
    paidAmountPaisa: 0,
    status: "PENDING",
    items: input.items,
    notes: input.notes
  });

  return invoice;
}

export async function recordPayment(input: {
  invoiceId: string;
  amountPaisa: number;
  method: "CASH" | "BANK_TRANSFER" | "ESEWA" | "KHALTI" | "CHEQUE";
  reference?: string;
  notes?: string;
  recordedByUserId?: string;
}) {
  const invoice = await Invoice.findById(input.invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  const count = await Payment.countDocuments();
  const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const payment = await Payment.create({
    paymentNumber,
    invoiceId: invoice._id,
    buyerId: invoice.buyerId,
    buyerName: invoice.buyerName,
    amountPaisa: input.amountPaisa,
    method: input.method,
    reference: input.reference,
    notes: input.notes,
    recordedBy: input.recordedByUserId
  });

  invoice.paidAmountPaisa += input.amountPaisa;
  if (invoice.paidAmountPaisa >= invoice.totalAmountPaisa) {
    invoice.status = "PAID";
  } else {
    invoice.status = "PARTIAL";
  }
  await invoice.save();

  return payment;
}

export async function listExpenses(params: {
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const query: Record<string, unknown> = {};
  if (params.category && params.category !== "ALL") query.category = params.category;

  const [expenses, total] = await Promise.all([
    Expense.find(query)
      .sort({ expenseDate: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Expense.countDocuments(query)
  ]);

  return {
    expenses: expenses.map((e) => ({
      id: e._id.toString(),
      expenseNumber: e.expenseNumber,
      title: e.title,
      category: e.category,
      amountPaisa: e.amountPaisa,
      paidTo: e.paidTo,
      paymentMethod: e.paymentMethod,
      expenseDate: e.expenseDate,
      notes: e.notes
    })),
    total,
    page,
    pageSize
  };
}

export async function recordExpense(input: {
  title: string;
  category: "RENT" | "SALARIES" | "TRANSPORT" | "UTILITIES" | "SUPPLIES" | "MAINTENANCE" | "INVENTORY" | "OTHER";
  amountPaisa: number;
  paidTo: string;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE";
  notes?: string;
  expenseDate?: Date;
  recordedByUserId?: string;
}) {
  const count = await Expense.countDocuments();
  const expenseNumber = `EXP-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const expense = await Expense.create({
    expenseNumber,
    title: input.title,
    category: input.category,
    amountPaisa: input.amountPaisa,
    paidTo: input.paidTo,
    paymentMethod: input.paymentMethod,
    expenseDate: input.expenseDate ?? new Date(),
    notes: input.notes,
    recordedBy: input.recordedByUserId
  });

  return expense;
}

export async function seedSampleFinancials(): Promise<void> {
  const invoiceCount = await Invoice.countDocuments();
  if (invoiceCount > 0) return;

  const demoBuyer = await User.findOne({ role: "RETAILER" });
  if (!demoBuyer) return;

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const daysAhead = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // Sample Invoice 1: PAID
  const inv1 = await Invoice.create({
    invoiceNumber: "INV-2026-0001",
    buyerId: demoBuyer._id,
    buyerName: demoBuyer.name || "Ramesh Sah",
    buyerPhone: demoBuyer.phone,
    buyerBusinessName: demoBuyer.businessName || "Lahan Kirana Store",
    issuedDate: daysAgo(12),
    dueDate: daysAgo(2),
    totalAmountPaisa: 4250000, // NRs 42,500
    paidAmountPaisa: 4250000,
    status: "PAID",
    items: [
      { description: "Basmati Rice 25kg (10 bags)", quantity: 10, unitPricePaisa: 285000, totalPaisa: 2850000 },
      { description: "Mustard Oil 1L (5 cartons / 50 jars)", quantity: 50, unitPricePaisa: 28000, totalPaisa: 1400000 }
    ],
    notes: "Prompt wholesale delivery via Lahan Depot"
  });

  await Payment.create({
    paymentNumber: "PAY-2026-0001",
    invoiceId: inv1._id,
    buyerId: demoBuyer._id,
    buyerName: demoBuyer.name,
    amountPaisa: 4250000,
    method: "BANK_TRANSFER",
    reference: "NabilBank-TXN-88419",
    receivedDate: daysAgo(3),
    notes: "Settled in full via bank transfer"
  });

  // Sample Invoice 2: PARTIAL
  const inv2 = await Invoice.create({
    invoiceNumber: "INV-2026-0002",
    buyerId: demoBuyer._id,
    buyerName: demoBuyer.name || "Ramesh Sah",
    buyerPhone: demoBuyer.phone,
    buyerBusinessName: demoBuyer.businessName || "Lahan Kirana Store",
    issuedDate: daysAgo(5),
    dueDate: daysAhead(10),
    totalAmountPaisa: 6800000, // NRs 68,000
    paidAmountPaisa: 3000000, // NRs 30,000 paid
    status: "PARTIAL",
    items: [
      { description: "Sugar 50kg Sack (10 sacks)", quantity: 10, unitPricePaisa: 520000, totalPaisa: 5200000 },
      { description: "Wai Wai Noodles (10 cartons)", quantity: 10, unitPricePaisa: 160000, totalPaisa: 1600000 }
    ],
    notes: "NRs 30,000 paid advance in cash, balance on delivery"
  });

  await Payment.create({
    paymentNumber: "PAY-2026-0002",
    invoiceId: inv2._id,
    buyerId: demoBuyer._id,
    buyerName: demoBuyer.name,
    amountPaisa: 3000000,
    method: "CASH",
    reference: "RECEIPT-#409",
    receivedDate: daysAgo(5),
    notes: "Cash counter deposit"
  });

  // Sample Invoice 3: PENDING
  await Invoice.create({
    invoiceNumber: "INV-2026-0003",
    buyerId: demoBuyer._id,
    buyerName: demoBuyer.name || "Ramesh Sah",
    buyerPhone: demoBuyer.phone,
    buyerBusinessName: demoBuyer.businessName || "Lahan Kirana Store",
    issuedDate: daysAgo(1),
    dueDate: daysAhead(14),
    totalAmountPaisa: 2840000, // NRs 28,400
    paidAmountPaisa: 0,
    status: "PENDING",
    items: [
      { description: "Chana Dal 30kg Sack (4 sacks)", quantity: 4, unitPricePaisa: 410000, totalPaisa: 1640000 },
      { description: "Tata Salt 1kg Carton (20 pkts)", quantity: 20, unitPricePaisa: 6000, totalPaisa: 1200000 }
    ],
    notes: "Dispatched to Golchha Chowk branch"
  });

  // Sample Expenses
  await Expense.create([
    {
      expenseNumber: "EXP-2026-0001",
      title: "Main Warehouse Rent (Lahan Bazaar)",
      category: "RENT",
      amountPaisa: 3500000, // NRs 35,000
      paidTo: "Prem Bahadur Shrestha",
      paymentMethod: "BANK_TRANSFER",
      expenseDate: daysAgo(7),
      notes: "Baisakh warehouse premises rent"
    },
    {
      expenseNumber: "EXP-2026-0002",
      title: "Staff & Loader Salaries (Half-Month Advance)",
      category: "SALARIES",
      amountPaisa: 4500000, // NRs 45,000
      paidTo: "Warehouse Team & Drivers",
      paymentMethod: "CASH",
      expenseDate: daysAgo(4),
      notes: "Disbursed to 3 loading & driving crew"
    },
    {
      expenseNumber: "EXP-2026-0003",
      title: "Diesel & Delivery Vehicle Fuel",
      category: "TRANSPORT",
      amountPaisa: 1280000, // NRs 12,800
      paidTo: "Sagarmatha Petrol Pump Lahan",
      paymentMethod: "CASH",
      expenseDate: daysAgo(2),
      notes: "Fuel for Siraha/Mirchaiya distribution routes"
    },
    {
      expenseNumber: "EXP-2026-0004",
      title: "Warehouse Electricity & NEA Bill",
      category: "UTILITIES",
      amountPaisa: 460000, // NRs 4,600
      paidTo: "Nepal Electricity Authority (Lahan)",
      paymentMethod: "BANK_TRANSFER",
      expenseDate: daysAgo(6),
      notes: "Meter #3910-2"
    }
  ]);
}

