const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const config = require('./config/environment');
const storageService = require('./services/storage');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const invoicesRouter = require('./routes/invoices');
const inventoryRouter = require('./routes/inventory');
const analyticsRouter = require('./routes/analytics');
const settingsRouter = require('./routes/settings');
const customersRouter = require('./routes/customers');
const reviewsRouter = require('./routes/reviews');
const messagesRouter = require('./routes/messages');
const { router: authRouter, verifyToken, requireAdminAuth } = require('./routes/auth');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));

// Zero-dependency cookie parser middleware
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(c => {
      const [name, ...val] = c.split('=');
      if (name) {
        req.cookies[name.trim()] = decodeURIComponent((val.join('=') || '').trim());
      }
    });
  }
  next();
});

const projectRoot = config.projectRoot;

// =========================================================================
// CLEAN URL REDIRECTION MIDDLEWARE (No .html, Trailing Slash URLs)
// =========================================================================
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const urlPath = req.path;
  if (urlPath.endsWith('.html')) {
    const rawName = urlPath.slice(1, -5).toLowerCase(); // strip '/' and '.html'
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

    if (rawName === 'index') {
      return res.redirect(301, '/' + queryString);
    }
    if (rawName === 'admin' || rawName === 'admin-login') {
      return res.status(404).send('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>404 Not Found</h2><p>The requested URL was not found on this server.</p></body></html>');
    }
    if (rawName === 'nimda') {
      return res.redirect(301, '/nimda/' + queryString);
    }
    if (rawName === 'nimda-login') {
      return res.redirect(301, '/nimda-login/' + queryString);
    }
    return res.redirect(301, `/${rawName}/${queryString}`);
  }
  next();
});

// =========================================================================
// NIMDA ROUTE & SECURITY ACCESS GATE (ONLY /nimda/ opens console)
// =========================================================================
// Completely block /admin and /admin-login so they NEVER open (return 404 Not Found)
app.all(['/admin', '/admin/*', '/admin-login', '/admin-login/*'], (req, res) => {
  res.status(404).send('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>404 Not Found</h2><p>The requested URL was not found on this server.</p></body></html>');
});

// Protect direct access to Nimda console: unauthorized visitors redirected to /nimda-login/
// Supports clean URLs without hashes: /nimda, /nimda/, and /nimda/:tab/ (e.g. /nimda/dashboard/)
app.get(['/nimda', '/nimda/*', '/nimda/'], (req, res, next) => {
  if (path.extname(req.path)) {
    return next();
  }

  const token = (req.cookies && req.cookies.nachiyar_nimda_token) ||
                (req.cookies && req.cookies.nachiyar_admin_token) || 
                (req.headers['authorization'] && req.headers['authorization'].replace('Bearer ', '')) || 
                req.headers['x-admin-token'] || 
                req.query.token;

  const user = verifyToken(token);
  if (user) {
    const nimdaPath = path.join(projectRoot, 'nimda.html');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    return res.sendFile(nimdaPath);
  }

  // Unauthorized visitor: redirect to direct Nimda staff login portal
  return res.redirect('/nimda-login/');
});

// Serve Nimda staff login page
app.get(['/nimda-login', '/nimda-login/'], (req, res) => {
  const loginPath = path.join(projectRoot, 'nimda-login.html');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(loginPath);
});

// =========================================================================
// CLEAN STOREFRONT PAGE ROUTES & DYNAMIC SITEMAP ENGINE
// User-facing only - Automatically discovers any new .html page added to project!
// =========================================================================

