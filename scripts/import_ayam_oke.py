import json, sqlite3, os, re
from datetime import datetime

SRC = '/data/data/com.termux/files/home/.hermes/profiles/argani/cache/documents/doc_285febe5d3be_backup-ayam-oke-2026-08-26.json'
DB = '/data/data/com.termux/files/home/brothers-farm/data/brothersfarm.db'

with open(SRC, 'r', encoding='utf-8') as f:
    data = json.load(f)

con = sqlite3.connect(DB)
con.execute('PRAGMA foreign_keys = ON')
cur = con.cursor()

# optional clear existing demo data
for tbl in ['order_items','orders','pembayaran','harga','produk','customer','sales','supplier']:
    cur.execute(f'DELETE FROM {tbl}')

# helper to normalize string values
def s(v):
    if v is None:
        return None
    return str(v).strip() if str(v).strip() != '' else None

# helper to safe float
def f(v):
    try:
        return float(v)
    except:
        return 0.0

# cache for code -> id mappings
sales_map = {}
supplier_map = {}
produk_map = {}
customer_map = {}
order_map = {}

# 1) sales
for row in data.get('sales', []):
    nama = s(row.get('nama'))
    if not nama:
        continue
    hp = s(row.get('hp'))
    rek = s(row.get('rekening'))
    status = s(row.get('status')) or 'Aktif'
    cur.execute('INSERT INTO sales (nama, hp, rekening, status, createdAt) VALUES (?,?,?,?,?)',
                (nama, hp, rek, status, datetime.now().isoformat()))
    sales_map[row.get('kode')] = cur.lastrowid

# 2) supplier
for row in data.get('supplier', []):
    nama = s(row.get('nama'))
    if not nama:
        continue
    rek = s(row.get('rekening'))
    hp = s(row.get('hp'))
    status = 'Aktif'
    cur.execute('INSERT INTO supplier (nama, rekening, hp, totalUtang, totalBayar, status, createdAt) VALUES (?,?,?,?,?,?,?)',
                (nama, rek, hp, 0, 0, status, datetime.now().isoformat()))
    supplier_map[row.get('kode')] = cur.lastrowid

# 3) produk
for row in data.get('produk', []):
    kode = s(row.get('kode'))
    nama = s(row.get('nama'))
    if not nama:
        continue
    kategori = s(row.get('kategori'))
    satuan = s(row.get('satuan'))
    sup_code = s(row.get('supplierKode'))
    supplierId = supplier_map.get(sup_code)
    insentif = f(row.get('insentif', 0))
    cur.execute('INSERT INTO produk (kode, kategori, nama, satuan, supplierId, insentif, hargaBeliTerakhir, hargaJualTerakhir, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
                (kode, kategori, nama, satuan, supplierId, insentif, 0, 0, 'Aktif', datetime.now().isoformat()))
    produk_map[row.get('kode')] = cur.lastrowid

# 4) customer with sales mapping by name
for row in data.get('customer', []):
    kode = s(row.get('kode'))
    nama = s(row.get('nama'))
    if not nama:
        continue
    jenis = s(row.get('jenis'))
    alamat = s(row.get('alamat'))
    hp = s(row.get('hp'))
    salesNama = s(row.get('salesNama'))
    salesId = None
    if salesNama:
        # find salesId by nama
        cur.execute('SELECT id FROM sales WHERE nama = ?', (salesNama,))
        r = cur.fetchone()
        if r:
            salesId = r[0]
    saldoAwal = f(row.get('saldoAwal', 0))
    status = s(row.get('status')) or 'Aktif'
    cur.execute('INSERT INTO customer (kode, nama, jenis, alamat, hp, salesId, saldoAwal, status, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
                (kode, nama, jenis, alamat, hp, salesId, saldoAwal, status, datetime.now().isoformat()))
    customer_map[row.get('kode')] = cur.lastrowid

