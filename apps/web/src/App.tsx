import { useEffect, useState, type FormEvent } from "react";
import {
  Globe,
  LoaderCircle,
  MapPin
} from "lucide-react";
import { z } from "zod";
import { Workspace } from "./Workspace.js";
import { BuyerDashboard } from "./BuyerDashboard.js";

const userSchema = z.object({
  id: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(["OWNER", "ADMIN", "ACCOUNTANT", "SALES", "WAREHOUSE", "DELIVERY", "RETAILER"]),
  status: z.enum(["ACTIVE", "DISABLED"]),
  name: z.string().optional(),
  businessName: z.string().optional(),
  address: z.string().optional()
});

const sessionSchema = z.object({
  user: userSchema,
  csrfToken: z.string()
});

const translations = {
  en: {
    siteName: "Amatya Traders",
    tagline: "Wholesale Grocery & FMCG Distribution",
    location: "Lahan, Siraha, Nepal",
    language: "नेपाली",
    switchLanguage: "Switch language to Nepali",
    checkingSession: "Checking your secure session…",
    signInTitle: "Sign In to Amatya Traders",
    signInSubtitle: "Staff, Sales, Accounting & Retailer Wholesale Access",
    identifierLabel: "Email or Phone Number",
    identifierPlaceholder: "e.g. owner@amatya.com or 98XXXXXXXX",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••••••",
    signInButton: "Sign In",
    signingIn: "Signing in…",
    quickDemoTitle: "Quick Demo One-Click Logins",
    ownerRole: "Owner",
    accountantRole: "Accountant",
    salesRole: "Sales Manager",
    buyerRole: "Demo Retailer (Buyer)",
    registerTab: "New Retailer Registration",
    signInTab: "Sign In",
    regName: "Proprietor Full Name",
    regShop: "Retail Shop / Store Name",
    regPhone: "Nepal Mobile Number (Required)",
    regAddress: "Shop Address (e.g. Main Bazaar, Lahan)",
    regPassword: "Create Password",
    regSubmit: "Register as Retailer & Access Portal",
    registering: "Creating account…",
    genericError: "Something went wrong. Please check your credentials and try again."
  },
  ne: {
    siteName: "अमात्य ट्रेडर्स",
    tagline: "थोक किराना तथा खाद्य सामग्री वितरण",
    location: "लहान, सिराहा, नेपाल",
    language: "English",
    switchLanguage: "भाषा अङ्ग्रेजीमा परिवर्तन गर्नुहोस्",
    checkingSession: "तपाईंको सुरक्षित सत्र जाँच हुँदैछ…",
    signInTitle: "अमात्य ट्रेडर्समा साइन इन",
    signInSubtitle: "कर्मचारी, बिक्री, लेखा तथा खुद्रा विक्रेता पहुँच",
    identifierLabel: "इमेल वा मोबाइल नम्बर",
    identifierPlaceholder: "जस्तै: owner@amatya.com वा ९८XXXXXXXX",
    passwordLabel: "पासवर्ड",
    passwordPlaceholder: "••••••••••••",
    signInButton: "साइन इन गर्नुहोस्",
    signingIn: "साइन इन हुँदैछ…",
    quickDemoTitle: "परीक्षण खाताहरू (एक क्लिकमा लगइन)",
    ownerRole: "मालिक",
    accountantRole: "लेखापाल",
    salesRole: "बिक्री प्रबन्धक",
    buyerRole: "खुद्रा विक्रेता (ग्राहक)",
    registerTab: "नयाँ खुद्रा विक्रेता दर्ता",
    signInTab: "साइन इन",
    regName: "सञ्चालकको पूरा नाम",
    regShop: "पसल वा फर्मको नाम",
    regPhone: "नेपाल मोबाइल नम्बर (अनिवार्य)",
    regAddress: "पसलको ठेगाना (जस्तै: मुख्य बजार, लहान)",
    regPassword: "पासवर्ड राख्नुहोस्",
    regSubmit: "खुद्रा खाता दर्ता गर्नुहोस्",
    registering: "खाता बन्दैछ…",
    genericError: "केही समस्या भयो। कृपया विवरण जाँच गरी फेरि प्रयास गर्नुहोस्।"
  }
} as const;

type Locale = keyof typeof translations;
type Session = z.infer<typeof sessionSchema>;

function getInitialLocale(): Locale {
  return localStorage.getItem("amatya-language") === "ne" ? "ne" : "en";
}

