export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const queryApiUrl = urlParams.get("apiUrl");
    if (queryApiUrl) {
      const cleaned = queryApiUrl.trim().replace(/\/$/, "");
      localStorage.setItem("spice-api-url", cleaned);
      return cleaned;
    }
    const saved = localStorage.getItem("spice-api-url");
    if (saved) {
      return saved.trim().replace(/\/$/, "");
    }
  }
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "/api";
}

export function setApiBaseUrl(url: string | null): void {
  if (typeof window === "undefined") return;
  if (!url || !url.trim()) {
    localStorage.removeItem("spice-api-url");
  } else {
    localStorage.setItem("spice-api-url", url.trim().replace(/\/$/, ""));
  }
}

export function getFullApiUrl(path: string, baseUrl?: string): string {
  const base = baseUrl !== undefined ? baseUrl.trim().replace(/\/$/, "") : getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!base || base === "/" || base === "/api") {
    return `/api${normalizedPath}`;
  }
  if (base.endsWith("/api")) {
    return `${base}${normalizedPath}`;
  }
  return `${base}/api${normalizedPath}`;
}

export async function testApiHealth(customUrl?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const target = getFullApiUrl("/health", customUrl);
    const res = await fetch(target, { method: "GET" });
    if (!res.ok) {
      return { ok: false, message: `Server returned HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    if (data.status === "ok") {
      return { ok: true, message: "Connected successfully (status: ok)" };
    }
    return { ok: true, message: `Reachable (HTTP ${res.status})` };
  } catch (err) {
    return { ok: false, message: (err as Error).message || "Connection failed" };
  }
}

export function getToken() {
  return localStorage.getItem("spice-token");
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const endpoint = getFullApiUrl(path);
  const response = await fetch(endpoint, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  let body: any = {};
  if (contentType.includes("application/json")) {
    body = await response.json().catch(() => ({}));
  } else {
    // If server responded with HTML (like an SPA fallback / 404), it's not valid API JSON
    const text = await response.text().catch(() => "");
    if (text.trim().startsWith("<")) {
      throw new Error(`API endpoint not reachable at "${endpoint}". Please configure your backend API URL.`);
    }
  }
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status}).`);
  return body as T;
}

export const money = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
}).format(amount);

export interface Variant {
  _id: string;
  label: string;
  price: number;
  salePrice?: number | null;
  stock: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  active?: boolean;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: Category | string;
  images: string[];
  variants: Variant[];
  ingredients?: string[];
  allergens?: string[];
  shelfLife?: string;
  storage?: string;
  featured?: boolean;
  active?: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: { fullName: string; email: string; phone: string };
  address: { street: string; city: string; state: string; postalCode: string; instructions?: string };
  items: { name: string; variant: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  shipment?: { courier?: string; trackingNumber?: string; trackingUrl?: string; estimatedDelivery?: string };
}
