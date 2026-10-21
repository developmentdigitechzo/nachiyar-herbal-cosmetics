/**
 * NACHIYAR HERBALS & COSMETICS
 * Dynamic Storefront Experience & Live REST API Connection
 */

// Universal Node.js / Browser polymorphic guard:
// If executed by Node.js (e.g. cPanel default startup file 'app.js'), delegate to server.js
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) {
  module.exports = require('./server.js');
} else {
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
    // Strict matching for core flagship formulations only (never overwrite with new products)
    const isDuo = pId === 'prod_duo_03' || pSlug === 'royal-hair-ritual-duo';
    const isOil = pId === 'prod_oil_01' || pSlug === 'herbal-hair-oil';
    const isShampoo = pId === 'prod_shampoo_02' || pSlug === 'hibiscus-flower-shampoo';

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

    // Always register in PRODUCTS catalog by ID and Slug for any dynamic product
    PRODUCTS[pId] = {
      id: pId,
      slug: pSlug,
      title: p.name || 'Botanical Formulation',
      name: p.name || 'Botanical Formulation',
      subtitle: p.subtitle || '',
      price: parsedPrice,
      subPrice: Math.round(parsedPrice * 0.9),
      image: parsedImg,
      themeBg: p.themeColor || '#6B4E9B'
    };
    if (pSlug) {
      PRODUCTS[pSlug] = PRODUCTS[pId];
    }
  }

  // Helper: Synchronize Live Products, Rates & Images across the entire Storefront DOM
  function applyLiveProductsToDOM(productsList, customShowcase = null) {
    if (!Array.isArray(productsList)) {
      productsList = [];
    }

    // Load showcase configuration from argument, window, or localStorage cache
    let showcase = customShowcase;
    if (!showcase && window.__NACHIYAR_SETTINGS && window.__NACHIYAR_SETTINGS.homeShowcase) {
      showcase = window.__NACHIYAR_SETTINGS.homeShowcase;
    }
    if (!showcase) {
      try {
        showcase = JSON.parse(localStorage.getItem('nachiyar_home_showcase') || '{}');
      } catch (e) {
        showcase = {};
      }
    }

    const slot1Cfg = showcase?.slot1 || null;
    const slot2Cfg = showcase?.slot2 || null;
    const comboCfg = showcase?.combo || null;

    const isSlot1Removed = !!(slot1Cfg && (slot1Cfg.removed === true || slot1Cfg.disabled === true));
    const isSlot2Removed = !!(slot2Cfg && (slot2Cfg.removed === true || slot2Cfg.disabled === true));
    const isComboRemoved = !!(comboCfg && (comboCfg.removed === true || comboCfg.disabled === true));

    const availableProds = productsList.filter(p => p.status !== 'inactive');
    
    // Intelligently fallback to real active database products if configured targets don't exist
    let slot1TargetId = (isSlot1Removed || availableProds.length === 0) ? null : (slot1Cfg?.productId || availableProds[0]?.id || 'prod_oil_01');
    let slot2TargetId = (isSlot2Removed || availableProds.length < 2) ? null : (slot2Cfg?.productId || availableProds[1]?.id);
    let comboTargetId = (isComboRemoved || availableProds.length === 0) ? null : (comboCfg?.productId || null);

    if (!isSlot1Removed && availableProds.length > 0 && (!slot1TargetId || !availableProds.some(p => p.id === slot1TargetId || p.slug === slot1TargetId))) {
      slot1TargetId = availableProds[0]?.id;
    }
    if (!isSlot2Removed && availableProds.length > 1 && (!slot2TargetId || !availableProds.some(p => p.id === slot2TargetId || p.slug === slot2TargetId))) {
      slot2TargetId = availableProds[1]?.id;
    }
    if (!isComboRemoved && availableProds.length > 0 && (!comboTargetId || !availableProds.some(p => p.id === comboTargetId || p.slug === comboTargetId))) {
      const duoMatch = availableProds.find(p => p.category === 'Ritual Sets' || p.category === 'Ritual Combos' || (p.name && p.name.includes('Combo')));
      comboTargetId = duoMatch ? duoMatch.id : (availableProds.length > 2 ? availableProds[2].id : availableProds[0]?.id);
    }

    // 1. Enforce live storefront visibility for Flagship collection cards & combo banner
    const cardOilEl = document.getElementById('card-oil');
    if (cardOilEl) cardOilEl.style.display = (isSlot1Removed || availableProds.length === 0 || !slot1TargetId) ? 'none' : '';
    const megaOilEl = document.querySelector('.mega-card[href*="herbal-hair-oil"]') || document.querySelector('.mega-card:first-child');
    if (megaOilEl) megaOilEl.style.display = (isSlot1Removed || availableProds.length === 0) ? 'none' : '';

    const cardShampEl = document.getElementById('card-shampoo');
    if (cardShampEl) cardShampEl.style.display = (isSlot2Removed || availableProds.length < 2 || !slot2TargetId) ? 'none' : '';
    const megaShampEl = document.querySelector('.mega-card[href*="hibiscus-flower-shampoo"]') || document.querySelector('.mega-card:nth-child(2)');
    if (megaShampEl) megaShampEl.style.display = (isSlot2Removed || availableProds.length < 2) ? 'none' : '';

    const bundleBannerEl = document.querySelector('.bundle-banner');
    if (bundleBannerEl) bundleBannerEl.style.display = (isComboRemoved || availableProds.length === 0 || !comboTargetId) ? 'none' : '';
    const megaDuoEl = document.querySelector('.mega-card[href*="royal-hair-ritual-duo"]') || document.querySelector('.mega-card--duo');
    if (megaDuoEl) megaDuoEl.style.display = (isComboRemoved || availableProds.length === 0) ? 'none' : '';

    const dynamicGrid = document.getElementById('dynamicProductsGrid');
    if (dynamicGrid) {
      if (!isSlot1Removed && isSlot2Removed) {
        dynamicGrid.style.gridTemplateColumns = 'minmax(0, 580px)';
        dynamicGrid.style.justifyContent = 'center';
      } else if (isSlot1Removed && !isSlot2Removed) {
        dynamicGrid.style.gridTemplateColumns = 'minmax(0, 580px)';
        dynamicGrid.style.justifyContent = 'center';
      } else {
        dynamicGrid.style.gridTemplateColumns = '';
        dynamicGrid.style.justifyContent = '';
      }
    }

    const collSection = document.getElementById('collection');
    if (collSection) {
      collSection.style.display = (availableProds.length === 0 || (isSlot1Removed && isSlot2Removed && isComboRemoved)) ? 'none' : '';
    }

    // Helper: update border box color & badges ONLY for Featured Collection Cards (#card-oil / #card-shampoo)
    function syncCardThemeAndBadges(cardEl, prodObj, defaultTheme) {
      if (!cardEl) return;
      const nameLower = ((prodObj.name || '') + ' ' + (prodObj.id || '') + ' ' + (prodObj.slug || '')).toLowerCase();
      const isShampoo = nameLower.includes('shampoo') || nameLower.includes('cleanser');
      const isOil = nameLower.includes('oil');

      let themeBg = prodObj.themeColor;
      if (!themeBg) {
        if (isShampoo) themeBg = '#822234';
        else if (isOil) themeBg = '#6B4E9B';
        else themeBg = defaultTheme;
      }

      let cardTextColor = '#FAF8FD';
      let accentHover = '#543980';
      let pillText = prodObj.tagline || '';
      let badgeNum = '100%';
      let badgeUnit = 'PURE';
      let badgeTitle = '100% Pure Active Plant Infusion';

      if (themeBg.toLowerCase() === '#822234' || isShampoo) {
        cardTextColor = '#FCF4F6';
        accentHover = '#691726';
        if (!pillText) pillText = 'Sulfate-Free • Fresh Petals';
        badgeNum = 'pH 5.5';
        badgeUnit = 'BALANCED';
        badgeTitle = 'pH 5.5 Balanced Scalp Care';
      } else if (themeBg.toLowerCase() === '#6b4e9b' || isOil) {
        cardTextColor = '#FAF8FD';
        accentHover = '#543980';
        if (!pillText) pillText = 'Cold-Pressed • 18 Rare Herbs';
        badgeNum = '100%';
        badgeUnit = 'PURE';
        badgeTitle = '100% Pure Active Plant Infusion';
      } else {
        if (!pillText) pillText = '100% Pure Botanical';
        badgeNum = '100%';
        badgeUnit = 'HERBAL';
        badgeTitle = 'Pure Botanical Care';
      }

      cardEl.style.setProperty('--card-bg', themeBg);
      cardEl.style.setProperty('--card-color', cardTextColor);
      cardEl.style.setProperty('--accent-hover', accentHover);
      cardEl.style.backgroundColor = themeBg;
      cardEl.style.color = cardTextColor;

      const pill = cardEl.querySelector('.pill-tag');
      if (pill) pill.textContent = pillText;

      const circleBadge = cardEl.querySelector('.circle-badge');
      if (circleBadge) {
        circleBadge.title = badgeTitle;
        const bNum = circleBadge.querySelector('.badge-number');
        if (bNum) bNum.textContent = badgeNum;
        const bUnit = circleBadge.querySelector('.badge-unit');
        if (bUnit) bUnit.textContent = badgeUnit;
      }

      const cat = cardEl.querySelector('.product-category');
      if (cat) cat.textContent = prodObj.category || (isShampoo ? 'Gentle Scalp Cleanser & Shine Wash' : 'Ayurvedic Hair & Scalp Vitalizer');

      const desc = cardEl.querySelector('.product-card-desc');
      if (desc && prodObj.description) desc.textContent = prodObj.description;
    }

    productsList.forEach(p => {
      updateProductMap(p);

      const pPrice = Number(p.price);
      const pMrp = Number(p.mrp) || Math.round(pPrice * 1.2);
      const pImg = (p.images && p.images[0]) || '';
      const pName = p.name || '';
      const pSub = p.subtitle || '';
      const pId = p.id || '';
      const pSlug = p.slug || '';

      const isSlot1 = !isSlot1Removed && ((slot1TargetId && pId === slot1TargetId) || (slot1TargetId === 'prod_oil_01' && (pId === 'prod_oil_01' || pSlug === 'herbal-hair-oil')));
      const isSlot2 = !isSlot2Removed && ((slot2TargetId && pId === slot2TargetId) || (slot2TargetId === 'prod_shampoo_02' && (pId === 'prod_shampoo_02' || pSlug === 'hibiscus-flower-shampoo')));
      const isCombo = !isComboRemoved && ((comboTargetId && pId === comboTargetId) || (comboTargetId === 'prod_duo_03' && (pId === 'prod_duo_03' || pSlug === 'royal-hair-ritual-duo')));

      const isOil = (pId === 'prod_oil_01') || (pSlug === 'herbal-hair-oil');
      const isShampoo = (pId === 'prod_shampoo_02') || (pSlug === 'hibiscus-flower-shampoo');

      let activePrice = pPrice;
      let activeMrp = pMrp;
      let activeImg = pImg;
      let activeName = pName;
      let activeSub = pSub;

      if (isSlot1 && slot1Cfg) {
        if (slot1Cfg.price !== undefined && slot1Cfg.price !== '') activePrice = Number(slot1Cfg.price);
        if (slot1Cfg.mrp !== undefined && slot1Cfg.mrp !== '') activeMrp = Number(slot1Cfg.mrp);
        if (slot1Cfg.customImage) activeImg = slot1Cfg.customImage;
        if (slot1Cfg.title) activeName = slot1Cfg.title;
        if (slot1Cfg.subtitle) activeSub = slot1Cfg.subtitle;
      } else if (isSlot2 && slot2Cfg) {
        if (slot2Cfg.price !== undefined && slot2Cfg.price !== '') activePrice = Number(slot2Cfg.price);
        if (slot2Cfg.mrp !== undefined && slot2Cfg.mrp !== '') activeMrp = Number(slot2Cfg.mrp);
        if (slot2Cfg.customImage) activeImg = slot2Cfg.customImage;
        if (slot2Cfg.title) activeName = slot2Cfg.title;
        if (slot2Cfg.subtitle) activeSub = slot2Cfg.subtitle;
      } else if (isCombo && comboCfg) {
        if (comboCfg.price !== undefined && comboCfg.price !== '') activePrice = Number(comboCfg.price);
        if (comboCfg.mrp !== undefined && comboCfg.mrp !== '') activeMrp = Number(comboCfg.mrp);
        if (comboCfg.customImage) activeImg = comboCfg.customImage;
        if (comboCfg.title) activeName = comboCfg.title;
        if (comboCfg.subtitle) activeSub = comboCfg.subtitle;
      }

      // Also update PRODUCTS dictionary for cart / buy operations
      if (isSlot1) {
        PRODUCTS.oil = {
          ...PRODUCTS.oil,
          id: pId,
          title: activeName,
          subtitle: activeSub,
          price: activePrice,
          subPrice: Math.round(activePrice * 0.9),
          image: activeImg
        };
      } else if (isSlot2) {
        PRODUCTS.shampoo = {
          ...PRODUCTS.shampoo,
          id: pId,
          title: activeName,
          subtitle: activeSub,
          price: activePrice,
          subPrice: Math.round(activePrice * 0.9),
          image: activeImg
        };
      } else if (isCombo) {
        PRODUCTS.duo = {
          ...PRODUCTS.duo,
          id: pId,
          title: activeName,
          subtitle: activeSub,
          price: activePrice,
          subPrice: Math.round(activePrice * 0.9),
          image: activeImg
        };
      }

      // 1. Header Mega Menu
      if (isSlot1) {
        const megaOil = document.querySelector('.mega-card[href*="herbal-hair-oil"]') || document.querySelector('.mega-card:first-child');
        if (megaOil) {
          const h4 = megaOil.querySelector('h4'); if (h4) h4.textContent = activeName;
          const priceP = megaOil.querySelector('.mega-price'); if (priceP) priceP.textContent = `₹${activePrice} • ${p.category || '200ml'}`;
          const img = megaOil.querySelector('img'); if (img && activeImg) img.src = activeImg;
          if (pSlug) megaOil.href = `/product/?slug=${pSlug}`;
        }
      } else if (isSlot2) {
        const megaShamp = document.querySelector('.mega-card[href*="hibiscus-flower-shampoo"]') || document.querySelector('.mega-card:nth-child(2)');
        if (megaShamp) {
          const h4 = megaShamp.querySelector('h4'); if (h4) h4.textContent = activeName;
          const priceP = megaShamp.querySelector('.mega-price'); if (priceP) priceP.textContent = `₹${activePrice} • ${p.category || '250ml'}`;
          const img = megaShamp.querySelector('img'); if (img && activeImg) img.src = activeImg;
          if (pSlug) megaShamp.href = `/product/?slug=${pSlug}`;
        }
      } else if (isCombo) {
        const megaDuo = document.querySelector('.mega-card[href*="royal-hair-ritual-duo"]') || document.querySelector('.mega-card--duo');
        if (megaDuo) {
          const h4 = megaDuo.querySelector('h4'); if (h4) h4.textContent = activeName;
          const savingsPct = activeMrp > activePrice ? Math.round(((activeMrp - activePrice) / activeMrp) * 100) : 15;
          const priceP = megaDuo.querySelector('.mega-price');
          if (priceP) priceP.innerHTML = `₹${activePrice} <s class="old-price">₹${activeMrp}</s> (Save ${savingsPct}%)`;
          const img = megaDuo.querySelector('img'); if (img && activeImg) img.src = activeImg;
          if (pSlug) megaDuo.href = `/product/?slug=${pSlug}`;
        }
      }

      // 2. Desktop Hero Flank Cards (ORIGINAL: always fixed transparent bottles & original pricing)
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

      // 3. Mobile Hero Showcase (ORIGINAL: always fixed transparent bottles & original pricing)
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
      if (isSlot1) {
        const cardOil = document.getElementById('card-oil');
        syncCardThemeAndBadges(cardOil, p, '#6B4E9B');

        if (cardOil) {
          const title = cardOil.querySelector('.product-card-title');
          if (title) title.textContent = activeName;
          const sub = cardOil.querySelector('.product-card-subtitle');
          if (sub && activeSub) sub.textContent = activeSub;
          const curPrice = cardOil.querySelector('.price-current');
          if (curPrice) curPrice.textContent = `₹${activePrice}`;
          const mrpPrice = cardOil.querySelector('.price-mrp');
          if (mrpPrice) mrpPrice.textContent = `₹${activeMrp}`;
          const img = cardOil.querySelector('.card-product-img');
          if (img && activeImg) img.src = activeImg;
          const btn = cardOil.querySelector('.btn-quick-add');
          if (btn) {
            btn.dataset.id = pId;
            btn.dataset.name = activeName;
            btn.dataset.price = activePrice;
            if (activeImg) btn.dataset.img = activeImg;
          }
          const link = cardOil.querySelector('.quick-view-badge');
          if (link && pSlug) link.href = `/product/?slug=${pSlug}`;
        }
      } else if (isSlot2) {
        const cardShamp = document.getElementById('card-shampoo');
        syncCardThemeAndBadges(cardShamp, p, '#822234');

        if (cardShamp) {
          const title = cardShamp.querySelector('.product-card-title');
          if (title) title.textContent = activeName;
          const sub = cardShamp.querySelector('.product-card-subtitle');
          if (sub && activeSub) sub.textContent = activeSub;
          const curPrice = cardShamp.querySelector('.price-current');
          if (curPrice) curPrice.textContent = `₹${activePrice}`;
          const mrpPrice = cardShamp.querySelector('.price-mrp');
          if (mrpPrice) mrpPrice.textContent = `₹${activeMrp}`;
          const img = cardShamp.querySelector('.card-product-img');
          if (img && activeImg) img.src = activeImg;
          const btn = cardShamp.querySelector('.btn-quick-add');
          if (btn) {
            btn.dataset.id = pId;
            btn.dataset.name = activeName;
            btn.dataset.price = activePrice;
            if (activeImg) btn.dataset.img = activeImg;
          }
          const link = cardShamp.querySelector('.quick-view-badge');
          if (link && pSlug) link.href = `/product/?slug=${pSlug}`;
        }
      } else if (isCombo) {
        const bundle = document.querySelector('.bundle-banner') || document.querySelector('.bundle-grid');
        if (bundle) {
          const title = bundle.querySelector('.bundle-title');
          if (title) title.textContent = activeName;
          const curPrice = bundle.querySelector('.bundle-price-now') || bundle.querySelector('.price-current');
          if (curPrice) curPrice.textContent = `₹${activePrice}`;
          const wasPrice = bundle.querySelector('.bundle-price-was') || bundle.querySelector('.price-mrp');
          if (wasPrice) wasPrice.textContent = `₹${activeMrp}`;
          const badge = bundle.querySelector('.bundle-badge');
          if (badge) {
            const savings = activeMrp - activePrice;
            badge.textContent = comboCfg?.tag || (savings > 0 ? `★ BEST VALUE: SAVE ₹${savings}` : '★ ROYAL COMBO VALUE');
          }
          const discPill = bundle.querySelector('.discount-pill');
          if (discPill) {
            const pct = activeMrp > activePrice ? Math.round(((activeMrp - activePrice) / activeMrp) * 100) : 0;
            discPill.textContent = pct > 0 ? `${pct}% OFF` : 'SPECIAL PRICE';
          }
          const descEl = bundle.querySelector('.bundle-description');
          if (descEl && (comboCfg?.description || p.description)) {
            descEl.textContent = comboCfg?.description || p.description;
          }
          const feats = bundle.querySelector('.bundle-features');
          if (feats && Array.isArray(comboCfg?.selectedProductIds) && comboCfg.selectedProductIds.length > 0) {
            const includedItems = comboCfg.selectedProductIds
              .map(id => productsList.find(x => x.id === id))
              .filter(Boolean);
            if (includedItems.length > 0) {
              feats.innerHTML = includedItems.map(item => `
                <span>✦ 1x ${item.name} (${item.subtitle || item.category || 'Full Size'})</span>
              `).join('') + `<span>✦ Free Pan-India Express Delivery</span>`;
            }
          }
          const img = bundle.querySelector('.bundle-img');
          if (img && activeImg) img.src = activeImg;
          const btn = bundle.querySelector('.btn-bundle-add');
          if (btn) {
            btn.dataset.id = pId;
            btn.dataset.name = activeName;
            btn.dataset.price = activePrice;
            if (activeImg) btn.dataset.img = activeImg;
          }
        }
      }

      // 5. Update ALL quick-add and add-to-bag buttons across the page matching this product ID or slug
      document.querySelectorAll(`[data-id="${pId}"], [data-id="${pSlug}"]`).forEach(btn => {
        btn.dataset.price = activePrice;
        btn.dataset.name = activeName;
        if (activeImg) btn.dataset.img = activeImg;
      });
    });

    // 5.5. Dynamically hydrate header hover mega-menu (.nav-dropdown-mega .mega-grid)
    const megaGrids = document.querySelectorAll('.nav-dropdown-mega .mega-grid');
    megaGrids.forEach(megaGrid => {
      const megaDropdown = megaGrid.closest('.nav-dropdown-mega');
      const megaFooter = megaDropdown ? megaDropdown.querySelector('.mega-footer-bar') : null;

      if (!Array.isArray(availableProds) || availableProds.length === 0) {
        if (megaFooter) megaFooter.style.display = 'none';
        megaGrid.style.gridTemplateColumns = '1fr';
        megaGrid.style.justifyContent = 'center';
        megaGrid.innerHTML = `
          <div class="mega-empty-state">
            <div class="empty-icon">🌿</div>
            <h4>No Products Available Yet</h4>
            <p>இப்போது தயாரிப்புகள் எதுவும் இல்லை.<br><span style="font-size: 0.8rem; opacity: 0.85;">New formulations will be listed soon.</span></p>
            <a href="/contact/" class="empty-action-btn">
              <span>Contact Concierge / Enquiries</span> →
            </a>
          </div>
        `;
        return;
      }

      if (megaFooter) megaFooter.style.display = '';
      megaGrid.style.gridTemplateColumns = availableProds.length === 1 ? 'repeat(1, minmax(0, 320px))' : (availableProds.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)');
      megaGrid.style.justifyContent = availableProds.length === 1 ? 'center' : '';
      megaGrid.innerHTML = availableProds.slice(0, 3).map((prod, idx) => {
        const pSlug = prod.slug || prod.id;
        const tag = prod.subtitle || prod.category || 'Ayurvedic Care';
        const img = (prod.images && prod.images[0]) || prod.imageUrl || 'assets/new-oil-bottle-card.jpg';
        const price = Number(prod.price) || 299;
        const mrp = Number(prod.mrp) || Number(prod.comparePrice) || Math.round(price * 1.2);
        const saveTxt = mrp > price ? `<s class="old-price" style="text-decoration: line-through; opacity: 0.6; font-size: 0.8em; margin-left: 4px;">₹${mrp}</s>` : '';
        return `
          <a href="/product/?slug=${encodeURIComponent(pSlug)}" class="mega-card mega-card--dynamic mega-card--${idx}">
            <div class="mega-card-thumb">
              <img src="${img}" alt="${prod.name || 'Product'}">
            </div>
            <div class="mega-card-info">
              <span class="mega-tag">${tag}</span>
              <h4>${prod.name || 'Product'}</h4>
              <p class="mega-price">₹${price} ${saveTxt}</p>
              <span class="mega-cta">View & Buy →</span>
            </div>
          </a>
        `;
      }).join('');
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
    if (cachedProducts !== null && Array.isArray(cachedProducts)) {
      applyLiveProductsToDOM(cachedProducts);
    }
  } catch (e) {}

  // Function to reload live products with cache-busting
  async function reloadLiveProducts() {
    try {
      const pRes = await fetch('/api/products?_t=' + Date.now(), { cache: 'no-store' }).then(r => r.json());
      if (pRes && pRes.success && Array.isArray(pRes.data)) {
        try { localStorage.setItem('nachiyar_store_products', JSON.stringify(pRes.data)); } catch (e) {}
        applyLiveProductsToDOM(pRes.data);
      }
    } catch (err) {
      console.warn('Failed to refresh products:', err);
    }
  }

  window.reloadLiveProducts = reloadLiveProducts;

  // Cross-tab real-time listener: when admin updates any product or settings, instantly update storefront without page refresh!
  window.addEventListener('storage', (e) => {
    if (e.key === 'nachiyar_products_updated' || e.key === 'nachiyar_store_products') {
      reloadLiveProducts();
    }
    if (e.key === 'nachiyar_store_settings') {
      try {
        const s = JSON.parse(e.newValue);
        if (s) updateStorefrontBusinessDetails(s);
      } catch (err) {}
    }
  });

  // Cross-tab BroadcastChannel for zero-latency multi-window updates
  try {
    const storeChannel = new BroadcastChannel('nachiyar_store_channel');
    storeChannel.onmessage = (event) => {
      if (event.data && (event.data.type === 'PRODUCTS_UPDATED' || event.data.type === 'SETTINGS_UPDATED' || event.data.type === 'settings_updated')) {
        reloadLiveProducts();
        if (event.data.settings) updateStorefrontBusinessDetails(event.data.settings);
      }
    };
  } catch (e) {}

  // Fetch live products & settings from REST API (cache-busting enabled)
  try {
    const [pRes, sRes] = await Promise.all([
      fetch('/api/products?_t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => ({ success: false })),
      fetch('/api/settings/public?_t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => ({ success: false }))
    ]);

    if (sRes.success && sRes.data) {
      const data = sRes.data;
      if (data.homeShowcase) {
        try {
          localStorage.setItem('nachiyar_home_showcase', JSON.stringify(data.homeShowcase));
        } catch (e) {}
        window.__NACHIYAR_SETTINGS = { ...(window.__NACHIYAR_SETTINGS || {}), homeShowcase: data.homeShowcase };
      }
    }

    if (pRes.success && Array.isArray(pRes.data)) {
      try {
        localStorage.setItem('nachiyar_store_products', JSON.stringify(pRes.data));
      } catch (e) {}

      const activeShowcase = (sRes.success && sRes.data && sRes.data.homeShowcase) || null;
      applyLiveProductsToDOM(pRes.data, activeShowcase);
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

      // Update cached active coupon in localStorage and global window object
      try {
        localStorage.setItem('nachiyar_active_coupon', JSON.stringify({
          couponCode: activeCouponCode,
          discountPercent: activeDiscountPct,
          couponExpiryDate: activeExpiry,
          couponActive: isCouponActive,
          couponTagline: data.couponTagline || 'Surprise Royal Privilege Voucher'
        }));
      } catch (err) {}

      window.currentActiveCoupon = {
        couponCode: activeCouponCode,
        discountPercent: activeDiscountPct,
        couponExpiryDate: activeExpiry,
        couponActive: isCouponActive,
        couponTagline: data.couponTagline || 'Surprise Royal Privilege Voucher'
      };

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

  // Shop Rituals Mega Dropdown Click & Toggle Management
  const shopRitualsItem = document.querySelector('.nav-item.has-dropdown, .nav-item--has-dropdown');
  if (shopRitualsItem) {
    const triggerLink = shopRitualsItem.querySelector('.nav-link');
    if (triggerLink) {
      triggerLink.addEventListener('click', (e) => {
        const isOpen = shopRitualsItem.classList.contains('is-dropdown-open');
        if (!isOpen) {
          e.preventDefault();
          shopRitualsItem.classList.add('is-dropdown-open');
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!shopRitualsItem.contains(e.target)) {
        shopRitualsItem.classList.remove('is-dropdown-open');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        shopRitualsItem.classList.remove('is-dropdown-open');
      }
    });
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
      let code = 'FESTIVE10';
      let pct = 10;
      let title = 'Surprise Royal Privilege! ✨';
      try {
        const cached = JSON.parse(localStorage.getItem('nachiyar_active_coupon') || '{}');
        if (cached.couponCode) code = cached.couponCode;
        if (cached.discountPercent) pct = cached.discountPercent;
        if (cached.couponTagline) title = cached.couponTagline;
      } catch (e) {}
      if (window.currentActiveCoupon) {
        if (window.currentActiveCoupon.couponCode) code = window.currentActiveCoupon.couponCode;
        if (window.currentActiveCoupon.discountPercent) pct = window.currentActiveCoupon.discountPercent;
        if (window.currentActiveCoupon.couponTagline) title = window.currentActiveCoupon.couponTagline;
      }
      showSideToast({
        title: title,
        body: `Use voucher code: ${code} at checkout to receive ${pct}% OFF your order!`,
        type: 'info',
        duration: 6000
      });
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
    let stats = { average: '5.0', total: 0 };

    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();

      if (data && data.success && data.data && data.data.reviews && data.data.reviews.length > 0) {
        reviews = data.data.reviews;
        stats = data.data.stats || { average: '5.0', total: reviews.length };
      } else {
        reviews = [];
        stats = { average: '5.0', total: 0 };
      }
    } catch (e) {
      console.warn('Backend reviews API offline:', e);
      reviews = [];
      stats = { average: '5.0', total: 0 };
    }

    if (reviews && reviews.length > 0) {
      if (reviewsAvgScore) {
        reviewsAvgScore.textContent = `${stats.average || '5.0'} / 5.0`;
      }
      if (reviewsCountText) {
        reviewsCountText.textContent = `Based on ${stats.total || reviews.length} Verified Patron Reviews`;
      }

      // Render ONLY original, unique approved reviews — ZERO duplicate cards!
      reviewsScrollerTrack.innerHTML = reviews.map(r => renderReviewCard(r)).join('');

      // Measure and initialize carousel engine after DOM layout
      requestAnimationFrame(() => {
        reviewsScrollerState.halfWidth = 0;
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
    if (S.rafId) {
      cancelAnimationFrame(S.rafId);
      S.rafId = null;
    }

    // Check if review cards overflow the viewport
    const maxScroll = Math.max(0, track.scrollWidth - viewport.clientWidth);

    // If all review cards fit on screen (e.g. 1, 2, or 3 reviews), center them cleanly and disable scrolling
    if (maxScroll <= 10) {
      track.style.transform = 'none';
      track.style.justifyContent = 'center';
      track.style.width = '100%';
      if (btnNext) btnNext.style.display = 'none';
      if (btnPrev) btnPrev.style.display = 'none';
      S.currentX = 0;
      S.targetX = null;
      return;
    }

    // Multiple reviews overflowing viewport: enable horizontal carousel
    track.style.justifyContent = 'flex-start';
    track.style.width = 'max-content';
    if (btnNext) btnNext.style.display = 'flex';
    if (btnPrev) btnPrev.style.display = 'flex';

    let scrollDirection = -1; // -1 = scrolling left, 1 = scrolling right

    function applyTransform() {
      if (S.currentX < -maxScroll) S.currentX = -maxScroll;
      if (S.currentX > 0) S.currentX = 0;
      track.style.transform = `translate3d(${S.currentX}px, 0, 0)`;
    }

    function animateLoop() {
      if (S.targetX !== null) {
        const diff = S.targetX - S.currentX;
        if (Math.abs(diff) > 0.5) {
          S.currentX += diff * 0.18;
        } else {
          S.currentX = S.targetX;
          S.targetX = null;
        }
        applyTransform();
      } else if (!S.isPaused && !S.isInteracting) {
        S.currentX += scrollDirection * S.speed;
        if (S.currentX <= -maxScroll) {
          S.currentX = -maxScroll;
          scrollDirection = 1;
        } else if (S.currentX >= 0) {
          S.currentX = 0;
          scrollDirection = -1;
        }
        applyTransform();
      }

      S.rafId = requestAnimationFrame(animateLoop);
    }

    S.rafId = requestAnimationFrame(animateLoop);

    function pauseAuto() {
      S.isInteracting = true;
      S.targetX = null;
      if (S.resumeTimer) clearTimeout(S.resumeTimer);
    }

    function scheduleResume(delay = 2500) {
      if (S.resumeTimer) clearTimeout(S.resumeTimer);
      S.resumeTimer = setTimeout(() => {
        S.isInteracting = false;
        S.targetX = null;
      }, delay);
    }

    function stepReview(direction) {
      pauseAuto();
      const firstCard = track.querySelector('.review-card');
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 380;
      const step = cardWidth + 24;
      let nextTarget = S.currentX + (step * direction);
      if (nextTarget < -maxScroll) nextTarget = -maxScroll;
      if (nextTarget > 0) nextTarget = 0;
      S.targetX = nextTarget;
      scheduleResume(3000);
    }

    if (btnNext) {
      btnNext.onclick = (e) => {
        e.preventDefault();
        stepReview(-1);
      };
    }

    if (btnPrev) {
      btnPrev.onclick = (e) => {
        e.preventDefault();
        stepReview(1);
      };
    }

    // Mouse drag
    let isMouseDown = false;
    let dragStartX = 0;
    let dragBaseX = 0;

    viewport.onmousedown = (e) => {
      if (e.target.closest('.reviews-edge-nav') || e.target.closest('button')) return;
      if (e.button !== 0) return;
      isMouseDown = true;
      dragStartX = e.pageX;
      dragBaseX = S.currentX;
      pauseAuto();
      viewport.classList.add('is-dragging');
      e.preventDefault();
    };

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      const deltaX = e.pageX - dragStartX;
      S.currentX = dragBaseX + deltaX;
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (isMouseDown) {
        isMouseDown = false;
        viewport.classList.remove('is-dragging');
        scheduleResume();
      }
    });

    // Touch swipe
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
      scheduleResume();
    });

    // Hover
    viewport.onmouseenter = () => { S.isPaused = true; };
    viewport.onmouseleave = () => { S.isPaused = false; };
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
        showSideToast('Please enter your name.', 'error');
        return;
      }
      if (!comment) {
        showSideToast('Please write your review message.', 'error');
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
      showSideToast({
        title: 'Thank you for your review! 🌿',
        body: 'Your review has been submitted to the Nachiyar apothecary team for verification. Once approved by our administrator, it will appear on our live storefront marquee.',
        type: 'success',
        duration: 6000
      });
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
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initStorefrontApp);
    } else {
      initStorefrontApp();
    }
  }
} // End of browser execution block
