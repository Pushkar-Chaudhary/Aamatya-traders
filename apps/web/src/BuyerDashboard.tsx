import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  CheckCircle2,
  FileText,
  Globe,
  LoaderCircle,
  LogOut,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  X
} from "lucide-react";

type Locale = "en" | "ne";

type User = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  businessName?: string;
  address?: string;
  role: string;
  status: string;
};

type Session = {
  user: User;
  csrfToken: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
  unit: string;
  wholesalePricePaisa: number | null;
  status: string;
};

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
  buyerName: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalPaisa: number;
  status: "PENDING" | "CONFIRMED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
  notes?: string;
  createdAt: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  issuedDate: string;
  dueDate: string;
  totalAmountPaisa: number;
  paidAmountPaisa: number;
  balanceDuePaisa: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  items: Array<{ description: string; quantity: number; unitPricePaisa: number; totalPaisa: number }>;
  notes?: string;
};

type CartItem = {
  product: Product;
  quantity: number;
};

const copy = {
  en: {
    portalTitle: "Amatya Retailer Portal",
    location: "Lahan, Siraha",
    switchLang: "नेपाली",
    tabCatalog: "Wholesale Catalog",
    tabOrders: "My Orders",
    tabInvoices: "Invoices & Balance",
    tabProfile: "Store Profile",
    searchPlaceholder: "Search wholesale products, brands, SKUs…",
    allCategories: "All Categories",
    wholesalePrice: "Wholesale Rate",
    unit: "Unit",
    addToCart: "Add to Order",
    cart: "Order Cart",
    cartEmpty: "Your order cart is empty",
    cartEmptyHint: "Browse the wholesale catalog and add goods for your retail store.",
    cartTotal: "Total Order Value",
    deliveryAddress: "Delivery Address (Shop Location)",
    orderNotes: "Order Notes / Instructions (Optional)",
    orderNotesPlaceholder: "e.g. Deliver before 11 AM via Lahan Bazaar route",
    placeOrder: "Submit Wholesale Order",
    placingOrder: "Submitting order…",
    orderSuccess: "Wholesale order placed successfully!",
    ordersEmpty: "No orders placed yet",
    ordersEmptyHint: "When you submit wholesale orders, they will appear here with live tracking.",
    orderNo: "Order #",
    items: "Items",
    total: "Total",
    status: "Status",
    date: "Date",
    invoicesTitle: "Outstanding Dues & Invoices",
    totalDues: "Total Outstanding Balance",
    invoicesEmpty: "No invoices recorded",
    invoicesEmptyHint: "Your wholesale purchase invoices and payment history will appear here.",
    invNo: "Invoice #",
    due: "Due Date",
    balance: "Balance Due",
    paid: "Paid",
    statusPaid: "Paid",
    statusPartial: "Partial",
    statusPending: "Pending",
    statusOverdue: "Overdue",
    shopDetails: "Retail Shop Details",
    ownerName: "Proprietor / Contact Name",
    phone: "Registered Mobile Number",
    phoneVerified: "Verified Nepal Mobile",
    businessName: "Business / Store Name",
    address: "Shop Delivery Address",
    signOut: "Sign Out",
    loading: "Loading wholesale catalog…",
    errorLoading: "Failed to load data. Please try again.",
    retry: "Retry",
    statuses: {
      PENDING: "Order Placed",
      CONFIRMED: "Confirmed by Staff",
      DISPATCHED: "Out for Delivery",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled"
    }
  },
  ne: {
    portalTitle: "अमात्य खुद्रा विक्रेता पोर्टल",
    location: "लहान, सिराहा",
    switchLang: "English",
    tabCatalog: "थोक सामान सूची",
    tabOrders: "मेरो अर्डरहरू",
    tabInvoices: "लेखा तथा बक्यौता",
    tabProfile: "पसल विवरण",
    searchPlaceholder: "सामानको नाम, ब्रान्ड वा कोड खोज्नुहोस्…",
    allCategories: "सबै वर्ग",
    wholesalePrice: "थोक मूल्य",
    unit: "एकाइ",
    addToCart: "अर्डरमा थप्नुहोस्",
    cart: "अर्डर झोला",
    cartEmpty: "तपाईंको अर्डर झोला खाली छ",
    cartEmptyHint: "थोक सूचीबाट आफ्नो पसलका लागि सामान थप्नुहोस्।",
    cartTotal: "जम्मा अर्डर रकम",
    deliveryAddress: "डेलिभरी ठेगाना (पसलको स्थान)",
    orderNotes: "अर्डर सम्बन्धी विशेष निर्देशन (ऐच्छिक)",
    orderNotesPlaceholder: "जस्तै: बिहान ११ बजेअघि लहान बजार मार्गबाट पठाउनुहोस्",
    placeOrder: "थोक अर्डर पठाउनुहोस्",
    placingOrder: "अर्डर पठाइँदैछ…",
    orderSuccess: "थोक अर्डर सफलतापूर्वक पठाइयो!",
    ordersEmpty: "अहिलेसम्म कुनै अर्डर छैन",
    ordersEmptyHint: "तपाईंले अर्डर गरेपछि यहाँ प्रत्यक्ष अवस्था देखिनेछ।",
    orderNo: "अर्डर नं.",
    items: "सामान",
    total: "जम्मा रकम",
    status: "स्थिति",
    date: "मिति",
    invoicesTitle: "बक्यौता तथा बिल विवरण",
    totalDues: "जम्मा तिर्न बाँकी बक्यौता",
    invoicesEmpty: "कुनै बिल फेला परेन",
    invoicesEmptyHint: "तपाईंको खरिद बिल र भुक्तानी इतिहास यहाँ देखिनेछ।",
    invNo: "बिल नं.",
    due: "भाका मिति",
    balance: "बाँकी रकम",
    paid: "भुक्तानी भएको",
    statusPaid: "चुक्ता",
    statusPartial: "आंशिक",
    statusPending: "बाँकी",
    statusOverdue: "म्याद नाघेको",
    shopDetails: "खुद्रा पसल विवरण",
    ownerName: "पसल सञ्चालकको नाम",
    phone: "दर्ता गरिएको मोबाइल नम्बर",
    phoneVerified: "प्रमाणित नेपाल मोबाइल",
    businessName: "पसल वा फर्मको नाम",
    address: "पसलको ठेगाना",
    signOut: "साइन आउट",
    loading: "थोक सूची लोड हुँदैछ…",
    errorLoading: "विवरण लोड गर्न सकिएन। पुनः प्रयास गर्नुहोस्।",
    retry: "फेरि प्रयास",
    statuses: {
      PENDING: "अर्डर प्राप्त",
      CONFIRMED: "स्वीकृत",
      DISPATCHED: "डेलिभरीमा हिँड्यो",
      DELIVERED: "डेलिभर भयो",
      CANCELLED: "रद्द भयो"
    }
  }
};

