require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { init } = require('./config/database');

init(); // buat tabel jika belum ada

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use('/invoices', express.static(path.join(__dirname, 'invoices_output')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customer', require('./routes/customerAuth'));
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/prices', require('./routes/prices'));
app.use('/api/price-history', require('./routes/priceHistory'));
const ocrCtrl = require('./controllers/ocrController');
const { authenticate, adminOnly } = require('./middleware/auth');
app.post('/api/ocr', authenticate, adminOnly, ocrCtrl.upload.single('image'), ocrCtrl.ocrImage);
app.post('/api/ocr/confirm', authenticate, adminOnly, ocrCtrl.confirmOcrUpdate);
console.log('Registered OCR inline routes');


app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/portal', require('./routes/customerPortal'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/backup', require('./routes/backup'));
console.log('Registered backup routes at /api/backup');
app.use('/api/payment-gateway', require('./routes/paymentGateway'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Fallback ke index.html untuk SPA routing sederhana
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path === '/catalog' || req.path === '/catalog.html') {
    return res.sendFile(path.join(__dirname, 'public', 'catalog.html'));
  }
  if (req.path === '/portal' || req.path === '/portal.html') {
    return res.sendFile(path.join(__dirname, 'public', 'portal.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler terpusat
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CV Brothers Farm - server berjalan di port ${PORT}`);
});
