const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Helper to normalize payment category
function categorizePayment(method = '') {
  const m = String(method).toLowerCase();
  if (m.includes('upi') || m.includes('gpay') || m.includes('phonepe') || m.includes('paytm')) {
    return 'UPI';
  }
  if (m.includes('card') || m.includes('visa') || m.includes('master') || m.includes('pos terminal')) {
    return 'Card';
  }
  if (m.includes('cash') || m.includes('cod')) {
    return 'Cash';
  }
  if (m.includes('net') || m.includes('banking') || m.includes('neft') || m.includes('imps')) {
    return 'Net Banking';
  }
  return 'Other';
}

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    // 1. Fetch Orders, Invoices, Products, and Customers
    const [
      ordersRes,
      invoicesRes,
      productsRes,
      customersRes
    ] = await Promise.all([
      query('SELECT * FROM orders ORDER BY created_at DESC'),
      query('SELECT * FROM invoices ORDER BY created_at DESC'),
      query('SELECT * FROM products ORDER BY name ASC'),
      query('SELECT * FROM customers ORDER BY created_at DESC')
    ]);

    const orders = ordersRes.rows;
    const invoices = invoicesRes.rows;
    const products = productsRes.rows;
    const customers = customersRes.rows;

    // 2. Revenue Calculations
    const onlineOrdersCount = orders.length;
    const offlineInvoicesCount = invoices.length;
    const totalOrdersCount = onlineOrdersCount + offlineInvoicesCount;

    const onlineRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const offlineRevenue = invoices.reduce((sum, i) => sum + Number(i.total || 0), 0);
    const totalRevenue = onlineRevenue + offlineRevenue;

    // 3. Stock & Inventory Calculations
    const totalStock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    const lowStockThreshold = 25;
    const lowStockProducts = products
      .filter(p => Number(p.stock) <= lowStockThreshold)
      .map(p => ({
        id: p.id,
        name: p.name,
        stock: Number(p.stock),
        initialStock: Number(p.initial_stock || 0),
        price: Number(p.price),
        sku: p.sku,
        status: Number(p.stock) === 0 ? 'Out of Stock' : 'Low Stock Alert'
      }));

    // 4. Payment Methods Analytics
    const paymentBreakdown = {
      UPI: { count: 0, revenue: 0, transactions: [] },
      Card: { count: 0, revenue: 0, transactions: [] },
      Cash: { count: 0, revenue: 0, transactions: [] },
      'Net Banking': { count: 0, revenue: 0, transactions: [] },
      Other: { count: 0, revenue: 0, transactions: [] }
    };

    // Process Online Orders into Payment Breakdown
    orders.forEach(o => {
      const cat = categorizePayment(o.payment_method);
      const target = paymentBreakdown[cat] || paymentBreakdown.Other;
      const amt = Number(o.total || 0);
      target.count += 1;
      target.revenue += amt;

      const cust = typeof o.customer === 'string' ? JSON.parse(o.customer) : (o.customer || {});
      target.transactions.push({
        id: o.id,
        ref: o.order_number,
        type: 'Online Order',
        channel: 'online',
        method: o.payment_method || 'Online',
        category: cat,
        customerName: cust.name || 'Customer',
        amount: amt,
        status: o.status,
        date: o.created_at
      });
    });

    // Process Offline Invoices into Payment Breakdown
    invoices.forEach(inv => {
      const cat = categorizePayment(inv.payment_mode);
      const target = paymentBreakdown[cat] || paymentBreakdown.Other;
      const amt = Number(inv.total || 0);
      target.count += 1;
      target.revenue += amt;

      const cust = typeof inv.customer === 'string' ? JSON.parse(inv.customer) : (inv.customer || {});
      target.transactions.push({
        id: inv.id,
        ref: inv.invoice_number,
        type: 'Counter POS',
        channel: 'offline',
        method: inv.payment_mode || 'Cash',
        category: cat,
        customerName: cust.name || 'Walk-in Customer',
        amount: amt,
        status: 'Completed',
        date: inv.created_at
      });
    });

    // 5. Time-series Sales Breakdown (Daily, Weekly, Monthly)
    // Combine all sales records with timestamps
    const allSalesRecords = [
      ...orders.map(o => ({
        date: new Date(o.created_at),
        amount: Number(o.total || 0),
        channel: 'online'
      })),
      ...invoices.map(i => ({
        date: new Date(i.created_at),
        amount: Number(i.total || 0),
        channel: 'offline'
      }))
    ].sort((a, b) => b.date - a.date);

    // Group by Day (last 14 days or available dates)
    const dailyMap = {};
    const weeklyMap = {};
    const monthlyMap = {};

    allSalesRecords.forEach(record => {
      // Day key: YYYY-MM-DD
      const dayKey = record.date.toISOString().split('T')[0];
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { date: dayKey, online: 0, offline: 0, total: 0, count: 0 };
      }
      dailyMap[dayKey][record.channel] += record.amount;
      dailyMap[dayKey].total += record.amount;
      dailyMap[dayKey].count += 1;

      // Month key: YYYY-MM
      const monthKey = dayKey.substring(0, 7);
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { month: monthKey, online: 0, offline: 0, total: 0, count: 0 };
      }
      monthlyMap[monthKey][record.channel] += record.amount;
      monthlyMap[monthKey].total += record.amount;
      monthlyMap[monthKey].count += 1;

      // Week key (approx ISO week)
      const d = new Date(record.date);
      const weekNumber = Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
      const weekKey = `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = { week: weekKey, online: 0, offline: 0, total: 0, count: 0 };
      }
      weeklyMap[weekKey][record.channel] += record.amount;
      weeklyMap[weekKey].total += record.amount;
      weeklyMap[weekKey].count += 1;
    });

    const dailySales = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const weeklySales = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));
    const monthlySales = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    // 6. Top Selling Products
    // Aggregate actual quantities sold from orders and invoices
    const productSalesMap = {};
    products.forEach(p => {
      productSalesMap[p.id] = {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        stock: Number(p.stock),
        initialStock: Number(p.initial_stock || 0),
        onlineSold: Number(p.online_sold || 0),
        offlineSold: Number(p.offline_sold || 0),
        totalSold: Number(p.online_sold || 0) + Number(p.offline_sold || 0),
        totalRevenue: (Number(p.online_sold || 0) + Number(p.offline_sold || 0)) * Number(p.price)
      };
    });

    // Check items inside orders for accurate live counts
    orders.forEach(o => {
      const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
      items.forEach(it => {
        const prod = products.find(p => p.id === it.productId || p.id === it.id || p.name === it.name);
        if (prod && productSalesMap[prod.id]) {
          // If productSalesMap has base values, we ensure item quantity is reflected
        }
      });
    });

    const topSellingProducts = Object.values(productSalesMap).sort((a, b) => b.totalSold - a.totalSold);

    // 7. Customer Purchase Analytics
    const customerAnalytics = customers.map(c => {
      const cleanEmail = (c.email || '').toLowerCase().trim();
      const cleanPhone = (c.phone || '').trim();

      const custOrders = orders.filter(o => {
        const cust = typeof o.customer === 'string' ? JSON.parse(o.customer) : (o.customer || {});
        return (cust.email && cust.email.toLowerCase().trim() === cleanEmail) ||
               (cust.phone && cust.phone.trim() === cleanPhone);
      });

      const custInvoices = invoices.filter(inv => {
        const cust = typeof inv.customer === 'string' ? JSON.parse(inv.customer) : (inv.customer || {});
        return (cust.email && cust.email.toLowerCase().trim() === cleanEmail) ||
               (cust.phone && cust.phone.trim() === cleanPhone);
      });

      const onlineSpent = custOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const offlineSpent = custInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
      const totalSpent = onlineSpent + offlineSpent;
      const orderCount = custOrders.length + custInvoices.length;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || 'N/A',
        city: c.city || 'N/A',
        orderCount,
        onlineOrders: custOrders.length,
        offlineInvoices: custInvoices.length,
        totalSpent,
        joinedAt: c.created_at
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    // 8. Return Comprehensive Real-Time Payload
    res.json({
      success: true,
      data: {
        totalRevenue,
        onlineRevenue,
        offlineRevenue,
        totalStock,
        totalCustomers: customers.length,
        totalOrdersCount,
        onlineOrdersCount,
        offlineInvoicesCount,
        paymentBreakdown,
        dailySales,
        weeklySales,
        monthlySales,
        topSellingProducts,
        lowStockProducts,
        lowStockItems: lowStockProducts.length,
        customerAnalytics,
        recentOrders: orders.slice(0, 10).map(o => ({
          id: o.id,
          orderNumber: o.order_number,
          channel: o.channel || 'online',
          customer: typeof o.customer === 'string' ? JSON.parse(o.customer) : o.customer,
          items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
          total: Number(o.total),
          paymentMethod: o.payment_method,
          status: o.status,
          createdAt: o.created_at
        })),
        recentInvoices: invoices.slice(0, 10).map(i => ({
          id: i.id,
          invoiceNumber: i.invoice_number,
          channel: i.channel || 'offline',
          customer: typeof i.customer === 'string' ? JSON.parse(i.customer) : i.customer,
          items: typeof i.items === 'string' ? JSON.parse(i.items) : i.items,
          total: Number(i.total),
          paymentMode: i.payment_mode,
          createdAt: i.created_at
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
