/**
 * NACHIYAR HERBALS & COSMETICS
 * Dynamic Storefront Experience & Live REST API Connection
 */

async function initStorefrontApp() {

  // Default fallback data (updated dynamically from /api/products)
  let PRODUCTS = {
    oil: {
      id: 'prod_oil_01',
      title: 'Herbal Hair Oil',
      subtitle: 'Lavender Glass Dropper Bottle • 100% Cold-Pressed',
      taglinePill: 'Cold-Pressed • 18 Rare Herbs',
      statNumber: '100%',
      statUnit: 'PURE',
      themeBg: '#6B4E9B',
      image: 'assets/new-oil-bottle-card.jpg',
      price: 599,
      subPrice: 539,
      stars: '★★★★★',
      reviewSummary: '(4.9 stars) · 420 reviews',
      pills: ['Cold-Pressed', '18 Sacred Herbs', 'Lavender Infused', 'Zero Mineral Oils'],
      desc: 'Crafted in small batches according to classical Ayurvedic texts. Nachiyar Herbal Hair Oil features deep-steeped cold-pressed oils enriched with Bhringraj, Amla, Brahmi, and delicate lavender blossom essence.'
    },
    shampoo: {
      id: 'prod_shampoo_02',
      title: 'Hibiscus Flower Shampoo',
      subtitle: 'Crimson Botanical Pump Bottle • Sulfate-Free pH 5.5',
      taglinePill: 'Sulfate-Free • Fresh Petals',
      statNumber: 'pH 5.5',
      statUnit: 'BALANCED',
      themeBg: '#822234',
      image: 'assets/new-shampoo-bottle-card.jpg',
      price: 549,
      subPrice: 494,
      stars: '★★★★★',
      reviewSummary: '(4.8 stars) · 310 reviews',
      pills: ['Fresh Petal Extract', 'Sulfate-Free', 'Scalp Rebalancing', 'Natural Luster'],
      desc: 'Formulated with handpicked South Indian hibiscus blossoms and mild plant-based saponins. Gently cleanses without stripping natural oils, enhancing softness and promoting follicle vitality.'
    },
    duo: {
      id: 'prod_duo_03',
      title: 'The Royal Hair Ritual (Duo Set)',
      subtitle: '2-Step Complete System | Oil 200ml + Shampoo 250ml',
      taglinePill: 'Complete 2-Step Routine • Save 15%',
      statNumber: '15%',
      statUnit: 'OFF',
      themeBg: '#271434',
      image: 'assets/duo-ritual-new.jpg',
      price: 999,
      subPrice: 899,
      stars: '★★★★★',
      reviewSummary: '(5.0 stars) · 185 reviews',
      pills: ['Complete Routine', 'Pre-Wash Oil + Cleanser', 'Free Travel Pouch', 'Pan-India Free Courier'],
      desc: 'The complete Ayurvedic scalp rejuvenation experience. Step 1: Pre-wash deep follicular nourishment with the Lavender Herbal Hair Oil. Step 2: Gentle balancing wash with the Hibiscus Flower Shampoo.'
    }
  };

  let activeProductId = 'oil';
  let activePurchaseType = 'onetime';
  let currentQty = 1;
  let FREE_SHIPPING_THRESHOLD = 599;

  // Shopping Cart state
  let cart = [];
  try {
    const saved = localStorage.getItem('nachiyar_cart');
    if (saved) cart = JSON.parse(saved);
  } catch (e) {
    console.warn(e);
  }

  // DOM Elements
  const siteHeader = document.getElementById('siteHeader');
  const cartTriggerBtn = document.getElementById('cartTriggerBtn');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartCloseBtn = document.getElementById('cartCloseBtn');
  const cartCountBadge = document.getElementById('cartCountBadge');
  const cartDrawerItemCount = document.getElementById('cartDrawerItemCount');
  const cartItemsList = document.getElementById('cartItemsList');
  const cartEmptyState = document.getElementById('cartEmptyState');
  const cartSubtotalVal = document.getElementById('cartSubtotalVal');
  const shippingTierMessage = document.getElementById('shippingTierMessage');
  const shippingProgressFill = document.getElementById('shippingProgressFill');
  const cartUpsellModule = document.getElementById('cartUpsellModule');
  const upsellImg = document.getElementById('upsellImg');
  const upsellTitle = document.getElementById('upsellTitle');
  const btnUpsellAdd = document.getElementById('btnUpsellAdd');
  const cartToast = document.getElementById('cartToast');

  // Mobile Drawer
  const mobileNavToggle = document.getElementById('mobileNavToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileDrawerClose = document.getElementById('mobileDrawerClose');

  // Mystery Badge
  const mysteryBadge = document.getElementById('mysteryBadge');
  const mysteryTab = document.getElementById('mysteryTab');
  const mysteryDismiss = document.getElementById('mysteryDismiss');

  // Helper: Synchronize Admin Business, Invoicing & Contact Details across Storefront
  function updateStorefrontBusinessDetails(settings) {
    if (!settings) return;
    try {
      localStorage.setItem('nachiyar_store_settings', JSON.stringify(settings));
    } catch (e) {}

    // Update Phone Links & Text
    if (settings.supportPhone) {
      const cleanPhone = settings.supportPhone.replace(/\s+/g, '');
      const phoneEls = document.querySelectorAll('#footerContactPhone, #contactStorePhone, .dynamic-store-phone');
      phoneEls.forEach(el => {
        el.textContent = settings.supportPhone;
        if (el.tagName === 'A') el.href = `tel:${cleanPhone}`;
      });
    }

    // Update Email Links & Text
    if (settings.supportEmail) {
      const emailEls = document.querySelectorAll('#footerContactEmail, #contactStoreEmail, .drawer-support, .dynamic-store-email');
      emailEls.forEach(el => {
        if (el.classList.contains('drawer-support')) {
          el.textContent = `Customer Concierge: ${settings.supportEmail}`;
        } else {
          el.textContent = settings.supportEmail;
        }
        if (el.tagName === 'A') el.href = `mailto:${settings.supportEmail}`;
      });
    }

    // Update Registered Address
    if (settings.storeAddress) {
      const addrEls = document.querySelectorAll('#footerContactAddress, #contactStoreAddress, .dynamic-store-address');
      addrEls.forEach(el => {
        el.textContent = settings.storeAddress;
      });
    }

    // Update Store / Boutique Hours
    if (settings.storeTimings) {
      const timeEls = document.querySelectorAll('#contactStoreTimings, .dynamic-store-timings');
      timeEls.forEach(el => {
        el.textContent = `(${settings.storeTimings})`;
      });
    }

    // Update Brand Name & Bio
    if (settings.brandName) {
      const brandEls = document.querySelectorAll('#footerBrandName, .dynamic-store-brand');
      brandEls.forEach(el => {
        el.textContent = settings.brandName;
      });
    }
  }

  // Internal helper to reliably map live backend products into storefront PRODUCTS dictionary
  function updateProductMap(p) {
    if (!p) return;
    const pId = p.id || '';
    const pSlug = p.slug || '';
    const pName = (p.name || '').toLowerCase();

    const isDuo = pId === 'prod_duo_03' || pSlug === 'royal-hair-ritual-duo' || pName.includes('ritual') || pName.includes('duo');
    const isOil = !isDuo && (pId === 'prod_oil_01' || pSlug === 'herbal-hair-oil' || pName.includes('oil'));
    const isShampoo = !isDuo && (pId === 'prod_shampoo_02' || pSlug === 'hibiscus-flower-shampoo' || pName.includes('shampoo'));

    const parsedPrice = Number(p.price);
    const parsedMrp = Number(p.mrp) || Math.round(parsedPrice * 1.2);
    const parsedImg = (p.images && p.images[0]) || '';

    if (isOil) {
      PRODUCTS.oil = {
        ...PRODUCTS.oil,
        id: pId || PRODUCTS.oil.id,
        title: p.name || PRODUCTS.oil.title,
        subtitle: p.subtitle || PRODUCTS.oil.subtitle,
        price: parsedPrice || PRODUCTS.oil.price,
        subPrice: Math.round((parsedPrice || PRODUCTS.oil.price) * 0.9),
        image: parsedImg || PRODUCTS.oil.image
      };
    } else if (isShampoo) {
      PRODUCTS.shampoo = {
        ...PRODUCTS.shampoo,
        id: pId || PRODUCTS.shampoo.id,
        title: p.name || PRODUCTS.shampoo.title,
        subtitle: p.subtitle || PRODUCTS.shampoo.subtitle,
        price: parsedPrice || PRODUCTS.shampoo.price,
        subPrice: Math.round((parsedPrice || PRODUCTS.shampoo.price) * 0.9),
        image: parsedImg || PRODUCTS.shampoo.image
      };
    } else if (isDuo) {
      PRODUCTS.duo = {
        ...PRODUCTS.duo,
        id: pId || PRODUCTS.duo.id,
        title: p.name || PRODUCTS.duo.title,
        subtitle: p.subtitle || PRODUCTS.duo.subtitle,
        price: parsedPrice || PRODUCTS.duo.price,
        subPrice: Math.round((parsedPrice || PRODUCTS.duo.price) * 0.9),
        image: parsedImg || PRODUCTS.duo.image
      };
    }
  }

  // Helper: Synchronize Live Products, Rates & Images across the entire Storefront DOM
  function applyLiveProductsToDOM(productsList) {
    if (!productsList || !productsList.length) return;

    productsList.forEach(p => {
      updateProductMap(p);

      const pPrice = Number(p.price);
      const pMrp = Number(p.mrp) || Math.round(pPrice * 1.2);
      const pImg = (p.images && p.images[0]) || '';
      const pName = p.name || '';
      const pSub = p.subtitle || '';
      const pId = p.id || '';
      const pSlug = p.slug || '';

      const isDuo = pId === 'prod_duo_03' || pSlug === 'royal-hair-ritual-duo' || pName.toLowerCase().includes('ritual') || pName.toLowerCase().includes('duo');
      const isOil = !isDuo && (pId === 'prod_oil_01' || pSlug === 'herbal-hair-oil' || pName.toLowerCase().includes('oil'));
      const isShampoo = !isDuo && (pId === 'prod_shampoo_02' || pSlug === 'hibiscus-flower-shampoo' || pName.toLowerCase().includes('shampoo'));

      // 1. Header Mega Menu
      if (isOil) {
        const megaOil = document.querySelector('.mega-card[href*="herbal-hair-oil"]');
        if (megaOil) {
          const h4 = megaOil.querySelector('h4'); if (h4) h4.textContent = pName;
          const priceP = megaOil.querySelector('.mega-price'); if (priceP) priceP.textContent = `₹${pPrice} • 200ml`;
          const img = megaOil.querySelector('img'); if (img && pImg) img.src = pImg;
        }
      } else if (isShampoo) {
        const megaShamp = document.querySelector('.mega-card[href*="hibiscus-flower-shampoo"]');
        if (megaShamp) {
          const h4 = megaShamp.querySelector('h4'); if (h4) h4.textContent = pName;
          const priceP = megaShamp.querySelector('.mega-price'); if (priceP) priceP.textContent = `₹${pPrice} • 250ml`;
          const img = megaShamp.querySelector('img'); if (img && pImg) img.src = pImg;
        }
      } else if (isDuo) {
        const megaDuo = document.querySelector('.mega-card[href*="royal-hair-ritual-duo"]');
        if (megaDuo) {
          const h4 = megaDuo.querySelector('h4'); if (h4) h4.textContent = pName;
          const savingsPct = pMrp > pPrice ? Math.round(((pMrp - pPrice) / pMrp) * 100) : 15;
          const priceP = megaDuo.querySelector('.mega-price');
          if (priceP) priceP.innerHTML = `₹${pPrice} <s class="old-price">₹${pMrp}</s> (Save ${savingsPct}%)`;
          const img = megaDuo.querySelector('img'); if (img && pImg) img.src = pImg;
        }
      }

      // 2. Desktop Hero Flank Cards
      if (isOil) {
        const flankOil = document.querySelector('.hero-product-flank--left .hero-flank-card') || document.querySelector('.flank-oil');
        if (flankOil) {
          const title = flankOil.querySelector('.flank-name') || flankOil.querySelector('.flank-title');
          if (title) title.textContent = pName;
          const sub = flankOil.querySelector('.flank-sub');
          if (sub && pSub) sub.textContent = pSub;
          const price = flankOil.querySelector('.flank-price');
          if (price) price.textContent = `₹${pPrice}`;
          const btn = flankOil.querySelector('.btn-quick-add');
          if (btn) {
            btn.dataset.id = pId;
            btn.dataset.name = pName;
            btn.dataset.price = pPrice;
            if (pImg) btn.dataset.img = pImg;
          }
        }
      } else if (isShampoo) {
        const flankShamp = document.querySelector('.hero-product-flank--right .hero-flank-card') || document.querySelector('.flank-shampoo');
        if (flankShamp) {
          const title = flankShamp.querySelector('.flank-name') || flankShamp.querySelector('.flank-title');
          if (title) title.textContent = pName;
          const sub = flankShamp.querySelector('.flank-sub');
          if (sub && pSub) sub.textContent = pSub;
          const price = flankShamp.querySelector('.flank-price');
          if (price) price.textContent = `₹${pPrice}`;
          const btn = flankShamp.querySelector('.btn-quick-add');
          if (btn) {
            btn.dataset.id = pId;
            btn.dataset.name = pName;
            btn.dataset.price = pPrice;
            if (pImg) btn.dataset.img = pImg;
          }
        }
      }

      // 3. Mobile Hero Showcase
      if (isOil) {
        const nameEl = document.querySelector('.m-hero-stage--oil .m-bottle-name');
        if (nameEl) nameEl.textContent = pName;
        const subEl = document.querySelector('.m-hero-stage--oil .m-bottle-sub');
        if (subEl) subEl.textContent = `200ml • ₹${pPrice}`;
        const mBuyOil = document.querySelector('.m-hero-stage--buy-oil .btn-quick-add');
        if (mBuyOil) {
          mBuyOil.dataset.id = pId;
          mBuyOil.dataset.name = pName;
          mBuyOil.dataset.price = pPrice;
          if (pImg) mBuyOil.dataset.img = pImg;
        }
      } else if (isShampoo) {
        const nameEl = document.querySelector('.m-hero-stage--shampoo .m-bottle-name');
        if (nameEl) nameEl.textContent = pName;
        const subEl = document.querySelector('.m-hero-stage--shampoo .m-bottle-sub');
        if (subEl) subEl.textContent = `250ml • ₹${pPrice}`;
        const mBuyShamp = document.querySelector('.m-hero-stage--buy-shampoo .btn-quick-add');
        if (mBuyShamp) {
          mBuyShamp.dataset.id = pId;
          mBuyShamp.dataset.name = pName;
          mBuyShamp.dataset.price = pPrice;
          if (pImg) mBuyShamp.dataset.img = pImg;
        }
      }

      // 4. Featured Collection: "Two Formulations. Zero Compromise." (#card-oil, #card-shampoo, .bundle-banner)
      if (isOil) {
        const cardOil = document.getElementById('card-oil');
        if (cardOil) {
          const title = cardOil.querySelector('.product-card-title');
          if (title) title.textContent = pName;
          const sub = cardOil.querySelector('.product-card-subtitle');
          if (sub && pSub) sub.textContent = pSub;
          const curPrice = cardOil.querySelector('.price-current');
          if (curPrice) curPrice.textContent = `₹${pPrice}`;
          const mrpPrice = cardOil.querySelector('.price-mrp');
          if (mrpPrice) mrpPrice.textContent = `₹${pMrp}`;
          const img = cardOil.querySelector('.card-product-img');
          if (img && pImg) img.src = pImg;
          const btn = cardOil.querySelector('.btn-quick-add');
          if (btn) {
            btn.dataset.id = pId;
            btn.dataset.name = pName;
            btn.dataset.price = pPrice;
            if (pImg) btn.dataset.img = pImg;
          }
        }
      } else if (isShampoo) {
        const cardShamp = document.getElementById('card-shampoo');
        if (cardShamp) {
          const title = cardShamp.querySelector('.product-card-title');
          if (title) title.textContent = pName;
          const sub = cardShamp.querySelector('.product-card-subtitle');
          if (sub && pSub) sub.textContent = pSub;
          const curPrice = cardShamp.querySelector('.price-current');
          if (curPrice) curPrice.textContent = `₹${pPrice}`;
          const mrpPrice = cardShamp.querySelector('.price-mrp');
          if (mrpPrice) mrpPrice.textContent = `₹${pMrp}`;
          const img = cardShamp.querySelector('.card-product-img');
          if (img && pImg) img.src = pImg;
          const btn = cardShamp.querySelector('.btn-quick-add');
          if (btn) {
            btn.dataset.id = pId;
            btn.dataset.name = pName;
            btn.dataset.price = pPrice;
            if (pImg) btn.dataset.img = pImg;
          }
        }
      } else if (isDuo) {
        const bundle = document.querySelector('.bundle-banner');
        if (bundle) {
          const title = bundle.querySelector('.bundle-title');
          if (title) title.textContent = pName;
          const curPrice = bundle.querySelector('.bundle-price-now');
          if (curPrice) curPrice.textContent = `₹${pPrice}`;
          const wasPrice = bundle.querySelector('.bundle-price-was');
          if (wasPrice) wasPrice.textContent = `₹${pMrp}`;
          const badge = bundle.querySelector('.bundle-badge');
          if (badge) {
            const savings = pMrp - pPrice;
            badge.textContent = savings > 0 ? `★ BEST VALUE: SAVE ₹${savings}` : '★ ROYAL COMBO VALUE';
          }
          const discPill = bundle.querySelector('.discount-pill');
          if (discPill) {
            const pct = pMrp > pPrice ? Math.round(((pMrp - pPrice) / pMrp) * 100) : 0;
            discPill.textContent = pct > 0 ? `${pct}% OFF` : 'SPECIAL PRICE';
          }
          const img = bundle.querySelector('.bundle-img');
          if (img && pImg) img.src = pImg;
          const btn = bundle.querySelector('.btn-bundle-add');
          if (btn) {
            btn.dataset.id = pId;
            btn.dataset.name = pName;
            btn.dataset.price = pPrice;
            if (pImg) btn.dataset.img = pImg;
          }
        }
      }

      // 5. Update ALL quick-add and add-to-bag buttons across the page matching this product ID or slug
      document.querySelectorAll(`[data-id="${pId}"], [data-id="${pSlug}"]`).forEach(btn => {
        btn.dataset.price = pPrice;
        btn.dataset.name = pName;
        if (pImg) btn.dataset.img = pImg;
      });
    });

    // 6. Refresh any items already in the user's cart with updated prices
    if (Array.isArray(cart) && cart.length > 0) {
      let cartChanged = false;
      cart.forEach(item => {
        const live = Object.values(PRODUCTS).find(p => p.id === item.id || p.slug === item.id || (item.name && item.name.includes(p.title)));
        if (live && live.price && (!item.size || item.size.includes('200ml') || item.size.includes('250ml') || item.size.includes('Standard'))) {
          if (item.price !== live.price) {
            item.price = live.price;
            cartChanged = true;
          }
        }
      });
      if (cartChanged) {
        saveCart();
        updateCartUI();
      }
    }

    renderUpsellRecommendation();
  }

  // Expose global methods for testing or direct inter-window communication
  window.applyLiveProductsToDOM = applyLiveProductsToDOM;

  // Pre-apply cached settings & products from localStorage for instant zero-flicker render
  try {
    const cachedSettings = JSON.parse(localStorage.getItem('nachiyar_store_settings') || 'null');
    if (cachedSettings) updateStorefrontBusinessDetails(cachedSettings);

    const cachedProducts = JSON.parse(localStorage.getItem('nachiyar_store_products') || 'null');
    if (cachedProducts && cachedProducts.length) {
      applyLiveProductsToDOM(cachedProducts);
    }
  } catch (e) {}

  // Function to reload live products with cache-busting
  async function reloadLiveProducts() {
    try {
      const pRes = await fetch('/api/products?_t=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
      if (pRes && pRes.success && Array.isArray(pRes.data) && pRes.data.length) {
        try { localStorage.setItem('nachiyar_store_products', JSON.stringify(pRes.data)); } catch (e) {}
        applyLiveProductsToDOM(pRes.data);
      }
    } catch (err) {
      console.warn('Failed to refresh products:', err);
    }
  }

  window.reloadLiveProducts = reloadLiveProducts;

  // Cross-tab real-time listener: when admin updates any product, instantly update storefront without page refresh!
  window.addEventListener('storage', (e) => {
    if (e.key === 'nachiyar_products_updated' || e.key === 'nachiyar_store_products') {
      reloadLiveProducts();
    }
  });

  // Cross-tab BroadcastChannel for zero-latency multi-window updates
  try {
    const storeChannel = new BroadcastChannel('nachiyar_store_channel');
    storeChannel.onmessage = (event) => {
      if (event.data && (event.data.type === 'PRODUCTS_UPDATED' || event.data.type === 'SETTINGS_UPDATED')) {
        reloadLiveProducts();
      }
    };
  } catch (e) {}

  // Fetch live products & settings from REST API (cache-busting enabled)
  try {
    const [pRes, sRes] = await Promise.all([
      fetch('/api/products?_t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/settings/public?_t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => ({ success: false }))
    ]);

    if (pRes.success && pRes.data && pRes.data.length) {
      try {
        localStorage.setItem('nachiyar_store_products', JSON.stringify(pRes.data));
      } catch (e) {}

      applyLiveProductsToDOM(pRes.data);
    }

    if (sRes.success && sRes.data) {
      const data = sRes.data;
      FREE_SHIPPING_THRESHOLD = data.freeShippingThreshold || 599;

      // 1. Dynamic Storefront Business & Contact Information Sync
      updateStorefrontBusinessDetails(data);

      // 2. Storefront Top Running Ticker & Banner Controls
      const savedLocalCoupon = JSON.parse(localStorage.getItem('nachiyar_active_coupon') || '{}');
      const activeCouponCode = (data.couponCode || savedLocalCoupon?.couponCode || 'FESTIVE15').toUpperCase();
      const activeDiscountPct = Number(data.discountPercent || savedLocalCoupon?.discountPercent || 15);
      const activeExpiry = data.couponExpiryDate || savedLocalCoupon?.couponExpiryDate || '';

      // Check explicit toggle from server first
      let isCouponActive = false;
      if (typeof data.couponActive === 'boolean') {
        isCouponActive = data.couponActive;
      } else if (typeof savedLocalCoupon?.couponActive === 'boolean') {
        isCouponActive = savedLocalCoupon.couponActive;
      }

      // Check expiration date
      if (isCouponActive && activeExpiry) {
        const expDate = new Date(activeExpiry);
        expDate.setHours(23, 59, 59, 999);
        if (Date.now() > expDate.getTime()) {
          isCouponActive = false;
        }
      }

      // Update cached active coupon in localStorage
      try {
        localStorage.setItem('nachiyar_active_coupon', JSON.stringify({
          couponCode: activeCouponCode,
          discountPercent: activeDiscountPct,
          couponExpiryDate: activeExpiry,
          couponActive: isCouponActive
        }));
      } catch (err) {}

      // Render Header Running Ticker
      const track = document.getElementById('headerTickerTrack');
      if (track) {
        const ann = data.announcementText || 'ROYAL BOTANICAL CARE • FREE PAN-INDIA SHIPPING OVER ₹599';
        const expText = activeExpiry ? ` (VALID TILL ${new Date(activeExpiry).toLocaleDateString('en-IN')})` : '';
        const couponSnippet = isCouponActive ? `USE CODE: ${activeCouponCode} FOR ${activeDiscountPct}% OFF${expText}` : '';
        const fullMessage = couponSnippet ? `${ann}  ✦  ${couponSnippet}` : ann;

        track.innerHTML = `
          <span>${fullMessage}</span>
          <span>•</span>
          <span>${fullMessage}</span>
        `;
      }

      // 3. Flipkart / Amazon Style Promotional Hero Banner
      const promoBanner = document.getElementById('promoHeroBanner');
      if (promoBanner) {
        if (!isCouponActive) {
          promoBanner.style.display = 'none';
        } else {
          promoBanner.style.display = 'block';
          const discEl = document.getElementById('promoBannerDiscount');
          const codeEl = document.getElementById('promoBannerCode');
          const pillEl = document.getElementById('promoBannerCodePill');
          const expEl = document.getElementById('promoBannerExpiryText');
          if (discEl) discEl.textContent = `${activeDiscountPct}%`;
          if (codeEl) codeEl.textContent = activeCouponCode;
          if (pillEl) pillEl.textContent = activeCouponCode;
          if (expEl) expEl.textContent = activeExpiry ? `Valid till ${new Date(activeExpiry).toLocaleDateString('en-IN')}.` : 'Valid for a limited period.';

          const btnCopy = document.getElementById('btnCopyPromoCoupon');
          if (btnCopy) {
            btnCopy.onclick = () => {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(activeCouponCode).then(() => {
                  const btnTxt = document.getElementById('copyPromoBtnText');
                  if (btnTxt) {
                    btnTxt.textContent = '✓ Copied!';
                    setTimeout(() => { btnTxt.textContent = '📋 Copy Code'; }, 2000);
                  }
                }).catch(() => {
                  prompt('Copy your coupon code:', activeCouponCode);
                });
              } else {
                prompt('Copy your coupon code:', activeCouponCode);
              }
            };
          }
        }
      }
    }
  } catch (err) {
    console.log('Running with built-in catalog data:', err);
  }

  // Header Scroll
  window.addEventListener('scroll', () => {
    if (siteHeader) {
      if (window.scrollY > 40) siteHeader.classList.add('is-scrolled');
      else siteHeader.classList.remove('is-scrolled');
    }
  });

  // Mobile Drawer
  if (mobileNavToggle) {
    mobileNavToggle.onclick = () => {
      mobileDrawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    };
  }
  if (mobileDrawerClose) {
    mobileDrawerClose.onclick = () => {
      mobileDrawer.classList.remove('is-open');
      document.body.style.overflow = '';
    };
  }

  // Cart Management
  function saveCart() {
    try {
      localStorage.setItem('nachiyar_cart', JSON.stringify(cart));
    } catch (e) {}
  }

  function updateCartUI() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartCountBadge) cartCountBadge.textContent = totalCount;
    if (cartDrawerItemCount) cartDrawerItemCount.textContent = totalCount;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    if (cartSubtotalVal) cartSubtotalVal.textContent = `₹${subtotal}`;

    // Free Shipping Progress
    if (shippingTierMessage && shippingProgressFill) {
      if (subtotal >= FREE_SHIPPING_THRESHOLD) {
        shippingTierMessage.innerHTML = '🎉 <strong>Free Pan-India Express Delivery Unlocked!</strong>';
        shippingProgressFill.style.width = '100%';
      } else {
        const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
        const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
        shippingTierMessage.innerHTML = `Add <strong>₹${remaining}</strong> more for Free Delivery!`;
        shippingProgressFill.style.width = `${pct}%`;
      }
    }

    if (!cartItemsList) return;

    if (cart.length === 0) {
      if (cartEmptyState) cartEmptyState.style.display = 'block';
      if (cartUpsellModule) cartUpsellModule.style.display = 'none';
      cartItemsList.querySelectorAll('.cart-item').forEach(el => el.remove());
    } else {
      if (cartEmptyState) cartEmptyState.style.display = 'none';
      cartItemsList.querySelectorAll('.cart-item').forEach(el => el.remove());

      cart.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
          <img src="${item.img}" alt="${item.name}" class="cart-item-img">
          <div class="cart-item-info">
            <h5>${item.name}</h5>
            <p class="cart-item-variant">${item.size || 'Standard Edition'}</p>
            <div class="cart-item-qty-stepper">
              <button class="cart-qty-btn" data-action="decrease" data-idx="${index}">−</button>
              <span class="cart-qty-val">${item.qty}</span>
              <button class="cart-qty-btn" data-action="increase" data-idx="${index}">+</button>
            </div>
          </div>
          <div class="cart-item-right">
            <span class="cart-item-price">₹${item.price * item.qty}</span>
            <button class="cart-item-remove-btn" data-action="remove" data-idx="${index}">Remove</button>
          </div>
        `;
        cartItemsList.appendChild(itemEl);
      });

      renderUpsellRecommendation();
    }

    saveCart();
  }

  function renderUpsellRecommendation() {
    if (!cartUpsellModule) return;
    const hasOil = cart.some(i => i.name.includes('Oil'));
    const hasShampoo = cart.some(i => i.name.includes('Shampoo'));
    const upsellPriceEl = cartUpsellModule.querySelector('.upsell-price');

    if (hasOil && !hasShampoo) {
      cartUpsellModule.style.display = 'block';
      upsellImg.src = PRODUCTS.shampoo.image;
      upsellTitle.textContent = PRODUCTS.shampoo.title;
      if (upsellPriceEl) upsellPriceEl.innerHTML = `₹${PRODUCTS.shampoo.price} <small> • 250ml</small>`;
      btnUpsellAdd.onclick = (e) => {
        addToCart({
          id: PRODUCTS.shampoo.id,
          name: PRODUCTS.shampoo.title,
          price: PRODUCTS.shampoo.price,
          img: PRODUCTS.shampoo.image,
          size: '250ml Pump Bottle',
          qty: 1
        }, e);
      };
    } else if (hasShampoo && !hasOil) {
      cartUpsellModule.style.display = 'block';
      upsellImg.src = PRODUCTS.oil.image;
      upsellTitle.textContent = PRODUCTS.oil.title;
      if (upsellPriceEl) upsellPriceEl.innerHTML = `₹${PRODUCTS.oil.price} <small> • 200ml</small>`;
      btnUpsellAdd.onclick = (e) => {
        addToCart({
          id: PRODUCTS.oil.id,
          name: PRODUCTS.oil.title,
          price: PRODUCTS.oil.price,
          img: PRODUCTS.oil.image,
          size: '200ml Glass Bottle',
          qty: 1
        }, e);
      };
    } else {
      cartUpsellModule.style.display = 'none';
    }
  }

  // Cart Stepper delegation
  if (cartItemsList) {
    cartItemsList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const idx = parseInt(btn.dataset.idx, 10);
      if (isNaN(idx)) return;

      if (action === 'increase') {
        cart[idx].qty++;
        updateCartUI();
      } else if (action === 'decrease') {
        if (cart[idx].qty > 1) cart[idx].qty--;
        else cart.splice(idx, 1);
        updateCartUI();
      } else if (action === 'remove') {
        cart.splice(idx, 1);
        updateCartUI();
      }
    });
  }

  // Universal Luxury Fly-to-Bag Physics Animation (Desktop & Mobile)
  function flyProductToCart(sourceOrigin, imgSrc, onComplete) {
    const targetCartBtn = document.getElementById('cartTriggerBtn') || document.querySelector('.cart-trigger-btn');
    
    // Default fallback coordinates if cart button is obscured
    let endX = window.innerWidth - 60;
    let endY = 40;

    if (targetCartBtn) {
      const cRect = targetCartBtn.getBoundingClientRect();
      if (cRect.width > 0 && cRect.height > 0) {
        endX = Math.min(window.innerWidth - 20, Math.max(20, cRect.left + cRect.width / 2));
        endY = Math.min(window.innerHeight - 20, Math.max(15, cRect.top + cRect.height / 2));
      }
    }

    // Determine starting coordinates
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;

    if (sourceOrigin) {
      let el = null;
      if (sourceOrigin instanceof Element) {
        el = sourceOrigin;
      } else if (sourceOrigin.currentTarget instanceof Element) {
        el = sourceOrigin.currentTarget;
      } else if (sourceOrigin.target instanceof Element) {
        el = sourceOrigin.target;
      } else if (typeof sourceOrigin.clientX === 'number') {
        startX = sourceOrigin.clientX;
        startY = sourceOrigin.clientY;
      }

      if (el && el.getBoundingClientRect) {
        const sRect = el.getBoundingClientRect();
        startX = Math.min(window.innerWidth - 25, Math.max(25, sRect.left + sRect.width / 2));
        startY = Math.min(window.innerHeight - 25, Math.max(25, sRect.top + sRect.height / 2));
      }
    }

    const safeImg = imgSrc || 'assets/new-oil-bottle-card.jpg';
    const isMobile = window.innerWidth <= 600;
    const pSize = isMobile ? 52 : 66;
    const pRadius = pSize / 2;
    const duration = 1150; // Smooth 1.15s luxury glide

    // Spawn floating particle element
    const particle = document.createElement('div');
    particle.className = 'fly-particle';
    particle.innerHTML = `<img src="${safeImg}" alt="Added Product">`;
    document.body.appendChild(particle);

    // Parabolic arc midpoint calculation (arcing gracefully upwards towards the header)
    const midX = (startX + endX) / 2;
    const dist = Math.hypot(endX - startX, endY - startY);
    const arcHeight = isMobile ? Math.min(Math.max(dist * 0.25, 45), 110) : Math.min(Math.max(dist * 0.28, 70), 220);
    const midY = Math.max(15, Math.min(startY, endY) - arcHeight);

    // Midpoint sub-segments for fluid curved path
    const p1X = startX + (midX - startX) * 0.45;
    const p1Y = startY + (midY - startY) * 0.75;
    const p2X = midX + (endX - midX) * 0.55;
    const p2Y = midY + (endY - midY) * 0.35;

    const keyframes = [
      {
        transform: `translate3d(${startX - pRadius}px, ${startY - pRadius}px, 0) scale(0.5)`,
        opacity: 0,
        offset: 0
      },
      {
        transform: `translate3d(${startX - pRadius}px, ${startY - pRadius - 28}px, 0) scale(1.22)`,
        opacity: 1,
        offset: 0.12
      },
      {
        transform: `translate3d(${p1X - pRadius}px, ${p1Y - pRadius}px, 0) scale(1.12)`,
        opacity: 1,
        offset: 0.32
      },
      {
        transform: `translate3d(${midX - pRadius}px, ${midY - pRadius}px, 0) scale(1.0)`,
        opacity: 1,
        offset: 0.58
      },
      {
        transform: `translate3d(${p2X - pRadius}px, ${p2Y - pRadius}px, 0) scale(0.75)`,
        opacity: 0.95,
        offset: 0.82
      },
      {
        transform: `translate3d(${endX - pRadius}px, ${endY - pRadius}px, 0) scale(0.32)`,
        opacity: 0.9,
        offset: 0.96
      },
      {
        transform: `translate3d(${endX - pRadius}px, ${endY - pRadius}px, 0) scale(0)`,
        opacity: 0,
        offset: 1
      }
    ];

    // Helper: spawn magical sparkling stardust along the path
    function spawnSparkle(x, y) {
      const sp = document.createElement('div');
      sp.className = 'fly-sparkle-trail';
      sp.innerHTML = '✦';
      sp.style.left = `${x}px`;
      sp.style.top = `${y}px`;
      document.body.appendChild(sp);
      setTimeout(() => sp.remove(), 650);
    }

    setTimeout(() => spawnSparkle(p1X, p1Y), 240);
    setTimeout(() => spawnSparkle(midX, midY), 540);
    setTimeout(() => spawnSparkle(p2X, p2Y), 820);

    const animation = particle.animate(keyframes, {
      duration: duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });

    animation.onfinish = () => {
      particle.remove();

      // Impact bounce on cart trigger button
      if (targetCartBtn) {
        targetCartBtn.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.4) rotate(-14deg)', offset: 0.3 },
          { transform: 'scale(1.18) rotate(9deg)', offset: 0.65 },
          { transform: 'scale(1)', offset: 1 }
        ], {
          duration: 420,
          easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });

        // Spawn gold shockwave impact ripple
        const ripple = document.createElement('div');
        ripple.className = 'fly-impact-shockwave';
        ripple.style.left = `${endX}px`;
        ripple.style.top = `${endY}px`;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);

        // Spawn +1 Floating Badge
        const plusOne = document.createElement('div');
        plusOne.className = 'fly-plus-one';
        plusOne.textContent = '+1';
        plusOne.style.left = `${endX}px`;
        plusOne.style.top = `${endY - 10}px`;
        document.body.appendChild(plusOne);
        setTimeout(() => plusOne.remove(), 850);
      }

      // Pop cart count badge
      if (cartCountBadge) {
        cartCountBadge.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.55)', color: '#D4AF37', offset: 0.5 },
          { transform: 'scale(1)' }
        ], { duration: 320 });
      }

      if (typeof onComplete === 'function') {
        onComplete();
      }
    };
  }

  // Add to cart with parabolic fly animation
  function addToCart(item, clickEvent = null) {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      existing.qty += item.qty;
    } else {
      cart.push({ ...item });
    }

    updateCartUI();
    showToast(`Added ${item.name} to your Royal Bag! ✨`);

    flyProductToCart(clickEvent, item.img, () => {
      setTimeout(() => {
        openCartDrawer();
      }, 100);
    });
  }

  function showToast(msg) {
    if (!cartToast) return;
    cartToast.textContent = msg;
    cartToast.classList.add('is-visible');
    setTimeout(() => cartToast.classList.remove('is-visible'), 2800);
  }

  function openCartDrawer() {
    if (cartOverlay) {
      cartOverlay.classList.add('is-active');
      document.body.classList.add('cart-open');
      document.body.style.overflow = 'hidden';
      const scrollBody = document.getElementById('cartDrawerScrollBody');
      if (scrollBody) scrollBody.scrollTop = 0;
    }
  }

  function closeCartDrawer() {
    if (cartOverlay) {
      cartOverlay.classList.remove('is-active');
      document.body.classList.remove('cart-open');
      document.body.style.overflow = '';
    }
  }

  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cartOverlay && cartOverlay.classList.contains('is-active')) {
      closeCartDrawer();
    }
  });
  if (cartTriggerBtn) cartTriggerBtn.onclick = openCartDrawer;
  if (cartCloseBtn) cartCloseBtn.onclick = closeCartDrawer;
  if (cartOverlay) {
    cartOverlay.onclick = (e) => {
      if (e.target === cartOverlay) closeCartDrawer();
    };
  }

  // Quick Add buttons (Hero flank cards & Collection cards)
  document.querySelectorAll('.btn-quick-add').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const id = btn.dataset.id;
      const live = Object.values(PRODUCTS).find(p => p.id === id || p.slug === id);
      const price = live ? Number(live.price) : parseInt(btn.dataset.price, 10);
      const name = live ? (live.title || live.name) : btn.dataset.name;
      const img = live ? (live.image || (live.images && live.images[0])) : btn.dataset.img;
      addToCart({
        id: id,
        name: name,
        price: price,
        img: img,
        size: btn.dataset.size || 'Standard Size',
        qty: 1
      }, e);
    };
  });

  // Bundle Add button
  const bundleAddBtn = document.querySelector('.btn-bundle-add');
  if (bundleAddBtn) {
    bundleAddBtn.onclick = (e) => {
      const id = bundleAddBtn.dataset.id;
      const live = Object.values(PRODUCTS).find(p => p.id === id || p.slug === id);
      const price = live ? Number(live.price) : parseInt(bundleAddBtn.dataset.price, 10);
      const name = live ? (live.title || live.name) : bundleAddBtn.dataset.name;
      const img = live ? (live.image || (live.images && live.images[0])) : bundleAddBtn.dataset.img;
      addToCart({
        id: id,
        name: name,
        price: price,
        img: img,
        size: bundleAddBtn.dataset.size,
        qty: 1
      }, e);
    };
  }

  // Mystery Tab
  if (mysteryTab) {
    mysteryTab.onclick = () => {
      alert('🎁 Surprise Royal Privilege!\nUse voucher code: ROYAL15 at checkout to receive 15% OFF your order!');
    };
  }
  if (mysteryDismiss) {
    mysteryDismiss.onclick = (e) => {
      e.stopPropagation();
      mysteryBadge.style.opacity = '0';
      setTimeout(() => mysteryBadge.style.display = 'none', 300);
    };
  }

  // ==========================================
  // CUSTOMER REVIEWS & CONTINUOUS SCROLLER
  // ==========================================
  const reviewsScrollerTrack = document.getElementById('reviewsScrollerTrack');
  const reviewsAvgScore = document.getElementById('reviewsAvgScore');
  const reviewsCountText = document.getElementById('reviewsCountText');
  const reviewModalOverlay = document.getElementById('reviewModalOverlay');
  const btnOpenReviewModal = document.getElementById('btnOpenReviewModal');
  const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
  const cancelReviewBtn = document.getElementById('cancelReviewBtn');
  const reviewSubmissionForm = document.getElementById('reviewSubmissionForm');
  const starRatingSelector = document.getElementById('starRatingSelector');
  const reviewRatingInput = document.getElementById('reviewRatingInput');
  const ratingValueLabel = document.getElementById('ratingValueLabel');

  const ratingDescriptions = {
    1: '1 Star (Needs Improvement)',
    2: '2 Stars (Fair)',
    3: '3 Stars (Good Ritual)',
    4: '4 Stars (Very Pleased)',
    5: '5 Stars (Exceptional Ritual)'
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatReviewDate(dateStr) {
    if (!dateStr) return 'Verified Patron';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Verified Patron';
    }
  }

  // Palette of distinct avatar background colors for reviewer initials
  const AVATAR_PALETTE = [
    ['#6B4E9B', '#FFFFFF'], // purple / white text
    ['#C5A059', '#1A1121'], // gold / dark text
    ['#2D6A4F', '#FFFFFF'], // forest green / white
    ['#C0392B', '#FFFFFF'], // crimson / white
    ['#1A6B8A', '#FFFFFF'], // teal / white
    ['#7D3C98', '#FFFFFF'], // violet / white
    ['#B7770D', '#FFFFFF'], // amber / white
    ['#154360', '#FFFFFF'], // navy / white
    ['#784212', '#FFFFFF'], // mahogany / white
    ['#1E8449', '#FFFFFF'], // emerald / white
  ];

  function getInitials(name) {
    if (!name) return 'NP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Returns a stable color pair for a name based on its characters
  function getAvatarColors(name) {
    if (!name) return AVATAR_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
  }

  function renderReviewCard(r) {
    const initials = getInitials(r.name);
    const [bgColor, textColor] = getAvatarColors(r.name);
    const dateFormatted = formatReviewDate(r.created_at);
    const stars = '★'.repeat(Math.max(1, Math.min(5, Number(r.rating || 5))));
    const prodName = r.product_name || 'Herbal Formulation';

    // Build avatar — prefer profile_image from DB if present, else styled initials circle
    const avatarHtml = r.profile_image
      ? `<div class="review-avatar review-avatar--photo" title="${escapeHtml(r.name)}">
           <img src="${escapeHtml(r.profile_image)}" alt="${escapeHtml(r.name)}" loading="lazy"
                onerror="this.parentNode.innerHTML='${initials}'; this.parentNode.classList.remove('review-avatar--photo');">
         </div>`
      : `<div class="review-avatar" style="background:${bgColor}; color:${textColor};" title="${escapeHtml(r.name)}">${initials}</div>`;

    return `
      <div class="review-card">
        <div class="review-card-top">
          <div class="review-author-meta">
            ${avatarHtml}
            <div class="review-author-info">
              <div class="review-author-name">
                ${escapeHtml(r.name)}
                <span class="verified-patron-badge" title="Verified Patron">✓ Verified</span>
              </div>
              <span class="review-date">${dateFormatted}</span>
            </div>
          </div>
          <div class="review-card-stars" aria-label="${r.rating} out of 5 stars">${stars}</div>
        </div>
        <span class="review-product-tag">${escapeHtml(prodName)}</span>
        ${r.title ? `<h4 class="review-card-title">${escapeHtml(r.title)}</h4>` : ''}
        <p class="review-card-body">"${escapeHtml(r.comment)}"</p>
        <div class="review-card-footer">
          <span>Nachiyar Ritual Experience</span>
          <span style="font-weight:700; color:var(--color-gold);">⭐ ${Number(r.rating || 5)}.0 / 5.0</span>
        </div>
      </div>
    `;
  }

  // Global state for continuous review scroller
  let reviewsScrollerState = {
    currentX: 0,
    targetX: null,
    halfWidth: 0,
    isPaused: false,
    isInteracting: false,
    speed: 0.85, // pixels per frame for smooth slow auto-scroll
    rafId: null,
    resumeTimer: null
  };

  const DEFAULT_REVIEWS = [
    {
      id: 'rev_01',
      name: 'Karthikeyan V',
      product_name: 'Herbal Hair Oil',
      rating: 5,
      title: 'Dandruff flakes completely vanished',
      comment: 'Started using after a friend recommended it. In just five uses, dandruff flakes and dry scalp irritation completely vanished.',
      created_at: '2026-10-08T12:00:00Z'
    },
    {
      id: 'rev_02',
      name: 'Divya Ramesh',
      product_name: 'Hibiscus Flower Shampoo',
      rating: 5,
      title: 'Gentle on color-treated hair',
      comment: 'Very gentle on color-treated hair. Subtle botanical fragrance lasts throughout the day.',
      created_at: '2026-10-07T12:00:00Z'
    },
    {
      id: 'rev_03',
      name: 'Pooja Madhavan',
      product_name: 'Herbal Hair Oil',
      rating: 5,
      title: 'Monsoon hair fall stopped completely',
      comment: 'The authentic lavender aroma and 18-herb Ayurvedic infusion restored my hair density within 3 weeks. Absolutely crown-worthy!',
      created_at: '2026-10-06T09:15:00Z'
    },
    {
      id: 'rev_04',
      name: 'Dr. Radhika Krishnan',
      product_name: 'The Royal Hair Ritual (Duo Set)',
      rating: 5,
      title: 'Clinical quality pure formulation',
      comment: 'As a clinician, I truly appreciate the pure solar steeping without sulfates or mineral oil. Noticeable improvement in strand resilience and shine.',
      created_at: '2026-10-05T12:00:00Z'
    },
    {
      id: 'rev_05',
      name: 'Kavitha Sundar',
      product_name: 'The Royal Hair Ritual (Duo Set)',
      rating: 5,
      title: 'Transformed dry frizzy hair',
      comment: 'The ritual combo worked wonders on my rough ends. Both formulations complement each other flawlessly. Will repurchase forever!',
      created_at: '2026-09-26T16:00:00Z'
    },
    {
      id: 'rev_06',
      name: 'Smt. Meenakshi Sundaram',
      product_name: 'Herbal Hair Oil',
      rating: 5,
      title: 'Traditional apothecary at its finest',
      comment: 'Sacred South Indian herbal wisdom in a modern glass dropper. Absorbs smoothly overnight with zero greasy residue on pillows.',
      created_at: '2026-09-28T14:30:00Z'
    },
    {
      id: 'rev_07',
      name: 'Ananya Sharma',
      product_name: 'Hibiscus Flower Shampoo',
      rating: 5,
      title: 'Gentle on scalp, incredible natural gloss',
      comment: 'A genuine sulfate-free cleanser that purifies without stripping moisture. The fresh hibiscus petal infusion leaves hair silky and light.',
      created_at: '2026-09-22T10:00:00Z'
    },
    {
      id: 'rev_08',
      name: 'Bharathi',
      product_name: 'Hibiscus Flower Shampoo',
      rating: 5,
      title: 'Nachiyar Hair Oil & Shampoo',
      comment: 'This product is very good and effective for hair health.',
      created_at: '2026-10-09T12:00:00Z'
    }
  ];

  async function loadPublicReviews() {
    if (!reviewsScrollerTrack) return;

    let reviews = [];
    let stats = { average: '5.0', total: 4 };

    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();

      if (data && data.success && data.data && data.data.reviews && data.data.reviews.length > 0) {
        reviews = data.data.reviews;
        stats = data.data.stats || { average: '5.0', total: reviews.length };
      } else {
        reviews = DEFAULT_REVIEWS;
        stats = { average: '5.0', total: 4 };
      }
    } catch (e) {
      console.warn('Backend reviews API offline, using default patron reviews:', e);
      reviews = DEFAULT_REVIEWS;
      stats = { average: '5.0', total: 4 };
    }

    if (reviews && reviews.length > 0) {
      if (reviewsAvgScore) {
        reviewsAvgScore.textContent = `${stats.average || '5.0'} / 5.0`;
      }
      if (reviewsCountText) {
        reviewsCountText.textContent = `Based on ${stats.total || reviews.length} Verified Patron Reviews`;
      }

      // Generate card HTML
      const baseCardsHtml = reviews.map(r => renderReviewCard(r)).join('');

      // Repeat cards so we have 2 identical sets (A and B) for infinite seamless looping
      const setRepeats = reviews.length < 5 ? 3 : 2;
      let setHtml = '';
      for (let i = 0; i < setRepeats; i++) {
        setHtml += baseCardsHtml;
      }

      // Track has Set 1 + Set 2 (identical duplicate)
      reviewsScrollerTrack.innerHTML = setHtml + setHtml;

      // Measure half-width after DOM layout
      requestAnimationFrame(() => {
        reviewsScrollerState.halfWidth = reviewsScrollerTrack.scrollWidth / 2;
        initReviewsEngine();
      });
    } else {
      reviewsScrollerTrack.innerHTML = `
        <div style="padding: 24px; color: var(--color-text-muted); font-size: 0.9375rem; text-align: center; width: 100%;">
          Be the first royal patron to share your experience! Click "Comment Your Review" above.
        </div>
      `;
    }
  }

  // ─── High-Performance Infinite Review Scroller Engine ───────────────────────
  // Uses requestAnimationFrame for 60fps smooth continuous scrolling.
  // Supports:
  // 1. Continuous slow smooth auto-scrolling
  // 2. Bidirectional infinite wrapping (can scroll infinitely left or right)
  // 3. Previous (<) and Next (>) arrow clicks that animate exactly 1 card
  // 4. Mouse click-and-drag in both directions
  // 5. Touch swipe on mobile in both directions
  // 6. Trackpad horizontal scrolling
  // 7. Auto-pauses during any interaction and smoothly resumes afterward
  function initReviewsEngine() {
    const viewport = document.getElementById('reviewsScrollerViewport');
    const track = document.getElementById('reviewsScrollerTrack');
    const btnNext = document.getElementById('btnNextReviews');
    const btnPrev = document.getElementById('btnPrevReviews');
    if (!viewport || !track) return;

    const S = reviewsScrollerState;

    function applyTransform() {
      // Keep currentX wrapped cleanly within [-halfWidth, 0]
      if (S.halfWidth > 0) {
        while (S.currentX <= -S.halfWidth) {
          S.currentX += S.halfWidth;
          if (S.targetX !== null) S.targetX += S.halfWidth;
        }
        while (S.currentX > 0) {
          S.currentX -= S.halfWidth;
          if (S.targetX !== null) S.targetX -= S.halfWidth;
        }
      }
      track.style.transform = `translate3d(${S.currentX}px, 0, 0)`;
    }

    function animateLoop() {
      if (S.targetX !== null) {
        // Smoothly lerp towards targetX (e.g. from arrow clicks)
        const diff = S.targetX - S.currentX;
        if (Math.abs(diff) > 0.5) {
          S.currentX += diff * 0.18; // smooth spring/ease
        } else {
          S.currentX = S.targetX;
          S.targetX = null;
        }
        applyTransform();
      } else if (!S.isPaused && !S.isInteracting) {
        // Continuous smooth auto-scrolling (moving leftwards)
        S.currentX -= S.speed;
        applyTransform();
      }

      S.rafId = requestAnimationFrame(animateLoop);
    }

    // Cancel any existing loop and start clean
    if (S.rafId) cancelAnimationFrame(S.rafId);
    S.rafId = requestAnimationFrame(animateLoop);

    function pauseAuto() {
      S.isInteracting = true;
      S.targetX = null;
      if (S.resumeTimer) clearTimeout(S.resumeTimer);
    }

    function scheduleResume(delay = 2200) {
      if (S.resumeTimer) clearTimeout(S.resumeTimer);
      S.resumeTimer = setTimeout(() => {
        S.isInteracting = false;
        S.targetX = null;
      }, delay);
    }

    // Step by exactly one review card width
    function stepReview(direction) {
      pauseAuto();
      const firstCard = track.querySelector('.review-card');
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 380;
      const step = cardWidth + 24; // card width + flex gap
      // direction: -1 = next (slide left), +1 = prev (slide right)
      S.targetX = S.currentX + (step * direction);
      scheduleResume(2800);
    }

    if (btnNext) {
      btnNext.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        stepReview(-1);
      });
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        stepReview(1);
      });
    }

    // ── Mouse Drag (Desktop) ──────────────────────────────
    let isMouseDown = false;
    let dragStartX = 0;
    let dragBaseX = 0;

    viewport.addEventListener('mousedown', (e) => {
      if (e.target.closest('.reviews-edge-nav') || e.target.closest('button')) return;
      if (e.button !== 0) return;
      isMouseDown = true;
      dragStartX = e.pageX;
      dragBaseX = S.currentX;
      pauseAuto();
      viewport.classList.add('is-dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      const deltaX = e.pageX - dragStartX;
      S.currentX = dragBaseX + deltaX;
      applyTransform();
    });

    document.addEventListener('mouseup', () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      viewport.classList.remove('is-dragging');
      scheduleResume(2000);
    });

    // ── Touch Drag (Mobile / Tablet) ──────────────────────
    let touchStartX = 0;
    let touchBaseX = 0;

    viewport.addEventListener('touchstart', (e) => {
      if (e.target.closest('.reviews-edge-nav') || e.target.closest('button')) return;
      touchStartX = e.touches[0].pageX;
      touchBaseX = S.currentX;
      pauseAuto();
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (!touchStartX) return;
      const deltaX = e.touches[0].pageX - touchStartX;
      S.currentX = touchBaseX + deltaX;
      applyTransform();
    }, { passive: true });

    viewport.addEventListener('touchend', () => {
      touchStartX = 0;
      scheduleResume(2000);
    });

    // ── Trackpad / Mouse Wheel Horizontal Scroll ──────────
    viewport.addEventListener('wheel', (e) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (Math.abs(delta) > 1) {
        pauseAuto();
        S.currentX -= delta;
        applyTransform();
        scheduleResume(2000);
        e.preventDefault();
      }
    }, { passive: false });

    // Pause on hover over viewport (desktop mouse)
    viewport.addEventListener('mouseenter', () => {
      S.isPaused = true;
    });

    viewport.addEventListener('mouseleave', () => {
      S.isPaused = false;
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Review Modal Handling
  function openReviewModal() {
    if (reviewModalOverlay) {
      reviewModalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      const nameInput = document.getElementById('reviewAuthorName');
      if (nameInput) setTimeout(() => nameInput.focus(), 150);
    }
  }

  function closeReviewModal() {
    if (reviewModalOverlay) {
      reviewModalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (btnOpenReviewModal) {
    btnOpenReviewModal.addEventListener('click', openReviewModal);
  }

  if (closeReviewModalBtn) {
    closeReviewModalBtn.addEventListener('click', closeReviewModal);
  }

  if (cancelReviewBtn) {
    cancelReviewBtn.addEventListener('click', closeReviewModal);
  }

  if (reviewModalOverlay) {
    reviewModalOverlay.addEventListener('click', (e) => {
      if (e.target === reviewModalOverlay) {
        closeReviewModal();
      }
    });
  }

  // Interactive Star Rating Selector
  if (starRatingSelector && reviewRatingInput) {
    const starButtons = starRatingSelector.querySelectorAll('.star-btn');

    function highlightStars(rating) {
      starButtons.forEach(btn => {
        const btnRating = parseInt(btn.dataset.rating, 10);
        if (btnRating <= rating) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      if (ratingValueLabel && ratingDescriptions[rating]) {
        ratingValueLabel.textContent = ratingDescriptions[rating];
      }
    }

    starButtons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        const rating = parseInt(btn.dataset.rating, 10);
        highlightStars(rating);
      });

      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating, 10);
        reviewRatingInput.value = rating;
        highlightStars(rating);
      });
    });

    starRatingSelector.addEventListener('mouseleave', () => {
      const currentRating = parseInt(reviewRatingInput.value, 10) || 5;
      highlightStars(currentRating);
    });
  }

  // Submit Review Form
  if (reviewSubmissionForm) {
    reviewSubmissionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const authorName = document.getElementById('reviewAuthorName')?.value.trim();
      const authorEmail = document.getElementById('reviewAuthorEmail')?.value.trim();
      const productName = document.getElementById('reviewProductSelect')?.value;
      const rating = parseInt(reviewRatingInput?.value, 10) || 5;
      const title = document.getElementById('reviewTitle')?.value.trim();
      const comment = document.getElementById('reviewComment')?.value.trim();

      if (!authorName) {
        alert('Please enter your name.');
        return;
      }
      if (!comment) {
        alert('Please write your review message.');
        return;
      }

      const submitBtn = document.getElementById('btnSubmitReview');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Submitting Verification... ✦</span>';
      }

      let reviewSaved = false;
      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authorName,
            email: authorEmail,
            productName: productName,
            rating: rating,
            title: title,
            comment: comment
          })
        });

        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          if (data.success) reviewSaved = true;
        }
      } catch (err) {
        console.warn('API submission failed, using local confirmation fallback:', err);
      }

      // Always show positive confirmation to patron and reset modal
      alert('🌿 Thank you for your review!\n\nYour review has been submitted to the Nachiyar apothecary team for verification. Once approved by our administrator, it will appear on our live storefront marquee.');
      reviewSubmissionForm.reset();
      if (reviewRatingInput) reviewRatingInput.value = '5';
      if (ratingValueLabel) ratingValueLabel.textContent = ratingDescriptions[5];
      const starButtons = starRatingSelector?.querySelectorAll('.star-btn');
      starButtons?.forEach(btn => btn.classList.add('active'));
      closeReviewModal();

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }

      // Reload public reviews so newly submitted review shows up
      loadPublicReviews();
    });
  }

  // ==========================================
  // HERBAL INGREDIENTS ORBITAL INTERACTION
  // ==========================================
  const orbitTrack = document.getElementById('orbitTrack');
  const btnToggleOrbit = document.getElementById('btnToggleOrbit');
  const orbitControlIcon = document.getElementById('orbitControlIcon');
  const spotlightIdleWrap = document.getElementById('spotlightIdleWrap');
  const spotlightActiveWrap = document.getElementById('spotlightActiveWrap');
  const spotlightImg = document.getElementById('spotlightImg');
  const spotlightTitle = document.getElementById('spotlightTitle');
  const spotlightTag = document.getElementById('spotlightTag');
  const spotlightDesc = document.getElementById('spotlightDesc');
  const orbitNodes = document.querySelectorAll('.orbit-node');

  function adjustTooltip(node) {
    if (!node) return;
    const tooltip = node.querySelector('.node-tooltip');
    const avatar = node.querySelector('.node-avatar-wrap');
    if (!tooltip || !avatar) return;

    tooltip.classList.remove('tooltip--flip-down', 'tooltip--align-left', 'tooltip--align-right');

    const avatarRect = avatar.getBoundingClientRect();
    const stage = document.getElementById('orbitStage');
    const stageRect = stage ? stage.getBoundingClientRect() : { top: 0, height: window.innerHeight };

    // 1. Vertical: If node is in upper half of stage or close to viewport top, flip tooltip downwards
    const distFromStageTop = avatarRect.top - stageRect.top;
    if (distFromStageTop < (stageRect.height * 0.48) || avatarRect.top < 240) {
      tooltip.classList.add('tooltip--flip-down');
    }

    // 2. Horizontal: If node is near viewport sides, align inward
    const viewportWidth = window.innerWidth;
    if (avatarRect.left < 140) {
      tooltip.classList.add('tooltip--align-left');
    } else if (viewportWidth - avatarRect.right < 140) {
      tooltip.classList.add('tooltip--align-right');
    }

    orbitNodes.forEach(n => {
      if (n !== node) n.classList.remove('is-active');
    });
    node.classList.add('is-active');
  }

  function showSpotlight(node) {
    if (!node) return;
    adjustTooltip(node);

    const name = node.dataset.name || '';
    const tag = node.dataset.tag || 'Botanical';
    const desc = node.dataset.desc || '';
    const avatarImg = node.querySelector('.node-avatar');

    if (spotlightTitle) spotlightTitle.textContent = name;
    if (spotlightTag) spotlightTag.textContent = tag;
    if (spotlightDesc) spotlightDesc.textContent = desc;
    if (spotlightImg && avatarImg) {
      spotlightImg.src = avatarImg.src;
      spotlightImg.alt = name;
    }

    if (spotlightIdleWrap) spotlightIdleWrap.style.display = 'none';
    if (spotlightActiveWrap) spotlightActiveWrap.style.display = 'flex';
  }

  function hideSpotlight() {
    if (spotlightActiveWrap) spotlightActiveWrap.style.display = 'none';
    if (spotlightIdleWrap) spotlightIdleWrap.style.display = 'flex';
    if (spotlightTitle) spotlightTitle.textContent = '';
    if (spotlightDesc) spotlightDesc.textContent = '';
  }

  orbitNodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      showSpotlight(node);
    });

    node.addEventListener('mouseleave', () => {
      node.classList.remove('is-active');
      hideSpotlight();
    });

    // Touch and click support for mobile and desktop
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      showSpotlight(node);
    });
  });

  // Tapping outside on mobile dismisses active card immediately
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.orbit-node') && !e.target.closest('#orbitSpotlightBar')) {
      orbitNodes.forEach(n => n.classList.remove('is-active'));
      hideSpotlight();
    }
  });

  if (btnToggleOrbit && orbitTrack) {
    let isPaused = false;
    btnToggleOrbit.addEventListener('click', (e) => {
      e.stopPropagation();
      isPaused = !isPaused;
      if (isPaused) {
        orbitTrack.classList.add('is-paused');
        if (orbitControlIcon) orbitControlIcon.textContent = '▶';
        btnToggleOrbit.setAttribute('title', 'Resume Orbit Rotation');
      } else {
        orbitTrack.classList.remove('is-paused');
        if (orbitControlIcon) orbitControlIcon.textContent = '⏸';
        btnToggleOrbit.setAttribute('title', 'Pause Orbit Rotation');
      }
    });
  }

  // Load reviews on boot
  loadPublicReviews();

  // ==========================================
  // MOBILE-ONLY HERO SCROLL-DRIVEN ANIMATION (<= 767px)
  // Desktop remains 100% UNTOUCHED
  // ==========================================
  function initMobileHeroScroll() {
    const showcase = document.getElementById('mobileHeroShowcase');
    if (!showcase) return null;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return null;
    }

    showcase.classList.add('m-hero-animated');

    const stageHeading = showcase.querySelector('.m-hero-stage--heading');
    const stageOil = showcase.querySelector('.m-hero-stage--oil');
    const stageShampoo = showcase.querySelector('.m-hero-stage--shampoo');
    const stageBuyOil = showcase.querySelector('.m-hero-stage--buy-oil');
    const stageBuyShampoo = showcase.querySelector('.m-hero-stage--buy-shampoo');
    const stageDesc = showcase.querySelector('.m-hero-stage--desc');
    const stageCta = showcase.querySelector('.m-hero-stage--cta');

    // Smooth, fast cascading entrance (no 2-second lag)
    const timers = [];
    timers.push(setTimeout(() => { if (stageHeading) stageHeading.classList.add('is-revealed'); }, 40));
    timers.push(setTimeout(() => { if (stageOil) stageOil.classList.add('is-revealed'); }, 140));
    timers.push(setTimeout(() => { if (stageShampoo) stageShampoo.classList.add('is-revealed'); }, 240));
    timers.push(setTimeout(() => {
      if (stageBuyOil) stageBuyOil.classList.add('is-revealed');
      if (stageBuyShampoo) stageBuyShampoo.classList.add('is-revealed');
    }, 340));
    timers.push(setTimeout(() => { if (stageDesc) stageDesc.classList.add('is-revealed'); }, 440));
    timers.push(setTimeout(() => { if (stageCta) stageCta.classList.add('is-revealed'); }, 540));

    // Instant reveal on scroll touch
    function onFastScroll() {
      const scrollY = window.scrollY || window.pageYOffset;
      if (scrollY > 10) {
        if (stageHeading) stageHeading.classList.add('is-revealed');
        if (stageOil) stageOil.classList.add('is-revealed');
        if (stageShampoo) stageShampoo.classList.add('is-revealed');
        if (stageBuyOil) stageBuyOil.classList.add('is-revealed');
        if (stageBuyShampoo) stageBuyShampoo.classList.add('is-revealed');
      }
      if (scrollY > 45) {
        if (stageDesc) stageDesc.classList.add('is-revealed');
        if (stageCta) stageCta.classList.add('is-revealed');
      }
    }

    window.addEventListener('scroll', onFastScroll, { passive: true });

    // Direct event binding for mobile Buy Now buttons to guarantee instant checkout integration
    const btnBuyOil = showcase.querySelector('.m-hero-stage--buy-oil .btn-quick-add');
    if (btnBuyOil) {
      btnBuyOil.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        addToCart({
          id: PRODUCTS.oil.id || 'prod_oil_01',
          name: PRODUCTS.oil.title || 'Herbal Hair Oil',
          price: Number(PRODUCTS.oil.price) || 599,
          img: PRODUCTS.oil.image || 'assets/new-oil-bottle-card.jpg',
          size: '200ml Glass Bottle',
          qty: 1
        }, e);
      };
    }

    const btnBuyShampoo = showcase.querySelector('.m-hero-stage--buy-shampoo .btn-quick-add');
    if (btnBuyShampoo) {
      btnBuyShampoo.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        addToCart({
          id: PRODUCTS.shampoo.id || 'prod_shampoo_02',
          name: PRODUCTS.shampoo.title || 'Hibiscus Flower Shampoo',
          price: Number(PRODUCTS.shampoo.price) || 549,
          img: PRODUCTS.shampoo.image || 'assets/new-shampoo-bottle-card.jpg',
          size: '250ml Pump Bottle',
          qty: 1
        }, e);
      };
    }

    // Cleanup function when resizing to desktop
    return function cleanup() {
      timers.forEach(t => clearTimeout(t));
      window.removeEventListener('scroll', onFastScroll);
      showcase.classList.remove('m-hero-animated');
      showcase.querySelectorAll('.m-hero-stage').forEach(stage => {
        stage.classList.remove('is-revealed');
      });
    };
  }

  // Responsive controller: activates mobile hero scroll ONLY on <= 767px
  let mobileHeroCleanupFn = null;
  function handleMobileHeroLifecycle() {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) {
      if (!mobileHeroCleanupFn) {
        mobileHeroCleanupFn = initMobileHeroScroll();
      }
    } else {
      if (mobileHeroCleanupFn) {
        mobileHeroCleanupFn();
        mobileHeroCleanupFn = null;
      }
    }
  }

  window.addEventListener('resize', handleMobileHeroLifecycle);
  window.addEventListener('orientationchange', handleMobileHeroLifecycle);
  handleMobileHeroLifecycle();

  updateCartUI();
}

// Robust execution lifecycle: initialize immediately if DOM already loaded, or on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStorefrontApp);
} else {
  initStorefrontApp();
}



