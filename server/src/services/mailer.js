/**
 * Nachiyar Herbals & Cosmetics - Transactional Email & Customer Notification Service
 * Sends royal branded, luxury Amazon / Flipkart / Meesho style transactional emails:
 * 1. Order Placed & Confirmed
 * 2. Order Delivered
 * 3. Order Cancelled & Refund Update
 * 4. Password Reset OTP Verification
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

let transporter = null;


function getTransporter(forceFresh = false) {
  if (transporter && !forceFresh) return transporter;

  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    try {
      if (transporter && typeof transporter.close === 'function') {
        try { transporter.close(); } catch (e) {}
      }
      transporter = nodemailer.createTransport({
        pool: true,
        host,
        port,
        secure,
        auth: { user, pass },
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        socketTimeout: 30000,
        connectionTimeout: 15000,
        tls: { rejectUnauthorized: false }
      });
      return transporter;
    } catch (e) {
      console.warn('⚠️ [Mailer] Failed to initialize SMTP transporter:', e.message);
      return null;
    }
  }

  return null;
}

/**
 * Robust dispatcher with immediate automatic retry on connection failure
 */
async function dispatchMailWithRetry(mailOptions, contextLabel = 'Email') {
  let mailer = getTransporter();
  if (!mailer) {
    console.warn(`ℹ️ [Mailer] No SMTP configured. ${contextLabel} skipped.`);
    return { success: false, sent: false, note: 'SMTP transporter not configured' };
  }

  try {
    const info = await mailer.sendMail(mailOptions);
    console.log(`✅ [Mailer] ${contextLabel} dispatched successfully to ${mailOptions.to} (MessageId: ${info.messageId})`);
    return { success: true, sent: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`⚠️ [Mailer] ${contextLabel} attempt 1 failed (${err.message}). Retrying immediately on fresh connection...`);
    try {
      mailer = getTransporter(true); // force fresh connection
      if (!mailer) throw err;
      const retryInfo = await mailer.sendMail(mailOptions);
      console.log(`✅ [Mailer] ${contextLabel} dispatched successfully on retry to ${mailOptions.to} (MessageId: ${retryInfo.messageId})`);
      return { success: true, sent: true, messageId: retryInfo.messageId };
    } catch (retryErr) {
      console.error(`❌ [Mailer] ${contextLabel} retry also failed: ${retryErr.message}`);
      return { success: false, sent: false, error: retryErr.message };
    }
  }
}

function getFromHeader() {
  const user = (process.env.SMTP_USER || '').trim();
  return process.env.SMTP_FROM || `"Nachiyar Herbals" <${user || 'care@nachiyarherbals.com'}>`;
}

function formatCurrency(num) {
  const n = Math.round(Number(num) || 0);
  return '₹' + n.toLocaleString('en-IN');
}

function formatDate(dateStr) {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return String(dateStr || '');
  }
}

function extractCustomer(order) {
  let customer = order?.customer;
  if (typeof customer === 'string') {
    try { customer = JSON.parse(customer); } catch (e) { customer = {}; }
  }
  customer = customer || {};

  const name = customer.name || customer.fullName || 'Valued Customer';
  const email = (customer.email || customer.userEmail || '').trim();
  const phone = customer.phone || customer.mobile || '';
  const address = customer.address || '';
  const city = customer.city || '';
  const state = customer.state || '';
  const pincode = customer.pincode || '';
  const fullAddress = [address, city, state, pincode].filter(Boolean).join(', ');

  return { name, email, phone, address, city, state, pincode, fullAddress };
}

function extractItems(order) {
  let items = order?.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (e) { items = []; }
  }
  if (!Array.isArray(items)) return [];

  return items.map(item => ({
    name: item.name || 'Botanical Herbal Product',
    qty: Math.max(1, Number(item.qty || item.quantity || 1)),
    price: Number(item.price || 0),
    size: item.size || '',
    img: item.img || item.image || ''
  }));
}

/**
 * Common HTML email header wrapper (Luxury Royal Theme)
 */
