// ============ State & helpers ============
let CURRENT_USER = null;

function rupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}
function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function endOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function toast(msg, isError) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (isError ? ' error' : '');
  setTimeout(() => el.classList.add('hidden'), 3000);
  el.classList.remove('hidden');
}
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, s => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[s]));
}
function formatRupiahInput(input) {
  input.addEventListener('input', () => {
    const raw = input.value.replace(/[^0-9]/g, '');
    input.value = raw ? Number(raw).toLocaleString('id-ID') : '';
  });
  input.addEventListener('blur', () => {
    const raw = input.value.replace(/[^0-9]/g, '');
    input.value = raw ? Number(raw).toLocaleString('id-ID') : '';
  });
  input.addEventListener('focus', () => {
    const raw = input.value.replace(/[^0-9]/g, '');
    if (raw) input.value = raw;
  });
}
function parseRupiahInput(input) {
  return Number(input.value.replace(/[^0-9]/g, '') || 0);
}

// ============ Menu definition ============
const MENU_ADMIN = [
  { key: 'dashboard', label: '📊 Dashboard' },
  { key: 'orders', label: '🧾 Order Penjualan' },
  { key: 'payments', label: '💰 Pembayaran' },
  { key: 'invoices', label: '📄 Invoice' },
  { key: 'products', label: '📦 Produk' },
  { key: 'prices', label: '📈 Riwayat Harga' },
  { key: 'catalog', label: '📰 Katalog' },
  { key: 'customers', label: '🧑‍🌾 Customer' },
  { key: 'sales', label: '🧑‍💼 Sales' },
  { key: 'suppliers', label: '🚚 Supplier' },
  { key: 'settings', label: '⚙️ Pengaturan' },
];
const MENU_USER = [
  { key: 'orders', label: '🧾 Order Penjualan' },
  { key: 'products', label: '📦 Produk' },
  { key: 'customers', label: '🧑‍🌾 Customer' },
  { key: 'payments', label: '💰 Pembayaran' },
  { key: 'invoices', label: '📄 Invoice' },
  { key: 'prices', label: '📈 Riwayat Harga' },
  { key: 'sales', label: '🧑‍💼 Sales' },
  { key: 'suppliers', label: '🚚 Supplier' },
];

let currentPage = null;

// ============ Auth ============
async function init() {
  const token = Api.token();
  if (!token) return showLogin();
  try {
    const res = await Api.get('/auth/me');
    CURRENT_USER = res.user;
    showApp();
  } catch (e) {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  buildMenu();
  document.getElementById('user-info').textContent = `${CURRENT_USER.nama || CURRENT_USER.username} (${CURRENT_USER.role})`;
  navigate(CURRENT_USER.role === 'admin' ? 'dashboard' : 'orders');
  initTheme();
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
  const toggle = () => {
    const current = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.onclick = toggle;
  const loginBtn = document.getElementById('login-theme-toggle');
  if (loginBtn) loginBtn.onclick = toggle;
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.body.classList.remove('theme-dark');
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('theme', theme);
}

function buildMenu() {
  const menu = CURRENT_USER.role === 'admin' ? MENU_ADMIN : MENU_USER;
  const nav = document.getElementById('nav-menu');
  nav.innerHTML = '';
  menu.forEach(item => {
    const a = document.createElement('a');
    a.textContent = item.label;
    a.dataset.key = item.key;
    a.onclick = () => navigate(item.key);
    nav.appendChild(a);
  });
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    const res = await Api.post('/auth/login', { username, password });
    Api.setToken(res.token);
    Api.setUser(res.user);
    CURRENT_USER = res.user;
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  Api.clearToken();
  window.location.reload();
});

// ============ Router ============
const PAGE_TITLES = {
  dashboard: 'Dashboard', orders: 'Order Penjualan', payments: 'Pembayaran',
  invoices: 'Invoice', products: 'Produk', prices: 'Riwayat Harga',
  catalog: 'Katalog', customers: 'Customer', sales: 'Sales', suppliers: 'Supplier', settings: 'Pengaturan'
};

function navigate(key) {
  currentPage = key;
  document.querySelectorAll('#nav-menu a').forEach(a => a.classList.toggle('active', a.dataset.key === key));
  document.getElementById('page-title').textContent = PAGE_TITLES[key] || '';
  const renderers = {
    dashboard: renderDashboard, orders: renderOrders, payments: renderPayments,
    invoices: renderInvoices, products: renderProducts, prices: renderPrices,
    catalog: renderCatalog, customers: renderCustomers, sales: renderSales, suppliers: renderSuppliers,
    settings: renderSettings
  };
  const fn = renderers[key];
  if (fn) fn();
}

// ============ Dashboard ============
let dashboardOrderPage = 1;
let dashboardOrderLimit = 20;

async function renderDashboard() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  try {
    const d = await Api.get(`/dashboard/summary?page=${dashboardOrderPage}&limit=${dashboardOrderLimit}`);
    const pagination = d.orderPagination || {};
    el.innerHTML = `
      <div class="grid">
        <div class="card"><div class="label">Total Penjualan</div><div class="value">${rupiah(d.totalPenjualan)}</div></div>
        <div class="card"><div class="label">Total Piutang</div><div class="value">${rupiah(d.totalPiutang)}</div></div>
        <div class="card"><div class="label">Utang ke Supplier</div><div class="value">${rupiah(d.totalUtangSupplier)}</div></div>
        <div class="card"><div class="label">Bonus Sales Belum Dibayar</div><div class="value">${rupiah(d.totalBonusOutstanding)}</div></div>
      </div>
      <div class="grid">
        <div class="card"><div class="label">Customer Aktif</div><div class="value">${d.jumlahCustomer}</div></div>
        <div class="card"><div class="label">Sales Aktif</div><div class="value">${d.jumlahSales}</div></div>
        <div class="card"><div class="label">Supplier Aktif</div><div class="value">${d.jumlahSupplier}</div></div>
        <div class="card"><div class="label">Produk Aktif</div><div class="value">${d.jumlahProduk}</div></div>
      </div>
      <div class="panel">
        <div class="panel-header">
          <h3>Order Terbaru</h3>
          <div style="display:flex;gap:8px;align-items:center;">
            <select id="dash-order-limit" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);">
              <option value="10" ${dashboardOrderLimit==10?'selected':''}>10</option>
              <option value="20" ${dashboardOrderLimit==20?'selected':''}>20</option>
              <option value="50" ${dashboardOrderLimit==50?'selected':''}>50</option>
              <option value="100" ${dashboardOrderLimit==100?'selected':''}>100</option>
            </select>
            <button class="btn small" id="dash-order-prev">◀</button>
            <span id="dash-order-page-info" style="font-size:13px;color:var(--text-muted);">${pagination.page || 1}</span>
            <button class="btn small" id="dash-order-next">▶</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>No Order</th><th>Tanggal</th><th>Customer</th><th class="text-right">Total</th></tr></thead>
            <tbody>
              ${d.orderTerbaru.map(o => `<tr><td>${escapeHtml(o.noOrder)}</td><td>${o.tanggal}</td><td>${escapeHtml(o.customerNama || '-')}</td><td class="text-right">${rupiah(o.total)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const limitEl = document.getElementById('dash-order-limit');
    if (limitEl) {
      limitEl.onchange = async () => {
        dashboardOrderLimit = parseInt(limitEl.value, 10) || 20;
        dashboardOrderPage = 1;
        renderDashboard();
      };
    }
    const prevBtn = document.getElementById('dash-order-prev');
    if (prevBtn) prevBtn.onclick = () => { if (dashboardOrderPage > 1) { dashboardOrderPage--; renderDashboard(); } };
    const nextBtn = document.getElementById('dash-order-next');
    if (nextBtn) nextBtn.onclick = () => { if (pagination.hasNext) { dashboardOrderPage++; renderDashboard(); } };
  } catch (e) {
    el.innerHTML = `<p class="error-text">${escapeHtml(e.message)}</p>`;
  }
}

// ============ Generic CRUD table renderer ============
function crudPanel(title, addLabel, tableHtml) {
  return `
    <div class="panel">
      <div class="panel-header">
        <h3>${title}</h3>
        ${CURRENT_USER.role === 'admin' ? `<button class="btn" id="btn-add">${addLabel}</button>` : ''}
      </div>
      ${tableHtml}
    </div>
  `;
}

function openModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-box">${html}</div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  return overlay;
}
function closeModal() {
  const el = document.getElementById('modal-overlay');
  if (el) el.remove();
}

// ============ Produk ============
let PRODUK_CACHE = [];
let SUPPLIER_CACHE = [];

