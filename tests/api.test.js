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

    // Health check
    {
      const res = await request('GET', '/api/health');
      if (res.status !== 200) throw new Error('Health should return 200');
      if (res.data.status !== 'ok') throw new Error('Health status should be ok');
      console.log('✅ Health check passed');
    }

    // Invalid login should fail
    {
      const res = await request('POST', '/api/customer/login', {
        username: 'nonexistent',
        password: 'wrong'
      });
      if (res.status !== 401) throw new Error('Invalid login should return 401');
      console.log('✅ Invalid login rejected');
    }

    // Products endpoint
    {
      const res = await request('GET', '/api/catalog/products');
      if (res.status !== 200) throw new Error('Products should return 200');
      const items = Array.isArray(res.data) ? res.data : res.data?.data;
      if (!Array.isArray(items)) throw new Error('Products should be array');
      console.log('✅ Products endpoint OK');
    }

    // Prices endpoint
    {
      const res = await request('GET', '/api/catalog/prices/latest?limit=1');
      if (res.status !== 200) throw new Error('Prices should return 200');
      console.log('✅ Prices endpoint OK');
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
