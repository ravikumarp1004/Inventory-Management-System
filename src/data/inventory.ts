import type { Product } from "@/types/inventory";

// Emergency fallback only — used before the first successful backend sync.
// Mirrors the current Google Sheet state. Never merged with live data.
export const initialInventory: Product[] = [
  { sku: "PT-002", name: "Royal Emulsion", type: "Interior Emulsion", brand: "Asian Paints", unitPrice: 500, qty: 8, reorderLevel: 10 },
  { sku: "PT-006", name: "Weathercoat All Guard", type: "Exterior Emulsion", brand: "Berger", unitPrice: 600, qty: 35, reorderLevel: 15 },
  { sku: "PT-008", name: "Dulux Weathershield", type: "Exterior Emulsion", brand: "Dulux", unitPrice: 590, qty: 22, reorderLevel: 5 },
  { sku: "PT-010", name: "Red Oxide Metal Primer", type: "Putty", brand: "Birla White", unitPrice: 120, qty: 0, reorderLevel: 5 },
  { sku: "PT-012", name: "Berger Philips", type: "Interior Emulsion", brand: "Berger", unitPrice: 540, qty: 3, reorderLevel: 12 },
  { sku: "PT-014", name: "Nerolac Excel Total", type: "Exterior Emulsion", brand: "Nerolac", unitPrice: 600, qty: 40, reorderLevel: 10 },
  { sku: "PT-015", name: "Asian Paints Tractor Emulsion", type: "Interior Emulsion", brand: "Asian Paints", unitPrice: 430, qty: 0, reorderLevel: 8 },
  { sku: "PT-016", name: "Birla White Small Putty", type: "Putty", brand: "Birla White", unitPrice: 180, qty: 200, reorderLevel: 30 },
];
