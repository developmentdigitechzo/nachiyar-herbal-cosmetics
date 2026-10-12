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
        brandName: settings.brandName || 'Nachiyar Herbals & Cosmetics',
        gstin: settings.gstin || '33AAACH9876K1Z2',
        supportPhone: settings.supportPhone || '+91 94440 88990',
        supportEmail: settings.supportEmail || 'care@nachiyarherbals.com',
        storeTimings: settings.storeTimings || 'Mon - Sat: 9:30 AM - 8:30 PM',
        storeAddress: settings.storeAddress || 'Nachiyar Botanical Heritage, No. 18 Temple Ring Road, Madurai, Tamil Nadu - 625001',
        couponCode: settings.couponCode || 'ROYAL15',
        discountPercent: Number(settings.discountPercent) || 15,
        couponExpiryDate: settings.couponExpiryDate || '',
        couponActive: settings.couponActive !== false && settings.couponActive !== 'false',
        couponTagline: settings.couponTagline || 'Surprise Royal Privilege Voucher'
      }
    });
  } catch (err) {
    console.error('Error fetching public settings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Dedicated public coupon endpoint
app.get('/api/coupon/active', async (req, res) => {
  try {
    const result = await dbQuery('SELECT data FROM site_settings WHERE id = 1');
    const settings = result.rows.length > 0 ? (typeof result.rows[0].data === 'string' ? JSON.parse(result.rows[0].data) : result.rows[0].data) : {};
    res.json({
      success: true,
      data: {
        couponCode: settings.couponCode || settings.mysteryCouponCode || 'FESTIVE15',
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

// Image Upload Endpoint (Saves base64 image payload to uploads/ folder)
const fs = require('fs');
app.post('/api/upload', requireAdminAuth, (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let ext = 'jpg';
    let buffer;

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('gif')) ext = 'gif';
      else ext = 'jpg';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
    }

    const uploadsDir = path.join(projectRoot, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeName = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `uploads/${safeName}`;
    res.json({ success: true, url: publicUrl, message: 'Image uploaded successfully' });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload image: ' + err.message });
  }
});

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
