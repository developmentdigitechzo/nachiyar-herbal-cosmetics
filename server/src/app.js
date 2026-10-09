const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const invoicesRouter = require('./routes/invoices');
const inventoryRouter = require('./routes/inventory');
const analyticsRouter = require('./routes/analytics');
const settingsRouter = require('./routes/settings');
const customersRouter = require('./routes/customers');
const reviewsRouter = require('./routes/reviews');
const { router: authRouter, verifyToken, requireAdminAuth } = require('./routes/auth');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
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

const projectRoot = path.join(__dirname, '..', '..');

// =========================================================================
// ADMIN ROUTE & PAGE SECURITY GATE
// =========================================================================
// Protect direct access to admin pages: unauthorized visitors are redirected
app.get(['/admin.html', '/admin', '/admin/'], (req, res) => {
  const token = req.cookies?.nachiyar_admin_token || 
                req.headers['authorization']?.replace('Bearer ', '') || 
                req.headers['x-admin-token'] || 
                req.query.token;

  const user = verifyToken(token);
  if (user) {
    // Authenticated admin: serve the admin console
    return res.sendFile(path.join(projectRoot, 'admin.html'));
  }

  // Unauthorized visitor: redirect away to the direct admin login portal
  return res.redirect('/admin-login.html');
});

// Serve the admin login page
app.get('/admin-login.html', (req, res) => {
  res.sendFile(path.join(projectRoot, 'admin-login.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Public REST API Routes
app.use('/api/auth', authRouter);
app.use('/api/customer', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reviews', reviewsRouter);

// Public storefront settings (announcements & enabled checkout payment methods)
const { query: dbQuery } = require('./config/db');
app.get('/api/settings/public', async (req, res) => {
  try {
    const result = await dbQuery('SELECT data FROM site_settings WHERE id = 1');
    const settings = result.rows.length > 0 ? (typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data) : {};
    res.json({
      success: true,
      data: {
        announcementText: settings.announcementText,
        freeShippingThreshold: settings.freeShippingThreshold || 599,
        paymentMethods: settings.paymentMethods || {},
        brandName: settings.brandName,
        supportPhone: settings.supportPhone
      }
    });
  } catch (err) {
    console.error('Error fetching public settings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Mount Protected Admin-Only REST API Routes
app.use('/api/invoices', requireAdminAuth, invoicesRouter);
app.use('/api/inventory', requireAdminAuth, inventoryRouter);
app.use('/api/analytics', requireAdminAuth, analyticsRouter);
app.use('/api/settings', requireAdminAuth, settingsRouter);

// Static files (storefront assets, public pages, stylesheets)
// Note: /admin.html is intercepted by the route handler above
app.use(express.static(projectRoot));

// Fallback route for storefront homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

// 404 for unhandled API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

module.exports = app;