async function renderProducts() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  const [produk, suppliers] = await Promise.all([Api.get('/products'), Api.get('/suppliers')]);
  PRODUK_CACHE = produk;
  SUPPLIER_CACHE = suppliers;

  const rows = produk.map(p => `
    <tr>
      <td>${escapeHtml(p.kode)}</td>
      <td>${escapeHtml(p.nama)}</td>
      <td>${escapeHtml(p.kategori || '-')}</td>
      <td>${escapeHtml(p.satuan || '-')}</td>
      <td>${escapeHtml(p.supplierNama || '-')}</td>
      <td class="text-right">${rupiah(p.hargaBeliTerakhir)}</td>
      <td class="text-right">${rupiah(p.hargaJualTerakhir)}</td>
      <td><span class="badge ${p.status === 'Aktif' ? 'green' : 'red'}">${p.status}</span></td>
      ${CURRENT_USER.role === 'admin' ? `<td><button class="btn small secondary" onclick="editProduct(${p.id})">Edit</button></td>` : ''}
    </tr>
  `).join('');

  el.innerHTML = crudPanel('Daftar Produk', '+ Tambah Produk', `
    <table>
      <thead><tr><th>Kode</th><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Supplier</th><th class="text-right">Hrg Beli</th><th class="text-right">Hrg Jual</th><th>Status</th>${CURRENT_USER.role === 'admin' ? '<th></th>' : ''}</tr></thead>
      <tbody>${rows || '<tr><td colspan="9" class="text-muted">Belum ada produk.</td></tr>'}</tbody>
    </table>
  `);

  if (CURRENT_USER.role === 'admin') {
    document.getElementById('btn-add').onclick = () => openProductForm();
  }
}

function supplierOptions(selectedId) {
  return SUPPLIER_CACHE.map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${escapeHtml(s.nama)}</option>`).join('');
}

function openProductForm(existing) {
  const isEdit = !!existing;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Tambah'} Produk</h3>
    <form id="product-form">
      <div class="form-row">
        <div class="form-group"><label>Nama Produk</label><input name="nama" required value="${escapeHtml(existing?.nama || '')}"></div>
        <div class="form-group"><label>Kategori</label><input name="kategori" value="${escapeHtml(existing?.kategori || '')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Satuan</label><input name="satuan" placeholder="kg / ekor / karung" value="${escapeHtml(existing?.satuan || '')}"></div>
        <div class="form-group"><label>Supplier</label>
          <select name="supplierId"><option value="">- Pilih -</option>${supplierOptions(existing?.supplierId)}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Harga Beli Terakhir</label><input type="text" class="rupiah-input" name="hargaBeliTerakhir" value="${existing ? Number(existing.hargaBeliTerakhir || 0).toLocaleString('id-ID') : '0'}"></div>
        <div class="form-group"><label>Harga Jual Terakhir</label><input type="text" class="rupiah-input" name="hargaJualTerakhir" value="${existing ? Number(existing.hargaJualTerakhir || 0).toLocaleString('id-ID') : '0'}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Insentif Sales per Unit</label><input type="text" class="rupiah-input" name="insentif" value="${existing ? Number(existing.insentif || 0).toLocaleString('id-ID') : '0'}"></div>
        ${isEdit ? `<div class="form-group"><label>Status</label><select name="status"><option ${existing.status === 'Aktif' ? 'selected' : ''}>Aktif</option><option ${existing.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div>` : ''}
      </div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Simpan</button>
      </div>
    </form>
  `);

  document.querySelectorAll('#product-form .rupiah-input').forEach(formatRupiahInput);
  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    ['hargaBeliTerakhir','hargaJualTerakhir','insentif'].forEach(k => {
      if (body[k]) body[k] = parseRupiahInput(document.querySelector(`#product-form [name="${k}"]`));
    });
    try {
      if (isEdit) await Api.put(`/products/${existing.id}`, body);
      else await Api.post('/products', body);
      closeModal();
      toast('Produk tersimpan.');
      renderProducts();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

async function editProduct(id) {
  const p = PRODUK_CACHE.find(x => x.id === id);
  openProductForm(p);
}

// ============ Customer ============
let CUSTOMER_CACHE = [];
let SALES_CACHE = [];

async function renderCustomers() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  const [customers, sales] = await Promise.all([Api.get('/customers'), Api.get('/sales')]);
  CUSTOMER_CACHE = customers;
  SALES_CACHE = sales;

  const rows = customers.map(c => `
    <tr>
      <td>${escapeHtml(c.kode)}</td>
      <td>${escapeHtml(c.nama)}</td>
      <td>${escapeHtml(c.jenis || '-')}</td>
      <td>${escapeHtml(c.hp || '-')}</td>
      <td>${escapeHtml(c.salesNama || '-')}</td>
      <td><span class="badge ${c.status === 'Aktif' ? 'green' : 'red'}">${c.status}</span></td>
      ${CURRENT_USER.role === 'admin' ? `<td><button class="btn small secondary" onclick="editCustomer(${c.id})">Edit</button></td>` : ''}
    </tr>
  `).join('');

  el.innerHTML = crudPanel('Daftar Customer', '+ Tambah Customer', `
    <table>
      <thead><tr><th>Kode</th><th>Nama</th><th>Jenis</th><th>HP</th><th>Sales</th><th>Status</th>${CURRENT_USER.role === 'admin' ? '<th></th>' : ''}</tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="text-muted">Belum ada customer.</td></tr>'}</tbody>
    </table>
  `);

  if (CURRENT_USER.role === 'admin') document.getElementById('btn-add').onclick = () => openCustomerForm();
}

function salesOptions(selectedId) {
  return SALES_CACHE.map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${escapeHtml(s.nama)}</option>`).join('');
}

function openCustomerForm(existing) {
  const isEdit = !!existing;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Tambah'} Customer</h3>
    <form id="customer-form">
      <div class="form-row">
        <div class="form-group"><label>Nama</label><input name="nama" required value="${escapeHtml(existing?.nama || '')}"></div>
        <div class="form-group"><label>Jenis</label><input name="jenis" placeholder="Peternak / Toko / dll" value="${escapeHtml(existing?.jenis || '')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Alamat</label><input name="alamat" value="${escapeHtml(existing?.alamat || '')}"></div>
        <div class="form-group"><label>HP</label><input name="hp" value="${escapeHtml(existing?.hp || '')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Sales Penanggung Jawab</label><select name="salesId"><option value="">- Pilih -</option>${salesOptions(existing?.salesId)}</select></div>
        <div class="form-group"><label>Saldo Awal</label><input type="text" class="rupiah-input" name="saldoAwal" value="${existing ? Number(existing.saldoAwal || 0).toLocaleString('id-ID') : '0'}"></div>
      </div>
      ${isEdit ? `<div class="form-row"><div class="form-group"><label>Status</label><select name="status"><option ${existing.status === 'Aktif' ? 'selected' : ''}>Aktif</option><option ${existing.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div></div>` : ''}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Simpan</button>
      </div>
    </form>
  `);

  document.querySelectorAll('#customer-form .rupiah-input').forEach(formatRupiahInput);
  document.getElementById('customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    if (body.saldoAwal) body.saldoAwal = parseRupiahInput(document.querySelector('#customer-form [name="saldoAwal"]'));
    try {
      if (isEdit) await Api.put(`/customers/${existing.id}`, body);
      else await Api.post('/customers', body);
      closeModal();
      toast('Customer tersimpan.');
      renderCustomers();
    } catch (err) { toast(err.message, true); }
  });
}

function editCustomer(id) {
  const c = CUSTOMER_CACHE.find(x => x.id === id);
  openCustomerForm(c);
}

// ============ Sales ============
async function renderSales() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  const sales = await Api.get('/sales');
  SALES_CACHE = sales;

  const rows = sales.map(s => `
    <tr>
      <td>${escapeHtml(s.nama)}</td>
      <td>${escapeHtml(s.hp || '-')}</td>
      <td>${escapeHtml(s.rekening || '-')}</td>
      <td><span class="badge ${s.status === 'Aktif' ? 'green' : 'red'}">${s.status}</span></td>
      <td>
        <button class="btn small secondary" onclick="viewSalesDashboard(${s.id})">Dashboard Bonus</button>
        ${CURRENT_USER.role === 'admin' ? `<button class="btn small secondary" onclick="editSales(${s.id})">Edit</button>` : ''}
      </td>
    </tr>
  `).join('');

  el.innerHTML = crudPanel('Daftar Sales', CURRENT_USER.role === 'admin' ? '+ Tambah Sales' : '', `
    <table>
      <thead><tr><th>Nama</th><th>HP</th><th>Rekening</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="text-muted">Belum ada sales.</td></tr>'}</tbody>
    </table>
  `);
  if (CURRENT_USER.role === 'admin') document.getElementById('btn-add').onclick = () => openSalesForm();
}