export function App() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const copy = translations[locale];
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login form
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regShop, setRegShop] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("amatya-language", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  // Check existing session
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/me", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) return null;
        const parsed = sessionSchema.safeParse(await response.json());
        if (!parsed.success) return null;
        return parsed.data;
      })
      .then((result) => {
        if (result) setSession(result);
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false));

    return () => controller.abort();
  }, []);

  /** Safely parse JSON from a fetch Response — returns null if body is empty or not JSON */
  async function safeJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text || text.trim().length === 0) return null;
    try { return JSON.parse(text); } catch { return null; }
  }

  const handleLogin = async (e?: FormEvent, customIdent?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setBusy(true);
    setError(null);

    const loginId = customIdent || identifier;
    const loginPw = customPass || password;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ identifier: loginId, password: loginPw })
      });

      const data = await safeJson(response);
      if (!response.ok) {
        const errMsg = (data && typeof data === "object" && "error" in data)
          ? String((data as Record<string, unknown>).error)
          : copy.genericError;
        throw new Error(errMsg);
      }

      const parsed = sessionSchema.safeParse(data);
      if (!parsed.success) throw new Error(copy.genericError);

      setSession(parsed.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.genericError);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register-buyer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: regName,
          phone: regPhone,
          businessName: regShop,
          address: regAddress,
          password: regPassword
        })
      });

      const data = await safeJson(response);
      if (!response.ok) {
        const errMsg = (data && typeof data === "object" && "error" in data)
          ? String((data as Record<string, unknown>).error)
          : copy.genericError;
        throw new Error(errMsg);
      }

      const parsed = sessionSchema.safeParse(data);
      if (!parsed.success) throw new Error(copy.genericError);

      setSession(parsed.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy.genericError);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    if (!session) return;
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-csrf-token": session.csrfToken },
        credentials: "include"
      });
    } catch {
      // ignore
    }
    setSession(null);
  };

  const toggleLocale = () => setLocale((curr) => (curr === "en" ? "ne" : "en"));

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-xl border border-slate-200 shadow-sm text-slate-700">
          <LoaderCircle size={22} className="animate-spin text-emerald-600" />
          <span className="text-sm font-semibold">{copy.checkingSession}</span>
        </div>
      </main>
    );
  }

  // If signed in, render BuyerDashboard for RETAILER, or Workspace for staff
  if (session) {
    if (session.user.role === "RETAILER") {
      return (
        <BuyerDashboard
          session={session}
          onLogout={handleLogout}
          locale={locale}
          onToggleLocale={toggleLocale}
        />
      );
    }

    return (
      <Workspace
        session={session}
        onLogout={handleLogout}
        locale={locale}
        onToggleLocale={toggleLocale}
      />
    );
  }

  // Not signed in: Render Login & Registration Portal
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full mx-auto">
        {/* Brand Lockup */}
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="Amatya Traders"
            className="w-36 h-24 object-contain rounded-xl bg-white p-2 shadow-lg shadow-emerald-950 mx-auto mb-3"
          />
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{copy.siteName}</h1>
          <p className="text-emerald-400 font-medium text-xs mt-0.5">{copy.tagline}</p>
          <p className="text-slate-400 text-[11px] mt-0.5 flex items-center justify-center gap-1">
            <MapPin size={11} />
            <span>{copy.location}</span>
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Top Bar with Language and Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 pt-4 pb-2 bg-slate-50">
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`text-xs font-bold pb-2 transition border-b-2 cursor-pointer ${
                  mode === "login"
                    ? "border-emerald-700 text-emerald-800"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {copy.signInTab}
              </button>
              <button
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`text-xs font-bold pb-2 transition border-b-2 cursor-pointer ${
                  mode === "register"
                    ? "border-emerald-700 text-emerald-800"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                {copy.registerTab}
              </button>
            </div>

            <button
              onClick={toggleLocale}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer"
            >
              <Globe size={12} />
              <span>{copy.language}</span>
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {mode === "login" ? (
              /* LOGIN FORM */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {copy.identifierLabel}
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={copy.identifierPlaceholder}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-slate-50 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {copy.passwordLabel}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={copy.passwordPlaceholder}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-slate-50 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>{copy.signingIn}</span>
                    </>
                  ) : (
                    <span>{copy.signInButton}</span>
                  )}
                </button>

                {/* Development-only demo accounts; never ship seeded passwords to production. */}
                {import.meta.env.DEV && <div className="pt-4 border-t border-slate-100">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                    {copy.quickDemoTitle}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLogin(undefined, "owner@amatya.com", "Owner@Amatya2026")}
                      className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left transition cursor-pointer"
                    >
                      <span className="text-[11px] font-bold text-emerald-900 block">👑 {copy.ownerRole}</span>
                      <span className="text-[9px] text-emerald-700 block truncate">owner@amatya.com</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLogin(undefined, "sales@amatya.com", "Sales@Amatya2026")}
                      className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-left transition cursor-pointer"
                    >
                      <span className="text-[11px] font-bold text-blue-900 block">💼 {copy.salesRole}</span>
                      <span className="text-[9px] text-blue-700 block truncate">sales@amatya.com</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLogin(undefined, "accountant@amatya.com", "Accountant@Amatya2026")}
                      className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-left transition cursor-pointer"
                    >
                      <span className="text-[11px] font-bold text-purple-900 block">📊 {copy.accountantRole}</span>
                      <span className="text-[9px] text-purple-700 block truncate">accountant@amatya.com</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLogin(undefined, "buyer@amatya.com", "Buyer@Amatya2026")}
                      className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left transition cursor-pointer"
                    >
                      <span className="text-[11px] font-bold text-amber-900 block">🛒 {copy.buyerRole}</span>
                      <span className="text-[9px] text-amber-700 block truncate">9848730175</span>
                    </button>
                  </div>
                  </div>}
              </form>
            ) : (
              /* BUYER REGISTRATION FORM (Requires Phone) */
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{copy.regName} *</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Ramesh Sah"
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{copy.regShop} *</label>
                  <input
                    type="text"
                    value={regShop}
                    onChange={(e) => setRegShop(e.target.value)}
                    placeholder="e.g. Lahan Kirana & General Store"
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>{copy.regPhone} *</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Nepal Mobile</span>
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="98XXXXXXXX"
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-slate-50 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{copy.regAddress} *</label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="e.g. Main Road, Ward 4, Lahan, Siraha"
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{copy.regPassword} *</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-slate-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>{copy.registering}</span>
                    </>
                  ) : (
                    <span>{copy.regSubmit}</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Amatya Traders Wholesale Distribution Management &bull; Lahan, Nepal
        </p>
      </div>
    </main>
  );
}
