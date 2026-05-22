const WEBHOOK_URL =
  "https://n8n-w19c.srv1635273.hstgr.cloud/webhook/1f082714-3070-4b60-948e-84dc91c82f6b/chat";

const SESSION_ID = "paint-inventory-session";

export type AIResult =
  | { ok: true; text: string }
  | { ok: false; error: string; cors?: boolean };

function extractText(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) {
    if (data.length === 0) return "";
    return extractText(data[0]);
  }
  if (typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const key of ["output", "text", "message", "response", "answer", "reply"]) {
      const v = d[key];
      if (typeof v === "string" && v.trim()) return v;
      if (v && typeof v === "object") {
        const nested = extractText(v);
        if (nested) return nested;
      }
    }
    if (d.data) return extractText(d.data);
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
  return String(data);
}

async function postJSON(body: unknown) {
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* keep raw */
  }
  return { status: res.status, ok: res.ok, parsed, raw };
}

export async function sendChatMessage(userMessage: string): Promise<AIResult> {
  const primaryPayload = { chatInput: userMessage, sessionId: SESSION_ID };
  try {
    const r = await postJSON(primaryPayload);
    console.info("[AI] primary", r.status, r.parsed);
    if (r.ok) {
      const text = extractText(r.parsed);
      if (text) return { ok: true, text };
    }
    // Fallback payload
    const fallbackPayload = {
      message: userMessage,
      sessionId: SESSION_ID,
      source: "lovable_inventory_app",
      timestamp: new Date().toISOString(),
    };
    const r2 = await postJSON(fallbackPayload);
    console.info("[AI] fallback", r2.status, r2.parsed);
    if (r2.ok) {
      const text = extractText(r2.parsed);
      if (text) return { ok: true, text };
      return { ok: false, error: "Empty response from AI service." };
    }
    return {
      ok: false,
      error: `AI service returned HTTP ${r2.status}. ${typeof r2.raw === "string" ? r2.raw.slice(0, 200) : ""}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AI] network error", { msg, payload: primaryPayload });
    const cors = /Failed to fetch|NetworkError|CORS/i.test(msg);
    return {
      ok: false,
      cors,
      error: cors
        ? "AI service is reachable but blocked by browser CORS. Please enable CORS in n8n or use a backend proxy."
        : "I couldn't reach the AI service. Please try again.",
    };
  }
}

const REFRESH_PHRASES = [
  "has been updated",
  "has been removed",
  "added successfully",
  "stock updated",
  "quantity updated",
  "inventory updated",
  "removed from inventory",
];

export function shouldRefreshFromResponse(text: string): boolean {
  const lower = text.toLowerCase();
  return REFRESH_PHRASES.some((p) => lower.includes(p));
}

export function detectRemovedSku(text: string): string | null {
  const lower = text.toLowerCase();
  if (!lower.includes("remov") && !lower.includes("delet")) return null;
  const m = text.match(/PT-\d{3}/i);
  return m ? m[0].toUpperCase() : null;
}

export function detectQtyUpdate(text: string): { sku: string; qty: number } | null {
  const lower = text.toLowerCase();
  if (!/(updat|set|chang|now)/i.test(lower)) return null;
  const skuMatch = text.match(/PT-\d{3}/i);
  const qtyMatch = text.match(/(?:to|=|:|now)\s*(\d{1,5})\b/i) || text.match(/(\d{1,5})\s*units?/i);
  if (skuMatch && qtyMatch) {
    return { sku: skuMatch[0].toUpperCase(), qty: parseInt(qtyMatch[1], 10) };
  }
  return null;
}
