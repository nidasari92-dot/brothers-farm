const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/priceHistoryController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/today', authenticate, adminOnly, (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const data = ctrl.getHistoryByDate(today);
    res.json({ tanggal: today, items: data });
  } catch (err) {
    console.error('price history today error:', err);
    res.status(500).json({ error: 'Gagal memuat harga hari ini.' });
  }
});

router.get('/by-date', authenticate, adminOnly, (req, res) => {
  try {
    const { tanggal } = req.query;
    if (!tanggal) return res.status(400).json({ error: 'Parameter tanggal wajib diisi.' });
    const data = ctrl.getHistoryByDate(tanggal);
    res.json({ tanggal, items: data });
  } catch (err) {
    console.error('price history by-date error:', err);
    res.status(500).json({ error: 'Gagal memuat riwayat harga.' });
  }
});

router.get('/range', authenticate, adminOnly, (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'Parameter start dan end wajib diisi.' });
    const data = ctrl.getHistoryRange(start, end);
    res.json({ start, end, items: data });
  } catch (err) {
    console.error('price history range error:', err);
    res.status(500).json({ error: 'Gagal memuat rentang harga.' });
  }
});

router.get('/product/:id', authenticate, adminOnly, (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '30', 10);
    const data = ctrl.getProductHistory(req.params.id, limit);
    res.json({ produkId: req.params.id, history: data });
  } catch (err) {
    console.error('product history error:', err);
    res.status(500).json({ error: 'Gagal memuat riwayat produk.' });
  }
});

router.post('/compare', authenticate, adminOnly, (req, res) => {
  try {
    const { start, end } = req.body || {};
    if (!start || !end) return res.status(400).json({ error: 'start dan end wajib diisi.' });
    const data = ctrl.getCompare(start, end);
    res.json({ start, end, items: data });
  } catch (err) {
    console.error('compare error:', err);
    res.status(500).json({ error: 'Gagal memuat perbandingan harga.' });
  }
});

router.post('/upsert', authenticate, adminOnly, (req, res) => {
  try {
    const { tanggal, produkId, hargaBeli, hargaJual, sumber = 'manual' } = req.body || {};
    if (!tanggal || !produkId) return res.status(400).json({ error: 'tanggal dan produkId wajib diisi.' });
    ctrl.upsertHistory(tanggal, produkId, hargaBeli || 0, hargaJual || 0, sumber);
    res.json({ ok: true });
  } catch (err) {
    console.error('upsert error:', err);
    res.status(500).json({ error: 'Gagal menyimpan riwayat harga.' });
  }
});

module.exports = router;
