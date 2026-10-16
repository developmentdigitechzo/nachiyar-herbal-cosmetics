/**
 * Helper to restore default 3 flagship formulations if needed
 */
const { query } = require('./server/src/config/db');
const fs = require('fs');
const path = require('path');

async function restoreDefaultProducts() {
  const backupPath = path.join(__dirname, 'data', 'backup_full_pre_clean.json');
  if (!fs.existsSync(backupPath)) {
    console.error('Backup file not found at:', backupPath);
    process.exit(1);
  }
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const products = backup.products || [];

  for (const p of products) {
    await query(`
      INSERT INTO products (
        id, slug, name, subtitle, category, category_id,
        price, mrp, stock, initial_stock, online_sold, offline_sold,
        sku, images, theme_color, tagline, metric_badge, badge,
        short_description, description, benefits, ingredients, how_to_use,
        variants, seo, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, 0, 0,
        $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22,
        $23, $24, $25
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        stock = EXCLUDED.stock,
        online_sold = 0,
        offline_sold = 0
    `, [
      p.id, p.slug, p.name, p.subtitle, p.category, p.category_id,
      p.price, p.mrp, p.stock || 50, p.initial_stock || 50,
      p.sku, JSON.stringify(p.images || []), p.theme_color, p.tagline,
      p.metric_badge, p.badge, p.short_description, p.description,
      JSON.stringify(p.benefits || []), p.ingredients, p.how_to_use,
      JSON.stringify(p.variants || []), JSON.stringify(p.seo || {}), p.status || 'active'
    ]);
  }
  console.log(`✅ Successfully restored ${products.length} default flagship products (with 0 sold count).`);
  process.exit(0);
}

restoreDefaultProducts().catch(err => {
  console.error(err);
  process.exit(1);
});
