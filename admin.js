/**
 * NACHIYAR HERBALS & COSMETICS
 * Business Operations, Unified Inventory Synchronization & POS Billing Console
 */

document.addEventListener('DOMContentLoaded', () => {

  // Authentication & Session Guard
  const adminToken = localStorage.getItem('nachiyar_admin_token');
  const storedUserJson = localStorage.getItem('nachiyar_admin_user');

  if (!adminToken) {
    window.location.replace('/admin-login.html');
    return;
  }

  let loggedInUser = null;
  try {
    loggedInUser = storedUserJson ? JSON.parse(storedUserJson) : null;
  } catch (e) {}

  // Authenticated Fetch Helper
  async function authFetch(url, options = {}) {
    options.headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${adminToken}`,
      'x-admin-token': adminToken
    };
    const res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem('nachiyar_admin_token');
      localStorage.removeItem('nachiyar_admin_user');
      document.cookie = 'nachiyar_admin_token=; path=/; max-age=0; SameSite=Lax';
      window.location.replace('/admin-login.html');
      throw new Error('Unauthorized');
    }
    return res;
  }

  // Current State
  let currentRole = loggedInUser?.role || 'super_admin';
  let products = [];
  let orders = [];
  let invoices = [];
  let inventoryLogs = [];
  let storeSettings = {};

  // POS State
  let posCart = [];

  // ==========================================
  // DOM ELEMENT REFS
  // ==========================================
  const roleSelect = document.getElementById('roleSelect');
  const userAvatar = document.getElementById('userAvatar');
  const currentUserName = document.getElementById('currentUserName');
  const currentRoleBadge = document.getElementById('currentRoleBadge');

  if (loggedInUser) {
    if (currentUserName) currentUserName.textContent = loggedInUser.name || 'Super Administrator';
    if (userAvatar) userAvatar.textContent = (loggedInUser.name || 'SA').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    if (roleSelect) roleSelect.value = currentRole;
  }

  // Logout Button Handler
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } });
      } catch (e) {}
      localStorage.removeItem('nachiyar_admin_token');
      localStorage.removeItem('nachiyar_admin_user');
      document.cookie = 'nachiyar_admin_token=; path=/; max-age=0; SameSite=Lax';
      window.location.replace('/admin-login.html');
    });
  }

  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // KPI Primary Elements
  const kpiTotalRevenue = document.getElementById('kpiTotalRevenue');
  const kpiRevSplit = document.getElementById('kpiRevSplit');
  const kpiTotalStock = document.getElementById('kpiTotalStock');
  const kpiStockStatus = document.getElementById('kpiStockStatus');
  const kpiOfflineInvoices = document.getElementById('kpiOfflineInvoices');
  const kpiOfflineRevSub = document.getElementById('kpiOfflineRevSub');
  const kpiOnlineOrders = document.getElementById('kpiOnlineOrders');
  const kpiOnlineRevSub = document.getElementById('kpiOnlineRevSub');
  const syncOilStock = document.getElementById('syncOilStock');
  const syncShampooStock = document.getElementById('syncShampooStock');

  // Secondary Performance Metrics Elements
  const kpiTotalCustomers = document.getElementById('kpiTotalCustomers');
  const kpiCustomersSub = document.getElementById('kpiCustomersSub');
  const kpiTotalOrders = document.getElementById('kpiTotalOrders');
  const kpiTotalOrdersSub = document.getElementById('kpiTotalOrdersSub');
  const kpiUpiRevenue = document.getElementById('kpiUpiRevenue');
  const kpiUpiCount = document.getElementById('kpiUpiCount');
  const kpiCardRevenue = document.getElementById('kpiCardRevenue');
  const kpiCardCount = document.getElementById('kpiCardCount');
  const kpiCashRevenue = document.getElementById('kpiCashRevenue');
  const kpiCashCount = document.getElementById('kpiCashCount');
  const kpiNetBankingRevenue = document.getElementById('kpiNetBankingRevenue');
  const kpiNetBankingCount = document.getElementById('kpiNetBankingCount');

  // Containers
  const paymentMethodContainer = document.getElementById('paymentMethodContainer');
  const salesTrendsChartContainer = document.getElementById('salesTrendsChartContainer');
  const topSellingTableBody = document.getElementById('topSellingTableBody');
  const lowStockListContainer = document.getElementById('lowStockListContainer');
  const customerAnalyticsTableBody = document.getElementById('customerAnalyticsTableBody');

  // Analytics Drill-Down Modal Elements
  const analyticsModalOverlay = document.getElementById('analyticsModalOverlay');
  const analyticsModalTitle = document.getElementById('analyticsModalTitle');
  const analyticsModalSubtitle = document.getElementById('analyticsModalSubtitle');
  const analyticsReportTag = document.getElementById('analyticsReportTag');
  const analyticsModalSummary = document.getElementById('analyticsModalSummary');
  const analyticsModalSearch = document.getElementById('analyticsModalSearch');
  const analyticsRecordCount = document.getElementById('analyticsRecordCount');
  const analyticsDetailThead = document.getElementById('analyticsDetailThead');
  const analyticsDetailTbody = document.getElementById('analyticsDetailTbody');
  const btnExportAnalyticsCsv = document.getElementById('btnExportAnalyticsCsv');
  const analyticsModalClose = document.getElementById('analyticsModalClose');
  const btnCloseAnalyticsModal = document.getElementById('btnCloseAnalyticsModal');

  // Tables
  const recentInvoicesTableBody = document.getElementById('recentInvoicesTableBody');
  const recentOrdersTableBody = document.getElementById('recentOrdersTableBody');
  const productsTableBody = document.getElementById('productsTableBody');
  const stockCardsContainer = document.getElementById('stockCardsContainer');
  const inventoryLogsTableBody = document.getElementById('inventoryLogsTableBody');
  const allInvoicesTableBody = document.getElementById('allInvoicesTableBody');
  const allOrdersTableBody = document.getElementById('allOrdersTableBody');

  // POS Elements
  const posProductPicker = document.getElementById('posProductPicker');
  const posBillTableBody = document.getElementById('posBillTableBody');
  const posCustName = document.getElementById('posCustName');
  const posCustPhone = document.getElementById('posCustPhone');
  const posCustEmail = document.getElementById('posCustEmail');
  const posCustAddress = document.getElementById('posCustAddress');
  const posSubtotalVal = document.getElementById('posSubtotalVal');
  const posDiscountInput = document.getElementById('posDiscountInput');
  const posTaxVal = document.getElementById('posTaxVal');
  const posGrandTotalVal = document.getElementById('posGrandTotalVal');
  const posPaymentMode = document.getElementById('posPaymentMode');
  const btnGenerateInvoice = document.getElementById('btnGenerateInvoice');

  // Modals
  const productModalOverlay = document.getElementById('productModalOverlay');
  const modalProductTitle = document.getElementById('modalProductTitle');
  const modalProductClose = document.getElementById('modalProductClose');
  const btnCancelProductModal = document.getElementById('btnCancelProductModal');
  const btnOpenNewProductModal = document.getElementById('btnOpenNewProductModal');
  const productForm = document.getElementById('productForm');

  const invoiceModalOverlay = document.getElementById('invoiceModalOverlay');
  const invoiceModalClose = document.getElementById('invoiceModalClose');
  const receiptPrintableArea = document.getElementById('receiptPrintableArea');

  const adminToast = document.getElementById('adminToast');

  // Customer Reviews Elements
  const badgePendingReviews = document.getElementById('badgePendingReviews');
  const statReviewTotal = document.getElementById('statReviewTotal');
  const statReviewPending = document.getElementById('statReviewPending');
  const statReviewApproved = document.getElementById('statReviewApproved');
  const statReviewRejected = document.getElementById('statReviewRejected');
  const countFilterAll = document.getElementById('countFilterAll');
  const countFilterPending = document.getElementById('countFilterPending');
  const countFilterApproved = document.getElementById('countFilterApproved');
  const countFilterRejected = document.getElementById('countFilterRejected');
  const adminReviewsTableBody = document.getElementById('adminReviewsTableBody');
  const reviewsSearchInput = document.getElementById('reviewsSearchInput');
  const reviewsFilterTabs = document.getElementById('reviewsFilterTabs');

  let adminReviews = [];
  let currentReviewFilter = 'all';

  // State for analytics
  let latestAnalytics = null;
  let currentSalesPeriod = 'daily';
  let modalCurrentRows = [];
  let modalCurrentHeaders = [];
  let modalCurrentReportType = '';

  // Quick navigation buttons
  document.getElementById('btnQuickSaleHeader').onclick = () => switchTab('billing');
  document.getElementById('btnSeeAllInvoices').onclick = () => switchTab('invoices');
  document.getElementById('btnSeeAllOrders').onclick = () => switchTab('orders');

  // ==========================================
  // 1. DATA INITIALIZATION & FETCHING
  // ==========================================
  async function loadAllData() {
    try {
      const [prodRes, invRes, ordRes, invcRes, setRes, anaRes] = await Promise.all([
        authFetch('/api/products').then(r => r.json()),
        authFetch('/api/inventory').then(r => r.json()),
        authFetch('/api/orders').then(r => r.json()),
        authFetch('/api/invoices').then(r => r.json()),
        authFetch('/api/settings').then(r => r.json()),
        authFetch('/api/analytics').then(r => r.json())
      ]);

      if (prodRes.success) products = prodRes.data;
      if (invRes.success) inventoryLogs = invRes.data.logs || [];
      if (ordRes.success) orders = ordRes.data;
      if (invcRes.success) invoices = invcRes.data;
      if (setRes.success) storeSettings = setRes.data;
      if (anaRes.success) latestAnalytics = anaRes.data;

      // Update UI Views
      renderDashboard(latestAnalytics);
      renderProductsTable();
      renderInventoryMatrix();
      renderPOSProductPicker();
      renderInvoicesTable();
      renderOrdersTable();
      populateSettingsForm();
      loadAdminReviews();

    } catch (e) {
      console.error('Failed to load admin data', e);
      showToast('⚠️ Could not connect to API server.');
    }
  }

  // ==========================================
  // 2. DASHBOARD VIEW & REAL-TIME ANALYTICS
  // ==========================================
  function renderDashboard(analytics) {
    if (!analytics) return;

    // 1. Primary KPIs
    if (kpiTotalRevenue) kpiTotalRevenue.textContent = `₹${(analytics.totalRevenue || 0).toLocaleString()}`;
    if (kpiRevSplit) kpiRevSplit.textContent = `Online: ₹${(analytics.onlineRevenue || 0).toLocaleString()} | Offline: ₹${(analytics.offlineRevenue || 0).toLocaleString()}`;
    if (kpiTotalStock) kpiTotalStock.textContent = analytics.totalStock || 0;
    if (kpiStockStatus) {
      if (analytics.lowStockItems > 0) {
        kpiStockStatus.textContent = `⚠️ ${analytics.lowStockItems} formulations low in stock`;
        kpiStockStatus.className = 'kpi-sub';
        kpiStockStatus.style.color = '#DC2626';
        kpiStockStatus.style.fontWeight = '700';
      } else {
        kpiStockStatus.textContent = 'All inventory healthy (> 25 units)';
        kpiStockStatus.className = 'kpi-sub positive';
      }
    }
    if (kpiOfflineInvoices) kpiOfflineInvoices.textContent = analytics.offlineInvoicesCount || 0;
    if (kpiOfflineRevSub) kpiOfflineRevSub.textContent = `Counter gross: ₹${(analytics.offlineRevenue || 0).toLocaleString()}`;
    if (kpiOnlineOrders) kpiOnlineOrders.textContent = analytics.onlineOrdersCount || 0;
    if (kpiOnlineRevSub) kpiOnlineRevSub.textContent = `Storefront gross: ₹${(analytics.onlineRevenue || 0).toLocaleString()}`;

    // 2. Secondary KPIs
    if (kpiTotalCustomers) kpiTotalCustomers.textContent = analytics.totalCustomers || 0;
    if (kpiCustomersSub) kpiCustomersSub.textContent = `${analytics.totalCustomers || 0} registered buyers`;
    if (kpiTotalOrders) kpiTotalOrders.textContent = analytics.totalOrdersCount || 0;
    if (kpiTotalOrdersSub) kpiTotalOrdersSub.textContent = `${analytics.onlineOrdersCount || 0} Online • ${analytics.offlineInvoicesCount || 0} Retail POS`;

    // 3. Payment Methods KPI summary
    const pb = analytics.paymentBreakdown || {};
    if (kpiUpiRevenue) kpiUpiRevenue.textContent = `₹${(pb.UPI?.revenue || 0).toLocaleString()}`;
    if (kpiUpiCount) kpiUpiCount.textContent = `${pb.UPI?.count || 0} Transactions`;

    if (kpiCardRevenue) kpiCardRevenue.textContent = `₹${(pb.Card?.revenue || 0).toLocaleString()}`;
    if (kpiCardCount) kpiCardCount.textContent = `${pb.Card?.count || 0} Transactions`;

    if (kpiCashRevenue) kpiCashRevenue.textContent = `₹${(pb.Cash?.revenue || 0).toLocaleString()}`;
    if (kpiCashCount) kpiCashCount.textContent = `${pb.Cash?.count || 0} Transactions`;

    if (kpiNetBankingRevenue) kpiNetBankingRevenue.textContent = `₹${(pb['Net Banking']?.revenue || 0).toLocaleString()}`;
    if (kpiNetBankingCount) kpiNetBankingCount.textContent = `${pb['Net Banking']?.count || 0} Transactions`;

    // 4. Stock Sync Display
    const oil = products.find(p => p.slug === 'herbal-hair-oil' || p.name.includes('Oil'));
    const shampoo = products.find(p => p.slug === 'hibiscus-flower-shampoo' || p.name.includes('Shampoo'));
    if (oil && syncOilStock) syncOilStock.textContent = `${oil.stock} units`;
    if (shampoo && syncShampooStock) syncShampooStock.textContent = `${shampoo.stock} units`;

    // 5. Revenue by Payment Method Visualizer
    renderPaymentBreakdown(pb, analytics.totalRevenue);

    // 6. Sales Trends Velocity
    renderSalesTrends(analytics, currentSalesPeriod);

    // 7. Top Selling Formulations
    renderTopSelling(analytics.topSellingProducts || []);

    // 8. Low Stock Alerts
    renderLowStockAlerts(analytics.lowStockProducts || []);

    // 9. Customer Purchase Analytics
    renderCustomerAnalytics(analytics.customerAnalytics || []);

    // 10. Recent Invoices
    if (recentInvoicesTableBody) {
      recentInvoicesTableBody.innerHTML = '';
      (analytics.recentInvoices || []).forEach(inv => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${inv.invoiceNumber}</strong></td>
          <td>${inv.customer?.name || 'Walk-in Customer'}</td>
          <td>${(inv.items || []).length} items</td>
          <td><strong>₹${inv.total}</strong></td>
          <td><span class="badge-tag channel-offline">${inv.paymentMode}</span></td>
          <td><button class="btn-link btn-view-inv" data-id="${inv.id}">View Receipt</button></td>
        `;
        recentInvoicesTableBody.appendChild(tr);
      });
    }

    // 11. Recent Orders
    if (recentOrdersTableBody) {
      recentOrdersTableBody.innerHTML = '';
      (analytics.recentOrders || []).forEach(ord => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${ord.orderNumber}</strong></td>
          <td>${ord.customer?.name || 'Store Customer'}</td>
          <td><strong>₹${ord.total}</strong></td>
          <td><span class="badge-tag channel-online">${(ord.status || 'placed').toUpperCase()}</span></td>
          <td>${new Date(ord.createdAt).toLocaleDateString()}</td>
        `;
        recentOrdersTableBody.appendChild(tr);
      });
    }

    // Delegate view invoice receipt
    document.querySelectorAll('.btn-view-inv').forEach(btn => {
      btn.onclick = () => showInvoiceReceipt(btn.dataset.id);
    });

    // Attach Click Handlers to all Interactive Cards
    document.querySelectorAll('.interactive-kpi').forEach(card => {
      card.onclick = () => {
        const reportType = card.dataset.report;
        if (reportType) openAnalyticsModal(reportType);
      };
    });
  }

  // Helper: Render Payment Method Distribution
  function renderPaymentBreakdown(pb, totalRev) {
    if (!paymentMethodContainer) return;
    paymentMethodContainer.innerHTML = '';

    const methods = [
      { key: 'UPI', label: 'UPI / QR Payments (GPay, PhonePe, Paytm)', dotClass: 'upi', color: '#6366F1' },
      { key: 'Card', label: 'Credit / Debit Cards & POS Terminal', dotClass: 'card', color: '#3B82F6' },
      { key: 'Cash', label: 'Cash & Retail POS / COD', dotClass: 'cash', color: '#10B981' },
      { key: 'Net Banking', label: 'Net Banking / Bank Transfer', dotClass: 'netbanking', color: '#F59E0B' }
    ];

    const safeTotal = totalRev > 0 ? totalRev : 1;

    methods.forEach(m => {
      const data = pb[m.key] || { count: 0, revenue: 0 };
      const pct = Math.round((data.revenue / safeTotal) * 100);

      const row = document.createElement('div');
      row.className = 'payment-method-row';
      row.title = `Click to inspect all ${m.key} transactions`;
      row.onclick = () => openAnalyticsModal(m.key.toLowerCase().replace(/\s+/g, ''));
      row.innerHTML = `
        <div class="pm-header">
          <div class="pm-name-wrap">
            <span class="pm-indicator-dot ${m.dotClass}"></span>
            <span class="pm-name">${m.label}</span>
            <span class="pm-count">(${data.count} txns)</span>
          </div>
          <div class="pm-values">
            <span class="pm-amount">₹${data.revenue.toLocaleString()}</span>
            <span class="pm-pct">${pct}%</span>
          </div>
        </div>
        <div class="pm-progress-track">
          <div class="pm-progress-bar" style="width: ${pct}%; background-color: ${m.color};"></div>
        </div>
      `;
      paymentMethodContainer.appendChild(row);
    });
  }

  // Helper: Render Sales Velocity & Trends Chart
  function renderSalesTrends(analytics, period = 'daily') {
    if (!salesTrendsChartContainer) return;
    salesTrendsChartContainer.innerHTML = '';

    let dataset = [];
    if (period === 'daily') {
      dataset = (analytics.dailySales || []).slice(-10);
    } else if (period === 'weekly') {
      dataset = (analytics.weeklySales || []).slice(-8);
    } else {
      dataset = (analytics.monthlySales || []).slice(-6);
    }

    if (dataset.length === 0) {
      salesTrendsChartContainer.innerHTML = '<div style="margin: auto; color: var(--admin-text-muted); font-size: 0.8125rem;">No historical sales records for this period.</div>';
      return;
    }

    const maxVal = Math.max(...dataset.map(d => d.total || 0), 1);

    dataset.forEach(d => {
      const total = d.total || 0;
      const online = d.online || 0;
      const offline = d.offline || 0;
      const heightPct = Math.max(Math.round((total / maxVal) * 100), 8);

      const col = document.createElement('div');
      col.className = 'trend-col';
      col.title = `Click to view transactions for this period`;
      col.onclick = () => openAnalyticsModal('revenue');

      let labelText = '';
      if (period === 'daily') {
        const parts = d.date.split('-');
        labelText = `${parts[2]}/${parts[1]}`;
      } else if (period === 'weekly') {
        labelText = d.week.replace(/-/g, ' ');
      } else {
        labelText = d.month;
      }

      col.innerHTML = `
        <div class="trend-tooltip">
          ${period === 'daily' ? d.date : labelText}: ₹${total.toLocaleString()}<br>
          <small>Online: ₹${online.toLocaleString()} | POS: ₹${offline.toLocaleString()}</small>
        </div>
        <div class="trend-bar-wrap" style="height: ${heightPct}%;">
          <div class="trend-bar-segment online" style="height: ${total > 0 ? (online / total) * 100 : 0}%;"></div>
          <div class="trend-bar-segment offline" style="height: ${total > 0 ? (offline / total) * 100 : 0}%;"></div>
        </div>
        <span class="trend-label">${labelText}</span>
      `;
      salesTrendsChartContainer.appendChild(col);
    });
  }

  // Period toggles handler
  document.querySelectorAll('.btn-period').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSalesPeriod = btn.dataset.period;
      if (latestAnalytics) renderSalesTrends(latestAnalytics, currentSalesPeriod);
    };
  });

  // Helper: Render Top Selling Products Table
  function renderTopSelling(productsList) {
    if (!topSellingTableBody) return;
    topSellingTableBody.innerHTML = '';

    if (productsList.length === 0) {
      topSellingTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--admin-text-muted);">No sales recorded yet.</td></tr>';
      return;
    }

    productsList.slice(0, 5).forEach((p, idx) => {
      const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-default';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="rank-badge ${rankClass}">#${idx + 1}</span>
            <div>
              <strong>${p.name}</strong>
              <small style="display:block; color:var(--admin-text-muted);">SKU: ${p.id}</small>
            </div>
          </div>
        </td>
        <td><strong>₹${p.price}</strong></td>
        <td><span class="badge-tag channel-online">${p.onlineSold} units</span></td>
        <td><span class="badge-tag channel-offline">${p.offlineSold} units</span></td>
        <td><strong>${p.totalSold} units</strong></td>
        <td><strong style="color:var(--admin-gold-dark);">₹${(p.totalRevenue || 0).toLocaleString()}</strong></td>
      `;
      topSellingTableBody.appendChild(tr);
    });
  }

  // Helper: Render Low Stock Inventory Alerts
  function renderLowStockAlerts(lowStockList) {
    if (!lowStockListContainer) return;
    lowStockListContainer.innerHTML = '';

    if (lowStockList.length === 0) {
      lowStockListContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--admin-success); background-color: #ECFDF5; border-radius: 12px; border: 1px solid #A7F3D0;">
          <span style="font-size: 1.5rem; display: block; margin-bottom: 4px;">✅</span>
          <strong>All Formulations Fully Stocked</strong>
          <p style="font-size: 0.75rem; color: #065F46; margin-top: 4px;">All product inventory levels are healthy (> 25 units threshold).</p>
        </div>
      `;
      return;
    }

    lowStockList.forEach(p => {
      const item = document.createElement('div');
      item.className = 'low-stock-item';
      item.innerHTML = `
        <div class="low-stock-item-info">
          <strong>⚠️ ${p.name}</strong>
          <small>SKU: ${p.sku || p.id} • Price: ₹${p.price} • Threshold: 25 units</small>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="text-align: right;">
            <span class="low-stock-item-count">${p.stock}</span>
            <small style="display: block; color: #991B1B; font-weight: 700;">Remaining</small>
          </div>
          <button class="btn-primary btn-sm" style="background-color: #DC2626;" onclick="switchTab('inventory')">⚡ Restock</button>
        </div>
      `;
      lowStockListContainer.appendChild(item);
    });
  }

  // Helper: Render Customer Purchase Analytics Table
  function renderCustomerAnalytics(customerList) {
    if (!customerAnalyticsTableBody) return;
    customerAnalyticsTableBody.innerHTML = '';

    if (customerList.length === 0) {
      customerAnalyticsTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--admin-text-muted);">No customer purchase history available yet.</td></tr>';
      return;
    }

    customerList.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #EDE9FE; color: var(--admin-primary); font-weight: 800; font-size: 0.75rem; display: flex; align-items: center; justify-content: center;">
              ${(c.name || 'C').charAt(0).toUpperCase()}
            </div>
            <strong>${c.name}</strong>
          </div>
        </td>
        <td>
          <div>${c.email}</div>
          <small style="color:var(--admin-text-muted);">${c.phone}</small>
        </td>
        <td><span class="badge-tag">${c.city || 'N/A'}</span></td>
        <td><strong>${c.orderCount}</strong></td>
        <td><span class="badge-tag channel-online">${c.onlineOrders}</span></td>
        <td><span class="badge-tag channel-offline">${c.offlineInvoices}</span></td>
        <td><strong style="color:var(--admin-gold-dark);">₹${(c.totalSpent || 0).toLocaleString()}</strong></td>
        <td><small>${new Date(c.joinedAt).toLocaleDateString()}</small></td>
      `;
      customerAnalyticsTableBody.appendChild(tr);
    });
  }

  // ==========================================
  // DRILL-DOWN ANALYTICS MODAL CONTROLLER
  // ==========================================
  window.openAnalyticsModal = function(reportType) {
    if (!latestAnalytics) return;
    modalCurrentReportType = reportType;

    let title = 'Detailed Report';
    let subtitle = 'Real-time database transaction logs';
    let tag = 'FINANCIAL REPORT';
    let summaryCardsHtml = '';
    let headers = [];
    let rows = [];

    const pb = latestAnalytics.paymentBreakdown || {};

    if (reportType === 'revenue' || reportType === 'orders') {
      title = reportType === 'revenue' ? 'Gross Revenue & Sales Audit' : 'Master Orders & Invoices Registry';
      subtitle = 'Unified database stream of online storefront orders and offline counter invoices';
      tag = 'AUDIT & REVENUE';

      summaryCardsHtml = `
        <div class="modal-summary-metric">
          <span class="metric-label">Total Gross Sales</span>
          <span class="metric-val">₹${(latestAnalytics.totalRevenue || 0).toLocaleString()}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Online Orders</span>
          <span class="metric-val">₹${(latestAnalytics.onlineRevenue || 0).toLocaleString()} (${latestAnalytics.onlineOrdersCount})</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Retail POS Invoices</span>
          <span class="metric-val">₹${(latestAnalytics.offlineRevenue || 0).toLocaleString()} (${latestAnalytics.offlineInvoicesCount})</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Total Transactions</span>
          <span class="metric-val">${latestAnalytics.totalOrdersCount}</span>
        </div>
      `;

      headers = ['Ref #', 'Channel', 'Customer', 'Items', 'Total (₹)', 'Payment Method', 'Status', 'Date'];

      // Combine orders and invoices
      const ordRows = orders.map(o => {
        const cust = typeof o.customer === 'string' ? JSON.parse(o.customer) : (o.customer || {});
        const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
        return {
          ref: o.order_number,
          channel: 'Online Storefront',
          channelBadge: 'channel-online',
          customer: cust.name || 'Store Customer',
          items: `${items.length} item(s)`,
          total: Number(o.total || 0),
          method: o.payment_method || 'Online',
          status: (o.status || 'placed').toUpperCase(),
          date: new Date(o.created_at).toLocaleString()
        };
      });

      const invRows = invoices.map(i => {
        const cust = typeof i.customer === 'string' ? JSON.parse(i.customer) : (i.customer || {});
        const items = typeof i.items === 'string' ? JSON.parse(i.items) : (i.items || []);
        return {
          ref: i.invoice_number,
          channel: 'Retail POS',
          channelBadge: 'channel-offline',
          customer: cust.name || 'Walk-in Customer',
          items: `${items.length} item(s)`,
          total: Number(i.total || 0),
          method: i.payment_mode || 'Cash',
          status: 'COMPLETED',
          date: new Date(i.created_at).toLocaleString()
        };
      });

      rows = [...ordRows, ...invRows].sort((a, b) => new Date(b.date) - new Date(a.date));

    } else if (reportType === 'online') {
      title = 'Online Website Orders Breakdown';
      subtitle = 'Complete log of orders placed by customers through the storefront';
      tag = 'STOREFRONT ORDERS';

      summaryCardsHtml = `
        <div class="modal-summary-metric">
          <span class="metric-label">Online Revenue</span>
          <span class="metric-val">₹${(latestAnalytics.onlineRevenue || 0).toLocaleString()}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Total Orders</span>
          <span class="metric-val">${latestAnalytics.onlineOrdersCount}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Avg Order Value</span>
          <span class="metric-val">₹${latestAnalytics.onlineOrdersCount > 0 ? Math.round(latestAnalytics.onlineRevenue / latestAnalytics.onlineOrdersCount).toLocaleString() : 0}</span>
        </div>
      `;

      headers = ['Order #', 'Customer', 'Phone', 'City', 'Items', 'Total (₹)', 'Payment Method', 'Status', 'Date'];

      rows = orders.map(o => {
        const cust = typeof o.customer === 'string' ? JSON.parse(o.customer) : (o.customer || {});
        const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
        return {
          ref: o.order_number,
          customer: cust.name || 'Store Customer',
          phone: cust.phone || 'N/A',
          city: cust.city || 'N/A',
          items: `${items.length} item(s)`,
          total: Number(o.total || 0),
          method: o.payment_method || 'Online',
          status: (o.status || 'placed').toUpperCase(),
          date: new Date(o.created_at).toLocaleString()
        };
      });

    } else if (reportType === 'offline') {
      title = 'Offline Counter POS Invoices Breakdown';
      subtitle = 'Billed and printed at physical store counter';
      tag = 'POS INVOICES';

      summaryCardsHtml = `
        <div class="modal-summary-metric">
          <span class="metric-label">Offline Counter Sales</span>
          <span class="metric-val">₹${(latestAnalytics.offlineRevenue || 0).toLocaleString()}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Total Invoices</span>
          <span class="metric-val">${latestAnalytics.offlineInvoicesCount}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Avg Ticket Value</span>
          <span class="metric-val">₹${latestAnalytics.offlineInvoicesCount > 0 ? Math.round(latestAnalytics.offlineRevenue / latestAnalytics.offlineInvoicesCount).toLocaleString() : 0}</span>
        </div>
      `;

      headers = ['Invoice #', 'Customer', 'Phone', 'Items', 'Total (₹)', 'Payment Mode', 'Billed By', 'Date'];

      rows = invoices.map(i => {
        const cust = typeof i.customer === 'string' ? JSON.parse(i.customer) : (i.customer || {});
        const items = typeof i.items === 'string' ? JSON.parse(i.items) : (i.items || []);
        return {
          ref: i.invoice_number,
          customer: cust.name || 'Walk-in Customer',
          phone: cust.phone || 'N/A',
          items: `${items.length} item(s)`,
          total: Number(i.total || 0),
          method: i.payment_mode || 'Cash',
          billedBy: i.created_by || 'Staff',
          date: new Date(i.created_at).toLocaleString()
        };
      });

    } else if (reportType === 'inventory' || reportType === 'low_stock') {
      title = reportType === 'low_stock' ? 'Low Stock Formulation Warning' : 'Unified Inventory Matrix Audit';
      subtitle = 'Live synchronization status for warehouse and counter inventory';
      tag = 'STOCK AUDIT';

      summaryCardsHtml = `
        <div class="modal-summary-metric">
          <span class="metric-label">Total Units in Stock</span>
          <span class="metric-val">${latestAnalytics.totalStock}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Low Stock Alerts</span>
          <span class="metric-val" style="color:#DC2626;">${latestAnalytics.lowStockItems}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Product Formulations</span>
          <span class="metric-val">${products.length}</span>
        </div>
      `;

      headers = ['Formulation', 'SKU', 'Price (₹)', 'Current Stock', 'Initial Stock', 'Online Sold', 'Offline Sold', 'Status'];

      rows = products.map(p => ({
        name: p.name,
        sku: p.sku || p.id,
        price: Number(p.price),
        stock: Number(p.stock),
        initialStock: Number(p.initial_stock || 0),
        onlineSold: Number(p.online_sold || 0),
        offlineSold: Number(p.offline_sold || 0),
        status: p.stock <= 25 ? '⚠️ Low Stock' : '✅ Healthy'
      }));

    } else if (reportType === 'customers') {
      title = 'Customer Purchase Intelligence';
      subtitle = 'Registered customer spend frequency and channel activity';
      tag = 'CUSTOMER METRICS';

      summaryCardsHtml = `
        <div class="modal-summary-metric">
          <span class="metric-label">Registered Customers</span>
          <span class="metric-val">${latestAnalytics.totalCustomers}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Active Buyers</span>
          <span class="metric-val">${(latestAnalytics.customerAnalytics || []).filter(c => c.orderCount > 0).length}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Top Customer Spend</span>
          <span class="metric-val">₹${(latestAnalytics.customerAnalytics?.[0]?.totalSpent || 0).toLocaleString()}</span>
        </div>
      `;

      headers = ['Customer Name', 'Email', 'Phone', 'City', 'Total Orders', 'Online Orders', 'Counter POS', 'Total Spent (₹)', 'Joined'];

      rows = (latestAnalytics.customerAnalytics || []).map(c => ({
        name: c.name,
        email: c.email,
        phone: c.phone || 'N/A',
        city: c.city || 'N/A',
        orderCount: c.orderCount,
        onlineOrders: c.onlineOrders,
        offlineInvoices: c.offlineInvoices,
        totalSpent: Number(c.totalSpent || 0),
        date: new Date(c.joinedAt).toLocaleDateString()
      }));

    } else if (reportType === 'upi' || reportType === 'card' || reportType === 'cash' || reportType === 'netbanking') {
      const catKey = reportType === 'upi' ? 'UPI' : reportType === 'card' ? 'Card' : reportType === 'cash' ? 'Cash' : 'Net Banking';
      const catData = pb[catKey] || { count: 0, revenue: 0, transactions: [] };

      title = `${catKey} Payment Transactions`;
      subtitle = `Verified ${catKey} transactions captured through website and POS terminal`;
      tag = `${catKey.toUpperCase()} AUDIT`;

      summaryCardsHtml = `
        <div class="modal-summary-metric">
          <span class="metric-label">${catKey} Revenue</span>
          <span class="metric-val">₹${catData.revenue.toLocaleString()}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Transactions</span>
          <span class="metric-val">${catData.count}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Share of Gross Sales</span>
          <span class="metric-val">${latestAnalytics.totalRevenue > 0 ? Math.round((catData.revenue / latestAnalytics.totalRevenue) * 100) : 0}%</span>
        </div>
      `;

      headers = ['Ref #', 'Type', 'Channel', 'Customer', 'Amount (₹)', 'Method / Gate', 'Status', 'Date'];

      rows = (catData.transactions || []).map(tx => ({
        ref: tx.ref,
        type: tx.type,
        channel: tx.channel === 'online' ? 'Storefront' : 'Counter POS',
        customer: tx.customerName,
        total: Number(tx.amount || 0),
        method: tx.method,
        status: (tx.status || 'COMPLETED').toUpperCase(),
        date: new Date(tx.date).toLocaleString()
      }));

    } else if (reportType === 'top_selling') {
      title = 'Top Selling Formulations Leaderboard';
      subtitle = 'Ranked by combined storefront and POS counter unit velocity';
      tag = 'PRODUCT VELOCITY';

      summaryCardsHtml = `
        <div class="modal-summary-metric">
          <span class="metric-label">Top Formulation</span>
          <span class="metric-val">${latestAnalytics.topSellingProducts?.[0]?.name || 'N/A'}</span>
        </div>
        <div class="modal-summary-metric">
          <span class="metric-label">Total Units Sold</span>
          <span class="metric-val">${(latestAnalytics.topSellingProducts || []).reduce((s, p) => s + p.totalSold, 0)} units</span>
        </div>
      `;

      headers = ['Rank', 'Formulation', 'SKU', 'Price (₹)', 'Online Sold', 'Counter POS Sold', 'Total Sold', 'Gross Generated (₹)'];

      rows = (latestAnalytics.topSellingProducts || []).map((p, idx) => ({
        rank: `#${idx + 1}`,
        name: p.name,
        sku: p.id,
        price: Number(p.price),
        onlineSold: `${p.onlineSold} units`,
        offlineSold: `${p.offlineSold} units`,
        totalSold: `${p.totalSold} units`,
        total: Number(p.totalRevenue || 0)
      }));
    }

    // Populate Modal Elements
    analyticsModalTitle.textContent = title;
    analyticsModalSubtitle.textContent = subtitle;
    analyticsReportTag.textContent = tag;
    analyticsModalSummary.innerHTML = summaryCardsHtml;

    modalCurrentHeaders = headers;
    modalCurrentRows = rows;

    if (analyticsModalSearch) analyticsModalSearch.value = '';
    renderAnalyticsModalTable(rows, headers);

    analyticsModalOverlay.classList.add('is-visible');
  };

  // Render Table Rows into Analytics Modal
  function renderAnalyticsModalTable(rows, headers) {
    if (!analyticsDetailThead || !analyticsDetailTbody) return;

    analyticsDetailThead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    analyticsDetailTbody.innerHTML = '';

    if (rows.length === 0) {
      analyticsDetailTbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align: center; padding: 24px; color: var(--admin-text-muted);">No matching transaction records found.</td></tr>`;
      if (analyticsRecordCount) analyticsRecordCount.textContent = 'Showing 0 records';
      return;
    }

    if (analyticsRecordCount) analyticsRecordCount.textContent = `Showing ${rows.length} records`;

    rows.forEach(r => {
      const tr = document.createElement('tr');
      const cells = Object.values(r).map((val, idx) => {
        if (typeof val === 'number') {
          return `<td><strong>₹${val.toLocaleString()}</strong></td>`;
        }
        if (String(val).includes('Online Storefront') || String(val) === 'COMPLETED' || String(val) === 'PAID') {
          return `<td><span class="badge-tag channel-online">${val}</span></td>`;
        }
        if (String(val).includes('Retail POS') || String(val).includes('Low Stock')) {
          return `<td><span class="badge-tag channel-offline">${val}</span></td>`;
        }
        return `<td>${val}</td>`;
      });
      tr.innerHTML = cells.join('');
      analyticsDetailTbody.appendChild(tr);
    });
  }

  // Live Search filter inside Modal
  if (analyticsModalSearch) {
    analyticsModalSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderAnalyticsModalTable(modalCurrentRows, modalCurrentHeaders);
        return;
      }

      const filtered = modalCurrentRows.filter(row => {
        return Object.values(row).some(v => String(v).toLowerCase().includes(query));
      });

      renderAnalyticsModalTable(filtered, modalCurrentHeaders);
    });
  }

  // Export CSV handler
  if (btnExportAnalyticsCsv) {
    btnExportAnalyticsCsv.onclick = () => {
      if (!modalCurrentRows || modalCurrentRows.length === 0) {
        showToast('No records to export');
        return;
      }

      const headers = modalCurrentHeaders;
      const csvLines = [headers.join(',')];

      modalCurrentRows.forEach(row => {
        const line = Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
        csvLines.push(line);
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvLines.join('\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', `nachiyar_${modalCurrentReportType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('📥 Report exported as CSV');
    };
  }

  // Close Analytics Modal
  function closeAnalyticsModal() {
    if (analyticsModalOverlay) analyticsModalOverlay.classList.remove('is-visible');
  }

  if (analyticsModalClose) analyticsModalClose.onclick = closeAnalyticsModal;
  if (btnCloseAnalyticsModal) btnCloseAnalyticsModal.onclick = closeAnalyticsModal;
  if (analyticsModalOverlay) {
    analyticsModalOverlay.addEventListener('click', (e) => {
      if (e.target === analyticsModalOverlay) closeAnalyticsModal();
    });
  }

  // ==========================================
  // 3. PRODUCT CATALOG MANAGEMENT
  // ==========================================
  function renderProductsTable() {
    productsTableBody.innerHTML = '';
    document.getElementById('badgeProductCount').textContent = products.length;

    products.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${p.images[0]}" alt="${p.name}" style="width:36px; height:48px; border-radius:6px; object-fit:contain; background:#F8FAFC; border:1px solid #E2E8F0; padding:2px;">
            <div>
              <strong>${p.name}</strong>
              <small style="display:block; color:var(--admin-text-muted);">${p.subtitle || ''}</small>
            </div>
          </div>
        </td>
        <td><code>${p.sku || 'N/A'}</code></td>
        <td>${p.category}</td>
        <td><strong>₹${p.price}</strong> <s style="opacity:0.5; font-size:11px;">₹${p.mrp}</s></td>
        <td>
          <strong style="color:${p.stock < 15 ? '#DC2626' : '#10B981'};">${p.stock} units</strong>
        </td>
        <td><span class="badge-tag active">${p.status || 'Active'}</span></td>
        <td><small><code>/${p.slug}</code></small></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-secondary btn-sm btn-edit-prod" data-id="${p.id}">Edit</button>
            <button class="btn-secondary btn-sm btn-del-prod" data-id="${p.id}" style="color:#DC2626;">Delete</button>
          </div>
        </td>
      `;
      productsTableBody.appendChild(tr);
    });

    // Edit Product
    document.querySelectorAll('.btn-edit-prod').forEach(b => {
      b.onclick = () => openProductModal(b.dataset.id);
    });

    // Delete Product
    document.querySelectorAll('.btn-del-prod').forEach(b => {
      b.onclick = async () => {
        if (confirm('Are you sure you want to delete this product?')) {
          await authFetch(`/api/products/${b.dataset.id}`, { method: 'DELETE' });
          showToast('Product removed.');
          loadAllData();
        }
      };
    });
  }

  function openProductModal(productId = null) {
    productForm.reset();
    document.getElementById('formProductId').value = '';

    if (productId) {
      const p = products.find(x => x.id === productId);
      if (!p) return;
      modalProductTitle.textContent = `Edit Formulation: ${p.name}`;
      document.getElementById('formProductId').value = p.id;
      document.getElementById('formProdName').value = p.name;
      document.getElementById('formProdCategory').value = p.category;
      document.getElementById('formProdSubtitle').value = p.subtitle || '';
      document.getElementById('formProdPrice').value = p.price;
      document.getElementById('formProdMrp').value = p.mrp || '';
      document.getElementById('formProdStock').value = p.stock;
      document.getElementById('formProdSku').value = p.sku || '';
      document.getElementById('formProdImage').value = p.images[0] || '';
      document.getElementById('formProdColor').value = p.themeColor || '#6B4E9B';
      document.getElementById('formProdTagline').value = p.tagline || '';
      document.getElementById('formProdDesc').value = p.description || '';
      document.getElementById('formProdIngredients').value = p.ingredients || '';
      document.getElementById('formProdSlug').value = p.slug || '';
      if (p.seo) {
        document.getElementById('formProdMetaTitle').value = p.seo.metaTitle || '';
        document.getElementById('formProdMetaDesc').value = p.seo.metaDescription || '';
        document.getElementById('formProdKeywords').value = p.seo.keywords || '';
      }
    } else {
      modalProductTitle.textContent = 'Add New Formulation';
    }

    productModalOverlay.classList.add('is-active');
  }

  btnOpenNewProductModal.onclick = () => openProductModal();
  modalProductClose.onclick = () => productModalOverlay.classList.remove('is-active');
  btnCancelProductModal.onclick = () => productModalOverlay.classList.remove('is-active');

  productForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('formProductId').value;
    const payload = {
      name: document.getElementById('formProdName').value,
      category: document.getElementById('formProdCategory').value,
      subtitle: document.getElementById('formProdSubtitle').value,
      price: Number(document.getElementById('formProdPrice').value),
      mrp: Number(document.getElementById('formProdMrp').value),
      stock: Number(document.getElementById('formProdStock').value),
      sku: document.getElementById('formProdSku').value,
      images: [document.getElementById('formProdImage').value],
      themeColor: document.getElementById('formProdColor').value,
      tagline: document.getElementById('formProdTagline').value,
      description: document.getElementById('formProdDesc').value,
      ingredients: document.getElementById('formProdIngredients').value,
      slug: document.getElementById('formProdSlug').value,
      seo: {
        metaTitle: document.getElementById('formProdMetaTitle').value,
        metaDescription: document.getElementById('formProdMetaDesc').value,
        keywords: document.getElementById('formProdKeywords').value,
        slug: document.getElementById('formProdSlug').value
      }
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/products/${id}` : '/api/products';

    const res = await authFetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast(id ? 'Product updated successfully.' : 'New product created.');
      productModalOverlay.classList.remove('is-active');
      loadAllData();
    } else {
      alert(`Error: ${res.message}`);
    }
  };

  // ==========================================
  // 4. SYNCHRONIZED INVENTORY MATRIX
  // ==========================================
  function renderInventoryMatrix() {
    stockCardsContainer.innerHTML = '';
    inventoryLogsTableBody.innerHTML = '';

    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'stock-card';
      card.innerHTML = `
        <div class="stock-card-header">
          <img src="${p.images[0]}" alt="${p.name}" class="stock-card-img">
          <div>
            <h4 style="font-weight:700;">${p.name}</h4>
            <span style="font-size:11px; color:var(--admin-text-muted);">SKU: ${p.sku}</span>
          </div>
        </div>
        <div class="stock-metric-row">
          <div class="stock-metric">
            <span class="metric-val" style="color:#2563EB;">${p.onlineSold || 0}</span>
            <span class="metric-lbl">Online Sold</span>
          </div>
          <div class="stock-metric">
            <span class="metric-val" style="color:#D97706;">${p.offlineSold || 0}</span>
            <span class="metric-lbl">Offline Billed</span>
          </div>
          <div class="stock-metric">
            <span class="metric-val" style="color:#10B981;">${p.stock}</span>
            <span class="metric-lbl">In Stock</span>
          </div>
        </div>
        <div style="font-size:11px; color:var(--admin-text-muted); text-align:center;">
          Initial: ${p.initialStock || (p.stock + (p.onlineSold || 0) + (p.offlineSold || 0))} units | Deduction: -${(p.onlineSold || 0) + (p.offlineSold || 0)} units
        </div>
      `;
      stockCardsContainer.appendChild(card);
    });

    // Audit logs
    inventoryLogs.forEach(log => {
      const tr = document.createElement('tr');
      const isDeduction = log.change < 0;
      tr.innerHTML = `
        <td><small>${new Date(log.timestamp).toLocaleString()}</small></td>
        <td><strong>${log.productName}</strong></td>
        <td><span class="badge-tag ${log.channel === 'online' ? 'channel-online' : 'channel-offline'}">${log.channel.toUpperCase()}</span></td>
        <td><code>${log.reference}</code></td>
        <td><strong style="color:${isDeduction ? '#DC2626' : '#10B981'};">${log.change > 0 ? '+' : ''}${log.change}</strong></td>
        <td>${log.prevStock}</td>
        <td><strong>${log.newStock}</strong></td>
        <td><small>${log.reason}</small></td>
      `;
      inventoryLogsTableBody.appendChild(tr);
    });
  }

  // ==========================================
  // 5. POS & OFFLINE BILLING (INVOICING)
  // ==========================================
  function renderPOSProductPicker() {
    posProductPicker.innerHTML = '';
    products.forEach(p => {
      const item = document.createElement('div');
      item.className = 'pos-pick-card';
      item.innerHTML = `
        <img src="${p.images[0]}" alt="${p.name}" class="pos-pick-img">
        <div class="pos-pick-title">${p.name}</div>
        <div class="pos-pick-price">₹${p.price}</div>
        <div class="pos-pick-stock">${p.stock} in stock</div>
      `;
      item.onclick = () => addProductToPOSBill(p);
      posProductPicker.appendChild(item);
    });
  }

  function addProductToPOSBill(prod) {
    if (prod.stock <= 0) {
      alert(`${prod.name} is currently out of stock!`);
      return;
    }

    const existing = posCart.find(i => i.productId === prod.id);
    if (existing) {
      if (existing.qty + 1 > prod.stock) {
        alert(`Cannot add more than available stock (${prod.stock} units).`);
        return;
      }
      existing.qty++;
      existing.subtotal = existing.qty * existing.price;
    } else {
      posCart.push({
        productId: prod.id,
        name: prod.name,
        price: prod.price,
        qty: 1,
        subtotal: prod.price,
        maxStock: prod.stock
      });
    }

    renderPOSBillTable();
  }

  function renderPOSBillTable() {
    if (posCart.length === 0) {
      posBillTableBody.innerHTML = `
        <tr class="empty-bill-row">
          <td colspan="5" style="text-align:center; padding:30px; color:var(--admin-text-muted);">
            Select products above to add to this invoice.
          </td>
        </tr>
      `;
      posSubtotalVal.textContent = '₹0';
      posTaxVal.textContent = '₹0';
      posGrandTotalVal.textContent = '₹0';
      return;
    }

    posBillTableBody.innerHTML = '';
    let subtotal = 0;

    posCart.forEach((item, idx) => {
      subtotal += item.subtotal;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.name}</strong></td>
        <td>₹${item.price}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <button class="btn-secondary btn-sm btn-pos-minus" data-idx="${idx}">−</button>
            <span><strong>${item.qty}</strong></span>
            <button class="btn-secondary btn-sm btn-pos-plus" data-idx="${idx}">+</button>
          </div>
        </td>
        <td><strong>₹${item.subtotal}</strong></td>
        <td><button class="btn-link btn-pos-remove" data-idx="${idx}" style="color:#DC2626;">✕</button></td>
      `;
      posBillTableBody.appendChild(tr);
    });

    // Steppers
    document.querySelectorAll('.btn-pos-minus').forEach(b => {
      b.onclick = () => {
        const i = b.dataset.idx;
        if (posCart[i].qty > 1) {
          posCart[i].qty--;
          posCart[i].subtotal = posCart[i].qty * posCart[i].price;
        } else {
          posCart.splice(i, 1);
        }
        renderPOSBillTable();
      };
    });

    document.querySelectorAll('.btn-pos-plus').forEach(b => {
      b.onclick = () => {
        const i = b.dataset.idx;
        if (posCart[i].qty < posCart[i].maxStock) {
          posCart[i].qty++;
          posCart[i].subtotal = posCart[i].qty * posCart[i].price;
          renderPOSBillTable();
        } else {
          alert('Maximum stock reached for this product.');
        }
      };
    });

    document.querySelectorAll('.btn-pos-remove').forEach(b => {
      b.onclick = () => {
        posCart.splice(b.dataset.idx, 1);
        renderPOSBillTable();
      };
    });

    // Calculations
    const discount = Number(posDiscountInput.value) || 0;
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * 0.05); // 5% GST on ayurvedic herbal personal care
    const grandTotal = taxable + tax;

    posSubtotalVal.textContent = `₹${subtotal}`;
    posTaxVal.textContent = `₹${tax}`;
    posGrandTotalVal.textContent = `₹${grandTotal}`;
  }

  posDiscountInput.oninput = renderPOSBillTable;

  // Generate Invoice Action
  btnGenerateInvoice.onclick = async () => {
    if (posCart.length === 0) {
      alert('Please add at least one product to the invoice.');
      return;
    }

    const custName = posCustName.value.trim();
    const custPhone = posCustPhone.value.trim();

    if (!custName || !custPhone) {
      alert('Please fill customer Name and Phone number for the tax invoice.');
      return;
    }

    const subtotal = posCart.reduce((s, i) => s + i.subtotal, 0);
    const discount = Number(posDiscountInput.value) || 0;
    const tax = Math.round(Math.max(0, subtotal - discount) * 0.05);
    const total = Math.max(0, subtotal - discount) + tax;

    const payload = {
      customer: {
        name: custName,
        phone: custPhone,
        email: posCustEmail.value.trim(),
        address: posCustAddress.value.trim() || 'Retail Counter Walk-in',
        gstin: ''
      },
      items: posCart.map(i => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        qty: i.qty,
        subtotal: i.subtotal
      })),
      subtotal: subtotal,
      discount: discount,
      tax: tax,
      total: total,
      paymentStatus: 'paid',
      paymentMode: posPaymentMode.value,
      notes: 'Counter POS Tax Invoice',
      createdBy: `${currentUserName.textContent} (${currentRoleBadge.textContent})`
    };

    try {
      const res = await authFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        showToast(`Invoice ${res.data.invoiceNumber} generated! Stock updated.`);
        // Reset POS Form
        posCart = [];
        posCustName.value = '';
        posCustPhone.value = '';
        posCustEmail.value = '';
        posCustAddress.value = '';
        posDiscountInput.value = '0';
        renderPOSBillTable();

        // Refresh all data
        await loadAllData();

        // Show printable invoice
        showInvoiceReceipt(res.data.id);
      } else {
        alert(`Billing Failed: ${res.message}`);
      }
    } catch (e) {
      alert(`Network error: ${e.message}`);
    }
  };

  // ==========================================
  // 6. INVOICE RECEIPT MODAL (PRINTABLE)
  // ==========================================
  function showInvoiceReceipt(invoiceId) {
    const inv = invoices.find(i => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!inv) return;

    receiptPrintableArea.innerHTML = `
      <div class="receipt-header-row">
        <div class="receipt-brand">
          <h3>NACHIYAR HERBALS</h3>
          <p style="font-size:10px; color:#64748B;">AUTHENTIC BOTANICAL PERSONAL CARE</p>
          <p style="font-size:10px; margin-top:4px;">GSTIN: ${storeSettings.gstin || '33AAACH9876K1Z2'}</p>
          <p style="font-size:10px;">${storeSettings.storeAddress || 'Madurai, Tamil Nadu'}</p>
        </div>
        <div class="receipt-meta">
          <h4 style="font-size:14px; font-weight:800; color:#7C5AAB;">TAX INVOICE</h4>
          <p><strong>${inv.invoiceNumber}</strong></p>
          <p>Date: ${new Date(inv.createdAt).toLocaleDateString()}</p>
          <p>Mode: <strong>${inv.paymentMode}</strong></p>
          <p>Status: <strong style="color:#059669;">PAID</strong></p>
        </div>
      </div>

      <div style="margin-bottom:14px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">
        <span style="font-size:10px; text-transform:uppercase; font-weight:700; color:#64748B;">Billed To:</span>
        <h4 style="font-size:12px; margin-top:2px;">${inv.customer.name}</h4>
        <p style="font-size:11px;">Phone: ${inv.customer.phone || 'N/A'} | Email: ${inv.customer.email || 'N/A'}</p>
        <p style="font-size:11px;">Address: ${inv.customer.address || 'In-Store Walk-in'}</p>
      </div>

      <table class="receipt-table">
        <thead>
          <tr>
            <th>Item & Formulation</th>
            <th>Rate</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${inv.items.map(item => `
            <tr>
              <td><strong>${item.name}</strong></td>
              <td>₹${item.price}</td>
              <td>${item.qty}</td>
              <td>₹${item.subtotal || (item.price * item.qty)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="receipt-total-block">
        <div class="receipt-total-line">
          <span>Subtotal:</span>
          <span>₹${inv.subtotal}</span>
        </div>
        ${inv.discount ? `
        <div class="receipt-total-line" style="color:#DC2626;">
          <span>Discount:</span>
          <span>-₹${inv.discount}</span>
        </div>` : ''}
        <div class="receipt-total-line">
          <span>GST (5%):</span>
          <span>₹${inv.tax}</span>
        </div>
        <div class="receipt-total-line bold">
          <span>Grand Total:</span>
          <span>₹${inv.total}</span>
        </div>
      </div>

      <div style="margin-top:24px; text-align:center; font-size:10px; color:#64748B; border-top:1px dashed #CBD5E1; padding-top:12px;">
        <p>Thank you for choosing pure Ayurvedic care for your crown.</p>
        <p>Support: ${storeSettings.supportEmail || 'care@nachiyarherbals.com'} | Ph: ${storeSettings.supportPhone || '+91 94440 88990'}</p>
      </div>
    `;

    invoiceModalOverlay.classList.add('is-active');
  }

  invoiceModalClose.onclick = () => invoiceModalOverlay.classList.remove('is-active');

  function renderInvoicesTable() {
    allInvoicesTableBody.innerHTML = '';
    invoices.forEach(inv => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${inv.invoiceNumber}</strong></td>
        <td>${new Date(inv.createdAt).toLocaleDateString()}</td>
        <td>${inv.customer.name}<br><small style="color:var(--admin-text-muted);">${inv.customer.phone || ''}</small></td>
        <td>${inv.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</td>
        <td><strong>₹${inv.total}</strong></td>
        <td><span class="badge-tag channel-offline">${inv.paymentMode}</span></td>
        <td><span class="badge-tag paid">PAID</span></td>
        <td><button class="btn-primary btn-sm btn-print-inv" data-id="${inv.id}">View / Print</button></td>
      `;
      allInvoicesTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-print-inv').forEach(b => {
      b.onclick = () => showInvoiceReceipt(b.dataset.id);
    });
  }

  // ==========================================
  // 7. ONLINE ORDERS MANAGEMENT
  // ==========================================
  function renderOrdersTable() {
    allOrdersTableBody.innerHTML = '';
    document.getElementById('badgeOrderCount').textContent = orders.length;

    orders.forEach(ord => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${ord.orderNumber}</strong></td>
        <td>${new Date(ord.createdAt).toLocaleDateString()}</td>
        <td>
          <strong>${ord.customer.name}</strong><br>
          <small>${ord.customer.city || ''}, ${ord.customer.state || ''}</small>
        </td>
        <td>${ord.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</td>
        <td><strong>₹${ord.total}</strong></td>
        <td><span class="badge-tag paid">${ord.paymentMethod}</span></td>
        <td>
          <span class="badge-tag channel-online status-tag-${ord.id}">${ord.status.toUpperCase()}</span>
        </td>
        <td>
          <select class="form-input-sm ord-status-select" data-id="${ord.id}" style="width:110px;">
            <option value="placed" ${ord.status === 'placed' ? 'selected' : ''}>Placed</option>
            <option value="processing" ${ord.status === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="shipped" ${ord.status === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${ord.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
      `;
      allOrdersTableBody.appendChild(tr);
    });

    // Order status update
    document.querySelectorAll('.ord-status-select').forEach(sel => {
      sel.onchange = async () => {
        const orderId = sel.dataset.id;
        const newStatus = sel.value;
        await authFetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        showToast(`Order status updated to ${newStatus.toUpperCase()}`);
        document.querySelector(`.status-tag-${orderId}`).textContent = newStatus.toUpperCase();
      };
    });
  }

  // ==========================================
  // 8. STORE SETTINGS & SEO
  // ==========================================
  function populateSettingsForm() {
    if (!storeSettings) return;
    document.getElementById('setAnnouncementText').value = storeSettings.announcementText || '';
    document.getElementById('setFreeShipping').value = storeSettings.freeShippingThreshold || 599;
    document.getElementById('setMysteryCode').value = storeSettings.mysteryCouponCode || 'ROYAL15';
    document.getElementById('setBrandName').value = storeSettings.brandName || 'Nachiyar Herbals & Cosmetics';
    document.getElementById('setGstin').value = storeSettings.gstin || '';
    document.getElementById('setSupportPhone').value = storeSettings.supportPhone || '';
    document.getElementById('setStoreAddress').value = storeSettings.storeAddress || '';

    // Payment Methods
    const pm = storeSettings.paymentMethods || {};
    if (document.getElementById('setPmCod')) {
      document.getElementById('setPmCod').checked = pm.cod ? pm.cod.enabled !== false : true;
    }
    if (document.getElementById('setPmUpi')) {
      document.getElementById('setPmUpi').checked = pm.upi ? pm.upi.enabled !== false : true;
    }
    if (document.getElementById('setPmUpiId')) {
      document.getElementById('setPmUpiId').value = (pm.upi && pm.upi.upiId) || 'nachiyarherbals18@okaxis';
    }
    if (document.getElementById('setPmUpiName')) {
      document.getElementById('setPmUpiName').value = (pm.upi && pm.upi.merchantName) || 'Nachiyar Herbals & Cosmetics';
    }
    if (document.getElementById('setPmCard')) {
      document.getElementById('setPmCard').checked = pm.card ? pm.card.enabled !== false : true;
    }
    if (document.getElementById('setPmNetbanking')) {
      document.getElementById('setPmNetbanking').checked = pm.netbanking ? pm.netbanking.enabled !== false : true;
    }
  }

  document.getElementById('btnSaveStoreSettings').onclick = async () => {
    const payload = {
      announcementText: document.getElementById('setAnnouncementText').value,
      freeShippingThreshold: Number(document.getElementById('setFreeShipping').value),
      mysteryCouponCode: document.getElementById('setMysteryCode').value,
      brandName: document.getElementById('setBrandName').value,
      gstin: document.getElementById('setGstin').value,
      supportPhone: document.getElementById('setSupportPhone').value,
      storeAddress: document.getElementById('setStoreAddress').value,
      paymentMethods: {
        cod: {
          enabled: document.getElementById('setPmCod').checked,
          label: 'Cash on Delivery (COD)',
          description: 'Pay cash to courier executive upon delivery'
        },
        upi: {
          enabled: document.getElementById('setPmUpi').checked,
          label: 'UPI (Google Pay, PhonePe, Paytm, BHIM)',
          description: 'Instant UPI payment with dynamic QR & VPA',
          upiId: document.getElementById('setPmUpiId').value.trim() || 'nachiyarherbals18@okaxis',
          merchantName: document.getElementById('setPmUpiName').value.trim() || 'Nachiyar Herbals & Cosmetics'
        },
        card: {
          enabled: document.getElementById('setPmCard').checked,
          label: 'Credit / Debit Card',
          description: 'Visa, MasterCard, RuPay, Maestro'
        },
        netbanking: {
          enabled: document.getElementById('setPmNetbanking').checked,
          label: 'Net Banking',
          description: 'All major Indian banks supported'
        }
      }
    };

    const res = await authFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      showToast('Store settings & payment gateway settings updated!');
      storeSettings = res.data;
    }
  };

  // ==========================================
  // 8.5. CUSTOMER REVIEWS MODERATION & APPROVAL
  // ==========================================
  function escapeAdminHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function loadAdminReviews() {
    try {
      const res = await authFetch('/api/reviews/admin/all').then(r => r.json());
      if (res.success && res.data) {
        adminReviews = res.data.reviews || [];
        const counts = res.data.counts || {};

        // Update counts in header stats
        if (statReviewTotal) statReviewTotal.textContent = `Total: ${counts.total || 0}`;
        if (statReviewPending) statReviewPending.textContent = `Pending: ${counts.pending || 0}`;
        if (statReviewApproved) statReviewApproved.textContent = `Approved: ${counts.approved || 0}`;
        if (statReviewRejected) statReviewRejected.textContent = `Rejected: ${counts.rejected || 0}`;

        // Update filter tabs counters
        if (countFilterAll) countFilterAll.textContent = counts.total || 0;
        if (countFilterPending) countFilterPending.textContent = counts.pending || 0;
        if (countFilterApproved) countFilterApproved.textContent = counts.approved || 0;
        if (countFilterRejected) countFilterRejected.textContent = counts.rejected || 0;

        // Update sidebar pending badge
        if (badgePendingReviews) {
          if (counts.pending > 0) {
            badgePendingReviews.style.display = 'inline-block';
            badgePendingReviews.textContent = counts.pending;
          } else {
            badgePendingReviews.style.display = 'none';
          }
        }

        renderAdminReviews();
      }
    } catch (err) {
      console.error('Failed to load admin reviews:', err);
    }
  }

  function renderAdminReviews() {
    if (!adminReviewsTableBody) return;
    adminReviewsTableBody.innerHTML = '';

    const searchTerm = (reviewsSearchInput ? reviewsSearchInput.value : '').toLowerCase().trim();

    let filtered = adminReviews.filter(r => {
      if (currentReviewFilter !== 'all' && r.status !== currentReviewFilter) {
        return false;
      }
      if (searchTerm) {
        const hay = [r.name, r.email, r.product_name, r.title, r.comment].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const emptyTr = document.createElement('tr');
      emptyTr.innerHTML = `
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">
          No customer reviews found matching the current filter.
        </td>
      `;
      adminReviewsTableBody.appendChild(emptyTr);
      return;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      const dateStr = r.created_at ? new Date(r.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }) : '—';
      const ratingStars = '★'.repeat(Math.max(1, Math.min(5, Number(r.rating || 5))));
      const status = r.status || 'pending';

      let statusBadgeHtml = '';
      if (status === 'approved') {
        statusBadgeHtml = `<span class="status-badge status-approved">✓ Approved</span>`;
      } else if (status === 'rejected') {
        statusBadgeHtml = `<span class="status-badge status-rejected">✕ Rejected</span>`;
      } else {
        statusBadgeHtml = `<span class="status-badge status-pending">⏳ Pending</span>`;
      }

      let actionsHtml = '';
      if (status === 'pending') {
        actionsHtml = `
          <button type="button" class="btn-mod btn-mod-approve" data-action="approved" data-id="${r.id}">✓ Approve</button>
          <button type="button" class="btn-mod btn-mod-reject" data-action="rejected" data-id="${r.id}">✕ Reject</button>
          <button type="button" class="btn-mod btn-mod-delete" data-action="delete" data-id="${r.id}" title="Permanently Delete">🗑</button>
        `;
      } else if (status === 'approved') {
        actionsHtml = `
          <button type="button" class="btn-mod btn-mod-reject" data-action="rejected" data-id="${r.id}">✕ Unpublish</button>
          <button type="button" class="btn-mod btn-mod-delete" data-action="delete" data-id="${r.id}" title="Permanently Delete">🗑</button>
        `;
      } else {
        actionsHtml = `
          <button type="button" class="btn-mod btn-mod-approve" data-action="approved" data-id="${r.id}">✓ Approve</button>
          <button type="button" class="btn-mod btn-mod-delete" data-action="delete" data-id="${r.id}" title="Permanently Delete">🗑</button>
        `;
      }

      tr.innerHTML = `
        <td><small style="color: var(--admin-text-muted);">${dateStr}</small></td>
        <td>
          <div class="review-patron-block">
            <span class="review-patron-name">${escapeAdminHtml(r.name)}</span>
            <span class="review-patron-email">${escapeAdminHtml(r.email || 'No email given')}</span>
          </div>
        </td>
        <td>
          <div class="review-stars-gold">${ratingStars} <small style="color:var(--admin-text); font-weight:700;">(${r.rating}/5)</small></div>
          <span class="review-product-pill">${escapeAdminHtml(r.product_name || 'Herbal Formulation')}</span>
        </td>
        <td>
          <div class="review-content-cell">
            ${r.title ? `<span class="review-headline-txt">${escapeAdminHtml(r.title)}</span>` : ''}
            <p class="review-comment-txt">"${escapeAdminHtml(r.comment)}"</p>
          </div>
        </td>
        <td>${statusBadgeHtml}</td>
        <td>
          <div class="review-actions-cell">
            ${actionsHtml}
          </div>
        </td>
      `;

      adminReviewsTableBody.appendChild(tr);
    });

    // Wire action buttons
    adminReviewsTableBody.querySelectorAll('.btn-mod').forEach(btn => {
      btn.onclick = async (e) => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === 'delete') {
          if (!confirm('Are you sure you want to permanently delete this customer review?')) return;
          try {
            const res = await authFetch(`/api/reviews/${id}`, { method: 'DELETE' }).then(r => r.json());
            if (res.success) {
              showToast('Review permanently deleted.');
              loadAdminReviews();
            } else {
              showToast(res.message || 'Failed to delete review.');
            }
          } catch (err) {
            console.error('Error deleting review:', err);
            showToast('Error deleting review.');
          }
        } else if (action === 'approved' || action === 'rejected') {
          try {
            const res = await authFetch(`/api/reviews/${id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: action })
            }).then(r => r.json());

            if (res.success) {
              showToast(`Review status updated to ${action.toUpperCase()}!`);
              loadAdminReviews();
            } else {
              showToast(res.message || 'Failed to update review status.');
            }
          } catch (err) {
            console.error('Error updating review status:', err);
            showToast('Error updating review status.');
          }
        }
      };
    });
  }

  // Filter tabs listeners
  if (reviewsFilterTabs) {
    const filterBtns = reviewsFilterTabs.querySelectorAll('.review-filter-btn');
    filterBtns.forEach(btn => {
      btn.onclick = () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentReviewFilter = btn.dataset.filter;
        renderAdminReviews();
      };
    });
  }

  // Search input listener
  if (reviewsSearchInput) {
    reviewsSearchInput.oninput = () => {
      renderAdminReviews();
    };
  }

  // ==========================================
  // 9. ACCESS CONTROL & ROLE MANAGEMENT
  // ==========================================
  if (roleSelect) {
    roleSelect.onchange = () => {
      currentRole = roleSelect.value;
      applyRolePermissions(currentRole);
    };
  }

  // Ensure all tabs are enabled for the administrator
  navTabs.forEach(t => t.style.display = 'flex');

  function applyRolePermissions(role) {
    if (userAvatar) userAvatar.textContent = 'SA';
    if (currentUserName) currentUserName.textContent = 'Super Administrator';
    if (currentRoleBadge) currentRoleBadge.textContent = 'SUPER ADMIN';
    navTabs.forEach(t => t.style.display = 'flex');
  }

  // ==========================================
  // 10. TABS NAVIGATION & TOAST
  // ==========================================
  // MOBILE SIDEBAR CONTROLLER
  // ==========================================
  const adminSidebar = document.getElementById('adminSidebar');
  const adminSidebarToggle = document.getElementById('adminSidebarToggle');
  const adminSidebarClose = document.getElementById('adminSidebarClose');
  const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');

  function openSidebar() {
    if (adminSidebar) adminSidebar.classList.add('is-open');
    if (adminSidebarBackdrop) adminSidebarBackdrop.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (adminSidebar) adminSidebar.classList.remove('is-open');
    if (adminSidebarBackdrop) adminSidebarBackdrop.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  if (adminSidebarToggle) adminSidebarToggle.addEventListener('click', openSidebar);
  if (adminSidebarClose) adminSidebarClose.addEventListener('click', closeSidebar);
  if (adminSidebarBackdrop) adminSidebarBackdrop.addEventListener('click', closeSidebar);

  function switchTab(tabId) {
    navTabs.forEach(t => {
      if (t.dataset.tab === tabId) t.classList.add('active');
      else t.classList.remove('active');
    });

    tabPanes.forEach(p => {
      if (p.id === `pane-${tabId}`) p.classList.add('active');
      else p.classList.remove('active');
    });

    // Close mobile sidebar on navigation
    closeSidebar();
  }

  navTabs.forEach(t => {
    t.onclick = () => switchTab(t.dataset.tab);
  });

  function showToast(msg) {
    adminToast.textContent = msg;
    adminToast.classList.add('is-visible');
    setTimeout(() => {
      adminToast.classList.remove('is-visible');
    }, 2800);
  }

  // Initial Boot
  loadAllData();

});
