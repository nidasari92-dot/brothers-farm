import json, sqlite3
from datetime import datetime

SRC = '/data/data/com.termux/files/home/.hermes/profiles/argani/cache/documents/doc_285febe5d3be_backup-ayam-oke-2026-08-26.json'
DB = '/data/data/com.termux/files/home/brothers-farm/data/brothersfarm.db'

with open(SRC, 'r', encoding='utf-8') as f:
    data = json.load(f)

con = sqlite3.connect(DB)
con.execute('PRAGMA foreign_keys = ON')
cur = con.cursor()

def s(v):
    if v is None:
        return None
    return str(v).strip() if str(v).strip() != '' else None

def f(v):
    try:
        return float(v)
    except:
        return 0.0

# relink orders items with correct subtotal + insentif from produk
# and recalc totals
rows = cur.execute('SELECT id FROM orders').fetchall()
for (orderId,) in rows:
    total = 0.0
    totalInsentif = 0.0
    items = cur.execute('SELECT id, produkId, qty, hargaJual, hargaBeli FROM order_items WHERE orderId = ?', (orderId,)).fetchall()
    for itemId, produkId, qty, hargaJual, hargaBeli in items:
        subtotal = qty * hargaJual
        insentif = 0.0
        if produkId:
            p = cur.execute('SELECT insentif FROM produk WHERE id = ?', (produkId,)).fetchone()
            if p:
                insentif = f(p[0]) * qty
        cur.execute('UPDATE order_items SET subtotal = ?, insentifPerUnit = ?, hargaBeli = ? WHERE id = ?',
                    (subtotal, insentif/qty if qty else 0, hargaBeli, itemId))
        total += subtotal
        totalInsentif += insentif
    cur.execute('UPDATE orders SET total = ?, totalInsentif = ? WHERE id = ?', (total, totalInsentif, orderId))

con.commit()
con.close()
print('Recalc selesai.')
