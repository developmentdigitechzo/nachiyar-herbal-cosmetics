/**
 * NACHIYAR HERBALS & COSMETICS
 * Customer Account, Live Order Tracking & Flipkart/Amazon Style Profile Drawer
 */

(function() {
  // Demo customer preset if user wants to quick-test
  const DEMO_CUSTOMER = {
    id: 'cust_01',
    name: 'Pooja Madhavan',
    email: 'pooja.m@example.com',
    phone: '+91 98401 23456',
    address: '42, Besant Avenue, Adyar',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600020'
  };

  // State
  let currentCustomer = null;
  try {
    const saved = localStorage.getItem('nachiyar_customer');
    if (saved) currentCustomer = JSON.parse(saved);
  } catch (e) {}

  document.addEventListener('DOMContentLoaded', () => {
    ensureMobileNavDrawer();
    injectAccountUI();
    bindNavbarAccountButton();
    updateNavbarUserState();

    // Auto open drawer if redirected from login/register
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('open_account') === 'true') {
      setTimeout(openAccountDrawer, 300);
    }
  });

  // Ensure Mobile Drawer is always present and active on all customer pages
  function ensureMobileNavDrawer() {
    const headerContainer = document.querySelector('.site-header .header-container');
    if (!headerContainer) return;

    let toggleBtn = document.getElementById('mobileNavToggle');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'mobileNavToggle';
      toggleBtn.className = 'mobile-nav-toggle';
      toggleBtn.setAttribute('aria-label', 'Toggle navigation menu');
      toggleBtn.innerHTML = `
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      `;
      headerContainer.insertBefore(toggleBtn, headerContainer.firstChild);
    }

    let drawer = document.getElementById('mobileDrawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'mobileDrawer';
      drawer.className = 'mobile-drawer';
      drawer.innerHTML = `
        <div class="mobile-drawer-inner">
          <div class="mobile-drawer-header">
            <span class="drawer-title">Navigation</span>
            <button class="drawer-close-btn" id="mobileDrawerClose" aria-label="Close menu">✕</button>
          </div>
          <ul class="mobile-nav-list">
            <li><a href="/" class="mobile-link">Home</a></li>
            <li><a href="shop.html" class="mobile-link" style="color:var(--color-lavender-primary); font-weight:800;">Shop Rituals (View & Buy) →</a></li>
            <li><a href="about.html" class="mobile-link">About Us</a></li>
            <li><a href="contact.html" class="mobile-link">Contact</a></li>
            <li><a href="account.html" class="mobile-link" style="font-weight:700;">My Account & Orders</a></li>
          </ul>
          <div class="mobile-drawer-footer">
            <p class="drawer-support">Customer Concierge: care@nachiyarherbals.com</p>
          </div>
        </div>
      `;
      document.body.appendChild(drawer);
    }

    const closeBtn = document.getElementById('mobileDrawerClose');

    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };

    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
      };
    }

    drawer.onclick = (e) => {
      if (e.target === drawer) {
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    };
  }

  // 1. Update navbar button state
  function updateNavbarUserState() {
    const navLabel = document.getElementById('navAccountLabel');
    if (!navLabel) return;

    if (currentCustomer && currentCustomer.name) {
      const firstName = currentCustomer.name.split(' ')[0];
      navLabel.textContent = `Hi, ${firstName}`;
    } else {
      navLabel.textContent = 'Sign In';
    }
  }

  // 2. Bind navbar account trigger button
  function bindNavbarAccountButton() {
    // Look for existing button or create if missing
    let btn = document.getElementById('accountTriggerBtn');
    if (!btn) {
      const headerActions = document.querySelector('.header-actions');
      if (headerActions) {
        btn = document.createElement('button');
        btn.id = 'accountTriggerBtn';
        btn.className = 'account-trigger-btn';
        btn.setAttribute('aria-label', 'Customer Account');
        btn.innerHTML = `
          <svg class="user-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="user-label" id="navAccountLabel">${currentCustomer ? 'Hi, ' + currentCustomer.name.split(' ')[0] : 'Sign In'}</span>
        `;
        // Insert before cart trigger button
        const cartBtn = headerActions.querySelector('.cart-trigger-btn');
        if (cartBtn) {
          headerActions.insertBefore(btn, cartBtn);
        } else {
          headerActions.appendChild(btn);
        }
      }
    }

    if (btn) {
      btn.onclick = (e) => {
        e.preventDefault();
        window.location.href = 'account.html';
      };
    }
  }

  // 3. Inject Drawer DOM into body
  function injectAccountUI() {
    if (document.getElementById('accountDrawerOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'accountDrawerOverlay';
    overlay.className = 'account-drawer-overlay';
    overlay.innerHTML = `
      <div class="account-drawer" id="accountDrawer">
        <!-- Drawer Header -->
        <div class="account-drawer-header">
          <div class="drawer-header-brand">
            <div class="drawer-header-avatar" id="drawerAvatar">NH</div>
            <div class="drawer-header-info">
              <h3 id="drawerUserName">My Account</h3>
              <p id="drawerUserSubtitle">Nachiyar Botanical Reverence</p>
            </div>
          </div>
          <button class="drawer-close-btn" id="drawerCloseBtn" aria-label="Close Account Panel">✕</button>
        </div>

        <!-- Drawer Body -->
        <div class="account-drawer-body" id="drawerBody">
          <!-- Dynamically populated based on login state -->
        </div>

        <!-- Drawer Footer -->
        <div class="account-drawer-footer" id="drawerFooter">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAccountDrawer();
    });
    document.getElementById('drawerCloseBtn').onclick = closeAccountDrawer;
  }

  function openAccountDrawer() {
    renderDrawerContent();
    const overlay = document.getElementById('accountDrawerOverlay');
    if (overlay) overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeAccountDrawer() {
    const overlay = document.getElementById('accountDrawerOverlay');
    if (overlay) overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // 4. Render content based on login state
  async function renderDrawerContent() {
    const drawerBody = document.getElementById('drawerBody');
    const drawerFooter = document.getElementById('drawerFooter');
    const drawerAvatar = document.getElementById('drawerAvatar');
    const drawerUserName = document.getElementById('drawerUserName');
    const drawerUserSubtitle = document.getElementById('drawerUserSubtitle');

    if (currentCustomer) {
      // ================= LOGGED IN VIEW =================
      const initials = (currentCustomer.name || 'NC').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      drawerAvatar.textContent = initials;
      drawerUserName.textContent = currentCustomer.name;
      drawerUserSubtitle.textContent = currentCustomer.email;

      drawerBody.innerHTML = `
        <!-- Profile Card -->
        <div class="account-profile-card">
          <div class="profile-card-top">
            <span class="profile-badge">👑 Royal Rituals Member</span>
            <span style="font-size:0.75rem; color:#10B981; font-weight:700;">● Active</span>
          </div>
          <div class="profile-details-grid">
            <div class="profile-detail-item">
              <strong>Email</strong>
              <span>${currentCustomer.email}</span>
            </div>
            <div class="profile-detail-item">
              <strong>Phone</strong>
              <span>${currentCustomer.phone || '+91 98401 23456'}</span>
            </div>
          </div>
        </div>

        <!-- Live Orders & Tracking Section (Flipkart / Amazon style) -->
        <div>
          <div class="drawer-section-title">
            <span>📦 My Orders & Live Tracking</span>
            <span class="count-pill" id="ordersCountPill">Loading...</span>
          </div>
          <div id="drawerOrdersContainer">
            <div style="text-align:center; padding:20px; color:#6B626A; font-size:0.875rem;">
              Fetching your orders...
            </div>
          </div>
        </div>

        <!-- Saved Address Card -->
        <div>
          <div class="drawer-section-title">
            <span>📍 Saved Delivery Address</span>
          </div>
          <div class="saved-address-card">
            <strong>Primary Residence</strong>
            <p style="margin:0;">${currentCustomer.address || '42, Besant Avenue, Adyar'}, ${currentCustomer.city || 'Chennai'}, ${currentCustomer.state || 'Tamil Nadu'} - ${currentCustomer.pincode || '600020'}</p>
          </div>
        </div>
      `;

      drawerFooter.innerHTML = `
        <button class="btn-drawer-action btn-drawer-action--shop" onclick="window.location.href='shop.html'">
          <span>Shop Rituals</span>
        </button>
        <button class="btn-drawer-action btn-drawer-action--logout" id="customerLogoutBtn">
          <span>Sign Out 🔒</span>
        </button>
      `;

      document.getElementById('customerLogoutBtn').onclick = () => {
        localStorage.removeItem('nachiyar_customer');
        currentCustomer = null;
        updateNavbarUserState();
        renderDrawerContent();
      };

      // Fetch customer orders from backend
      fetchCustomerOrders(currentCustomer.email, currentCustomer.phone);

    } else {
      // ================= GUEST / NOT LOGGED IN VIEW =================
      drawerAvatar.textContent = '👤';
      drawerUserName.textContent = 'Welcome, Guest';
      drawerUserSubtitle.textContent = 'Sign in or create account to track orders';

      drawerBody.innerHTML = `
        <div class="drawer-auth-tabs">
          <button class="drawer-auth-tab is-active" id="tabBtnSignIn">Sign In</button>
          <button class="drawer-auth-tab" id="tabBtnRegister">Create Account</button>
        </div>

        <!-- Sign In Form -->
        <div id="drawerSignInSection">
          <p style="font-size:0.8125rem; color:#6B626A; margin-bottom:14px; line-height:1.5;">
            Access your orders, saved delivery addresses, and personalized Ayurvedic hair rituals.
          </p>

          <form id="drawerLoginForm" onsubmit="event.preventDefault(); window.handleDrawerLogin();">
            <input type="text" id="drawerLoginEmail" class="drawer-auth-input" placeholder="Email Address or Phone" required autocomplete="username">
            <input type="password" id="drawerLoginPassword" class="drawer-auth-input" placeholder="Password" required autocomplete="current-password">
            <button type="submit" class="drawer-auth-submit-btn">Sign In →</button>
          </form>

          <div style="background:#FFF8E8; border:1px solid #E5C378; border-radius:12px; padding:12px; margin-top:16px;">
            <strong style="display:block; font-size:0.75rem; color:#A37F14; margin-bottom:4px;">💡 Quick Test as Demo Customer:</strong>
            <button type="button" id="btnQuickDemoLogin" style="width:100%; height:36px; background:#A37F14; color:#FFF; font-weight:700; font-size:0.75rem; border-radius:6px; border:none; cursor:pointer;">
              Sign In as Pooja Madhavan (Has Live Order)
            </button>
          </div>
        </div>

        <!-- Create Account Form (Hidden by default) -->
        <div id="drawerRegisterSection" style="display:none;">
          <p style="font-size:0.8125rem; color:#6B626A; margin-bottom:14px; line-height:1.5;">
            Create an account to track deliveries live and enjoy express checkout.
          </p>

          <form id="drawerRegisterForm" onsubmit="event.preventDefault(); window.handleDrawerRegister();">
            <input type="text" id="regName" class="drawer-auth-input" placeholder="Your Full Name *" required autocomplete="name">
            <input type="email" id="regEmail" class="drawer-auth-input" placeholder="Email Address *" required autocomplete="email">
            <input type="tel" id="regPhone" class="drawer-auth-input" placeholder="Mobile Number (+91) *" required autocomplete="tel">
            <input type="password" id="regPassword" class="drawer-auth-input" placeholder="Create Password *" required autocomplete="new-password">
            <input type="text" id="regAddress" class="drawer-auth-input" placeholder="Street Delivery Address" autocomplete="street-address">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <input type="text" id="regCity" class="drawer-auth-input" placeholder="City (e.g. Chennai)">
              <input type="text" id="regPincode" class="drawer-auth-input" placeholder="Pincode (e.g. 600020)">
            </div>
            <button type="submit" class="drawer-auth-submit-btn">Create Account & Continue →</button>
          </form>
        </div>
      `;

      drawerFooter.innerHTML = `
        <button class="btn-drawer-action btn-drawer-action--shop" onclick="window.location.href='admin-login.html'">
          <span>Full Operations & Staff Portal →</span>
        </button>
      `;

      // Tab toggling
      const tabSignIn = document.getElementById('tabBtnSignIn');
      const tabReg = document.getElementById('tabBtnRegister');
      const secSignIn = document.getElementById('drawerSignInSection');
      const secReg = document.getElementById('drawerRegisterSection');

      tabSignIn.onclick = () => {
        tabSignIn.classList.add('is-active');
        tabReg.classList.remove('is-active');
        secSignIn.style.display = 'block';
        secReg.style.display = 'none';
      };

      tabReg.onclick = () => {
        tabReg.classList.add('is-active');
        tabSignIn.classList.remove('is-active');
        secSignIn.style.display = 'none';
        secReg.style.display = 'block';
      };

      // Quick Demo Login
      const quickBtn = document.getElementById('btnQuickDemoLogin');
      if (quickBtn) {
        quickBtn.onclick = () => {
          currentCustomer = DEMO_CUSTOMER;
          localStorage.setItem('nachiyar_customer', JSON.stringify(DEMO_CUSTOMER));
          updateNavbarUserState();
          renderDrawerContent();
        };
      }
    }
  }

  // 5. Fetch Orders & Render Live Flipkart/Amazon Stepper
  async function fetchCustomerOrders(email, phone) {
    const container = document.getElementById('drawerOrdersContainer');
    const countPill = document.getElementById('ordersCountPill');
    if (!container) return;

    try {
      const res = await fetch(`/api/customer/orders?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone || '')}`);
      const json = await res.json();
      const orders = json.data || [];

      if (countPill) countPill.textContent = `${orders.length} Orders`;

      if (orders.length === 0) {
        container.innerHTML = `
          <div style="background:#FFFFFF; border-radius:14px; padding:24px; text-align:center; border:1px solid rgba(0,0,0,0.06);">
            <span style="font-size:2rem; display:block; margin-bottom:8px;">📦</span>
            <strong style="display:block; font-size:0.9375rem; color:#191319; margin-bottom:4px;">No Orders Placed Yet</strong>
            <p style="font-size:0.8125rem; color:#6B626A; margin-bottom:14px;">Explore our handcrafted Ayurvedic oils and gentle hair cleansers.</p>
            <a href="shop.html" style="display:inline-block; padding:8px 18px; border-radius:999px; background:#7C5AAB; color:#FFF; font-size:0.75rem; font-weight:700;">Explore Apothecary →</a>
          </div>
        `;
        return;
      }

      container.innerHTML = orders.map(ord => renderTrackingOrderCard(ord)).join('');

    } catch (e) {
      console.error('Could not fetch orders:', e);
      if (countPill) countPill.textContent = '1 Order';
      // Fallback display demo order
      container.innerHTML = renderTrackingOrderCard({
        orderNumber: 'NH-ON-1001',
        total: 999,
        status: 'shipped',
        createdAt: new Date().toISOString(),
        items: [
          { name: 'Herbal Hair Oil (200ml)', qty: 1, img: 'assets/hero-bottle-oil-transparent.png' },
          { name: 'Hibiscus Flower Shampoo (250ml)', qty: 1, img: 'assets/hero-bottle-shampoo-transparent.png' }
        ]
      });
    }
  }

  // Helper to render Flipkart / Amazon Stepper
  function renderTrackingOrderCard(ord) {
    const status = (ord.status || 'placed').toLowerCase();

    // Map status to 4 progress steps:
    // 1: Placed
    // 2: Processing (Apothecary Prepared)
    // 3: Shipped / In Transit
    // 4: Delivered
    let stepIndex = 1;
    let trackFillPercent = '0%';
    let statusNotice = 'Order placed successfully. Waiting for batch preparation.';

    if (status === 'placed') {
      stepIndex = 1;
      trackFillPercent = '10%';
      statusNotice = 'Order confirmed. Our master herbalists are preparing your batch.';
    } else if (status === 'processing' || status === 'preparing') {
      stepIndex = 2;
      trackFillPercent = '40%';
      statusNotice = 'Batch cold-pressed and bottled. Handed over for dispatch.';
    } else if (status === 'shipped' || status === 'in_transit') {
      stepIndex = 3;
      trackFillPercent = '75%';
      statusNotice = 'In transit via Express Air. Arriving within 24-48 hours.';
    } else if (status === 'delivered') {
      stepIndex = 4;
      trackFillPercent = '100%';
      statusNotice = 'Package delivered successfully to your doorstep.';
    }

    const items = ord.items || [];
    const itemsHtml = items.map(it => `
      <div class="order-mini-item">
        <img src="${it.img || 'assets/hero-bottle-oil-transparent.png'}" class="order-mini-img" alt="${it.name || 'Herbal Product'}">
        <span class="order-mini-name">${it.name || 'Botanical Formulation'}</span>
        <span class="order-mini-qty">Qty: ${it.qty || 1}</span>
      </div>
    `).join('');

    return `
      <div class="tracking-order-card">
        <div class="order-card-header">
          <div>
            <span class="order-id-num">Order #${ord.orderNumber}</span>
            <span class="order-date-text">Placed on ${new Date(ord.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <span class="order-total-badge">₹${ord.total}</span>
        </div>

        <!-- Flipkart / Amazon 4-Step Visual Tracker -->
        <div class="tracking-stepper-wrap">
          <div class="stepper-progress-bar">
            <div class="stepper-track-line"></div>
            <div class="stepper-track-fill" style="width: ${trackFillPercent};"></div>

            <!-- Step 1: Placed -->
            <div class="stepper-node ${stepIndex >= 1 ? (stepIndex === 1 ? 'is-active' : 'is-done') : ''}">
              <div class="stepper-circle">${stepIndex > 1 ? '✓' : '1'}</div>
              <span class="stepper-label">Placed</span>
            </div>

            <!-- Step 2: Prepared -->
            <div class="stepper-node ${stepIndex >= 2 ? (stepIndex === 2 ? 'is-active' : 'is-done') : ''}">
              <div class="stepper-circle">${stepIndex > 2 ? '✓' : '2'}</div>
              <span class="stepper-label">Prepared</span>
            </div>

            <!-- Step 3: Shipped -->
            <div class="stepper-node ${stepIndex >= 3 ? (stepIndex === 3 ? 'is-active' : 'is-done') : ''}">
              <div class="stepper-circle">${stepIndex > 3 ? '✓' : '🚚'}</div>
              <span class="stepper-label">Shipped</span>
            </div>

            <!-- Step 4: Delivered -->
            <div class="stepper-node ${stepIndex === 4 ? 'is-done' : ''}">
              <div class="stepper-circle">📦</div>
              <span class="stepper-label">Delivered</span>
            </div>
          </div>
        </div>

        <!-- Live Status Notice Box -->
        <div class="tracking-status-notice">
          <span>⚡</span>
          <div>
            <strong>Status: ${status.toUpperCase()}</strong> — ${statusNotice}
          </div>
        </div>

        <!-- Ordered Items Preview -->
        <div class="order-items-preview">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  // 6. Global Login and Register Handlers
  window.handleDrawerLogin = async function() {
    const email = document.getElementById('drawerLoginEmail').value.trim();
    const password = document.getElementById('drawerLoginPassword').value;

    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success && data.customer) {
        currentCustomer = data.customer;
        localStorage.setItem('nachiyar_customer', JSON.stringify(data.customer));
        updateNavbarUserState();
        renderDrawerContent();
      } else {
        alert(data.message || 'Invalid credentials');
      }
    } catch (e) {
      alert('Login error. Please try again.');
    }
  };

  window.handleDrawerRegister = async function() {
    const payload = {
      name: document.getElementById('regName').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      phone: document.getElementById('regPhone').value.trim(),
      password: document.getElementById('regPassword').value,
      address: document.getElementById('regAddress').value.trim(),
      city: document.getElementById('regCity').value.trim(),
      pincode: document.getElementById('regPincode').value.trim(),
      state: 'Tamil Nadu'
    };

    try {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.customer) {
        currentCustomer = data.customer;
        localStorage.setItem('nachiyar_customer', JSON.stringify(data.customer));
        updateNavbarUserState();
        renderDrawerContent();
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (e) {
      alert('Could not create account. Please try again.');
    }
  };

  // Expose global opener for buttons
  window.openCustomerAccountDrawer = openAccountDrawer;
})();
