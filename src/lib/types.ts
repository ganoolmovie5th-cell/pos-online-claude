export type Business = {
  id: string;
  name: string;
  currency: string;
  tax_percent: number;
  address: string | null;
  phone: string | null;
  receipt_footer: string | null;
  is_suspended: boolean;
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
  barcode: string | null;
  low_stock_threshold: number;
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
  status: string; // completed | voided
  voided_at: string | null;
  shift_id: string | null;
  customer_id: string | null;
  is_debt: boolean;
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

export type Shift = {
  id: string;
  business_id: string;
  cashier_id: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  opened_at: string;
  closed_at: string | null;
};

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  created_at: string;
};

export type Debt = {
  id: string;
  business_id: string;
  customer_id: string | null;
  sale_id: string | null;
  amount: number;
  paid: number;
  status: string; // open | paid
  created_at: string;
};

export type Profile = {
  id: string;
  business_id: string;
  full_name: string | null;
  role: string; // owner | cashier
  is_platform_admin: boolean;
  created_at: string;
};

export type CartLine = {
  product_id: string;
  name: string;
  price: number;
  qty: number;
};
