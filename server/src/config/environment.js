/**
 * Nachiyar Herbals & Cosmetics
 * Environment Configuration & Auto-Detection Module
 *
 * Automatically detects the runtime environment (Local Development vs. Production)
 * and loads the appropriate configuration (.env.development or .env.production).
 *
 * Rules:
 * - Local Development: uses local PostgreSQL and local file storage.
 * - Production: uses production PostgreSQL and cPanel file storage.
 * - Local resources are never used in production.
 * - Production resources are never used in local development.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Project root directory (g:\nachiyar-herbal-cosmetics)
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const serverRoot = path.resolve(__dirname, '..', '..');

/**
 * Automatically detect current execution environment.
 * Order of evaluation:
 * 1. process.env.NODE_ENV if explicitly set
 * 2. cPanel / Production indicators (CPANEL_USER, PASSENGER_APP_ENV, etc.)
 * 3. Default to 'development' for local workstation
 */
function detectEnvironment() {
  if (process.env.NODE_ENV) {
    const env = process.env.NODE_ENV.toLowerCase().trim();
    if (env === 'production' || env === 'prod') return 'production';
    if (env === 'development' || env === 'dev') return 'development';
    if (env === 'test') return 'test';
    return env;
  }

  // Detect cPanel hosting / CloudLinux / Phusion Passenger environment indicators
  const isCpanel = Boolean(
    process.env.CPANEL_USER ||
    process.env.CPANEL_ENV ||
    process.env.CPANEL_HOST ||
    (process.env.PASSENGER_APP_ENV && process.env.PASSENGER_APP_ENV.toLowerCase() === 'production') ||
    (process.env.SERVER_SOFTWARE && process.env.SERVER_SOFTWARE.toLowerCase().includes('cpanel')) ||
    (process.env.HOME && process.env.HOME.includes('/home/') && !process.env.HOME.includes('\\Users\\'))
  );

  if (isCpanel) {
    return 'production';
  }

  // Default to local development
  return 'development';
}

const currentEnv = detectEnvironment();
process.env.NODE_ENV = currentEnv;

/**
 * Load environment variables in deterministic priority order:
 * 1. .env.{environment} (e.g. .env.development or .env.production)
 * 2. .env.local (optional developer overrides)
 * 3. .env (general fallback)
 *
 * Note: Existing system environment variables (e.g. set in cPanel UI or host OS)
 * are NEVER overwritten by dotenv.
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

// Port configuration
const port = parseInt(process.env.PORT, 10) || (isProduction ? 5000 : 5000);

// Database configuration
function getDatabaseConfig() {
  const connectionString = process.env.DATABASE_URL || '';
  const host = process.env.DB_HOST || '';
  const dbPort = parseInt(process.env.DB_PORT, 10) || 5432;
  const user = process.env.DB_USER || '';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || '';

  // Determine SSL requirement
  let ssl = false;
  if (process.env.DB_SSL === 'true') {
    ssl = { rejectUnauthorized: false };
  } else if (process.env.DB_SSL === 'false') {
    ssl = false;
  } else if (isProduction) {
    ssl = { rejectUnauthorized: false };
  }

  return {
    connectionString,
    host,
    port: dbPort,
    user,
    password,
    database,
    ssl
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
  // In cPanel, public files typically live in ~/public_html/uploads
  const defaultCpanelPath = process.env.HOME
    ? path.join(process.env.HOME, 'public_html', 'uploads')
    : path.join(projectRoot, 'uploads');
  const cpanelDirPath = process.env.CPANEL_STORAGE_PATH || defaultCpanelPath;

  // Active storage directory based on current driver
  const resolvedUploadDir = storageType === 'cpanel' ? cpanelDirPath : localDirPath;

  // Public URL base for serving images
  const baseUrl = process.env.STORAGE_BASE_URL || '/uploads';

  return {
    type: storageType, // 'local' | 'cpanel'
    localDir: localDirPath,
    cpanelPath: cpanelDirPath,
    resolvedUploadDir,
    baseUrl: baseUrl.replace(/\/+$/, '') // strip trailing slash
  };
}

const databaseConfig = getDatabaseConfig();
const storageConfig = getStorageConfig();

/**
 * Strict Environment Isolation Guards:
 * - Local Development must not use production storage or remote production DB
 * - Production must not connect to localhost DB or use local storage
 */
function validateEnvironmentGuards() {
  if (isProduction) {
    // Check if database URL or host incorrectly points to localhost
    const isLocalDb = (
      (databaseConfig.connectionString && (
        databaseConfig.connectionString.includes('localhost') ||
        databaseConfig.connectionString.includes('127.0.0.1')
      )) ||
      (databaseConfig.host && (
        databaseConfig.host === 'localhost' ||
        databaseConfig.host === '127.0.0.1'
      ))
    );

    if (isLocalDb) {
      console.warn('⚠️ [ENVIRONMENT WARNING] Running in PRODUCTION mode, but database points to localhost.');
      console.warn('   Ensure DATABASE_URL or DB_HOST points to your production PostgreSQL database.');
    }

    if (storageConfig.type === 'local') {
      console.warn('⚠️ [ENVIRONMENT WARNING] Running in PRODUCTION mode, but storage is set to "local".');
      console.warn('   Production should use "cpanel" storage (STORAGE_TYPE=cpanel).');
    }
  }

  if (isDevelopment) {
    if (storageConfig.type === 'cpanel' && !process.env.ALLOW_CPANEL_IN_DEV) {
      console.warn('ℹ️ [ENVIRONMENT NOTICE] Local development detected. Defaulting storage to local.');
    }
  }
}

validateEnvironmentGuards();

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
  }
};

module.exports = config;
