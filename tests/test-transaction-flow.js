const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3232';
let token = null;
let adminToken = null;
let results = [];
let passed = 0;
let failed = 0;

function req(method, urlPath, body, authToken) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, BASE);
    const data = body ? JSON.stringify(body) : null;
    const rq = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let parsed = null;
        try { parsed = JSON.parse(buf.toString()); } catch {}
        resolve({ status: res.statusCode, data: parsed, raw: buf });
      });
    });
    rq.on('error', reject);
    if (data) rq.write(data);
    rq.end();
  });
}

function assert(name, condition, detail) {
  if (condition) {
    passed++;
    results.push({ name, status: 'PASS', detail: detail || '' });
  } else {
    failed++;
    results.push({ name, status: 'FAIL', detail: detail || '' });
  }
}

function summary() {
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.status}${r.detail ? ' | ' + r.detail : ''}`);
  });
  console.log('----------------------------------------');
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

async function run() {
  try {
    // ========================================
    // 1. AUTH
    // ========================================
    console.log('\n--- AUTH ---');
    const adminLogin = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    assert('Admin login', adminLogin.status === 200 && !!adminLogin.data.token, JSON.stringify(adminLogin.data));
    adminToken = adminLogin.data.token;

    const custLogin = await req('POST', '/api/customer/login', { username: 'rizkitest2@example.com', password: 'rizkipass2' });
    assert('Customer login', custLogin.status === 200 && !!custLogin.data.token, JSON.stringify(custLogin.data));
    token = custLogin.data.token;

    // ========================================
    // 2. CUSTOMER FLOW
    // ========================================
    console.log('\n--- CUSTOMER FLOW ---');

    const products = await req('GET', '/api/portal/products', null, token);
    assert('Load portal products', products.status === 200 && Array.isArray(products.data) && products.data.length > 0, `count=${Array.isArray(products.data)?products.data.length:0}`);

    const orderRes = await req('POST', '/api/portal/orders', {
      tanggal: '2026-08-31',
      metodeBayar: 'Tempo',
      items: [{ produkId: products.data[0].id, qty: 2, hargaJual: products.data[0].hargaJual || 32000, satuan: 'kg' }]
    }, token);
    assert('Create customer order', orderRes.status === 201 && !!orderRes.data.orderId, JSON.stringify(orderRes.data));
    const orderId = orderRes.data.orderId;

    const orderDetail = await req('GET', `/api/portal/orders/${orderId}`, null, token);
    assert('Order detail accessible', orderDetail.status === 200 && orderDetail.data && orderDetail.data.id === orderId, JSON.stringify(orderDetail.data));

    const custInvoices = await req('GET', '/api/invoices', null, token);
    assert('Customer invoice auto-created', Array.isArray(custInvoices.data) && custInvoices.data.some(i => i.refId === orderId), JSON.stringify(custInvoices.data));

    const custPayRes = await req('POST', '/api/payments', {
      tanggal: '2026-08-31',
      jenis: 'penerimaan_customer',
      customerId: orderDetail.data.customerId,
      orderId: orderId,
      jumlahBayar: orderRes.data.total,
      keterangan: 'Pembayaran order customer'
    }, adminToken);
    assert('Customer payment recorded', custPayRes.status === 201 && !!custPayRes.data.pembayaranId, JSON.stringify(custPayRes.data));
    const custInvoiceId = custPayRes.data.invoiceId;

    const custInvAfterPay = custInvoices.data.find(i => i.refId === orderId);
    assert('Customer invoice total matches', custInvAfterPay && custInvAfterPay.total === orderRes.data.total, `invoiceTotal=${custInvAfterPay?.total} orderTotal=${orderRes.data.total}`);

    // ========================================
    // 3. SUPPLIER FLOW
    // ========================================
    console.log('\n--- SUPPLIER FLOW ---');

    const supRes = await req('POST', '/api/suppliers', { nama: 'Test Supplier Flow', alamat: 'Bandung' }, adminToken);
    assert('Create supplier', supRes.status === 201 && !!supRes.data.id, JSON.stringify(supRes.data));
    const supplierId = supRes.data.id;

    const paySupplierRes = await req('POST', '/api/payments', {
      tanggal: '2026-08-31',
      jenis: 'pengeluaran_supplier',
      supplierId: supplierId,
      jumlahBayar: 750000,
      keterangan: 'Pembelian stok supplier'
    }, adminToken);
    assert('Pengeluaran supplier recorded', paySupplierRes.status === 201 && !!paySupplierRes.data.pembayaranId, JSON.stringify(paySupplierRes.data));
    const supplierInvoiceId = paySupplierRes.data.invoiceId;
    assert('Supplier invoice auto-created', !!supplierInvoiceId, `invoiceId=${supplierInvoiceId}`);

    const allInvoicesAfterSup = await req('GET', '/api/invoices', null, adminToken);
    assert('Supplier invoice in list', Array.isArray(allInvoicesAfterSup.data) && allInvoicesAfterSup.data.some(i => i.id === supplierInvoiceId && i.jenis === 'supplier'), JSON.stringify(allInvoicesAfterSup.data));

    const supplierDetail = await req('GET', `/api/suppliers/${supplierId}`, null, adminToken);
    assert('Supplier totalBayar updated', supplierDetail.status === 200 && supplierDetail.data.totalBayar >= 750000, `totalBayar=${supplierDetail.data?.totalBayar}`);

    // ========================================
    // 4. SALES / BONUS FLOW
    // ========================================
    console.log('\n--- SALES / BONUS FLOW ---');

    const salesRes = await req('POST', '/api/sales', { nama: 'Test Sales Flow', telepon: '081234567890' }, adminToken);
    assert('Create sales', salesRes.status === 201 && !!salesRes.data.id, JSON.stringify(salesRes.data));
    const salesId = salesRes.data.id;

    // Assign sales to order via SQL (no API endpoint for this)
    try {
      const { db } = require('../config/database');
      db.prepare('UPDATE orders SET salesId = ? WHERE id = ?').run(salesId, orderId);
      assert('Assign sales to order', true, 'via SQL');
    } catch (err) {
      assert('Assign sales to order', false, err.message);
    }

    // Verify order has salesId
    const orderDetail2 = await req('GET', `/api/portal/orders/${orderId}`, null, token);
    assert('Order salesId assigned', orderDetail2.status === 200 && orderDetail2.data.salesId === salesId, `salesId=${orderDetail2.data?.salesId}`);

    // Record bonus payment (use totalInsentif from order)
    const bonusAmount = orderDetail2.data.totalInsentif || 0;
    const bonusRes = await req('POST', '/api/payments', {
      tanggal: '2026-08-31',
      jenis: 'pembayaran_bonus',
      salesId: salesId,
      jumlahBayar: bonusAmount,
      keterangan: 'Bonus termin pertama'
    }, adminToken);
    assert('Bonus payment recorded', bonusRes.status === 201 && !!bonusRes.data.pembayaranId, JSON.stringify(bonusRes.data));
    const bonusInvoiceId = bonusRes.data.invoiceId;
    assert('Bonus invoice auto-created', !!bonusInvoiceId, `invoiceId=${bonusInvoiceId}`);

    const allInvoicesAfterBonus = await req('GET', '/api/invoices', null, adminToken);
    assert('Bonus invoice in list', Array.isArray(allInvoicesAfterBonus.data) && allInvoicesAfterBonus.data.some(i => i.id === bonusInvoiceId && i.jenis === 'bonus'), JSON.stringify(allInvoicesAfterBonus.data));

    // ========================================
    // 5. INVOICE PDF DOWNLOAD
    // ========================================
    console.log('\n--- INVOICE PDF DOWNLOAD ---');

    for (const inv of allInvoicesAfterBonus.data) {
      if (inv.id === supplierInvoiceId || inv.id === bonusInvoiceId) {
        const pdfRes = await req('GET', `/api/invoices/${inv.id}/pdf`, null, adminToken);
        assert(`PDF download ${inv.noInvoice}`, pdfRes.status === 200 && Buffer.isBuffer(pdfRes.raw) && pdfRes.raw.length > 0, `status=${pdfRes.status} size=${pdfRes.raw.length}`);
      }
    }

    // ========================================
    // 6. DATA CONSISTENCY
    // ========================================
    console.log('\n--- DATA CONSISTENCY ---');

    const finalInvoices = await req('GET', '/api/invoices', null, adminToken);
    const custInvs = finalInvoices.data.filter(i => i.jenis === 'customer');
    const supInvs = finalInvoices.data.filter(i => i.jenis === 'supplier');
    const bonusInvs = finalInvoices.data.filter(i => i.jenis === 'bonus');
    assert('Invoice types count', custInvs.length > 0 && supInvs.length > 0 && bonusInvs.length > 0,
      `customer=${custInvs.length} supplier=${supInvs.length} bonus=${bonusInvs.length}`);

    const allPayments = await req('GET', '/api/payments', null, adminToken);
    const allOrders = await req('GET', '/api/orders', null, adminToken);
    const createdInvoiceIds = new Set([
      custInvoiceId,
      supplierInvoiceId,
      bonusInvoiceId
    ]);

    const orphanInvoices = finalInvoices.data.filter(inv => {
      if (!createdInvoiceIds.has(inv.id)) return false;
      if (inv.jenis === 'customer') {
        const payment = allPayments.data.find(p => p.id === inv.refId);
        return !payment || !allOrders.data.some(o => o.id === payment.orderId);
      }
      if (inv.jenis === 'supplier' || inv.jenis === 'bonus') return !allPayments.data.some(p => p.id === inv.refId);
      return false;
    });
    assert('No orphan invoices', orphanInvoices.length === 0, `orphans=${orphanInvoices.length}`);

    summary();
  } catch (err) {
    console.error('FATAL:', err);
    process.exit(1);
  }
}

run();
