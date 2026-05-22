export type ProductStatus = "Active" | "Low Stock" | "Out of Stock";

export interface Product {
  sku: string;
  name: string;
  type: string;
  brand: string;
  unitPrice: number;
  qty: number;
  reorderLevel: number;
}

export interface ProductWithStatus extends Product {
  status: ProductStatus;
  stockValue: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
