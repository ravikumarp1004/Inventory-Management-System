import type { Product } from "@/types/inventory";

const WEBHOOK_URL =
  "https://n8n-w19c.srv1635273.hstgr.cloud/webhook/1f082714-3070-4b60-948e-84dc91c82f6b/chat";
const SESSION_ID = "paint-inventory-session";

export interface BackendSummary {
  totalSkus?: number;
  totalUnits?: number;
  totalValue?: number;
  activeItems?: number;
  lowStockItems?: number;
  outOfStockItems?: number;
  alerts?: number;
}

export interface SyncResult {
  ok: boolean;
  products?: Product[];
  summary?: BackendSummary;
  error?: string;
  aborted?: boolean;
}

function tryParseJSON(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

function extractJsonObject(s: string): unknown {
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return tryParseJSON(s.slice(start, i + 1));
    }
  }
  return null;
}

function hasInventoryArray(obj: unknown): obj is Record<string, unknown> {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return Array.isArray(o.inventory) || Array.isArray(o.Inventory);
}

function unwrap(data: unknown, depth = 0): unknown {
  if (data == null || depth > 8) return data;
  if (typeof data === "string") {
    const parsed = tryParseJSON(data) ?? extractJsonObject(data);
    return parsed != null ? unwrap(parsed, depth + 1) : data;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return data;
    for (const item of data) {
      const inner = unwrap(item, depth + 1);
      if (hasInventoryArray(inner)) return inner;
    }
    return unwrap(data[0], depth + 1);
  }
  if (typeof data === "object") {
    if (hasInventoryArray(data)) return data;
    const d = data as Record<string, unknown>;
    for (const key of ["output", "data", "result", "text", "message", "response", "json", "body"]) {
      if (key in d) {
        const inner = unwrap(d[key], depth + 1);
        if (hasInventoryArray(inner)) return inner;
      }
    }
  }
  return data;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function parseSummaryArray(arr: unknown[]): BackendSummary {
  const map = new Map<string, number>();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const name = str(it.Name ?? it.name).toLowerCase().trim();
    const value = num(it.Value ?? it.value);
    if (name) map.set(name, value);
  }
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = map.get(k.toLowerCase());
      if (v != null) return v;
    }
    return undefined;
  };
  const low = get("low stock items");
  const out = get("out of stock items");
  return {
    totalSkus: get("total skus"),
    totalUnits: get("total units in stock", "total units"),
    totalValue: get("total inventory value", "total value"),
    activeItems: get("active items"),
    lowStockItems: low,
    outOfStockItems: out,
    alerts: get("alerts") ?? ((low ?? 0) + (out ?? 0) || undefined),
  };
}

export function normalizeInventoryResponse(raw: unknown): { products: Product[]; summary?: BackendSummary } | null {
  const root = unwrap(raw);
  if (!root || typeof root !== "object") return null;
  const r = root as Record<string, unknown>;
  const invArr = (Array.isArray(r.inventory) ? r.inventory : Array.isArray(r.Inventory) ? r.Inventory : null) as unknown[] | null;
  if (!invArr) return null;

  const products: Product[] = invArr
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const it = item as Record<string, unknown>;
      const sku = str(it.sku ?? it.SKU);
      if (!sku) return null;
      return {
        sku,
        name: str(it.productName ?? it.name ?? it["Product Name"] ?? sku),
        type: str(it.type ?? it.Type),
        brand: str(it.brand ?? it.Brand),
        unitPrice: num(it.unitPrice ?? it["Unit Price (INR)"] ?? it.price),
        qty: num(it.qtyInStock ?? it.qty ?? it["Qty In Stock"]),
        reorderLevel: num(it.reorderLevel ?? it["Reorder Level"]),
      } satisfies Product;
    })
    .filter((p): p is Product => p !== null);

  const sumRaw = r.summary ?? r.Summary;
  let summary: BackendSummary | undefined;
  if (Array.isArray(sumRaw)) summary = parseSummaryArray(sumRaw);
  else if (sumRaw && typeof sumRaw === "object") {
    const s = sumRaw as Record<string, unknown>;
    summary = {
      totalSkus: s.totalSkus != null ? num(s.totalSkus) : undefined,
      totalUnits: s.totalUnits != null ? num(s.totalUnits) : undefined,
      totalValue: s.totalValue != null ? num(s.totalValue) : undefined,
      activeItems: s.activeItems != null ? num(s.activeItems) : undefined,
      lowStockItems: s.lowStockItems != null ? num(s.lowStockItems) : undefined,
      outOfStockItems: s.outOfStockItems != null ? num(s.outOfStockItems) : undefined,
      alerts: s.alerts != null ? num(s.alerts) : undefined,
    };
  }

  return { products, summary };
}

async function post(body: unknown, signal?: AbortSignal) {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
    keepalive: false,
  });
  const raw = await res.text();
  let parsed: unknown = raw;
  try { parsed = JSON.parse(raw); } catch { /* keep raw */ }
  return { ok: res.ok, status: res.status, parsed, raw };
}

const CACHE_KEY = "paint-inventory-cache-v1";

export interface CachedInventory {
  products: Product[];
  summary?: BackendSummary;
  ts: number;
}

export function loadCachedInventory(): CachedInventory | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedInventory;
    if (!parsed?.products?.length) return null;
    return parsed;
  } catch { return null; }
}

function saveCachedInventory(c: CachedInventory) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

export async function syncInventoryFromBackend(signal?: AbortSignal): Promise<SyncResult> {
  const payload = {
    chatInput: "Return latest inventory and summary data as JSON only. No explanation.",
    sessionId: SESSION_ID,
    action: "sync_inventory",
  };
  try {
    const r = await post(payload, signal);
    const norm = normalizeInventoryResponse(r.parsed);
    if (!norm) return { ok: false, error: "Could not parse inventory from backend." };
    if (norm.products.length === 0) return { ok: false, error: "Backend returned empty inventory." };
    saveCachedInventory({ products: norm.products, summary: norm.summary, ts: Date.now() });
    return { ok: true, products: norm.products, summary: norm.summary };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("aborted") || (err instanceof DOMException && err.name === "AbortError")) {
      return { ok: false, aborted: true, error: "aborted" };
    }
    return { ok: false, error: msg };
  }
}

export async function deleteProductBackend(sku: string): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    chatInput: `Delete product with SKU ${sku} only`,
    sessionId: SESSION_ID,
    action: "delete_product",
    sku,
  };
  try {
    const r = await post(payload);
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
