-- ==============================================================================
-- NACHIYAR HERBALS & COSMETICS - COMPLETE POSTGRESQL DATABASE SCHEMA
-- Fully idempotent schema with automatic table & index creation
-- ==============================================================================

-- 0. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  count INT DEFAULT 0
);

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
  tags JSONB DEFAULT '[]'::jsonb,
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
  email VARCHAR(255),
  phone VARCHAR(50),
  password VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL DEFAULT 'super_admin',
  permissions JSONB DEFAULT '["all"]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. SITE SETTINGS
CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL
);

-- 9. CONTACT INQUIRY MESSAGES
CREATE TABLE IF NOT EXISTS contact_messages (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(255) DEFAULT 'General Inquiry',
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'unread',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
INSERT INTO users (id, username, email, phone, password, name, role, permissions)
VALUES 
  ('user_nimda', 'nimda', 'admin@nachiyarherbals.com', '9876543210', 'admin123', 'Super Nimda', 'super_admin', '["all"]'::jsonb),
  ('user_admin', 'admin', 'admin@nachiyarherbals.com', '9876543210', 'admin123', 'Super Administrator', 'super_admin', '["all"]'::jsonb),
  ('user_murali', 'murali', 'muraliii@gmail.com', '0987654321', '1234567890', 'murali', 'super_admin', '["all"]'::jsonb)
ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;

INSERT INTO site_settings (id, data)
VALUES (1, '{"announcementText": "ROYAL BOTANICAL CARE • FREE PAN-INDIA SHIPPING ON ORDERS ₹599 & ABOVE", "freeShippingThreshold": 599, "paymentMethods": {"cod": {"enabled": true, "label": "Cash on Delivery"}, "upi": {"enabled": true, "label": "UPI / QR Code", "upiId": "nachiyarherbals18@okaxis", "merchantName": "Nachiyar Herbals"}}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- SEED CORE PRODUCTS IF TABLE IS EMPTY
INSERT INTO products (id, name, slug, price, mrp, stock, category, tags, images, description)
VALUES 
  ('prod_oil_01', 'Herbal Hair Oil', 'herbal-hair-oil', 299.00, 599.00, 95, 'Hair Care', '["hair-vitalizer", "18-botanicals", "cold-pressed"]'::jsonb, '["assets/new-oil-bottle-card.jpg"]'::jsonb, 'Authentic cold-pressed herbal hair vitalizer prepared with 18 certified Ayurvedic botanicals.'),
  ('prod_shampoo_02', 'Hibiscus Flower Shampoo', 'hibiscus-flower-shampoo', 249.00, 549.00, 90, 'Hair Care', '["scalp-cleanser", "hibiscus", "sulphate-free"]'::jsonb, '["assets/new-shampoo-bottle-card.jpg"]'::jsonb, 'Gentle scalp cleanser infused with fresh handpicked red hibiscus flowers and natural coconut surfactants.'),
  ('prod_duo_03', 'The Royal Hair Ritual (Duo Set)', 'royal-hair-ritual-duo', 499.00, 1148.00, 85, 'Ritual Combos', '["complete-ritual", "bestseller", "ayurvedic-duo"]'::jsonb, '["assets/duo-ritual-new.jpg"]'::jsonb, 'The complete 2-step royal restorative haircare routine featuring our Herbal Hair Oil and Hibiscus Shampoo.')
ON CONFLICT (id) DO NOTHING;

-- FIX FOR TAGS COLUMN (Idempotent check)
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- PERMISSIONS AND OWNERSHIP SYNCHRONIZATION
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nachiyarherbals;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nachiyarherbals;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nachiyarherbals_client_db;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nachiyarherbals_client_db;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nachiyarherbals;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nachiyarherbals_client_db;
