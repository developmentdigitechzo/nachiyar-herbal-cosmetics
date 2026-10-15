const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'shop.html',
  'product.html',
  'about.html',
  'contact.html',
  'checkout.html',
  'order-status.html',
  'account.html',
  'admin.html',
  'admin-login.html',
  'client/public/index.html',
  'client/public/shop.html',
  'client/public/product.html',
  'client/public/about.html',
  'client/public/contact.html',
  'client/public/checkout.html',
  'client/public/order-status.html',
  'client/public/account.html',
  'client/public/admin.html',
  'client/public/admin-login.html'
];

const faviconSnippet = `
  <!-- Nachiyar Royal Brand Favicon -->
  <link rel="icon" type="image/png" href="assets/nachiyar-logo.png">
  <link rel="shortcut icon" type="image/png" href="assets/nachiyar-logo.png">
  <link rel="apple-touch-icon" href="assets/nachiyar-logo.png">`;

let updatedCount = 0;

files.forEach(fileRel => {
  const fullPath = path.resolve(__dirname, fileRel);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if favicon already present
  if (content.includes('rel="icon"') || content.includes("rel='icon'")) {
    console.log(`Skipped (already has icon): ${fileRel}`);
    return;
  }

  // Insert right after </title>
  if (content.includes('</title>')) {
    content = content.replace('</title>', '</title>' + faviconSnippet);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Added favicon to: ${fileRel}`);
    updatedCount++;
  } else if (content.includes('<head>')) {
    content = content.replace('<head>', '<head>' + faviconSnippet);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Added favicon to: ${fileRel}`);
    updatedCount++;
  }
});

console.log(`\n🎉 Total files updated with favicon: ${updatedCount}`);
