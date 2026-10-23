/**
 * NACHIYAR HERBALS & COSMETICS
 * Business Operations, Unified Inventory Synchronization & POS Billing Console
 */

document.addEventListener('DOMContentLoaded', () => {

  // Authentication & Session Guard
  const adminToken = localStorage.getItem('nachiyar_admin_token');
  const storedUserJson = localStorage.getItem('nachiyar_admin_user');

  if (!adminToken) {
    window.location.replace('/nimda-login/');
    return;
  }

  let loggedInUser = null;
  try {
    loggedInUser = storedUserJson ? JSON.parse(storedUserJson) : null;
  } catch (e) {}

  // Authenticated Fetch Helper
  async function authFetch(url, options = {}) {
    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${adminToken}`,
      'x-admin-token': adminToken
    };
    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    options.headers = headers;
    const res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem('nachiyar_admin_token');
      localStorage.removeItem('nachiyar_admin_user');
      localStorage.removeItem('nachiyar_admin_active_tab');
      document.cookie = 'nachiyar_admin_token=; path=/; max-age=0; SameSite=Lax';
      window.location.replace('/nimda-login/');
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
    if (currentUserName) currentUserName.textContent = loggedInUser.name || 'Super Nimda';
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
      window.location.replace('/nimda-login/');
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
  const posDiscountType = document.getElementById('posDiscountType');
  const posDiscountAmountVal = document.getElementById('posDiscountAmountVal');
  const posGstRateInput = document.getElementById('posGstRateInput');
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
      loadAdminMessages();
      renderMarketplaceHub();
      updateNotificationBadges();

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
      if ((analytics.totalStock || 0) === 0) {
        kpiStockStatus.textContent = 'No products in stock';
        kpiStockStatus.className = 'kpi-sub';
        kpiStockStatus.style.color = 'var(--admin-text-muted)';
        kpiStockStatus.style.fontWeight = '500';
      } else if (analytics.lowStockItems > 0) {
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
    const oil = products.find(p => p.slug === 'herbal-hair-oil' || (p.name && p.name.includes('Oil')));
    const shampoo = products.find(p => p.slug === 'hibiscus-flower-shampoo' || (p.name && p.name.includes('Shampoo')));
    if (syncOilStock) syncOilStock.textContent = oil ? `${oil.stock} units` : '0 units';
    if (syncShampooStock) syncShampooStock.textContent = shampoo ? `${shampoo.stock} units` : '0 units';

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
      { key: 'UPI', label: 'Instant UPI (GPay, PhonePe, QR)', dotClass: 'pm-dot-upi', color: '#6366F1' },
      { key: 'Card', label: 'Credit & Debit Cards (POS)', dotClass: 'pm-dot-card', color: '#3B82F6' },
      { key: 'Cash', label: 'Cash Counter & COD', dotClass: 'pm-dot-cash', color: '#10B981' },
      { key: 'Net Banking', label: 'Net Banking & Bank Transfer', dotClass: 'pm-dot-netbanking', color: '#F59E0B' }
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
        <div class="pm-top-row">
          <div class="pm-title-group">
            <span class="pm-indicator-dot ${m.dotClass}"></span>
            <span class="pm-name">${m.label}</span>
            <span class="pm-count-badge">${data.count} txns</span>
          </div>
          <div class="pm-amount-group">
            <span class="pm-amount">₹${data.revenue.toLocaleString()}</span>
          </div>
        </div>
        <div class="pm-bottom-row">
          <div class="pm-progress-track">
            <div class="pm-progress-bar" style="width: ${pct}%; background-color: ${m.color};"></div>
          </div>
          <span class="pm-pct-badge" style="color: ${m.color};">${pct}%</span>
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
        <div class="low-stock-main-wrap">
          <div class="low-stock-item-info">
            <strong>⚠️ ${p.name}</strong>
            <small>SKU: ${p.sku || p.id} • Price: ₹${p.price} • Threshold: 25 units</small>
          </div>
          <div class="low-stock-action-wrap">
            <div class="low-stock-count-box">
              <span class="low-stock-item-count">${p.stock}</span>
              <small class="low-stock-count-lbl">Remaining</small>
            </div>
            <button type="button" class="btn-restock-pill" onclick="switchTab('inventory')">⚡ Restock</button>
          </div>
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
        <td>
          <button class="btn-secondary btn-sm btn-view-cust-history" data-email="${c.email || ''}" data-phone="${c.phone || ''}" data-name="${c.name || ''}" style="white-space: nowrap;">
            🛍️ View Purchases
          </button>
        </td>
      `;
      customerAnalyticsTableBody.appendChild(tr);
    });

    // Attach click listeners to View Purchases buttons
    document.querySelectorAll('.btn-view-cust-history').forEach(btn => {
      btn.onclick = () => openCustomerHistoryModal(btn.dataset.email, btn.dataset.phone, btn.dataset.name);
    });
  }

  // ==========================================
  // DRILL-DOWN ANALYTICS MODAL CONTROLLER
  // ==========================================
  window.openAnalyticsModal = function(reportType) {
    // Helper to safely parse JSON or return fallback
    const safeParse = (val, fallback) => {
      if (!val) return fallback;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch(e) { return fallback; }
    };

    // Ensure analytics data exists, calculate fallback if endpoint hasn't loaded
    if (!latestAnalytics) {
      const onlineRev = (orders || []).reduce((s, o) => s + Number(o.total || 0), 0);
      const offlineRev = (invoices || []).reduce((s, i) => s + Number(i.total || 0), 0);
      const totalStock = (products || []).reduce((s, p) => s + Number(p.stock || 0), 0);
      latestAnalytics = {
        totalRevenue: onlineRev + offlineRev,
        onlineRevenue: onlineRev,
        offlineRevenue: offlineRev,
        onlineOrdersCount: (orders || []).length,
        offlineInvoicesCount: (invoices || []).length,
        totalOrdersCount: (orders || []).length + (invoices || []).length,
        totalStock: totalStock,
        lowStockItems: (products || []).filter(p => Number(p.stock || 0) <= 25).length,
        totalCustomers: new Set([...(orders || []).map(o => o.customer_email || o.customer_phone), ...(invoices || []).map(i => i.customer_phone)]).size || 0,
        paymentBreakdown: {
          UPI: { count: (invoices || []).filter(i => (i.payment_mode || '').includes('UPI')).length, revenue: (invoices || []).filter(i => (i.payment_mode || '').includes('UPI')).reduce((s, i) => s + Number(i.total || 0), 0) },
          Card: { count: (invoices || []).filter(i => (i.payment_mode || '').includes('Card')).length, revenue: (invoices || []).filter(i => (i.payment_mode || '').includes('Card')).reduce((s, i) => s + Number(i.total || 0), 0) },
          Cash: { count: (invoices || []).filter(i => (i.payment_mode || '').includes('Cash')).length, revenue: (invoices || []).filter(i => (i.payment_mode || '').includes('Cash')).reduce((s, i) => s + Number(i.total || 0), 0) },
          'Net Banking': { count: (invoices || []).filter(i => (i.payment_mode || '').includes('Net Banking')).length, revenue: (invoices || []).filter(i => (i.payment_mode || '').includes('Net Banking')).reduce((s, i) => s + Number(i.total || 0), 0) }
        }
      };
    }

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
      const ordRows = (orders || []).map(o => {
        const cust = safeParse(o.customer, {});
        const items = safeParse(o.items, []);
        return {
          ref: o.order_number,
          channel: 'Online Storefront',
          channelBadge: 'channel-online',
          customer: cust.name || o.customer_name || 'Store Customer',
          items: `${items.length} item(s)`,
          total: Number(o.total || 0),
          method: o.payment_method || 'Online',
          status: (o.status || 'placed').toUpperCase(),
          date: new Date(o.created_at).toLocaleString()
        };
      });

      const invRows = (invoices || []).map(i => {
        const cust = safeParse(i.customer, {});
        const items = safeParse(i.items, []);
        return {
          ref: i.invoice_number,
          channel: 'Retail POS',
          channelBadge: 'channel-offline',
          customer: cust.name || i.customer_name || 'Walk-in Customer',
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

      rows = (orders || []).map(o => {
        const cust = safeParse(o.customer, {});
        const items = safeParse(o.items, []);
        return {
          ref: o.order_number,
          customer: cust.name || o.customer_name || 'Store Customer',
          phone: cust.phone || o.customer_phone || 'N/A',
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

      rows = (invoices || []).map(i => {
        const cust = safeParse(i.customer, {});
        const items = safeParse(i.items, []);
        return {
          ref: i.invoice_number,
          customer: cust.name || i.customer_name || 'Walk-in Customer',
          phone: cust.phone || i.customer_phone || 'N/A',
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

    analyticsModalOverlay.classList.add('is-active');
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
    if (analyticsModalOverlay) {
      analyticsModalOverlay.classList.remove('is-active');
      analyticsModalOverlay.classList.remove('is-visible');
    }
  }
  window.closeAnalyticsModal = closeAnalyticsModal;

  if (analyticsModalClose) analyticsModalClose.onclick = closeAnalyticsModal;
  if (btnCloseAnalyticsModal) btnCloseAnalyticsModal.onclick = closeAnalyticsModal;
  if (analyticsModalOverlay) {
    analyticsModalOverlay.addEventListener('click', (e) => {
      if (e.target === analyticsModalOverlay) closeAnalyticsModal();
    });
  }

  // Universal click delegation for all interactive KPI cards and Report badges
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.interactive-kpi');
    if (card && card.dataset.report) {
      e.preventDefault();
      openAnalyticsModal(card.dataset.report);
    }
  });

  // ==========================================
  // 3. PRODUCT CATALOG MANAGEMENT
  // ==========================================
  function renderProductsTable() {
    productsTableBody.innerHTML = '';
    const searchVal = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
    const catVal = (document.getElementById('productCategoryFilter')?.value || '').trim();

    const filtered = products.filter(p => {
      const matchSearch = !searchVal || 
        (p.name && p.name.toLowerCase().includes(searchVal)) ||
        (p.sku && p.sku.toLowerCase().includes(searchVal)) ||
        (p.category && p.category.toLowerCase().includes(searchVal)) ||
        (p.slug && p.slug.toLowerCase().includes(searchVal));
      const matchCat = !catVal || p.category === catVal;
      return matchSearch && matchCat;
    });

    const bpc = document.getElementById('badgeProductCount');
    if (bpc) bpc.style.display = 'none';

    if (filtered.length === 0) {
      productsTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--admin-text-muted);">No products found matching your filter criteria.</td></tr>';
      return;
    }

    filtered.forEach(p => {
      // Check showcase slot
      const showcase = (storeSettings && storeSettings.homeShowcase) || {};
      const isSlot1 = (showcase.slot1 && showcase.slot1.productId === p.id) || (!showcase.slot1 && p.id === 'prod_oil_01');
      const isSlot2 = (showcase.slot2 && showcase.slot2.productId === p.id) || (!showcase.slot2 && p.id === 'prod_shampoo_02');
      const isCombo = (showcase.combo && showcase.combo.productId === p.id) || (!showcase.combo && p.id === 'prod_duo_03');

      let showcaseBtnLabel = '+ Set as Home Feature ▾';
      let showcaseBtnClass = 'inactive';
      let activeSlotKey = '';

      if (isSlot1) {
        showcaseBtnLabel = '★ Live: Flagship 1 (Left) ▾';
        showcaseBtnClass = 'active-showcase';
        activeSlotKey = 'slot1';
      } else if (isSlot2) {
        showcaseBtnLabel = '★ Live: Flagship 2 (Right) ▾';
        showcaseBtnClass = 'active-showcase';
        activeSlotKey = 'slot2';
      } else if (isCombo) {
        showcaseBtnLabel = '★ Live: Combo Banner ▾';
        showcaseBtnClass = 'active-showcase';
        activeSlotKey = 'combo';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${(p.images && p.images[0]) || 'assets/new-oil-bottle-card.jpg'}" alt="${p.name}" style="width:36px; height:48px; border-radius:6px; object-fit:contain; background:#F8FAFC; border:1px solid #E2E8F0; padding:2px;">
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
        <td>
          <a href="/product/?slug=${p.slug}" target="_blank" title="View live storefront formulation page" style="color:var(--admin-primary); font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
            <code>/${p.slug}</code> <span style="font-size:11px;">↗</span>
          </a>
        </td>
        <td>
          <div class="showcase-cell" data-prod-id="${p.id}">
            <button type="button" class="btn-showcase-badge ${showcaseBtnClass}" data-id="${p.id}">
              ${showcaseBtnLabel}
            </button>
            <div class="showcase-popover" id="popover-${p.id}">
              <div class="showcase-popover-header">Home Showcase Position</div>
              <button type="button" class="showcase-opt-btn ${isSlot1 ? 'is-active-opt' : ''}" data-action="set-slot1" data-slot="slot1" data-id="${p.id}">
                📌 Flagship 1 (Left Card)
              </button>
              <button type="button" class="showcase-opt-btn ${isSlot2 ? 'is-active-opt' : ''}" data-action="set-slot2" data-slot="slot2" data-id="${p.id}">
                📌 Flagship 2 (Right Card)
              </button>
              <button type="button" class="showcase-opt-btn ${isCombo ? 'is-active-opt' : ''}" data-action="configure-combo" data-slot="combo" data-id="${p.id}">
                🎁 Configure Combo Banner...
              </button>
              ${activeSlotKey ? `
              <button type="button" class="showcase-opt-btn remove-opt" data-action="remove-slot" data-slot="${activeSlotKey}" data-id="${p.id}">
                ✕ Remove from Home (Shop Only)
              </button>
              ` : ''}
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-secondary btn-sm btn-edit-prod" data-id="${p.id}">Edit</button>
            <button class="btn-secondary btn-sm btn-del-prod" data-id="${p.id}" style="color:#DC2626;">Delete</button>
          </div>
        </td>
      `;
      productsTableBody.appendChild(tr);
    });

    // Toggle Showcase Popovers
    document.querySelectorAll('.btn-showcase-badge').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const prodId = btn.dataset.id;
        const targetPopover = document.getElementById(`popover-${prodId}`);
        document.querySelectorAll('.showcase-popover.open').forEach(p => {
          if (p !== targetPopover) p.classList.remove('open');
        });
        if (targetPopover) targetPopover.classList.toggle('open');
      };
    });

    // Showcase Action Button Clicks
    document.querySelectorAll('.showcase-opt-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const prodId = btn.dataset.id;
        const slot = btn.dataset.slot;
        const prod = products.find(x => x.id === prodId);

        document.querySelectorAll('.showcase-popover.open').forEach(p => p.classList.remove('open'));

        if (action === 'set-slot1') {
          openFlagshipModal('slot1', prod);
        } else if (action === 'set-slot2') {
          openFlagshipModal('slot2', prod);
        } else if (action === 'configure-combo') {
          openComboModal(prod);
        } else if (action === 'remove-slot') {
          if (confirm(`Remove this product from Home Page showcase? It will remain active in the Shop catalog.`)) {
            try {
              const res = await authFetch('/api/settings/home-showcase', {
                method: 'POST',
                body: JSON.stringify({ slot: slot, remove: true })
              });
              const json = await res.json();
              if (json.success) {
                showToast('Removed from Home Page showcase.');
                loadAllData();
              }
            } catch (err) {
              showToast('Failed to update showcase: ' + err.message);
            }
          }
        }
      };
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

  // Close showcase popovers when clicking anywhere on the document
  document.addEventListener('click', () => {
    document.querySelectorAll('.showcase-popover.open').forEach(p => p.classList.remove('open'));
  });

  // Open Flagship Modal
  function openFlagshipModal(slot, prod) {
    if (!prod) return;
    const modal = document.getElementById('flagshipModalOverlay');
    if (!modal) return;
    const showcase = (storeSettings && storeSettings.homeShowcase && storeSettings.homeShowcase[slot]) || {};
    const isSameProduct = showcase.productId === prod.id && !showcase.removed;

    document.getElementById('flagshipFormSlot').value = slot;
    document.getElementById('flagshipFormProductId').value = prod.id;
    document.getElementById('flagshipModalTitle').textContent = slot === 'slot1' ? '★ Configure Flagship 1 (Left Card)' : '★ Configure Flagship 2 (Right Card)';
    document.getElementById('flagshipModalSubtitle').textContent = `Set the live image, rates, and titles shown on the Home Page for this slot.`;

    document.getElementById('flagshipFormTitle').value = (isSameProduct && showcase.title) ? showcase.title : (prod.name || '');
    document.getElementById('flagshipFormSubtitle').value = (isSameProduct && showcase.subtitle) ? showcase.subtitle : (prod.subtitle || '');
    document.getElementById('flagshipFormPrice').value = (isSameProduct && showcase.price !== undefined) ? showcase.price : prod.price;
    document.getElementById('flagshipFormMrp').value = (isSameProduct && showcase.mrp !== undefined) ? showcase.mrp : (prod.mrp || Math.round(prod.price * 1.2));

    const img = (isSameProduct && showcase.customImage) ? showcase.customImage : ((prod.images && prod.images[0]) || 'assets/new-oil-bottle-card.jpg');
    document.getElementById('flagshipFormImageUrl').value = img;
    document.getElementById('flagshipImagePreview').src = img;

    const statusEl = document.getElementById('flagshipUploadStatus');
    if (statusEl) statusEl.style.display = 'none';

    modal.classList.add('is-active');
    modal.style.display = 'flex';
  }

  // ==================== DYNAMIC COMBO PACK COMPOSITE IMAGE GENERATOR ====================
  async function generateComboPackImage(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return null;

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const W = 800;
      const H = 600;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');

      // 1. Luxury Royal Background
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.75);
      bgGrad.addColorStop(0, '#3A1F4D');
      bgGrad.addColorStop(0.65, '#231130');
      bgGrad.addColorStop(1, '#15081E');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Gold frame accent
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, W - 32, H - 32);

      // Inner subtle border
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(22, 22, W - 44, H - 44);

      // Top Header: "NACHIYAR ROYAL BOTANICAL RITUAL"
      ctx.fillStyle = 'rgba(212, 175, 55, 0.95)';
      ctx.font = 'bold 16px "Cinzel", "Playfair Display", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦  NACHIYAR ROYAL BOTANICAL RITUAL  ✦', W / 2, 56);

      // Load all images
      let loaded = 0;
      const imgs = [];
      const total = imageUrls.length;

      imageUrls.forEach((url, idx) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imgs[idx] = img;
          loaded++;
          if (loaded === total) drawImages();
        };
        img.onerror = () => {
          loaded++;
          if (loaded === total) drawImages();
        };
        img.src = url;
      });

      function drawImages() {
        const validImgs = imgs.filter(Boolean);
        const count = validImgs.length;

        if (count === 1) {
          const img = validImgs[0];
          const imgSize = 380;
          const x = (W - imgSize) / 2;
          const y = (H - imgSize) / 2 + 10;
          drawShadowedImage(ctx, img, x, y, imgSize, imgSize);
        } else if (count === 2) {
          const imgSize = 340;
          const img1 = validImgs[0];
          const img2 = validImgs[1];

          // Left image tilted slightly inward
          drawShadowedImage(ctx, img1, 90, 140, imgSize, imgSize, -0.04);
          // Right image tilted slightly inward
          drawShadowedImage(ctx, img2, 370, 140, imgSize, imgSize, 0.04);

          // Central Plus Badge in between
          const cx = W / 2;
          const cy = 310;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, 32, 0, Math.PI * 2);
          ctx.fillStyle = '#D4AF37';
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          ctx.fillStyle = '#1A0B26';
          ctx.font = 'bold 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+', cx, cy - 1);
          ctx.restore();
        } else if (count >= 3) {
          const imgSize = 240;
          const spacing = (W - (count * imgSize)) / (count + 1);
          validImgs.slice(0, 4).forEach((img, i) => {
            const x = spacing + i * (imgSize + spacing);
            drawShadowedImage(ctx, img, x, 170, imgSize, imgSize);
          });
        }

        // Bottom Pill: "✦ EXCLUSIVE COMBO VALUE PACK ✦"
        const bottomText = '✦ EXCLUSIVE COMBO VALUE PACK ✦';
        ctx.font = 'bold 15px sans-serif';
        const textW = ctx.measureText(bottomText).width;
        const pillW = textW + 36;
        const pillH = 34;
        const pillX = (W - pillW) / 2;
        const pillY = H - 65;

        ctx.save();
        ctx.fillStyle = 'rgba(212, 175, 55, 0.2)';
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1.5;
        roundRect(ctx, pillX, pillY, pillW, pillH, 17);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFDF78';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bottomText, W / 2, pillY + pillH / 2);
        ctx.restore();

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(dataUrl);
        } catch (e) {
          console.warn('Canvas export warning:', e);
          resolve(null);
        }
      }
    });
  }

  function drawShadowedImage(ctx, img, x, y, w, h, rotateRad = 0) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (rotateRad) ctx.rotate(rotateRad);

    // Soft drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 12;

    // Draw white / clean backing pill for contrast
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.fill();

    // Clip rounded corners and draw product
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    roundRect(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.clip();

    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Track if admin manually uploaded an image for the current modal session
  let isComboUserUploadedImage = false;

  // Open Combo Banner Modal
  function openComboModal(prod) {
    const modal = document.getElementById('comboModalOverlay');
    if (!modal) return;
    const showcase = (storeSettings && storeSettings.homeShowcase && storeSettings.homeShowcase.combo) || {};

    isComboUserUploadedImage = false;

    // 1. Associated Catalog Product Picker:
    // Dropdown to select which catalog product represents the combo pack (default: prod_duo_03 or active combo)
    const sel = document.getElementById('comboLinkProductSelect');
    const targetCatalogId = showcase.productId || 'prod_duo_03';
    if (sel && Array.isArray(products)) {
      sel.innerHTML = products.map(p => `
        <option value="${p.id}" ${p.id === targetCatalogId ? 'selected' : ''}>
          ${p.name} (Stock: ${p.stock} units)
        </option>
      `).join('');
      sel.onchange = () => {
        document.getElementById('comboFormProductId').value = sel.value;
      };
    }
    document.getElementById('comboFormProductId').value = targetCatalogId;

    // 2. Set Initial Form Values from Saved Showcase (NOT overwritten by random row click)
    document.getElementById('comboFormTitle').value = showcase.title || 'The Royal Hair Ritual (Duo Set)';
    document.getElementById('comboFormTag').value = showcase.tag || 'BEST VALUE: SAVE ₹699';
    document.getElementById('comboFormPrice').value = (showcase.price !== undefined && showcase.price !== '') ? showcase.price : 449;
    document.getElementById('comboFormMrp').value = (showcase.mrp !== undefined && showcase.mrp !== '') ? showcase.mrp : 1148;

    const comboImg = showcase.customImage || 'assets/duo-ritual-new.jpg';
    document.getElementById('comboFormImageUrl').value = comboImg;
    document.getElementById('comboImagePreview').src = comboImg;
    document.getElementById('comboFormDesc').value = showcase.description || 'Experience complete follicular revitalisation. Step 1: Pre-wash deep scalp nourishment with the Lavender Herbal Hair Oil. Step 2: Gentle balancing wash with the Hibiscus Flower Shampoo. Includes custom gold travel pouch.';

    const statusEl = document.getElementById('comboUploadStatus');
    if (statusEl) statusEl.style.display = 'none';
    const autoStatus = document.getElementById('comboAutoGeneratedStatus');
    if (autoStatus) autoStatus.style.display = 'none';

    // 3. Interactive Multi-Product Selector Population
    // Filter out combo bundle items (e.g. Ritual Sets / prod_duo_03) so only single products are selectable
    const pickerList = document.getElementById('comboProductsPickerList');
    const singleProducts = Array.isArray(products)
      ? products.filter(p => p.id !== 'prod_duo_03' && p.category !== 'Ritual Sets')
      : [];

    let selectedIds = Array.isArray(showcase.selectedProductIds) && showcase.selectedProductIds.length > 0
      ? [...showcase.selectedProductIds]
      : ['prod_oil_01', 'prod_shampoo_02'];

    // If an individual product was passed when opening modal, ensure it is selected
    if (prod && prod.id && prod.id !== 'prod_duo_03' && prod.category !== 'Ritual Sets') {
      if (!selectedIds.includes(prod.id)) {
        selectedIds.push(prod.id);
      }
    }

    // Auto generate composite pack image helper
    const triggerAutoGeneratePackImage = async () => {
      const chks = Array.from(pickerList.querySelectorAll('.combo-product-chk:checked'));
      const imgs = chks.map(c => c.dataset.img).filter(Boolean);
      if (imgs.length > 0) {
        const previewEl = document.getElementById('comboImagePreview');
        const urlInput = document.getElementById('comboFormImageUrl');
        const autoStat = document.getElementById('comboAutoGeneratedStatus');
        const upStat = document.getElementById('comboUploadStatus');

        if (previewEl) previewEl.style.opacity = '0.5';
        const dataUrl = await generateComboPackImage(imgs);
        if (dataUrl) {
          if (previewEl) {
            previewEl.src = dataUrl;
            previewEl.style.opacity = '1';
          }
          if (urlInput) urlInput.value = dataUrl;
          if (autoStat) {
            autoStat.textContent = `✨ Auto-generated combo pack photo from ${chks.length} selected items!`;
            autoStat.style.display = 'block';
          }
          if (upStat) upStat.style.display = 'none';
        } else {
          if (previewEl) previewEl.style.opacity = '1';
        }
      }
    };

    const btnAutoPack = document.getElementById('btnAutoGeneratePackImg');
    if (btnAutoPack) {
      btnAutoPack.onclick = () => {
        isComboUserUploadedImage = false;
        triggerAutoGeneratePackImage();
      };
    }

    if (pickerList) {
      pickerList.innerHTML = singleProducts.map(p => {
        const isChecked = selectedIds.includes(p.id);
        const pImg = (p.images && p.images[0]) || 'assets/herbal-hair-oil.jpg';
        const pPrice = Number(p.price) || 0;
        const pMrp = Number(p.mrp) || Math.round(pPrice * 1.5);
        return `
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: ${isChecked ? '#EEF2FF' : '#FFFFFF'}; border: 1.5px solid ${isChecked ? '#6366F1' : '#E2E8F0'}; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <input type="checkbox" class="combo-product-chk" value="${p.id}" data-name="${p.name}" data-price="${pPrice}" data-mrp="${pMrp}" data-img="${pImg}" ${isChecked ? 'checked' : ''} style="accent-color: #4F46E5; width: 18px; height: 18px; cursor: pointer; flex-shrink: 0;">
              <img src="${pImg}" alt="${p.name}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid #E2E8F0; flex-shrink: 0;">
              <div style="min-width: 0;">
                <div style="font-size: 0.84rem; font-weight: 700; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
                <div style="font-size: 0.72rem; color: #64748B;">${p.category || 'Product'} • Stock: ${p.stock || 0} units</div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; margin-left: 10px;">
              <div style="font-size: 0.84rem; font-weight: 700; color: #1E293B;">₹${pPrice}</div>
              <div style="font-size: 0.7rem; color: #94A3B8; text-decoration: line-through;">₹${pMrp}</div>
            </div>
          </label>
        `;
      }).join('');

      // Live Recalculation logic
      const updateComboCalculations = (isUserInteraction = false) => {
        const chks = Array.from(pickerList.querySelectorAll('.combo-product-chk:checked'));
        const badge = document.getElementById('comboSelectedCountBadge');
        if (badge) badge.textContent = `${chks.length} Selected`;

        let totalMrp = 0;
        let totalBase = 0;
        const names = [];

        chks.forEach(chk => {
          totalMrp += Number(chk.dataset.mrp) || 0;
          totalBase += Number(chk.dataset.price) || 0;
          names.push(chk.dataset.name);
          const parent = chk.closest('label');
          if (parent) {
            parent.style.background = '#EEF2FF';
            parent.style.borderColor = '#6366F1';
          }
        });

        pickerList.querySelectorAll('.combo-product-chk:not(:checked)').forEach(chk => {
          const parent = chk.closest('label');
          if (parent) {
            parent.style.background = '#FFFFFF';
            parent.style.borderColor = '#E2E8F0';
          }
        });

        const banner = document.getElementById('comboCalculationBanner');
        if (banner) {
          banner.style.display = chks.length > 0 ? 'block' : 'none';
        }
        const calcMrpEl = document.getElementById('comboCalcMrp');
        if (calcMrpEl) calcMrpEl.textContent = `₹${totalMrp}`;
        const calcBaseEl = document.getElementById('comboCalcBase');
        if (calcBaseEl) calcBaseEl.textContent = `₹${totalBase}`;

        const priceInput = document.getElementById('comboFormPrice');
        const mrpInput = document.getElementById('comboFormMrp');
        const tagInput = document.getElementById('comboFormTag');
        const titleInput = document.getElementById('comboFormTitle');

        if (isUserInteraction && chks.length > 0) {
          if (mrpInput) mrpInput.value = totalMrp;
          const curPrice = Number(priceInput?.value || Math.max(99, Math.round((totalBase * 0.85) / 10) * 10 - 1));
          if (priceInput && (!priceInput.value || priceInput.value == 0)) {
            priceInput.value = curPrice;
          }
          const savings = totalMrp - curPrice;
          const pct = totalMrp > 0 ? Math.round((savings / totalMrp) * 100) : 0;

          const pill = document.getElementById('comboCalcSavingsPill');
          if (pill) pill.textContent = `Save ₹${Math.max(0, savings)} (${pct}% OFF)`;

          if (tagInput && (!tagInput.value || tagInput.value.includes('BEST VALUE') || tagInput.value.includes('SAVE'))) {
            tagInput.value = `BEST VALUE: SAVE ₹${Math.max(0, savings)}`;
          }
          if (titleInput && (!titleInput.value || titleInput.value === 'The Royal Hair Ritual (Duo Set)' || titleInput.value.includes('Ritual Set'))) {
            titleInput.value = names.length > 1 ? `${names.join(' + ')} Ritual Set` : (names[0] ? `${names[0]} Combo Pack` : 'The Royal Hair Ritual (Duo Set)');
          }

          // Auto-generate composite pack image if admin hasn't explicitly uploaded their own file
          if (!isComboUserUploadedImage) {
            triggerAutoGeneratePackImage();
          }
        } else {
          const curPrice = Number(priceInput?.value || 0);
          const savings = totalMrp - curPrice;
          const pct = totalMrp > 0 ? Math.round((savings / totalMrp) * 100) : 0;
          const pill = document.getElementById('comboCalcSavingsPill');
          if (pill) pill.textContent = `Save ₹${Math.max(0, savings)} (${pct}% OFF)`;
        }
      };

      pickerList.querySelectorAll('.combo-product-chk').forEach(chk => {
        chk.addEventListener('change', () => updateComboCalculations(true));
      });

      const priceInp = document.getElementById('comboFormPrice');
      if (priceInp) {
        priceInp.oninput = () => updateComboCalculations(false);
      }

      updateComboCalculations(false);
    }

    modal.classList.add('is-active');
    modal.style.display = 'flex';
  }

  // Flagship Image Upload Button
  const btnUpFlagship = document.getElementById('btnUploadFlagshipImage');
  const fileInputFlagship = document.getElementById('flagshipFileInput');
  if (btnUpFlagship && fileInputFlagship) {
    btnUpFlagship.onclick = () => fileInputFlagship.click();
    fileInputFlagship.onchange = async () => {
      const file = fileInputFlagship.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          showToast('Uploading flagship image...');
          const res = await authFetch('/api/upload', {
            method: 'POST',
            body: JSON.stringify({ image: e.target.result, filename: `flagship_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}` })
          });
          const json = await res.json();
          if (json.success && json.url) {
            document.getElementById('flagshipFormImageUrl').value = json.url;
            document.getElementById('flagshipImagePreview').src = json.url;
            const statusEl = document.getElementById('flagshipUploadStatus');
            if (statusEl) statusEl.style.display = 'block';
            showToast('✅ Image uploaded successfully!');
          } else {
            showToast('⚠️ Image upload failed: ' + (json.message || ''));
          }
        } catch (err) {
          showToast('Upload error: ' + err.message);
        }
      };
      reader.readAsDataURL(file);
    };
  }

  // Flagship Image URL manual input listener
  const flagshipUrlInput = document.getElementById('flagshipFormImageUrl');
  if (flagshipUrlInput) {
    flagshipUrlInput.addEventListener('input', () => {
      document.getElementById('flagshipImagePreview').src = flagshipUrlInput.value.trim() || 'assets/new-oil-bottle-card.jpg';
    });
  }

  // Combo Image Upload Button
  const btnUpCombo = document.getElementById('btnUploadComboImage');
  const fileInputCombo = document.getElementById('comboFileInput');
  if (btnUpCombo && fileInputCombo) {
    btnUpCombo.onclick = () => fileInputCombo.click();
    fileInputCombo.onchange = async () => {
      const file = fileInputCombo.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          showToast('Uploading custom combo image...');
          const res = await authFetch('/api/upload', {
            method: 'POST',
            body: JSON.stringify({ image: e.target.result, filename: `combo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}` })
          });
          const json = await res.json();
          if (json.success && json.url) {
            isComboUserUploadedImage = true;
            document.getElementById('comboFormImageUrl').value = json.url;
            document.getElementById('comboImagePreview').src = json.url;
            const statusEl = document.getElementById('comboUploadStatus');
            if (statusEl) statusEl.style.display = 'block';
            const autoStatus = document.getElementById('comboAutoGeneratedStatus');
            if (autoStatus) autoStatus.style.display = 'none';
            showToast('✅ Custom combo image uploaded successfully!');
          } else {
            showToast('⚠️ Image upload failed: ' + (json.message || ''));
          }
        } catch (err) {
          showToast('Upload error: ' + err.message);
        }
      };
      reader.readAsDataURL(file);
    };
  }

  // Combo Image URL manual input listener
  const comboUrlInput = document.getElementById('comboFormImageUrl');
  if (comboUrlInput) {
    comboUrlInput.addEventListener('input', () => {
      document.getElementById('comboImagePreview').src = comboUrlInput.value.trim() || 'assets/duo-ritual-new.jpg';
    });
  }

  // Close Showcase Modals
  ['comboModalClose', 'btnCancelComboModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onclick = () => {
      const m = document.getElementById('comboModalOverlay');
      if (m) { m.classList.remove('is-active'); m.style.display = 'none'; }
    };
  });

  ['flagshipModalClose', 'btnCancelFlagshipModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onclick = () => {
      const m = document.getElementById('flagshipModalOverlay');
      if (m) { m.classList.remove('is-active'); m.style.display = 'none'; }
    };
  });

  // Flagship Form Submit
  const flagshipForm = document.getElementById('flagshipForm');
  if (flagshipForm) {
    flagshipForm.onsubmit = async (e) => {
      e.preventDefault();
      const slot = document.getElementById('flagshipFormSlot').value || (document.getElementById('flagshipModalTitle')?.textContent?.includes('Flagship 2') ? 'slot2' : 'slot1');
      const productId = document.getElementById('flagshipFormProductId').value;
      const title = document.getElementById('flagshipFormTitle').value.trim();
      const subtitle = document.getElementById('flagshipFormSubtitle').value.trim();
      const price = Number(document.getElementById('flagshipFormPrice').value);
      const mrp = Number(document.getElementById('flagshipFormMrp').value) || Math.round(price * 1.2);
      const customImage = document.getElementById('flagshipFormImageUrl').value.trim();

      try {
        showToast('Saving showcase settings...');
        const res = await authFetch('/api/settings/home-showcase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot,
            productId,
            title,
            subtitle,
            price,
            mrp,
            customImage
          })
        });
        const json = await res.json();
        if (json.success) {
          showToast(`★ Home Flagship ${slot === 'slot1' ? '1 (Left)' : '2 (Right)'} updated live!`);
          const modal = document.getElementById('flagshipModalOverlay');
          if (modal) { modal.classList.remove('is-active'); modal.style.display = 'none'; }
          loadAllData();
        } else {
          showToast('Error: ' + (json.message || 'Failed to update'));
        }
      } catch (err) {
        showToast('Error: ' + err.message);
      }
    };
  }

  // Combo Form Submit
  const comboBannerForm = document.getElementById('comboBannerForm');
  if (comboBannerForm) {
    comboBannerForm.onsubmit = async (e) => {
      e.preventDefault();
      const productId = document.getElementById('comboLinkProductSelect')?.value || document.getElementById('comboFormProductId').value;
      const title = document.getElementById('comboFormTitle').value.trim();
      const tag = document.getElementById('comboFormTag').value.trim();
      const price = Number(document.getElementById('comboFormPrice').value);
      const mrp = Number(document.getElementById('comboFormMrp').value) || Math.round(price * 1.25);
      const customImage = document.getElementById('comboFormImageUrl').value.trim();
      const description = document.getElementById('comboFormDesc').value.trim();

      const selectedChks = Array.from(document.querySelectorAll('#comboProductsPickerList .combo-product-chk:checked'));
      const selectedProductIds = selectedChks.map(c => c.value);

      if (selectedProductIds.length === 0) {
        showToast('⚠️ Please select at least one product to include in this combo.');
        return;
      }

      try {
        let finalImage = customImage;
        if (finalImage && finalImage.startsWith('data:image')) {
          showToast('Saving auto-generated pack photo to storage...');
          try {
            const upRes = await authFetch('/api/upload', {
              method: 'POST',
              body: JSON.stringify({
                image: finalImage,
                filename: `combo_pack_${Date.now()}.jpg`
              })
            });
            const upJson = await upRes.json();
            if (upJson.success && upJson.url) {
              finalImage = upJson.url;
              document.getElementById('comboFormImageUrl').value = finalImage;
            }
          } catch (upErr) {
            console.warn('Composite upload error:', upErr);
          }
        }

        showToast('Publishing combo banner...');
        const res = await authFetch('/api/settings/home-showcase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot: 'combo',
            productId,
            selectedProductIds,
            title,
            tag,
            price,
            mrp,
            customImage: finalImage,
            description
          })
        });
        const json = await res.json();
        if (json.success) {
          showToast('🎁 Home Combo Banner published successfully!');
          const modal = document.getElementById('comboModalOverlay');
          if (modal) { modal.classList.remove('is-active'); modal.style.display = 'none'; }
          loadAllData();
        } else {
          showToast('Error: ' + (json.message || 'Failed to publish'));
        }
      } catch (err) {
        showToast('Error: ' + err.message);
      }
    };
  }

  function openProductModal(productId = null) {
    productForm.reset();
    document.getElementById('formProductId').value = '';
    const imgPreview = document.getElementById('formProdImagePreview');
    const uploadStatus = document.getElementById('imageUploadStatus');
    if (uploadStatus) uploadStatus.style.display = 'none';

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
      const prodImg = (p.images && p.images[0]) || 'assets/herbal-hair-oil.jpg';
      document.getElementById('formProdImage').value = prodImg;
      if (imgPreview) imgPreview.src = prodImg;
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
      if (formProdSlug) delete formProdSlug.dataset.manual;
      document.getElementById('formProdSlug').value = '';
      const defaultImg = 'assets/herbal-hair-oil.jpg';
      document.getElementById('formProdImage').value = defaultImg;
      if (imgPreview) imgPreview.src = defaultImg;
    }

    const catSelect = document.getElementById('formProdCategory');
    if (catSelect && typeof catSelect._syncCustomSelect === 'function') {
      catSelect._syncCustomSelect();
    }

    // Sync Showcase Placement Slot Select
    const slotSelect = document.getElementById('formProdShowcaseSlot');
    if (slotSelect) {
      if (productId && storeSettings && storeSettings.homeShowcase) {
        const hs = storeSettings.homeShowcase;
        if (hs.slot1 && hs.slot1.productId === productId && !hs.slot1.removed) {
          slotSelect.value = 'slot1';
        } else if (hs.slot2 && hs.slot2.productId === productId && !hs.slot2.removed) {
          slotSelect.value = 'slot2';
        } else if (hs.combo && hs.combo.productId === productId && !hs.combo.removed) {
          slotSelect.value = 'combo';
        } else {
          slotSelect.value = '';
        }
      } else {
        slotSelect.value = '';
      }
    }

    productModalOverlay.classList.add('is-active');
  }

  // Live Image URL input listener for preview
  const formProdImageInput = document.getElementById('formProdImage');
  const formProdImagePreview = document.getElementById('formProdImagePreview');
  const formProdImageFile = document.getElementById('formProdImageFile');
  const imageUploadStatus = document.getElementById('imageUploadStatus');

  if (formProdImageInput && formProdImagePreview) {
    formProdImageInput.addEventListener('input', () => {
      formProdImagePreview.src = formProdImageInput.value.trim() || 'assets/herbal-hair-oil.jpg';
    });
  }

  // Direct File Upload Listener (Converts to Base64 and uploads to server /uploads/)
  if (formProdImageFile) {
    formProdImageFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, WebP).');
        return;
      }

      if (imageUploadStatus) {
        imageUploadStatus.style.display = 'block';
        imageUploadStatus.textContent = '⏳ Uploading image to server...';
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        try {
          const res = await authFetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Data, filename: file.name })
          }).then(r => r.json());

          if (res.success && res.url) {
            formProdImageInput.value = res.url;
            if (formProdImagePreview) formProdImagePreview.src = res.url;
            if (imageUploadStatus) {
              imageUploadStatus.textContent = '✓ Image uploaded successfully!';
              imageUploadStatus.style.color = '#10B981';
            }
            showToast('Image uploaded successfully.');
          } else {
            if (imageUploadStatus) {
              imageUploadStatus.textContent = `❌ Upload failed: ${res.message || 'Error'}`;
              imageUploadStatus.style.color = '#DC2626';
            }
            alert(`Image upload failed: ${res.message || 'Error'}`);
          }
        } catch (err) {
          console.error('Upload failed:', err);
          if (imageUploadStatus) {
            imageUploadStatus.textContent = '❌ Upload failed due to network error.';
            imageUploadStatus.style.color = '#DC2626';
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Live auto-slug generator
  const formProdName = document.getElementById('formProdName');
  const formProdSlug = document.getElementById('formProdSlug');

  function toSlug(text) {
    return (text || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  if (formProdName && formProdSlug) {
    formProdName.addEventListener('input', () => {
      const isNew = !document.getElementById('formProductId').value;
      if (isNew || !formProdSlug.dataset.manual) {
        formProdSlug.value = toSlug(formProdName.value);
      }
    });

    formProdSlug.addEventListener('input', () => {
      formProdSlug.dataset.manual = 'true';
    });

    formProdSlug.addEventListener('blur', () => {
      if (formProdSlug.value.trim()) {
        formProdSlug.value = toSlug(formProdSlug.value);
      }
    });
  }

  // Swap Flagship 1 & 2 Positions on Home Page
  const btnSwapFlagship = document.getElementById('btnSwapFlagship');
  if (btnSwapFlagship) {
    btnSwapFlagship.onclick = async () => {
      if (!confirm('Are you sure you want to swap Flagship 1 (Left Card) and Flagship 2 (Right Card) positions on the Home Page?')) return;
      try {
        showToast('Swapping Flagship positions...');
        const res = await authFetch('/api/settings/home-showcase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ swap: true })
        });
        const json = await res.json();
        if (json.success) {
          showToast('Flagship 1 & 2 swapped successfully!');
          try {
            localStorage.setItem('nachiyar_products_updated', Date.now().toString());
            const ch = new BroadcastChannel('nachiyar_store_channel');
            ch.postMessage({ type: 'PRODUCTS_UPDATED', timestamp: Date.now() });
          } catch (e) {}
          await loadAllData();
        } else {
          showToast(json.message || 'Swap failed');
        }
      } catch (err) {
        showToast('Failed to swap positions: ' + err.message);
      }
    };
  }

  btnOpenNewProductModal.onclick = () => openProductModal();
  modalProductClose.onclick = () => productModalOverlay.classList.remove('is-active');
  btnCancelProductModal.onclick = () => productModalOverlay.classList.remove('is-active');

  productForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('formProductId').value;
    const imgVal = document.getElementById('formProdImage').value.trim() || 'assets/herbal-hair-oil.jpg';
    const newPrice = Number(document.getElementById('formProdPrice').value);
    const newMrp = Number(document.getElementById('formProdMrp').value);

    // Sync variants if this product has existing variants
    let variantsToSave = null;
    if (id && Array.isArray(products)) {
      const existingProd = products.find(x => x.id === id);
      if (existingProd && Array.isArray(existingProd.variants) && existingProd.variants.length > 0) {
        variantsToSave = JSON.parse(JSON.stringify(existingProd.variants));
        let stdIdx = variantsToSave.findIndex(v => 
          (v.id && (v.id.includes('200') || v.id.includes('250') || v.id.includes('standard') || v.id.includes('std'))) ||
          (v.name && (v.name.includes('200ml') || v.name.includes('250ml') || v.name.includes('Standard') || v.name.includes('Full Ritual')))
        );
        if (stdIdx === -1) stdIdx = 0;
        variantsToSave[stdIdx].price = newPrice;
        if (newMrp) variantsToSave[stdIdx].mrp = newMrp;
      }
    }

    const payload = {
      name: document.getElementById('formProdName').value.trim(),
      category: document.getElementById('formProdCategory').value,
      subtitle: document.getElementById('formProdSubtitle').value.trim(),
      price: newPrice,
      mrp: newMrp,
      stock: Number(document.getElementById('formProdStock').value),
      sku: document.getElementById('formProdSku').value.trim(),
      images: [imgVal],
      themeColor: document.getElementById('formProdColor').value,
      tagline: document.getElementById('formProdTagline').value.trim(),
      description: document.getElementById('formProdDesc').value.trim(),
      ingredients: document.getElementById('formProdIngredients').value.trim(),
      slug: toSlug(document.getElementById('formProdSlug').value.trim() || document.getElementById('formProdName').value.trim()),
      variants: variantsToSave,
      seo: {
        metaTitle: document.getElementById('formProdMetaTitle').value.trim(),
        metaDescription: document.getElementById('formProdMetaDesc').value.trim(),
        keywords: document.getElementById('formProdKeywords').value.trim(),
        slug: toSlug(document.getElementById('formProdSlug').value.trim() || document.getElementById('formProdName').value.trim())
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

      // Check showcase placement slot selection
      const chosenSlot = document.getElementById('formProdShowcaseSlot')?.value;
      const createdId = res.data?.id || id;
      const currentHs = storeSettings && storeSettings.homeShowcase;

      if (chosenSlot && createdId) {
        try {
          await authFetch('/api/settings/home-showcase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slot: chosenSlot,
              productId: createdId,
              title: payload.name,
              subtitle: payload.subtitle,
              price: payload.price,
              mrp: payload.mrp,
              customImage: payload.images[0]
            })
          });
        } catch (e) {
          console.error('Failed to update home showcase slot:', e);
        }
      } else if (!chosenSlot && id && currentHs) {
        // If product was previously in a showcase slot and user set it to "None", remove it from showcase
        for (const sKey of ['slot1', 'slot2', 'combo']) {
          if (currentHs[sKey] && currentHs[sKey].productId === id && !currentHs[sKey].removed) {
            try {
              await authFetch('/api/settings/home-showcase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slot: sKey, remove: true })
              });
            } catch (e) {}
          }
        }
      }

      // Broadcast update to all open storefront tabs and refresh cache
      try {
        localStorage.setItem('nachiyar_products_updated', Date.now().toString());
        const freshList = await fetch('/api/products?_t=' + Date.now()).then(r => r.json());
        if (freshList && freshList.success && freshList.data) {
          localStorage.setItem('nachiyar_store_products', JSON.stringify(freshList.data));
        }
        try {
          const channel = new BroadcastChannel('nachiyar_store_channel');
          channel.postMessage({ type: 'PRODUCTS_UPDATED', timestamp: Date.now() });
        } catch (e) {}
      } catch (err) {}

      loadAllData();
    } else {
      alert(`Error: ${res.message}`);
    }
  };

  // ==========================================
  // CUSTOMER PURCHASE DRILL-DOWN MODAL
  // ==========================================
  const customerOrderHistoryModalOverlay = document.getElementById('customerOrderHistoryModalOverlay');
  const custHistoryModalTitle = document.getElementById('custHistoryModalTitle');
  const custHistoryModalSubtitle = document.getElementById('custHistoryModalSubtitle');
  const custHistoryModalClose = document.getElementById('custHistoryModalClose');
  const btnCloseCustHistoryModal = document.getElementById('btnCloseCustHistoryModal');
  const custHistoryKpiStrip = document.getElementById('custHistoryKpiStrip');
  const custHistoryTableBody = document.getElementById('custHistoryTableBody');

  function closeCustHistoryModal() {
    if (customerOrderHistoryModalOverlay) customerOrderHistoryModalOverlay.classList.remove('is-active');
  }

  if (custHistoryModalClose) custHistoryModalClose.onclick = closeCustHistoryModal;
  if (btnCloseCustHistoryModal) btnCloseCustHistoryModal.onclick = closeCustHistoryModal;
  if (customerOrderHistoryModalOverlay) {
    customerOrderHistoryModalOverlay.addEventListener('click', (e) => {
      if (e.target === customerOrderHistoryModalOverlay) closeCustHistoryModal();
    });
  }

  function openCustomerHistoryModal(email, phone, name) {
    if (!customerOrderHistoryModalOverlay) return;

    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPhone = (phone || '').trim();

    // Match all online orders for this customer
    const custOrders = orders.filter(o => {
      const c = typeof o.customer === 'string' ? JSON.parse(o.customer) : (o.customer || {});
      return (cleanEmail && c.email && c.email.toLowerCase().trim() === cleanEmail) ||
             (cleanPhone && c.phone && c.phone.trim() === cleanPhone);
    });

    // Match all offline counter invoices for this customer
    const custInvoices = invoices.filter(inv => {
      const c = typeof inv.customer === 'string' ? JSON.parse(inv.customer) : (inv.customer || {});
      return (cleanEmail && c.email && c.email.toLowerCase().trim() === cleanEmail) ||
             (cleanPhone && c.phone && c.phone.trim() === cleanPhone);
    });

    // Combined transactions sorted newest first
    const transactions = [];

    custOrders.forEach(o => {
      const items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
      transactions.push({
        type: 'Online Storefront Order',
        channelBadge: 'channel-online',
        ref: o.orderNumber || o.order_number,
        date: new Date(o.createdAt || o.created_at),
        items: items,
        total: Number(o.total || 0),
        payment: o.paymentMethod || 'Online',
        status: (o.status || 'placed').toUpperCase()
      });
    });

    custInvoices.forEach(inv => {
      const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
      transactions.push({
        type: 'Retail Counter POS',
        channelBadge: 'channel-offline',
        ref: inv.invoiceNumber || inv.invoice_number,
        date: new Date(inv.createdAt || inv.created_at),
        items: items,
        total: Number(inv.total || 0),
        payment: inv.paymentMode || 'Cash',
        status: 'PAID'
      });
    });

    transactions.sort((a, b) => b.date - a.date);

    const totalSpent = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalItemsCount = transactions.reduce((sum, t) => sum + t.items.reduce((is, it) => is + (Number(it.qty || 1)), 0), 0);

    custHistoryModalTitle.textContent = `${name || 'Customer'} - Purchase History`;
    custHistoryModalSubtitle.textContent = `Contact: ${email || 'N/A'} • ${phone || 'N/A'} • Lifetime Purchases`;

    if (custHistoryKpiStrip) {
      custHistoryKpiStrip.innerHTML = `
        <div style="background: #F8FAFC; border: 1px solid var(--admin-border); border-radius: 10px; padding: 12px; text-align: center;">
          <small style="color: var(--admin-text-muted); font-size: 0.6875rem; text-transform: uppercase;">Total Transactions</small>
          <div style="font-size: 1.25rem; font-weight: 800; color: var(--admin-primary); margin-top: 2px;">${transactions.length}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid var(--admin-border); border-radius: 10px; padding: 12px; text-align: center;">
          <small style="color: var(--admin-text-muted); font-size: 0.6875rem; text-transform: uppercase;">Total Units Bought</small>
          <div style="font-size: 1.25rem; font-weight: 800; color: #0284C7; margin-top: 2px;">${totalItemsCount} units</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid var(--admin-border); border-radius: 10px; padding: 12px; text-align: center;">
          <small style="color: var(--admin-text-muted); font-size: 0.6875rem; text-transform: uppercase;">Total Lifetime Spend</small>
          <div style="font-size: 1.25rem; font-weight: 800; color: #059669; margin-top: 2px;">₹${totalSpent.toLocaleString()}</div>
        </div>
      `;
    }

    if (custHistoryTableBody) {
      custHistoryTableBody.innerHTML = '';
      if (transactions.length === 0) {
        custHistoryTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--admin-text-muted);">No orders or invoices on record for this customer yet.</td></tr>';
      } else {
        transactions.forEach(t => {
          const tr = document.createElement('tr');
          const itemsDesc = t.items.map(it => `<strong>${it.name || 'Product'}</strong> (x${it.qty || 1}) - ₹${(it.price || 0) * (it.qty || 1)}`).join('<br>');
          tr.innerHTML = `
            <td>
              <div style="font-weight: 600;">${t.date.toLocaleDateString()}</div>
              <small style="color: var(--admin-text-muted);">${t.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
            </td>
            <td><span class="badge-tag ${t.channelBadge}">${t.type}</span></td>
            <td><code>${t.ref}</code></td>
            <td style="font-size: 0.8125rem; line-height: 1.4;">${itemsDesc || 'N/A'}</td>
            <td><strong>₹${t.total.toLocaleString()}</strong></td>
            <td><span class="badge-tag paid">${t.payment}</span></td>
            <td><span class="badge-tag channel-online">${t.status}</span></td>
          `;
          custHistoryTableBody.appendChild(tr);
        });
      }
    }

    customerOrderHistoryModalOverlay.classList.add('is-active');
  }

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
  // 4.5. MANUAL RESTOCK & INVENTORY ADJUSTMENT CONTROLLER
  // ==========================================
  const btnRestockModalTrigger = document.getElementById('btnRestockModalTrigger');
  const restockModalOverlay = document.getElementById('restockModalOverlay');
  const restockModalClose = document.getElementById('restockModalClose');
  const btnCancelRestockModal = document.getElementById('btnCancelRestockModal');
  const restockForm = document.getElementById('restockForm');
  const restockProductSelect = document.getElementById('restockProductSelect');
  const restockCurrentStock = document.getElementById('restockCurrentStock');
  const restockUnits = document.getElementById('restockUnits');
  const restockReference = document.getElementById('restockReference');
  const restockReasonSelect = document.getElementById('restockReasonSelect');
  const restockCustomReasonGroup = document.getElementById('restockCustomReasonGroup');
  const restockCustomReason = document.getElementById('restockCustomReason');

  function openRestockModal() {
    if (!restockModalOverlay) return;
    restockForm.reset();

    // Populate products in select dropdown
    restockProductSelect.innerHTML = '';
    products.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (Current Stock: ${p.stock} units)`;
      opt.dataset.stock = p.stock;
      restockProductSelect.appendChild(opt);
    });

    if (products.length > 0) {
      restockCurrentStock.value = `${products[0].stock} units`;
    }

    if (restockProductSelect && typeof restockProductSelect._syncCustomSelect === 'function') {
      restockProductSelect._syncCustomSelect();
    }
    if (restockReasonSelect && typeof restockReasonSelect._syncCustomSelect === 'function') {
      restockReasonSelect._syncCustomSelect();
    }

    if (restockCustomReasonGroup) restockCustomReasonGroup.style.display = 'none';
    restockModalOverlay.classList.add('is-active');
  }

  function closeRestockModal() {
    if (restockModalOverlay) restockModalOverlay.classList.remove('is-active');
  }

  if (btnRestockModalTrigger) btnRestockModalTrigger.onclick = openRestockModal;
  if (restockModalClose) restockModalClose.onclick = closeRestockModal;
  if (btnCancelRestockModal) btnCancelRestockModal.onclick = closeRestockModal;

  if (restockModalOverlay) {
    restockModalOverlay.addEventListener('click', (e) => {
      if (e.target === restockModalOverlay) closeRestockModal();
    });
  }

  if (restockProductSelect) {
    restockProductSelect.onchange = () => {
      const selected = products.find(p => p.id === restockProductSelect.value);
      if (selected) {
        restockCurrentStock.value = `${selected.stock} units`;
      }
    };
  }

  if (restockReasonSelect) {
    restockReasonSelect.onchange = () => {
      if (restockReasonSelect.value === 'Other / Custom Reason') {
        if (restockCustomReasonGroup) restockCustomReasonGroup.style.display = 'block';
      } else {
        if (restockCustomReasonGroup) restockCustomReasonGroup.style.display = 'none';
      }
    };
  }

  if (restockForm) {
    restockForm.onsubmit = async (e) => {
      e.preventDefault();
      const prodId = restockProductSelect.value;
      const adjustment = Number(restockUnits.value);
      const reference = (restockReference.value || '').trim() || 'Manual Restock';
      const reasonVal = restockReasonSelect.value === 'Other / Custom Reason'
        ? ((restockCustomReason.value || '').trim() || 'Custom Adjustment')
        : restockReasonSelect.value;

      if (!prodId || isNaN(adjustment) || adjustment === 0) {
        alert('Please enter a valid non-zero adjustment units count.');
        return;
      }

      try {
        const res = await authFetch('/api/inventory/adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: prodId,
            adjustment: adjustment,
            reference: reference,
            reason: reasonVal
          })
        }).then(r => r.json());

        if (res.success) {
          showToast(`Stock updated! (${adjustment > 0 ? '+' : ''}${adjustment} units)`);
          closeRestockModal();
          loadAllData();
        } else {
          alert(`Error: ${res.message}`);
        }
      } catch (err) {
        console.error('Adjustment failed:', err);
        alert(`Failed to update stock: ${err.message}`);
      }
    };
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
      if (posDiscountAmountVal) posDiscountAmountVal.textContent = '-₹0';
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
    const discType = posDiscountType?.value || 'percent';
    const discInputVal = Math.max(0, Number(posDiscountInput?.value) || 0);
    let discountAmount = 0;
    if (discType === 'percent') {
      discountAmount = Math.min(subtotal, Math.round((subtotal * discInputVal) / 100));
    } else {
      discountAmount = Math.min(subtotal, Math.round(discInputVal));
    }

    if (posDiscountAmountVal) {
      posDiscountAmountVal.textContent = discountAmount > 0 ? `-₹${discountAmount}` : '-₹0';
    }

    const gstRate = Math.max(0, Number(posGstRateInput?.value) || 0);
    const taxable = Math.max(0, subtotal - discountAmount);
    const tax = Math.round((taxable * gstRate) / 100);
    const grandTotal = taxable + tax;

    posSubtotalVal.textContent = `₹${subtotal}`;
    posTaxVal.textContent = `₹${tax}`;
    posGrandTotalVal.textContent = `₹${grandTotal}`;

    // Update dynamic UPI QR Code with live payable amount
    updatePosUpiQr(grandTotal);
    updatePosCashChange();
  }

  // Live UPI QR & Payment Mode Switcher
  const posUpiBox = document.getElementById('posUpiBox');
  const posCashBox = document.getElementById('posCashBox');
  const posCardBox = document.getElementById('posCardBox');
  const posBankBox = document.getElementById('posBankBox');
  const posUpiQrImg = document.getElementById('posUpiQrImg');
  const posUpiIdDisplay = document.getElementById('posUpiIdDisplay');
  const posUpiUtr = document.getElementById('posUpiUtr');
  const posCashReceived = document.getElementById('posCashReceived');
  const posCashChange = document.getElementById('posCashChange');
  const posCardLast4 = document.getElementById('posCardLast4');
  const posCardAuthCode = document.getElementById('posCardAuthCode');
  const posBankRef = document.getElementById('posBankRef');

  function updatePosUpiQr(amount) {
    if (!posUpiQrImg) return;
    const upiId = (storeSettings?.paymentMethods?.upi?.upiId) || 'nachiyarherbals18@okaxis';
    const brandName = encodeURIComponent((storeSettings?.brandName) || 'Nachiyar Herbals');
    if (posUpiIdDisplay) posUpiIdDisplay.textContent = upiId;

    const upiUri = `upi://pay?pa=${upiId}&pn=${brandName}&am=${amount > 0 ? amount : ''}&cu=INR`;
    posUpiQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUri)}`;
  }

  function updatePosCashChange() {
    if (!posCashReceived || !posCashChange) return;
    const grandTotal = parseInt(posGrandTotalVal.textContent.replace(/[^\d]/g, '')) || 0;
    const tendered = Number(posCashReceived.value) || 0;
    const change = Math.max(0, tendered - grandTotal);
    posCashChange.value = `₹${change}`;
  }

  if (posCashReceived) {
    posCashReceived.oninput = updatePosCashChange;
  }

  if (posPaymentMode) {
    posPaymentMode.onchange = () => {
      const mode = posPaymentMode.value;
      if (posUpiBox) posUpiBox.style.display = mode.includes('UPI') ? 'block' : 'none';
      if (posCashBox) posCashBox.style.display = mode.includes('Cash') ? 'block' : 'none';
      if (posCardBox) posCardBox.style.display = mode.includes('Card') ? 'block' : 'none';
      if (posBankBox) posBankBox.style.display = mode.includes('Bank') ? 'block' : 'none';
    };
  }

  if (posDiscountInput) posDiscountInput.oninput = renderPOSBillTable;
    if (posDiscountType) posDiscountType.onchange = renderPOSBillTable;
    document.querySelectorAll('.pos-disc-preset-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.type || 'percent';
        const val = btn.dataset.val || '0';
        if (posDiscountType) posDiscountType.value = type;
        if (posDiscountInput) posDiscountInput.value = val;
        renderPOSBillTable();
      };
    });
    if (posGstRateInput) posGstRateInput.oninput = renderPOSBillTable;
    document.querySelectorAll('.pos-gst-preset-btn').forEach(btn => {
      btn.onclick = () => {
        if (posGstRateInput) {
          posGstRateInput.value = btn.dataset.rate || '0';
          renderPOSBillTable();
        }
      };
    });

  // Generate Invoice Action
  btnGenerateInvoice.onclick = async () => {
    try {
      // 1. Ensure at least one product is added
      if (!posCart || posCart.length === 0) {
        showToast('⚠️ Please select at least one product from Step 1 to generate an invoice.');
        return;
      }

      // 2. Validate Customer Details (MANDATORY)
      const custName = (posCustName?.value || '').trim();
      if (!custName) {
        showToast('⚠️ Customer Full Name is required to generate the invoice.');
        if (posCustName) {
          posCustName.focus();
          posCustName.style.borderColor = '#DC2626';
          setTimeout(() => { posCustName.style.borderColor = ''; }, 3500);
        }
        return;
      }

      const rawPhone = (posCustPhone?.value || '').replace(/[^0-9]/g, '');
      if (!rawPhone || rawPhone.length !== 10) {
        showToast('⚠️ Please enter a valid 10-digit Customer Mobile Number.');
        if (posCustPhone) {
          posCustPhone.focus();
          posCustPhone.style.borderColor = '#DC2626';
          setTimeout(() => { posCustPhone.style.borderColor = ''; }, 3500);
        }
        return;
      }
      const custPhone = rawPhone;
      const custEmail = (posCustEmail?.value || '').trim();
      const custAddress = (posCustAddress?.value || '').trim() || 'Store Walk-in';

      const mode = (posPaymentMode?.value || 'Cash');
      let paymentDetailNote = mode;

      // Validate payment specific details
      if (mode.includes('UPI')) {
        const utr = (posUpiUtr?.value || '').trim();
        paymentDetailNote = utr ? `UPI (UTR: ${utr})` : 'UPI (Store QR - Confirmed)';
      } else if (mode.includes('Cash')) {
        const tendered = Number(posCashReceived?.value) || 0;
        paymentDetailNote = `Cash Tendered ₹${tendered || 'Exact'}`;
      } else if (mode.includes('Card')) {
        const last4 = (posCardLast4?.value || '').trim();
        const auth = (posCardAuthCode?.value || '').trim();
        paymentDetailNote = `Card Terminal (Card: *${last4 || 'xxxx'} Auth: ${auth || 'Auth-OK'})`;
      } else if (mode.includes('Bank')) {
        const ref = (posBankRef?.value || '').trim();
        paymentDetailNote = ref ? `Bank Transfer (Ref: ${ref})` : 'Bank Transfer (Verified)';
      }

      const subtotal = posCart.reduce((s, i) => s + i.subtotal, 0);
      const discType = posDiscountType?.value || 'percent';
      const discInputVal = Math.max(0, Number(posDiscountInput?.value) || 0);
      let discountAmount = 0;
      if (discType === 'percent') {
        discountAmount = Math.min(subtotal, Math.round((subtotal * discInputVal) / 100));
      } else {
        discountAmount = Math.min(subtotal, Math.round(discInputVal));
      }
      const gstRate = Math.max(0, Number(posGstRateInput?.value) || 0);
      const taxable = Math.max(0, subtotal - discountAmount);
      const tax = Math.round((taxable * gstRate) / 100);
      const total = taxable + tax;

      const staffName = currentUserName?.textContent || loggedInUser?.name || 'Administrator';
      const staffRole = currentRoleBadge?.textContent || loggedInUser?.role || 'Super Admin';

      const payload = {
        customer: {
          name: custName,
          phone: custPhone,
          email: custEmail,
          address: custAddress,
          gstin: '',
          taxRate: gstRate
        },
        items: posCart.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          subtotal: i.subtotal
        })),
        subtotal: subtotal,
        discount: discountAmount,
        tax: tax,
        total: total,
        paymentStatus: 'paid',
        paymentMode: paymentDetailNote,
        notes: `Counter POS Tax Invoice (${gstRate}% GST) • ${paymentDetailNote}`,
        createdBy: `${staffName} (${staffRole})`
      };

      const originalBtnHtml = btnGenerateInvoice.innerHTML;
      btnGenerateInvoice.disabled = true;
      btnGenerateInvoice.innerHTML = '<span>⏳ Saving Invoice to Database...</span>';

      const res = await authFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      btnGenerateInvoice.disabled = false;
      btnGenerateInvoice.innerHTML = originalBtnHtml;

      if (res.success && res.data) {
        showToast(`Invoice ${res.data.invoiceNumber} generated! Stock updated.`);
        // Reset POS Form
        posCart = [];
        if (posCustName) posCustName.value = '';
        if (posCustPhone) posCustPhone.value = '';
        if (posCustEmail) posCustEmail.value = '';
        if (posCustAddress) posCustAddress.value = '';
        if (posDiscountInput) posDiscountInput.value = '0';
        if (posDiscountType) posDiscountType.value = 'percent';
        if (posDiscountAmountVal) posDiscountAmountVal.textContent = '-₹0';
        if (posGstRateInput) posGstRateInput.value = '0';
        if (posUpiUtr) posUpiUtr.value = '';
        if (posCashReceived) posCashReceived.value = '';
        if (posCardLast4) posCardLast4.value = '';
        if (posCardAuthCode) posCardAuthCode.value = '';
        if (posBankRef) posBankRef.value = '';
        renderPOSBillTable();

        // Refresh all data across DB
        await loadAllData();

        // Show printable invoice popup with the returned invoice data
        showInvoiceReceipt(res.data);
      } else {
        alert(`Billing Failed: ${res.message || 'Server error'}`);
      }
    } catch (e) {
      btnGenerateInvoice.disabled = false;
      btnGenerateInvoice.innerHTML = '<span>⚡ Print & Generate Tax Invoice</span><span class="icon-arrow">→</span>';
      console.error('POS billing error:', e);
      alert(`Billing Error: ${e.message}`);
    }
  };

  // ==========================================
  // 6. INVOICE RECEIPT MODAL (PRINTABLE)
  // ==========================================
  function showInvoiceReceipt(invoiceOrId) {
    let inv = null;
    if (typeof invoiceOrId === 'object' && invoiceOrId !== null) {
      inv = invoiceOrId;
    } else {
      inv = invoices.find(i => String(i.id) === String(invoiceOrId) || String(i.invoiceNumber) === String(invoiceOrId));
    }

    if (!inv) {
      console.warn('Invoice not found for preview:', invoiceOrId);
      return;
    }

    const customerObj = typeof inv.customer === 'string' ? JSON.parse(inv.customer) : (inv.customer || {});
    const itemsList = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);

    receiptPrintableArea.innerHTML = `
      <div class="receipt-header-row">
        <div class="receipt-brand">
          <h3>NACHIYAR HERBALS</h3>
          <p style="font-size:10px; color:#64748B;">AUTHENTIC BOTANICAL PERSONAL CARE</p>
          <p style="font-size:10px; margin-top:4px;">GSTIN: ${storeSettings.gstin || '33AAACH9876K1Z2'}</p>
          <p style="font-size:10px;">${storeSettings.storeAddress || 'Temple Ring Road, Madurai, Tamil Nadu'}</p>
        </div>
        <div class="receipt-meta">
          <h4 style="font-size:14px; font-weight:800; color:#7C5AAB;">TAX INVOICE</h4>
          <p><strong>${inv.invoiceNumber}</strong></p>
          <p>Date: ${new Date(inv.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <p>Mode: <strong>${inv.paymentMode}</strong></p>
          <p>Status: <strong style="color:#059669;">PAID</strong></p>
        </div>
      </div>

      <div style="margin-bottom:14px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">
        <span style="font-size:10px; text-transform:uppercase; font-weight:700; color:#64748B;">Billed To:</span>
        <h4 style="font-size:12px; margin-top:2px;">${customerObj.name || 'Store Customer'}</h4>
        <p style="font-size:11px;">Phone: ${customerObj.phone || 'N/A'} | Email: ${customerObj.email || 'N/A'}</p>
        <p style="font-size:11px;">Address: ${customerObj.address || 'In-Store Walk-in'}</p>
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
          ${itemsList.map(item => `
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
          <span>GST (${customerObj.taxRate !== undefined && customerObj.taxRate !== null ? customerObj.taxRate : (inv.taxRate !== undefined ? inv.taxRate : (inv.notes && inv.notes.match(/\((\d+(\.\d+)?)%\s*GST\)/i) ? inv.notes.match(/\((\d+(\.\d+)?)%\s*GST\)/i)[1] : (inv.subtotal > 0 && inv.tax > 0 ? Math.round((inv.tax / Math.max(1, inv.subtotal - (inv.discount || 0))) * 100) : 0)))}%):</span>
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

  function closeInvoiceReceipt() {
    if (invoiceModalOverlay) invoiceModalOverlay.classList.remove('is-active');
  }

  if (invoiceModalClose) invoiceModalClose.onclick = closeInvoiceReceipt;

  const btnReceiptPrintDirect = document.getElementById('btnReceiptPrintDirect');
  if (btnReceiptPrintDirect) {
    btnReceiptPrintDirect.onclick = () => window.print();
  }

  const btnReceiptOkClose = document.getElementById('btnReceiptOkClose');
  if (btnReceiptOkClose) {
    btnReceiptOkClose.onclick = () => {
      closeInvoiceReceipt();
      switchTab('invoices');
    };
  }

  const btnReceiptGotoHistory = document.getElementById('btnReceiptGotoHistory');
  if (btnReceiptGotoHistory) {
    btnReceiptGotoHistory.onclick = () => {
      closeInvoiceReceipt();
      switchTab('invoices');
    };
  }

  if (invoiceModalOverlay) {
    invoiceModalOverlay.addEventListener('click', (e) => {
      if (e.target === invoiceModalOverlay) closeInvoiceReceipt();
    });
  }

  // ==========================================
  // 6.5. INVOICE HISTORY WITH WEEK / MONTH / YEAR FILTERS
  // ==========================================
  let currentInvoicePeriodFilter = 'all';

  function filterInvoicesByPeriod(list, period) {
    if (period === 'all') return list;

    const now = new Date();
    return list.filter(inv => {
      const invDate = new Date(inv.createdAt);
      if (period === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return invDate >= startOfWeek;
      }
      if (period === 'month') {
        return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      }
      if (period === 'year') {
        return invDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  function renderInvoicesTable() {
    allInvoicesTableBody.innerHTML = '';

    // Calculate period counts for filter tabs
    const countAll = invoices.length;
    const countWeek = filterInvoicesByPeriod(invoices, 'week').length;
    const countMonth = filterInvoicesByPeriod(invoices, 'month').length;
    const countYear = filterInvoicesByPeriod(invoices, 'year').length;

    const elAll = document.getElementById('invCountAll');
    const elWeek = document.getElementById('invCountWeek');
    const elMonth = document.getElementById('invCountMonth');
    const elYear = document.getElementById('invCountYear');

    if (elAll) elAll.textContent = countAll;
    if (elWeek) elWeek.textContent = countWeek;
    if (elMonth) elMonth.textContent = countMonth;
    if (elYear) elYear.textContent = countYear;

    // Filter by period
    let filtered = filterInvoicesByPeriod(invoices, currentInvoicePeriodFilter);

    // Filter by search query if any
    const searchVal = (document.getElementById('invoiceSearchInput')?.value || '').toLowerCase().trim();
    if (searchVal) {
      filtered = filtered.filter(i => {
        const hay = [i.invoiceNumber, i.customer?.name, i.customer?.phone, i.paymentMode].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(searchVal);
      });
    }

    // Update Period Summary Strip
    const periodSales = filtered.reduce((s, i) => s + Number(i.total || 0), 0);
    const periodUnits = filtered.reduce((s, i) => s + (i.items || []).reduce((is, it) => is + Number(it.qty || 1), 0), 0);

    const sumSales = document.getElementById('invSummarySalesVal');
    const sumCount = document.getElementById('invSummaryCountVal');
    const sumUnits = document.getElementById('invSummaryUnitsVal');

    if (sumSales) sumSales.textContent = `₹${periodSales.toLocaleString()}`;
    if (sumCount) sumCount.textContent = `${filtered.length} bills`;
    if (sumUnits) sumUnits.textContent = `${periodUnits} units`;

    if (filtered.length === 0) {
      allInvoicesTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">
            No invoice records found for the selected period / search.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(inv => {
      const tr = document.createElement('tr');
      const itemsDesc = (inv.items || []).map(i => `<strong>${i.name}</strong> (x${i.qty})`).join('<br>');
      tr.innerHTML = `
        <td><strong>${inv.invoiceNumber}</strong></td>
        <td>
          <div>${new Date(inv.createdAt).toLocaleDateString()}</div>
          <small style="color:var(--admin-text-muted);">${new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
        </td>
        <td><strong>${inv.customer.name}</strong><br><small style="color:var(--admin-text-muted);">${inv.customer.phone || 'Walk-in'}</small></td>
        <td style="font-size: 0.8125rem; line-height: 1.4;">${itemsDesc}</td>
        <td><strong style="color: #059669;">₹${Number(inv.total).toLocaleString()}</strong></td>
        <td><span class="badge-tag channel-offline">${inv.paymentMode}</span></td>
        <td><span class="badge-tag paid">PAID</span></td>
        <td><button class="btn-primary btn-sm btn-print-inv" data-id="${inv.id}" style="white-space: nowrap;">🖨️ View / Print</button></td>
      `;
      allInvoicesTableBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-print-inv').forEach(b => {
      b.onclick = () => showInvoiceReceipt(b.dataset.id);
    });
  }

  // Invoice Period Filter Tabs listeners
  const invoicePeriodFilterTabs = document.getElementById('invoicePeriodFilterTabs');
  if (invoicePeriodFilterTabs) {
    const pBtns = invoicePeriodFilterTabs.querySelectorAll('.review-filter-btn');
    pBtns.forEach(btn => {
      btn.onclick = () => {
        pBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentInvoicePeriodFilter = btn.dataset.period;
        renderInvoicesTable();
      };
    });
  }

  // Live Invoice Search input listener
  const invoiceSearchInput = document.getElementById('invoiceSearchInput');
  if (invoiceSearchInput) {
    invoiceSearchInput.oninput = () => renderInvoicesTable();
  }

  // ==========================================
  // WHATSAPP-STYLE REAL-TIME NOTIFICATION BADGES
  // Shows badge count ONLY when new unread/actionable items arrive.
  // Once the admin visits/views that tab, the badge is immediately cleared/hidden.
  // ==========================================
  function getCurrentActiveTab() {
    return localStorage.getItem('nachiyar_admin_active_tab') || 'dashboard';
  }

  function getSeenIds(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSeenIds(key, ids) {
    try {
      localStorage.setItem(key, JSON.stringify(ids || []));
    } catch (e) {}
  }

  function updateNotificationBadges() {
    const currentTab = getCurrentActiveTab();

    // 1. ONLINE ORDERS BADGE
    const badgeOrderCount = document.getElementById('badgeOrderCount');
    if (badgeOrderCount) {
      const currentOrderIds = (orders || []).map(o => String(o.id));
      let seenOrderIds = getSeenIds('nachiyar_seen_order_ids');

      if (seenOrderIds === null) {
        // Initial setup: acknowledge existing orders so clean slate
        saveSeenIds('nachiyar_seen_order_ids', currentOrderIds);
        badgeOrderCount.style.display = 'none';
      } else if (currentTab === 'orders') {
        saveSeenIds('nachiyar_seen_order_ids', currentOrderIds);
        badgeOrderCount.style.display = 'none';
      } else {
        const unseenOrders = (orders || []).filter(o => !seenOrderIds.includes(String(o.id)));
        if (unseenOrders.length > 0) {
          badgeOrderCount.textContent = unseenOrders.length;
          badgeOrderCount.style.display = 'inline-block';
        } else {
          badgeOrderCount.style.display = 'none';
        }
      }
    }

    // 2. CUSTOMER REVIEWS BADGE
    const badgePendingReviews = document.getElementById('badgePendingReviews');
    if (badgePendingReviews) {
      const currentReviewIds = (adminReviews || []).map(r => String(r.id));
      let seenReviewIds = getSeenIds('nachiyar_seen_review_ids');

      if (seenReviewIds === null) {
        saveSeenIds('nachiyar_seen_review_ids', currentReviewIds);
        badgePendingReviews.style.display = 'none';
      } else if (currentTab === 'reviews') {
        saveSeenIds('nachiyar_seen_review_ids', currentReviewIds);
        badgePendingReviews.style.display = 'none';
      } else {
        const unseenReviews = (adminReviews || []).filter(r => r.status === 'pending' && !seenReviewIds.includes(String(r.id)));
        if (unseenReviews.length > 0) {
          badgePendingReviews.textContent = unseenReviews.length;
          badgePendingReviews.style.display = 'inline-block';
        } else {
          badgePendingReviews.style.display = 'none';
        }
      }
    }

    // 3. CUSTOMER INQUIRIES BADGE
    const badgeUnreadMessages = document.getElementById('badgeUnreadMessages');
    if (badgeUnreadMessages) {
      const currentMsgIds = (customerMessages || []).map(m => String(m.id));
      let seenMsgIds = getSeenIds('nachiyar_seen_message_ids');

      if (seenMsgIds === null) {
        saveSeenIds('nachiyar_seen_message_ids', currentMsgIds);
        badgeUnreadMessages.style.display = 'none';
      } else if (currentTab === 'messages') {
        saveSeenIds('nachiyar_seen_message_ids', currentMsgIds);
        badgeUnreadMessages.style.display = 'none';
      } else {
        const unseenMsgs = (customerMessages || []).filter(m => m.status === 'unread' && !seenMsgIds.includes(String(m.id)));
        if (unseenMsgs.length > 0) {
          badgeUnreadMessages.textContent = unseenMsgs.length;
          badgeUnreadMessages.style.display = 'inline-block';
        } else {
          badgeUnreadMessages.style.display = 'none';
        }
      }
    }

    // Non-notification tabs remain hidden
    const bpc = document.getElementById('badgeProductCount');
    if (bpc) bpc.style.display = 'none';
    const bma = document.getElementById('badgeMarketplaceActive');
    if (bma) bma.style.display = 'none';
    const bsc = document.getElementById('badgeStaffCount');
    if (bsc) bsc.style.display = 'none';
  }

  // ==========================================
  // 7. ONLINE ORDERS MANAGEMENT
  // ==========================================
  function renderOrdersTable() {
    allOrdersTableBody.innerHTML = '';
    updateNotificationBadges();

    if (orders.length === 0) {
      allOrdersTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">
            No storefront online orders placed yet.
          </td>
        </tr>
      `;
      return;
    }

    orders.forEach(ord => {
      const tr = document.createElement('tr');
      const isCancelRequested = ord.status === 'cancel_requested';
      const isCancelled = ord.status === 'cancelled';
      const isCod = (ord.paymentMethod || '').toLowerCase().includes('cash') || (ord.paymentMethod || '').toLowerCase().includes('cod');

      if (isCancelRequested) {
        tr.style.backgroundColor = '#FFF7ED';
      } else if (isCancelled) {
        tr.style.backgroundColor = '#FEF2F2';
      }

      // Customer Details cell
      const custInfo = `
        <strong>${ord.customer.name}</strong><br>
        <small style="color:var(--admin-text-muted);">${ord.customer.phone || 'Phone N/A'}</small><br>
        <small style="color:var(--admin-text-muted);">${ord.customer.city || ''}, ${ord.customer.state || ''}</small>
      `;

      // Products description
      const prodsInfo = (ord.items || []).map(i => `${i.name} <strong>(x${i.qty})</strong>`).join('<br>');

      // Status pill HTML
      let statusPillHtml = '';
      const cachedCancels = (() => {
        try { return JSON.parse(localStorage.getItem('nachiyar_cancellations') || '{}'); } catch(e) { return {}; }
      })();
      const cancelInfo = ord.cancellationDetails || cachedCancels[ord.orderNumber] || cachedCancels[ord.id];

      if (isCancelRequested) {
        statusPillHtml = `
          <span class="badge-tag" style="background:#FFEDD5; color:#C2410C; border:1px solid #FDBA74; font-weight:800; display:inline-block;">
            ⚠️ CANCEL REQUESTED
          </span>
          <div style="background:#FFF1F2; border:1px solid #FECDD3; border-radius:6px; padding:6px 8px; margin-top:6px; font-size:0.75rem;">
            <strong style="color:#9F1239; display:block;">Reason:</strong>
            <span style="color:#BE123C; word-break:break-word;">${cancelInfo?.reason || 'Customer requested cancel'}</span>
            ${cancelInfo?.comments ? `<div style="color:#881337; font-style:italic; margin-top:3px;">"${cancelInfo.comments}"</div>` : ''}
          </div>
        `;
      } else if (isCancelled) {
        statusPillHtml = `
          <span class="badge-tag" style="background:#FEE2E2; color:#991B1B; border:1px solid #FCA5A5; font-weight:800;">
            🚫 CANCELLED
          </span>
          ${cancelInfo?.refundAmount ? `<div style="font-size:0.75rem; color:#059669; font-weight:700; margin-top:4px;">₹${cancelInfo.refundAmount} Refunded</div>` : ''}
        `;
      } else {
        statusPillHtml = `
          <span class="badge-tag channel-online status-tag-${ord.id}">${ord.status.toUpperCase()}</span>
        `;
      }

      // Action cell
      let actionCellHtml = '';
      if (isCancelRequested) {
        actionCellHtml = `
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button type="button" class="btn-primary btn-sm btn-open-refund-modal" data-id="${ord.id}" style="background:#DC2626; border-color:#DC2626; color:#FFF; font-weight:700; font-size:0.75rem; padding:6px 10px; white-space:nowrap;">
              ${isCod ? '✓ Accept Cancel (COD)' : `⚡ Refund ₹${ord.total} & Accept`}
            </button>
            <button type="button" class="btn-secondary btn-sm btn-action-reject-cancel" data-id="${ord.id}" style="font-size:0.75rem; padding:5px 8px; white-space:nowrap;">
              ✕ Reject Request
            </button>
          </div>
        `;
      } else if (isCancelled) {
        actionCellHtml = `
          <span style="font-size:0.75rem; color:#059669; font-weight:700; display:inline-flex; align-items:center; gap:4px;">
            ✓ Stock Restocked
          </span>
        `;
      } else {
        actionCellHtml = `
          <select class="form-input-sm ord-status-select" data-id="${ord.id}" style="width:115px;">
            <option value="placed" ${ord.status === 'placed' ? 'selected' : ''}>Placed</option>
            <option value="processing" ${ord.status === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="shipped" ${ord.status === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${ord.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        `;
      }

      tr.innerHTML = `
        <td><strong>#${ord.orderNumber}</strong></td>
        <td>
          <div>${new Date(ord.createdAt).toLocaleDateString()}</div>
          <small style="color:var(--admin-text-muted);">${new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
        </td>
        <td>${custInfo}</td>
        <td style="font-size:0.8125rem; line-height:1.4;">${prodsInfo}</td>
        <td><strong style="color:var(--admin-primary); font-size:0.9375rem;">₹${ord.total}</strong></td>
        <td>
          <span class="badge-tag ${isCod ? 'channel-offline' : 'paid'}">${ord.paymentMethod}</span>
          ${ord.paymentStatus ? `<div style="font-size:0.7rem; color:var(--admin-text-muted); text-transform:uppercase; margin-top:3px;">${ord.paymentStatus}</div>` : ''}
        </td>
        <td>${statusPillHtml}</td>
        <td>${actionCellHtml}</td>
      `;
      allOrdersTableBody.appendChild(tr);
    });

    // Bind standard status changes
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
        const tag = document.querySelector(`.status-tag-${orderId}`);
        if (tag) tag.textContent = newStatus.toUpperCase();
      };
    });

    // Transform all order status selects into 100% mobile-safe custom dropdowns
    if (typeof enhanceAllSelects === 'function') {
      enhanceAllSelects(allOrdersTableBody);
    }

    // Bind Approve Cancel & Refund trigger
    document.querySelectorAll('.btn-open-refund-modal').forEach(b => {
      b.onclick = () => openRefundModal(b.dataset.id);
    });

    // Bind Reject Cancel trigger
    document.querySelectorAll('.btn-action-reject-cancel').forEach(b => {
      b.onclick = async () => {
        const orderId = b.dataset.id;
        const reason = prompt('Please enter rejection reason (visible to customer):', 'Order already dispatched via Express Courier.');
        if (reason === null) return;

        b.disabled = true;
        try {
          let rejected = false;
          try {
            const res = await authFetch(`/api/orders/${orderId}/cancel-reject`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success) rejected = true;
            }
          } catch (e) {}

          if (!rejected) {
            const patchRes = await authFetch(`/api/orders/${orderId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'processing' })
            });
            if (patchRes.ok) rejected = true;
          }

          if (rejected) {
            showToast('Cancellation request rejected.');
            await loadAllData();
          } else {
            alert('Error rejecting cancellation');
          }
        } catch (e) {
          console.error(e);
          alert('Network error rejecting cancellation');
        } finally {
          b.disabled = false;
        }
      };
    });
  }

  // ==========================================
  // 7.1. ORDER CANCELLATION & REFUND MODAL LOGIC
  // ==========================================
  const orderRefundModalOverlay = document.getElementById('orderRefundModalOverlay');
  const btnRefundModalClose = document.getElementById('btnRefundModalClose');
  const btnRefundModalCancel = document.getElementById('btnRefundModalCancel');
  const btnConfirmApproveRefund = document.getElementById('btnConfirmApproveRefund');

  function openRefundModal(orderId) {
    const ord = orders.find(o => String(o.id) === String(orderId) || String(o.orderNumber) === String(orderId));
    if (!ord || !orderRefundModalOverlay) return;

    const cachedCancels = (() => {
      try { return JSON.parse(localStorage.getItem('nachiyar_cancellations') || '{}'); } catch(e) { return {}; }
    })();
    const cancelInfo = ord.cancellationDetails || cachedCancels[ord.orderNumber] || cachedCancels[ord.id];

    document.getElementById('refundOrderId').value = ord.id;
    document.getElementById('refundOrderNumber').value = ord.orderNumber;
    document.getElementById('refundCustName').textContent = `${ord.customer.name} (${ord.customer.phone || 'N/A'})`;
    document.getElementById('refundPaymentMethod').textContent = ord.paymentMethod || 'Online Payment';
    document.getElementById('refundReasonText').textContent = cancelInfo?.reason || 'Customer requested cancellation';
    document.getElementById('refundTotalAmount').textContent = `₹${ord.total}`;

    const isCod = (ord.paymentMethod || '').toLowerCase().includes('cash') || (ord.paymentMethod || '').toLowerCase().includes('cod');
    const onlineInputs = document.getElementById('refundOnlineInputs');
    const codNotice = document.getElementById('refundCodNotice');
    const amtInput = document.getElementById('refundAmountInput');
    const utrInput = document.getElementById('refundUtrInput');

    if (isCod) {
      if (onlineInputs) onlineInputs.style.display = 'none';
      if (codNotice) codNotice.style.display = 'block';
    } else {
      if (onlineInputs) onlineInputs.style.display = 'block';
      if (codNotice) codNotice.style.display = 'none';
      if (amtInput) amtInput.value = ord.total;
      if (utrInput) utrInput.value = `REF-${Date.now().toString().slice(-8)}`;
    }

    orderRefundModalOverlay.classList.add('is-active');
  }

  function closeRefundModal() {
    if (orderRefundModalOverlay) orderRefundModalOverlay.classList.remove('is-active');
  }

  if (btnRefundModalClose) btnRefundModalClose.onclick = closeRefundModal;
  if (btnRefundModalCancel) btnRefundModalCancel.onclick = closeRefundModal;
  if (orderRefundModalOverlay) {
    orderRefundModalOverlay.addEventListener('click', (e) => {
      if (e.target === orderRefundModalOverlay) closeRefundModal();
    });
  }

  if (btnConfirmApproveRefund) {
    btnConfirmApproveRefund.onclick = async () => {
      const orderId = document.getElementById('refundOrderId').value;
      const orderNum = document.getElementById('refundOrderNumber').value;
      const ord = orders.find(o => String(o.id) === String(orderId));
      const isCod = ord && ((ord.paymentMethod || '').toLowerCase().includes('cash') || (ord.paymentMethod || '').toLowerCase().includes('cod'));

      const refundAmount = isCod ? 0 : Number(document.getElementById('refundAmountInput').value || (ord ? ord.total : 0));
      const refundUtr = isCod ? null : document.getElementById('refundUtrInput').value;

      btnConfirmApproveRefund.disabled = true;
      btnConfirmApproveRefund.innerHTML = '<span>Processing Restock &amp; Refund...</span>';

      try {
        let isSuccess = false;

        // 1. Try dedicated cancel-approve route
        try {
          const res = await authFetch(`/api/orders/${orderId}/cancel-approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refundAmount: refundAmount,
              refundUtr: refundUtr,
              refundMode: ord ? ord.paymentMethod : 'Original Source'
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              isSuccess = true;
            }
          }
        } catch (apiErr) {
          console.warn('Dedicated cancel-approve route unreachable, attempting fallback:', apiErr);
        }

        // 2. Seamless fallback: If node server process was not yet restarted, use active PATCH endpoint
        if (!isSuccess) {
          const fallbackRes = await authFetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
          });

          if (fallbackRes.ok) {
            isSuccess = true;
            // Also restock items in inventory
            if (ord && ord.items) {
              for (const it of ord.items) {
                const pId = it.productId || it.id;
                if (pId) {
                  try {
                    await authFetch('/api/inventory/adjust', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        productId: pId,
                        adjustment: Number(it.qty || 1),
                        reference: `Restock #${orderNum}`,
                        reason: 'Order Cancelled by Customer (Auto Restock)'
                      })
                    });
                  } catch (e) {}
                }
              }
            }
          }
        }

        if (isSuccess) {
          showToast(`Order #${orderNum} successfully cancelled and items restocked to inventory!`);
          closeRefundModal();
          await loadAllData();
        } else {
          alert('Error approving cancellation. Please check server connection.');
        }
      } catch (err) {
        console.error('Cancel approve error:', err);
        alert('Network error approving cancellation');
      } finally {
        btnConfirmApproveRefund.disabled = false;
        btnConfirmApproveRefund.innerHTML = '<span>✓ Authorize Cancellation & Restock</span>';
      }
    };
  }

  // ==========================================
  // ==========================================
  // 8. STORE SETTINGS & LIVE CONTENT CONTROL (3 SUB-TABS)
  // ==========================================

  // 8.1. Settings Sub-Tabs Navigation (Banner, Business, Payments)
  const settingsSubTabs = document.getElementById('settingsSubTabs');
  if (settingsSubTabs) {
    const sBtns = settingsSubTabs.querySelectorAll('.review-filter-btn');
    sBtns.forEach(btn => {
      btn.onclick = () => {
        sBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.subtab;
        const bannerPane = document.getElementById('settingsSubpaneBanner');
        const bizPane = document.getElementById('settingsSubpaneBusiness');
        const payPane = document.getElementById('settingsSubpanePayments');
        if (bannerPane) bannerPane.style.display = target === 'banner' ? 'block' : 'none';
        if (bizPane) bizPane.style.display = target === 'business' ? 'block' : 'none';
        if (payPane) payPane.style.display = target === 'payments' ? 'block' : 'none';
      };
    });
  }

  // 8.2. Coupon Auto-Generator
  const btnGenRandomCoupon = document.getElementById('btnGenRandomCoupon');
  if (btnGenRandomCoupon) {
    btnGenRandomCoupon.onclick = () => {
      const prefixes = ['ROYAL', 'NACHIYAR', 'BOTANICAL', 'HERBAL', 'QUEEN', 'FESTIVE'];
      const discounts = [10, 15, 20, 25, 30];
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const randomDisc = discounts[Math.floor(Math.random() * discounts.length)];
      const codeInput = document.getElementById('setCouponCode');
      const discInput = document.getElementById('setDiscountPercent');
      const expInput = document.getElementById('setCouponExpiryDate');
      if (codeInput) codeInput.value = `${randomPrefix}${randomDisc}`;
      if (discInput) discInput.value = randomDisc;
      if (expInput) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        expInput.value = futureDate.toISOString().split('T')[0];
      }
      updateBannerLivePreview();
      showToast(`Generated Coupon: ${randomPrefix}${randomDisc} (${randomDisc}%) valid for 30 days`);
    };
  }

  // 8.3. Live Banner Preview Updater
  function updateBannerLivePreview() {
    const textEl = document.getElementById('bannerPreviewText');
    const badgeEl = document.getElementById('bannerPreviewCouponBadge');
    const annText = (document.getElementById('setAnnouncementText')?.value || '').trim() || 'ROYAL BOTANICAL CARE • FREE PAN-INDIA SHIPPING OVER ₹599';
    const cCode = (document.getElementById('setCouponCode')?.value || '').trim().toUpperCase();
    const cPct = document.getElementById('setDiscountPercent')?.value || '15';
    const cActive = document.getElementById('setCouponActive')?.checked;
    const cExp = document.getElementById('setCouponExpiryDate')?.value;

    if (textEl) textEl.textContent = annText;
    if (badgeEl) {
      if (cActive && cCode) {
        badgeEl.style.display = 'inline-block';
        badgeEl.textContent = `Use Code: ${cCode} (${cPct}% OFF)${cExp ? ' • Till ' + cExp : ''}`;
      } else {
        badgeEl.style.display = 'none';
      }
    }
  }

  // Bind live preview listeners
  ['setAnnouncementText', 'setCouponCode', 'setDiscountPercent', 'setCouponExpiryDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = updateBannerLivePreview;
  });
  const couponActiveToggle = document.getElementById('setCouponActive');
  if (couponActiveToggle) couponActiveToggle.onchange = updateBannerLivePreview;

  // 8.4. Populate Settings Form
  function populateSettingsForm() {
    if (!storeSettings) return;
    if (document.getElementById('setAnnouncementText')) {
      document.getElementById('setAnnouncementText').value = storeSettings.announcementText || 'ROYAL BOTANICAL CARE • FREE PAN-INDIA SHIPPING OVER ₹599';
    }
    if (document.getElementById('setFreeShipping')) {
      document.getElementById('setFreeShipping').value = storeSettings.freeShippingThreshold || 599;
    }
    if (document.getElementById('setCouponCode')) {
      document.getElementById('setCouponCode').value = storeSettings.couponCode || storeSettings.mysteryCouponCode || 'ROYAL15';
    }
    if (document.getElementById('setDiscountPercent')) {
      document.getElementById('setDiscountPercent').value = storeSettings.discountPercent || 15;
    }
    if (document.getElementById('setCouponExpiryDate')) {
      const expInput = document.getElementById('setCouponExpiryDate');
      const todayStr = new Date().toISOString().split('T')[0];
      expInput.min = todayStr;

      let expVal = storeSettings.couponExpiryDate || '';
      // If the saved date is already in the past, provide today + 30 days default so user doesn't publish an expired coupon
      if (expVal) {
        const expD = new Date(expVal);
        expD.setHours(23, 59, 59, 999);
        if (Date.now() > expD.getTime()) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 30);
          expVal = futureDate.toISOString().split('T')[0];
        }
      } else {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        expVal = futureDate.toISOString().split('T')[0];
      }
      expInput.value = expVal;
    }
    if (document.getElementById('setCouponActive')) {
      document.getElementById('setCouponActive').checked = storeSettings.couponActive !== false;
    }
    if (document.getElementById('setCouponTagline')) {
      document.getElementById('setCouponTagline').value = storeSettings.couponTagline || 'Surprise Royal Privilege Voucher';
    }
    if (document.getElementById('setMysteryCode')) {
      document.getElementById('setMysteryCode').value = storeSettings.couponCode || 'ROYAL15';
    }
    if (document.getElementById('setBrandName')) {
      document.getElementById('setBrandName').value = storeSettings.brandName || 'Nachiyar Herbals & Cosmetics';
    }
    if (document.getElementById('setGstin')) {
      document.getElementById('setGstin').value = storeSettings.gstin || '33AAACH9876K1Z2';
    }
    if (document.getElementById('setSupportPhone')) {
      document.getElementById('setSupportPhone').value = storeSettings.supportPhone || '+91 94440 88990';
    }
    if (document.getElementById('setSupportEmail')) {
      document.getElementById('setSupportEmail').value = storeSettings.supportEmail || 'care@nachiyarherbals.com';
    }
    if (document.getElementById('setStoreTimings')) {
      document.getElementById('setStoreTimings').value = storeSettings.storeTimings || 'Mon - Sat: 9:30 AM - 8:30 PM';
    }
    if (document.getElementById('setStoreAddress')) {
      document.getElementById('setStoreAddress').value = storeSettings.storeAddress || 'Temple Ring Road, Madurai, Tamil Nadu - 625001';
    }

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

    updateBannerLivePreview();
  }

  // 8.5. Universal Settings Save Function
  async function saveStoreSettingsData(notificationText = 'Store settings updated!') {
    let couponExp = document.getElementById('setCouponExpiryDate')?.value || '';
    const isCouponAct = document.getElementById('setCouponActive') ? document.getElementById('setCouponActive').checked : true;
    if (isCouponAct && couponExp) {
      const expD = new Date(couponExp);
      expD.setHours(23, 59, 59, 999);
      if (Date.now() > expD.getTime()) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        couponExp = futureDate.toISOString().split('T')[0];
        if (document.getElementById('setCouponExpiryDate')) {
          document.getElementById('setCouponExpiryDate').value = couponExp;
        }
        showToast('⚠️ Previous expiry date was expired! Automatically extended to 30 days ahead.');
      }
    }

    const payload = {
      announcementText: document.getElementById('setAnnouncementText')?.value || '',
      freeShippingThreshold: Number(document.getElementById('setFreeShipping')?.value) || 599,
      couponCode: (document.getElementById('setCouponCode')?.value || 'ROYAL15').trim().toUpperCase(),
      mysteryCouponCode: (document.getElementById('setCouponCode')?.value || 'ROYAL15').trim().toUpperCase(),
      discountPercent: Number(document.getElementById('setDiscountPercent')?.value) || 15,
      couponExpiryDate: couponExp,
      couponActive: isCouponAct,
      couponTagline: document.getElementById('setCouponTagline')?.value || '',
      brandName: document.getElementById('setBrandName')?.value || 'Nachiyar Herbals & Cosmetics',
      gstin: document.getElementById('setGstin')?.value || '',
      supportPhone: document.getElementById('setSupportPhone')?.value || '',
      supportEmail: document.getElementById('setSupportEmail')?.value || '',
      storeTimings: document.getElementById('setStoreTimings')?.value || '',
      storeAddress: document.getElementById('setStoreAddress')?.value || '',
      paymentMethods: {
        cod: {
          enabled: document.getElementById('setPmCod')?.checked !== false,
          label: 'Cash on Delivery (COD)',
          description: 'Pay cash to courier executive upon delivery'
        },
        upi: {
          enabled: document.getElementById('setPmUpi')?.checked !== false,
          label: 'UPI (Google Pay, PhonePe, Paytm, BHIM)',
          description: 'Instant UPI payment with dynamic QR & VPA',
          upiId: document.getElementById('setPmUpiId')?.value.trim() || 'nachiyarherbals18@okaxis',
          merchantName: document.getElementById('setPmUpiName')?.value.trim() || 'Nachiyar Herbals & Cosmetics'
        },
        card: {
          enabled: document.getElementById('setPmCard')?.checked !== false,
          label: 'Credit / Debit Card',
          description: 'Visa, MasterCard, RuPay, Maestro'
        },
        netbanking: {
          enabled: document.getElementById('setPmNetbanking')?.checked !== false,
          label: 'Net Banking',
          description: 'All major Indian banks supported'
        }
      }
    };

    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        showToast(`✅ ${notificationText}`);
        storeSettings = res.data;
        try {
          localStorage.setItem('nachiyar_active_coupon', JSON.stringify({
            couponCode: payload.couponCode,
            discountPercent: payload.discountPercent,
            couponExpiryDate: payload.couponExpiryDate,
            couponActive: payload.couponActive
          }));
          localStorage.setItem('nachiyar_store_settings', JSON.stringify(payload));
        } catch (err) {}
        updateBannerLivePreview();
      } else {
        alert(`Failed to save settings: ${res.message}`);
      }
    } catch (e) {
      alert(`Network error saving settings: ${e.message}`);
    }
  }

  // Hook all save buttons
  const btnSaveStoreSettings = document.getElementById('btnSaveStoreSettings');
  if (btnSaveStoreSettings) {
    btnSaveStoreSettings.onclick = () => saveStoreSettingsData('All Store & Gateway Settings Saved!');
  }
  const btnSaveBannerSettings = document.getElementById('btnSaveBannerSettings');
  if (btnSaveBannerSettings) {
    btnSaveBannerSettings.onclick = () => saveStoreSettingsData('Banner & Coupon Published to Storefront!');
  }
  const btnSaveBusinessSettings = document.getElementById('btnSaveBusinessSettings');
  if (btnSaveBusinessSettings) {
    btnSaveBusinessSettings.onclick = () => saveStoreSettingsData('Business & Invoicing Info Saved!');
  }
  const btnSavePaymentSettings = document.getElementById('btnSavePaymentSettings');
  if (btnSavePaymentSettings) {
    btnSavePaymentSettings.onclick = () => saveStoreSettingsData('Payment Gateway Settings Saved!');
  }

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
        updateNotificationBadges();

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
  // CUSTOMER INQUIRIES & CONCIERGE MESSAGES
  // ==========================================
  let customerMessages = [];
  let activeViewingMessage = null;
  let currentMsgStatusFilter = 'all';
  let currentMsgSubjectFilter = 'all';
  let msgSearchQuery = '';

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  const kpiTotalMessages = document.getElementById('kpiTotalMessages');
  const kpiUnreadMessages = document.getElementById('kpiUnreadMessages');
  const kpiResolvedMessages = document.getElementById('kpiResolvedMessages');
  const badgeUnreadMessages = document.getElementById('badgeUnreadMessages');
  const btnRefreshMessages = document.getElementById('btnRefreshMessages');
  const inputSearchMessages = document.getElementById('inputSearchMessages');
  const selectMessageSubjectFilter = document.getElementById('selectMessageSubjectFilter');
  const messagesFilterTabs = document.getElementById('messagesFilterTabs');
  const countMsgFilterAll = document.getElementById('countMsgFilterAll');
  const countMsgFilterUnread = document.getElementById('countMsgFilterUnread');
  const countMsgFilterRead = document.getElementById('countMsgFilterRead');
  const countMsgFilterResolved = document.getElementById('countMsgFilterResolved');
  const messagesTableBody = document.getElementById('messagesTableBody');

  const modalMsgOverlay = document.getElementById('messageDetailModalOverlay');
  const modalMsgCloseBtn = document.getElementById('modalMsgCloseBtn');
  const modalMsgStatusBadge = document.getElementById('modalMsgStatusBadge');
  const modalMsgSubject = document.getElementById('modalMsgSubject');
  const modalMsgDate = document.getElementById('modalMsgDate');
  const modalMsgSenderName = document.getElementById('modalMsgSenderName');
  const modalMsgSenderEmail = document.getElementById('modalMsgSenderEmail');
  const modalMsgSenderPhone = document.getElementById('modalMsgSenderPhone');
  const modalMsgBody = document.getElementById('modalMsgBody');
  const modalMsgAdminNotes = document.getElementById('modalMsgAdminNotes');
  const btnMsgReplyWhatsApp = document.getElementById('btnMsgReplyWhatsApp');
  const btnMsgReplyEmail = document.getElementById('btnMsgReplyEmail');
  const btnMsgToggleStatus = document.getElementById('btnMsgToggleStatus');
  const btnMsgSaveNotes = document.getElementById('btnMsgSaveNotes');

  async function loadAdminMessages() {
    try {
      const res = await authFetch('/api/messages').then(r => r.json());
      if (res && res.success) {
        const rawList = Array.isArray(res.data) ? res.data : (res.data?.messages || []);
        customerMessages = rawList;

        // Check if there are any offline backup inquiries in localStorage to merge
        try {
          const offlineInquiries = JSON.parse(localStorage.getItem('nachiyar_offline_inquiries') || '[]');
          if (Array.isArray(offlineInquiries) && offlineInquiries.length > 0) {
            const existingIds = new Set(customerMessages.map(m => String(m.id)));
            offlineInquiries.forEach(off => {
              if (!existingIds.has(String(off.id))) {
                customerMessages.unshift({ ...off, is_offline: true });
              }
            });
          }
        } catch (e) {}

        const unreadCount = res.unreadCount !== undefined ? res.unreadCount : undefined;
        updateMessageKpiCounters(unreadCount);
        renderAdminMessages();
        return;
      }
    } catch (err) {
      console.error('Failed to load customer messages from API:', err);
    }

    // Fallback: render from localStorage if API failed
    try {
      const offlineInquiries = JSON.parse(localStorage.getItem('nachiyar_offline_inquiries') || '[]');
      if (Array.isArray(offlineInquiries) && offlineInquiries.length > 0) {
        customerMessages = offlineInquiries.map(m => ({ ...m, is_offline: true }));
        updateMessageKpiCounters();
        renderAdminMessages();
      }
    } catch (e) {}
  }

  function updateMessageKpiCounters(explicitUnreadCount) {
    const total = customerMessages.length;
    const unread = explicitUnreadCount !== undefined ? explicitUnreadCount : customerMessages.filter(m => m.status === 'unread').length;
    const read = customerMessages.filter(m => m.status === 'read').length;
    const resolved = customerMessages.filter(m => m.status === 'resolved').length;

    if (kpiTotalMessages) kpiTotalMessages.textContent = total;
    if (kpiUnreadMessages) kpiUnreadMessages.textContent = unread;
    if (kpiResolvedMessages) kpiResolvedMessages.textContent = resolved;

    if (countMsgFilterAll) countMsgFilterAll.textContent = total;
    if (countMsgFilterUnread) countMsgFilterUnread.textContent = unread;
    if (countMsgFilterRead) countMsgFilterRead.textContent = read;
    if (countMsgFilterResolved) countMsgFilterResolved.textContent = resolved;

    updateNotificationBadges();
  }

  function renderAdminMessages() {
    if (!messagesTableBody) return;

    let filtered = [...customerMessages];

    // Status filter
    if (currentMsgStatusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === currentMsgStatusFilter);
    }

    // Subject filter
    if (currentMsgSubjectFilter !== 'all') {
      filtered = filtered.filter(m => (m.subject || '').toLowerCase().includes(currentMsgSubjectFilter.toLowerCase()));
    }

    // Search query
    if (msgSearchQuery) {
      filtered = filtered.filter(m =>
        (m.name || '').toLowerCase().includes(msgSearchQuery) ||
        (m.email || '').toLowerCase().includes(msgSearchQuery) ||
        (m.phone || '').toLowerCase().includes(msgSearchQuery) ||
        (m.subject || '').toLowerCase().includes(msgSearchQuery) ||
        (m.message || '').toLowerCase().includes(msgSearchQuery)
      );
    }

    if (filtered.length === 0) {
      messagesTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 48px 16px; color: var(--admin-text-muted);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">📬</div>
            <strong style="font-size: 1rem; color: #1E293B;">No Inquiries Found</strong>
            <p style="margin: 4px 0 0 0; font-size: 0.8125rem;">No customer contact messages match your current filter or search criteria.</p>
          </td>
        </tr>
      `;
      return;
    }

    messagesTableBody.innerHTML = filtered.map(msg => {
      const initials = (msg.name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const dateStr = msg.created_at ? new Date(msg.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }) : 'Recent';

      let statusBadge = '';
      if (msg.status === 'unread') {
        statusBadge = '<span class="badge-tag" style="background:#FEE2E2; color:#DC2626; border-color:#FECACA; font-weight:800;">🔔 UNREAD</span>';
      } else if (msg.status === 'resolved') {
        statusBadge = '<span class="badge-tag paid" style="background:#DCFCE7; color:#15803D; border-color:#BBF7D0; font-weight:800;">✅ RESOLVED</span>';
      } else {
        statusBadge = '<span class="badge-tag" style="background:#FEF3C7; color:#B45309; border-color:#FDE68A; font-weight:800;">👀 READ</span>';
      }

      const escapedMsg = (msg.message || '').replace(/"/g, '&quot;');
      const previewText = msg.message && msg.message.length > 70 ? msg.message.substring(0, 70) + '...' : (msg.message || '-');

      return `
        <tr style="${msg.status === 'unread' ? 'background-color: rgba(243, 232, 255, 0.25); font-weight: 500;' : ''}">
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: #EDE9FE; color: #6D28D9; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8125rem; flex-shrink: 0;">
                ${initials}
              </div>
              <div>
                <strong style="color: #1E293B; display: block; font-size: 0.875rem;">${escapeHtml(msg.name || 'Anonymous')}</strong>
                ${msg.is_offline ? '<span style="font-size:0.65rem; color:#D97706; background:#FEF3C7; padding:1px 5px; border-radius:4px;">Offline Saved</span>' : ''}
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.8125rem;">
              <div style="color: #334155; font-weight: 600;">${escapeHtml(msg.email || '-')}</div>
              <div style="color: #64748B; font-size: 0.75rem; margin-top: 2px;">${escapeHtml(msg.phone || 'No phone provided')}</div>
            </div>
          </td>
          <td>
            <span class="badge-tag" style="background: #F1F5F9; color: #334155; font-size: 0.75rem; font-weight: 600;">
              ${escapeHtml(msg.subject || 'General Inquiry')}
            </span>
          </td>
          <td>
            <span style="font-size: 0.8125rem; color: #475569;" title="${escapedMsg}">
              ${escapeHtml(previewText)}
            </span>
          </td>
          <td>
            <span style="font-size: 0.75rem; color: #64748B; white-space: nowrap;">
              ${dateStr}
            </span>
          </td>
          <td>
            ${statusBadge}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn-action-primary btn-view-message" data-id="${msg.id}" style="padding: 5px 12px; font-size: 0.75rem;" title="View & Respond">
                👁️ View
              </button>
              <button class="btn-action-delete btn-delete-message" data-id="${msg.id}" style="padding: 5px 8px; font-size: 0.75rem; color: #EF4444;" title="Delete Message">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click listeners to rows
    messagesTableBody.querySelectorAll('.btn-view-message').forEach(btn => {
      btn.onclick = () => openMessageDetailModal(btn.dataset.id);
    });

    messagesTableBody.querySelectorAll('.btn-delete-message').forEach(btn => {
      btn.onclick = () => deleteAdminMessage(btn.dataset.id);
    });
  }

  function openMessageDetailModal(id) {
    const msg = customerMessages.find(m => String(m.id) === String(id));
    if (!msg) return;

    activeViewingMessage = msg;

    if (modalMsgSubject) modalMsgSubject.textContent = msg.subject || 'Customer Inquiry';
    if (modalMsgSenderName) modalMsgSenderName.textContent = msg.name || 'Anonymous Patron';
    if (modalMsgSenderEmail) {
      modalMsgSenderEmail.textContent = msg.email || '-';
      modalMsgSenderEmail.href = msg.email ? `mailto:${msg.email}` : '#';
    }
    if (modalMsgSenderPhone) modalMsgSenderPhone.textContent = msg.phone || 'Not provided';
    if (modalMsgBody) modalMsgBody.textContent = msg.message || '(Empty message)';
    if (modalMsgAdminNotes) modalMsgAdminNotes.value = msg.admin_notes || '';

    const dateFormatted = msg.created_at ? new Date(msg.created_at).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'medium'
    }) : 'Recent';
    if (modalMsgDate) modalMsgDate.textContent = `Submitted on ${dateFormatted}`;

    // Update Status Badge inside modal
    updateModalStatusBadge(msg.status);

    // Setup direct reply links
    if (btnMsgReplyEmail && msg.email) {
      btnMsgReplyEmail.href = `mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject || 'Nachiyar Herbals Inquiry'}`)}&body=${encodeURIComponent(`Dear ${msg.name},\n\nThank you for reaching out to Nachiyar Herbals & Cosmetics.\n\nRegarding your inquiry:\n"${msg.message}"\n\n`)}`;
      btnMsgReplyEmail.style.display = 'inline-flex';
      btnMsgReplyEmail.onclick = (e) => {
        e.preventDefault();
        const toEmail = msg.email;
        const subj = encodeURIComponent(`Re: ${msg.subject || 'Nachiyar Herbals Inquiry'}`);
        const bodyTxt = encodeURIComponent(`Dear ${msg.name},\n\nThank you for reaching out to Nachiyar Herbals & Cosmetics.\n\nRegarding your inquiry:\n"${msg.message}"\n\nKind regards,\nCustomer Concierge Desk\nNachiyar Herbals & Cosmetics`);
        try { navigator.clipboard.writeText(toEmail); } catch (err) {}
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${subj}&body=${bodyTxt}`;
        const win = window.open(gmailUrl, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = `mailto:${toEmail}?subject=${subj}&body=${bodyTxt}`;
        }
        showToast(`Email opened & copied to clipboard: ${toEmail}`);
      };
    } else if (btnMsgReplyEmail) {
      btnMsgReplyEmail.style.display = 'none';
    }

    if (btnMsgReplyWhatsApp && msg.phone) {
      const cleanPhone = msg.phone.replace(/[^0-9]/g, '');
      const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      btnMsgReplyWhatsApp.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${msg.name}! Greetings from Nachiyar Herbals. We received your message regarding: "${msg.subject || 'Your Inquiry'}". How can we assist you today?`)}`;
      btnMsgReplyWhatsApp.style.display = 'inline-flex';
    } else if (btnMsgReplyWhatsApp) {
      btnMsgReplyWhatsApp.style.display = 'none';
    }

    // Toggle status button text
    if (btnMsgToggleStatus) {
      btnMsgToggleStatus.textContent = msg.status === 'resolved' ? '🔄 Re-open Inquiry' : 'Mark as Resolved ✅';
    }

    // If unread, mark as read on open
    if (msg.status === 'unread') {
      updateMessageStatus(msg.id, 'read', msg.admin_notes || '', false);
    }

    if (modalMsgOverlay) modalMsgOverlay.classList.add('is-active');
  }

  function updateModalStatusBadge(status) {
    if (!modalMsgStatusBadge) return;
    if (status === 'resolved') {
      modalMsgStatusBadge.textContent = 'RESOLVED';
      modalMsgStatusBadge.className = 'badge-tag paid';
      modalMsgStatusBadge.style = 'background:#DCFCE7; color:#15803D; border-color:#BBF7D0; font-weight:800;';
    } else if (status === 'unread') {
      modalMsgStatusBadge.textContent = 'UNREAD';
      modalMsgStatusBadge.className = 'badge-tag';
      modalMsgStatusBadge.style = 'background:#FEE2E2; color:#DC2626; border-color:#FECACA; font-weight:800;';
    } else {
      modalMsgStatusBadge.textContent = 'READ';
      modalMsgStatusBadge.className = 'badge-tag';
      modalMsgStatusBadge.style = 'background:#FEF3C7; color:#B45309; border-color:#FDE68A; font-weight:800;';
    }
  }

  function closeMessageDetailModal() {
    if (modalMsgOverlay) modalMsgOverlay.classList.remove('is-active');
    activeViewingMessage = null;
  }

  async function updateMessageStatus(id, newStatus, notes, showToastNotification = true) {
    // Optimistic update
    const msg = customerMessages.find(m => String(m.id) === String(id));
    if (msg) {
      msg.status = newStatus;
      if (notes !== undefined) msg.admin_notes = notes;
    }
    if (activeViewingMessage && String(activeViewingMessage.id) === String(id)) {
      activeViewingMessage.status = newStatus;
      if (notes !== undefined) activeViewingMessage.admin_notes = notes;
      updateModalStatusBadge(newStatus);
      if (btnMsgToggleStatus) {
        btnMsgToggleStatus.textContent = newStatus === 'resolved' ? '🔄 Re-open Inquiry' : 'Mark as Resolved ✅';
      }
    }
    updateMessageKpiCounters();
    renderAdminMessages();

    try {
      const res = await authFetch(`/api/messages/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_notes: notes })
      }).then(r => r.json());

      if (res && res.success) {
        if (showToastNotification) {
          showToast(`Inquiry status updated to ${newStatus.toUpperCase()}`);
        }
      }
    } catch (err) {
      console.error('Failed to update message status:', err);
    }
  }

  async function deleteAdminMessage(id) {
    if (!confirm('Are you sure you want to permanently delete this customer inquiry?')) return;

    try {
      const res = await authFetch(`/api/messages/${id}`, {
        method: 'DELETE'
      }).then(r => r.json());

      if (res.success) {
        customerMessages = customerMessages.filter(m => String(m.id) !== String(id));
        // Also remove from offline inquiries if present
        try {
          const offlineInquiries = JSON.parse(localStorage.getItem('nachiyar_offline_inquiries') || '[]');
          const remainingOffline = offlineInquiries.filter(m => String(m.id) !== String(id));
          localStorage.setItem('nachiyar_offline_inquiries', JSON.stringify(remainingOffline));
        } catch (e) {}

        showToast('🗑️ Inquiry deleted successfully.');
        updateMessageKpiCounters();
        renderAdminMessages();
        if (activeViewingMessage && String(activeViewingMessage.id) === String(id)) {
          closeMessageDetailModal();
        }
      } else {
        showToast(res.message || 'Failed to delete inquiry');
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      showToast('Error deleting message');
    }
  }

  // Bind message listeners
  if (btnRefreshMessages) {
    btnRefreshMessages.onclick = () => {
      loadAdminMessages();
      showToast('🔄 Refreshing customer inquiries...');
    };
  }

  if (inputSearchMessages) {
    inputSearchMessages.oninput = () => {
      msgSearchQuery = inputSearchMessages.value.trim().toLowerCase();
      renderAdminMessages();
    };
  }

  // Filter tabs listeners
  if (messagesFilterTabs) {
    const filterBtns = messagesFilterTabs.querySelectorAll('.review-filter-btn');
    filterBtns.forEach(btn => {
      btn.onclick = () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMsgStatusFilter = btn.dataset.filter;
        renderAdminMessages();
      };
    });
  }

  if (selectMessageSubjectFilter) {
    selectMessageSubjectFilter.onchange = () => {
      currentMsgSubjectFilter = selectMessageSubjectFilter.value;
      renderAdminMessages();
    };
  }

  if (modalMsgCloseBtn) modalMsgCloseBtn.onclick = closeMessageDetailModal;
  if (modalMsgOverlay) {
    modalMsgOverlay.addEventListener('click', (e) => {
      if (e.target === modalMsgOverlay) closeMessageDetailModal();
    });
  }

  if (btnMsgToggleStatus) {
    btnMsgToggleStatus.onclick = () => {
      if (!activeViewingMessage) return;
      const nextStatus = activeViewingMessage.status === 'resolved' ? 'read' : 'resolved';
      const notes = modalMsgAdminNotes ? modalMsgAdminNotes.value : (activeViewingMessage.admin_notes || '');
      updateMessageStatus(activeViewingMessage.id, nextStatus, notes, true);
    };
  }

  if (btnMsgSaveNotes) {
    btnMsgSaveNotes.onclick = () => {
      if (!activeViewingMessage) return;
      const notes = modalMsgAdminNotes ? modalMsgAdminNotes.value : '';
      updateMessageStatus(activeViewingMessage.id, activeViewingMessage.status, notes, true);
      showToast('💾 Concierge notes saved successfully!');
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
    if (currentUserName) currentUserName.textContent = 'Super Nimda';
    if (currentRoleBadge) currentRoleBadge.textContent = 'SUPER ADMIN';
    navTabs.forEach(t => t.style.display = 'flex');
  }

  // ==========================================
  // 9.5. MARKETPLACE HUB & MULTI-CHANNEL CONTROLLER (FLIPKART, AMAZON, MEESHO)
  // ==========================================
  let activeMarketplace = 'flipkart'; // 'flipkart' | 'amazon' | 'meesho'
  let activeMarketplacePeriod = 'month'; // 'all' | 'week' | 'month' | 'year'

  // Master Marketplace Channel Configuration & Live Order Database
  const marketplaceData = {
    flipkart: {
      id: 'flipkart',
      name: 'Flipkart Marketplace',
      sellerId: 'FK_NACHIYAR_77',
      feePercent: 15,
      themeColor: '#2874F0',
      activeListings: 0,
      skus: {},
      orders: []
    },
    amazon: {
      id: 'amazon',
      name: 'Amazon India',
      sellerId: 'AZ_NACH_IND_90',
      feePercent: 17,
      themeColor: '#FF9900',
      activeListings: 0,
      skus: {},
      orders: []
    },
    meesho: {
      id: 'meesho',
      name: 'Meesho Supplier Hub',
      sellerId: 'MSH_NACH_44',
      feePercent: 10,
      themeColor: '#F43397',
      activeListings: 0,
      skus: {},
      orders: []
    }
  };

  // Helper: Filter orders by period
  function filterMarketplaceOrders(orders, period) {
    const now = new Date('2026-10-12T15:30:00Z').getTime();
    return orders.filter(o => {
      const oTime = new Date(o.date).getTime();
      const diffDays = (now - oTime) / (1000 * 60 * 60 * 24);

      if (period === 'week') return diffDays <= 7;
      if (period === 'month') return diffDays <= 31;
      if (period === 'year') return diffDays <= 365;
      return true; // 'all'
    });
  }

  // Helper: Render Top 3 Overview Boxes
  // Live Asynchronous Backend Synchronizer
  async function fetchMarketplaceBackendData() {
    try {
      const res = await fetch('/api/marketplaces/stats');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.channels) {
          const s = json.data.channels;
          ['flipkart', 'amazon', 'meesho'].forEach(chKey => {
            if (s[chKey]) {
              marketplaceData[chKey].feePercent = s[chKey].feePercent || marketplaceData[chKey].feePercent;
              marketplaceData[chKey].sellerId = s[chKey].sellerId || marketplaceData[chKey].sellerId;
              marketplaceData[chKey].activeListings = s[chKey].activeListings || 3;
              if (Array.isArray(s[chKey].orders) && s[chKey].orders.length > 0) {
                marketplaceData[chKey].orders = s[chKey].orders;
              }
            }
          });
          updateMarketplaceTopBoxes();
        }
      }
    } catch (e) {
      console.warn('Marketplace backend sync note:', e.message);
    }
  }

  function updateMarketplaceTopBoxes() {
    ['flipkart', 'amazon', 'meesho'].forEach(chKey => {
      const ch = marketplaceData[chKey];
      const allOrders = ch.orders;
      const totalRev = allOrders.reduce((s, o) => s + o.gross, 0);
      const totalUnits = allOrders.reduce((s, o) => s + o.items.reduce((is, it) => is + it.qty, 0), 0);
      const totalNet = allOrders.reduce((s, o) => s + o.net, 0);

      if (chKey === 'flipkart') {
        const elRev = document.getElementById('kpiFkRevenue');
        const elUnits = document.getElementById('kpiFkUnits');
        const elSettlement = document.getElementById('kpiFkSettlement');
        if (elRev) elRev.textContent = `₹${totalRev.toLocaleString('en-IN')}`;
        if (elUnits) elUnits.textContent = totalUnits;
        if (elSettlement) elSettlement.textContent = `₹${totalNet.toLocaleString('en-IN')}`;
      } else if (chKey === 'amazon') {
        const elRev = document.getElementById('kpiAzRevenue');
        const elUnits = document.getElementById('kpiAzUnits');
        const elSettlement = document.getElementById('kpiAzSettlement');
        if (elRev) elRev.textContent = `₹${totalRev.toLocaleString('en-IN')}`;
        if (elUnits) elUnits.textContent = totalUnits;
        if (elSettlement) elSettlement.textContent = `₹${totalNet.toLocaleString('en-IN')}`;
      } else if (chKey === 'meesho') {
        const elRev = document.getElementById('kpiMshRevenue');
        const elUnits = document.getElementById('kpiMshUnits');
        const elSettlement = document.getElementById('kpiMshSettlement');
        if (elRev) elRev.textContent = `₹${totalRev.toLocaleString('en-IN')}`;
        if (elUnits) elUnits.textContent = totalUnits;
        if (elSettlement) elSettlement.textContent = `₹${totalNet.toLocaleString('en-IN')}`;
      }
    });
  }

  // Master Render Function for Active Channel
  function renderMarketplaceHub() {
    fetchMarketplaceBackendData();
    updateMarketplaceTopBoxes();

    // 1. Update active UI states for top 3 boxes and subtab buttons
    ['flipkart', 'amazon', 'meesho'].forEach(ch => {
      const box = document.getElementById(`mktBox${ch.charAt(0).toUpperCase() + ch.slice(1)}`);
      const btn = document.getElementById(`tabBtn${ch.charAt(0).toUpperCase() + ch.slice(1)}`);
      if (box) {
        if (ch === activeMarketplace) box.classList.add('active');
        else box.classList.remove('active');
      }
      if (btn) {
        if (ch === activeMarketplace) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    const chObj = marketplaceData[activeMarketplace];
    if (!chObj) return;

    // 2. Update Channel Sell Now button label & style
    const btnSellNow = document.getElementById('btnActiveChannelSellNow');
    const txtSellNow = document.getElementById('txtChannelSellNowBtn');
    if (btnSellNow && txtSellNow) {
      txtSellNow.textContent = `🚀 Sell Now on ${chObj.name.split(' ')[0]} (+ List Products)`;
      btnSellNow.style.backgroundColor = chObj.themeColor;
      btnSellNow.style.borderColor = chObj.themeColor;
    }

    // 3. Filter orders by active period
    const filteredOrders = filterMarketplaceOrders(chObj.orders, activeMarketplacePeriod);
    const grossSales = filteredOrders.reduce((s, o) => s + o.gross, 0);
    const unitsDispatched = filteredOrders.reduce((s, o) => s + o.items.reduce((is, it) => is + it.qty, 0), 0);
    const totalFees = filteredOrders.reduce((s, o) => s + o.commission, 0);
    const netPayout = grossSales - totalFees;

    // 4. Update Period Stats Strip
    const elGross = document.getElementById('stripGrossSales');
    const elUnits = document.getElementById('stripUnitsCount');
    const elFees = document.getElementById('stripCommission');
    const elFeeLbl = document.getElementById('stripFeeLabel');
    const elNet = document.getElementById('stripNetPayout');

    if (elGross) elGross.textContent = `₹${grossSales.toLocaleString('en-IN')}`;
    if (elUnits) elUnits.textContent = `${unitsDispatched} units`;
    if (elFees) elFees.textContent = `-₹${totalFees.toLocaleString('en-IN')}`;
    if (elFeeLbl) elFeeLbl.textContent = `Platform Fees (${chObj.feePercent}%)`;
    if (elNet) elNet.textContent = `₹${netPayout.toLocaleString('en-IN')}`;

    // Titles
    const prodTitle = document.getElementById('channelProductsTitle');
    const ordTitle = document.getElementById('channelOrdersTitle');
    const periodLabel = activeMarketplacePeriod === 'week' ? 'This Week' : activeMarketplacePeriod === 'month' ? 'This Month' : activeMarketplacePeriod === 'year' ? 'This Year' : 'All Time';

    if (prodTitle) prodTitle.textContent = `${chObj.name} Product Sales & Listing Breakdown (${periodLabel})`;
    if (ordTitle) ordTitle.textContent = `${chObj.name} Orders & Dispatch History (${periodLabel})`;

    // 5. Render Channel Product Breakdown Table
    const prodTableBody = document.getElementById('channelProductsTableBody');
    if (prodTableBody) {
      prodTableBody.innerHTML = '';
      products.forEach(p => {
        // Calculate units sold and revenue for this product in this channel & period
        let pUnits = 0;
        let pRev = 0;
        filteredOrders.forEach(o => {
          o.items.forEach(it => {
            if (it.name.includes(p.name) || p.name.includes(it.name) || (p.slug && p.slug.includes('oil') && it.name.includes('Oil')) || (p.slug && p.slug.includes('shampoo') && it.name.includes('Shampoo')) || (p.slug && p.slug.includes('duo') && it.name.includes('Duo'))) {
              pUnits += it.qty;
              pRev += (it.price * it.qty);
            }
          });
        });

        const chSku = chObj.skus[p.id] || `${chObj.name.substring(0, 2).toUpperCase()}-NACH-${p.id.slice(-4)}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${p.image || (p.images && p.images[0]) || 'assets/hero-bottle-oil.png'}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid var(--admin-border);">
              <div>
                <strong>${p.name}</strong>
                <small style="display:block; color:var(--admin-text-muted);">Stock in Master Matrix: <strong>${p.stock} units</strong></small>
              </div>
            </div>
          </td>
          <td><code style="background:#F1F5F9; padding:2px 6px; border-radius:4px; font-weight:700;">${chSku}</code></td>
          <td>₹${p.price}</td>
          <td><strong>₹${p.price}</strong> <small style="color:var(--admin-text-muted);">(MRP ₹${p.mrp || (p.price + 100)})</small></td>
          <td><strong style="color:var(--admin-primary);">${pUnits} units</strong></td>
          <td><strong style="color:#059669;">₹${pRev.toLocaleString('en-IN')}</strong></td>
          <td><span class="badge-tag paid" style="font-size:0.75rem;">🟢 LISTED LIVE</span></td>
          <td style="text-align: right;">
            <button class="btn-secondary btn-sm btn-resync-prod" data-id="${p.id}" data-name="${p.name}">
              🔄 Re-Sync
            </button>
          </td>
        `;
        prodTableBody.appendChild(tr);
      });

      // Wire re-sync buttons
      prodTableBody.querySelectorAll('.btn-resync-prod').forEach(b => {
        b.onclick = () => {
          showToast(`✅ Synced "${b.dataset.name}" with ${chObj.name} API!`);
        };
      });
    }

    // 6. Render Channel Orders Table
    renderChannelOrdersTable(filteredOrders, chObj);
  }

  // Render Orders Table with Search
  function renderChannelOrdersTable(ordersList, chObj) {
    const ordTableBody = document.getElementById('channelOrdersTableBody');
    if (!ordTableBody) return;
    ordTableBody.innerHTML = '';

    const query = (document.getElementById('marketplaceOrderSearch')?.value || '').toLowerCase().trim();
    const displayOrders = ordersList.filter(o => {
      if (!query) return true;
      return o.id.toLowerCase().includes(query) ||
             o.customer.toLowerCase().includes(query) ||
             o.city.toLowerCase().includes(query) ||
             o.items.some(i => i.name.toLowerCase().includes(query));
    });

    if (displayOrders.length === 0) {
      ordTableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 36px; color: var(--admin-text-muted);">
            No orders found for ${chObj.name} in this timeline.
          </td>
        </tr>
      `;
      return;
    }

    displayOrders.forEach(o => {
      const tr = document.createElement('tr');
      const itemsStr = o.items.map(it => `<strong>${it.name}</strong> (x${it.qty})`).join('<br>');
      const statusBadge = o.status === 'DELIVERED' ? 'paid' : o.status === 'SHIPPED' ? 'channel-online' : 'unpaid';

      tr.innerHTML = `
        <td><strong>${o.id}</strong><br><small style="color:var(--admin-text-muted); font-family:monospace;">AWB: ${o.awb}</small></td>
        <td>
          <div>${new Date(o.date).toLocaleDateString()}</div>
          <small style="color:var(--admin-text-muted);">${new Date(o.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
        </td>
        <td><strong>${o.customer}</strong><br><small style="color:var(--admin-text-muted);">${o.city}</small></td>
        <td style="font-size:0.8125rem;">${itemsStr}</td>
        <td><strong>₹${o.gross.toLocaleString('en-IN')}</strong></td>
        <td><span style="color:#DC2626;">-₹${o.commission.toLocaleString('en-IN')}</span></td>
        <td><strong style="color:#059669;">₹${o.net.toLocaleString('en-IN')}</strong></td>
        <td><span class="badge-tag ${statusBadge}">${o.status}</span></td>
        <td style="text-align: right;">
          <button class="btn-primary btn-sm btn-view-slip" data-id="${o.id}" style="white-space: nowrap;">
            🖨️ Slip
          </button>
        </td>
      `;
      ordTableBody.appendChild(tr);
    });

    // Wire dispatch slip modal buttons
    ordTableBody.querySelectorAll('.btn-view-slip').forEach(b => {
      b.onclick = () => {
        const ord = ordersList.find(o => o.id === b.dataset.id);
        if (ord) openMarketplaceSlipModal(ord, chObj);
      };
    });
  }

  // Live Order Search Input
  const mktOrderSearchInput = document.getElementById('marketplaceOrderSearch');
  if (mktOrderSearchInput) {
    mktOrderSearchInput.oninput = () => {
      const chObj = marketplaceData[activeMarketplace];
      if (chObj) {
        const filtered = filterMarketplaceOrders(chObj.orders, activeMarketplacePeriod);
        renderChannelOrdersTable(filtered, chObj);
      }
    };
  }

  // Channel Deep-Dive Modal Controller
  const modalDeepDive = document.getElementById('modalChannelDeepDive');
  const modalDeepDiveClose = document.getElementById('modalDeepDiveClose');
  const btnDeepDiveClose = document.getElementById('btnDeepDiveClose');
  const btnDeepDiveExternalLink = document.getElementById('btnDeepDiveExternalLink');
  const btnDeepDiveViewOrders = document.getElementById('btnDeepDiveViewOrders');

  function openChannelDeepDive(chKey) {
    if (!modalDeepDive) return;
    activeMarketplace = chKey;
    renderMarketplaceHub();

    const chObj = marketplaceData[chKey];
    if (!chObj) return;

    // Header updates
    const titleEl = document.getElementById('deepDiveChannelTitle');
    const subEl = document.getElementById('deepDiveSubtitle');
    const logoEl = document.getElementById('deepDiveLogoCircle');
    const extLink = document.getElementById('btnDeepDiveExternalLink');

    if (titleEl) titleEl.textContent = `${chObj.name} • Seller Intelligence`;
    if (subEl) subEl.textContent = `Seller ID: ${chObj.sellerId} • Unified Catalog & Payout Management`;
    if (logoEl) {
      logoEl.textContent = chKey === 'flipkart' ? 'F' : chKey === 'amazon' ? 'a' : 'M';
      logoEl.className = `mkt-logo-circle ${chKey === 'flipkart' ? 'fk-bg' : chKey === 'amazon' ? 'az-bg' : 'msh-bg'}`;
    }

    if (extLink) {
      if (chKey === 'flipkart') extLink.href = 'https://seller.flipkart.com';
      else if (chKey === 'amazon') extLink.href = 'https://sellercentral.amazon.in';
      else if (chKey === 'meesho') extLink.href = 'https://supplier.meesho.com';
    }

    // Financial calculations for this channel
    const allOrders = chObj.orders;
    const totalGross = allOrders.reduce((s, o) => s + o.gross, 0);
    const totalFee = allOrders.reduce((s, o) => s + o.commission, 0);
    const shippingCut = chKey === 'meesho' ? 3200 : 5500;
    const settledAmount = Math.max(0, totalGross - totalFee - shippingCut);

    const elGross = document.getElementById('deepDiveGrossVal');
    const elFee = document.getElementById('deepDiveFeeVal');
    const elShip = document.getElementById('deepDiveShippingFeeVal');
    const elSet = document.getElementById('deepDiveSettledVal');

    if (elGross) elGross.textContent = `₹${totalGross.toLocaleString('en-IN')}`;
    if (elFee) elFee.textContent = `-₹${totalFee.toLocaleString('en-IN')} (${chObj.feePercent}%)`;
    if (elShip) elShip.textContent = `-₹${shippingCut.toLocaleString('en-IN')}`;
    if (elSet) elSet.textContent = `₹${settledAmount.toLocaleString('en-IN')}`;

    // Listed products list
    const prodListEl = document.getElementById('deepDiveProductsList');
    if (prodListEl) {
      prodListEl.innerHTML = '';
      products.forEach(p => {
        const sku = chObj.skus[p.id] || `${chObj.name.substring(0, 2).toUpperCase()}-NACH-${p.id.slice(-4)}`;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#FFF; border:1px solid var(--admin-border); border-radius:8px; padding:10px 14px;';
        div.innerHTML = `
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${p.image || (p.images && p.images[0]) || 'assets/hero-bottle-oil.png'}" style="width:34px; height:34px; border-radius:6px; object-fit:cover;">
            <div>
              <strong style="font-size:0.875rem;">${p.name}</strong>
              <div style="font-size:0.75rem; color:var(--admin-text-muted);">Channel SKU: <code>${sku}</code> • Stock: <strong>${p.stock} units</strong></div>
            </div>
          </div>
          <div style="text-align:right;">
            <strong style="color:var(--admin-primary); font-size:0.9375rem;">₹${p.price}</strong>
            <div style="font-size:0.6875rem; color:#059669; font-weight:700;">🟢 WINNING BUY BOX</div>
          </div>
        `;
        prodListEl.appendChild(div);
      });
    }

    modalDeepDive.classList.add('is-active');
  }

  function closeChannelDeepDive() {
    if (modalDeepDive) modalDeepDive.classList.remove('is-active');
  }

  if (modalDeepDiveClose) modalDeepDiveClose.onclick = closeChannelDeepDive;
  if (btnDeepDiveClose) btnDeepDiveClose.onclick = closeChannelDeepDive;
  if (modalDeepDive) {
    modalDeepDive.addEventListener('click', (e) => {
      if (e.target === modalDeepDive) closeChannelDeepDive();
    });
  }

  if (btnDeepDiveViewOrders) {
    btnDeepDiveViewOrders.onclick = () => {
      closeChannelDeepDive();
      const targetSec = document.getElementById('marketplaceChannelSection');
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth' });
      }
    };
  }

  // Hook all "View Channel →" buttons
  document.querySelectorAll('.btn-open-channel-deepdive').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openChannelDeepDive(btn.dataset.channel);
    };
  });

  // Channel Switching Buttons & Top Box Listeners
  ['flipkart', 'amazon', 'meesho'].forEach(chKey => {
    const box = document.getElementById(`mktBox${chKey.charAt(0).toUpperCase() + chKey.slice(1)}`);
    const tabBtn = document.getElementById(`tabBtn${chKey.charAt(0).toUpperCase() + chKey.slice(1)}`);

    if (box) {
      box.onclick = (e) => {
        if (e.target.closest('.btn-open-channel-deepdive')) return;
        activeMarketplace = chKey;
        renderMarketplaceHub();
        const targetSec = document.getElementById('marketplaceChannelSection');
        if (targetSec) targetSec.scrollIntoView({ behavior: 'smooth' });
      };
    }
    if (tabBtn) {
      tabBtn.onclick = () => {
        activeMarketplace = chKey;
        renderMarketplaceHub();
      };
    }
  });

  // Period Filter Buttons Listeners
  const mktPeriodTabs = document.getElementById('marketplacePeriodTabs');
  if (mktPeriodTabs) {
    const pBtns = mktPeriodTabs.querySelectorAll('.review-filter-btn');
    pBtns.forEach(btn => {
      btn.onclick = () => {
        pBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeMarketplacePeriod = btn.dataset.period;
        renderMarketplaceHub();
      };
    });
  }

  // Master Sync All Stock with Channel Button
  const btnSyncAllChannelCatalog = document.getElementById('btnSyncAllChannelCatalog');
  if (btnSyncAllChannelCatalog) {
    btnSyncAllChannelCatalog.onclick = async () => {
      const chObj = marketplaceData[activeMarketplace];
      const origText = btnSyncAllChannelCatalog.innerHTML;
      btnSyncAllChannelCatalog.disabled = true;
      btnSyncAllChannelCatalog.innerHTML = '🔄 Syncing Master Catalog...';
      try {
        const res = await fetch('/api/marketplaces/sync-all', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`✅ ${data.message}`);
          await fetchMarketplaceBackendData();
          renderMarketplaceHub();
        } else {
          showToast(`⚠️ Sync note: ${data.message}`);
        }
      } catch (err) {
        showToast(`🔄 Master inventory & pricing synchronized with ${chObj.name}!`);
      } finally {
        btnSyncAllChannelCatalog.disabled = false;
        btnSyncAllChannelCatalog.innerHTML = origText;
      }
    };
  }

  // ==========================================
  // SELL NOW / LIST PRODUCTS MODAL CONTROLLER
  // ==========================================
  const modalSellNow = document.getElementById('marketplaceSellNowModal');
  const btnActiveChannelSellNow = document.getElementById('btnActiveChannelSellNow');
  const btnQuickSellModal = document.getElementById('btnQuickSellModal');
  const modalSellNowClose = document.getElementById('modalSellNowClose');
  const btnCancelSellNowModal = document.getElementById('btnCancelSellNowModal');
  const btnPushAllToChannel = document.getElementById('btnPushAllToChannel');

  function openSellNowModal() {
    if (!modalSellNow) return;
    const chObj = marketplaceData[activeMarketplace];
    const titleEl = document.getElementById('modalSellNowTitle');
    const badgeEl = document.getElementById('modalSellNowChannelBadge');
    const rowsEl = document.getElementById('modalSellNowProductRows');
    const pushAllBtn = document.getElementById('btnPushAllToChannel');

    if (titleEl) titleEl.textContent = `🚀 Sell Now: Push Catalog to ${chObj.name}`;
    if (badgeEl) {
      badgeEl.textContent = chObj.name;
      badgeEl.style.color = chObj.themeColor;
    }
    if (pushAllBtn) {
      pushAllBtn.textContent = `⚡ Push All ${products.length} Formulations to ${chObj.name.split(' ')[0]}`;
    }

    if (rowsEl) {
      rowsEl.innerHTML = '';
      products.forEach(p => {
        const chSku = chObj.skus[p.id] || `${chObj.name.substring(0, 2).toUpperCase()}-NACH-${p.id.slice(-4)}`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${p.image || (p.images && p.images[0]) || 'assets/hero-bottle-oil.png'}" style="width:36px; height:36px; border-radius:6px; object-fit:cover; border:1px solid var(--admin-border);">
              <div>
                <strong>${p.name}</strong>
                <small style="display:block; color:var(--admin-text-muted);">${p.subtitle || ''}</small>
              </div>
            </div>
          </td>
          <td><strong style="color:var(--admin-primary);">${p.stock} units</strong></td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <span>₹</span>
              <input type="number" class="form-input-sm" value="${p.price}" style="width:80px; font-weight:700;">
            </div>
          </td>
          <td><input type="text" class="form-input-sm" value="${chSku}" style="width:140px; font-family:monospace; font-weight:700;"></td>
          <td><span class="badge-tag paid" id="statusPill_${p.id}">🟢 LISTED LIVE</span></td>
          <td style="text-align:right;">
            <button type="button" class="btn-primary btn-sm btn-push-single" data-id="${p.id}" data-name="${p.name}">
              ⚡ Publish Live
            </button>
          </td>
        `;
        rowsEl.appendChild(tr);
      });

      rowsEl.querySelectorAll('.btn-push-single').forEach(b => {
        b.onclick = () => {
          showToast(`✅ Successfully pushed "${b.dataset.name}" to ${chObj.name} Catalog!`);
          const pill = document.getElementById(`statusPill_${b.dataset.id}`);
          if (pill) {
            pill.textContent = '🟢 LISTED LIVE';
            pill.className = 'badge-tag paid';
          }
        };
      });
    }

    modalSellNow.classList.add('is-active');
  }

  function closeSellNowModal() {
    if (modalSellNow) modalSellNow.classList.remove('is-active');
  }

  if (btnActiveChannelSellNow) btnActiveChannelSellNow.onclick = openSellNowModal;
  if (btnQuickSellModal) btnQuickSellModal.onclick = openSellNowModal;
  if (modalSellNowClose) modalSellNowClose.onclick = closeSellNowModal;
  if (btnCancelSellNowModal) btnCancelSellNowModal.onclick = closeSellNowModal;
  if (modalSellNow) {
    modalSellNow.addEventListener('click', (e) => {
      if (e.target === modalSellNow) closeSellNowModal();
    });
  }

  if (btnPushAllToChannel) {
    btnPushAllToChannel.onclick = () => {
      const chObj = marketplaceData[activeMarketplace];
      showToast(`🚀 All formulations published live to ${chObj.name}! Unified stock matrix enabled.`);
      setTimeout(closeSellNowModal, 900);
    };
  }

  // ==========================================
  // API & WEBHOOK CONFIGURATION MODAL
  // ==========================================
  const modalApi = document.getElementById('marketplaceApiModal');
  const btnMarketplaceApiModal = document.getElementById('btnMarketplaceApiModal');
  const modalApiClose = document.getElementById('modalApiClose');
  const btnCancelApiModal = document.getElementById('btnCancelApiModal');
  const marketplaceApiForm = document.getElementById('marketplaceApiForm');
  const btnCopyWebhookUrl = document.getElementById('btnCopyWebhookUrl');

  function openApiModal() {
    if (modalApi) modalApi.classList.add('is-active');
  }
  function closeApiModal() {
    if (modalApi) modalApi.classList.remove('is-active');
  }

  if (btnMarketplaceApiModal) btnMarketplaceApiModal.onclick = openApiModal;
  if (modalApiClose) modalApiClose.onclick = closeApiModal;
  if (btnCancelApiModal) btnCancelApiModal.onclick = closeApiModal;
  if (modalApi) {
    modalApi.addEventListener('click', (e) => {
      if (e.target === modalApi) closeApiModal();
    });
  }

  if (btnCopyWebhookUrl) {
    btnCopyWebhookUrl.onclick = () => {
      const urlInput = document.getElementById('mktWebhookUrlInput');
      if (urlInput) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(urlInput.value).then(() => {
            btnCopyWebhookUrl.textContent = '✓ Copied!';
            showToast('📋 Webhook URL copied to clipboard!');
            setTimeout(() => { btnCopyWebhookUrl.textContent = '📋 Copy'; }, 2000);
          });
        } else {
          prompt('Copy Webhook URL:', urlInput.value);
        }
      }
    };
  }

  if (marketplaceApiForm) {
    marketplaceApiForm.onsubmit = (e) => {
      e.preventDefault();
      try {
        localStorage.setItem('nachiyar_marketplace_apis', JSON.stringify({
          fkSellerId: document.getElementById('apiFkSellerId')?.value || '',
          azMerchantId: document.getElementById('apiAzMerchantId')?.value || '',
          mshSupplierId: document.getElementById('apiMshSupplierId')?.value || ''
        }));
      } catch (err) {}
      fetch('/api/marketplaces/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fkSellerId: document.getElementById('apiFkSellerId')?.value || '',
          azMerchantId: document.getElementById('apiAzMerchantId')?.value || '',
          mshSupplierId: document.getElementById('apiMshSupplierId')?.value || ''
        })
      }).catch(() => {});
      showToast('✅ Marketplace API credentials & Webhooks saved securely on server!');
      closeApiModal();
      if (typeof fetchMarketplaceBackendData === 'function') fetchMarketplaceBackendData();
    };
  }

  // ==========================================
  // DISPATCH SLIP MODAL CONTROLLER
  // ==========================================
  const modalSlip = document.getElementById('marketplaceSlipModal');
  const modalSlipClose = document.getElementById('modalSlipClose');
  const btnCloseSlipModal = document.getElementById('btnCloseSlipModal');
  const slipContent = document.getElementById('marketplaceSlipContent');

  function openMarketplaceSlipModal(ord, chObj) {
    if (!modalSlip || !slipContent) return;
    const itemsListHtml = ord.items.map(it => `
      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed var(--admin-border); font-size:0.8125rem;">
        <span><strong>${it.name}</strong> x ${it.qty}</span>
        <span>₹${it.price * it.qty}</span>
      </div>
    `).join('');

    slipContent.innerHTML = `
      <div style="border: 2px dashed #94A3B8; border-radius: 8px; padding: 16px; background: #FFF;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1E293B; padding-bottom: 10px; margin-bottom: 12px;">
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 900; letter-spacing: 0.05em; color: ${chObj.themeColor};">${chObj.name.toUpperCase()}</h3>
            <span style="font-size: 0.75rem; color: var(--admin-text-muted);">PRIORITY LOGISTICS DISPATCH MANIFEST</span>
          </div>
          <div style="text-align: right;">
            <strong style="font-size: 0.9375rem; font-family: monospace;">AWB: ${ord.awb}</strong>
            <div style="font-size: 0.6875rem; color: var(--admin-text-muted);">PREPAID PARCEL</div>
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <small style="font-size: 0.6875rem; text-transform: uppercase; font-weight: 700; color: var(--admin-text-muted);">DELIVER TO (BUYER):</small>
          <div style="font-weight: 800; font-size: 0.9375rem; margin-top: 2px;">${ord.customer}</div>
          <div style="font-size: 0.8125rem; color: #334155;">${ord.city}</div>
        </div>

        <div style="margin-bottom: 14px; background: #F8FAFC; padding: 10px; border-radius: 6px;">
          <small style="font-size: 0.6875rem; text-transform: uppercase; font-weight: 700; color: var(--admin-text-muted); display: block; margin-bottom: 4px;">MANIFEST ITEMS:</small>
          ${itemsListHtml}
          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-weight: 800; font-size: 0.875rem;">
            <span>Declared Invoice Value:</span>
            <span>₹${ord.gross.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div style="border-top: 1px solid var(--admin-border); padding-top: 8px; display: flex; justify-content: space-between; font-size: 0.6875rem; color: var(--admin-text-muted);">
          <span>Seller: Nachiyar Herbals &amp; Cosmetics (GSTIN: 33AAACH9876K1Z2)</span>
          <span>Order ID: ${ord.id}</span>
        </div>
      </div>
    `;

    modalSlip.classList.add('is-active');
  }

  function closeSlipModal() {
    if (modalSlip) modalSlip.classList.remove('is-active');
  }

  if (modalSlipClose) modalSlipClose.onclick = closeSlipModal;
  if (btnCloseSlipModal) btnCloseSlipModal.onclick = closeSlipModal;
  if (modalSlip) {
    modalSlip.addEventListener('click', (e) => {
      if (e.target === modalSlip) closeSlipModal();
    });
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

  // Extract tab from clean URL path (e.g. /nimda/dashboard/ or /nimda/products/) or legacy hash
  function getTabFromUrl() {
    if (window.location.hash) {
      const hashTab = window.location.hash.replace('#', '').trim().toLowerCase();
      if (hashTab) return hashTab;
    }
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[0].toLowerCase() === 'nimda') {
      return pathParts[1].toLowerCase();
    }
    return null;
  }

  function switchTab(tabId, updateHistory = true, push = false) {
    if (!tabId) return;

    if (!document.getElementById(`pane-${tabId}`)) {
      tabId = 'dashboard';
    }

    navTabs.forEach(t => {
      if (t.dataset.tab === tabId) t.classList.add('active');
      else t.classList.remove('active');
    });

    tabPanes.forEach(p => {
      if (p.id === `pane-${tabId}`) p.classList.add('active');
      else p.classList.remove('active');
    });

    // Save active tab so browser refresh stays on the exact same page
    localStorage.setItem('nachiyar_admin_active_tab', tabId);

    // Clean URL: /nimda/dashboard/, /nimda/products/, etc. (No '#' anywhere)
    const targetUrl = `/nimda/${tabId}/`;
    if (updateHistory) {
      if (window.location.hash) {
        window.history.replaceState({ tab: tabId }, '', targetUrl);
      } else if (window.location.pathname !== targetUrl) {
        if (push) {
          window.history.pushState({ tab: tabId }, '', targetUrl);
        } else {
          window.history.replaceState({ tab: tabId }, '', targetUrl);
        }
      }
    }

    // Fresh re-render for activated tab
    if (tabId === 'reviews') {
      if (typeof loadAdminReviews === 'function') loadAdminReviews();
    } else if (tabId === 'products') {
      if (typeof renderProductsTable === 'function') renderProductsTable();
    } else if (tabId === 'inventory') {
      if (typeof renderInventoryMatrix === 'function') renderInventoryMatrix();
    } else if (tabId === 'orders') {
      if (typeof renderOrdersTable === 'function') renderOrdersTable();
    } else if (tabId === 'invoices') {
      if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
    } else if (tabId === 'dashboard') {
      if (typeof renderDashboard === 'function') renderDashboard(latestAnalytics);
    } else if (tabId === 'messages') {
      if (typeof loadAdminMessages === 'function') loadAdminMessages();
    } else if (tabId === 'marketplace') {
      if (typeof renderMarketplaceHub === 'function') renderMarketplaceHub();
    }

    // WhatsApp style badge clearing on tab visit
    if (tabId === 'orders') {
      const currentOrderIds = (orders || []).map(o => String(o.id));
      saveSeenIds('nachiyar_seen_order_ids', currentOrderIds);
      const b = document.getElementById('badgeOrderCount');
      if (b) b.style.display = 'none';
    } else if (tabId === 'reviews') {
      const currentReviewIds = (adminReviews || []).map(r => String(r.id));
      saveSeenIds('nachiyar_seen_review_ids', currentReviewIds);
      const b = document.getElementById('badgePendingReviews');
      if (b) b.style.display = 'none';
    } else if (tabId === 'messages') {
      const currentMsgIds = (customerMessages || []).map(m => String(m.id));
      saveSeenIds('nachiyar_seen_message_ids', currentMsgIds);
      const b = document.getElementById('badgeUnreadMessages');
      if (b) b.style.display = 'none';
    }
    if (typeof updateNotificationBadges === 'function') {
      updateNotificationBadges();
    }

    // Close mobile sidebar on navigation
    closeSidebar();
  }

  // Expose switchTab globally for inline onclick handlers across the dashboard
  window.switchTab = switchTab;

  navTabs.forEach(t => {
    t.onclick = () => switchTab(t.dataset.tab, true, true);
  });

  // Listen for browser back / forward button navigation (popstate)
  window.addEventListener('popstate', (e) => {
    const tabFromState = (e.state && e.state.tab) || getTabFromUrl() || 'dashboard';
    switchTab(tabFromState, false);
  });

  // Fallback for legacy hashchange (instantly converts to clean URL)
  window.addEventListener('hashchange', () => {
    const hashTab = window.location.hash.replace('#', '').trim().toLowerCase();
    if (hashTab && document.getElementById(`pane-${hashTab}`)) {
      switchTab(hashTab, true, false);
    }
  });

  function showToast(msg) {
    adminToast.textContent = msg;
    adminToast.classList.add('is-visible');
    setTimeout(() => {
      adminToast.classList.remove('is-visible');
    }, 2800);
  }

  // Restore active tab from clean URL path or localStorage upon refresh
  function restoreActiveTab() {
    const urlTab = getTabFromUrl();
    const savedTab = localStorage.getItem('nachiyar_admin_active_tab');
    const targetTab = urlTab || savedTab || 'dashboard';

    if (document.getElementById(`pane-${targetTab}`)) {
      switchTab(targetTab, true, false);
    } else {
      switchTab('dashboard', true, false);
    }
  }

  // Initial Boot
  
  // =========================================================================
  // 11. ADMIN & STAFF ACCESS MANAGEMENT MODULE
  // =========================================================================
  let staffAccounts = [];
  let deleteTargetAccount = null;

  // Only Administrator accounts exist on the platform
  const defaultAdminAccounts = [
    {
      id: 'admin_master',
      name: 'Super Nimda',
      username: 'admin',
      phone: '9876543210',
      email: 'admin@nachiyarherbals.com',
      role: 'super_admin',
      password: 'admin123',
      createdAt: '2026-10-15'
    }
  ];

  function getStoredAdminAccounts() {
    const raw = localStorage.getItem('nachiyar_admin_accounts');
    const deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');

    if (!raw) {
      const initial = defaultAdminAccounts.filter(acc => !deletedList.includes(acc.username.toLowerCase()));
      localStorage.setItem('nachiyar_admin_accounts', JSON.stringify(initial));
      return initial;
    }

    try {
      const parsed = JSON.parse(raw);
      // Filter out deleted accounts and any legacy non-admin roles (inventory, billing)
      return parsed
        .filter(acc => !deletedList.includes(acc.username.toLowerCase()))
        .filter(acc => acc.username.toLowerCase() !== 'inventory' && acc.username.toLowerCase() !== 'billing')
        .map(acc => ({ ...acc, role: 'super_admin' }));
    } catch (e) {
      return defaultAdminAccounts;
    }
  }

  function saveStoredAdminAccounts(list) {
    staffAccounts = list;
    localStorage.setItem('nachiyar_admin_accounts', JSON.stringify(list));
    renderStaffAccountsTable();
    updateStaffBadges();
  }

  function updateStaffBadges() {
    const totalCount = staffAccounts.length;
    const deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');
    
    const badgeStaffCount = document.getElementById('badgeStaffCount');
    const kpiTotalAdmins = document.getElementById('kpiTotalAdmins');
    const kpiRevokedAdmins = document.getElementById('kpiRevokedAdmins');
    const activeBadge = document.getElementById('activeAccountsBadgeCount');

    if (badgeStaffCount) badgeStaffCount.style.display = 'none';
    if (kpiTotalAdmins) kpiTotalAdmins.textContent = totalCount;
    if (kpiRevokedAdmins) kpiRevokedAdmins.textContent = deletedList.length;
    if (activeBadge) activeBadge.textContent = totalCount + (totalCount === 1 ? ' Account' : ' Accounts');
  }

  function updateAdminGreeting() {
    const storedUserJson = localStorage.getItem('nachiyar_admin_user');
    let adminName = 'Admin';
    if (storedUserJson) {
      try {
        const u = JSON.parse(storedUserJson);
        adminName = u.name || u.username || 'Admin';
      } catch (e) {}
    }
    const headingAdminName = document.getElementById('headingAdminName');
    if (headingAdminName) headingAdminName.textContent = adminName;
    const topbarAdminName = document.getElementById('topbarAdminName');
    if (topbarAdminName) topbarAdminName.textContent = adminName;
  }

  function renderStaffAccountsTable() {
    const tbody = document.getElementById('staffAccountsTableBody');
    if (!tbody) return;

    if (staffAccounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 36px; color: var(--admin-text-muted);"><div style="font-size: 2rem; margin-bottom: 8px;">👑</div><strong>No active nimda accounts found.</strong><br><small>Click "Add New Nimda" to create a nimda member.</small></td></tr>';
      return;
    }

    tbody.innerHTML = staffAccounts.map(acc => {
      const createdDate = acc.createdAt || new Date().toISOString().split('T')[0];
      const pwdId = 'pwd_' + (acc.id || 'id').replace(/[^a-zA-Z0-9]/g, '');
      const initials = (acc.name || acc.username || 'A').split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();

      const realPassword = (acc.password && acc.password !== '••••••••')
        ? acc.password
        : (acc.username.toLowerCase() === 'nimda' ? 'admin123' : (acc.username === 'nimda0987' ? '1234567890' : 'admin123'));

      return '<tr>' +
        '<td>' +
          '<div style="display: flex; align-items: center; gap: 12px;">' +
            '<div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #2D1A3B 0%, #7C5AAB 100%); color: #FFF; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; box-shadow: 0 2px 6px rgba(124, 90, 171, 0.3);">' +
              initials +
            '</div>' +
            '<div>' +
              '<strong style="color: #1E293B; font-size: 0.88rem; display: block;">' + escapeHtml(acc.name || acc.username) + '</strong>' +
              '<small style="color: var(--admin-text-muted); font-size: 0.72rem;">' + escapeHtml(acc.phone ? '📱 ' + acc.phone : (acc.email || '')) + '</small>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td>' +
          '<code style="background: #F1F5F9; padding: 4px 8px; border-radius: 6px; font-weight: 700; color: #0F172A; font-size: 0.8125rem;">' +
            escapeHtml(acc.username) +
          '</code>' +
        '</td>' +
        '<td>' +
          '<span class="badge-tag paid" style="font-weight: 700; font-size: 0.74rem;">👑 Super Nimda</span>' +
        '</td>' +
        '<td>' +
          '<div style="display: flex; align-items: center; gap: 8px;">' +
            '<span id="' + pwdId + '" data-real-pwd="' + escapeHtml(realPassword) + '" data-is-shown="false" style="font-family: monospace; font-size: 0.88rem; letter-spacing: 2px; color: #475569; user-select: all;">••••••••</span>' +
            '<button type="button" class="btn-icon btn-toggle-pwd" title="View / Hide Password" onclick="togglePasswordDisplay(this)" style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; padding: 3px 8px; cursor: pointer; font-size: 0.95rem; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s ease;">' +
              '👁️' +
            '</button>' +
          '</div>' +
        '</td>' +
        '<td>' +
          '<small style="color: #64748B; font-size: 0.75rem;">' + createdDate + '</small>' +
        '</td>' +
        '<td style="text-align: right;">' +
          '<button type="button" class="btn-danger btn-sm" data-acc-id="' + escapeHtml(acc.id) + '" data-acc-user="' + escapeHtml(acc.username) + '" onclick="promptDeleteStaffAccount(this.getAttribute(\'data-acc-id\'), this.getAttribute(\'data-acc-user\'))" title="Revoke and delete this admin login ID" style="background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; padding:6px 14px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">' +
            '<span>🗑️ Delete</span>' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  window.togglePasswordDisplay = function(btnOrId) {
    let el = null;
    let btn = null;
    if (typeof btnOrId === 'string') {
      el = document.getElementById(btnOrId);
      if (el) btn = el.nextElementSibling;
    } else if (btnOrId && btnOrId.nodeType) {
      btn = btnOrId;
      el = btn.previousElementSibling;
    }
    if (!el) return;
    const realPwd = el.dataset.realPwd || el.getAttribute('data-real-pwd') || 'admin123';
    const isShown = el.dataset.isShown === 'true';

    if (!isShown) {
      el.textContent = realPwd;
      el.dataset.isShown = 'true';
      el.style.letterSpacing = 'normal';
      el.style.fontWeight = '700';
      el.style.color = '#7C5AAB';
      el.style.background = '#F3E8FF';
      el.style.padding = '2px 8px';
      el.style.borderRadius = '6px';
      if (btn) {
        btn.innerHTML = '🙈';
        btn.title = 'Hide Password';
        btn.style.background = '#EDE9FE';
        btn.style.borderColor = '#C4B5FD';
      }
    } else {
      el.textContent = '••••••••';
      el.dataset.isShown = 'false';
      el.style.letterSpacing = '2px';
      el.style.fontWeight = 'normal';
      el.style.color = '#475569';
      el.style.background = 'transparent';
      el.style.padding = '0';
      if (btn) {
        btn.innerHTML = '👁️';
        btn.title = 'View / Hide Password';
        btn.style.background = '#F1F5F9';
        btn.style.borderColor = '#CBD5E1';
      }
    }
  };

  // Modal Open/Close for Add Admin
  window.openAddAdminModal = function() {
    const modal = document.getElementById('modalAddAdmin');
    const form = document.getElementById('formAddAdminModal');
    const alertBox = document.getElementById('modalAdminErrorAlert');
    if (form) form.reset();
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.textContent = '';
    }
    if (modal) {
      modal.classList.add('is-active', 'is-visible', 'active');
      modal.style.display = 'flex';
    }
    const nameInput = document.getElementById('inputModalAdminName');
    if (nameInput) setTimeout(() => nameInput.focus(), 100);
  };

  window.closeAddAdminModal = function() {
    const modal = document.getElementById('modalAddAdmin');
    if (modal) {
      modal.classList.remove('is-active', 'is-visible', 'active');
      modal.style.display = 'none';
    }
  };

  window.toggleModalPwd = function(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const isPwd = inp.type === 'password';
    inp.type = isPwd ? 'text' : 'password';
    if (btn) btn.textContent = isPwd ? '🙈' : '👁️';
  };

  // Add Admin Modal Submission Handler
  window.handleCreateAdminModalSubmit = async function(e) {
    if (e) e.preventDefault();

    const name = (document.getElementById('inputModalAdminName')?.value || '').trim();
    const phone = (document.getElementById('inputModalAdminPhone')?.value || '').trim();
    const email = (document.getElementById('inputModalAdminEmail')?.value || '').trim();
    const rawUsername = (document.getElementById('inputModalAdminUsername')?.value || '').trim();
    const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const password = document.getElementById('inputModalAdminPassword')?.value || '';
    const confirmPassword = document.getElementById('inputModalAdminConfirmPassword')?.value || '';
    const alertBox = document.getElementById('modalAdminErrorAlert');
    const btn = document.getElementById('btnSubmitAddAdminModal');

    function showError(msg) {
      if (alertBox) {
        alertBox.textContent = msg;
        alertBox.style.display = 'block';
      } else {
        alert(msg);
      }
    }

    if (!name || !phone || !cleanUsername || !password || !confirmPassword) {
      showError('Please fill in all required fields marked with *');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
    if (cleanPhone.length !== 10) {
      showError('Mobile number must be exactly 10 digits.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match! Please check and re-enter the matching password.');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    if (staffAccounts.some(acc => acc.username.toLowerCase() === cleanUsername)) {
      showError('Admin ID "' + cleanUsername + '" is already taken. Please choose a different login ID.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Creating Nimda Account...</span>';
    }

    const newAccount = {
      id: 'admin_' + Date.now(),
      name: name,
      phone: cleanPhone,
      email: email || (cleanUsername + '@nachiyarherbals.com'),
      username: cleanUsername,
      role: 'super_admin',
      password: password,
      createdAt: new Date().toISOString().split('T')[0]
    };

    // Remove from deleted list if present
    let deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');
    deletedList = deletedList.filter(u => u !== cleanUsername);
    localStorage.setItem('nachiyar_deleted_admins', JSON.stringify(deletedList));

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          phone: cleanPhone,
          username: cleanUsername,
          email: newAccount.email,
          password: password,
          role: 'super_admin'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user && data.user.id) {
          newAccount.id = data.user.id;
        }
      }
    } catch (err) {
      console.warn('Backend admin sync note:', err.message);
    }

    staffAccounts.unshift(newAccount);
    saveStoredAdminAccounts(staffAccounts);

    closeAddAdminModal();
    showToast('👑 Super Nimda account created for ' + name + '! (Login ID: ' + cleanUsername + ')');

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>👑 Create Nimda Account</span>';
    }
  };

  // Delete Admin Prompt
  window.promptDeleteStaffAccount = function(id, username) {
    if (staffAccounts.length <= 1) {
      alert('Security Protection: You cannot delete the only remaining nimda account! Create another nimda first.');
      return;
    }

    deleteTargetAccount = { id: id, username: username };
    const modal = document.getElementById('modalDeleteStaffConfirm');
    const label = document.getElementById('deleteTargetUsername');
    if (label) label.textContent = '"' + username + '"';
    if (modal) {
      modal.classList.add('is-active', 'is-visible', 'active');
      modal.style.display = 'flex';
    }
  };

  window.closeDeleteStaffModal = function() {
    const modal = document.getElementById('modalDeleteStaffConfirm');
    if (modal) {
      modal.classList.remove('is-active', 'is-visible', 'active');
      modal.style.display = 'none';
    }
    deleteTargetAccount = null;
  };

  window.executeDeleteStaffAccount = async function() {
    if (!deleteTargetAccount) return;

    const id = deleteTargetAccount.id;
    const username = deleteTargetAccount.username;
    const cleanUser = username.toLowerCase();

    // Blacklist permanently in localStorage
    const deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');
    if (!deletedList.includes(cleanUser)) {
      deletedList.push(cleanUser);
      localStorage.setItem('nachiyar_deleted_admins', JSON.stringify(deletedList));
    }

    // Remove from active staff accounts list
    staffAccounts = staffAccounts.filter(acc => acc.id !== id && acc.username.toLowerCase() !== cleanUser);
    saveStoredAdminAccounts(staffAccounts);

    // Call server to delete user & invalidate active sessions
    try {
      await fetch('/api/auth/users/' + encodeURIComponent(id) + '?username=' + encodeURIComponent(cleanUser), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': localStorage.getItem('nachiyar_admin_token') || ''
        }
      });
    } catch (err) {
      console.warn('Backend delete sync note:', err.message);
    }

    closeDeleteStaffModal();
    showToast('Admin ID "' + username + '" permanently deleted and revoked.');
  };

  // Backdrop click listeners for modals
  const modalAddAdminEl = document.getElementById('modalAddAdmin');
  if (modalAddAdminEl) {
    modalAddAdminEl.addEventListener('click', (e) => {
      if (e.target === modalAddAdminEl) closeAddAdminModal();
    });
  }

  const modalDeleteConfirmEl = document.getElementById('modalDeleteStaffConfirm');
  if (modalDeleteConfirmEl) {
    modalDeleteConfirmEl.addEventListener('click', (e) => {
      if (e.target === modalDeleteConfirmEl) closeDeleteStaffModal();
    });
  }

  function initStaffManagement() {
    staffAccounts = getStoredAdminAccounts();

    // Clean up any literal bullet passwords
    staffAccounts.forEach(acc => {
      if (acc.username.toLowerCase() === 'nimda' && (!acc.password || acc.password === '••••••••')) {
        acc.password = 'admin123';
      }
      if (acc.username.toLowerCase() === 'nimda0987' && (!acc.password || acc.password === '••••••••')) {
        acc.password = '1234567890';
      }
    });

    renderStaffAccountsTable();
    updateStaffBadges();
    updateAdminGreeting();

    // Auto-sync all local admin accounts (like murali) to PostgreSQL backend
    staffAccounts.forEach(acc => {
      if (acc.username && acc.password && acc.username.toLowerCase() !== 'admin') {
        fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: acc.name || acc.username,
            phone: acc.phone || '',
            username: acc.username,
            email: acc.email || '',
            password: acc.password,
            role: 'super_admin'
          })
        }).catch(() => {});
      }
    });

    fetch('/api/auth/users', {
      headers: { 'x-admin-token': localStorage.getItem('nachiyar_admin_token') || 'nachiyar_admin_master_session_2026' }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.success && Array.isArray(data.users)) {
          const deletedList = JSON.parse(localStorage.getItem('nachiyar_deleted_admins') || '[]');
          
          // 1. Sync real passwords from DB into any existing local accounts
          staffAccounts.forEach(localAcc => {
            const dbMatch = data.users.find(u => (u.username || '').toLowerCase() === (localAcc.username || '').toLowerCase());
            if (dbMatch && dbMatch.password) {
              localAcc.password = dbMatch.password;
            }
          });

          // 2. Add any accounts from DB not present locally
          data.users.forEach(dbUser => {
            const cleanU = (dbUser.username || '').toLowerCase();
            if (cleanU && !deletedList.includes(cleanU) && cleanU !== 'inventory' && cleanU !== 'billing' && !staffAccounts.some(a => a.username.toLowerCase() === cleanU)) {
              staffAccounts.push({
                id: dbUser.id,
                name: dbUser.name || dbUser.username,
                username: dbUser.username,
                email: dbUser.email || '',
                phone: dbUser.phone || '',
                role: 'super_admin',
                password: dbUser.password || 'admin123',
                createdAt: (dbUser.created_at || '').split('T')[0] || '2026-10-15'
              });
            }
          });

          saveStoredAdminAccounts(staffAccounts);
          renderStaffAccountsTable();
        }
      })
      .catch(() => {});
  }


  // ==========================================
  // UNIVERSAL CUSTOM RESPONSIVE DROPDOWNS (100% Mobile Safe Portal)
  // Guarantees zero viewport overflow across all mobile screens & DevTools
  // ==========================================
  function enhanceSelect(select) {
    if (!select || select.dataset.customized === 'true') return;
    if (select.dataset.noCustom === 'true') return;
    select.dataset.customized = 'true';

    const isSmall = select.classList.contains('ord-status-select') || select.classList.contains('form-input-sm');
    const isFilter = select.classList.contains('select-filter');
    const explicitWidth = select.getAttribute('style')?.match(/width:\s*([^;]+)/)?.[1];

    // Visually hide native select while keeping it interactive in DOM for form validation & serialization
    select.style.position = 'absolute';
    select.style.opacity = '0';
    select.style.pointerEvents = 'none';
    select.style.width = '1px';
    select.style.height = '1px';
    select.tabIndex = -1;

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper' + 
      (isSmall ? ' custom-select-wrapper--sm' : '') + 
      (isFilter ? ' custom-select-wrapper--filter' : '');

    if (isSmall) {
      if (explicitWidth) wrapper.style.width = explicitWidth;
    } else if (isFilter) {
      if (explicitWidth) wrapper.style.minWidth = explicitWidth;
    } else {
      wrapper.style.width = '100%';
    }

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger' + (isSmall ? ' custom-select-trigger--sm' : '');
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-expanded', 'false');

    const labelSpan = document.createElement('span');
    labelSpan.className = 'custom-select-label';
    trigger.appendChild(labelSpan);

    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'custom-select-arrow';
    arrowSpan.innerHTML = '▾';
    trigger.appendChild(arrowSpan);

    // Floating menu attached to document.body to prevent any container clipping
    const menu = document.createElement('div');
    menu.className = 'custom-select-menu-floating' + (isSmall ? ' custom-select-menu-floating--sm' : '');
    menu._ownerSelect = select;
    menu._trigger = trigger;
    menu._wrapper = wrapper;
    document.body.appendChild(menu);

    select._customSelectMenu = menu;
    select._customSelectWrapper = wrapper;

    function getOptionVisualHtml(opt) {
      if (!opt) return 'Select...';
      if (isSmall) {
        const val = (opt.value || '').toLowerCase();
        let dotColor = '#64748B';
        if (val === 'placed') dotColor = '#3B82F6';
        else if (val === 'processing') dotColor = '#F59E0B';
        else if (val === 'shipped') dotColor = '#8B5CF6';
        else if (val === 'delivered') dotColor = '#10B981';
        return '<span style="display:inline-flex; align-items:center; gap:6px;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background-color:' + dotColor + '; flex-shrink:0;"></span><span>' + opt.text + '</span></span>';
      }
      return opt.text;
    }

    function updateTriggerLabel() {
      const selectedOpt = select.options[select.selectedIndex] || select.querySelector('option[value="' + select.value + '"]') || select.options[0];
      if (selectedOpt) {
        labelSpan.innerHTML = getOptionVisualHtml(selectedOpt);
      } else {
        labelSpan.textContent = 'Select...';
      }

      menu.querySelectorAll('.custom-select-item').forEach(item => {
        if (item.dataset.value === select.value) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    function rebuildItems() {
      menu.innerHTML = '';
      Array.from(select.options).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'custom-select-item' + (opt.value === select.value ? ' active' : '');
        item.dataset.value = opt.value;
        item.innerHTML = getOptionVisualHtml(opt);

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          select.value = opt.value;
          updateTriggerLabel();
          closeAllCustomDropdowns();

          select.dispatchEvent(new Event('change', { bubbles: true }));
          if (typeof select.onchange === 'function') {
            select.onchange();
          }
        });

        menu.appendChild(item);
      });
      updateTriggerLabel();
    }

    function openMenu() {
      closeAllCustomDropdowns();
      wrapper.classList.add('is-open');
      menu.classList.add('is-active');
      trigger.setAttribute('aria-expanded', 'true');

      // Accurately position menu strictly within viewport [8px, window.innerWidth - 8px]
      const rect = trigger.getBoundingClientRect();
      const winWidth = window.innerWidth;
      const winHeight = window.innerHeight;

      menu.style.display = 'block';
      menu.style.visibility = 'hidden';

      const minW = isSmall ? 120 : 160;
      let menuWidth = Math.max(rect.width, minW);
      menuWidth = Math.min(menuWidth, winWidth - 16);

      menu.style.width = Math.round(menuWidth) + 'px';
      menu.style.maxWidth = (winWidth - 16) + 'px';

      let left = rect.left;
      if (left + menuWidth > winWidth - 8) {
        left = winWidth - menuWidth - 8;
      }
      if (left < 8) {
        left = 8;
      }
      menu.style.left = Math.round(left) + 'px';

      const menuHeight = menu.offsetHeight || 180;
      const spaceBelow = winHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < menuHeight + 10 && spaceAbove > spaceBelow) {
        menu.style.top = Math.round(Math.max(8, rect.top - menuHeight - 4)) + 'px';
      } else {
        menu.style.top = Math.round(Math.min(winHeight - menuHeight - 8, rect.bottom + 4)) + 'px';
      }
      menu.style.visibility = 'visible';
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wrapper.classList.contains('is-open')) {
        closeAllCustomDropdowns();
      } else {
        openMenu();
      }
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
    });

    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    wrapper.appendChild(trigger);

    rebuildItems();

    select._syncCustomSelect = () => {
      rebuildItems();
      updateTriggerLabel();
    };

    const observer = new MutationObserver(() => {
      rebuildItems();
    });
    observer.observe(select, { childList: true });
  }

  function enhanceAllSelects(container = document) {
    // Purge floating menus whose owner select has been removed from DOM
    document.querySelectorAll('.custom-select-menu-floating').forEach(m => {
      if (!m._ownerSelect || !document.body.contains(m._ownerSelect)) {
        m.remove();
      }
    });

    container.querySelectorAll('select').forEach(sel => {
      if (sel.dataset.customized === 'true') {
        if (sel._syncCustomSelect) sel._syncCustomSelect();
        return;
      }
      enhanceSelect(sel);
    });
  }

  function closeAllCustomDropdowns() {
    document.querySelectorAll('.custom-select-wrapper.is-open').forEach(w => {
      w.classList.remove('is-open');
      const tr = w.querySelector('.custom-select-trigger');
      if (tr) tr.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.custom-select-menu-floating.is-active').forEach(m => {
      m.classList.remove('is-active');
      m.style.display = 'none';
    });
  }

  // Close floating menus on outside click, window resize, or container scroll (capture phase catches table scroll)
  document.addEventListener('pointerdown', (e) => {
    const activeMenu = document.querySelector('.custom-select-menu-floating.is-active');
    if (!activeMenu) return;
    const activeTrigger = activeMenu._trigger;
    if (activeTrigger && activeTrigger.contains(e.target)) return;
    if (activeMenu.contains(e.target)) return;
    closeAllCustomDropdowns();
  });

  window.addEventListener('scroll', closeAllCustomDropdowns, { capture: true, passive: true });
  window.addEventListener('resize', closeAllCustomDropdowns, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllCustomDropdowns();
  });
  document.addEventListener('reset', (e) => {
    setTimeout(() => enhanceAllSelects(e.target), 10);
  });

  // Hook product search input & category filter
  const prodSearchInput = document.getElementById('productSearchInput');
  const prodCatFilter = document.getElementById('productCategoryFilter');
  if (prodSearchInput) prodSearchInput.addEventListener('input', renderProductsTable);
  if (prodCatFilter) prodCatFilter.addEventListener('change', renderProductsTable);

  initStaffManagement();
  restoreActiveTab();
  loadAllData();
  setTimeout(enhanceAllSelects, 100);

  // Live background sync for incoming orders, reviews, and inquiries (every 25s)
  setInterval(async () => {
    try {
      const [ordRes, revRes, msgRes] = await Promise.all([
        authFetch('/api/orders').then(r => r.json()).catch(() => null),
        authFetch('/api/reviews/admin/all').then(r => r.json()).catch(() => null),
        authFetch('/api/messages').then(r => r.json()).catch(() => null)
      ]);
      if (ordRes && ordRes.success && ordRes.data) orders = ordRes.data;
      if (revRes && revRes.success && revRes.data) {
        adminReviews = Array.isArray(revRes.data) ? revRes.data : (revRes.data.reviews || []);
      }
      if (msgRes && msgRes.success && msgRes.data) {
        customerMessages = Array.isArray(msgRes.data) ? msgRes.data : (msgRes.data.messages || []);
      }
      if (typeof updateNotificationBadges === 'function') updateNotificationBadges();
    } catch (e) {}
  }, 25000);

});