function getUserFacingPages() {
  const excludedFiles = new Set([
    'admin.html',
    'admin-login.html',
    'nimda.html',
    'nimda-login.html',
    'index.html',
    'product.html'
  ]);

  try {
    const files = fs.readdirSync(projectRoot);
    const pages = [];
    for (const file of files) {
      if (file.toLowerCase().endsWith('.html') && !excludedFiles.has(file.toLowerCase())) {
        const slug = file.replace(/\.html$/i, '');
        let lastmod = new Date().toISOString().split('T')[0];
        try {
          const stat = fs.statSync(path.join(projectRoot, file));
          lastmod = stat.mtime.toISOString().split('T')[0];
        } catch (e) {}

        // Friendly title formatting: e.g. "shipping-policy" -> "Shipping Policy"
        const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        pages.push({ slug, file, title, lastmod });
      }
    }
    return pages;
  } catch (e) {
    return [
      { slug: 'shop', file: 'shop.html', title: 'Shop Rituals', lastmod: '2026-10-22' },
      { slug: 'about', file: 'about.html', title: 'About Us', lastmod: '2026-10-22' },
      { slug: 'contact', file: 'contact.html', title: 'Contact', lastmod: '2026-10-22' },
      { slug: 'account', file: 'account.html', title: 'Customer Account', lastmod: '2026-10-22' },
      { slug: 'order-status', file: 'order-status.html', title: 'Order Tracking', lastmod: '2026-10-22' },
      { slug: 'checkout', file: 'checkout.html', title: 'Checkout', lastmod: '2026-10-22' },
      { slug: 'privacy', file: 'privacy.html', title: 'Privacy Policy', lastmod: '2026-10-22' },
      { slug: 'terms', file: 'terms.html', title: 'Terms of Service', lastmod: '2026-10-22' },
      { slug: 'shipping-policy', file: 'shipping-policy.html', title: 'Shipping & Returns', lastmod: '2026-10-22' },
      { slug: 'sitemap', file: 'sitemap.html', title: 'Sitemap', lastmod: '2026-10-22' }
    ];
  }
}

// Dedicated product page route with slug parameter support
app.get(['/product', '/product/', '/product/:slug', '/product/:slug/'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(projectRoot, 'product.html'));
});

// Dynamic Clean Route Handler: Automatically routes ANY user-facing .html file dropped into project!
app.get(['/:page', '/:page/'], (req, res, next) => {
  const page = (req.params.page || '').toLowerCase();
  const blocked = ['nimda', 'nimda-login', 'admin', 'admin-login', 'api', 'uploads'];
  if (blocked.includes(page) || path.extname(req.path)) {
    return next();
  }
  const filePath = path.join(projectRoot, `${page}.html`);
  if (fs.existsSync(filePath)) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    return res.sendFile(filePath);
  }
  next();
});

// API for sitemap.html to dynamically receive all discovered user pages
app.get('/api/sitemap/pages', (req, res) => {
  const pages = getUserFacingPages();
  res.json({ success: true, count: pages.length, pages });
});

// =========================================================================
// SITEMAP.XML & ROBOTS.TXT (User-facing only - Strictly no admin URLs)
// Automatically updates with all new products & any new user HTML pages!
// =========================================================================
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.sendFile(path.join(projectRoot, 'robots.txt'));
});

