const { db } = require('../config/database');
const { formatRupiah } = require('../utils/format');

// Simple FAQ chatbot logic
function getBotReply(message) {
  const text = String(message || '').toLowerCase().trim();

  // Detect intent by keywords
  const has = (keywords) => keywords.some(k => text.includes(k));

  // Order status
  if (has(['status', 'tracking', 'lacak', 'status order', 'pesanan'])) {
    return `📋 Cek Status Order:\n\n• Buka menu "Order Saya"\n• Lihat daftar order Anda\n• Status: Belum Lunas / Lunas / Menunggu Pembayaran\n\nButuh bantuan lebih lanjut? Hubungi admin.`;
  }

  // How to order
  if (has(['order', 'pesan', 'beli', 'beli', 'pemesanan', 'bagaimana cara', 'cara pesan'])) {
    return `🛒 Cara Order:\n\n1. Buka halaman Buat Order di portal\n2. Pilih produk dan qty\n3. Pilih metode bayar\n4. Kirim order\n5. Bayar sesuai instruksi\n\nAnda juga bisa lihat katalog di /catalog.`;
  }

  // Catalog / prices
  if (has(['harga', 'price', 'catalog', 'katalog', 'produk', 'product', 'barang', 'list produk', 'daftar produk'])) {
    const products = db.prepare(`
      SELECT p.kode, p.nama, p.satuan, p.hargaJualTerakhir
      FROM produk p
      WHERE p.status = 'Aktif' AND p.hargaJualTerakhir IS NOT NULL
      ORDER BY p.kategori, p.nama
      LIMIT 20
    `).all();

    if (!products.length) return 'Maaf, saat ini belum ada harga produk yang tersedia.';

    const lines = products.map(p => `• ${p.kode} - ${p.nama}: ${formatRupiah(p.hargaJualTerakhir)}/${p.satuan}`);
    return `📦 Harga terbaru:\n\n${lines.join('\n')}\n\nLihat detail lengkap di /catalog.`;
  }

  // Payment methods
  if (has(['bayar', 'pembayaran', 'payment', 'transfer', 'qris', 'va', 'rekening', 'va number'])) {
    return `💳 Metode Pembayaran yang tersedia:\n\n• Transfer BCA: 1234567890 a.n. CV Brothers Farm\n• QRIS: Tersedia di halaman pembayaran\n• Virtual Account: BCA 988XXXXXX\n\nSetelah bayar, klik "Simulate Pembayaran" untuk testing.`;
  }

  // Registration / account
  if (has(['register', 'daftar', 'akun', 'account', 'login', 'masuk', 'lupa password', 'lupa sandi'])) {
    return `👤 Akun Customer:\n\n• Register: klik menu Register di portal\n• Login: pakai email dan password\n• Lupa password: hubungi admin untuk reset\n\nCatatan: akun harus terasosiasi dengan data customer.`;
  }

  // Shipping / delivery
  if (has(['kirim', 'delivery', 'ongkir', 'ongkos', 'antar', 'pengiriman', 'estimasi'])) {
    return `🚚 Informasi Pengiriman:\n\n• Pengiriman dilaksanakan sesuai kesepakatan\n• Estimasi: 1-2 hari kerja\n• Biaya pengiriman: menyesuaikan lokasi\n\nHubungi admin untuk detail ongkos kirim.`;
  }

  // Contact / admin
  if (has(['kontak', 'contact', 'admin', 'telpon', 'telepon', 'whatsapp', 'wa', 'help', 'bantuan'])) {
    return `📞 Kontak Admin:\n\n• WhatsApp: [Admin number]\n• Telepon: [Admin phone]\n• Email: admin@brothers-farm.local\n\nJam operasional: Senin - Sabtu, 08:00 - 17:00`;
  }

  // Greeting
  if (has(['halo', 'hi', 'hello', 'hai', 'hey', 'pagi', 'siang', 'sore', 'malam'])) {
    const timeGreet = new Date().getHours() < 12 ? 'Pagi' : new Date().getHours() < 15 ? 'Siang' : new Date().getHours() < 18 ? 'Sore' : 'Malam';
    return `Halo ${timeGreet}! 👋\n\nSaya asisten CV Brothers Farm. Saya bisa bantu:\n• Lihat harga produk\n• Cara order\n• Metode pembayaran\n• Status order\n• Kontak admin\n\nApa yang bisa saya bantu?`;
  }

  // Thank you
  if (has(['terima kasih', 'thanks', 'thank you', 'makasih', 'thx'])) {
    return `Sama-sama! 😊\n\nAda yang perlu dibantu lagi?`;
  }

  // Fallback
  return `Maaf, saya belum mengerti pertanyaan itu. 🤔\n\nSaya bisa bantu:\n• Harga produk\n• Cara order\n• Metode pembayaran\n• Status order\n• Kontak admin\n\nCoba tanyakan dengan kata kunci di atas.`;
}

// POST /api/chatbot/message
function chatMessage(req, res) {
  const { message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Pesan wajib diisi.' });
  }

  const reply = getBotReply(message);
  res.json({ reply, timestamp: new Date().toISOString() });
}

module.exports = { chatMessage };
