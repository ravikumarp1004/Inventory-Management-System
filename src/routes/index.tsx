import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Boxes, IndianRupee, MessageSquare, Package, TrendingDown, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { StatCard } from "@/components/inventory/StatCard";
import { shouldRefreshFromResponse } from "@/services/aiChat";
import { deleteProductBackend, loadCachedInventory, syncInventoryFromBackend, type BackendSummary } from "@/services/inventorySync";
import type { Product } from "@/types/inventory";
import { enrich, formatINR } from "@/utils/inventory";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paint Inventory | AI Management System" },
      {
        name: "description",
        content: "AI-powered inventory dashboard for stock checks, updates, product management, and summaries.",
      },
      {
        property: "og:title",
        content: "Paint Inventory | AI Management System",
      },
      {
        name: "twitter:title",
        content: "Paint Inventory | AI Management System",
      },
    ],
  }),
  component: Index,
});

function formatRelative(ts: number | null): string {
  if (!ts) return "Not synced yet";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "Last synced just now";
  if (diff < 60) return `Last synced ${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `Last synced ${m}m ago`;
  const h = Math.floor(m / 60);
  return `Last synced ${h}h ago`;
}

function Index() {
  const cached = useMemo(() => loadCachedInventory(), []);
  const [products, setProducts] = useState<Product[]>(cached?.products ?? []);
  const [backendSummary, setBackendSummary] = useState<BackendSummary | null>(cached?.summary ?? null);
  const [hasSynced, setHasSynced] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(cached?.ts ?? null);
  const [, force] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // AbortController for in-flight sync (cancellable)
  const abortRef = useRef<AbortController | null>(null);
  // Debounce timer for manual refresh
  const debounceRef = useRef<number | null>(null);

  const refreshInventory = useCallback(async () => {
    // Cancel any older in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setRefreshing(true);
    setSyncError(null);
    const res = await syncInventoryFromBackend(ctrl.signal);
    if (ctrl.signal.aborted || res.aborted) {
      // a newer request superseded this one
      return;
    }
    if (res.ok && res.products && res.products.length > 0) {
      setProducts(res.products);
      setBackendSummary(res.summary ?? null);
      setHasSynced(true);
      setLastSync(Date.now());
    } else {
      setSyncError(res.error ?? "Sync failed");
    }
    setRefreshing(false);
    abortRef.current = null;
  }, []);

  // Debounced refresh for user-initiated clicks
  const requestRefresh = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      refreshInventory();
    }, 250);
  }, [refreshInventory]);

  // Initial fetch on load
  useEffect(() => {
    refreshInventory();
    return () => { abortRef.current?.abort(); };
  }, [refreshInventory]);

  // Tick to update "last synced" label
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const enriched = useMemo(() => enrich(products), [products]);

  const stats = useMemo(() => {
    const computed = {
      total: enriched.length,
      units: enriched.reduce((s, p) => s + p.qty, 0),
      value: enriched.reduce((s, p) => s + p.stockValue, 0),
      low: enriched.filter((p) => p.status === "Low Stock").length,
      out: enriched.filter((p) => p.status === "Out of Stock").length,
      active: enriched.filter((p) => p.status === "Active").length,
    };
    const s = backendSummary;
    return {
      total: s?.totalSkus ?? computed.total,
      units: s?.totalUnits ?? computed.units,
      value: s?.totalValue ?? computed.value,
      active: s?.activeItems ?? computed.active,
      low: s?.lowStockItems ?? computed.low,
      out: s?.outOfStockItems ?? computed.out,
      alerts: s?.alerts ?? computed.low + computed.out,
    };
  }, [enriched, backendSummary]);

  const handleAssistantMessage = (text: string) => {
    if (shouldRefreshFromResponse(text)) {
      // Background refresh — don't block UI
      refreshInventory();
    }
  };

  // Optimistic delete: remove from UI immediately, call backend, background re-sync
  const handleDeleteProduct = useCallback(async (sku: string) => {
    const snapshot = products;
    // Optimistic UI update — recompute summary from local state too
    setProducts((cur) => cur.filter((p) => p.sku.toUpperCase() !== sku.toUpperCase()));
    setBackendSummary(null); // force cards to recompute from local state until sync
    const res = await deleteProductBackend(sku);
    if (!res.ok) {
      // Roll back on hard failure
      setProducts(snapshot);
      return { ok: false, error: res.error };
    }
    // Confirm with background sync
    refreshInventory();
    return { ok: true };
  }, [products, refreshInventory]);

  const connectionState: "connected" | "syncing" | "error" | "idle" =
    refreshing ? "syncing"
    : syncError ? "error"
    : hasSynced ? "connected"
    : "idle";

  return (
    <div className="min-h-screen">
      <header className="px-4 sm:px-6 lg:px-10 pt-8 pb-6 flex items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center glow-primary">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight truncate">Paint Inventory</h1>
            <p className="text-xs text-muted-foreground">AI Management System</p>
          </div>
        </motion.div>
        <AnimatePresence>
          {!chatOpen && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-border bg-surface-2/60 hover:border-primary/40 hover:bg-surface-2 transition font-medium shrink-0"
            >
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">AI Assistant</span>
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      <main className="px-4 sm:px-6 lg:px-10 pb-24">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${connectionState === "error" ? "bg-warning/10 text-warning border-warning/30" : connectionState === "connected" ? "bg-success/10 text-success border-success/30" : connectionState === "syncing" ? "bg-primary/10 text-primary border-primary/30" : "bg-surface-2/60 text-muted-foreground border-border"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? "bg-primary animate-pulse" : syncError ? "bg-warning" : hasSynced ? "bg-success" : "bg-muted-foreground"}`} />
            {refreshing ? "Syncing latest inventory…" : syncError ? "Connection issue — showing cached data" : formatRelative(lastSync)}
          </span>
        </div>

        {/* Stats: auto-fit grid so cards always wrap cleanly */}
        <div
          className="grid gap-3 sm:gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}
        >
          <StatCard index={0} label="Total SKUs" value={stats.total} subtitle="Products tracked" icon={Package} />
          <StatCard index={1} label="Units in stock" value={stats.units.toLocaleString("en-IN")} subtitle="Across all items" icon={Boxes} />
          <StatCard index={2} label="Stock value" value={formatINR(stats.value)} subtitle="Total INR" icon={IndianRupee} />
          <StatCard index={3} label="Alerts" value={stats.alerts} subtitle={`${stats.out} out · ${stats.low} low`} icon={AlertTriangle} tone="warning" />
          <StatCard index={4} label="Low stock" value={stats.low} subtitle="Below reorder" icon={TrendingDown} tone="warning" />
          <StatCard index={5} label="Out of stock" value={stats.out} subtitle="Needs reorder" icon={XCircle} tone="danger" />
        </div>

        <div className="mt-8">
          <InventoryTable products={enriched} onRefresh={requestRefresh} refreshing={refreshing} />
        </div>
      </main>

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onAssistantMessage={handleAssistantMessage}
        products={enriched}
        onDeleteProduct={handleDeleteProduct}
        connectionState={connectionState}
      />
    </div>
  );
}