# 5) harga history
for row in data.get('harga', []):
    tanggal = s(row.get('tanggal'))
    kodeProduk = row.get('kodeProduk')
    produkId = produk_map.get(kodeProduk)
    if not produkId or not tanggal:
        continue
    hargaBeli = f(row.get('hargaBeli', 0))
    hargaJual = f(row.get('hargaJual', 0))
    cur.execute('INSERT INTO harga (tanggal, produkId, hargaBeli, hargaJual, sumber, createdAt) VALUES (?,?,?,?,?,?)',
                (tanggal, produkId, hargaBeli, hargaJual, 'import', datetime.now().isoformat()))

# 6) orders + items
for row in data.get('orders', []):
    noOrder = s(row.get('noOrder'))
    if not noOrder:
        continue
    tanggal = s(row.get('tanggal')) or datetime.now().date().isoformat()
    kodeCustomer = row.get('kodeCustomer')
    customerId = customer_map.get(kodeCustomer)
    namaSales = s(row.get('namaSales'))
    salesId = None
    if namaSales:
        cur.execute('SELECT id FROM sales WHERE nama = ?', (namaSales,))
        r = cur.fetchone()
        if r:
            salesId = r[0]
    metodeBayar = s(row.get('metodeBayar')) or 'Tempo'
    jatuhTempo = s(row.get('jatuhTempo'))
    keterangan = s(row.get('keterangan'))
    items = row.get('items', [])
    total = sum(f(it.get('subtotal', 0)) for it in items)
    totalInsentif = sum(f(it.get('insentif', 0)) for it in items)
    cur.execute('INSERT INTO orders (noOrder, tanggal, customerId, salesId, metodeBayar, jatuhTempo, total, totalInsentif, status, keterangan, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                (noOrder, tanggal, customerId, salesId, metodeBayar, jatuhTempo, total, totalInsentif, 'Lunas', keterangan, 1, datetime.now().isoformat()))
    orderId = cur.lastrowid
    order_map[row.get('id')] = orderId
    for it in items:
        kodeProduk = it.get('kodeProduk')
        produkId = produk_map.get(kodeProduk)
        if not produkId:
            continue
        qty = f(it.get('qty', 0))
        satuan = s(it.get('satuan'))
        hargaJual = f(it.get('hargaJual', 0))
        hargaBeli = f(it.get('hargaBeli', 0))
        insentifPerUnit = f(it.get('insentif', 0))
        subtotal = f(it.get('subtotal', 0))
        cur.execute('INSERT INTO order_items (orderId, produkId, qty, satuan, hargaJual, hargaBeli, insentifPerUnit, subtotal) VALUES (?,?,?,?,?,?,?,?)',
                    (orderId, produkId, qty, satuan, hargaJual, hargaBeli, insentifPerUnit, subtotal))

# 7) pembayaran
for row in data.get('pembayaran', []):
    noPembayaran = s(row.get('noPembayaran'))
    if not noPembayaran:
        continue
    tanggal = s(row.get('tanggal')) or datetime.now().date().isoformat()
    kodeCustomer = row.get('kodeCustomer')
    customerId = customer_map.get(kodeCustomer)
    jumlahBayar = f(row.get('jumlahBayar', 0))
    metode = s(row.get('metode'))
    keterangan = s(row.get('keterangan'))
    jenis = 'penerimaan_customer'
    salesId = None
    supplierId = None
    cur.execute('INSERT INTO pembayaran (noPembayaran, tanggal, customerId, supplierId, salesId, jumlahBayar, jenis, keterangan, createdBy, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)',
                (noPembayaran, tanggal, customerId, supplierId, salesId, jumlahBayar, jenis, keterangan, 1, datetime.now().isoformat()))

con.commit()
con.close()
print('Import selesai.')
print('sales:', len(sales_map))
print('supplier:', len(supplier_map))
print('produk:', len(produk_map))
print('customer:', len(customer_map))
print('orders:', len(order_map))
