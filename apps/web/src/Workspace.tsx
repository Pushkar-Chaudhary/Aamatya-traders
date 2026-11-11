import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Boxes,
  CheckCircle2,
  CircleAlert,
  Clock,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  Minus,
  Phone,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X
} from "lucide-react";
import { z } from "zod";

type Role = "OWNER" | "ADMIN" | "ACCOUNTANT" | "SALES" | "WAREHOUSE" | "DELIVERY" | "RETAILER";
type Locale = "en" | "ne";
type SessionInfo = {
  csrfToken: string;
  user: {
    id: string;
    phone?: string;
    email?: string;
    role: Role;
    status: "ACTIVE" | "DISABLED";
    name?: string;
    businessName?: string;
  };
};
type Page = "overview" | "financials" | "orders" | "products" | "team";

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  brand: z.string(),
  category: z.string(),
  unit: z.string(),
  purchasePricePaisa: z.number().nullable(),
  wholesalePricePaisa: z.number().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"])
});
type Product = z.infer<typeof productSchema>;

type OrderItem = {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPricePaisa: number;
  totalPaisa: number;
};

type Order = {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerBusinessName?: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotalPaisa: number;
  totalPaisa: number;
  status: "PENDING" | "CONFIRMED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
  notes?: string;
  createdAt: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  buyerId: string;
  buyerName: string;
  buyerPhone?: string;
  buyerBusinessName?: string;
  issuedDate: string;
  dueDate: string;
  totalAmountPaisa: number;
  paidAmountPaisa: number;
  balanceDuePaisa: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  items: Array<{ description: string; quantity: number; unitPricePaisa: number; totalPaisa: number }>;
  notes?: string;
};

type Expense = {
  id: string;
  expenseNumber: string;
  title: string;
  category: "RENT" | "SALARIES" | "TRANSPORT" | "UTILITIES" | "SUPPLIES" | "MAINTENANCE" | "INVENTORY" | "OTHER";
  amountPaisa: number;
  paidTo: string;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE";
  expenseDate: string;
  notes?: string;
};

type FinancialSummary = {
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
    receivedDate: string;
    reference?: string | null;
  }>;
  recentExpenses: Array<{
    id: string;
    expenseNumber: string;
    title: string;
    category: string;
    amountPaisa: number;
    paidTo: string;
    expenseDate: string;
  }>;
};

type UserSummary = {
  id: string;
  phone?: string;
  email?: string;
  name?: string;
  businessName?: string;
  address?: string;
  role: Role;
  status: "ACTIVE" | "DISABLED";
};

