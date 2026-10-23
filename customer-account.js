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
    syncMobileFixedTopNav();
    injectAccountUI();
    bindNavbarAccountButton();
    updateNavbarUserState();
    // Auto open drawer if redirected with open_account=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logged_out') === '1') {
      clearCustomerSession(false);
    } else {
      validateBackendSession();
    }
    initGoogleIdentityServices();

    if (urlParams.get('open_account') === 'true') {
      setTimeout(openAccountDrawer, 300);
    }
  });

  // Synchronize Mobile Fixed Top Nav (Announcement Bar + Site Header) dynamically
  function syncMobileFixedTopNav() {
    const isMobile = window.innerWidth <= 768;
    const annBar = document.querySelector('.announcement-bar');
    const header = document.querySelector('.site-header');

    if (!isMobile) {
      if (annBar) {
        annBar.style.position = '';
        annBar.style.top = '';
        annBar.style.left = '';
        annBar.style.right = '';
        annBar.style.width = '';
        annBar.style.zIndex = '';
      }
      if (header) {
        header.style.position = '';
        header.style.top = '';
        header.style.left = '';
        header.style.right = '';
        header.style.width = '';
        header.style.zIndex = '';
      }
      document.body.style.paddingTop = '';
      return;
    }

    let annHeight = 0;
    if (annBar && window.getComputedStyle(annBar).display !== 'none') {
      annHeight = annBar.offsetHeight || 38;
      annBar.style.position = 'fixed';
      annBar.style.top = '0px';
      annBar.style.left = '0px';
      annBar.style.right = '0px';
      annBar.style.width = '100%';
      annBar.style.zIndex = '1002';
    }

    if (header) {
      header.style.position = 'fixed';
      header.style.top = annHeight + 'px';
      header.style.left = '0px';
      header.style.right = '0px';
      header.style.width = '100%';
      header.style.zIndex = '1001';

      const headerHeight = header.offsetHeight || 68;
      document.body.style.paddingTop = (annHeight + headerHeight) + 'px';
    }
  }

  window.addEventListener('resize', syncMobileFixedTopNav);
  window.addEventListener('orientationchange', syncMobileFixedTopNav);
  window.addEventListener('scroll', () => {
    const header = document.querySelector('.site-header');
    if (header) {
      if (window.scrollY > 10) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }
  }, { passive: true });

  // Curved Floating Bottom Navigation Bar for Mobile (Home, Shop Rituals, About Us, Contact)
  function ensureMobileCurvedBottomNav() {
    // Suppress bottom nav on checkout and admin pages to prevent covering action buttons
    const curPath = (window.location.pathname || '').toLowerCase();
    const curHref = (window.location.href || '').toLowerCase();
    if (curPath.includes('checkout') || curHref.includes('checkout') || curPath.includes('order-status') || curHref.includes('order-status') || curPath.includes('nimda') || curHref.includes('nimda')) {
      return;
    }

    // 1. Remove any legacy hamburger toggles and drawers
    const existingToggle = document.getElementById('mobileNavToggle');
    if (existingToggle) existingToggle.remove();
    document.querySelectorAll('.mobile-nav-toggle').forEach(el => el.remove());

    const existingDrawer = document.getElementById('mobileDrawer');
    if (existingDrawer) existingDrawer.remove();
    document.querySelectorAll('.mobile-drawer').forEach(el => el.remove());

    if (document.getElementById('mobileCurvedBottomNav')) return;

    // Environment-adaptive clean URLs (works seamlessly on Local, localhost, and Live Apache/cPanel)
    const isLocalOrHtml = window.location.protocol === 'file:' || 
                          window.location.pathname.endsWith('.html') || 
                          window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1';

    const getNavUrl = (slug) => {
      if (slug === 'home') return isLocalOrHtml ? 'index.html' : '/';
      return isLocalOrHtml ? `${slug}.html` : `/${slug}/`;
    };

    const NAV_ITEMS = [
      {
        id: 'home',
        name: 'Home',
        url: getNavUrl('home'),
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10.5z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
      },
      {
        id: 'shop',
        name: 'Shop Rituals',
        url: getNavUrl('shop'),
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
      },
      {
        id: 'about',
        name: 'About Us',
        url: getNavUrl('about'),
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13C4 7 11 2 20 2c0 9-5 16-11 16z"/><path d="M8 16c2-3 5-6 9-8"/></svg>`
      },
      {
        id: 'contact',
        name: 'Contact',
        url: getNavUrl('contact'),
        icon: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>`
      }
    ];

    // Detect active page index with 100% precision across Local, File, and Live
    const hrefLower = (window.location.href || '').toLowerCase();
    const pathLower = (window.location.pathname || '').toLowerCase();

    let activeIndex = 0; // Default: Home
    if (pathLower.includes('about') || hrefLower.includes('about')) {
      activeIndex = 2; // About Us
    } else if (pathLower.includes('shop') || hrefLower.includes('shop') || pathLower.includes('product') || hrefLower.includes('product')) {
      activeIndex = 1; // Shop Rituals
    } else if (pathLower.includes('contact') || hrefLower.includes('contact')) {
      activeIndex = 3; // Contact
    } else {
      activeIndex = 0; // Home
    }

    const nav = document.createElement('nav');
    nav.id = 'mobileCurvedBottomNav';
    nav.className = 'mobile-curved-bottom-nav';
    nav.setAttribute('aria-label', 'Mobile Navigation');

    // Pre-position glider directly in DOM inline styles to prevent ANY jump or animation from Home!
    nav.innerHTML = `
      <div class="mobile-nav-tabs" id="mobileNavTabs">
        <div class="mobile-nav-glider-wrapper" id="mobileNavGlider" style="transform: translateX(${activeIndex * 100}%); opacity: 1; transition: none;">
          <div class="nav-wave-shape">
            <svg viewBox="0 0 110 34" class="nav-wave-svg" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0,34 C 24,34 30,24 38,12 C 46,0 55,0 64,0 C 72,0 80,12 88,24 C 94,34 100,34 110,34 L 110,38 L 0,38 Z" fill="#FFFFFF"/>
              <path d="M 0,34 C 24,34 30,24 38,12 C 46,0 55,0 64,0 C 72,0 80,12 88,24 C 94,34 100,34 110,34" fill="none" stroke="rgba(124, 90, 171, 0.22)" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="nav-bubble-circle" id="navBubbleCircle">
            <div class="bubble-icon-slot" id="bubbleIconSlot">${NAV_ITEMS[activeIndex].icon}</div>
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

    // Smooth transition re-enabled immediately after initial render frame
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (glider) {
          glider.style.transition = 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease';
        }
      }, 50);
    });

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

    window.addEventListener('resize', () => {
      if (activeIndex >= 0) updateActiveGlider(activeIndex, false);
    });

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
        }, 180);
      });
    });
  }

  // 1. Update navbar button state
  function updateNavbarUserState() {
    const navLabel = document.getElementById('navAccountLabel');
    const btn = document.getElementById('accountTriggerBtn');

    try {
      const saved = localStorage.getItem('nachiyar_customer');
      currentCustomer = saved ? JSON.parse(saved) : null;
    } catch (e) {
      currentCustomer = null;
    }

    if (currentCustomer && currentCustomer.name) {
      const firstName = currentCustomer.name.trim().split(' ')[0];
      if (navLabel) {
        navLabel.textContent = `Hi, ${firstName}`;
        navLabel.style.display = 'inline-block';
      }
      if (btn) {
        btn.href = '/account/';
        btn.setAttribute('aria-label', `Account of ${currentCustomer.name}`);
        btn.classList.add('is-logged-in');
      }
    } else {
      if (navLabel) {
        navLabel.textContent = 'Sign In';
      }
      if (btn) {
        btn.href = 'javascript:void(0);';
        btn.setAttribute('aria-label', 'Sign In or Create Account');
        btn.classList.remove('is-logged-in');
      }
    }
  }

  // 2. Bind navbar account trigger button
  function bindNavbarAccountButton() {
    // Look for existing button or create if missing
    let btn = document.getElementById('accountTriggerBtn');
    if (!btn) {
      const headerActions = document.querySelector('.header-actions');
      if (headerActions) {
        btn = document.createElement('a');
        btn.href = 'javascript:void(0);';
        btn.id = 'accountTriggerBtn';
        btn.className = 'account-trigger-btn';
        btn.setAttribute('aria-label', 'Customer Account');
        btn.innerHTML = `
          <svg class="user-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span class="user-label" id="navAccountLabel">Sign In</span>
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
        // Refresh customer state from localStorage
        try {
          const saved = localStorage.getItem('nachiyar_customer');
          currentCustomer = saved ? JSON.parse(saved) : null;
        } catch (err) {
          currentCustomer = null;
        }

        if (currentCustomer && currentCustomer.name) {
          // Logged in user -> Navigate to full account dashboard page (/account/)
          if (window.location.pathname.includes('account')) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          window.location.href = '/account/';
        } else {
          // Not logged in -> Open side drawer for Sign In & Account Creation
          e.preventDefault();
          e.stopPropagation();
          openAccountDrawer();
        }
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
    renderGsiButtons();
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
        customerSignOut();
      };

      // Fetch customer orders from backend
      fetchCustomerOrders(currentCustomer.email, currentCustomer.phone);

    } else {
      // ================= GUEST / NOT LOGGED IN VIEW =================
      drawerAvatar.textContent = '👤';
      drawerUserName.textContent = 'Welcome, Guest';
      drawerUserSubtitle.textContent = 'Choose your preferred sign-in method';

      drawerBody.innerHTML = `
        <div class="drawer-guest-auth-wrap">
          <!-- SIGN IN WITH GOOGLE (BUTTON ONLY - NO BULKY BOX) -->
          <div id="drawerGoogleBtnWrapper">
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

          <!-- CREATE ACCOUNT FORM -->
          <div class="drawer-auth-card">
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
              <input type="tel" id="regPincode" class="drawer-auth-input" placeholder="Pincode (6 digits)" maxlength="6" inputmode="numeric" pattern="[0-9]{6}" oninput="this.value = this.value.replace(/\D/g, '').slice(0, 6);">
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
              <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                <button type="button" onclick="window.toggleDrawerForgotPassword(true)" style="background:none; border:none; color:#7C5AAB; font-size:0.8125rem; font-weight:700; cursor:pointer; text-decoration:underline; padding:0;">
                  Forgot Password?
                </button>
              </div>
              <button type="submit" class="drawer-auth-submit-btn" style="background:#4A306D;">Sign In with Password →</button>
            </form>
          </div>

          <!-- DRAWER FORGOT PASSWORD (OTP RESET FLOW) -->
          <div id="drawerForgotPassWrap" style="display:none; margin-top:14px; padding:18px; background:#FAF7FD; border:1.5px solid #D4AF37; border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span style="font-size:0.875rem; font-weight:800; color:#2D1832;">🔑 Reset Password via OTP</span>
              <button type="button" onclick="window.toggleDrawerForgotPassword(false)" style="background:#ECE5F8; border:none; border-radius:50%; width:24px; height:24px; font-size:0.8125rem; cursor:pointer; color:#6B5E74;" aria-label="Close">✕</button>
            </div>
            
            <!-- Step 1: Input registered email & send OTP -->
            <div id="drawerForgotStep1">
              <p style="font-size:0.8125rem; color:#6B5E74; margin:0 0 10px 0; line-height:1.45;">
                Enter your registered email address. We will send a 6-digit OTP code to reset your password.
              </p>
              <input type="email" id="drawerForgotEmail" class="drawer-auth-input" placeholder="Registered Email (e.g. name@gmail.com)" style="margin-bottom:10px;">
              <div style="display:flex; gap:8px; align-items:center;">
                <button type="button" id="btnDrawerSendOtp" onclick="window.handleDrawerSendOtp()" class="drawer-auth-submit-btn" style="background:#A37F14; margin:0; flex:1; height:42px; font-size:0.84rem;">
                  Send 6-Digit OTP →
                </button>
                <span id="drawerOtpCountdownTimer" style="display:none; font-size:0.75rem; color:#8E7F99; font-weight:700; white-space:nowrap;"></span>
              </div>
            </div>

            <!-- Sent Notification Banner -->
            <div id="drawerOtpStatusBanner" style="display:none; background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:10px 12px; margin-top:12px; font-size:0.8125rem; color:#166534; line-height:1.45;"></div>

            <!-- Step 2: OTP Input & Verify Button (Hidden until OTP sent) -->
            <div id="drawerForgotStep2" style="display:none; margin-top:14px; padding-top:12px; border-top:1px dashed #E5DDF0;">
              <label style="display:block; font-size:0.75rem; font-weight:700; color:#3B2A45; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:6px;">
                Enter 6-Digit OTP Sent to Email *
              </label>
              <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
                <input type="text" id="drawerForgotOtpDigits" class="drawer-auth-input" placeholder="e.g. 123456" maxlength="6" style="margin:0; text-align:center; font-size:1.15rem; letter-spacing:4px; font-weight:700; flex:1; height:42px; box-sizing:border-box;">
                <button type="button" id="btnDrawerVerifyOtp" onclick="window.handleDrawerVerifyOtp()" style="height:42px; padding-inline:16px; background:linear-gradient(135deg, #7C2A72 0%, #4D1847 100%); color:#FFF; border:none; border-radius:8px; font-weight:700; font-size:0.8125rem; cursor:pointer; white-space:nowrap; box-shadow:0 2px 8px rgba(77,24,71,0.25);">
                  Verify OTP
                </button>
              </div>
              <div id="drawerOtpErrorMsg" style="display:none; color:#DC2626; font-size:0.78rem; font-weight:700; margin-bottom:8px;"></div>
            </div>

            <!-- Step 3: New Password & Confirm Password (Revealed ONLY after OTP verified) -->
            <div id="drawerForgotStep3" style="display:none; margin-top:14px; padding-top:14px; border-top:1.5px solid #22C55E;">
              <div style="color:#15803D; font-size:0.8125rem; font-weight:700; margin-bottom:10px;">
                ✅ OTP Verified Successfully! Now set your new password:
              </div>
              <input type="password" id="drawerForgotNewPass" class="drawer-auth-input" placeholder="New Password (min 4 chars)" minlength="4" style="margin-bottom:8px;">
              <input type="password" id="drawerForgotConfirmPass" class="drawer-auth-input" placeholder="Confirm New Password" minlength="4" style="margin-bottom:12px;">
              <button type="button" id="btnDrawerUpdatePass" onclick="window.handleDrawerFinalPasswordReset()" class="drawer-auth-submit-btn" style="background:linear-gradient(135deg, #7C2A72 0%, #4D1847 100%); margin:0; height:44px; box-shadow:0 3px 12px rgba(77,24,71,0.25);">
                Update Password & Sign In →
              </button>
            </div>

            <div style="margin-top:12px; text-align:center;">
              <button type="button" onclick="window.toggleDrawerForgotPassword(false)" style="background:none; border:none; color:#8E7F99; font-size:0.78rem; font-weight:600; cursor:pointer;">
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
      `;

      drawerFooter.innerHTML = `
        <button class="btn-drawer-action btn-drawer-action--shop" onclick="window.location.href='shop.html'">
          <span>Shop Handcrafted Rituals →</span>
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
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

      const res = await fetch(`/api/customer/orders?email=${encodeURIComponent(cleanEmail)}&phone=${encodeURIComponent(cleanPhone)}`);
      const json = await res.json();
      const dbOrders = json.data || [];
      const orderMap = new Map();
      dbOrders.forEach(o => {
        if (o && o.orderNumber) orderMap.set(o.orderNumber, o);
      });

      try {
        const localStored = JSON.parse(localStorage.getItem('nachiyar_customer_orders') || '[]');
        localStored.forEach(o => {
          const c = o.customer || {};
          const oPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
          const oEmail = (c.email || '').trim().toLowerCase();
          const matches = (cleanEmail && oEmail && cleanEmail === oEmail) ||
                          (cleanPhone && oPhone && cleanPhone === oPhone) ||
                          (currentCustomer && currentCustomer.id && c.id && currentCustomer.id === c.id);
          if (matches && o.orderNumber && !orderMap.has(o.orderNumber)) {
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
            <a href="shop.html" style="display:inline-block; padding:8px 18px; border-radius:999px; background:#7C5AAB; color:#FFF; font-size:0.75rem; font-weight:700; text-decoration:none;">Explore Apothecary →</a>
          </div>
        `;
        return;
      }

      container.innerHTML = orders.map(ord => renderTrackingOrderCard(ord)).join('');

    } catch (e) {
      console.error('Could not fetch orders:', e);
      if (countPill) countPill.textContent = '0 Orders';
      container.innerHTML = `
        <div style="background:#FFFFFF; border-radius:14px; padding:24px; text-align:center; border:1px solid rgba(0,0,0,0.06);">
          <span style="font-size:2rem; display:block; margin-bottom:8px;">📦</span>
          <strong style="display:block; font-size:0.9375rem; color:#191319; margin-bottom:4px;">No Orders Placed Yet</strong>
          <p style="font-size:0.8125rem; color:#6B626A; margin-bottom:14px;">Explore our handcrafted Ayurvedic oils and gentle hair cleansers.</p>
          <a href="shop.html" style="display:inline-block; padding:8px 18px; border-radius:999px; background:#7C5AAB; color:#FFF; font-size:0.75rem; font-weight:700; text-decoration:none;">Explore Apothecary →</a>
        </div>
      `;
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

        <!-- Flipkart Style Visual Tracker (2-step for Cancelled, 4-step for Active) -->
        <div class="tracking-stepper-wrap">
          ${status === 'cancelled' ? `
            <div class="stepper-progress-bar" style="max-width: 260px; margin: 0 auto 10px; overflow: hidden;">
              <div class="stepper-track-line" style="background:#FEE2E2; left:18px; right:18px;"></div>
              <div class="stepper-track-fill" style="width: 100%; max-width: calc(100% - 36px); background: #DC2626; left:18px;"></div>

              <!-- Step 1: Ordered -->
              <div class="stepper-node is-done">
                <div class="stepper-circle" style="background:#10B981; border-color:#10B981; color:#FFF;">✓</div>
                <span class="stepper-label" style="color:#10B981; font-weight:700;">Ordered</span>
              </div>

              <!-- Step 2: Cancelled -->
              <div class="stepper-node">
                <div class="stepper-circle" style="background:#DC2626; border-color:#DC2626; color:#FFF; box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.2);">✕</div>
                <span class="stepper-label" style="color:#DC2626; font-weight:800;">Cancelled</span>
              </div>
            </div>
          ` : status === 'cancel_requested' ? `
            <div class="stepper-progress-bar" style="max-width: 260px; margin: 0 auto 10px; overflow: hidden;">
              <div class="stepper-track-line" style="background:#FFEDD5; left:18px; right:18px;"></div>
              <div class="stepper-track-fill" style="width: 100%; max-width: calc(100% - 36px); background: #EA580C; left:18px;"></div>

              <!-- Step 1: Ordered -->
              <div class="stepper-node is-done">
                <div class="stepper-circle" style="background:#10B981; border-color:#10B981; color:#FFF;">✓</div>
                <span class="stepper-label" style="color:#10B981; font-weight:700;">Ordered</span>
              </div>

              <!-- Step 2: In Review -->
              <div class="stepper-node">
                <div class="stepper-circle" style="background:#EA580C; border-color:#EA580C; color:#FFF; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.2);">⏳</div>
                <span class="stepper-label" style="color:#C2410C; font-weight:800;">Cancel Review</span>
              </div>
            </div>
          ` : `
            <div class="stepper-progress-bar" style="overflow: hidden;">
              <div class="stepper-track-line" style="left:20px; right:20px;"></div>
              <div class="stepper-track-fill" style="width: ${trackFillPercent}; max-width: calc(100% - 40px); left:20px;"></div>

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
          `}
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

  function syncCustomerLoginState(customer, token) {
    currentCustomer = customer;
    if (customer) {
      localStorage.setItem('nachiyar_customer', JSON.stringify(customer));
    }
    if (token) {
      localStorage.setItem('nachiyar_token', token);
    }
    updateNavbarUserState();
    closeAccountDrawer();
    try {
      window.dispatchEvent(new Event('storage'));
      if (typeof window.renderCheckoutAuthBanner === 'function') {
        window.renderCheckoutAuthBanner();
      }
    } catch (e) {}
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
        syncCustomerLoginState(data.customer, data.token);
        showSideToast({ title: 'Welcome Back!', message: `Signed in as ${data.customer.name}`, type: 'success' });
        if (window.location.pathname.includes('account')) {
          setTimeout(() => window.location.reload(), 300);
        }
      } else {
        alert(data.message || 'Invalid credentials');
      }
    } catch (e) {
      alert('Login error. Please try again.');
    }
  };

  let drawerOtpCooldownTimer = null;

  // Toggle Forgot Password View inside Customer Drawer
  window.toggleDrawerForgotPassword = function(show) {
    const loginWrap = document.getElementById('drawerPasswordLoginWrap');
    const forgotWrap = document.getElementById('drawerForgotPassWrap');
    const toggleBtn = document.getElementById('togglePasswordLoginBtn');
    const loginEmailInput = document.getElementById('drawerLoginEmail');
    const forgotEmailInput = document.getElementById('drawerForgotEmail');

    if (show) {
      if (loginWrap) loginWrap.style.display = 'none';
      if (forgotWrap) forgotWrap.style.display = 'block';
      if (toggleBtn) toggleBtn.style.display = 'none';
      if (loginEmailInput && forgotEmailInput && loginEmailInput.value.includes('@')) {
        forgotEmailInput.value = loginEmailInput.value.trim();
      }
    } else {
      if (loginWrap) loginWrap.style.display = 'block';
      if (forgotWrap) forgotWrap.style.display = 'none';
      if (toggleBtn) toggleBtn.style.display = 'inline-block';
    }
  };

  // Step 1: Send OTP to registered email
  window.handleDrawerSendOtp = async function() {
    const emailInput = document.getElementById('drawerForgotEmail');
    const btn = document.getElementById('btnDrawerSendOtp');
    const timerSpan = document.getElementById('drawerOtpCountdownTimer');
    const banner = document.getElementById('drawerOtpStatusBanner');
    const step2 = document.getElementById('drawerForgotStep2');
    const otpInput = document.getElementById('drawerForgotOtpDigits');
    const errorMsg = document.getElementById('drawerOtpErrorMsg');

    const email = (emailInput?.value || '').trim();
    if (!email || !email.includes('@')) {
      window.showDrawerActionModal({
        icon: '⚠️',
        iconBg: '#FEE2E2',
        iconColor: '#DC2626',
        title: 'Valid Email Required',
        message: 'Please enter a valid registered email address to receive your verification code.',
        btnText: 'OK',
        onConfirm: () => emailInput?.focus()
      });
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = '⏳ Sending OTP...';
    }
    if (errorMsg) errorMsg.style.display = 'none';

    try {
      const res = await fetch('/api/customer/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (btn && btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
      }

      if (data.success) {
        if (banner) {
          banner.style.display = 'block';
          banner.innerHTML = `✅ <strong>Verification Code Sent:</strong> A 6-digit OTP has been sent to your registered email <strong>${email}</strong>. Please check your inbox.`;
        }
        if (step2) step2.style.display = 'block';
        if (otpInput) {
          otpInput.value = '';
          otpInput.disabled = false;
          otpInput.focus();
        }

        const verifyBtn = document.getElementById('btnDrawerVerifyOtp');
        if (verifyBtn) {
          verifyBtn.disabled = false;
          verifyBtn.textContent = 'Verify OTP';
          verifyBtn.style.background = 'linear-gradient(135deg, #7C2A72 0%, #4D1847 100%)';
        }

        // 60-second countdown
        let timeLeft = 60;
        if (timerSpan) {
          timerSpan.style.display = 'inline';
          timerSpan.textContent = `(${timeLeft}s)`;
        }
        if (drawerOtpCooldownTimer) clearInterval(drawerOtpCooldownTimer);
        drawerOtpCooldownTimer = setInterval(() => {
          timeLeft--;
          if (timeLeft <= 0) {
            clearInterval(drawerOtpCooldownTimer);
            if (btn) btn.disabled = false;
            if (timerSpan) timerSpan.style.display = 'none';
          } else {
            if (timerSpan) timerSpan.textContent = `(${timeLeft}s)`;
          }
        }, 1000);

      } else {
        if (btn) btn.disabled = false;
        // User rule: If email is not registered, show popup explaining to register first!
        if (res.status === 404 || data.notRegistered || (data.message && data.message.toLowerCase().includes('not registered'))) {
          window.showDrawerActionModal({
            icon: '🚫',
            iconBg: '#FEE2E2',
            iconColor: '#DC2626',
            title: 'Email Not Registered',
            message: `The email "${email}" is not registered with Nachiyar Herbals. Please create an account first.`,
            btnText: 'Create Account Now →',
            onConfirm: () => {
              window.toggleDrawerForgotPassword(false);
              const passWrap = document.getElementById('drawerPasswordLoginWrap');
              const toggleBtn = document.getElementById('togglePasswordLoginBtn');
              if (passWrap) passWrap.style.display = 'none';
              if (toggleBtn) toggleBtn.textContent = 'Already registered? Sign In with Password →';
              const regEmail = document.getElementById('regEmail');
              if (regEmail) {
                regEmail.value = email;
                regEmail.focus();
              }
            }
          });
        } else {
          window.showDrawerActionModal({
            icon: '⚠️',
            iconBg: '#FEE2E2',
            iconColor: '#DC2626',
            title: 'Unable to Send OTP',
            message: data.message || 'Could not send verification code. Please try again.',
            btnText: 'OK'
          });
        }
      }
    } catch (e) {
      if (btn) btn.disabled = false;
      window.showDrawerActionModal({
        icon: '⚠️',
        iconBg: '#FEE2E2',
        iconColor: '#DC2626',
        title: 'Connection Error',
        message: 'Could not connect to the authentication server. Please check your network.',
        btnText: 'OK'
      });
    }
  };

  // Step 2: Verify OTP
  window.handleDrawerVerifyOtp = async function() {
    const email = (document.getElementById('drawerForgotEmail')?.value || '').trim();
    const otpInput = document.getElementById('drawerForgotOtpDigits');
    const verifyBtn = document.getElementById('btnDrawerVerifyOtp');
    const errorMsg = document.getElementById('drawerOtpErrorMsg');
    const step3 = document.getElementById('drawerForgotStep3');

    const otp = (otpInput?.value || '').trim();
    if (!otp || otp.length !== 6) {
      window.showDrawerActionModal({
        icon: '⚠️',
        iconBg: '#FEE2E2',
        iconColor: '#DC2626',
        title: 'OTP is wrong',
        message: 'Please enter the 6-digit verification code sent to your email.',
        btnText: 'OK',
        onConfirm: () => otpInput?.focus()
      });
      return;
    }

    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
    }
    if (errorMsg) errorMsg.style.display = 'none';

    try {
      const res = await fetch('/api/customer/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();

      if (data.success) {
        if (otpInput) otpInput.disabled = true;
        if (verifyBtn) {
          verifyBtn.textContent = '✅ Verified';
          verifyBtn.style.background = '#15803D';
        }
        if (step3) {
          step3.style.display = 'block';
          const newPassInput = document.getElementById('drawerForgotNewPass');
          if (newPassInput) newPassInput.focus();
        }
      } else {
        if (verifyBtn) {
          verifyBtn.disabled = false;
          verifyBtn.textContent = 'Verify OTP';
        }
        if (errorMsg) {
          errorMsg.style.display = 'block';
          errorMsg.textContent = '❌ ' + (data.message || 'OTP is wrong. Please enter the valid OTP sent to your email.');
        }
        window.showDrawerActionModal({
          icon: '⚠️',
          iconBg: '#FEE2E2',
          iconColor: '#DC2626',
          title: 'OTP is wrong',
          message: data.message || 'The OTP you entered is wrong. Please enter the valid OTP sent to your email.',
          btnText: 'Try Again',
          onConfirm: () => {
            if (otpInput) {
              otpInput.focus();
              otpInput.select();
            }
          }
        });
      }
    } catch (e) {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify OTP';
      }
      alert('Verification network error: ' + e.message);
    }
  };

  // Step 3: Final Password Update and Auto Sign-In
  window.handleDrawerFinalPasswordReset = async function() {
    const email = (document.getElementById('drawerForgotEmail')?.value || '').trim();
    const otp = (document.getElementById('drawerForgotOtpDigits')?.value || '').trim();
    const newPassInput = document.getElementById('drawerForgotNewPass');
    const confirmPassInput = document.getElementById('drawerForgotConfirmPass');
    const btn = document.getElementById('btnDrawerUpdatePass');

    const newPassword = (newPassInput?.value || '').trim();
    const confirmPassword = (confirmPassInput?.value || '').trim();

    if (!newPassword || newPassword.length < 4) {
      alert('New password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match. Please re-enter.');
      return;
    }

    if (btn) btn.disabled = true;

    try {
      const res = await fetch('/api/customer/verify-otp-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();

      if (data.success) {
        // Password updated in DB! Now auto sign in the customer seamlessly
        try {
          const loginRes = await fetch('/api/customer/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: newPassword })
          });
          const loginData = await loginRes.json();
          if (loginData.success && loginData.customer) {
            syncCustomerLoginState(loginData.customer, loginData.token);
          }
        } catch (le) {}

        window.showDrawerActionModal({
          icon: '🎉',
          iconBg: '#DCFCE7',
          iconColor: '#15803D',
          title: 'User password is updated!',
          message: 'Your account password has been successfully updated in the database. You are now securely signed in.',
          btnText: 'Continue to Account →',
          onConfirm: () => {
            window.toggleDrawerForgotPassword(false);
            initCustomerAccountDrawer();
            if (window.location.pathname.includes('account')) {
              window.location.reload();
            }
          }
        });
      } else {
        if (btn) btn.disabled = false;
        alert(data.message || 'Could not update password. Please try again.');
      }
    } catch (e) {
      if (btn) btn.disabled = false;
      alert('Error updating password: ' + e.message);
    }
  };

  // Universal Drawer Modal Dialog Popup
  window.showDrawerActionModal = function({ icon = 'ℹ️', iconBg = '#F3E8FF', iconColor = '#7C5AAB', title, message, btnText = 'OK', onConfirm = null }) {
    let modal = document.getElementById('drawerUniversalActionModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'drawerUniversalActionModal';
      modal.style.cssText = 'position:fixed; inset:0; background:rgba(30,12,38,0.7); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); z-index:999999; display:flex; align-items:center; justify-content:center; padding:20px;';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:#FFFFFF; border-radius:24px; max-width:400px; width:100%; padding:32px 24px; text-align:center; box-shadow:0 20px 50px rgba(45,24,50,0.3); border:1.5px solid #F0E8F8; animation:popIn 0.3s cubic-bezier(0.34,1.56,0.64,1);">
        <div style="width:68px; height:68px; border-radius:50%; background:${iconBg}; color:${iconColor}; display:flex; align-items:center; justify-content:center; font-size:2rem; margin:0 auto 16px; box-shadow:0 4px 14px rgba(0,0,0,0.08);">
          ${icon}
        </div>
        <h3 style="font-size:1.3rem; font-weight:800; color:#1E0C26; margin:0 0 8px 0; font-family:var(--font-display, inherit);">${title}</h3>
        <p style="font-size:0.9rem; color:#6B5E74; line-height:1.55; margin:0 0 22px 0;">${message}</p>
        <button type="button" id="btnDrawerModalAction" style="width:100%; height:46px; background:linear-gradient(135deg, #7C2A72 0%, #4D1847 60%, #2D1832 100%); color:#FFFFFF; border:none; border-radius:999px; font-weight:800; font-size:0.92rem; cursor:pointer; box-shadow:0 4px 14px rgba(45,24,50,0.25);">
          ${btnText}
        </button>
      </div>
    `;

    modal.style.display = 'flex';
    document.getElementById('btnDrawerModalAction').onclick = () => {
      modal.style.display = 'none';
      if (typeof onConfirm === 'function') onConfirm();
    };
  };

  window.handleDrawerRegister = async function() {
    const rawPhone = (document.getElementById('regPhone')?.value || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(0, 10);

    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanPincode = (document.getElementById('regPincode')?.value || '').replace(/\D/g, '').slice(0, 6);
    if (cleanPincode && cleanPincode.length !== 6) {
      alert('Please enter a valid 6-digit PIN code (e.g. 600028).');
      return;
    }

    const payload = {
      name: document.getElementById('regName').value.trim(),
      email: document.getElementById('regEmail').value.trim(),
      phone: cleanPhone,
      password: document.getElementById('regPassword').value,
      address: document.getElementById('regAddress').value.trim(),
      city: document.getElementById('regCity').value.trim(),
      pincode: cleanPincode,
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
        syncCustomerLoginState(data.customer, data.token);
        showSideToast({ title: 'Account Created!', message: `Welcome to Nachiyar Herbals, ${data.customer.name}!`, type: 'success' });
        if (window.location.pathname.includes('account')) {
          setTimeout(() => window.location.reload(), 300);
        }
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (e) {
      alert('Could not create account. Please try again.');
    }
  };

  // =========================================================================
  // SECURE BACKEND SESSION VALIDATION & SIGN OUT
  // =========================================================================
  async function validateBackendSession() {
    try {
      const res = await fetch('/api/customer/session?_t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data && data.success && data.authenticated && data.customer) {
        currentCustomer = data.customer;
        localStorage.setItem('nachiyar_customer', JSON.stringify(data.customer));
        updateNavbarUserState();
      } else {
        // If server indicates session is invalid or expired, clear local state
        if (currentCustomer) {
          clearCustomerSession(false);
        }
      }
    } catch (e) {
      // Offline fallback: keep cached customer info
    }
  }

  async function customerSignOut() {
    try {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
      }
    } catch (e) {}

    const token = localStorage.getItem('nachiyar_token') || '';
    try {
      await fetch('/api/customer/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token, 'x-customer-token': token } : {})
        },
        body: JSON.stringify({ token })
      });
    } catch (e) {}

    document.cookie = 'nachiyar_customer_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
    clearCustomerSession(true);
    showSideToast({ title: 'Signed Out', message: 'You have been safely signed out.', type: 'info' });
    if (window.location.pathname.includes('account')) {
      window.location.replace('/');
    }
  }

  window.customerSignOut = customerSignOut;

  function clearCustomerSession(reRender = true) {
    currentCustomer = null;
    localStorage.removeItem('nachiyar_customer');
    localStorage.removeItem('nachiyar_customer_orders');
    localStorage.removeItem('nachiyar_token');
    sessionStorage.clear();
    updateNavbarUserState();
    if (reRender) {
      renderDrawerContent();
    }
    try {
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
  }

  // =========================================================================
  // GOOGLE IDENTITY SERVICES (GIS) INTEGRATION
  // =========================================================================
  let googleClientId = null;
  let gsiInitialized = false;

  function loadGsiScript() {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        return resolve();
      }
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        if (existing.getAttribute('data-loaded') === 'true') return resolve();
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => {
        s.setAttribute('data-loaded', 'true');
        resolve();
      };
      s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(s);
    });
  }

  async function getGoogleClientId() {
    if (googleClientId) return googleClientId;
    try {
      const res = await fetch('/api/customer/google-config?_t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data && data.success && data.configured && data.clientId) {
        googleClientId = data.clientId.trim();
        return googleClientId;
      }
    } catch (e) {
      console.warn('Could not retrieve Google Client ID from backend:', e.message);
    }
    return null;
  }

  async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
      showSideToast('Google Sign-In was cancelled or failed.', 'error');
      return;
    }

    showSideToast({ title: 'Signing In...', message: 'Verifying Google credentials with Nachiyar Herbals...', type: 'info' });

    try {
      const res = await fetch('/api/customer/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();
      if (data.success && data.customer) {
        syncCustomerLoginState(data.customer, data.token);
        showSideToast({ title: 'Welcome!', message: `Signed in as ${data.customer.name}`, type: 'success' });
        if (window.location.pathname.includes('account')) {
          setTimeout(() => window.location.reload(), 300);
        }
      } else {
        showSideToast(data.message || 'Google authentication failed.', 'error');
      }
    } catch (err) {
      console.error('Google Auth Error:', err);
      showSideToast('Could not complete Google Sign-In. Please check your connection.', 'error');
    }
  }

  async function initGoogleIdentityServices() {
    if (gsiInitialized) return true;
    const clientId = await getGoogleClientId();
    if (!clientId) {
      return false;
    }

    try {
      await loadGsiScript();
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        return false;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      gsiInitialized = true;
      renderGsiButtons();
      return true;
    } catch (err) {
      console.error('Error initializing Google Identity Services:', err);
      return false;
    }
  }

  function renderGsiButtons() {
    if (!gsiInitialized || !window.google || !window.google.accounts || !window.google.accounts.id) return;

    // Render inside the slide-out account drawer
    const drawerWrapper = document.getElementById('drawerGoogleBtnWrapper');
    if (drawerWrapper) {
      drawerWrapper.innerHTML = '';
      window.google.accounts.id.renderButton(drawerWrapper, {
        type: 'standard',
        shape: 'pill',
        theme: 'outline',
        text: 'signin_with',
        size: 'large',
        logo_alignment: 'left',
        width: 320
      });
    }

    // Render on standalone account.html page
    const accountPageWrapper = document.getElementById('accountPageGoogleBtnContainer');
    if (accountPageWrapper) {
      accountPageWrapper.innerHTML = '';
      window.google.accounts.id.renderButton(accountPageWrapper, {
        type: 'standard',
        shape: 'pill',
        theme: 'outline',
        text: 'signin_with',
        size: 'large',
        logo_alignment: 'left',
        width: 320
      });
    }
  }

  // Global Google Sign-In handler called by customer login panel button
  window.handleGoogleSignIn = async function() {
    const ready = await initGoogleIdentityServices();
    if (!ready) {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isDev) {
        showSideToast('Google Client ID is not configured in .env. Please set GOOGLE_CLIENT_ID.', 'error');
        console.warn('[NACHIYAR HERBALS] Google Sign-In: GOOGLE_CLIENT_ID is not configured in .env file.');
      } else {
        showSideToast('Google Sign-In is temporarily unavailable. Please use email or password.', 'info');
      }
      return;
    }

    renderGsiButtons();

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMomentum()) {
        const renderedBtn = document.querySelector('#drawerGoogleBtnWrapper [role="button"]') ||
                            document.querySelector('#accountPageGoogleBtnContainer [role="button"]');
        if (renderedBtn) {
          renderedBtn.click();
        }
      }
    });
  };

  // Expose global opener for buttons
  window.openCustomerAccountDrawer = openAccountDrawer;
})();
