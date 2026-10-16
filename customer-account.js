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


  // ==========================================
  // LUXURY SIDE TOAST NOTIFICATION SYSTEM
  // ==========================================
  function showSideToast(optionsOrMessage, type = 'success', duration = 4800) {
    let title = '';
    let body = '';
    let icon = '🌿';

    if (typeof optionsOrMessage === 'object' && optionsOrMessage !== null) {
      title = optionsOrMessage.title || '';
      body = optionsOrMessage.message || optionsOrMessage.body || '';
      type = optionsOrMessage.type || type;
      duration = optionsOrMessage.duration || duration;
      if (optionsOrMessage.icon) icon = optionsOrMessage.icon;
    } else {
      const raw = String(optionsOrMessage || '').trim();
      if (raw.includes('\n')) {
        const parts = raw.split(/\n+/);
        title = parts[0].trim();
        body = parts.slice(1).join(' ').trim();
      } else {
        title = raw;
        body = '';
      }
    }

    const lowerTitle = title.toLowerCase();
    if (type === 'error' || lowerTitle.includes('please') || lowerTitle.includes('error') || lowerTitle.includes('invalid') || lowerTitle.includes('failed') || lowerTitle.includes('empty')) {
      type = 'error';
      icon = '⚠️';
    } else if (title.includes('🎁') || lowerTitle.includes('voucher') || lowerTitle.includes('privilege') || lowerTitle.includes('welcome') || lowerTitle.includes('code')) {
      type = 'info';
      icon = '✨';
      title = title.replace(/🎁/g, '').trim();
    } else if (title.includes('🌿')) {
      icon = '🌿';
      title = title.replace(/🌿/g, '').trim();
    } else if (title.includes('✓')) {
      icon = '✓';
      title = title.replace(/✓/g, '').trim();
    }

    let container = document.getElementById('sideToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sideToastContainer';
      container.className = 'side-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `side-toast side-toast--${type}`;
    toast.setAttribute('role', 'alert');

    toast.innerHTML = `
      <div class="side-toast-icon-wrap" aria-hidden="true">${icon}</div>
      <div class="side-toast-content">
        <div class="side-toast-title">${title}</div>
        ${body ? `<div class="side-toast-body">${body}</div>` : ''}
      </div>
      <button type="button" class="side-toast-close-btn" aria-label="Dismiss notification">✕</button>
      <div class="side-toast-progress-bar" style="animation: sideToastProgress ${duration}ms linear forwards;"></div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('is-shown');
      });
    });

    let dismissTimeout = null;
    const dismiss = () => {
      if (dismissTimeout) clearTimeout(dismissTimeout);
      toast.classList.remove('is-shown');
      toast.classList.add('is-leaving');
      setTimeout(() => {
        toast.remove();
        if (container && container.children.length === 0) {
          container.remove();
        }
      }, 450);
    };

    dismissTimeout = setTimeout(dismiss, duration);

    const closeBtn = toast.querySelector('.side-toast-close-btn');
    if (closeBtn) closeBtn.onclick = dismiss;

    toast.onmouseenter = () => {
      if (dismissTimeout) clearTimeout(dismissTimeout);
      const pb = toast.querySelector('.side-toast-progress-bar');
      if (pb) pb.style.animationPlayState = 'paused';
    };
    toast.onmouseleave = () => {
      dismissTimeout = setTimeout(dismiss, 1600);
      const pb = toast.querySelector('.side-toast-progress-bar');
      if (pb) pb.style.animationPlayState = 'running';
    };

    return toast;
  }

  window.showSideToast = showSideToast;
  window.showToast = showSideToast;

  if (typeof window !== 'undefined') {
    window.alert = function(msg) {
      showSideToast(msg);
    };
  }

  // State
  let currentCustomer = null;
  try {
    const saved = localStorage.getItem('nachiyar_customer');
    if (saved) currentCustomer = JSON.parse(saved);
  } catch (e) {}

  document.addEventListener('DOMContentLoaded', () => {
    ensureMobileCurvedBottomNav();
    if (!window.location.pathname.includes('account')) {
      injectAccountUI();
      bindNavbarAccountButton();
    }
    updateNavbarUserState();

    // Auto open drawer if redirected from login/register
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('open_account') === 'true' && !window.location.pathname.includes('account')) {
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
        btn = document.createElement('a'); btn.href = '/account/';
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
        // Direct navigation to dedicated /account/ dashboard (image 2)
        window.location.href = '/account/';
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
      if (currentCustomer.avatar && currentCustomer.avatar.startsWith('http')) {
        drawerAvatar.innerHTML = `<img src="${currentCustomer.avatar}" alt="${currentCustomer.name}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      } else {
        drawerAvatar.textContent = initials;
      }
      drawerUserName.textContent = currentCustomer.name;
      drawerUserSubtitle.textContent = currentCustomer.email;

      drawerBody.innerHTML = `
        <!-- Profile Card -->
        <div class="account-profile-card">
          <div class="profile-card-top">
            <span class="profile-badge">${currentCustomer.authProvider === 'google' ? '🌐 Google Verified Member' : '👑 Royal Rituals Member'}</span>
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
      drawerUserSubtitle.textContent = 'Choose your preferred sign-in method';

      drawerBody.innerHTML = `
        <!-- METHOD 1: SIGN IN WITH GOOGLE -->
        <div style="background:#FFFFFF; border:1.5px solid #E4DCEF; border-radius:18px; padding:20px; box-shadow:0 4px 16px rgba(124,90,171,0.08); margin-bottom:20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="background:#F3E8FF; color:#7C5AAB; font-size:0.72rem; font-weight:800; padding:4px 10px; border-radius:999px; text-transform:uppercase; letter-spacing:0.04em;">Method 1 • 1-Click Access</span>
            <span style="font-size:0.75rem; color:#15803D; font-weight:700;">⚡ Instant</span>
          </div>
          <h4 style="font-size:1.05rem; margin:0 0 6px; color:#191319; font-weight:700;">Sign in with Google</h4>
          <p style="font-size:0.8125rem; color:#6B626A; margin:0 0 16px; line-height:1.5;">
            Choose any Google account on your device to sign in or create an account instantly.
          </p>

          <button type="button" class="btn-google-signin" id="btnGoogleSignIn" onclick="window.handleGoogleSignIn()">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

        <div class="drawer-auth-divider">
          <span>OR</span>
        </div>

        <!-- METHOD 2: CREATE ACCOUNT -->
        <div style="background:#FFFFFF; border:1.5px solid #E4DCEF; border-radius:18px; padding:20px; box-shadow:0 4px 16px rgba(124,90,171,0.08);">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span style="background:#EDE8F2; color:#4A306D; font-size:0.72rem; font-weight:800; padding:4px 10px; border-radius:999px; text-transform:uppercase; letter-spacing:0.04em;">Method 2 • Manual Registration</span>
          </div>
          <h4 style="font-size:1.05rem; margin:0 0 6px; color:#191319; font-weight:700;">Create Account</h4>
          <p style="font-size:0.8125rem; color:#6B626A; margin:0 0 16px; line-height:1.5;">
            Enter your mobile number and password to track deliveries live.
          </p>

          <form id="drawerRegisterForm" onsubmit="event.preventDefault(); window.handleDrawerRegister();">
            <input type="text" id="regName" class="drawer-auth-input" placeholder="Your Full Name *" required autocomplete="name">
            <input type="email" id="regEmail" class="drawer-auth-input" placeholder="Email Address *" required autocomplete="email">
            <input type="tel" id="regPhone" class="drawer-auth-input" placeholder="Mobile Number (10 digits) *" required autocomplete="tel" maxlength="10" pattern="[0-9]{10}" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);">
            <input type="password" id="regPassword" class="drawer-auth-input" placeholder="Create Password *" required autocomplete="new-password">
            <input type="text" id="regAddress" class="drawer-auth-input" placeholder="Street Delivery Address" autocomplete="street-address">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <input type="text" id="regCity" class="drawer-auth-input" placeholder="City (e.g. Chennai)">
              <input type="text" id="regPincode" class="drawer-auth-input" placeholder="Pincode (e.g. 600020)">
            </div>
            <button type="submit" class="drawer-auth-submit-btn">Create Account & Continue →</button>
          </form>

          <div style="margin-top:14px; text-align:center;">
            <button type="button" id="togglePasswordLoginBtn" style="background:none; border:none; color:#7C5AAB; font-size:0.8125rem; font-weight:700; cursor:pointer; text-decoration:underline;">
              Already registered? Sign In with Password →
            </button>
          </div>

          <div id="drawerPasswordLoginWrap" style="display:none; margin-top:14px; padding-top:14px; border-top:1px dashed rgba(25,19,25,0.15);">
            <form id="drawerLoginForm" onsubmit="event.preventDefault(); window.handleDrawerLogin();">
              <input type="text" id="drawerLoginEmail" class="drawer-auth-input" placeholder="Email Address or Phone" required autocomplete="username">
              <input type="password" id="drawerLoginPassword" class="drawer-auth-input" placeholder="Password" required autocomplete="current-password">
              <button type="submit" class="drawer-auth-submit-btn" style="background:#4A306D;">Sign In with Password →</button>
            </form>
          </div>
        </div>
      `;

      drawerFooter.innerHTML = `
        <button class="btn-drawer-action btn-drawer-action--shop" onclick="window.location.href='/nimda-login/'">
          <span>Full Operations & Staff Portal →</span>
        </button>
      `;

      // Password login toggle
      const toggleBtn = document.getElementById('togglePasswordLoginBtn');
      const passWrap = document.getElementById('drawerPasswordLoginWrap');
      if (toggleBtn && passWrap) {
        toggleBtn.onclick = () => {
          const isHidden = passWrap.style.display === 'none';
          passWrap.style.display = isHidden ? 'block' : 'none';
          toggleBtn.textContent = isHidden ? '← Back to Create Account' : 'Already registered? Sign In with Password →';
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
      statusNotice = 'Cancellation requested by you. Staff review & refund processing in progress.';
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
    const rawPhone = (document.getElementById('regPhone')?.value || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(0, 10);

    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    const payload = {
      name: document.getElementById('regName').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      phone: cleanPhone,
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

  // 7. Google Sign-In Execution & Interactive Account Chooser
  async function executeGoogleAuth(profile) {
    try {
      const res = await fetch('/api/customer/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (data.success && data.customer) {
        currentCustomer = data.customer;
        localStorage.setItem('nachiyar_customer', JSON.stringify(data.customer));
        updateNavbarUserState();
        closeGoogleAccountPicker();
        renderDrawerContent();
        showAuthToast(`✓ Signed in with Google as ${data.customer.name}`);
        if (window.location.pathname.includes('account.html')) {
          setTimeout(() => window.location.reload(), 400);
        }
        return true;
      } else {
        alert(data.message || 'Google authentication failed.');
        return false;
      }
    } catch (err) {
      console.error('Google Auth Error:', err);
      alert('Could not complete Google Sign-In. Please check your connection.');
      return false;
    }
  }

  // Toast notification helper
  function showAuthToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #191319;
      color: #FFF;
      padding: 12px 20px;
      border-radius: 999px;
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.24);
      z-index: 1000000;
      animation: fadeInModal 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    toast.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // 7. Firebase Authentication Integration & GoogleAuthProvider with prompt: "select_account"
  let firebaseAuthInstance = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.getAttribute('data-loaded') === 'true') return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject());
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        s.setAttribute('data-loaded', 'true');
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureFirebaseLoaded() {
    if (!window.FIREBASE_CONFIG) {
      try {
        await loadScript('firebase-config.js');
      } catch (e) {}
    }
    if (window.firebase && window.firebase.auth) return true;
    try {
      await loadScript('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth-compat.js');
      return true;
    } catch (e) {
      console.error('Failed to load Firebase scripts:', e);
      return false;
    }
  }

  ensureFirebaseLoaded();

  async function getFirebaseConfig() {
    function isValid(cfg) {
      return Boolean(
        cfg &&
        typeof cfg.apiKey === 'string' &&
        cfg.apiKey.trim().length > 10 &&
        !cfg.apiKey.includes('YOUR_FIREBASE_API_KEY') &&
        cfg.projectId &&
        cfg.projectId.trim().length > 0
      );
    }

    if (isValid(window.FIREBASE_CONFIG)) {
      return window.FIREBASE_CONFIG;
    }

    // Try fetching from backend environment endpoint
    if (typeof window.__loadFirebaseConfigFromBackend === 'function') {
      const backendConfig = await window.__loadFirebaseConfigFromBackend();
      if (isValid(backendConfig)) return backendConfig;
    }

    try {
      const res = await fetch('/api/customer/firebase-config?_t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data && data.success && data.configured && isValid(data.config)) {
        window.FIREBASE_CONFIG = data.config;
        return data.config;
      }
    } catch (e) {}

    return null;
  }

  async function initFirebaseApp() {
    if (firebaseAuthInstance) return firebaseAuthInstance;
    const config = await getFirebaseConfig();
    if (!config) {
      return null;
    }
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(config);
    }
    firebaseAuthInstance = window.firebase.auth();
    return firebaseAuthInstance;
  }

  // Global Google Sign-In handler called by customer login panel button
  window.handleGoogleSignIn = async function() {
    await ensureFirebaseLoaded();
    const auth = await initFirebaseApp();

    if (!auth) {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      console.warn(`