function openSalesForm(existing) {
  const isEdit = !!existing;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Tambah'} Sales</h3>
    <form id="sales-form">
      <div class="form-group"><label>Nama</label><input name="nama" required value="${escapeHtml(existing?.nama || '')}"></div>
      <div class="form-row">
        <div class="form-group"><label>HP</label><input name="hp" value="${escapeHtml(existing?.hp || '')}"></div>
        <div class="form-group"><label>No Rekening</label><input name="rekening" value="${escapeHtml(existing?.rekening || '')}"></div>
      </div>
      ${isEdit ? `<div class="form-group"><label>Status</label><select name="status"><option ${existing.status === 'Aktif' ? 'selected' : ''}>Aktif</option><option ${existing.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div>` : ''}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Simpan</button>
      </div>
    </form>
  `);
  document.getElementById('sales-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try {
      if (isEdit) await Api.put(`/sales/${existing.id}`, body);
      else await Api.post('/sales', body);
      closeModal(); toast('Data sales tersimpan.'); renderSales();
    } catch (err) { toast(err.message, true); }
  });
}
function editSales(id) { openSalesForm(SALES_CACHE.find(x => x.id === id)); }

async function viewSalesDashboard(id) {
  const d = await Api.get(`/sales/${id}/dashboard`);
  openModal(`
    <h3>Dashboard Bonus - ${escapeHtml(d.sales.nama)}</h3>
    <div class="grid">
      <div class="card"><div class="label">Total Bonus</div><div class="value">${rupiah(d.totalBonus)}</div></div>
      <div class="card"><div class="label">Sudah Dibayar</div><div class="value">${rupiah(d.totalDibayar)}</div></div>
      <div class="card"><div class="label">Sisa Bonus</div><div class="value">${rupiah(d.sisaBonus)}</div></div>
    </div>
    <h4 class="mt-8">Histori Pembayaran Bonus</h4>
    <table>
      <thead><tr><th>No</th><th>Tanggal</th><th class="text-right">Jumlah</th></tr></thead>
      <tbody>${d.historiPembayaran.map(p => `<tr><td>${escapeHtml(p.noPembayaran)}</td><td>${p.tanggal}</td><td class="text-right">${rupiah(p.jumlahBayar)}</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">Belum ada pembayaran.</td></tr>'}</tbody>
    </table>
    <div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Tutup</button></div>
  `);
}

// ============ Supplier ============
async function renderSuppliers() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  const suppliers = await Api.get('/suppliers');
  SUPPLIER_CACHE = suppliers;

  const rows = suppliers.map(s => `
    <tr>
      <td>${escapeHtml(s.nama)}</td>
      <td>${escapeHtml(s.hp || '-')}</td>
      <td class="text-right">${rupiah(s.totalUtang - s.totalBayar)}</td>
      <td><span class="badge ${s.status === 'Aktif' ? 'green' : 'red'}">${s.status}</span></td>
      <td>
        <button class="btn small secondary" onclick="viewSupplierDashboard(${s.id})">Dashboard</button>
        ${CURRENT_USER.role === 'admin' ? `<button class="btn small secondary" onclick="editSupplier(${s.id})">Edit</button>` : ''}
      </td>
    </tr>
  `).join('');

  el.innerHTML = crudPanel('Daftar Supplier', CURRENT_USER.role === 'admin' ? '+ Tambah Supplier' : '', `
    <table>
      <thead><tr><th>Nama</th><th>HP</th><th class="text-right">Sisa Utang</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="text-muted">Belum ada supplier.</td></tr>'}</tbody>
    </table>
  `);
  if (CURRENT_USER.role === 'admin') document.getElementById('btn-add').onclick = () => openSupplierForm();
}

function openSupplierForm(existing) {
  const isEdit = !!existing;
  openModal(`
    <h3>${isEdit ? 'Edit' : 'Tambah'} Supplier</h3>
    <form id="supplier-form">
      <div class="form-group"><label>Nama</label><input name="nama" required value="${escapeHtml(existing?.nama || '')}"></div>
      <div class="form-row">
        <div class="form-group"><label>HP</label><input name="hp" value="${escapeHtml(existing?.hp || '')}"></div>
        <div class="form-group"><label>No Rekening</label><input name="rekening" value="${escapeHtml(existing?.rekening || '')}"></div>
      </div>
      ${isEdit ? `<div class="form-group"><label>Status</label><select name="status"><option ${existing.status === 'Aktif' ? 'selected' : ''}>Aktif</option><option ${existing.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div>` : ''}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Simpan</button>
      </div>
    </form>
  `);
  document.getElementById('supplier-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try {
      if (isEdit) await Api.put(`/suppliers/${existing.id}`, body);
      else await Api.post('/suppliers', body);
      closeModal(); toast('Data supplier tersimpan.'); renderSuppliers();
    } catch (err) { toast(err.message, true); }
  });
}
function editSupplier(id) { openSupplierForm(SUPPLIER_CACHE.find(x => x.id === id)); }

