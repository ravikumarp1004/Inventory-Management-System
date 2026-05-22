import type { Product, ProductStatus, ProductWithStatus } from "@/types/inventory";

export function computeStatus(qty: number, reorder: number): ProductStatus {
  if (qty === 0) return "Out of Stock";
  if (qty <= reorder) return "Low Stock";
  return "Active";
}

export function enrich(products: Product[]): ProductWithStatus[] {
  return products.map((p) => ({
    ...p,
    status: computeStatus(p.qty, p.reorderLevel),
    stockValue: p.qty * p.unitPrice,
  }));
}

export function formatINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}
