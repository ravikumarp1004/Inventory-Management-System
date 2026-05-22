import { motion } from "framer-motion";
import { ArrowUpDown, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProductWithStatus, ProductStatus } from "@/types/inventory";
import { formatINR } from "@/utils/inventory";
import { cn } from "@/lib/utils";

type FilterTab = "All" | "Active" | "Low Stock" | "Out of Stock";
type SortKey = keyof ProductWithStatus;

interface Props {
  products: ProductWithStatus[];
  onRefresh: () => void;
  refreshing?: boolean;
}

const statusBadge: Record<ProductStatus, string> = {
  Active: "bg-success/15 text-success border-success/30",
  "Low Stock": "bg-warning/15 text-warning border-warning/30",
  "Out of Stock": "bg-danger/15 text-danger border-danger/30",
};

export function InventoryTable({ products, onRefresh, refreshing }: Props) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("All");
  const [sortKey, setSortKey] = useState<SortKey>("sku");
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => {
      if (tab !== "All" && p.status !== tab) return false;
      if (!q) return true;
      return (
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return list;
  }, [products, query, tab, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortAsc((s) => !s);
    else { setSortKey(k); setSortAsc(true); }
  };

  const tabs: FilterTab[] = ["All", "Active", "Low Stock", "Out of Stock"];

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-5 flex flex-col lg:flex-row lg:items-center gap-4 justify-between border-b border-border/60">
        <div>
          <h2 className="text-xl font-bold">Inventory</h2>
          <p className="text-xs text-muted-foreground mt-1">{filtered.length} of {products.length} products</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 lg:items-center w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search product, SKU, brand, type…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-2/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-1 bg-surface-2/60 p-1 rounded-lg border border-border overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-3 h-8 text-xs font-medium rounded-md whitespace-nowrap transition",
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            className="h-10 px-4 rounded-lg border border-border bg-surface-2/60 text-sm font-medium hover:bg-surface-2 transition inline-flex items-center gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs sm:text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-surface-2/40">
              {([
                ["sku","SKU"],["name","Product"],["type","Type"],["brand","Brand"],
                ["unitPrice","Unit price"],["qty","Qty"],["reorderLevel","Reorder at"],
                ["status","Status"],["stockValue","Stock value"],
              ] as [SortKey,string][]).map(([k,label]) => (
                <th key={k} className="px-3 sm:px-4 py-3 font-semibold whitespace-nowrap">
                  <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1.5 hover:text-foreground transition">
                    {label}
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  {refreshing && products.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      <div className="text-sm">Loading latest inventory from Google Sheets…</div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <div className="text-base font-semibold text-foreground mb-1">No products found</div>
                      <div className="text-sm">Try a different search or filter.</div>
                    </div>
                  )}
                </td>
              </tr>
            ) : filtered.map((p, i) => (
              <motion.tr
                key={p.sku}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.015, 0.2) }}
                className="border-t border-border/40 hover:bg-surface-2/50 transition"
              >
                <td className="px-3 sm:px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{p.sku}</td>
                <td className="px-3 sm:px-4 py-3 font-semibold break-words max-w-[200px]">{p.name}</td>
                <td className="px-3 sm:px-4 py-3 text-muted-foreground break-words max-w-[140px]">{p.type}</td>
                <td className="px-3 sm:px-4 py-3 text-muted-foreground break-words max-w-[120px]">{p.brand}</td>
                <td className="px-3 sm:px-4 py-3 whitespace-nowrap tabular-nums">{formatINR(p.unitPrice)}</td>
                <td className={cn(
                  "px-3 sm:px-4 py-3 font-bold tabular-nums",
                  p.status === "Out of Stock" && "text-danger",
                  p.status === "Low Stock" && "text-warning"
                )}>{p.qty}</td>
                <td className="px-3 sm:px-4 py-3 text-muted-foreground tabular-nums">{p.reorderLevel}</td>
                <td className="px-3 sm:px-4 py-3">
                  <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap", statusBadge[p.status])}>
                    {p.status}
                  </span>
                </td>
                <td className="px-3 sm:px-4 py-3 font-semibold whitespace-nowrap tabular-nums">{formatINR(p.stockValue)}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
