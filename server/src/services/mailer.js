/**
 * Nachiyar Herbals & Cosmetics - Transactional Email & OTP Dispatcher
 * Sends branded, royal-themed transactional emails and OTP verification codes.
 */

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    try {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      return transporter;
    } catch (e) {
      console.warn('⚠️ [Mailer] Failed to initialize SMTP transporter:', e.message);
      return null;
    }
  }

  // Fallback: Check if local/cPanel sendmail is available or return null
  return null;
}

/**
 * Send an OTP verification email to customer
 * @param {Object} options
 * @param {string} options.to - Customer email address
 * @param {string} options.name - Customer name
 * @param {string} options.otp - 6-digit numeric OTP code
 */
async function sendOtpEmail({ to, name = 'Valued Customer', otp }) {
  const mailer = getTransporter();
  const user = (process.env.SMTP_USER || '').trim();
  const fromEmail = process.env.SMTP_FROM || `"Nachiyar Herbals" <${user || 'care@nachiyarherbals.com'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Nachiyar Herbals Verification Code</title>
    </head>
    <body style="margin:0; padding:20px; background-color:#FAF8F5; font-family:Arial, sans-serif; color:#2D1832;">
      <div style="max-width:520px; margin:0 auto; background:#FFFFFF; border-radius:14px; border:1px solid #E5DDF0; padding:28px 24px; box-shadow:0 4px 16px rgba(45,24,50,0.06);">
        <div style="text-align:center; padding-bottom:18px; border-bottom:1px solid #F0E8F8; margin-bottom:20px;">
          <h2 style="margin:0 0 4px 0; color:#4D1847; font-size:20px; font-weight:800; letter-spacing:1px;">NACHIYAR HERBALS</h2>
          <span style="font-size:11px; color:#A37F14; text-transform:uppercase; letter-spacing:1.5px; font-weight:700;">Account Security Verification</span>
        </div>
        <p style="font-size:15px; color:#333333; line-height:1.5; margin:0 0 16px 0;">Hello <strong>${name}</strong>,</p>
        <p style="font-size:14px; color:#555555; line-height:1.5; margin:0 0 22px 0;">Your one-time verification code to reset or update your account password is:</p>
        <div style="background-color:#FAF5FF; border:1.5px dashed #C9A84C; border-radius:10px; padding:18px; text-align:center; margin:0 0 22px 0;">
          <div style="font-size:34px; font-weight:900; letter-spacing:8px; color:#2D1832; font-family:monospace; line-height:1;">${otp}</div>
          <div style="font-size:12px; color:#8E7F99; margin-top:8px; font-weight:600;">Valid for 5 minutes</div>
        </div>
        <p style="font-size:12px; color:#777777; line-height:1.5; margin:0 0 20px 0;">
          If you did not request this verification code, please ignore this email. Never share this code with anyone.
        </p>
        <div style="border-top:1px solid #F0E8F8; padding-top:16px; text-align:center; font-size:11px; color:#999999;">
          © 2026 Nachiyar Herbals & Cosmetics. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  if (mailer) {
    try {
      const info = await mailer.sendMail({
        from: fromEmail,
        to,
        replyTo: user || 'care@nachiyarherbals.com',
        subject: `${otp} is your Nachiyar Herbals verification code`,
        text: `Hello ${name},\n\nYour 6-digit verification code to update your account password is: ${otp}\n\nThis code will expire in 5 minutes.\n\nRegards,\nNachiyar Herbals Team`,
        html: htmlContent,
        headers: {
          'X-Mailer': 'Nachiyar Herbals Mailer',
          'X-Priority': '1 (Highest)',
          'Importance': 'High'
        }
      });
      console.log(`✅ [Mailer] Verification OTP sent successfully to ${to} (MessageId: ${info.messageId})`);
      return { success: true, sent: true };
    } catch (err) {
      console.warn(`⚠️ [Mailer] Failed to dispatch email via SMTP: ${err.message}. OTP code was: ${otp}`);
      return { success: true, sent: false, error: err.message };
    }
  } else {
    console.log(`ℹ️ [Mailer] No external SMTP configured. Verification OTP for ${to}: [ ${otp} ]`);
    return { success: true, sent: false, note: 'SMTP not configured; OTP logged' };
  }
}

module.exports = {
  sendOtpEmail,
  getTransporter
};
