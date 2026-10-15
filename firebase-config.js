/**
 * NACHIYAR HERBALS & COSMETICS
 * Firebase Client Configuration for Customer Authentication
 * 
 * ==============================================================================
 * SETUP INSTRUCTIONS (Firebase Console):
 * 1. Open Firebase Console: https://console.firebase.google.com/
 * 2. Select or create your project: "nachiyar-herbals"
 * 3. Go to Project Settings -> General -> "Your apps" -> Add Web app (</>)
 * 4. Configure credentials in your environment file (.env.development / .env.production):
 *      FIREBASE_API_KEY="AIzaSy..."
 *      FIREBASE_AUTH_DOMAIN="nachiyar-herbals.firebaseapp.com"
 *      FIREBASE_PROJECT_ID="nachiyar-herbals"
 *      FIREBASE_STORAGE_BUCKET="nachiyar-herbals.appspot.com"
 *      FIREBASE_MESSAGING_SENDER_ID="1234567890"
 *      FIREBASE_APP_ID="1:1234567890:web:abcdef123456"
 *    OR directly populate the staticConfig object below.
 * 5. In Firebase Console -> Authentication -> Sign-in method:
 *      - Enable "Google" provider
 *      - Under Settings -> Authorized domains, ensure "localhost" and your production domain are listed
 * ==============================================================================
 */

(function() {
  // Developer direct static configuration (optional override)
  const staticConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  };

  function isValidConfig(cfg) {
    return Boolean(
      cfg &&
      typeof cfg.apiKey === 'string' &&
      cfg.apiKey.trim().length > 10 &&
      !cfg.apiKey.includes('YOUR_FIREBASE_API_KEY') &&
      cfg.projectId &&
      cfg.projectId.trim().length > 0
    );
  }

  // Priority 1: Window pre-defined config
  if (isValidConfig(window.FIREBASE_CONFIG)) {
    return;
  }

  // Priority 2: Static configuration if populated by developer
  if (isValidConfig(staticConfig)) {
    window.FIREBASE_CONFIG = staticConfig;
    return;
  }

  // Priority 3: Local storage (if previously configured in dev)
  try {
    const saved = JSON.parse(localStorage.getItem('nachiyar_firebase_config') || 'null');
    if (isValidConfig(saved)) {
      window.FIREBASE_CONFIG = saved;
      return;
    }
  } catch (e) {}

  // Priority 4: Fetch configuration dynamically from backend environment variables
  window.__loadFirebaseConfigFromBackend = async function() {
    if (isValidConfig(window.FIREBASE_CONFIG)) {
      return window.FIREBASE_CONFIG;
    }
    try {
      const res = await fetch('/api/customer/firebase-config?_t=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      if (data && data.success && data.configured && isValidConfig(data.config)) {
        window.FIREBASE_CONFIG = data.config;
        return data.config;
      }
    } catch (err) {
      console.warn('[Firebase] Could not fetch config from server endpoint:', err.message);
    }
    return null;
  };
})();