async function viewSupplierDashboard(id) {
  const d = await Api.get(`/suppliers/${id}/dashboard`);
  openModal(`
    <h3>Dashboard - ${escapeHtml(d.supplier.nama)}</h3>
    <div class="grid">
      <div class="card"><div class="label">Total Utang</div><div class="value">${rupiah(d.totalUtang)}</div></div>
      <div class="card"><div class="label">Sudah Dibayar</div><div class="value">${rupiah(d.totalBayar)}</div></div>
      <div class="card"><div class="label">Sisa Utang</div><div class="value">${rupiah(d.sisaUtang)}</div></div>
    </div>
    <h4 class="mt-8">Produk yang Disuplai</h4>
    <table>
      <thead><tr><th>Kode</th><th>Nama</th><th class="text-right">Harga Beli Terakhir</th></tr></thead>
      <tbody>${d.produkDisuplai.map(p => `<tr><td>${escapeHtml(p.kode)}</td><td>${escapeHtml(p.nama)}</td><td class="text-right">${rupiah(p.hargaBeliTerakhir)}</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">Belum ada produk.</td></tr>'}</tbody>
    </table>
    <h4 class="mt-8">Histori Pembayaran</h4>
    <table>
      <thead><tr><th>No</th><th>Tanggal</th><th class="text-right">Jumlah</th></tr></thead>
      <tbody>${d.historiPembayaran.map(p => `<tr><td>${escapeHtml(p.noPembayaran)}</td><td>${p.tanggal}</td><td class="text-right">${rupiah(p.jumlahBayar)}</td></tr>`).join('') || '<tr><td colspan="3" class="text-muted">Belum ada pembayaran.</td></tr>'}</tbody>
    </table>
    <div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Tutup</button></div>
  `);
}

// ============ Orders ============
async function renderOrders() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  const orders = await Api.get('/orders');

  const rows = orders.map(o => `
    <tr>
      <td>${escapeHtml(o.noOrder)}</td>
      <td>${o.tanggal}</td>
      <td>${escapeHtml(o.customerNama || '-')}</td>
      <td>${escapeHtml(o.salesNama || '-')}</td>
      <td class="text-right">${rupiah(o.total)}</td>
      <td><span class="badge ${o.status === 'Lunas' ? 'green' : 'orange'}">${escapeHtml(o.status)}</span></td>
      <td>
        <button class="btn small secondary" onclick="viewOrder(${o.id})">Detail</button>
        ${CURRENT_USER.role === 'admin' ? `<button class="btn small secondary" onclick="openAssignSalesForm(${o.id})">Assign Sales</button>` : ''}
      </td>
    </tr>
  `).join('');

  el.innerHTML = crudPanel('Daftar Order', '+ Buat Order', `
    <table>
      <thead><tr><th>No Order</th><th>Tanggal</th><th>Customer</th><th>Sales</th><th class="text-right">Total</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="text-muted">Belum ada order.</td></tr>'}</tbody>
    </table>
  `);
  document.getElementById('btn-add').onclick = () => openOrderForm();
}

async function openOrderForm() {
  const [customers, sales, produk] = await Promise.all([Api.get('/customers'), Api.get('/sales'), Api.get('/products')]);
  CUSTOMER_CACHE = customers; SALES_CACHE = sales; PRODUK_CACHE = produk;

  openModal(`
    <h3>Buat Order Penjualan</h3>
    <form id="order-form">
      <div class="form-row">
        <div class="form-group"><label>Tanggal</label><input type="date" name="tanggal" value="${todayStr()}" required></div>
        <div class="form-group"><label>Metode Bayar</label>
          <select name="metodeBayar"><option value="Tempo">Tempo</option><option value="Tunai">Tunai</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Customer</label>
          <select name="customerId" required><option value="">- Pilih -</option>${customers.map(c => `<option value="${c.id}">${escapeHtml(c.nama)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Sales</label>
          <select name="salesId" required><option value="">- Pilih -</option>${sales.map(s => `<option value="${s.id}">${escapeHtml(s.nama)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label>Jatuh Tempo</label><input type="date" name="jatuhTempo"></div>

      <label>Item Produk</label>
      <div class="items-editor" id="items-editor"></div>
      <button type="button" class="btn secondary small" id="add-item-row">+ Tambah Item</button>

      <div class="form-group mt-8"><label>Keterangan</label><textarea name="keterangan" rows="2"></textarea></div>

      <p class="text-right mt-8"><strong>Total: <span id="order-total">Rp 0</span></strong></p>

      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Simpan Order</button>
      </div>
    </form>
  `);

  const editor = document.getElementById('items-editor');
  function addItemRow() {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <select class="produk-select">${PRODUK_CACHE.map(p => `<option value="${p.id}" data-harga="${p.hargaJualTerakhir}">${escapeHtml(p.nama)} (${rupiah(p.hargaJualTerakhir)})</option>`).join('')}</select>
      <input type="text" class="qty-input rupiah-input" placeholder="Qty" min="0.01" step="0.01" value="1">
      <input type="text" class="harga-input rupiah-input" placeholder="Harga Jual">
      <button type="button" class="remove-item">✕</button>
    `;
    editor.appendChild(row);
    row.querySelectorAll('.rupiah-input').forEach(formatRupiahInput);
    const select = row.querySelector('.produk-select');
    const hargaInput = row.querySelector('.harga-input');
    function syncHarga() { hargaInput.value = select.selectedOptions[0]?.dataset.harga || 0; formatRupiahInput(hargaInput); }
    syncHarga();
    select.addEventListener('change', () => { syncHarga(); updateTotal(); });
    row.querySelector('.qty-input').addEventListener('input', updateTotal);
    hargaInput.addEventListener('input', updateTotal);
    row.querySelector('.remove-item').addEventListener('click', () => { row.remove(); updateTotal(); });
    updateTotal();
  }
  function updateTotal() {
    let total = 0;
    editor.querySelectorAll('.item-row').forEach(row => {
      const qty = parseRupiahInput(row.querySelector('.qty-input'));
      const harga = parseRupiahInput(row.querySelector('.harga-input'));
      total += qty * harga;
    });
    document.getElementById('order-total').textContent = rupiah(total);
  }
  document.getElementById('add-item-row').addEventListener('click', addItemRow);
  addItemRow();

  document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const items = [];
    editor.querySelectorAll('.item-row').forEach(row => {
      const produkId = Number(row.querySelector('.produk-select').value);
      const qty = parseRupiahInput(row.querySelector('.qty-input'));
      const hargaJual = parseRupiahInput(row.querySelector('.harga-input'));
      if (produkId && qty > 0) items.push({ produkId, qty, hargaJual });
    });
    if (items.length === 0) return toast('Tambahkan minimal 1 item produk.', true);
    body.items = items;
    try {
      await Api.post('/orders', body);
      closeModal();
      toast('Order berhasil dibuat.');
      renderOrders();
    } catch (err) { toast(err.message, true); }
  });
}

async function viewOrder(id) {
  const o = await Api.get(`/orders/${id}`);
  const page = document.getElementById('page-content');
  page.innerHTML = '<p class="text-muted">Memuat...</p>';

  const paymentsRows = (o.payments || []).map(p => `
    <tr>
      <td>${escapeHtml(p.noPembayaran)}</td>
      <td>${p.tanggal}</td>
      <td>${escapeHtml(p.metodeBayar || '-')}</td>
      <td>${escapeHtml(p.status || '-')}</td>
      <td class="text-right">${rupiah(p.jumlahBayar)}</td>
      <td>${escapeHtml(p.keterangan || '-')}</td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="text-muted">Belum ada pembayaran.</td></tr>';

  const invoicesRows = (o.invoices || []).map(inv => `
    <tr>
      <td>${escapeHtml(inv.noInvoice)}</td>
      <td>${inv.tanggal}</td>
      <td class="text-right">${rupiah(inv.total)}</td>
      <td>${escapeHtml(inv.caption || '-')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="text-muted">Belum ada invoice.</td></tr>';

  page.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h3>Order ${escapeHtml(o.noOrder)}</h3>
        <button class="btn small secondary" onclick="renderOrders()">← Kembali</button>
      </div>
      <div class="form-row mt-8">
        <div class="form-group"><label>Tanggal</label><div>${o.tanggal}</div></div>
        <div class="form-group"><label>Customer</label><div>${escapeHtml(o.customerNama || '-')}</div></div>
        <div class="form-group"><label>Sales</label><div>${escapeHtml(o.salesNama || '-')}</div></div>
        <div class="form-group"><label>Metode Bayar</label><div>${escapeHtml(o.metodeBayar || '-')}</div></div>
        <div class="form-group"><label>Jatuh Tempo</label><div>${o.jatuhTempo || '-'}</div></div>
        <div class="form-group"><label>Status</label><div><strong>${o.status || '-'}</strong></div></div>
        <div class="form-group"><label>Total Order</label><div><strong>${rupiah(o.total)}</strong></div></div>
        <div class="form-group"><label>Total Bayar</label><div><strong>${rupiah(o.totalBayar)}</strong></div></div>
        <div class="form-group"><label>Sisa</label><div><strong style="color:${o.sisa > 0 ? 'red' : 'green'}">${rupiah(o.sisa)}</strong></div></div>
      </div>
      <div class="mt-8">
        <h4>Item Order</h4>
        <table>
          <thead><tr><th>Produk</th><th>Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th></tr></thead>
          <tbody>${o.items.map(i => `<tr><td>${escapeHtml(i.produkNama)}</td><td>${i.qty} ${escapeHtml(i.satuan || '')}</td><td class="text-right">${rupiah(i.hargaJual)}</td><td class="text-right">${rupiah(i.subtotal)}</td></tr>`).join('')}</tbody>
        </table>
        <p class="text-right mt-8"><strong>Total: ${rupiah(o.total)}</strong></p>
      </div>
      <div class="mt-8">
        <h4>Pembayaran</h4>
        <table>
          <thead><tr><th>No Pembayaran</th><th>Tanggal</th><th>Metode</th><th>Status</th><th class="text-right">Jumlah</th><th>Keterangan</th></tr></thead>
          <tbody>${paymentsRows}</tbody>
        </table>
      </div>
      <div class="mt-8">
        <h4>Invoice</h4>
        <table>
          <thead><tr><th>No Invoice</th><th>Tanggal</th><th class="text-right">Total</th><th>Keterangan</th></tr></thead>
          <tbody>${invoicesRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

async function openAssignSalesForm(orderId) {
  const salesList = await Api.get('/sales');
  openModal(`
    <h3>Assign Sales ke Order</h3>
    <form id="assign-sales-form">
      <div class="form-group">
        <label>Sales</label>
        <select name="salesId" required>
          <option value="">- Pilih -</option>${salesList.map(s => `<option value="${s.id}">${escapeHtml(s.nama)}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Simpan</button>
      </div>
    </form>
  `);
  document.getElementById('assign-sales-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    try {
      await Api.put(`/orders/${orderId}/sales`, body);
      closeModal();
      toast('Sales berhasil diassign.');
      renderOrders();
    } catch (err) { toast(err.message, true); }
  });
}

// ============ Payments ============
async function renderPayments() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  const payments = await Api.get('/payments');

  const jenisLabel = { penerimaan_customer: 'Penerimaan Customer', pengeluaran_supplier: 'Pengeluaran Supplier', pembayaran_bonus: 'Bonus Sales' };
  const rows = payments.map(p => `
    <tr>
      <td>${escapeHtml(p.noPembayaran)}</td>
      <td>${p.tanggal}</td>
      <td>${jenisLabel[p.jenis] || p.jenis}</td>
      <td>${escapeHtml(p.customerNama || p.supplierNama || p.salesNama || '-')}</td>
      <td class="text-right">${rupiah(p.jumlahBayar)}</td>
    </tr>
  `).join('');

  el.innerHTML = crudPanel('Daftar Pembayaran', CURRENT_USER.role === 'admin' ? '+ Catat Pembayaran' : '', `
    <table>
      <thead><tr><th>No</th><th>Tanggal</th><th>Jenis</th><th>Pihak</th><th class="text-right">Jumlah</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="text-muted">Belum ada pembayaran.</td></tr>'}</tbody>
    </table>
  `);
  if (CURRENT_USER.role === 'admin') document.getElementById('btn-add').onclick = () => openPaymentForm();
}

async function openPaymentForm() {
  const [customers, suppliers, sales, orders] = await Promise.all([Api.get('/customers'), Api.get('/suppliers'), Api.get('/sales'), Api.get('/orders')]);
  const unpaidOrders = orders.filter(o => o.status !== 'Lunas');
  openModal(`
    <h3>Catat Pembayaran</h3>
    <form id="payment-form">
      <div class="form-group">
        <label>Jenis Pembayaran</label>
        <select name="jenis" id="jenis-select" required>
          <option value="penerimaan_customer">Penerimaan dari Customer</option>
          <option value="pengeluaran_supplier">Pengeluaran ke Supplier</option>
          <option value="pembayaran_bonus">Pembayaran Bonus Sales</option>
        </select>
      </div>
      <div class="form-group" id="pihak-container">
        <label>Customer</label>
        <select name="customerId"><option value="">- Pilih -</option>${customers.map(c => `<option value="${c.id}">${escapeHtml(c.nama)}</option>`).join('')}</select>
      </div>
      <div class="form-group" id="order-container" style="display:none">
        <label>Order</label>
        <select name="orderId" id="order-select"><option value="">- Pilih -</option>${unpaidOrders.map(o => `<option value="${o.id}" data-total="${o.total}">${escapeHtml(o.noOrder)} - ${escapeHtml(o.customerNama || '-')} (${rupiah(o.total)})</option>`).join('')}</select>
        <div id="order-info" class="text-muted" style="font-size:12px;margin-top:4px;"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Metode Bayar</label>
          <select name="metodeBayar" id="metode-bayar-select">
            <option value="Tunai">Tunai</option>
            <option value="Transfer">Transfer</option>
            <option value="Tempo">Tempo</option>
          </select>
        </div>
        <div class="form-group"><label>Status</label>
          <select name="status" id="status-select">
            <option value="Lunas">Lunas</option>
            <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tanggal</label><input type="date" name="tanggal" value="${todayStr()}" required></div>
        <div class="form-group"><label>Jumlah</label><input type="text" class="rupiah-input" name="jumlahBayar" required min="1"></div>
      </div>
      <div class="form-group"><label>Keterangan</label><textarea name="keterangan" rows="2"></textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Simpan</button>
      </div>
    </form>
  `);

  const jenisSelect = document.getElementById('jenis-select');
  const pihakContainer = document.getElementById('pihak-container');
  const orderContainer = document.getElementById('order-container');
  function renderPihak() {
    if (jenisSelect.value === 'penerimaan_customer') {
      pihakContainer.innerHTML = `<label>Customer</label><select name="customerId" required><option value="">- Pilih -</option>${customers.map(c => `<option value="${c.id}">${escapeHtml(c.nama)}</option>`).join('')}</select>`;
      orderContainer.style.display = '';
    } else if (jenisSelect.value === 'pengeluaran_supplier') {
      pihakContainer.innerHTML = `<label>Supplier</label><select name="supplierId" required><option value="">- Pilih -</option>${suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.nama)}</option>`).join('')}</select>`;
      orderContainer.style.display = 'none';
    } else {
      pihakContainer.innerHTML = `<label>Sales</label><select name="salesId" required><option value="">- Pilih -</option>${sales.map(s => `<option value="${s.id}">${escapeHtml(s.nama)}</option>`).join('')}</select>`;
      orderContainer.style.display = 'none';
    }
  }
  jenisSelect.addEventListener('change', () => {
    renderPihak();
    const metodeBayar = document.querySelector('#payment-form [name="metodeBayar"]');
    const statusSelect = document.querySelector('#payment-form [name="status"]');
    if (metodeBayar && statusSelect) {
      if (jenisSelect.value === 'penerimaan_customer') {
        metodeBayar.disabled = false;
        statusSelect.disabled = false;
      } else {
        metodeBayar.value = 'Tunai';
        statusSelect.value = 'Lunas';
        metodeBayar.disabled = true;
        statusSelect.disabled = true;
      }
    }
  });
  jenisSelect.addEventListener('change', renderPihak);
  renderPihak();
  const jumlahInput = document.querySelector('#payment-form [name="jumlahBayar"]');
  if (jumlahInput) formatRupiahInput(jumlahInput);

  const orderSelect = document.getElementById('order-select');
  const orderInfo = document.getElementById('order-info');
  if (orderSelect) {
    orderSelect.addEventListener('change', async () => {
      const orderId = orderSelect.value;
      if (!orderId) {
        orderInfo.textContent = '';
        return;
      }
      const opt = orderSelect.options[orderSelect.selectedIndex];
      const total = parseFloat(opt.dataset.total || '0');
      try {
        const payments = await Api.get('/payments');
        const orderPayments = (payments || []).filter(p => String(p.orderId) === String(orderId) && p.jenis === 'penerimaan_customer');
        const totalBayar = orderPayments.reduce((sum, p) => sum + (parseFloat(p.jumlahBayar) || 0), 0);
        const sisa = total - totalBayar;
        orderInfo.innerHTML = `Total order: <strong>${rupiah(total)}</strong> | Sudah dibayar: <strong>${rupiah(totalBayar)}</strong> | <strong>Sisa: ${rupiah(Math.max(0, sisa))}</strong>`;
      } catch {
        orderInfo.innerHTML = `Total order: <strong>${rupiah(total)}</strong>`;
      }
    });
  }

  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    body.jumlahBayar = parseRupiahInput(document.querySelector('#payment-form [name="jumlahBayar"]'));

    // Validasi jumlah pembayaran vs total order
    if (body.orderId && body.jenis === 'penerimaan_customer') {
      const opt = orderSelect.options[orderSelect.selectedIndex];
      if (opt && opt.dataset.total) {
        const total = parseFloat(opt.dataset.total);
        if (body.jumlahBayar > total + 0.0001) {
          toast(`Jumlah pembayaran (${rupiah(body.jumlahBayar)}) melebihi total order (${rupiah(total)}).`, true);
          return;
        }
      }
    }

    try {
      await Api.post('/payments', body);
      closeModal();
      toast('Pembayaran tersimpan.');
      renderPayments();
    } catch (err) { toast(err.message, true); }
  });
}

// ============ Invoices ============
async function renderInvoices() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  const invoices = await Api.get('/invoices');

  const jenisLabel = { customer: 'Customer', supplier: 'Supplier', bonus: 'Bonus Sales' };
  const rows = invoices.map(i => `
    <tr>
      <td>${escapeHtml(i.noInvoice)}</td>
      <td>${i.tanggal}</td>
      <td>${jenisLabel[i.jenis] || i.jenis}</td>
      <td class="text-right">${rupiah(i.total)}</td>
      <td>
        <button class="btn small secondary" onclick="previewInvoice(${i.id})">👁 Preview</button>
        <button class="btn small secondary" onclick="downloadInvoice(${i.id}, '${escapeHtml(i.noInvoice)}')">Unduh PDF</button>
        <button class="btn small secondary" onclick="printInvoice(${i.id}, '${escapeHtml(i.noInvoice)}')">🖨 Print</button>
        <button class="btn small secondary" onclick="downloadExcel(${i.id}, '${escapeHtml(i.noInvoice)}')">📊 Excel</button>
        ${CURRENT_USER.role === 'admin' ? `<button class="btn small secondary" onclick="editInvoice(${i.id})">Edit Kop</button>` : ''}
      </td>
    </tr>
  `).join('');

  el.innerHTML = `
    <div class="panel">
      <div class="panel-header"><h3>Daftar Invoice</h3></div>
      <p class="text-muted mb-0">Invoice bonus dibuat otomatis saat pembayaran bonus sales dicatat. Invoice customer/supplier dapat dibuat manual dari halaman Order/Pembayaran terkait.</p>
      <table class="mt-8">
        <thead><tr><th>No Invoice</th><th>Tanggal</th><th>Jenis</th><th class="text-right">Total</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="text-muted">Belum ada invoice.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}

async function downloadInvoice(id, noInvoice) {
  try {
    const blob = await Api.get(`/invoices/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${noInvoice}.pdf`; a.click();
    URL.revokeObjectURL(url);
  } catch (err) { toast(err.message, true); }
}
async function printInvoice(id, noInvoice) {
  try {
    const blob = await Api.get(`/invoices/${id}/pdf`);
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) return toast('Gagal membuka jendela print. Izinkan pop-up untuk situs ini.', true);
    win.addEventListener('load', () => {
      try { win.print(); } catch (e) { toast('Print error: ' + e.message, true); }
    });
  } catch (err) { toast(err.message, true); }
}
async function downloadExcel(id, noInvoice) {
  try {
    const blob = await Api.get(`/invoices/${id}/excel`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${noInvoice}.xlsx`; a.click();
    URL.revokeObjectURL(url);
    toast('Excel diunduh.');
  } catch (err) { toast(err.message, true); }
}
async function previewInvoice(id) {
  try {
    const data = await Api.get(`/invoices/${id}/preview`);
    const { invoice, items, pihakNama, map } = data;
    const tbody = items.map((it, idx) => `
      <tr>
        <td class="td-produk">${escapeHtml(it.produkNama || '')}</td>
        <td class="td-center">${it.qty || 0}</td>
        <td class="td-right">${rupiah(it.hargaJual || 0)}</td>
        <td class="td-right">${rupiah(it.subtotal || 0)}</td>
      </tr>
    `).join('');
    openModal(`
      <h3>Preview Invoice</h3>
      <div class="invoice-preview">
        <div class="inv-kop">
          <div><strong>${escapeHtml(map.nama_perusahaan || 'CV Brothers Farm')}</strong></div>
          <div class="inv-muted">${escapeHtml(map.alamat || '')}</div>
          <div class="inv-muted">Telp: ${escapeHtml(map.telepon || '')}${map.email ? ' | Email: ' + escapeHtml(map.email) : ''}</div>
          <div class="inv-muted">NPWP: ${escapeHtml(map.npwp || '')}</div>
          <div class="inv-muted">${escapeHtml(map.website || '')}</div>
          <div class="inv-muted">${escapeHtml(map.bank || '')}: ${escapeHtml(map.no_rekening || '')}</div>
          ${map.caption ? `<div class="inv-muted">${escapeHtml(invoice.caption)}</div>` : ''}
        </div>
        <div class="inv-info">
          <div><strong>INVOICE - ${escapeHtml((invoice.jenis || '').toUpperCase())}</strong></div>
          <div>No: ${escapeHtml(invoice.noInvoice)}</div>
          <div>Tanggal: ${invoice.tanggal}</div>
        </div>
        <div class="inv-to">Kepada: ${escapeHtml(pihakNama)}</div>
        <div class="table-wrap">
          <table class="inv-table">
            <thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
            <tbody>${tbody || '<tr><td colspan="4" class="text-muted">Tidak ada item.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="inv-total">Total: ${rupiah(invoice.total || 0)}</div>
        <div class="inv-footer">Dokumen ini dibuat otomatis oleh sistem CV Brothers Farm.</div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Tutup</button>
        <button type="button" class="btn" onclick="printPreview('${escapeHtml(invoice.noInvoice)}')">🖨 Print</button>
      </div>
    `, true);
  } catch (err) { toast(err.message, true); }
}
function printPreview(noInvoice) {
  const win = window.open('', '_blank');
  if (!win) return toast('Gagal membuka jendela print. Izinkan pop-up untuk situs ini.', true);
  const content = document.querySelector('.invoice-preview');
  if (!content) return toast('Data preview tidak ditemukan.', true);
  win.document.open();
  win.document.write(`<!DOCTYPE html><html><head><title>Print ${escapeHtml(noInvoice)}</title>
    <style>
      body { font-family: 'Helvetica', Arial, sans-serif; color: #000; margin: 0; padding: 24px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #222; padding: 6px 8px; font-size: 13px; vertical-align: top; }
      th { background: #f5f5f5; font-weight: bold; }
      .td-produk { width: 50%; word-wrap: break-word; white-space: normal; }
      .td-center { text-align: center; width: 15%; }
      .td-right { text-align: right; width: 17.5%; }
      .inv-kop { margin-bottom: 8px; }
      .inv-info { text-align: right; margin-bottom: 8px; }
      .inv-to { margin-bottom: 8px; }
      .inv-total { text-align: right; font-weight: bold; margin-top: 10px; }
      .inv-footer { text-align: center; font-size: 10px; color: #777; margin-top: 14px; }
    </style>
  </head><body>` + content.innerHTML + `</body></html>`);
  win.document.close();
  win.addEventListener('load', () => { try { win.print(); } catch (e) { toast('Print error: ' + e.message, true); } });
}

