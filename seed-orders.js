const { pool } = require('./server/src/config/db');

async function seedMoreOrders() {
  const sampleOrders = [
    {
      id: 'ord_sample_02',
      order_number: 'NH-ON-0984',
      channel: 'online',
      customer: {
        name: 'Pooja Madhavan',
        email: 'pooja.m@example.com',
        phone: '+91 98401 23456',
        address: '42, Besant Avenue, Adyar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600020'
      },
      items: [
        {
          productId: 'prod_oil_01',
          name: 'Herbal Hair Oil',
          size: '200ml Glass Dropper Bottle',
          qty: 2,
          price: 599,
          img: 'assets/hero-bottle-oil-transparent.png'
        }
      ],
      subtotal: 1198,
      discount: 199,
      shipping: 0,
      total: 999,
      payment_method: 'UPI / Google Pay',
      payment_status: 'paid',
      status: 'delivered',
      created_at: '2026-09-18T10:14:00.000Z'
    },
    {
      id: 'ord_sample_03',
      order_number: 'NH-ON-0952',
      channel: 'online',
      customer: {
        name: 'Pooja Madhavan',
        email: 'pooja.m@example.com',
        phone: '+91 98401 23456',
        address: '42, Besant Avenue, Adyar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600020'
      },
      items: [
        {
          productId: 'prod_shampoo_02',
          name: 'Hibiscus Flower Shampoo',
          size: '250ml Botanical Pump Bottle',
          qty: 1,
          price: 549,
          img: 'assets/hero-bottle-shampoo-transparent.png'
        },
        {
          productId: 'prod_duo_03',
          name: 'The Royal Hair Ritual (Duo Set)',
          size: 'Full Ritual Duo',
          qty: 1,
          price: 999,
          img: 'assets/duo-ritual-new.jpg'
        }
      ],
      subtotal: 1548,
      discount: 200,
      shipping: 0,
      total: 1348,
      payment_method: 'Credit Card / Visa',
      payment_status: 'paid',
      status: 'delivered',
      created_at: '2026-08-04T16:20:00.000Z'
    },
    {
      id: 'ord_sample_04',
      order_number: 'NH-ON-1005',
      channel: 'online',
      customer: {
        name: 'Pooja Madhavan',
        email: 'pooja.m@example.com',
        phone: '+91 98401 23456',
        address: '42, Besant Avenue, Adyar',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600020'
      },
      items: [
        {
          productId: 'prod_duo_03',
          name: 'The Royal Hair Ritual (Duo Set)',
          size: 'Full Ritual Duo Set (Oil + Shampoo)',
          qty: 1,
          price: 999,
          img: 'assets/duo-ritual-new.jpg'
        }
      ],
      subtotal: 999,
      discount: 0,
      shipping: 0,
      total: 999,
      payment_method: 'UPI / PhonePe',
      payment_status: 'paid',
      status: 'processing',
      created_at: '2026-10-08T09:30:00.000Z'
    }
  ];

  try {
    for (const o of sampleOrders) {
      await pool.query(`
        INSERT INTO orders (id, order_number, channel, customer, items, subtotal, discount, shipping, total, payment_method, payment_status, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
      `, [
        o.id, o.order_number, o.channel, JSON.stringify(o.customer), JSON.stringify(o.items),
        o.subtotal, o.discount, o.shipping, o.total, o.payment_method, o.payment_status, o.status, o.created_at
      ]);
    }
    console.log('✅ Seeded additional sample orders for Pooja Madhavan');
  } catch (err) {
    console.error('Error seeding orders:', err);
  } finally {
    pool.end();
  }
}

seedMoreOrders();
