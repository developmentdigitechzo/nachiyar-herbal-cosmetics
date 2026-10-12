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
    ensureMobileCurvedBottomNav();
    if (!window.location.pathname.includes('account.html')) {
      injectAccountUI();
      bindNavbarAccountButton();
    }
    updateNavbarUserState();

    // Auto open drawer if redirected from login/register
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('open_account') === 'true' && !window.location.pathname.includes('account.html')) {
      setTimeout(openAccountDrawer, 300);
    }
  });

  // Curved Floating Bottom Navigation Bar for Mobile (Home, Shop Rituals, About Us, Contact)
  function ensureMobileCurvedBottomNav() {
    // 1. Remove any legacy hamburger toggles and drawers
    const existingToggle = document.getElementById('mobileNavToggle');
    if (existingToggle) existingToggle.remove();
    document.querySelectorAll('.mobile-nav-toggle').forEach(el => el.remove());

    const existingDrawer = document.getElementById('mobileDrawer');
    if (existingDrawer) existingDrawer.remove();
    document.querySelectorAll('.mobile-drawer').forEach(el => el.remove());

    if (document.getElementById('mobileCurvedBottomNav')) return;

    const NAV_ITEMS = [
      {
        id: 'home',
        name: 'Home',
        url: '/',
        match: ['/', '/index.html', 'index.html'],
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10.5z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
      },
      {
        id: 'shop',
        name: 'Shop Rituals',
        url: 'shop.html',
        match: ['shop.html', 'product.html'],
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
      },
      {
        id: 'about',
        name: 'About Us',
        url: 'about.html',
        match: ['about.html'],
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13C4 7 11 2 20 2c0 9-5 16-11 16z"/><path d="M8 16c2-3 5-6 9-8"/></svg>`
      },
      {
        id: 'contact',
        name: 'Contact',
        url: 'contact.html',
        match: ['contact.html'],
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>`
      }
    ];

    // Detect active page index
    const currentPath = (window.location.pathname || '').toLowerCase();
    let activeIndex = -1;

    for (let idx = 0; idx < NAV_ITEMS.length; idx++) {
      const item = NAV_ITEMS[idx];
      let matched = false;
      for (const pattern of item.match) {
        if (pattern === '/' && (currentPath.endsWith('/') || currentPath === '' || currentPath.endsWith('index.html'))) {
          matched = true;
          break;
        } else if (pattern !== '/' && currentPath.includes(pattern)) {
          matched = true;
          break;
        }
      }
      if (matched) {
        activeIndex = idx;
        break;
      }
    }

    if (activeIndex === -1 && (currentPath === '' || currentPath.endsWith('/'))) {
      activeIndex = 0;
    }

    const nav = document.createElement('nav');
    nav.id = 'mobileCurvedBottomNav';
    nav.className = 'mobile-curved-bottom-nav';
    nav.setAttribute('aria-label', 'Mobile Navigation');

    nav.innerHTML = `
      <div class="mobile-nav-tabs" id="mobileNavTabs">
        <div class="mobile-nav-glider-wrapper" id="mobileNavGlider">
          <div class="nav-wave-shape">
            <svg viewBox="0 0 110 34" class="nav-wave-svg" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0,34 C 24,34 30,24 38,12 C 46,0 55,0 64,0 C 72,0 80,12 88,24 C 94,34 100,34 110,34 L 110,38 L 0,38 Z" fill="#FFFFFF"/>
              <path d="M 0,34 C 24,34 30,24 38,12 C 46,0 55,0 64,0 C 72,0 80,12 88,24 C 94,34 100,34 110,34" fill="none" stroke="rgba(124, 90, 171, 0.22)" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="nav-bubble-circle" id="navBubbleCircle">
            <div class="bubble-icon-slot" id="bubbleIconSlot"></div>
          </div>
        </div>
        ${NAV_ITEMS.map((item, idx) => `
          <a href="${item.url}" class="mobile-nav-tab ${idx === activeIndex ? 'is-active' : ''}" data-idx="${idx}">
            <span class="tab-icon-wrap">${item.icon}</span>
            <span class="tab-label">${item.name}</span>
          </a>
        `).join('')}
      </div>
    `;

    document.body.appendChild(nav);

    const glider = document.getElementById('mobileNavGlider');
    const bubble = document.getElementById('navBubbleCircle');
    const bubbleSlot = document.getElementById('bubbleIconSlot');
    const tabs = nav.querySelectorAll('.mobile-nav-tab');

    function updateActiveGlider(idx, animateBubble = true) {
      if (idx < 0 || idx >= NAV_ITEMS.length) {
        if (glider) glider.style.opacity = '0';
        tabs.forEach(t => t.classList.remove('is-active'));
        return;
      }
      if (glider) {
        glider.style.opacity = '1';
        glider.style.transform = `translateX(${idx * 100}%)`;
      }
      if (bubbleSlot) {
        bubbleSlot.innerHTML = NAV_ITEMS[idx].icon;
      }
      tabs.forEach((t, i) => {
        if (i === idx) {
          t.classList.add('is-active');
        } else {
          t.classList.remove('is-active');
        }
      });
      if (animateBubble && bubble) {
        bubble.classList.remove('is-bouncing');
        void bubble.offsetWidth;
        bubble.classList.add('is-bouncing');
      }
    }

    // Set initial position
    if (activeIndex >= 0) {
      updateActiveGlider(activeIndex, false);
    } else {
      if (glider) glider.style.opacity = '0';
    }

    // Bind smooth navigation and glide animation
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', (e) => {
        const isCurrent = (idx === activeIndex);
        if (isCurrent) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          updateActiveGlider(idx, true);
          return;
        }

        e.preventDefault();
        updateActiveGlider(idx, true);
        const targetUrl = tab.getAttribute('href');
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 220);
      });
    });
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
        openAccountDrawer();
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
      const dbOrders = json.data || [];
      const orderMap = new Map();
      dbOrders.forEach(o => orderMap.set(o.orderNumber, o));

      try {
        const localStored = JSON.parse(localStorage.getItem('nachiyar_customer_orders') || '[]');
        localStored.forEach(o => {
          if (o.orderNumber && !orderMap.has(o.orderNumber)) {
            orderMap.set(o.orderNumber, o);
          }
        });
      } catch (e) {}

      const orders = Array.from(orderMap.values());
      orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      if (countPill) countPill.textContent = `${orders.length} ${orders.length === 1 ? 'Order' : 'Orders'}`;

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
    } else if (status === 'cancel_requested') {
      stepIndex = 1;
      trackFillPercent = '30%';
      statusNotice = 'Cancellation requested by you. Admin review & refund processing in progress.';
    } else if (status === 'cancelled') {
      stepIndex = 0;
      trackFillPercent = '100%';
      statusNotice = 'Order cancelled. Amount refunded to original payment mode.';
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
            <div class="stepper-track-fill" style="width: ${trackFillPercent}; ${status === 'cancelled' ? 'background:#DC2626;' : ''}"></div>

            <!-- Step 1: Placed -->
            <div class="stepper-node ${stepIndex >= 1 ? (stepIndex === 1 ? 'is-active' : 'is-done') : ''}">
              <div class="stepper-circle">${stepIndex > 1 ? '✓' : (status === 'cancelled' ? '✕' : '1')}</div>
              <span class="stepper-label">${status === 'cancelled' ? 'Cancelled' : 'Placed'}</span>
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
        <div class="tracking-status-notice" style="${status === 'cancelled' ? 'background:#FEE2E2; border-color:#FCA5A5;' : (status === 'cancel_requested' ? 'background:#FFEDD5; border-color:#FDBA74;' : '')}">
          <span>${status === 'cancelled' ? '🚫' : (status === 'cancel_requested' ? '⏳' : '⚡')}</span>
          <div>
            <strong>Status: ${(status === 'cancel_requested' ? 'CANCEL REQUESTED' : (status === 'cancelled' ? 'CANCELLED' : status)).toUpperCase()}</strong> — ${statusNotice}
          </div>
        </div>

        <!-- Ordered Items Preview -->
        <div class="order-items-preview">
          ${itemsHtml}
        </div>

        <!-- Actions -->
        <div style="margin-top:10px; text-align:right;">
          <a href="account.html" style="font-size:0.75rem; font-weight:700; color:var(--color-lavender-primary); text-decoration:none;">
            View Details / Cancel in Account →
          </a>
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