async function editInvoice(id) {
  const inv = await Api.get(`/invoices/${id}`);
  openModal(`
    <h3>Edit Kop Invoice</h3>
    <form id="invoice-form">
      <div class="form-group"><label>Caption / Sub-judul</label><textarea name="caption" rows="2">${escapeHtml(inv.caption || '')}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Simpan</button>
      </div>
    </form>
  `);
  document.getElementById('invoice-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try {
      await Api.put(`/invoices/${id}`, body);
      closeModal(); toast('Invoice diperbarui.'); renderInvoices();
    } catch (err) { toast(err.message, true); }
  });
}

// ============ Prices ============
async function renderPrices() {
  const el = document.getElementById('page-content');
  try {
    el.innerHTML = '<p class="text-muted">Memuat...</p>';
    const [prices] = await Promise.all([Api.get('/prices')]);
    PRODUK_CACHE = await Api.get('/products');
    const start = startOfWeek();
    const end = endOfWeek();
    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>📅 Riwayat Harga</h3>
          <div>
            <input type="date" id="price-start" value="${start}" style="margin-right:6px">
            <input type="date" id="price-end" value="${end}" style="margin-right:6px">
            <button class="btn secondary" onclick="renderPriceRange()">Tampilkan</button>
            <button class="btn secondary" onclick="renderPriceCompare()">Bandingkan</button>
            <button class="btn secondary" onclick="renderPriceHistory()">Hari ini</button>
            ${CURRENT_USER.role === 'admin' ? `<button class="btn" id="btn-add-price">+ Input Manual</button>
            <button class="btn secondary" id="btn-upload-excel">📤 Excel</button>
            <button class="btn secondary" id="btn-upload-ocr">📸 OCR</button>` : ''}
          </div>
        </div>
        <div id="price-toolbar" class="mt-8 hidden">
          <button class="btn secondary" onclick="exportPriceCSV()">⬇ Export CSV</button>
        </div>
        <div id="price-content" class="mt-8"></div>
      </div>
    `;
    bindAdminPriceButtons();
    renderPricesContent(prices, start, end);
  } catch (err) {
    toast(err.message, true);
  }
}
async function renderPriceRange() {
  try {
    const start = document.getElementById('price-start').value;
    const end = document.getElementById('price-end').value;
    if (!start || !end) return toast('Pilih rentang tanggal.', true);
    const data = await Api.get(`/price-history/range?start=${start}&end=${end}`);
    renderPricesContent(data.items, start, end);
  } catch (err) { toast(err.message, true); }
}
async function renderPriceHistory() {
  try {
    const today = todayStr();
    const data = await Api.get(`/price-history/by-date?tanggal=${today}`);
    renderPricesContent(data.items, today, today);
  } catch (err) { toast(err.message, true); }
}
async function renderPriceCompare() {
  try {
    const start = document.getElementById('price-start').value;
    const end = document.getElementById('price-end').value;
    if (!start || !end) return toast('Pilih rentang tanggal.', true);
    const data = await Api.post('/price-history/compare', { start, end });
    const el = document.getElementById('price-content');
    const toolbar = document.getElementById('price-toolbar');
    if (!el) return;
    const rows = (data.items || []).map(item => {
      const selisih = Number(item.selisih || 0);
      const cls = selisih > 0 ? 'green' : selisih < 0 ? 'red' : 'muted';
      const label = selisih > 0 ? `+${selisih}` : `${selisih}`;
      return `<tr>
        <td>${escapeHtml(item.nama)}</td>
        <td class="text-right">${rupiah(item.hargaAwal)}</td>
        <td class="text-right">${rupiah(item.hargaAkhir)}</td>
        <td class="text-right"><span class="badge ${cls}">${label}</span></td>
      </tr>`;
    }).join('');
    toolbar.classList.remove('hidden');
    el.innerHTML = `<table><thead><tr><th>Produk</th><th class="text-right">${start}</th><th class="text-right">${end}</th><th class="text-right">Selisih</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="text-muted">Tidak ada data.</td></tr>'}</tbody></table>`;
  } catch (err) { toast(err.message, true); }
}
function renderPricesContent(prices, start, end) {
  const el = document.getElementById('page-content');
  const content = document.getElementById('price-content');
  const toolbar = document.getElementById('price-toolbar');
  if (!content || !toolbar) return;
  const rows = prices.map(h => `
    <tr>
      <td>${h.tanggal}</td>
      <td>${escapeHtml(h.nama || h.produkNama || '')}</td>
      <td class="text-right">${rupiah(h.hargaBeli)}</td>
      <td class="text-right">${rupiah(h.hargaJual)}</td>
      <td><span class="badge green">${h.sumber === 'excel_upload' ? 'Excel' : h.sumber === 'ocr' ? 'OCR' : h.sumber === 'import' ? 'Import' : 'Manual'}</span></td>
    </tr>
  `).join('');
  toolbar.classList.remove('hidden');
  content.innerHTML = `<table><thead><tr><th>Tanggal</th><th>Produk</th><th class="text-right">Harga Beli</th><th class="text-right">Harga Jual</th><th>Sumber</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="text-muted">Belum ada data harga.</td></tr>'}</tbody></table>`;
}
function bindAdminPriceButtons() {
  if (CURRENT_USER.role !== 'admin') return;
  const addBtn = document.getElementById('btn-add-price');
  const excelBtn = document.getElementById('btn-upload-excel');
  const ocrBtn = document.getElementById('btn-upload-ocr');
  if (addBtn) addBtn.onclick = openPriceForm;
  if (excelBtn) excelBtn.onclick = openExcelUploadForm;
  if (ocrBtn) ocrBtn.onclick = openOcrUploadForm;
}
async function exportPriceCSV() {
  const table = document.querySelector('#price-content table');
  if (!table) return;
  let csv = '';
  table.querySelectorAll('tr').forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('th, td')).map(td => `"${td.innerText.replace(/"/g, '""')}"`);
    csv += cells.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'riwayat-harga.csv';
  a.click();
  URL.revokeObjectURL(url);
}


