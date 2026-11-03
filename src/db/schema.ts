/**
 * Esquema SQLite do Retalho (RNF-04). Dinheiro em centavos, quantidades e comprimentos em
 * centésimos, percentual de desconto em centésimos de ponto percentual (10 % = 1000).
 */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  search_key TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('meter', 'roll', 'unit')),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  roll_length_centi INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('PF', 'PJ')),
  name TEXT NOT NULL,
  search_key TEXT NOT NULL,
  document TEXT NOT NULL UNIQUE,
  cep TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (id),
  status TEXT NOT NULL,
  discount_bp INTEGER NOT NULL DEFAULT 0,
  freight_cents INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  installments INTEGER NOT NULL DEFAULT 1,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL DEFAULT 0,
  free_shipping INTEGER NOT NULL DEFAULT 0,
  freight_charged_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  installment_plan TEXT NOT NULL DEFAULT '[]',
  balance_cents INTEGER NOT NULL DEFAULT 0,
  cancel_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  roll_length_centi INTEGER,
  price_cents INTEGER NOT NULL,
  quantity_centi INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  UNIQUE (order_id, product_id)
);

CREATE TABLE IF NOT EXISTS order_history (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT,
  at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders (id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('issued', 'canceled')),
  issued_at TEXT NOT NULL,
  canceled_at TEXT,
  cancel_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_history (order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices (order_id);
`
