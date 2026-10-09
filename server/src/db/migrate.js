const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function migrate() {
  console.log('🔄 Starting PostgreSQL migration for Nachiyar Herbals...');
  
  const client = await pool.connect();
  try {
    // 1. Run schema DDL
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✅ Schema tables verified/created in PostgreSQL.');

    // 2. Read existing db.json
    const dbJsonPath = path.join(__dirname, '..', '..', '..', 'data', 'db.json');
    if (!fs.existsSync(dbJsonPath)) {
      console.warn('⚠️ db.json not found at:', dbJsonPath);
      return;
    }

    const rawData = fs.readFileSync(dbJsonPath, 'utf8');
    const db = JSON.parse(rawData);

    // 3. Migrate Users
    if (Array.isArray(db.users)) {
      for (const u of db.users) {
        await client.query(`
          INSERT INTO users (id, username, name, role, permissions)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE 
          SET username = EXCLUDED.username, name = EXCLUDED.name, role = EXCLUDED.role, permissions = EXCLUDED.permissions
        `, [u.id, u.username, u.name, u.role, JSON.stringify(u.permissions || [])]);
      }
      console.log(`✅ Migrated ${db.users.length} users.`);
    }

    // 4. Migrate Products
    if (Array.isArray(db.products)) {
      for (const p of db.products) {
        await client.query(`
          INSERT INTO products (
            id, slug, name, subtitle, category, category_id,
            price, mrp, stock, initial_stock, online_sold, offline_sold,
            sku, images, theme_color, tagline, metric_badge, badge,
            short_description, description, benefits, ingredients, how_to_use,
            variants, seo, status
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23,
            $24, $25, $26
          )
          ON CONFLICT (id) DO UPDATE SET
            slug = EXCLUDED.slug,
            name = EXCLUDED.name,
            subtitle = EXCLUDED.subtitle,
            category = EXCLUDED.category,
            category_id = EXCLUDED.category_id,
            price = EXCLUDED.price,
            mrp = EXCLUDED.mrp,
            stock = EXCLUDED.stock,
            initial_stock = EXCLUDED.initial_stock,
            online_sold = EXCLUDED.online_sold,
            offline_sold = EXCLUDED.offline_sold,
            sku = EXCLUDED.sku,
            images = EXCLUDED.images,
            theme_color = EXCLUDED.theme_color,
            tagline = EXCLUDED.tagline,
            metric_badge = EXCLUDED.metric_badge,
            badge = EXCLUDED.badge,
            short_description = EXCLUDED.short_description,
            description = EXCLUDED.description,
            benefits = EXCLUDED.benefits,
            ingredients = EXCLUDED.ingredients,
            how_to_use = EXCLUDED.how_to_use,
            variants = EXCLUDED.variants,
            seo = EXCLUDED.seo,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        `, [
          p.id,
          p.slug,
          p.name,
          p.subtitle || '',
          p.category || 'Hair Care',
          p.categoryId || 'cat_hair_care',
          p.price,
          p.mrp || Math.round(p.price * 1.2),
          p.stock || 0,
          p.initialStock || p.stock || 0,
          p.onlineSold || 0,
          p.offlineSold || 0,
          p.sku || '',
          JSON.stringify(p.images || []),
          p.themeColor || '#6B4E9B',
          p.tagline || '',
          p.metricBadge || '',
          p.badge || '',
          p.shortDescription || '',
          p.description || '',
          JSON.stringify(p.benefits || []),
          p.ingredients || '',
          p.howToUse || '',
          JSON.stringify(p.variants || []),
          JSON.stringify(p.seo || {}),
          p.status || 'active'
        ]);
      }
      console.log(`✅ Migrated ${db.products.length} products.`);
    }

    // 5. Migrate Orders
    if (Array.isArray(db.orders)) {
      for (const o of db.orders) {
        await client.query(`
          INSERT INTO orders (
            id, order_number, channel, customer, items,
            subtotal, discount, shipping, total, payment_method,
            payment_status, status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [
          o.id,
          o.orderNumber,
          o.channel || 'online',
          JSON.stringify(o.customer || {}),
          JSON.stringify(o.items || []),
          o.subtotal || 0,
          o.discount || 0,
          o.shipping || 0,
          o.total || 0,
          o.paymentMethod || 'UPI / Online Payment',
          o.paymentStatus || 'paid',
          o.status || 'placed',
          o.createdAt ? new Date(o.createdAt) : new Date()
        ]);
      }
      console.log(`✅ Migrated ${db.orders.length} orders.`);
    }

    // 6. Migrate Invoices
    if (Array.isArray(db.invoices)) {
      for (const inv of db.invoices) {
        await client.query(`
          INSERT INTO invoices (
            id, invoice_number, channel, customer, items,
            subtotal, discount, tax, total, payment_status,
            payment_mode, notes, created_by, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO NOTHING
        `, [
          inv.id,
          inv.invoiceNumber,
          inv.channel || 'offline',
          JSON.stringify(inv.customer || {}),
          JSON.stringify(inv.items || []),
          inv.subtotal || 0,
          inv.discount || 0,
          inv.tax || 0,
          inv.total || 0,
          inv.paymentStatus || 'paid',
          inv.paymentMode || 'Cash',
          inv.notes || 'In-store retail billing',
          inv.createdBy || 'Sales Staff',
          inv.createdAt ? new Date(inv.createdAt) : new Date()
        ]);
      }
      console.log(`✅ Migrated ${db.invoices.length} invoices.`);
    }

    // 7. Migrate Inventory Logs
    if (Array.isArray(db.inventory_logs)) {
      for (const log of db.inventory_logs) {
        await client.query(`
          INSERT INTO inventory_logs (
            id, product_id, product_name, channel, reference,
            change, prev_stock, new_stock, timestamp, reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [
          log.id,
          log.productId,
          log.productName,
          log.channel || 'manual',
          log.reference || '',
          log.change || 0,
          log.prevStock || 0,
          log.newStock || 0,
          log.timestamp ? new Date(log.timestamp) : new Date(),
          log.reason || ''
        ]);
      }
      console.log(`✅ Migrated ${db.inventory_logs.length} inventory logs.`);
    }

    // 8. Migrate Site Settings
    if (db.site_settings) {
      await client.query(`
        INSERT INTO site_settings (id, data)
        VALUES (1, $1)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
      `, [JSON.stringify(db.site_settings)]);
      console.log('✅ Migrated site settings.');
    }

    console.log('🎉 PostgreSQL Migration successfully completed!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(() => process.exit(1));
}

module.exports = migrate;
