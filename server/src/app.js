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
// CLEAN STOREFRONT PAGE ROUTES (e.g. /shop/ without .html)
// =========================================================================
const cleanPages = ['shop', 'about', 'contact', 'checkout', 'account', 'order-status', 'yearsbeer', 'privacy', 'terms', 'shipping-policy'];
cleanPages.forEach((page) => {
  app.get([`/${page}`, `/${page}/`], (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(path.join(projectRoot, `${page}.html`));
  });
});

// Dedicated product page route with slug parameter support
app.get(['/product', '/product/', '/product/:slug', '/product/:slug/'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.sendFile(path.join(projectRoot, 'product.html'));
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
app.use('/api/messages', messagesRouter);

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
  maxAge: '7d'
}));

// Static files (storefront assets, public pages, stylesheets)
// Note: /admin.html is intercepted by the route handler above
app.use(express.static(projectRoot, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

// Fallback static asset handling for trailing-slash URLs (e.g. /nimda/admin.css -> /admin.css)
['shop', 'about', 'contact', 'product', 'checkout', 'account', 'order-status', 'yearsbeer', 'nimda', 'nimda-login', 'privacy', 'terms', 'shipping-policy'].forEach(subpath => {
  app.use(`/${subpath}`, express.static(projectRoot, {
    setHeaders: (res, filePath) => {
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
