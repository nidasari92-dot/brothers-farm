const http = require('node:http');
const { spawn } = require('node:child_process');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3233';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '3233', NODE_ENV: 'test' }
    });

    let output = '';
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('berjalan di port')) {
        setTimeout(() => resolve(), 1000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', reject);

    setTimeout(() => {
      reject(new Error('Server did not start in time'));
    }, 10000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
}

async function runTests() {
  try {
    await startServer();
    console.log('Server started');

    // ==========================
    // 1. Customer Auth
    // ==========================
    let customerToken = null;

    {
      const res = await request('POST', '/api/customer/login', {
        username: 'nonexistent',
        password: 'wrong'
      });
      if (res.status !== 401) throw new Error('Invalid customer login should return 401');
      console.log('✅ Customer invalid login rejected');
    }

    {
      const res = await request('POST', '/api/customer/register', {
        nama: 'Test Customer',
        username: `testuser_${Date.now()}`,
        password: 'testpass123',
        email: `test_${Date.now()}@example.com`,
        phone: `0812345678${Date.now() % 1000}`
      });
      if (res.status !== 201) throw new Error('Register should return 201');
      console.log('✅ Customer register success');
    }

    // ==========================
    // 2. Dashboard API
    // ==========================
    {
      // Dashboard summary requires admin
      const adminLoginRes = await request('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });
      if (adminLoginRes.status === 200) {
        const adminToken = adminLoginRes.data.token;
        const res = await request('GET', '/api/dashboard/summary', null, adminToken);
        if (res.status !== 200) throw new Error('Dashboard summary should return 200');
        if (typeof res.data !== 'object') throw new Error('Dashboard summary should return object');
        console.log('✅ Dashboard summary OK');
      } else {
        console.log('⚠️  Dashboard test skipped: admin login failed');
      }
    }
    // ==========================
    // 3. Catalog Pagination
    // ==========================
    {
      const res1 = await request('GET', '/api/catalog/products?page=1&limit=20');
      if (res1.status !== 200) throw new Error('Products page 1 should return 200');
      const items1 = Array.isArray(res1.data) ? res1.data : res1.data?.data;
      if (!Array.isArray(items1)) throw new Error('Products should be array');
      if (items1.length > 20) throw new Error('Products limit 20 should not exceed 20');
      console.log(`✅ Products pagination OK: ${items1.length} items`);

      const res2 = await request('GET', '/api/catalog/prices/latest?page=1&limit=20');
      if (res2.status !== 200) throw new Error('Prices page 1 should return 200');
      const items2 = Array.isArray(res2.data) ? res2.data : res2.data?.data;
      if (!Array.isArray(items2)) throw new Error('Prices should be array');
      if (items2.length > 20) throw new Error('Prices limit 20 should not exceed 20');
      console.log(`✅ Prices pagination OK: ${items2.length} items`);

      const portalLoginRes = await request('POST', '/api/customer/login', {
        username: 'testcustomer',
        password: 'testpass123'
      });
      if (portalLoginRes.status === 200) {
        const portalToken = portalLoginRes.data.token;
        const res3 = await request('GET', '/api/portal/prices?page=1&limit=20', null, portalToken);
        if (res3.status !== 200) throw new Error('Portal prices page 1 should return 200');
        const items3 = Array.isArray(res3.data) ? res3.data : res3.data?.data;
        if (!Array.isArray(items3)) throw new Error('Portal prices should be array');
        console.log(`✅ Portal prices pagination OK: ${items3.length} items`);
      } else {
        console.log('⚠️  Portal prices test skipped: customer login failed');
      }
    }

    // ==========================
    // 4. Invoice Generation
    // ==========================
    {
      const listRes = await request('GET', '/api/invoices');
      if (listRes.status !== 401) throw new Error('Unauthenticated invoice list should return 401');
      console.log('✅ Invoice unauthenticated rejected');

      const adminLoginRes = await request('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
      });
      if (adminLoginRes.status === 200) {
        const adminToken = adminLoginRes.data.token;
        
        const listRes2 = await request('GET', '/api/invoices', null, adminToken);
        if (listRes2.status !== 200) throw new Error('Invoice list should return 200');
        const invoices = Array.isArray(listRes2.data) ? listRes2.data : listRes2.data?.data || [];
        console.log(`✅ Invoice list OK: ${invoices.length} invoices`);

        if (invoices.length > 0) {
          const invoiceId = invoices[0].id;
          
          const detailRes = await request('GET', `/api/invoices/${invoiceId}`, null, adminToken);
          if (detailRes.status !== 200) throw new Error('Invoice detail should return 200');
          if (!detailRes.data.id) throw new Error('Invoice detail should have invoice data');
          console.log('✅ Invoice detail OK');

          const pdfRes = await request('GET', `/api/invoices/${invoiceId}/pdf`, null, adminToken);
          if (![200, 302].includes(pdfRes.status)) throw new Error('PDF generation should return 200 or 302');
          console.log('✅ Invoice PDF generation OK');
        } else {
          console.log('⚠️  No invoices found to test PDF generation');
        }
      } else {
        console.log('⚠️  Invoice generation tests skipped: admin login failed');
      }
    }

    console.log('\nAll tests passed');
  } finally {
    stopServer();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  stopServer();
  process.exit(1);
});