const copy = {
  en: {
    overview: "Overview",
    financials: "Financial Management",
    orders: "Wholesale Orders",
    products: "Products Catalog",
    team: "Staff & Retailers",
    staff: "Staff Workspace",
    dashboard: "Overview",
    overviewHint: "Live business & financial metrics for Amatya Traders, Lahan.",
    financialHint: "Revenue, Expenses, Receivables, Invoices, and Net Cash Flow.",
    orderHint: "Manage orders placed by retailers and wholesale buyers.",
    productHint: "Manage wholesale products, categories, and inventory rates.",
    teamHint: "Manage staff accounts and registered retail buyers.",
    activeProducts: "Active Products",
    totalRevenue: "Total Revenue",
    accountsReceivable: "Accounts Receivable",
    totalExpenses: "Total Expenses",
    netProfit: "Net Cash Flow / Profit",
    recentActivity: "Recent Financial & Order Activity",
    createInvoice: "Create Invoice",
    recordPayment: "Record Payment",
    recordExpense: "Record Expense",
    addProduct: "Add Product",
    addTeamMember: "Add Staff Member",
    subtabInvoices: "Invoices & Receivables",
    subtabExpenses: "Operational Expenses",
    subtabTransactions: "Cash Flow & Ledger",
    subtabTeam: "Staff Team",
    subtabBuyers: "Registered Retailers",
    searchProducts: "Search products by name, SKU, brand…",
    searchOrders: "Search orders…",
    allStatuses: "All Statuses",
    statusPaid: "Paid",
    statusPartial: "Partial",
    statusPending: "Pending",
    statusOverdue: "Overdue",
    invNumber: "Invoice #",
    orderNumber: "Order #",
    buyer: "Buyer / Retailer",
    amount: "Amount",
    balance: "Balance Due",
    date: "Date",
    dueDate: "Due Date",
    status: "Status",
    actions: "Actions",
    confirmOrder: "Confirm Order",
    dispatchOrder: "Dispatch Order",
    deliverOrder: "Mark Delivered",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    roles: {
      OWNER: "Owner",
      ADMIN: "Admin",
      ACCOUNTANT: "Accountant",
      SALES: "Sales Manager",
      WAREHOUSE: "Warehouse Staff",
      DELIVERY: "Delivery Team",
      RETAILER: "Retailer (Buyer)"
    },
    units: {
      piece: "Piece",
      carton: "Carton",
      box: "Box",
      packet: "Packet",
      jar: "Jar",
      bottle: "Bottle",
      bag: "Bag",
      other: "Other"
    }
  },
  ne: {
    overview: "सारांश",
    financials: "आर्थिक व्यवस्थापन",
    orders: "थोक अर्डरहरू",
    products: "सामान सूची",
    team: "कर्मचारी तथा ग्राहक",
    staff: "कर्मचारी कार्यक्षेत्र",
    dashboard: "सारांश",
    overviewHint: "अमात्य ट्रेडर्स, लहानको प्रत्यक्ष व्यावसायिक तथा वित्तीय विवरण।",
    financialHint: "आम्दानी, खर्च, बक्यौता, बिल र खुद मुनाफा व्यवस्थापन।",
    orderHint: "खुद्रा विक्रेताहरूबाट आएका थोक अर्डरहरूको व्यवस्थापन।",
    productHint: "थोक सामान, मूल्य र एकाइ व्यवस्थापन गर्नुहोस्।",
    teamHint: "कर्मचारी खाता र दर्ता भएका खुद्रा विक्रेताहरू।",
    activeProducts: "सक्रिय सामान",
    totalRevenue: "जम्मा आम्दानी (भुक्तानी प्राप्त)",
    accountsReceivable: "उठ्न बाँकी बक्यौता",
    totalExpenses: "जम्मा खर्च",
    netProfit: "खुद बचत / मुनाफा",
    recentActivity: "हालैको वित्तीय तथा अर्डर गतिविधि",
    createInvoice: "नयाँ बिल बनाउनुहोस्",
    recordPayment: "भुक्तानी दाखिला गर्नुहोस्",
    recordExpense: "खर्च दाखिला गर्नुहोस्",
    addProduct: "सामान थप्नुहोस्",
    addTeamMember: "कर्मचारी थप्नुहोस्",
    subtabInvoices: "बिल तथा बक्यौता",
    subtabExpenses: "व्यावसायिक खर्च",
    subtabTransactions: "नगद प्रवाह तथा खाता",
    subtabTeam: "कर्मचारी टोली",
    subtabBuyers: "खुद्रा विक्रेताहरू",
    searchProducts: "सामानको नाम, कोड वा ब्रान्डबाट खोज्नुहोस्…",
    searchOrders: "अर्डर खोज्नुहोस्…",
    allStatuses: "सबै अवस्था",
    statusPaid: "चुक्ता",
    statusPartial: "आंशिक",
    statusPending: "बाँकी",
    statusOverdue: "म्याद नाघेको",
    invNumber: "बिल नं.",
    orderNumber: "अर्डर नं.",
    buyer: "ग्राहक / पसल",
    amount: "रकम",
    balance: "बाँकी रकम",
    date: "मिति",
    dueDate: "भाका मिति",
    status: "स्थिति",
    actions: "कार्य",
    confirmOrder: "अर्डर स्वीकृत गर्नुहोस्",
    dispatchOrder: "डेलिभरीमा पठाउनुहोस्",
    deliverOrder: "डेलिभर भएको जनाउनुहोस्",
    save: "सुरक्षित गर्नुहोस्",
    saving: "सुरक्षित हुँदैछ…",
    cancel: "रद्द गर्नुहोस्",
    roles: {
      OWNER: "मालिक",
      ADMIN: "प्रशासक",
      ACCOUNTANT: "लेखापाल",
      SALES: "बिक्री प्रबन्धक",
      WAREHOUSE: "गोदाम प्रमुख",
      DELIVERY: "डेलिभरी कर्मचारी",
      RETAILER: "खुद्रा विक्रेता (ग्राहक)"
    },
    units: {
      piece: "थान",
      carton: "कार्टुन",
      box: "बाकस",
      packet: "प्याकेट",
      jar: "जार",
      bottle: "बोतल",
      bag: "बोरा",
      other: "अन्य"
    }
  }
} as const;

