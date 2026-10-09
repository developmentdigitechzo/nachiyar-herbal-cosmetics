-- Nachiyar Herbals PostgreSQL Schema

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(100) PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subtitle TEXT,
  category VARCHAR(100) DEFAULT 'Hair Care',
  category_id VARCHAR(100) DEFAULT 'cat_hair_care',
  price NUMERIC(10, 2) NOT NULL,
  mrp NUMERIC(10, 2),
  stock INT DEFAULT 0,
  initial_stock INT DEFAULT 0,
  online_sold INT DEFAULT 0,
  offline_sold INT DEFAULT 0,
  sku VARCHAR(100),
  images JSONB DEFAULT '[]'::jsonb,
  theme_color VARCHAR(50) DEFAULT '#6B4E9B',
  tagline TEXT,
  metric_badge VARCHAR(50),
  badge VARCHAR(50),
  short_description TEXT,
  description TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  ingredients TEXT,
  how_to_use TEXT,
  variants JSONB DEFAULT '[]'::jsonb,
  seo JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(100) PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  channel VARCHAR(50) DEFAULT 'online',
  customer JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC(10, 2) DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  shipping NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,
  payment_method VARCHAR(100) DEFAULT 'UPI / Online Payment',
  payment_status VARCHAR(50) DEFAULT 'paid',
  status VARCHAR(50) DEFAULT 'placed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(100) PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  channel VARCHAR(50) DEFAULT 'offline',
  customer JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC(10, 2) DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  tax NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'paid',
  payment_mode VARCHAR(50) DEFAULT 'Cash',
  notes TEXT DEFAULT 'In-store retail billing',
  created_by VARCHAR(100) DEFAULT 'Sales Staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id VARCHAR(100) PRIMARY KEY,
  product_id VARCHAR(100),
  product_name VARCHAR(255),
  channel VARCHAR(50),
  reference VARCHAR(100),
  change INT,
  prev_stock INT,
  new_stock INT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs (product_id);