function openPriceForm() {
  openModal(`
    <h3>Input Harga Manual</h3>
    <form id="price-form">
      <div class="form-group"><label>Tanggal</label><input type="date" name="tanggal" value="${todayStr()}" required></div>
      <div class="form-group"><label>Produk</label>
        <select name="produkId" required><option value="">- Pilih -</option>${PRODUK_CACHE.map(p => `<option value="${p.id}">${escapeHtml(p.nama)}</option>`).join('')}</select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Harga Beli</label><input type="text" class="rupiah-input" name="hargaBeli" value="0"></div>
        <div class="form-group"><label>Harga Jual</label><input type="text" class="rupiah-input" name="hargaJual" value="0"></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Simpan</button>
      </div>
    </form>
  `);
  document.querySelectorAll('#price-form .rupiah-input').forEach(formatRupiahInput);
  document.getElementById('price-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    ['hargaBeli','hargaJual'].forEach(k => {
      if (body[k]) body[k] = parseRupiahInput(document.querySelector(`#price-form [name="${k}"]`));
    });
    try {
      await Api.post('/prices', body);
      closeModal(); toast('Harga tersimpan.'); renderPrices();
    } catch (err) { toast(err.message, true); }
  });
}

function openExcelUploadForm() {
  openModal(`
    <h3>Upload Harga via Excel</h3>
    <p class="text-muted">Format kolom: <strong>kode_produk | harga_beli | harga_jual</strong> (baris 1 = header).</p>
    <form id="excel-form">
      <div class="form-group"><label>Tanggal Berlaku</label><input type="date" name="tanggal" value="${todayStr()}" required></div>
      <div class="form-group"><label>File Excel</label><input type="file" name="file" accept=".xlsx,.xls" required></div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Upload</button>
      </div>
    </form>
  `);
  document.getElementById('excel-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await Api.post('/prices/upload', fd, true);
      closeModal();
      toast(`Berhasil: ${res.berhasil} baris. Gagal: ${res.gagal.length} baris.`);
      renderPrices();
    } catch (err) { toast(err.message, true); }
  });
}

