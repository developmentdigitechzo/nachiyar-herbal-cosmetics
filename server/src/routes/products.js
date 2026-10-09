const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Map DB row to camelCase format expected by frontends
function mapProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    category: row.category,
    categoryId: row.category_id,
    price: Number(row.price),
    mrp: Number(row.mrp),
    stock: Number(row.stock),
    initialStock: Number(row.initial_stock),
    onlineSold: Number(row.online_sold),
    offlineSold: Number(row.offline_sold),
    sku: row.sku,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []),
    themeColor: row.theme_color,
    tagline: row.tagline,
    metricBadge: row.metric_badge,
    badge: row.badge,
    shortDescription: row.short_description,
    description: row.description,
    benefits: typeof row.benefits === 'string' ? JSON.parse(row.benefits) : (row.benefits || []),
    ingredients: row.ingredients,
    howToUse: row.how_to_use,
    variants: typeof row.variants === 'string' ? JSON.parse(row.variants) : (row.variants || []),
    seo: typeof row.seo === 'string' ? JSON.parse(row.seo) : (row.seo || {}),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// 1. GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, q } = req.query;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      params.push(category.toLowerCase());
      sql += ` AND (LOWER(category) = $${params.length} OR category_id = $${params.length})`;
    }

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(short_description) LIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at ASC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows.map(mapProduct) });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GET /api/products/:idOrSlug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const result = await query(
      'SELECT * FROM products WHERE id = $1 OR slug = $1 LIMIT 1',
      [idOrSlug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: mapProduct(result.rows[0]) });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST /api/products
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !body.price) {
      return res.status(400).json({ success: false, message: 'Product name and price are required' });
    }

    const id = body.id || `prod_${Date.now()}`;
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const price = Number(body.price);
    const mrp = Number(body.mrp) || Math.round(price * 1.2);
    const stock = Number(body.stock) || 0;
    const initialStock = stock;
    const sku = body.sku || `NH-${Date.now().toString().slice(-6)}`;
    const images = body.images && body.images.length ? body.images : ['assets/herbal-hair-oil.jpg'];
    const themeColor = body.themeColor || '#6B4E9B';
    const tagline = body.tagline || '100% Pure Botanical Infusion';
    const metricBadge = body.metricBadge || '100% PURE';
    const badge = body.badge || 'New';
    const category = body.category || 'Hair Care';
    const categoryId = body.categoryId || 'cat_hair_care';

    const insertSql = `
      INSERT INTO products (
        id, slug, name, subtitle, category, category_id,
        price, mrp, stock, initial_stock, online_sold, offline_sold,
        sku, images, theme_color, tagline, metric_badge, badge,
        short_description, description, benefits, ingredients, how_to_use,
        variants, seo, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, 0, 0,
        $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21,
        $22, $23, $24
      ) RETURNING *;
    `;

    const values = [
      id,
      slug,
      body.name,
      body.subtitle || '',
      category,
      categoryId,
      price,
      mrp,
      stock,
      initialStock,
      sku,
      JSON.stringify(images),
      themeColor,
      tagline,
      metricBadge,
      badge,
      body.shortDescription || '',
      body.description || '',
      JSON.stringify(body.benefits || []),
      body.ingredients || '',
      body.howToUse || '',
      JSON.stringify(body.variants || []),
      JSON.stringify(body.seo || { metaTitle: `${body.name} | Nachiyar Herbals`, metaDescription: body.shortDescription || '', keywords: 'herbal', slug }),
      body.status || 'active'
    ];

    const result = await query(insertSql, values);
    res.status(201).json({ success: true, data: mapProduct(result.rows[0]) });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existingResult = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const current = existingResult.rows[0];

    const prevStock = Number(current.stock);
    const newStock = body.stock !== undefined ? Number(body.stock) : prevStock;

    // Track inventory log if stock changed manually
    if (newStock !== prevStock) {
      const logSql = `
        INSERT INTO inventory_logs (
          id, product_id, product_name, channel, reference,
          change, prev_stock, new_stock, timestamp, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      `;
      await query(logSql, [
        `log_${Date.now()}`,
        id,
        current.name,
        'admin_adjustment',
        'Manual Edit',
        newStock - prevStock,
        prevStock,
        newStock,
        'Manual stock adjustment in Product Manager'
      ]);
    }

    const updateSql = `
      UPDATE products SET
        name = COALESCE($1, name),
        subtitle = COALESCE($2, subtitle),
        category = COALESCE($3, category),
        category_id = COALESCE($4, category_id),
        price = COALESCE($5, price),
        mrp = COALESCE($6, mrp),
        stock = $7,
        sku = COALESCE($8, sku),
        images = COALESCE($9, images),
        theme_color = COALESCE($10, theme_color),
        tagline = COALESCE($11, tagline),
        badge = COALESCE($12, badge),
        short_description = COALESCE($13, short_description),
        description = COALESCE($14, description),
        benefits = COALESCE($15, benefits),
        ingredients = COALESCE($16, ingredients),
        how_to_use = COALESCE($17, how_to_use),
        variants = COALESCE($18, variants),
        status = COALESCE($19, status),
        updated_at = NOW()
      WHERE id = $20
      RETURNING *;
    `;

    const values = [
      body.name || null,
      body.subtitle || null,
      body.category || null,
      body.categoryId || null,
      body.price !== undefined ? Number(body.price) : null,
      body.mrp !== undefined ? Number(body.mrp) : null,
      newStock,
      body.sku || null,
      body.images ? JSON.stringify(body.images) : null,
      body.themeColor || null,
      body.tagline || null,
      body.badge || null,
      body.shortDescription || null,
      body.description || null,
      body.benefits ? JSON.stringify(body.benefits) : null,
      body.ingredients || null,
      body.howToUse || null,
      body.variants ? JSON.stringify(body.variants) : null,
      body.status || null,
      id
    ];

    const result = await query(updateSql, values);
    res.json({ success: true, data: mapProduct(result.rows[0]) });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product removed', data: mapProduct(result.rows[0]) });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
