export type Business = {
  id: string;
  name: string;
  currency: string;
  tax_percent: number;
  created_at: string;
};

export type Category = {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
};

export type Product = {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  price: number;
  stock: number | null;
  is_active: boolean;
  created_at: string;
};

export type Sale = {
  id: string;
  business_id: string;
  cashier_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  payment_method: string;
  created_at: string;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  business_id: string;
  product_id: string | null;
  name: string;
  price: number;
  qty: number;
  line_total: number;
};

export type CartLine = {
  product_id: string;
  name: string;
  price: number;
  qty: number;
};
