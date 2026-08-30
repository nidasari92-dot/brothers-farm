const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createWorker } = require('tesseract.js');
const { db } = require('../config/database');
const { formatRupiah, parseRupiah } = require('../utils/format');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'ocr'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) return cb(null, true);
    cb(new Error('Only image files are allowed (jpg, jpeg, png, webp).'));
  }
});

// Parse OCR text into structured price data
function parsePriceText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];
  
  for (const line of lines) {
    // Skip headers and empty lines
    if (!line || line.length < 3) continue;
    if (/^(ITEM|HARGA|KODE|NAMA|NO|QTY)/i.test(line)) continue;
    if (/^(UPDATE|HARGA|JAPFA|KHUSUS|MAGELANG|AYAM|KARKAS)/i.test(line)) continue;
    
    // Try to find price at end of line: Rp 36.000 or 36.000 or 36000
    const priceMatch = line.match(/(?:Rp\s*)?([\d.,]+)\s*$/);
    if (!priceMatch) continue;
    
    const priceRaw = priceMatch[1].replace(/\./g, '').replace(',', '.');
    const price = parseFloat(priceRaw);
    if (isNaN(price) || price < 100) continue; // Skip invalid prices
    
    // Product name is everything before the price
    const productName = line.substring(0, priceMatch.index).replace(/[^a-zA-Z0-9\s\/\-\(\)\,\.]/g, '').trim();
    
    if (productName.length < 2) continue;
    
    results.push({
      nama: productName,
      hargaJualTerakhir: price,
      satuan: 'kg'
    });
  }
  
  return results;
}

// Match parsed items with database
function matchWithDatabase(items) {
  const products = db.prepare('SELECT * FROM produk WHERE status = ?').all('Aktif');
  const results = [];
  
  for (const item of items) {
    // Try exact match first
    let product = products.find(p => 
      item.nama.toLowerCase().includes(p.nama.toLowerCase()) ||
      p.nama.toLowerCase().includes(item.nama.toLowerCase())
    );
    
    // Try partial match
    if (!product) {
      const words = item.nama.toLowerCase().split(/\s+/);
      product = products.find(p => {
        const pWords = p.nama.toLowerCase().split(/\s+/);
        return words.some(w => w.length > 3 && pWords.some(pw => pw.includes(w) || w.includes(pw)));
      });
    }
    
    results.push({
      ...item,
      produkId: product ? product.id : null,
      existingProduct: product ? product.nama : null,
      action: product ? 'update' : 'insert'
    });
  }
  
  return results;
}

async function ocrImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Gambar tidak ditemukan.' });
    }
    
    const imagePath = req.file.path;
    
    // Run OCR
    const worker = await createWorker();
    const { data } = await worker.recognize(imagePath);
    await worker.terminate();
    
    // Clean up uploaded file
    fs.unlinkSync(imagePath);
    
    if (!data.text || data.text.trim().length < 5) {
      return res.status(400).json({ error: 'Tidak dapat membaca teks dari gambar. Pastikan gambar jelas dan tidak buram.' });
    }
    
    // Parse and match
    const parsed = parsePriceText(data.text);
    if (parsed.length === 0) {
      return res.status(400).json({ 
        error: 'Tidak ditemukan data harga dari gambar.',
        rawText: data.text.substring(0, 500) // Show first 500 chars for debugging
      });
    }
    
    const matched = matchWithDatabase(parsed);
    
    res.json({
      rawText: data.text,
      parsedItems: matched,
      totalItems: matched.length,
      matchedCount: matched.filter(i => i.produkId).length,
      newCount: matched.filter(i => !i.produkId).length
    });
    
  } catch (err) {
    console.error('OCR error:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Gagal memproses gambar: ' + err.message });
  }
}

function confirmOcrUpdate(req, res) {
  const { items } = req.body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Data items kosong.' });
  }
  
  const results = [];
  
  for (const item of items) {
    if (!item.nama || !item.hargaJualTerakhir) {
      results.push({ nama: item.nama, status: 'skipped', message: 'Data tidak lengkap' });
      continue;
    }
    
    if (item.action === 'update' && item.produkId) {
      // Update existing product
      db.prepare(`
        UPDATE produk 
        SET hargaJualTerakhir = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(item.hargaJualTerakhir, item.produkId);
      results.push({ nama: item.nama, produkId: item.produkId, status: 'updated', harga: item.hargaJualTerakhir });
    } else if (item.action === 'insert' || !item.produkId) {
      // Insert new product
      const kode = 'OCR-' + Date.now().toString(36).toUpperCase();
      const info = db.prepare(`
        INSERT INTO produk (kode, nama, hargaJualTerakhir, satuan, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(kode, item.nama, item.hargaJualTerakhir, item.satuan || 'kg');
      results.push({ nama: item.nama, produkId: info.lastInsertRowid, status: 'inserted', harga: item.hargaJualTerakhir });
    }
  }
  
  res.json({
    message: `Update selesai. ${results.filter(r => r.status !== 'skipped').length} produk diperbarui.`,
    results
  });
}

module.exports = {
  upload,
  ocrImage,
  confirmOcrUpdate
};
