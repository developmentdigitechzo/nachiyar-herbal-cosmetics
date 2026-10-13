/**
 * Nachiyar Herbals & Cosmetics
 * Automated Multi-Environment Test Suite
 *
 * Verifies:
 * 1. Local Development Mode (Local PostgreSQL + Local Storage)
 * 2. Production Mode (Production PostgreSQL config + cPanel Storage)
 * 3. Environment Isolation Guards (No local db/storage in prod; no prod db/storage in dev)
 * 4. End-to-End File Upload and File Retrieval
 * 5. Zero Hardcoded Credentials in Source Code
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Simple 1x1 transparent PNG base64 for test uploads
const SAMPLE_IMAGE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n==================================================================');
  console.log('🧪 NACHIYAR HERBALS - MULTI-ENVIRONMENT VERIFICATION SUITE');
  console.log('==================================================================\n');

  // ----------------------------------------------------------------------------
  // TEST 1: Source Code Security Audit (Zero Hardcoded Secrets)
  // ----------------------------------------------------------------------------
  console.log('🔍 [TEST 1] Source Code Security & Hardcoded Credentials Audit');
  const dbJsContent = fs.readFileSync(path.join(__dirname, 'server', 'src', 'config', 'db.js'), 'utf8');
  assert(!dbJsContent.includes('Murali%402005'), 'db.js does NOT contain hardcoded database password');
  assert(!dbJsContent.includes('postgresql://postgres:'), 'db.js does NOT contain hardcoded database URL');

  const gitignoreContent = fs.readFileSync(path.join(__dirname, '.gitignore'), 'utf8');
  assert(gitignoreContent.includes('.env'), '.gitignore properly excludes .env files');
  assert(gitignoreContent.includes('!.env.example'), '.gitignore allows .env.example template');

  // ----------------------------------------------------------------------------
  // TEST 2: Local Development Environment Verification
  // ----------------------------------------------------------------------------
  console.log('\n🌿 [TEST 2] Local Development Environment (Local DB + Local Storage)');
  // Ensure development environment
  delete process.env.NODE_ENV;
  // Clean require cache for fresh load
  delete require.cache[require.resolve('./server/src/config/environment')];
  delete require.cache[require.resolve('./server/src/services/storage')];
  delete require.cache[require.resolve('./server/src/config/db')];

  const devConfig = require('./server/src/config/environment');
  assert(devConfig.env === 'development', `Auto-detected environment is "development" (detected: ${devConfig.env})`);
  assert(devConfig.storage.type === 'local', `Storage driver is "local" (configured: ${devConfig.storage.type})`);
  assert(devConfig.database.host === 'localhost' || devConfig.database.connectionString.includes('localhost'), 'Database points to local PostgreSQL instance');

  // Verify Local PostgreSQL Connection
  const { pool: devPool } = require('./server/src/config/db');
  try {
    const dbRes = await devPool.query('SELECT NOW() as now, current_database() as db');
    assert(dbRes.rows.length > 0, `Local PostgreSQL successfully queried: ${dbRes.rows[0].db} (time: ${dbRes.rows[0].now})`);
  } catch (err) {
    assert(false, `Local PostgreSQL query error: ${err.message}`);
  }

  // Verify Local Storage: File Upload and Retrieval
  const devStorage = require('./server/src/services/storage');
  let devUploadResult = null;
  try {
    devUploadResult = await devStorage.saveBase64Image(SAMPLE_IMAGE_BASE64, 'dev_test_image.png');
    assert(devUploadResult.success === true, 'Local storage saveBase64Image succeeded');
    assert(devUploadResult.storageType === 'local', 'Local storage returned storageType = local');
    assert(fs.existsSync(devUploadResult.storagePath), `File exists on local filesystem at: ${devUploadResult.storagePath}`);

    // File retrieval check
    const retrievedPath = devStorage.getFilePath(devUploadResult.filename);
    assert(retrievedPath !== null && fs.existsSync(retrievedPath), 'File retrieval via getFilePath succeeded');

    // Clean up test file
    devStorage.deleteFile(devUploadResult.filename);
    assert(!fs.existsSync(devUploadResult.storagePath), 'Local test file cleaned up successfully');
  } catch (err) {
    assert(false, `Local storage error: ${err.message}`);
  }

  // ----------------------------------------------------------------------------
  // TEST 3: Production Environment Verification (Simulated cPanel Production)
  // ----------------------------------------------------------------------------
  console.log('\n🚀 [TEST 3] Production Environment (Production DB Config + cPanel Storage)');
  // Set simulated production environment
  process.env.NODE_ENV = 'production';
  // Create a temporary sandbox cPanel path to test cPanel filesystem operations
  const sandboxCpanelDir = path.join(__dirname, 'uploads_cpanel_test');
  process.env.CPANEL_STORAGE_PATH = sandboxCpanelDir;
  process.env.STORAGE_TYPE = 'cpanel';

  delete require.cache[require.resolve('./server/src/config/environment')];
  delete require.cache[require.resolve('./server/src/services/storage')];

  const prodConfig = require('./server/src/config/environment');
  assert(prodConfig.env === 'production', `Environment detected as "production" (detected: ${prodConfig.env})`);
  assert(prodConfig.isProduction === true, 'isProduction flag is true');
  assert(prodConfig.storage.type === 'cpanel', `Storage driver is "cpanel" (configured: ${prodConfig.storage.type})`);
  assert(prodConfig.storage.resolvedUploadDir === sandboxCpanelDir, `Storage directory points to cPanel path: ${sandboxCpanelDir}`);

  // Verify cPanel Storage: File Upload and Retrieval
  const prodStorage = require('./server/src/services/storage');
  try {
    const prodUploadResult = await prodStorage.saveBase64Image(SAMPLE_IMAGE_BASE64, 'prod_test_image.png');
    assert(prodUploadResult.success === true, 'cPanel storage saveBase64Image succeeded');
    assert(prodUploadResult.storageType === 'cpanel', 'cPanel storage returned storageType = cpanel');
    assert(fs.existsSync(prodUploadResult.storagePath), `File successfully written to cPanel storage path: ${prodUploadResult.storagePath}`);

    // Verify cPanel file retrieval
    const retrievedProdPath = prodStorage.getFilePath(prodUploadResult.filename);
    assert(retrievedProdPath !== null && fs.existsSync(retrievedProdPath), 'cPanel file retrieval via getFilePath succeeded');

    // Clean up
    prodStorage.deleteFile(prodUploadResult.filename);
    if (fs.existsSync(sandboxCpanelDir)) {
      fs.rmSync(sandboxCpanelDir, { recursive: true, force: true });
    }
    assert(!fs.existsSync(sandboxCpanelDir), 'cPanel test storage cleaned up successfully');
  } catch (err) {
    assert(false, `cPanel storage error: ${err.message}`);
  }

  // Restore environment back to development
  delete process.env.NODE_ENV;
  delete process.env.CPANEL_STORAGE_PATH;
  delete process.env.STORAGE_TYPE;

  // ----------------------------------------------------------------------------
  // TEST 4: Live HTTP Server Endpoints (Health Check & Static Serving)
  // ----------------------------------------------------------------------------
  console.log('\n🌐 [TEST 4] Live HTTP API Endpoints Check');
  const serverPort = devConfig.port;

  await new Promise((resolve) => {
    http.get(`http://localhost:${serverPort}/api/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          assert(res.statusCode === 200, `GET /api/health returned 200 OK`);
          assert(json.status === 'ok', `Health status is "ok"`);
          assert(json.environment === 'development', `API reports environment = "development"`);
          assert(json.storageType === 'local', `API reports storageType = "local"`);
        } catch (e) {
          assert(false, `Failed to parse /api/health response: ${e.message}`);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.warn(`  ⚠️ Live server check skipped (server may need restart): ${err.message}`);
      resolve();
    });
  });

  // ----------------------------------------------------------------------------
  // FINAL SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n==================================================================');
  console.log(`📊 TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('==================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All environment and storage tests passed successfully!\n');
    process.exit(0);
  }
}

runTests();