let currentOcrItems = [];

function openOcrUploadForm() {
  currentOcrItems = [];
  openModal(`
  <h3>📸 Upload Gambar Daftar Harga</h3>
  <form id="ocr-form">
    <div class="form-group">
      <label>Pilih Gambar</label>
      <input type="file" name="image" accept="image/*" required>
      <p class="text-muted mt-4">Setelah memilih, klik <strong>Extract & Preview</strong> untuk memproses OCR.</p>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
      <button type="submit" class="btn">🔍 Extract & Preview</button>
    </div>
  </form>
  <div id="ocr-loading" class="hidden mt-8"><p class="text-muted">Sedang memproses gambar...</p></div>
  <div id="ocr-preview" class="hidden mt-8"></div>
  `);

  document.getElementById('ocr-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const loading = document.getElementById('ocr-loading');
  const preview = document.getElementById('ocr-preview');
    
  loading.classList.remove('hidden');
  preview.classList.add('hidden');
    
  try {
    const res = await Api.post('/ocr', fd, true);
    loading.classList.add('hidden');
      
    if (res.error) {
      toast(res.error, true);
      return;
    }
      
    currentOcrItems = res.parsedItems;
      
    preview.innerHTML = `
      <div class="panel mt-8">
        <div class="panel-header"><h4>Preview Hasil OCR (${res.totalItems} item)</h4></div>
        <p class="text-muted">✅ ${res.matchedCount} cocok database | ➕ ${res.newCount} produk baru</p>
        <table class="mt-8">
          <thead><tr><th>No</th><th>Nama Item</th><th class="text-right">Harga</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${res.parsedItems.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><input type="text" class="ocr-item-name" data-index="${i}" value="${escapeHtml(item.nama)}" style="width:100%"></td>
                <td class="text-right"><input type="number" class="ocr-item-price" data-index="${i}" value="${item.hargaJualTerakhir}" style="width:120px;text-align:right"></td>
                <td><span class="badge ${item.produkId ? 'green' : 'orange'}">${item.produkId ? 'Update' : 'Baru'}</span></td>
                <td><button class="btn secondary" onclick="removeOcrItem(${i})">Hapus</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="modal-actions mt-8">
          <button class="btn secondary" onclick="closeModal()">Batal</button>
          <button class="btn" onclick="confirmOcrUpdate()">✅ Update Database</button>
        </div>
      </div>
    `;
    preview.classList.remove('hidden');
  } catch (err) {
    loading.classList.add('hidden');
    toast(err.message, true);
  }
  });
  }

  function removeOcrItem(index) {
  currentOcrItems.splice(index, 1);
  // Re-render preview
  const preview = document.getElementById('ocr-preview');
  if (!preview) return;
  
  preview.innerHTML = `
  <div class="panel mt-8">
    <div class="panel-header"><h4>Preview Hasil OCR (${currentOcrItems.length} item)</h4></div>
    <table class="mt-8">
      <thead><tr><th>No</th><th>Nama Item</th><th class="text-right">Harga</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${currentOcrItems.map((item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td><input type="text" class="ocr-item-name" data-index="${i}" value="${escapeHtml(item.nama)}" style="width:100%"></td>
            <td class="text-right"><input type="number" class="ocr-item-price" data-index="${i}" value="${item.hargaJualTerakhir}" style="width:120px;text-align:right"></td>
            <td><span class="badge ${item.produkId ? 'green' : 'orange'}">${item.produkId ? 'Update' : 'Baru'}</span></td>
            <td><button class="btn secondary" onclick="removeOcrItem(${i})">Hapus</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="modal-actions mt-8">
      <button class="btn secondary" onclick="closeModal()">Batal</button>
      <button class="btn" onclick="confirmOcrUpdate()">✅ Update Database</button>
    </div>
  </div>
  `;
  }

  async function confirmOcrUpdate() {
  // Collect edited values
  const names = document.querySelectorAll('.ocr-item-name');
  const prices = document.querySelectorAll('.ocr-item-price');
  
  const items = currentOcrItems.map((item, i) => ({
  ...item,
  nama: names[i] ? names[i].value : item.nama,
  hargaJualTerakhir: prices[i] ? parseFloat(prices[i].value) : item.hargaJualTerakhir
  }));
  
  try {
  const res = await Api.post('/ocr/confirm', { items });
  closeModal();
  toast(res.message);
  renderPrices();
  } catch (err) {
  toast(err.message, true);
  }
  }

