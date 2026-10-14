-- ==============================================================================
-- NACHIYAR HERBALS & COSMETICS - COMPLETE POSTGRESQL DATABASE SCHEMA
-- Fully idempotent schema with automatic table & index creation
-- ==============================================================================

-- 1. PRODUCTS TABLE
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

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ORDERS TABLE
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

-- 4. INVOICES TABLE (POS / In-Store)
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

-- 5. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  product_name VARCHAR(255) DEFAULT 'Herbal Hair Care',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. INVENTORY LOGS
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

-- 7. USERS / STAFF ACCOUNTS
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb
);

-- 8. SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs (product_id);

-- SEED ESSENTIAL DEFAULT ACCOUNTS & SETTINGS
INSERT INTO users (id, username, name, role, permissions)
VALUES 
  ('user_admin', 'admin', 'Super Administrator', 'super_admin', '["all"]'::jsonb),
  ('user_inventory', 'inventory', 'Inventory Lead', 'inventory_manager', '["inventory", "orders"]'::jsonb),
  ('user_billing', 'billing', 'Sales Cashier', 'sales_manager', '["pos", "billing"]'::jsonb)
ON CONFLICT (username) DO NOTHING;

INSERT INTO site_settings (id, data)
VALUES (1, '{"announcementText": "ROYAL BOTANICAL CARE • FREE PAN-INDIA SHIPPING OVER ₹599", "freeShippingThreshold": 599, "paymentMethods": {"cod": {"enabled": true, "label": "Cash on Delivery"}, "upi": {"enabled": true, "label": "UPI / QR Code", "upiId": "nachiyarherbals18@okaxis", "merchantName": "Nachiyar Herbals"}}}'::jsonb)
ON CONFLICT (id) DO NOTHING;
