export type Role = 'DIREKTOR' | 'KASSIR';
export type PaymentType = 'NAQD' | 'KARTA' | 'ARALASH';
export type SaleStatus = 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: Category | string;
  brand?: string;
  author?: string;
  barcode?: string;
  image?: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  quantity: number;
  minAlert: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
}

export interface SaleItem {
  product: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  kassir: { id: string; name: string } | string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paymentType: PaymentType;
  status: SaleStatus;
  note?: string;
  items: SaleItem[];
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DashboardStats {
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    salesCount: number;
    stockValueCost: number;
    stockValueSale: number;
  };
  topProducts: {
    id: string;
    name: string;
    quantity: number;
    revenue: number;
    profit: number;
  }[];
  kassirStats: {
    name: string;
    count: number;
    revenue: number;
  }[];
  chartData: {
    date: string;
    revenue: number;
    profit: number;
    count: number;
  }[];
  lowStock: Product[];
}