function formatNpr(paisa: number | null | undefined, locale: Locale): string {
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

export function BuyerDashboard({
  session,
  onLogout,
  locale,
  onToggleLocale
}: {
  session: Session;
  onLogout: () => void;
  locale: Locale;
  onToggleLocale: () => void;
}) {
  const t = copy[locale];
  const [activeTab, setActiveTab] = useState<"catalog" | "orders" | "invoices" | "profile">("catalog");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(session.user.address || "Lahan Bazaar, Siraha");
  const [orderNotes, setOrderNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsRes, ordersRes, invRes] = await Promise.all([
        fetch("/api/products", { credentials: "include" }),
        fetch("/api/orders", { credentials: "include" }),
        fetch("/api/financial/invoices", { credentials: "include" })
      ]);

      if (prodsRes.ok) {
        const data = await prodsRes.json();
        setProducts(data.products || []);
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
      }
      if (invRes.ok) {
        const data = await invRes.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("Failed to load buyer data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status !== "ACTIVE") return false;
      const matchesSearch =
        search.trim() === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotalPaisa = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = item.product.wholesalePricePaisa ?? 0;
      return sum + price * item.quantity;
    }, 0);
  }, [cart]);

  const totalOutstandingPaisa = useMemo(() => {
    return invoices.reduce((sum, inv) => {
      if (inv.status !== "PAID") {
        return sum + inv.balanceDuePaisa;
      }
      return sum;
    }, 0);
  }, [invoices]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setSubmittingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": session.csrfToken
        },
        credentials: "include",
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity
          })),
          deliveryAddress,
          notes: orderNotes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to submit order");
        return;
      }

      setCart([]);
      setIsCartOpen(false);
      setSuccessMessage(t.orderSuccess);
      setTimeout(() => setSuccessMessage(null), 5000);
      setActiveTab("orders");
      await loadData();
    } catch (err) {
      alert("Error placing order. Please try again.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-emerald-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Amatya Traders" className="w-14 h-10 rounded-lg bg-white object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">Amatya Traders</span>
                <span className="bg-emerald-800 text-emerald-200 text-xs px-2 py-0.5 rounded-full font-medium border border-emerald-700">
                  {t.portalTitle}
                </span>
              </div>
              <div className="text-xs text-emerald-300 flex items-center gap-1.5">
                <MapPin size={12} />
                <span>{session.user.businessName || t.location}</span>
                {session.user.phone && (
                  <>
                    <span>•</span>
                    <Phone size={12} />
                    <span>{session.user.phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleLocale}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-700 text-emerald-100 transition border border-emerald-700 cursor-pointer"
            >
              <Globe size={14} />
              <span>{t.switchLang}</span>
            </button>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-3.5 py-1.5 rounded-lg text-sm transition shadow-sm cursor-pointer"
            >
              <ShoppingCart size={18} />
              <span>{t.cart}</span>
              {cart.length > 0 && (
                <span className="bg-slate-900 text-white text-xs px-1.5 py-0.2 rounded-full font-bold ml-1">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-xs text-emerald-200 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-emerald-800/80 transition cursor-pointer"
            >
              <LogOut size={15} />
              <span>{t.signOut}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-emerald-800 flex overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-4 py-2">
            {[
              { id: "catalog", label: t.tabCatalog, icon: Package },
              { id: "orders", label: t.tabOrders, icon: Truck, count: orders.length },
              { id: "invoices", label: t.tabInvoices, icon: FileText },
              { id: "profile", label: t.tabProfile, icon: Building2 }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-white text-emerald-950 font-bold shadow-sm"
                      : "text-emerald-200 hover:text-white hover:bg-emerald-800/60"
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-emerald-100 text-emerald-800" : "bg-emerald-800 text-emerald-300"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Success Notification */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-600" />
              <span className="font-semibold text-sm">{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <LoaderCircle size={32} className="animate-spin text-emerald-600 mb-3" />
            <span className="text-sm">{t.loading}</span>
          </div>
        ) : activeTab === "catalog" ? (
          <div>
            {/* Search & Categories Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-96">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition ${
                    selectedCategory === "ALL"
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.allCategories}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => {
                const inCart = cart.find((item) => item.product.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {p.category || "General"}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{p.sku}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug mb-1">{p.name}</h3>
                      {p.brand && <p className="text-xs text-slate-500 mb-3">{p.brand}</p>}
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-2">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-xs text-slate-500 font-medium">{t.wholesalePrice}:</span>
                        <span className="text-lg font-extrabold text-emerald-800">
                          {formatNpr(p.wholesalePricePaisa, locale)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-3 flex items-center justify-between">
                        <span>
                          {t.unit}: <strong className="text-slate-700">{p.unit}</strong>
                        </span>
                        <span className="text-emerald-600 font-semibold">● Wholesale Available</span>
                      </div>

                      {inCart ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(p.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-white text-emerald-900 hover:bg-emerald-100 font-bold text-sm shadow-sm cursor-pointer"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="font-bold text-sm text-emerald-950">
                            {inCart.quantity} {p.unit}
                          </span>
                          <button
                            onClick={() => updateQuantity(p.id, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-white text-emerald-900 hover:bg-emerald-100 font-bold text-sm shadow-sm cursor-pointer"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(p)}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                        >
                          <Plus size={16} />
                          <span>{t.addToCart}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <Package size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-600 font-semibold">No wholesale products found</p>
                <p className="text-slate-400 text-xs mt-1">Try adjusting your search or category filter.</p>
              </div>
            )}
          </div>
        ) : activeTab === "orders" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{t.tabOrders}</h2>
              <span className="text-xs text-slate-500">Live wholesale orders track</span>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-6">
                <Truck size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-700 font-bold">{t.ordersEmpty}</p>
                <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">{t.ordersEmptyHint}</p>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                >
                  <Package size={14} />
                  <span>{t.tabCatalog}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => {
                  const statusColors = {
                    PENDING: "bg-amber-100 text-amber-800 border-amber-300",
                    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
                    DISPATCHED: "bg-purple-100 text-purple-800 border-purple-300",
                    DELIVERED: "bg-emerald-100 text-emerald-800 border-emerald-300",
                    CANCELLED: "bg-red-100 text-red-800 border-red-300"
                  };
                  return (
                    <div
                      key={o.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{o.orderNumber}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusColors[o.status]}`}
                        >
                          {t.statuses[o.status] || o.status}
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        {o.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-600">
                            <span>
                              {i.name} &times; <strong>{i.quantity} {i.unit}</strong>
                            </span>
                            <span className="font-semibold">{formatNpr(i.totalPaisa, locale)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{o.deliveryAddress}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-slate-400">{t.total}:</span>
                          <span className="text-base font-extrabold text-slate-900">
                            {formatNpr(o.totalPaisa, locale)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "invoices" ? (
          <div>
            {/* Outstanding Balance Banner */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-5 text-slate-900 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  {t.totalDues}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-0.5">
                  {formatNpr(totalOutstandingPaisa, locale)}
                </h2>
                <p className="text-xs text-amber-950 mt-1">
                  14 days standard credit cycle for registered wholesale retailers.
                </p>
              </div>
              <div className="bg-amber-400/50 backdrop-blur px-4 py-2 rounded-lg text-xs font-semibold text-amber-950 border border-amber-300">
                Payment settlement accepted via Bank, Cash, or eSewa/Khalti
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm">{t.invoicesTitle}</h3>
                <span className="text-xs text-slate-500">{invoices.length} Invoices</span>
              </div>

              {invoices.length === 0 ? (
                <div className="text-center py-12 p-4 text-slate-500">
                  <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-sm">{t.invoicesEmpty}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.invoicesEmptyHint}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-3 px-4">{t.invNo}</th>
                        <th className="py-3 px-4">{t.date}</th>
                        <th className="py-3 px-4">{t.due}</th>
                        <th className="py-3 px-4">{t.total}</th>
                        <th className="py-3 px-4">{t.paid}</th>
                        <th className="py-3 px-4">{t.balance}</th>
                        <th className="py-3 px-4">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(inv.issuedDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {formatNpr(inv.totalAmountPaisa, locale)}
                          </td>
                          <td className="py-3 px-4 text-emerald-700 font-semibold">
                            {formatNpr(inv.paidAmountPaisa, locale)}
                          </td>
                          <td className="py-3 px-4 text-amber-700 font-bold">
                            {formatNpr(inv.balanceDuePaisa, locale)}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Profile Tab */
          <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {session.user.businessName || "Registered Wholesale Partner"}
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  Verified Retail Buyer
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block mb-1">{t.ownerName}</span>
                <span className="font-semibold text-slate-800 text-sm">{session.user.name || "—"}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block mb-1">{t.phone}</span>
                <span className="font-semibold text-slate-800 text-sm font-mono flex items-center gap-1">
                  <Phone size={13} className="text-emerald-600" />
                  {session.user.phone || "—"}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block mb-1">{t.businessName}</span>
                <span className="font-semibold text-slate-800 text-sm">{session.user.businessName || "—"}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 block mb-1">{t.address}</span>
                <span className="font-semibold text-slate-800 text-sm flex items-center gap-1">
                  <MapPin size={13} className="text-emerald-600" />
                  {session.user.address || "Lahan, Nepal"}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>Wholesale account active at Amatya Traders Depot.</span>
              <button
                onClick={onLogout}
                className="text-red-600 hover:text-red-700 font-semibold cursor-pointer"
              >
                {t.signOut}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-emerald-700" />
                <h3 className="font-bold text-slate-900">{t.cart}</h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} {t.items}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ShoppingCart size={40} className="mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">{t.cartEmpty}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.cartEmptyHint}</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{item.product.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {formatNpr(item.product.wholesalePricePaisa, locale)} &times; {item.quantity} {item.product.unit}
                      </p>
                      <span className="text-xs font-bold text-emerald-800">
                        {formatNpr((item.product.wholesalePricePaisa ?? 0) * item.quantity, locale)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 bg-white rounded-md">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer & Checkout */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    {t.deliveryAddress}
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />

                  <label className="block text-xs font-semibold text-slate-700">
                    {t.orderNotes}
                  </label>
                  <input
                    type="text"
                    placeholder={t.orderNotesPlaceholder}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                  <span className="text-xs font-semibold text-slate-500">{t.cartTotal}:</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {formatNpr(cartTotalPaisa, locale)}
                  </span>
                </div>

                <button
                  disabled={submittingOrder || !deliveryAddress}
                  onClick={handlePlaceOrder}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-lg text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingOrder ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>{t.placingOrder}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{t.placeOrder}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