function money(paisa: number | null | undefined, locale: Locale): string {
  if (paisa === null || paisa === undefined) return "—";
  return new Intl.NumberFormat(locale === "ne" ? "ne-NP" : "en-NP", {
    style: "currency",
    currency: "NPR",
    currencyDisplay: "code",
    maximumFractionDigits: 2
  })
    .format(paisa / 100)
    .replace("NPR", locale === "ne" ? "नेरु" : "NRs");
}

function parseRupees(value: string): number | null {
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const paisa = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paisa) ? paisa : null;
}

export function Workspace({
  session,
  locale,
  onToggleLocale,
  onLogout
}: {
  session: SessionInfo;
  locale: Locale;
  onToggleLocale: () => void;
  onLogout: () => Promise<void>;
}) {
  const t = copy[locale];
  const userRole = session.user.role;
  const isOwner = userRole === "OWNER" || userRole === "ADMIN";
  const isAccountant = userRole === "ACCOUNTANT";
  const isSales = userRole === "SALES";

  // Navigation tabs based on role
  const navItems = useMemo(() => {
    const list: { id: Page; label: string; icon: any }[] = [
      { id: "overview", label: t.overview, icon: LayoutDashboard }
    ];

    // Owner and Accountant have full Financial Management
    if (isOwner || isAccountant || isSales) {
      list.push({ id: "financials", label: t.financials, icon: Wallet });
    }

    list.push({ id: "orders", label: t.orders, icon: Truck });
    list.push({ id: "products", label: t.products, icon: Boxes });

    if (isOwner || isSales) {
      list.push({ id: "team", label: t.team, icon: Users });
    }

    return list;
  }, [isOwner, isAccountant, isSales, t]);

  const [page, setPage] = useState<Page>("overview");
  const [financialSubTab, setFinancialSubTab] = useState<"invoices" | "expenses" | "transactions">("invoices");
  const [teamSubTab, setTeamSubTab] = useState<"team" | "buyers">("team");

  // Data states
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [buyers, setBuyers] = useState<UserSummary[]>([]);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Modals
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [teamDialog, setTeamDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [expenseDialog, setExpenseDialog] = useState(false);

  // Form states
  const [saving, setSaving] = useState(false);

  // 1. Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [finSumRes, invRes, expRes, ordRes, prodRes, usersRes] = await Promise.all([
        fetch("/api/financial/summary", { credentials: "include" }),
        fetch("/api/financial/invoices", { credentials: "include" }),
        fetch("/api/financial/expenses", { credentials: "include" }),
        fetch("/api/orders", { credentials: "include" }),
        fetch("/api/products", { credentials: "include" }),
        fetch("/api/auth/users", { credentials: "include" })
      ]);

      if (finSumRes.ok) setFinancialSummary(await finSumRes.json());
      if (invRes.ok) {
        const data = await invRes.json();
        setInvoices(data.invoices || []);
      }
      if (expRes.ok) {
        const data = await expRes.json();
        setExpenses(data.expenses || []);
      }
      if (ordRes.ok) {
        const data = await ordRes.json();
        setOrders(data.orders || []);
      }
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.products || []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        const allUsers: UserSummary[] = data.users || [];
        setUsers(allUsers.filter((u) => u.role !== "RETAILER"));
        setBuyers(allUsers.filter((u) => u.role === "RETAILER"));
      }
    } catch (err) {
      console.error("Error loading workspace data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Order Status Update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrfToken
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setNotice(`Order status updated to ${newStatus}`);
        setTimeout(() => setNotice(""), 4000);
        fetchData();
      }
    } catch (err) {
      setError("Failed to update order status");
    }
  };

  // Handle Record Payment
  const handleRecordPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    setSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const amountRs = formData.get("amount") as string;
    const amountPaisa = parseRupees(amountRs);
    const method = formData.get("method") as string;
    const reference = formData.get("reference") as string;
    const notes = formData.get("notes") as string;

    if (!amountPaisa || amountPaisa <= 0) {
      setError("Please enter a valid amount");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/financial/payments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrfToken
        },
        credentials: "include",
        body: JSON.stringify({
          invoiceId: selectedInvoiceForPayment.id,
          amountPaisa,
          method,
          reference,
          notes
        })
      });

      if (res.ok) {
        setPaymentDialog(false);
        setSelectedInvoiceForPayment(null);
        setNotice("Payment recorded successfully!");
        setTimeout(() => setNotice(""), 4000);
        fetchData();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to record payment");
      }
    } catch (err) {
      setError("Payment recording failed");
    } finally {
      setSaving(false);
    }
  };

  // Handle Record Expense
  const handleRecordExpense = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = formData.get("title") as string;
    const category = formData.get("category") as string;
    const amountRs = formData.get("amount") as string;
    const amountPaisa = parseRupees(amountRs);
    const paidTo = formData.get("paidTo") as string;
    const paymentMethod = formData.get("paymentMethod") as string;
    const notes = formData.get("notes") as string;

    if (!amountPaisa || amountPaisa <= 0) {
      setError("Please enter a valid amount");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/financial/expenses", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrfToken
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          category,
          amountPaisa,
          paidTo,
          paymentMethod,
          notes
        })
      });

      if (res.ok) {
        setExpenseDialog(false);
        setNotice("Expense recorded successfully!");
        setTimeout(() => setNotice(""), 4000);
        fetchData();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to record expense");
      }
    } catch (err) {
      setError("Expense recording failed");
    } finally {
      setSaving(false);
    }
  };

  // Handle Save Product
  const handleSaveProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const brand = formData.get("brand") as string;
    const category = formData.get("category") as string;
    const unit = formData.get("unit") as string;
    const wholesalePriceRs = formData.get("wholesalePrice") as string;
    const purchasePriceRs = formData.get("purchasePrice") as string;

    const wholesalePricePaisa = wholesalePriceRs ? parseRupees(wholesalePriceRs) : null;
    const purchasePricePaisa = purchasePriceRs ? parseRupees(purchasePriceRs) : null;

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrfToken
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          brand,
          category,
          unit,
          wholesalePricePaisa,
          purchasePricePaisa,
          status: "ACTIVE"
        })
      });

      if (res.ok) {
        setProductDialog(false);
        setEditingProduct(null);
        setNotice("Product saved successfully!");
        setTimeout(() => setNotice(""), 4000);
        fetchData();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to save product");
      }
    } catch (err) {
      setError("Product save failed");
    } finally {
      setSaving(false);
    }
  };

  // Handle Add Staff Member
  const handleAddMember = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
    const phone = formData.get("phone") as string;

    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrfToken
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone: phone || undefined
        })
      });

      if (res.ok) {
        setTeamDialog(false);
        setNotice("Staff member account created successfully!");
        setTimeout(() => setNotice(""), 4000);
        fetchData();
      } else {
        const err = await res.json();
        setError(err.error || "Failed to create user account");
      }
    } catch (err) {
      setError("User creation failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Amatya Traders" className="w-14 h-10 rounded-lg bg-white object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">Amatya Traders</span>
                <span className="bg-emerald-950 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-800">
                  {t.roles[userRole]}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>{session.user.name || session.user.email}</span>
                <span>•</span>
                <span>Lahan Depot HQ</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleLocale}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700 cursor-pointer"
            >
              <span>{locale === "en" ? "नेपाली" : "English"}</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition cursor-pointer"
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800 flex overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-3 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Notifications */}
      {notice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs font-semibold shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice("")} className="cursor-pointer">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs font-semibold shadow-sm">
            <div className="flex items-center gap-2">
              <CircleAlert size={16} className="text-red-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="cursor-pointer">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {loading && !financialSummary ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <LoaderCircle size={32} className="animate-spin text-emerald-600 mb-3" />
            <span className="text-sm">Loading workspace data…</span>
          </div>
        ) : page === "overview" ? (
          /* ======================================================== */
          /* OVERVIEW DASHBOARD                                       */
          /* ======================================================== */
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{t.dashboard}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.overviewHint}</p>
            </div>

            {/* Financial Overview Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.totalRevenue}</span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {money(financialSummary?.totalRevenuePaisa ?? 0, locale)}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Collected Payments</span>
                </div>
                <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={22} />
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.accountsReceivable}</span>
                  <div className="text-2xl font-black text-amber-700 mt-1">
                    {money(financialSummary?.accountsReceivablePaisa ?? 0, locale)}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Pending from Buyers</span>
                </div>
                <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock size={22} />
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.totalExpenses}</span>
                  <div className="text-2xl font-black text-rose-700 mt-1">
                    {money(financialSummary?.totalExpensesPaisa ?? 0, locale)}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Rent, Salaries, Logistics</span>
                </div>
                <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown size={22} />
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.netProfit}</span>
                  <div
                    className={`text-2xl font-black mt-1 ${
                      (financialSummary?.netProfitPaisa ?? 0) >= 0 ? "text-slate-900" : "text-rose-600"
                    }`}
                  >
                    {money(financialSummary?.netProfitPaisa ?? 0, locale)}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Revenue &minus; Expenses</span>
                </div>
                <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Wallet size={22} />
                </div>
              </div>
            </div>

            {/* Quick KPI stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-semibold">Active Products in Catalog</span>
                  <div className="text-xl font-extrabold text-slate-900">{products.length}</div>
                </div>
                <Boxes size={24} className="text-slate-400" />
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-semibold">Wholesale Orders Placed</span>
                  <div className="text-xl font-extrabold text-slate-900">{orders.length}</div>
                </div>
                <Truck size={24} className="text-slate-400" />
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-semibold">Registered Retail Buyers</span>
                  <div className="text-xl font-extrabold text-slate-900">{buyers.length}</div>
                </div>
                <Users size={24} className="text-slate-400" />
              </div>
            </div>

            {/* Recent Orders & Transactions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Truck size={16} className="text-slate-600" />
                    <span>Recent Wholesale Orders</span>
                  </h3>
                  <button
                    onClick={() => setPage("orders")}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                  >
                    View all &rarr;
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs font-mono">{o.orderNumber}</span>
                          <span className="text-xs font-medium text-slate-600">{o.buyerName}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {o.items.length} items • {new Date(o.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 text-xs block">
                          {money(o.totalPaisa, locale)}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${
                            o.status === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-800"
                              : o.status === "CONFIRMED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <p className="p-6 text-center text-xs text-slate-400">No orders recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Financial Receipts / Payments */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Receipt size={16} className="text-slate-600" />
                    <span>Recent Payment Receipts</span>
                  </h3>
                  <button
                    onClick={() => {
                      setPage("financials");
                      setFinancialSubTab("invoices");
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                  >
                    View all &rarr;
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {financialSummary?.recentPayments.slice(0, 5).map((p) => (
                    <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs font-mono">{p.paymentNumber}</span>
                          <span className="text-xs font-medium text-slate-600">{p.buyerName}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {p.method} • {new Date(p.receivedDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700 text-xs block">
                          +{money(p.amountPaisa, locale)}
                        </span>
                        <span className="text-[10px] text-slate-400">Received</span>
                      </div>
                    </div>
                  ))}
                  {(financialSummary?.recentPayments.length ?? 0) === 0 && (
                    <p className="p-6 text-center text-xs text-slate-400">No payment receipts yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : page === "financials" ? (
          /* ======================================================== */
          /* FINANCIAL MANAGEMENT DASHBOARD                           */
          /* ======================================================== */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{t.financials}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t.financialHint}</p>
              </div>

              {(isOwner || isAccountant) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpenseDialog(true)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>{t.recordExpense}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (invoices.length > 0) {
                        setSelectedInvoiceForPayment(invoices.find((i) => i.status !== "PAID") || invoices[0]);
                        setPaymentDialog(true);
                      } else {
                        alert("No invoices available to record payment.");
                      }
                    }}
                    className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>{t.recordPayment}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.totalRevenue}</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {money(financialSummary?.totalRevenuePaisa ?? 0, locale)}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Total payments received</span>
              </div>
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.accountsReceivable}</span>
                <div className="text-2xl font-black text-amber-700 mt-1">
                  {money(financialSummary?.accountsReceivablePaisa ?? 0, locale)}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Outstanding buyer invoices</span>
              </div>
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.totalExpenses}</span>
                <div className="text-2xl font-black text-rose-700 mt-1">
                  {money(financialSummary?.totalExpensesPaisa ?? 0, locale)}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Operating expenditures</span>
              </div>
              <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.netProfit}</span>
                <div
                  className={`text-2xl font-black mt-1 ${
                    (financialSummary?.netProfitPaisa ?? 0) >= 0 ? "text-slate-900" : "text-rose-600"
                  }`}
                >
                  {money(financialSummary?.netProfitPaisa ?? 0, locale)}
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Net balance after expenses</span>
              </div>
            </div>

            {/* Sub-tabs: Invoices, Expenses, Ledger */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="border-b border-slate-200 px-4 pt-3 flex space-x-6">
                {[
                  { id: "invoices", label: t.subtabInvoices },
                  { id: "expenses", label: t.subtabExpenses },
                  { id: "transactions", label: t.subtabTransactions }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setFinancialSubTab(st.id as any)}
                    className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                      financialSubTab === st.id
                        ? "border-emerald-700 text-emerald-800"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {financialSubTab === "invoices" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-3 px-4">{t.invNumber}</th>
                        <th className="py-3 px-4">{t.buyer}</th>
                        <th className="py-3 px-4">{t.dueDate}</th>
                        <th className="py-3 px-4">{t.amount}</th>
                        <th className="py-3 px-4">{t.balance}</th>
                        <th className="py-3 px-4">{t.status}</th>
                        {(isOwner || isAccountant) && <th className="py-3 px-4 text-right">{t.actions}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 block">{inv.buyerName}</span>
                            <span className="text-[11px] text-slate-400">
                              {inv.buyerBusinessName || inv.buyerPhone}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {money(inv.totalAmountPaisa, locale)}
                          </td>
                          <td className="py-3 px-4 font-bold text-amber-700">
                            {money(inv.balanceDuePaisa, locale)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                inv.status === "PAID"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : inv.status === "PARTIAL"
                                  ? "bg-blue-100 text-blue-800"
                                  : inv.status === "OVERDUE"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          {(isOwner || isAccountant) && (
                            <td className="py-3 px-4 text-right">
                              {inv.status !== "PAID" && (
                                <button
                                  onClick={() => {
                                    setSelectedInvoiceForPayment(inv);
                                    setPaymentDialog(true);
                                  }}
                                  className="text-[11px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold px-2.5 py-1 rounded border border-emerald-200 cursor-pointer"
                                >
                                  Record Payment
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">
                            No invoices recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : financialSubTab === "expenses" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Expense #</th>
                        <th className="py-3 px-4">Title / Purpose</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Paid To</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{exp.expenseNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{exp.title}</td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{exp.paidTo}</td>
                          <td className="py-3 px-4 font-bold text-rose-700">
                            {money(exp.amountPaisa, locale)}
                          </td>
                          <td className="py-3 px-4 text-slate-500">{exp.paymentMethod}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(exp.expenseDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">
                            No expenses recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Transactions Ledger */
                <div className="p-4 space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-400">
                    Recent Combined Cash Movement
                  </h4>
                  <div className="space-y-2">
                    {financialSummary?.recentPayments.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Plus size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{p.buyerName}</span>
                            <span className="text-[11px] text-slate-500">
                              Receipt #{p.paymentNumber} • {p.method} • {new Date(p.receivedDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span className="font-extrabold text-emerald-700 text-sm">
                          +{money(p.amountPaisa, locale)}
                        </span>
                      </div>
                    ))}
                    {financialSummary?.recentExpenses.map((e) => (
                      <div
                        key={e.id}
                        className="p-3 bg-rose-50/50 rounded-lg border border-rose-100 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                            <Minus size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{e.title}</span>
                            <span className="text-[11px] text-slate-500">
                              Expense #{e.expenseNumber} • {e.paidTo} • {new Date(e.expenseDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span className="font-extrabold text-rose-700 text-sm">
                          &minus;{money(e.amountPaisa, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : page === "orders" ? (
          /* ======================================================== */
          /* ORDERS MANAGEMENT                                        */
          /* ======================================================== */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{t.orders}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t.orderHint}</p>
              </div>
              <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                {orders.length} Total Orders
              </span>
            </div>

            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-slate-900 text-sm">{o.orderNumber}</span>
                      <span className="text-xs font-semibold text-slate-700">{o.buyerName}</span>
                      {o.buyerPhone && (
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Phone size={11} />
                          {o.buyerPhone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          o.status === "DELIVERED"
                            ? "bg-emerald-100 text-emerald-800"
                            : o.status === "DISPATCHED"
                            ? "bg-purple-100 text-purple-800"
                            : o.status === "CONFIRMED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  </div>

                  {/* Order items table */}
                  <div className="space-y-1.5 mb-3">
                    {o.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-600">
                        <span>
                          {item.name} &times; <strong>{item.quantity} {item.unit}</strong>
                        </span>
                        <span className="font-semibold text-slate-800">{money(item.totalPaisa, locale)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400" />
                      <span>{o.deliveryAddress}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Order Total:</span>
                        <span className="font-extrabold text-slate-900 text-base">{money(o.totalPaisa, locale)}</span>
                      </div>

                      {/* Status Action Buttons */}
                      {(isOwner || isSales) && (
                        <div className="flex items-center gap-1.5">
                          {o.status === "PENDING" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "CONFIRMED")}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition cursor-pointer"
                            >
                              {t.confirmOrder}
                            </button>
                          )}
                          {o.status === "CONFIRMED" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "DISPATCHED")}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition cursor-pointer"
                            >
                              {t.dispatchOrder}
                            </button>
                          )}
                          {o.status === "DISPATCHED" && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "DELIVERED")}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition cursor-pointer"
                            >
                              {t.deliverOrder}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {orders.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                  <Truck size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No wholesale orders placed yet</p>
                </div>
              )}
            </div>
          </div>
        ) : page === "products" ? (
          /* ======================================================== */
          /* PRODUCTS CATALOG MANAGEMENT                              */
          /* ======================================================== */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{t.products}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t.productHint}</p>
              </div>

              {(isOwner || isAccountant) && (
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductDialog(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus size={15} />
                  <span>{t.addProduct}</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">SKU</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4">Wholesale Rate</th>
                      {(isOwner || isAccountant) && <th className="py-3 px-4">Purchase Cost</th>}
                      <th className="py-3 px-4">Status</th>
                      {(isOwner || isAccountant) && <th className="py-3 px-4 text-right">Edit</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-slate-500">{p.sku}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 text-slate-600">{p.category}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{p.unit}</td>
                        <td className="py-3 px-4 font-extrabold text-emerald-800">
                          {money(p.wholesalePricePaisa, locale)}
                        </td>
                        {(isOwner || isAccountant) && (
                          <td className="py-3 px-4 font-semibold text-slate-500">
                            {money(p.purchasePricePaisa, locale)}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              p.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        {(isOwner || isAccountant) && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setProductDialog(true);
                              }}
                              className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* TEAM & RETAILERS                                         */
          /* ======================================================== */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{t.team}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t.teamHint}</p>
              </div>

              {isOwner && (
                <button
                  onClick={() => setTeamDialog(true)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus size={15} />
                  <span>{t.addTeamMember}</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="border-b border-slate-200 px-4 pt-3 flex space-x-6">
                {[
                  { id: "team", label: t.subtabTeam },
                  { id: "buyers", label: t.subtabBuyers }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setTeamSubTab(st.id as any)}
                    className={`pb-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                      teamSubTab === st.id
                        ? "border-emerald-700 text-emerald-800"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {st.label} ({st.id === "team" ? users.length : buyers.length})
                  </button>
                ))}
              </div>

              {teamSubTab === "team" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Phone</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-bold text-slate-900">{u.name || "—"}</td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[10px]">
                              {t.roles[u.role] || u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{u.email || "—"}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono">{u.phone || "—"}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                u.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-3 px-4">Retail Shop Name</th>
                        <th className="py-3 px-4">Proprietor Name</th>
                        <th className="py-3 px-4">Mobile Number</th>
                        <th className="py-3 px-4">Shop Address</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {buyers.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-bold text-slate-900">{b.businessName || "—"}</td>
                          <td className="py-3 px-4 text-slate-700 font-semibold">{b.name}</td>
                          <td className="py-3 px-4 font-mono text-emerald-800 font-bold">{b.phone}</td>
                          <td className="py-3 px-4 text-slate-600">{b.address || "Lahan"}</td>
                          <td className="py-3 px-4">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              Verified Retailer
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODALS / DIALOGS */}
      {/* ======================================================== */}

      {/* 1. Record Payment Modal */}
      {paymentDialog && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Receipt size={16} className="text-emerald-700" />
                <span>Record Payment for {selectedInvoiceForPayment.invoiceNumber}</span>
              </h3>
              <button
                onClick={() => setPaymentDialog(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-3.5 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-amber-800 font-bold block">{selectedInvoiceForPayment.buyerName}</span>
                  <span className="text-[11px] text-amber-600">Balance Due</span>
                </div>
                <span className="font-extrabold text-amber-900 text-base">
                  {money(selectedInvoiceForPayment.balanceDuePaisa, locale)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount in Nepalese Rupees (NRs) *
                </label>
                <input
                  type="text"
                  name="amount"
                  defaultValue={(selectedInvoiceForPayment.balanceDuePaisa / 100).toFixed(2)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                <select
                  name="method"
                  defaultValue="CASH"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="CASH">Cash Deposit</option>
                  <option value="BANK_TRANSFER">Bank Transfer / Cheque Deposit</option>
                  <option value="ESEWA">eSewa Mobile Payment</option>
                  <option value="KHALTI">Khalti Payment</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / Transaction ID</label>
                <input
                  type="text"
                  name="reference"
                  placeholder="e.g. Bank Voucher # / TXN-9842"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="e.g. Cleared at Lahan counter"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentDialog(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {saving ? t.saving : "Confirm Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Record Expense Modal */}
      {expenseDialog && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-600" />
                <span>{t.recordExpense}</span>
              </h3>
              <button
                onClick={() => setExpenseDialog(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Warehouse monthly rent / Staff loading allowance"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    name="category"
                    defaultValue="RENT"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="RENT">Rent</option>
                    <option value="SALARIES">Salaries & Wages</option>
                    <option value="TRANSPORT">Fuel & Transport</option>
                    <option value="UTILITIES">Electricity & NEA</option>
                    <option value="SUPPLIES">Packaging & Supplies</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OTHER">Other Operating Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount in NRs *</label>
                  <input
                    type="text"
                    name="amount"
                    placeholder="e.g. 15000"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Paid To *</label>
                  <input
                    type="text"
                    name="paidTo"
                    placeholder="Recipient / Vendor"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    name="paymentMethod"
                    defaultValue="CASH"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Optional details"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExpenseDialog(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {saving ? t.saving : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add / Edit Product Modal */}
      {productDialog && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Boxes size={16} className="text-emerald-700" />
                <span>{editingProduct ? "Edit Product" : t.addProduct}</span>
              </h3>
              <button
                onClick={() => setProductDialog(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingProduct?.name || ""}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    name="brand"
                    defaultValue={editingProduct?.brand || ""}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingProduct?.category || "Grains & Essentials"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Unit</label>
                  <select
                    name="unit"
                    defaultValue={editingProduct?.unit || "bag"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="bag">Bag</option>
                    <option value="jar">Jar</option>
                    <option value="carton">Carton</option>
                    <option value="packet">Packet</option>
                    <option value="box">Box</option>
                    <option value="piece">Piece</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wholesale Rate (NRs)</label>
                  <input
                    type="text"
                    name="wholesalePrice"
                    defaultValue={editingProduct?.wholesalePricePaisa ? (editingProduct.wholesalePricePaisa / 100).toFixed(2) : ""}
                    placeholder="2850.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Cost (NRs)</label>
                  <input
                    type="text"
                    name="purchasePrice"
                    defaultValue={editingProduct?.purchasePricePaisa ? (editingProduct.purchasePricePaisa / 100).toFixed(2) : ""}
                    placeholder="2450.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductDialog(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Staff Member Modal */}
      {teamDialog && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Users size={16} className="text-emerald-700" />
                <span>{t.addTeamMember}</span>
              </h3>
              <button
                onClick={() => setTeamDialog(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Binod Amatya"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Login Email * (No phone required)</label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. staff@amatya.com"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Password *</label>
                <input
                  type="password"
                  name="password"
                  placeholder="At least 6 characters"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    name="role"
                    defaultValue="SALES"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="SALES">Sales Manager</option>
                    <option value="WAREHOUSE">Warehouse Staff</option>
                    <option value="DELIVERY">Delivery Team</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile (Optional for staff)</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTeamDialog(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {saving ? t.saving : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

