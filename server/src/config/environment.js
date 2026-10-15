/**
 * Nachiyar Herbals & Cosmetics
 * Environment Configuration & Auto-Detection Module
 *
 * Automatically detects the runtime environment (Local Development vs. Production)
 * and loads the appropriate configuration (.env.development or .env.production).
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Project root directory
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const serverRoot = path.resolve(__dirname, '..', '..');

/**
 * Automatically detect current execution environment.
 * Order of evaluation:
 * 1. process.env.NODE_ENV if explicitly set
 * 2. cPanel / Production indicators (CPANEL_USER, PASSENGER_APP_ENV, Linux /home/ path, etc.)
 * 3. Default to 'development' for local workstation
 */
function detectEnvironment() {
  // Detect cPanel hosting / CloudLinux / Phusion Passenger / Linux hosting
  const isCpanel = Boolean(
    process.env.CPANEL_USER ||
    process.env.CPANEL_ENV ||
    process.env.CPANEL_HOST ||
    (process.env.PASSENGER_APP_ENV && process.env.PASSENGER_APP_ENV.toLowerCase() === 'production') ||
    (process.env.SERVER_SOFTWARE && process.env.SERVER_SOFTWARE.toLowerCase().includes('cpanel')) ||
    (process.env.HOME && process.env.HOME.includes('/home/')) ||
    (process.env.PWD && process.env.PWD.includes('/home/')) ||
    (process.platform === 'linux' && process.env.USER && process.env.USER.includes('nachiyar')) ||
    __dirname.includes('/home/')
  );

  if (isCpanel) {
    return 'production';
  }

  if (process.env.NODE_ENV) {
    const env = process.env.NODE_ENV.toLowerCase().trim();
    if (env === 'production' || env === 'prod') return 'production';
    if (env === 'development' || env === 'dev') return 'development';
    if (env === 'test') return 'test';
    return env;
  }

  return 'development';
}

const currentEnv = detectEnvironment();
process.env.NODE_ENV = currentEnv;

/**
 * Load environment variables in deterministic priority order:
 * 1. .env.{environment} (e.g. .env.development or .env.production)
 * 2. .env.local (optional developer overrides)
 * 3. .env (general fallback)
 */
function loadEnvFiles(env) {
  const candidatePaths = [
    // Project root paths
    path.join(projectRoot, `.env.${env}`),
    path.join(projectRoot, '.env.local'),
    path.join(projectRoot, '.env'),
    // Server directory paths
    path.join(serverRoot, `.env.${env}`),
    path.join(serverRoot, '.env.local'),
    path.join(serverRoot, '.env')
  ];

  const loadedFiles = [];
  candidatePaths.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false });
      if (!loadedFiles.includes(filePath)) {
        loadedFiles.push(filePath);
      }
    }
  });

  return loadedFiles;
}

const loadedEnvFiles = loadEnvFiles(currentEnv);

// Environment checks
const isProduction = currentEnv === 'production';
const isDevelopment = currentEnv === 'development';
const isTest = currentEnv === 'test';

// Port configuration (supports numeric port or Passenger UNIX domain socket path)
const port = process.env.PORT || 5000;

// Database configuration
function getDatabaseConfig() {
  let connectionString = process.env.DATABASE_URL || '';
  const host = process.env.DB_HOST || '127.0.0.1';
  const dbPort = parseInt(process.env.DB_PORT, 10) || 5432;
  const user = process.env.DB_USER || (isProduction ? 'nachiyarherbals_client_db' : '');
  const password = process.env.DB_PASSWORD || (isProduction ? 'nachiyarherbals_db' : '');
  const database = process.env.DB_NAME || (isProduction ? 'nachiyarherbals_db' : '');

  // Auto-compose connection string if individual credentials are provided
  if (!connectionString && user && password && database) {
    const encUser = encodeURIComponent(user);
    const encPass = encodeURIComponent(password);
    connectionString = `postgresql://${encUser}:${encPass}@${host}:${dbPort}/${database}`;
  }

  // On cPanel or local servers, if database host is localhost / 127.0.0.1, default SSL to false
  const isLocalHost = (connectionString && (connectionString.includes('localhost') || connectionString.includes('127.0.0.1'))) ||
                      host === 'localhost' || host === '127.0.0.1';

  let ssl = false;
  if (process.env.DB_SSL === 'true') {
    ssl = { rejectUnauthorized: false };
  } else if (process.env.DB_SSL === 'false') {
    ssl = false;
  } else if (isProduction && !isLocalHost) {
    ssl = { rejectUnauthorized: false };
  } else {
    ssl = false;
  }

  return {
    connectionString,
    host,
    port: dbPort,
    user,
    password,
    database,
    ssl,
    isConfigured: Boolean(connectionString || (host && database && user))
  };
}

// Storage configuration
function getStorageConfig() {
  const defaultStorageType = isProduction ? 'cpanel' : 'local';
  const storageType = (process.env.STORAGE_TYPE || defaultStorageType).toLowerCase().trim();

  // Local storage directory
  const localDirName = process.env.UPLOAD_DIR || 'uploads';
  const localDirPath = path.isAbsolute(localDirName)
    ? localDirName
    : path.join(projectRoot, localDirName);

  // cPanel storage directory
  const defaultCpanelPath = process.env.HOME
    ? path.join(process.env.HOME, 'public_html', 'uploads')
    : path.join(projectRoot, 'uploads');
  const cpanelDirPath = process.env.CPANEL_STORAGE_PATH || defaultCpanelPath;

  const resolvedUploadDir = storageType === 'cpanel' ? cpanelDirPath : localDirPath;
  const baseUrl = process.env.STORAGE_BASE_URL || '/uploads';

  return {
    type: storageType,
    localDir: localDirPath,
    cpanelPath: cpanelDirPath,
    resolvedUploadDir,
    baseUrl: baseUrl.replace(/\/+$/, '')
  };
}

const databaseConfig = getDatabaseConfig();
const storageConfig = getStorageConfig();

const config = {
  env: currentEnv,
  isProduction,
  isDevelopment,
  isTest,
  port,
  projectRoot,
  serverRoot,
  loadedEnvFiles,
  database: databaseConfig,
  storage: storageConfig,
  auth: {
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    inventoryPassword: process.env.INVENTORY_PASSWORD || 'inventory123',
    billingPassword: process.env.BILLING_PASSWORD || 'billing123',
    jwtSecret: process.env.JWT_SECRET || 'nachiyar_secret_key_2026'
  },
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
    isConfigured: Boolean(process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID && !process.env.FIREBASE_API_KEY.includes('YOUR_FIREBASE_API_KEY'))
  }
};

module.exports = config;