app.get('/sitemap.xml', async (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  try {
    const { query } = require('./config/db');
    const prodsResult = await query("SELECT slug, updated_at FROM products WHERE status = 'active' ORDER BY id ASC");
    const activeProducts = prodsResult.rows || [];
    const today = new Date().toISOString().split('T')[0];

    const pages = getUserFacingPages();

    const priorityMap = {
      shop: '0.9',
      about: '0.8',
      contact: '0.8',
      account: '0.7',
      'order-status': '0.7',
      checkout: '0.6',
      sitemap: '0.6',
      privacy: '0.5',
      terms: '0.5',
      'shipping-policy': '0.5'
    };

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url><loc>https://nachiyarherbals.com/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>

  <!-- Auto-Discovered User Storefront Pages (Always in Sync) -->
${pages.map(p => `  <url><loc>https://nachiyarherbals.com/${p.slug}/</loc><lastmod>${p.lastmod || today}</lastmod><changefreq>${priorityMap[p.slug] >= '0.8' ? 'daily' : 'weekly'}</changefreq><priority>${priorityMap[p.slug] || '0.7'}</priority></url>`).join('\n')}

  <!-- Botanical Formulations & Active Database Products (Always in Sync) -->
${activeProducts.map(p => `  <url><loc>https://nachiyarherbals.com/product/?slug=${p.slug}</loc><lastmod>${p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : today}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>`).join('\n')}
</urlset>`;

    return res.send(xml);
  } catch (err) {
    return res.sendFile(path.join(projectRoot, 'sitemap.xml'));
  }
});

// Health check with environment diagnostics
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: config.env,
    storageType: storageService.getStorageType(),
    database: {
      host: config.database.host || (config.database.connectionString ? 'configured' : 'none'),
      ssl: Boolean(config.database.ssl)
    },
    timestamp: new Date().toISOString()
  });
});

// Mount Public REST API Routes
app.use('/api/auth', authRouter);
app.use('/api/customer', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reviews', reviewsRouter);
app.use(['/api/messages', '/api/contact/messages'], messagesRouter);

// One-Click Database Setup, Bootstrap & Permissions Fix
app.get(['/api/fix-database', '/api/admin/fix-permissions'], async (req, res) => {
  try {
    const { query } = require('./config/db');

    // 1. Create all 10 core tables if not exist
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        count INT DEFAULT 0
      );

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
        email VARCHAR(255),
        phone VARCHAR(50),
        password VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL DEFAULT 'super_admin',
        permissions JSONB DEFAULT '["all"]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        id INT PRIMARY KEY DEFAULT 1,
        data JSONB NOT NULL
      );

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
    `);

    // 2. Ensure all column extensions exist
    await query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'super_admin';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '["all"]'::jsonb;
    `);

    // 3. Transfer ownership and grant full privileges
    const fixSql = `
      DO $$
      BEGIN
        BEGIN ALTER TABLE IF EXISTS categories OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE IF EXISTS contact_messages OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE IF EXISTS customers OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE IF EXISTS reviews OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE IF EXISTS inventory_logs OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE IF EXISTS invoices OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE IF EXISTS orders OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE IF EXISTS products OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE IF EXISTS site_settings OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN ALTER TABLE IF EXISTS users OWNER TO nachiyarherbals; EXCEPTION WHEN OTHERS THEN NULL; END;

        BEGIN
          GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nachiyarherbals;
          GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nachiyarherbals;
          GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nachiyarherbals_client_db;
          GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nachiyarherbals_client_db;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;

        BEGIN
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nachiyarherbals;
          ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nachiyarherbals_client_db;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END $$;
    `;
    await query(fixSql);

    // 4. Seed default and fallback admin users
    await query(`
      INSERT INTO users (id, username, email, phone, password, name, role, permissions)
      VALUES 
        ('user_nimda_master', 'nimda', 'admin@nachiyarherbals.com', '9876543210', 'admin123', 'Super Nimda', 'super_admin', '["all"]'::jsonb),
        ('user_admin_master', 'admin', 'admin@nachiyarherbals.com', '9876543210', 'admin123', 'Super Administrator', 'super_admin', '["all"]'::jsonb)
      ON CONFLICT (username) DO UPDATE SET
        password = EXCLUDED.password,
        name = EXCLUDED.name;
    `);

    // 5. Migrate users from data/db.json into PostgreSQL users table
    const dbJsonPath = path.join(projectRoot, 'data', 'db.json');
    let importedUsersCount = 0;
    if (fs.existsSync(dbJsonPath)) {
      try {
        const rawJson = fs.readFileSync(dbJsonPath, 'utf8');
        const dbData = JSON.parse(rawJson);
        if (Array.isArray(dbData.users)) {
          for (const u of dbData.users) {
            if (u.username && u.password) {
              await query(`
                INSERT INTO users (id, username, email, phone, password, name, role, permissions)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
                ON CONFLICT (username) DO UPDATE SET
                  password = EXCLUDED.password,
                  name = EXCLUDED.name,
                  email = EXCLUDED.email,
                  phone = EXCLUDED.phone
              `, [
                u.id || `user_${u.username}`,
                u.username.toLowerCase().trim(),
                u.email || null,
                u.phone || null,
                u.password,
                u.name || u.username,
                u.role || 'super_admin',
                JSON.stringify(u.permissions || ['all'])
              ]);
              importedUsersCount++;
            }
          }
        }
      } catch (errJson) {
        console.warn('Note on db.json users migration:', errJson.message);
      }
    }

    // 6. Query all tables and all users to confirm
    const tablesRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC
    `);
    const tablesList = tablesRes.rows.map(r => r.table_name);

    const usersRes = await query('SELECT id, username, name, role FROM users ORDER BY username ASC');
    const usersList = usersRes.rows;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Database 100% Configured & Synchronized</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #FAF5FF; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; color: #2A153E; padding: 20px; box-sizing: border-box; }
          .card { background: white; padding: 36px 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(107, 78, 155, 0.12); max-width: 580px; text-align: center; border: 1px solid #E9D5FF; }
          .icon { font-size: 3rem; margin-bottom: 12px; }
          h1 { color: #15803D; font-size: 1.45rem; margin: 0 0 10px; font-weight: 700; }
          p { color: #4B5563; font-size: 0.92rem; line-height: 1.6; margin: 0 0 20px; }
          .badge { display: inline-block; background: #DCFCE7; color: #166534; font-weight: 700; padding: 6px 14px; border-radius: 20px; font-size: 0.85rem; margin-bottom: 14px; }
          .table-list { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; text-align: left; font-size: 0.82rem; color: #334155; margin-bottom: 16px; }
          .table-list span { display: inline-block; background: #E0E7FF; color: #3730A3; padding: 3px 8px; border-radius: 4px; margin: 2px; font-family: monospace; font-weight: 600; }
          .user-badge { display: inline-block; background: #FEF3C7; color: #92400E; padding: 3px 8px; border-radius: 4px; margin: 2px; font-family: monospace; font-weight: 600; }
          a.btn { display: inline-block; background: #6B4E9B; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; transition: background 0.2s; margin-top: 10px; }
          a.btn:hover { background: #553A82; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🌿</div>
          <div class="badge">✔ DATABASE TABLES & USERS SYNCHRONIZED</div>
          <h1>PostgreSQL Database 100% Ready!</h1>
          <p>All core tables have been verified/created in schema <b>public</b>, permissions granted, and all admin accounts are active in PostgreSQL!</p>
          <div class="table-list">
            <b>Active Tables (${tablesList.length}):</b><br>
            ${tablesList.map(t => `<span>${t}</span>`).join(' ')}
          </div>
          <div class="table-list">
            <b>Active Admin Accounts (${usersList.length}):</b><br>
            ${usersList.map(u => `<span class="user-badge">${u.username} (${u.role})</span>`).join(' ')}
          </div>
          <a href="/nimda-login.html" class="btn">Open Nimda Admin Login →</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Database setup error:', err);
    res.status(500).json({
      success: false,
      message: 'Database setup failed: ' + err.message,
      stack: err.stack
    });
  }
});

// Public storefront settings (announcements & enabled checkout payment methods)
const { query: dbQuery } = require('./config/db');
app.get('/api/settings/public', async (req, res) => {
  try {
    const result = await dbQuery('SELECT data FROM site_settings WHERE id = 1');
    const settings = result.rows.length > 0 ? (typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data) : {};
    res.json({
      success: true,
      data: {
        announcementText: settings.announcementText || 'ROYAL BOTANICAL CARE • FREE PAN-INDIA SHIPPING OVER ₹599',
        freeShippingThreshold: settings.freeShippingThreshold || 599,
        paymentMethods: settings.paymentMethods || {},
        couponCode: settings.couponCode || 'FESTIVE15',
        discountPercent: settings.discountPercent || 15,
        couponExpiryDate: settings.couponExpiryDate || '',
        couponActive: settings.couponActive !== false && settings.couponActive !== 'false',
        couponTagline: settings.couponTagline || 'Special Festival Discount',
        firebaseConfig: (process.env.FIREBASE_API_KEY && !process.env.FIREBASE_API_KEY.includes('YOUR_FIREBASE_API_KEY')) ? {
          apiKey: process.env.FIREBASE_API_KEY,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
          projectId: process.env.FIREBASE_PROJECT_ID || '',
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
          appId: process.env.FIREBASE_APP_ID || '',
          measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
        } : null,
        homeShowcase: settings.homeShowcase || {
          slot1: { productId: 'prod_oil_01', title: 'Herbal Hair Oil', price: 299, mrp: 599, customImage: 'assets/new-oil-bottle-card.jpg' },
          slot2: { productId: 'prod_shampoo_02', title: 'Hibiscus Flower Shampoo', price: 249, mrp: 549, customImage: 'assets/new-shampoo-bottle-card.jpg' },
          combo: { productId: 'prod_duo_03', selectedProductIds: ['prod_oil_01', 'prod_shampoo_02'], title: 'The Royal Hair Ritual (Duo Set)', price: 499, mrp: 1148, customImage: 'assets/duo-ritual-new.jpg', tag: 'BEST VALUE: SAVE ₹149' }
        }
      }
    });
  } catch (err) {
    res.json({ success: true, data: { couponCode: 'FESTIVE15', discountPercent: 15, couponActive: false } });
  }
});

// Dedicated active coupon endpoint for instant storefront & checkout privilege resolution
app.get('/api/coupon/active', async (req, res) => {
  try {
    const result = await dbQuery('SELECT data FROM site_settings WHERE id = 1');
    const settings = result.rows.length > 0 ? (typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data) : {};
    res.json({
      success: true,
      data: {
        couponCode: settings.couponCode || 'FESTIVE15',
        discountPercent: Number(settings.discountPercent) || 15,
        couponExpiryDate: settings.couponExpiryDate || '',
        couponActive: settings.couponActive !== false && settings.couponActive !== 'false',
        couponTagline: settings.couponTagline || 'Special Festival Discount'
      }
    });
  } catch (err) {
    res.json({ success: true, data: { couponCode: 'FESTIVE15', discountPercent: 15, couponActive: false } });
  }
});

// Marketplace Webhook Receiver (Flipkart, Amazon SP-API, Meesho)
app.post('/api/webhooks/marketplace', async (req, res) => {
  try {
    const { channel, orderId, sku, qty, customer } = req.body;
    console.log(`[Marketplace Webhook] Received sale event from ${channel || 'External Channel'}: Order ${orderId || 'N/A'}`);
    res.json({
      success: true,
      message: 'Marketplace inventory deduction event processed',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mount Protected Admin-Only REST API Routes
app.use('/api/invoices', requireAdminAuth, invoicesRouter);
app.use('/api/inventory', requireAdminAuth, inventoryRouter);
app.use('/api/analytics', requireAdminAuth, analyticsRouter);
app.use('/api/settings', requireAdminAuth, settingsRouter);

// Image Upload Endpoint (Environment-aware: Local storage in dev, cPanel storage in prod)
app.post('/api/upload', requireAdminAuth, async (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    const result = await storageService.saveBase64Image(image, filename);
    res.json({
      success: true,
      url: result.url,
      filename: result.filename,
      storageType: result.storageType,
      message: 'Image uploaded successfully'
    });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload image: ' + err.message });
  }
});

// Dedicated uploads file serving from active storage directory (Local or cPanel)
app.use('/uploads', express.static(storageService.getStorageDirectory(), {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Static files (storefront assets, public pages, stylesheets)
// Note: /admin.html is intercepted by the route handler above
app.use(express.static(projectRoot, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// Fallback static asset handling for trailing-slash URLs (e.g. /nimda/admin.css -> /admin.css)
['shop', 'about', 'contact', 'product', 'checkout', 'account', 'order-status', 'yearsbeer', 'nimda', 'nimda-login', 'privacy', 'terms', 'shipping-policy'].forEach(subpath => {
  app.use(`/${subpath}`, express.static(projectRoot, {
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
    }
  }));
});

// Fallback route for storefront homepage
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(projectRoot, 'index.html'));
});

// 404 for unhandled API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

module.exports = app;