%c[NACHIYAR HERBALS] FIREBASE GOOGLE SIGN-IN SETUP REQUIRED%c

Firebase configuration is missing in the environment.
To enable direct Google Sign-In with official account chooser:

1. Open Firebase Console: https://console.firebase.google.com/
2. Project Settings -> General -> "Your apps" -> Add Web app (</>)
3. Add the keys in .env.development or .env.production:
   FIREBASE_API_KEY="AIzaSy..."
   FIREBASE_AUTH_DOMAIN="nachiyar-herbals.firebaseapp.com"
   FIREBASE_PROJECT_ID="nachiyar-herbals"
   FIREBASE_STORAGE_BUCKET="nachiyar-herbals.appspot.com"
   FIREBASE_MESSAGING_SENDER_ID="1234567890"
   FIREBASE_APP_ID="1:...:web:..."
   (Or define them in firebase-config.js)
4. Authentication -> Sign-in method -> Enable "Google" provider
5. Authentication -> Settings -> Authorized domains -> ensure "${window.location.hostname}" is listed

Documentation: docs/FIREBASE_SETUP.md
      `, 'background: #5B1425; color: #FFF; font-weight: bold; padding: 4px 8px; border-radius: 4px;', '');

      if (isDev) {
        showAuthToast('⚠️ Firebase keys missing in .env. See console (F12) for setup steps.');
      } else {
        showAuthToast('Google Sign-In is temporarily unavailable. Please use email or phone.');
      }
      return;
    }

    try {
      const provider = new window.firebase.auth.GoogleAuthProvider();
      // Google's official account chooser using GoogleAuthProvider with prompt: "select_account"
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      if (!user) return;

      const firebaseUid = user.uid;
      const email = user.email;
      const name = user.displayName || (email ? email.split('@')[0] : 'Customer');
      const picture = user.photoURL || '';

      // After successful login, automatically create a customer account if it doesn't already exist,
      // using the Firebase UID as the unique user ID.
      const res = await fetch('/api/customer/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: firebaseUid,
          googleId: firebaseUid,
          email: email,
          name: name,
          picture: picture
        })
      });

      const data = await res.json();
      if (data.success && data.customer) {
        currentCustomer = data.customer;
        localStorage.setItem('nachiyar_customer', JSON.stringify(data.customer));
        updateNavbarUserState();
        closeAccountDrawer(); // Close the customer login panel after successful authentication!
        showAuthToast(`✓ Welcome, ${data.customer.name}!`);
        if (window.location.pathname.includes('account.html')) {
          setTimeout(() => window.location.reload(), 300);
        }
      } else {
        alert(data.message || 'Login failed.');
      }
    } catch (err) {
      console.error('Firebase Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        console.error('Google provider is not enabled in Firebase Console. Go to Authentication -> Sign-in method -> Enable Google.');
        showAuthToast('⚠️ Google provider not enabled in Firebase Console.');
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        console.error(`Domain "${window.location.hostname}" is not authorized. Add it to Firebase Console -> Authentication -> Settings -> Authorized domains.`);
        showAuthToast(`⚠️ Domain "${window.location.hostname}" not authorized in Firebase Console.`);
        return;
      }
      alert('Google Sign-In: ' + (err.message || err));
    }
  };

  // Expose global opener for buttons
  window.openCustomerAccountDrawer = openAccountDrawer;
})();
