export type Business = {
  id: string;
  name: string;
  currency: string;
  tax_percent: number;
  service_charge_percent: number;
  points_per_amount: number;
  point_value: number;
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
  cost_price: number;
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
  points_earned: number;
  points_redeemed: number;
  service_charge: number;
  voucher_code: string | null;
  outlet_id: string | null;
  table_id: string | null;
  payments: PaymentPart[] | null;
  created_at: string;
};

export type PaymentPart = { method: string; amount: number };

export type Expense = {
  id: string;
  business_id: string;
  category: string;
  amount: number;
  note: string | null;
  spent_at: string;
  created_at: string;
};

export type Bundle = {
  id: string;
  business_id: string;
  name: string;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type BundleItem = {
  id: string;
  business_id: string;
  bundle_id: string;
  product_id: string | null;
  qty: number;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  business_id: string;
  product_id: string | null;
  variant_id: string | null;
  variant_name: string | null;
  name: string;
  price: number;
  cost_price: number;
  qty: number;
  line_total: number;
};

export type ProductVariant = {
  id: string;
  business_id: string;
  product_id: string;
  name: string;
  price: number;
  stock: number | null;
  created_at: string;
};

export type OutletStock = {
  id: string;
  business_id: string;
  outlet_id: string;
  product_id: string;
  stock: number;
};

export type Table = {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
};

export type TableSession = {
  id: string;
  business_id: string;
  table_id: string;
  status: string; // open | closed
  items: { product_id: string | null; variant_id?: string | null; name: string; price: number; qty: number }[];
  sale_id: string | null;
  opened_at: string;
  closed_at: string | null;
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
  points: number;
  created_at: string;
};

export type Supplier = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  created_at: string;
};

export type Voucher = {
  code: string;
  business_id: string;
  kind: string; // amount | percent
  value: number;
  is_active: boolean;
  created_at: string;
};

export type Outlet = {
  id: string;
  business_id: string;
  name: string;
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
  product_id: string | null;       // null untuk baris paket/bundle
  variant_id?: string | null;      // varian produk kalau ada
  variant_name?: string | null;
  name: string;
  price: number;
  cost: number;                    // harga modal snapshot per unit
  qty: number;
  discount: number;                // diskon nominal per baris (total, bukan per unit)
  components?: { product_id: string; qty: number; cost: number }[]; // isi bundle
};