// ============ Settings ============
async function renderSettings() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  const settings = await Api.get('/dashboard/settings');

  el.innerHTML = `
    <div class="panel">
      <div class="panel-header"><h3>Pengaturan Perusahaan & Kop Invoice</h3></div>
      <form id="settings-form">
        <div class="form-group"><label>Nama Perusahaan</label><input name="nama_perusahaan" value="${escapeHtml(settings.nama_perusahaan || '')}"></div>
        <div class="form-group mt-8"><label>Alamat</label><textarea name="alamat" rows="2">${escapeHtml(settings.alamat || '')}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Telepon</label><input name="telepon" value="${escapeHtml(settings.telepon || '')}"></div>
          <div class="form-group"><label>Email</label><input name="email" value="${escapeHtml(settings.email || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Website</label><input name="website" value="${escapeHtml(settings.website || '')}"></div>
          <div class="form-group"><label>NPWP</label><input name="npwp" value="${escapeHtml(settings.npwp || '')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Bank</label><input name="bank" value="${escapeHtml(settings.bank || '')}"></div>
          <div class="form-group"><label>No. Rekening</label><input name="no_rekening" value="${escapeHtml(settings.no_rekening || '')}"></div>
        </div>
        <div class="form-group mt-8">
          <label>Logo Perusahaan (tampil di invoice)</label>
          ${settings.logo ? `<div class="mt-8"><img src="${settings.logo}" style="height:60px"></div>` : ''}
          <input type="file" id="logo-input" accept="image/*">
        </div>
        <div class="form-group mt-8"><label>Caption Invoice</label><textarea name="caption" rows="2">${escapeHtml(settings.caption || '')}</textarea></div>
        <button type="submit" class="btn mt-8">Simpan Pengaturan</button>
      </form>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>Buat Akun Pengguna Baru</h3></div>
      <form id="user-form">
        <div class="form-row">
          <div class="form-group"><label>Username</label><input name="username" required></div>
          <div class="form-group"><label>Password</label><input type="password" name="password" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Nama</label><input name="nama"></div>
          <div class="form-group"><label>Role</label><select name="role"><option value="user">User (Staff)</option><option value="admin">Admin</option></select></div>
        </div>
        <button type="submit" class="btn">Buat Akun</button>
      </form>
    </div>
    <div class="panel mt-8">
      <div class="panel-header"><h3>👥 Daftar Pengguna</h3></div>
      <div id="user-list"></div>
    </div>
  `;

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    delete body.logo;
    try {
      const logoInput = document.getElementById('logo-input');
      if (logoInput.files[0]) {
        const fd = new FormData();
        fd.append('logo', logoInput.files[0]);
        const res = await Api.post('/dashboard/settings/logo', fd, true);
        body.logo = res.path;
      }
      await Api.put('/dashboard/settings', body);
      toast('Pengaturan disimpan.');
      renderSettings();
    } catch (err) { toast(err.message, true); }
  });

  document.getElementById('user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try {
      await Api.post('/auth/users', body);
      toast('Akun berhasil dibuat.');
      e.target.reset();
      renderUserList();
    } catch (err) { toast(err.message, true); }
  });

  await renderUserList();
}

async function renderUserList() {
  const container = document.getElementById('user-list');
  if (!container) return;
  container.innerHTML = '<p class="text-muted">Memuat...</p>';
  try {
    const data = await Api.get('/auth/users');
    const users = data.users || [];
    if (!users.length) {
      container.innerHTML = '<p class="text-muted">Belum ada pengguna.</p>';
      return;
    }
    container.innerHTML = `<table>
      <thead><tr><th>Username</th><th>Nama</th><th>Role</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead>
      <tbody>
        ${users.map(u => `<tr>
          <td>${escapeHtml(u.username)}</td>
          <td>${escapeHtml(u.nama || '-')}</td>
          <td><span class="badge ${u.role === 'admin' ? 'green' : 'muted'}">${u.role}</span></td>
          <td>${u.status || 'Aktif'}</td>
          <td>${u.createdAt ? u.createdAt.slice(0,10) : '-'}</td>
          <td><button class="btn secondary" onclick="openResetPassword(${u.id}, '${escapeHtml(u.username)}')">Reset Password</button></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch (err) {
    container.innerHTML = `<p class="text-muted">${escapeHtml(err.message)}</p>`;
  }
}

function openResetPassword(userId, username) {
  openModal(`
    <h3>Reset Password - ${escapeHtml(username)}</h3>
    <form id="reset-password-form">
      <div class="form-group"><label>Password Baru</label><input type="text" name="password" placeholder="Minimal 4 karakter" required></div>
      <p class="text-muted">Password baru akan ditampilkan sekali untuk disampaikan ke pengguna.</p>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn">Reset</button>
      </div>
    </form>
    <div id="reset-password-result" class="mt-8 hidden"></div>
  `);
  document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    const resultEl = document.getElementById('reset-password-result');
    try {
      const res = await Api.put(`/auth/users/${userId}/password`, body);
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `<div class="panel mt-8"><p>Password untuk <strong>${escapeHtml(res.username)}</strong> berhasil direset.</p><p class="text-muted">Password baru: <code>${escapeHtml(body.password)}</code></p></div>`;
      renderUserList();
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ============ Catalog ============
async function renderCatalog() {
  const el = document.getElementById('page-content');
  el.innerHTML = '<p class="text-muted">Memuat...</p>';
  try {
    const [recipients] = await Promise.all([Api.get('/catalog/recipients')]);
    const custCount = (recipients.customers || []).length;
    const salesCount = (recipients.sales || []).length;
    const suppCount = (recipients.suppliers || []).length;
    const total = custCount + salesCount + suppCount;

    const customerRows = (recipients.customers || []).map(c => `<label><input type="checkbox" value="${escapeHtml(c.email)}" class="recipient" data-group="customer"> ${escapeHtml(c.nama)} (${escapeHtml(c.email)})</label>`).join('');
    const salesRows = (recipients.sales || []).map(s => `<label><input type="checkbox" value="${escapeHtml(s.email || '')}" class="recipient" data-group="sales"> ${escapeHtml(s.nama)} (${escapeHtml(s.email || '-')})</label>`).join('');
    const supplierRows = (recipients.suppliers || []).map(sup => `<label><input type="checkbox" value="${escapeHtml(sup.email || '')}" class="recipient" data-group="supplier"> ${escapeHtml(sup.nama)} (${escapeHtml(sup.email || '-')})</label>`).join('');

    el.innerHTML = `
      <div class="panel">
        <div class="panel-header"><h3>Blast Katalog</h3></div>
        <p class="text-muted">Pilih penerima dan generate katalog PDF. Email akan dikirim beserta lampiran PDF.</p>
        <div class="form-row">
          <div class="form-group">
            <label>Subjek Email</label>
            <input id="catalog-subject" value="Katalog Harga CV Brothers Farm">
          </div>
          <div class="form-group">
            <label>Pesan</label>
            <textarea id="catalog-message" rows="2">Berikut katalog harga kami.</textarea>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Customer (${custCount})</label>
            <div class="recipient-group">${customerRows || '<span class="text-muted">Tidak ada customer.</span>'}</div>
          </div>
          <div class="form-group">
            <label>Sales (${salesCount})</label>
            <div class="recipient-group">${salesRows || '<span class="text-muted">Tidak ada sales.</span>'}</div>
          </div>
          <div class="form-group">
            <label>Supplier (${suppCount})</label>
            <div class="recipient-group">${supplierRows || '<span class="text-muted">Tidak ada supplier.</span>'}</div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email Tambahan (pisahkan dengan koma)</label>
            <input id="catalog-extra-emails" placeholder="contoh@email.com, lain@email.com">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn secondary" onclick="generateCatalogOnly()">Generate PDF</button>
          <button class="btn" onclick="blastCatalog()">Blast Email</button>
        </div>
        <div id="catalog-result" class="mt-8"></div>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<p class="text-muted">Gagal memuat data penerima: ${escapeHtml(err.message)}</p>`;
  }
}
function getSelectedCatalogEmails() {
  const checks = document.querySelectorAll('.recipient:checked');
  const emails = Array.from(checks).map(c => c.value).filter(Boolean);
  const extra = document.getElementById('catalog-extra-emails').value;
  if (extra) {
    extra.split(',').map(s => s.trim()).filter(Boolean).forEach(e => { if (!emails.includes(e)) emails.push(e); });
  }
  return emails;
}
async function generateCatalogOnly() {
  try {
    const res = await Api.post('/catalog/generate');
    toast(`Katalog ${res.file} berhasil dibuat (${res.productCount} produk).`);
  } catch (err) { toast(err.message, true); }
}
async function blastCatalog() {
  const emails = getSelectedCatalogEmails();
  if (!emails.length) return toast('Pilih minimal satu penerima.', true);
  const subject = document.getElementById('catalog-subject').value;
  const message = document.getElementById('catalog-message').value;
  try {
    const res = await Api.post('/catalog/blast', { emails, subject, message });
    const ok = res.results.filter(r => r.status === 'sent').length;
    const fail = res.results.filter(r => r.status !== 'sent').length;
    toast(`Blast selesai. Terkirim: ${ok}, Gagal: ${fail}. File: ${res.file}`);
  } catch (err) { toast(err.message, true); }
}

// ============ Start ============
init();