function buildHeader(title, subtitle = 'Pure Herbal Wellness & Authentic Care') {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#2D1832; background:linear-gradient(135deg, #231227 0%, #3B1B40 50%, #231227 100%); border-radius:14px 14px 0 0; text-align:center; padding:30px 20px 24px 20px;">
      <tr>
        <td align="center">
          <div style="margin-bottom:12px;">
            <img src="https://nachiyarherbals.com/assets/nachiyar-logo.png" alt="Nachiyar Herbals & Cosmetics Logo" style="height:55px; max-height:55px; width:auto; border-radius:6px; display:inline-block;" />
          </div>
          <h1 style="margin:0 0 6px 0; font-family:'Georgia', 'Times New Roman', serif; font-size:22px; font-weight:700; letter-spacing:2.5px; color:#FAF7F2; text-transform:uppercase;">
            NACHIYAR HERBALS & COSMETICS
          </h1>
          <div style="font-size:11px; color:#D4AF37; text-transform:uppercase; letter-spacing:2px; font-weight:600;">
            ${subtitle}
          </div>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Common HTML email footer
 */
function buildFooter() {
  return `
    <div style="background-color:#F5EFE6; border-radius:0 0 14px 14px; padding:24px 20px; text-align:center; border-top:1px solid #EBE2D5; margin-top:28px;">
      <div style="display:inline-block; margin-bottom:14px;">
        <span style="display:inline-block; background:#FAF7F2; border:1px solid #D9CEBE; border-radius:20px; padding:6px 14px; font-size:11px; color:#6B5340; font-weight:600; margin:3px 4px;">
          🌱 100% Botanical Formulations
        </span>
        <span style="display:inline-block; background:#FAF7F2; border:1px solid #D9CEBE; border-radius:20px; padding:6px 14px; font-size:11px; color:#6B5340; font-weight:600; margin:3px 4px;">
          ❌ No Paraben & Sulphates
        </span>
        <span style="display:inline-block; background:#FAF7F2; border:1px solid #D9CEBE; border-radius:20px; padding:6px 14px; font-size:11px; color:#6B5340; font-weight:600; margin:3px 4px;">
          📜 Traditional Herbal Heritage
        </span>
      </div>

      <p style="margin:0 0 8px 0; font-size:12px; color:#7A6A58; line-height:1.5;">
        Have questions or need assistance with your order? We are here to help!<br>
        <strong>WhatsApp / Call:</strong> <a href="tel:+919944474747" style="color:#2D1832; text-decoration:none; font-weight:700;">+91 99444 74747</a> | 
        <strong>Email:</strong> <a href="mailto:care@nachiyarherbals.com" style="color:#2D1832; text-decoration:none; font-weight:700;">care@nachiyarherbals.com</a>
      </p>

      <div style="margin-top:14px; padding-top:12px; border-top:1px dashed #D9CEBE; font-size:11px; color:#9E8F80;">
        © 2026 Nachiyar Herbals & Cosmetics. All rights reserved.<br>
        Registered Store: Opp. to Court, Madurai Main Road, Melur, Tamil Nadu - 625106.
      </div>
    </div>
  `;
}

/**
 * 1. SEND ORDER CONFIRMATION EMAIL (Amazon / Flipkart benchmark)
 * Sent immediately after customer completes checkout.
 */
async function sendOrderConfirmationEmail(order) {
  const mailer = getTransporter();
  const customer = extractCustomer(order);
  const items = extractItems(order);

  if (!customer.email || !customer.email.includes('@') || customer.email.endsWith('@example.com')) {
    console.log(`ℹ️ [Mailer] No valid customer email for order #${order.orderNumber}. Skipping confirmation email.`);
    return { success: false, reason: 'no_valid_email' };
  }

  const orderNumber = order.orderNumber || order.id || 'NH-ORDER';
  const orderDate = formatDate(order.createdAt);
  const totalStr = formatCurrency(order.total);
  const subtotalStr = formatCurrency(order.subtotal || order.total);
  const shippingStr = Number(order.shipping) > 0 ? formatCurrency(order.shipping) : '<span style="color:#15803D; font-weight:700;">FREE</span>';
  const discountStr = Number(order.discount) > 0 ? `-${formatCurrency(order.discount)}` : null;
  const paymentMethod = order.paymentMethod || 'Online Payment';
  const trackUrl = `https://nachiyarherbals.com/order-status.html?id=${encodeURIComponent(orderNumber)}`;

  // Build items rows
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:14px 10px; border-bottom:1px solid #F0E9DF; vertical-align:middle;">
        <div style="font-size:14px; font-weight:700; color:#2D1832; line-height:1.3;">${item.name}</div>
        ${item.size ? `<div style="font-size:11px; color:#8A7A6E; margin-top:2px;">Size / Variant: ${item.size}</div>` : ''}
        <div style="font-size:12px; color:#6E5B4B; margin-top:3px;">Quantity: <strong>${item.qty}</strong></div>
      </td>
      <td align="right" style="padding:14px 10px; border-bottom:1px solid #F0E9DF; vertical-align:middle; font-size:14px; font-weight:700; color:#2D1832; white-space:nowrap;">
        ${formatCurrency(item.price * item.qty)}
      </td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmed #${orderNumber} - Nachiyar Herbals</title>
    </head>
    <body style="margin:0; padding:24px 12px; background-color:#FAF8F5; font-family:'Segoe UI', Arial, sans-serif; color:#2D1832; -webkit-font-smoothing:antialiased;">
      <div style="max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:14px; border:1px solid #E8DFD3; box-shadow:0 8px 24px rgba(45,24,50,0.06); overflow:hidden;">
        
        ${buildHeader('Order Confirmed', 'Pure Botanical Formulations')}

        <div style="padding:28px 24px 0 24px;">
          <!-- Status Pill -->
          <div style="background-color:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; padding:16px 20px; text-align:center; margin-bottom:24px;">
            <div style="display:inline-block; background:#10B981; color:#FFFFFF; width:28px; height:28px; line-height:28px; border-radius:50%; font-size:16px; font-weight:bold; margin-bottom:6px;">✓</div>
            <div style="font-size:18px; font-weight:800; color:#065F46; letter-spacing:0.3px;">Order Placed Successfully!</div>
            <div style="font-size:13px; color:#047857; margin-top:4px;">
              Thank you, <strong>${customer.name}</strong>. We have received your order and are preparing your fresh herbal wellness package.
            </div>
          </div>

          <!-- Order & Customer Meta Cards -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px; border-collapse:separate; border-spacing:0;">
            <tr>
              <td style="width:50%; vertical-align:top; background:#FAF7F2; border:1px solid #EBE2D5; border-radius:10px; padding:16px; margin-right:6px;">
                <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#8A7A6E; font-weight:700; margin-bottom:6px;">Order Summary</div>
                <div style="font-size:14px; color:#2D1832; font-weight:800; margin-bottom:4px;">#${orderNumber}</div>
                <div style="font-size:12px; color:#6E5B4B; margin-bottom:4px;"><strong>Date:</strong> ${orderDate}</div>
                <div style="font-size:12px; color:#6E5B4B;"><strong>Payment:</strong> ${paymentMethod}</div>
              </td>
              <td style="width:12px;"></td>
              <td style="width:50%; vertical-align:top; background:#FAF7F2; border:1px solid #EBE2D5; border-radius:10px; padding:16px;">
                <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#8A7A6E; font-weight:700; margin-bottom:6px;">Delivery Address</div>
                <div style="font-size:13px; color:#2D1832; font-weight:700; margin-bottom:3px;">${customer.name}</div>
                <div style="font-size:12px; color:#6E5B4B; line-height:1.4;">
                  ${customer.fullAddress || 'Address on file'}<br>
                  ${customer.phone ? `<strong>Phone:</strong> ${customer.phone}` : ''}
                </div>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <div style="margin-bottom:20px;">
            <div style="font-size:14px; font-weight:800; color:#2D1832; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">
              Ordered Items (${items.length})
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #EBE2D5; border-radius:10px; overflow:hidden;">
              <thead>
                <tr style="background:#FAF7F2;">
                  <th align="left" style="padding:10px; font-size:11px; color:#8A7A6E; text-transform:uppercase; letter-spacing:1px;">Product Details</th>
                  <th align="right" style="padding:10px; font-size:11px; color:#8A7A6E; text-transform:uppercase; letter-spacing:1px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Price Breakdown -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
            <tr>
              <td style="width:55%;"></td>
              <td style="width:45%; background:#FAF7F2; border:1px solid #EBE2D5; border-radius:10px; padding:14px 18px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px; color:#6E5B4B;">
                  <tr>
                    <td style="padding:4px 0;">Subtotal:</td>
                    <td align="right" style="padding:4px 0; font-weight:600; color:#2D1832;">${subtotalStr}</td>
                  </tr>
                  ${discountStr ? `
                  <tr>
                    <td style="padding:4px 0; color:#059669;">Discount:</td>
                    <td align="right" style="padding:4px 0; font-weight:700; color:#059669;">${discountStr}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:4px 0;">Delivery:</td>
                    <td align="right" style="padding:4px 0;">${shippingStr}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0 0 0; border-top:1px dashed #D9CEBE; font-size:15px; font-weight:800; color:#2D1832;">Grand Total:</td>
                    <td align="right" style="padding:8px 0 0 0; border-top:1px dashed #D9CEBE; font-size:16px; font-weight:800; color:#2D1832;">${totalStr}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Action Button (Flipkart / Amazon Style) -->
          <div style="text-align:center; margin:28px 0 10px 0;">
            <a href="${trackUrl}" target="_blank" style="display:inline-block; background-color:#2D1832; color:#FAF7F2; font-size:14px; font-weight:700; text-decoration:none; padding:14px 34px; border-radius:30px; letter-spacing:1px; box-shadow:0 4px 14px rgba(45,24,50,0.25);">
              📦 TRACK YOUR ORDER LIVE
            </a>
            <div style="font-size:12px; color:#8A7A6E; margin-top:10px;">
              You can track delivery progress and download invoices anytime from your account.
            </div>
          </div>
        </div>

        ${buildFooter()}
      </div>
    </body>
    </html>
  `;

  return dispatchMailWithRetry({
    from: getFromHeader(),
    to: customer.email,
    replyTo: process.env.SMTP_USER || 'care@nachiyarherbals.com',
    subject: `✨ Order Confirmed: #${orderNumber} - Nachiyar Herbals`,
    text: `Hello ${customer.name},\n\nYour order #${orderNumber} has been successfully placed!\nTotal: ${totalStr}\nPayment: ${paymentMethod}\n\nTrack your order at: ${trackUrl}\n\nThank you for choosing Nachiyar Herbals!\nCare Desk: +91 99444 74747`,
    html: htmlContent,
    headers: {
      'X-Mailer': 'Nachiyar Herbals Order Engine',
      'X-Priority': '1 (Highest)',
      'Importance': 'High'
    }
  }, `Order confirmation #${orderNumber}`);
}

/**
 * 2. SEND ORDER CANCELLATION EMAIL (Flipkart / Meesho benchmark)
 * Sent when order is cancelled by customer or admin with full refund breakdown.
 */
async function sendOrderCancellationEmail(order, details = {}) {
  const mailer = getTransporter();
  const customer = extractCustomer(order);
  const items = extractItems(order);

  if (!customer.email || !customer.email.includes('@') || customer.email.endsWith('@example.com')) {
    console.log(`ℹ️ [Mailer] No valid customer email for order #${order.orderNumber}. Skipping cancellation email.`);
    return { success: false, reason: 'no_valid_email' };
  }

  const orderNumber = order.orderNumber || order.id || 'NH-ORDER';
  const totalStr = formatCurrency(order.total);
  const isOnlinePaid = !/cod|cash on delivery/i.test(order.paymentMethod || '');
  const refundAmount = details.refundAmount !== undefined ? formatCurrency(details.refundAmount) : totalStr;
  const refundMode = details.refundMode || (isOnlinePaid ? 'Original Payment Source (UPI / Card / Net Banking)' : 'Not Applicable (Cash on Delivery)');
  const refundUtr = details.refundUtr || 'N/A';
  const reason = details.reason || order.cancellationDetails?.reason || 'Customer cancellation request';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Cancelled #${orderNumber} - Nachiyar Herbals</title>
    </head>
    <body style="margin:0; padding:24px 12px; background-color:#FAF8F5; font-family:'Segoe UI', Arial, sans-serif; color:#2D1832; -webkit-font-smoothing:antialiased;">
      <div style="max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:14px; border:1px solid #E8DFD3; box-shadow:0 8px 24px rgba(45,24,50,0.06); overflow:hidden;">
        
        ${buildHeader('Order Cancellation Notice', 'Customer Care & Support')}

        <div style="padding:28px 24px 0 24px;">
          <!-- Cancellation Alert Pill -->
          <div style="background-color:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:16px 20px; text-align:center; margin-bottom:24px;">
            <div style="display:inline-block; background:#EF4444; color:#FFFFFF; width:28px; height:28px; line-height:28px; border-radius:50%; font-size:16px; font-weight:bold; margin-bottom:6px;">✕</div>
            <div style="font-size:18px; font-weight:800; color:#991B1B; letter-spacing:0.3px;">Order #${orderNumber} Has Been Cancelled</div>
            <div style="font-size:13px; color:#B91C1C; margin-top:4px;">
              Hello <strong>${customer.name}</strong>, as requested, your order has been cancelled and will not be dispatched.
            </div>
          </div>

          <!-- Refund Details Box -->
          <div style="background:#FAF7F2; border:1px solid #EBE2D5; border-radius:10px; padding:18px 20px; margin-bottom:22px;">
            <div style="font-size:12px; font-weight:800; color:#8A7A6E; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">
              💳 Refund & Settlement Details
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px; color:#6E5B4B;">
              <tr>
                <td style="padding:4px 0; width:40%;">Order Total:</td>
                <td style="padding:4px 0; font-weight:700; color:#2D1832;">${totalStr}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;">Refund Amount:</td>
                <td style="padding:4px 0; font-weight:800; color:${isOnlinePaid ? '#059669' : '#2D1832'}; font-size:15px;">
                  ${isOnlinePaid ? refundAmount : '₹0 (No upfront payment collected for COD)'}
                </td>
              </tr>
              <tr>
                <td style="padding:4px 0;">Refund Mode:</td>
                <td style="padding:4px 0; font-weight:600; color:#2D1832;">${refundMode}</td>
              </tr>
              ${isOnlinePaid ? `
              <tr>
                <td style="padding:4px 0;">Refund Reference / UTR:</td>
                <td style="padding:4px 0; font-family:monospace; font-weight:700; color:#2D1832;">${refundUtr}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;">Expected Credit Timeline:</td>
                <td style="padding:4px 0; font-weight:600; color:#059669;">3 - 5 Business Days to your original bank / UPI account</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding:4px 0; vertical-align:top;">Cancellation Reason:</td>
                <td style="padding:4px 0; color:#78695C; font-style:italic;">${reason}</td>
              </tr>
            </table>
          </div>

          <!-- Cancelled Items Summary -->
          <div style="margin-bottom:24px;">
            <div style="font-size:13px; font-weight:800; color:#2D1832; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.8px;">
              Cancelled Items (${items.length})
            </div>
            <div style="background:#FFFFFF; border:1px solid #EBE2D5; border-radius:10px; padding:12px 16px;">
              ${items.map(item => `
                <div style="padding:6px 0; border-bottom:1px solid #F5EFE6; font-size:13px; color:#555555; display:flex; justify-content:space-between;">
                  <span>• <strong>${item.name}</strong> (Qty: ${item.qty})</span>
                  <span style="font-weight:700; color:#2D1832; float:right;">${formatCurrency(item.price * item.qty)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Explore Store CTA -->
          <div style="text-align:center; margin:24px 0 10px 0;">
            <a href="https://nachiyarherbals.com/shop.html" target="_blank" style="display:inline-block; background-color:#2D1832; color:#FAF7F2; font-size:14px; font-weight:700; text-decoration:none; padding:12px 30px; border-radius:30px; letter-spacing:1px; box-shadow:0 4px 14px rgba(45,24,50,0.2);">
              🛍️ EXPLORE HERBAL CATALOG
            </a>
            <div style="font-size:12px; color:#8A7A6E; margin-top:8px;">
              We hope to serve you again soon with our natural wellness products.
            </div>
          </div>
        </div>

        ${buildFooter()}
      </div>
    </body>
    </html>
  `;

  return dispatchMailWithRetry({
    from: getFromHeader(),
    to: customer.email,
    replyTo: process.env.SMTP_USER || 'care@nachiyarherbals.com',
    subject: `Order Cancelled: #${orderNumber} - Nachiyar Herbals`,
    text: `Hello ${customer.name},\n\nYour order #${orderNumber} has been successfully cancelled.\n${isOnlinePaid ? `Refund of ${refundAmount} initiated via ${refundMode}. Reference UTR: ${refundUtr}` : 'COD order cancelled with no payment required.'}\n\nQuestions? Contact our care desk: +91 99444 74747\nNachiyar Herbals Team`,
    html: htmlContent,
    headers: {
      'X-Mailer': 'Nachiyar Herbals Order Engine',
      'X-Priority': '1 (Highest)',
      'Importance': 'High'
    }
  }, `Order cancellation #${orderNumber}`);
}

/**
 * 3. SEND ORDER DELIVERED EMAIL (Amazon / Flipkart benchmark)
 * Sent when order is marked as delivered by courier or admin.
 */
async function sendOrderDeliveredEmail(order) {
  const mailer = getTransporter();
  const customer = extractCustomer(order);
  const items = extractItems(order);

  if (!customer.email || !customer.email.includes('@') || customer.email.endsWith('@example.com')) {
    console.log(`ℹ️ [Mailer] No valid customer email for order #${order.orderNumber}. Skipping delivered email.`);
    return { success: false, reason: 'no_valid_email' };
  }

  const orderNumber = order.orderNumber || order.id || 'NH-ORDER';
  const totalStr = formatCurrency(order.total);
  const reviewUrl = `https://nachiyarherbals.com/reviews/?order=${encodeURIComponent(orderNumber)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivered: #${orderNumber} - Nachiyar Herbals</title>
    </head>
    <body style="margin:0; padding:24px 12px; background-color:#FAF8F5; font-family:'Segoe UI', Arial, sans-serif; color:#2D1832; -webkit-font-smoothing:antialiased;">
      <div style="max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:14px; border:1px solid #E8DFD3; box-shadow:0 8px 24px rgba(45,24,50,0.06); overflow:hidden;">
        
        ${buildHeader('Order Delivered', 'Pure Botanical Formulations')}

        <div style="padding:28px 24px 0 24px;">
          <!-- Celebration Delivered Pill -->
          <div style="background-color:#F5F3FF; border:1px solid #DDD6FE; border-radius:10px; padding:18px 20px; text-align:center; margin-bottom:24px;">
            <div style="display:inline-block; background:#7C3AED; color:#FFFFFF; width:30px; height:30px; line-height:30px; border-radius:50%; font-size:16px; font-weight:bold; margin-bottom:6px;">📦</div>
            <div style="font-size:18px; font-weight:800; color:#5B21B6; letter-spacing:0.3px;">Your Package Has Arrived!</div>
            <div style="font-size:13px; color:#6D28D9; margin-top:4px;">
              Hello <strong>${customer.name}</strong>, your order <strong>#${orderNumber}</strong> has been successfully delivered.
            </div>
          </div>

          <!-- Product Usage & Herbal Care Note -->
          <div style="background:#FAF7F2; border:1px solid #EBE2D5; border-radius:10px; padding:18px 20px; margin-bottom:22px;">
            <div style="font-size:12px; font-weight:800; color:#8A7A6E; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
              🌿 Quick Botanical Care Tips
            </div>
            <p style="margin:0 0 8px 0; font-size:13px; color:#5D4E41; line-height:1.5;">
              • Store your herbal oils and cleansers in a cool, dry place away from direct sunlight for peak botanical potency.<br>
              • For the best results, use regularly as directed on the label.<br>
              • All our formulations are handcrafted without harsh parabens, artificial silicones, or sulfates.
            </p>
          </div>

          <!-- Delivered Items -->
          <div style="margin-bottom:24px;">
            <div style="font-size:13px; font-weight:800; color:#2D1832; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.8px;">
              Delivered Products (${items.length})
            </div>
            <div style="background:#FFFFFF; border:1px solid #EBE2D5; border-radius:10px; padding:12px 16px;">
              ${items.map(item => `
                <div style="padding:8px 0; border-bottom:1px solid #F5EFE6; font-size:13px; color:#333333;">
                  <strong>${item.name}</strong> (Qty: ${item.qty})
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Feedback & Review CTA -->
          <div style="background:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; padding:20px; text-align:center; margin-bottom:16px;">
            <div style="font-size:16px; font-weight:800; color:#92400E; margin-bottom:6px;">How was your experience? ⭐⭐⭐⭐⭐</div>
            <div style="font-size:13px; color:#B45309; margin-bottom:16px; line-height:1.4;">
              Your genuine feedback helps fellow herbal lovers discover pure Ayurvedic care. Share your experience!
            </div>
            <a href="${reviewUrl}" target="_blank" style="display:inline-block; background-color:#2D1832; color:#D4AF37; font-size:14px; font-weight:700; text-decoration:none; padding:12px 28px; border-radius:30px; letter-spacing:0.8px; box-shadow:0 4px 12px rgba(45,24,50,0.2);">
              ⭐ LEAVE A PRODUCT REVIEW
            </a>
          </div>
        </div>

        ${buildFooter()}
      </div>
    </body>
    </html>
  `;

  return dispatchMailWithRetry({
    from: getFromHeader(),
    to: customer.email,
    replyTo: process.env.SMTP_USER || 'care@nachiyarherbals.com',
    subject: `🎉 Delivered: Your Nachiyar Herbals order #${orderNumber} has arrived!`,
    text: `Hello ${customer.name},\n\nYour order #${orderNumber} has been delivered!\nWe hope you love your pure herbal wellness care.\n\nLeave a product review at: ${reviewUrl}\n\nNeed help? Contact: +91 99444 74747\nNachiyar Herbals Team`,
    html: htmlContent,
    headers: {
      'X-Mailer': 'Nachiyar Herbals Order Engine',
      'X-Priority': '1 (Highest)',
      'Importance': 'High'
    }
  }, `Order delivered #${orderNumber}`);
}

