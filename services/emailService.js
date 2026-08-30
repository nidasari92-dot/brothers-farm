const nodemailer = require('nodemailer');
const dns = require('dns');
require('dotenv').config();
const { formatRupiah } = require('../utils/format');

const enabled = String(process.env.EMAIL_NOTIFY_ENABLED || 'false').toLowerCase() === 'true';
const adminEmail = process.env.EMAIL_ADMIN || '';

let transporter = null;

if (enabled) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    lookup: (hostname, options, callback) => {
      dns.resolve(hostname, 'A', (err, addresses) => {
        if (err) return callback(err);
        callback(null, addresses[0], 4);
      });
    },
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail({ to, subject, html, text }) {
  if (!enabled || !transporter) {
    console.log('[EMAIL DISABLED]', { to, subject });
    return { enabled: false, mocked: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    return { enabled: true, messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
    throw err;
  }
}

// Templates
function userRegisteredTemplate({ username, email, role }) {
  return {
    to: email,
    subject: 'Akun CV Brothers Farm - Selamat Datang',
    html: `<h2>Selamat Datang, ${escapeHtml(username)}!</h2>
<p>Akun Anda telah dibuat di sistem <strong>CV Brothers Farm</strong>.</p>
<ul>
  <li>Username: <strong>${escapeHtml(username)}</strong></li>
  <li>Role: <strong>${escapeHtml(role)}</strong></li>
</ul>
<p>Silakan login dan mulai menggunakan sistem.</p>`,
    text: `Selamat Datang, ${username}!\n\nAkun Anda telah dibuat di sistem CV Brothers Farm.\nUsername: ${username}\nRole: ${role}\n\nSilakan login dan mulai menggunakan sistem.`,
  };
}

function paymentReceivedTemplate({ customerName, orderNo, amount, paymentMethod, status }) {
  return {
    to: adminEmail,
    subject: `Pembayaran Masuk - ${orderNo}`,
    html: `<h2>Pembayaran Diterima</h2>
<p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
<p><strong>Order:</strong> ${escapeHtml(orderNo)}</p>
<p><strong>Jumlah:</strong> ${formatRupiah(amount)}</p>
<p><strong>Metode:</strong> ${escapeHtml(paymentMethod)}</p>
<p><strong>Status:</strong> <span style="color:green">${escapeHtml(status)}</span></p>`,
    text: `Pembayaran Diterima\nCustomer: ${customerName}\nOrder: ${orderNo}\nJumlah: ${formatRupiah(amount)}\nMetode: ${paymentMethod}\nStatus: ${status}`,
  };
}

function orderCreatedTemplate({ customerName, orderNo, total, items }) {
  return {
    to: adminEmail,
    subject: `Order Baru - ${orderNo}`,
    html: `<h2>Order Baru Dibuat</h2>
<p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
<p><strong>Order:</strong> ${escapeHtml(orderNo)}</p>
<p><strong>Total:</strong> ${formatRupiah(total)}</p>
<h3>Items:</h3>
<table border="1" cellpadding="6" cellspacing="0">
  <tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr>
  ${(items || []).map(i => `<tr><td>${escapeHtml(i.nama || '')}</td><td>${i.qty}</td><td>${formatRupiah(i.hargaJual)}</td><td>${formatRupiah(i.subtotal)}</td></tr>`).join('')}
</table>`,
    text: `Order Baru Dibuat\nCustomer: ${customerName}\nOrder: ${orderNo}\nTotal: ${formatRupiah(total)}\nItems: ${(items || []).map(i => `${i.nama || ''} x${i.qty}`).join(', ')}`,
  };
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

module.exports = {
  sendMail,
  userRegisteredTemplate,
  paymentReceivedTemplate,
  orderCreatedTemplate,
};
