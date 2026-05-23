export interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  cost?: number;
  stock?: number;
  category_id?: number;
  active?: number;
  image_url?: string;
  barcodes?: string[];
  tax_rate?: number;
  deleted_at?: string | null;
  isManual?: boolean;
  isNew?: boolean;
  quantity?: number;
}

export interface SalePayload {
  customer_id?: number | null;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  discount: number;
  payment_method: string;
  payments?: Array<{
    method: string;
    amount: number;
  }>;
}

export interface SaleResponse {
  id: number;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  created_at: string;
  customer_name?: string;
  idempotent?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  rfc?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: number | null;
    hasMore: boolean;
    total: number;
  };
}

export interface CashSession {
  id: number;
  store_id: number;
  user_id: number;
  opening_balance: number;
  closing_balance?: number;
  counted_cash?: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}