/**
 * 4. SEND OTP EMAIL
 */
async function sendOtpEmail({ to, name = 'Valued Customer', otp }) {
  const user = (process.env.SMTP_USER || '').trim();
  const fromEmail = getFromHeader();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nachiyar Herbals Verification Code</title>
    </head>
    <body style="margin:0; padding:24px 12px; background-color:#FAF8F5; font-family:'Segoe UI', Arial, sans-serif; color:#2D1832; -webkit-font-smoothing:antialiased;">
      <div style="max-width:540px; margin:0 auto; background:#FFFFFF; border-radius:14px; border:1px solid #E8DFD3; box-shadow:0 8px 24px rgba(45,24,50,0.06); overflow:hidden;">
        ${buildHeader('Security Verification', 'Account Protection & Privacy')}

        <div style="padding:28px 24px 10px 24px;">
          <p style="font-size:15px; color:#2D1832; line-height:1.5; margin:0 0 14px 0;">Hello <strong>${name}</strong>,</p>
          <p style="font-size:14px; color:#6E5B4B; line-height:1.5; margin:0 0 20px 0;">
            We received a request to update or reset your Nachiyar Herbals account password. Use the verification code below to proceed:
          </p>

          <div style="background-color:#FAF5FF; border:2px dashed #C9A84C; border-radius:12px; padding:20px; text-align:center; margin:0 0 22px 0;">
            <div style="font-size:36px; font-weight:900; letter-spacing:10px; color:#2D1832; font-family:monospace; line-height:1;">${otp}</div>
            <div style="font-size:12px; color:#8A7A6E; margin-top:10px; font-weight:700;">⏱️ Valid for 5 minutes</div>
          </div>

          <p style="font-size:12px; color:#8A7A6E; line-height:1.5; margin:0 0 16px 0;">
            If you did not make this request, please ignore this email. Your account password remains unchanged. Never share this code with anyone.
          </p>
        </div>

        ${buildFooter()}
      </div>
    </body>
    </html>
  `;

  return dispatchMailWithRetry({
    from: fromEmail,
    to,
    replyTo: user || 'care@nachiyarherbals.com',
    subject: `🔐 ${otp} is your Nachiyar Herbals verification code`,
    text: `Hello ${name},\n\nYour 6-digit verification code to update your account password is: ${otp}\n\nThis code will expire in 5 minutes.\n\nRegards,\nNachiyar Herbals Team`,
    html: htmlContent,
    headers: {
      'X-Mailer': 'Nachiyar Herbals Security Mailer',
      'X-Priority': '1 (Highest)',
      'Importance': 'High'
    }
  }, 'Verification OTP');
}

module.exports = {
  getTransporter,
  sendOtpEmail,
  sendOrderConfirmationEmail,
  sendOrderCancellationEmail,
  sendOrderDeliveredEmail
};
