from fpdf import FPDF
from fpdf.enums import XPos, YPos
import os

OUTPUT_DIR = '/data/data/com.termux/files/home/brothers-farm/docs'
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_PATH = os.path.join(OUTPUT_DIR, 'catatan-perbaikan-vps.pdf')

class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font('Helvetica', 'I', 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, 'Brothers Farm - Catatan Perbaikan & VPS', align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 9)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Halaman {self.page_no()}', align='C')

    def chapter_title(self, title, level=1):
        if level == 1:
            self.set_font('Helvetica', 'B', 16)
            self.set_text_color(30, 30, 30)
            self.ln(8)
            self.cell(0, 10, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.set_draw_color(180, 180, 180)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(4)
        elif level == 2:
            self.set_font('Helvetica', 'B', 13)
            self.set_text_color(40, 40, 40)
            self.ln(6)
            self.cell(0, 8, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.ln(2)
        else:
            self.set_font('Helvetica', 'B', 11)
            self.set_text_color(50, 50, 50)
            self.ln(4)
            self.cell(0, 7, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def body_text(self, text, bold=False):
        self.set_font('Helvetica', 'B' if bold else '', 11)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font('Helvetica', '', 11)
        self.set_text_color(30, 30, 30)
        self.cell(6, 6, '-', new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.multi_cell(0, 6, text)
        self.ln(1)

    def code_line(self, text):
        self.set_font('Courier', '', 10)
        self.set_text_color(20, 20, 20)
        self.set_fill_color(245, 245, 245)
        self.cell(0, 6, text, fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1)

pdf = PDF()
pdf.set_auto_page_break(auto=True, margin=18)

# Cover
pdf.add_page()
pdf.set_font('Helvetica', 'B', 26)
pdf.ln(50)
pdf.cell(0, 14, 'Brothers Farm', align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_font('Helvetica', '', 14)
pdf.cell(0, 10, 'Catatan Perbaikan, VPS, dan Tutorial Update', align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.ln(10)
pdf.set_font('Helvetica', '', 12)
pdf.cell(0, 10, 'Tanggal: 01-02 September 2026', align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)

# SECTION 1
pdf.add_page()
pdf.chapter_title('1. Catatan Perbaikan', level=1)
pdf.body_text('Berikut adalah 10 masalah yang dilaporkan pada tanggal 01/09/2026 beserta status perbaikannya:')

fixes = [
    ('1. Registrasi portal customer gagal', 'FIXED', 'Endpoint /api/customer/register sudah aktif. Registrasi akun customer baru melalui portal kembali berfungsi.'),
    ('2. Tidak bisa membuat akun admin/staff', 'FIXED', 'Menu Pengaturan > Buat Akun Pengguna Baru sekarang mendukung pembuatan akun dengan role admin dan user (staff).'),
    ('3. Opsi sales di form order tidak otomatis', 'FIXED', 'Saat memilih customer pada form buat order, opsi sales kini otomatis terisi sesuai data customer yang tersimpan.'),
    ('4. Status order tidak berubah menjadi Lunas', 'FIXED', 'Backend sekarang menghitung total pembayaran untuk order. Jika status pembayaran=Lunas dan order dipilih, status order otomatis menjadi Lunas.'),
    ('5. Invoice tidak muncul di role admin', 'FIXED', 'Halaman Invoice pada role admin menampilkan semua invoice (customer, supplier, bonus) dengan benar.'),
    ('6. Riwayat harga belum ada edit/delete', 'FIXED', 'Setiap baris di menu Riwayat Harga sekarang memiliki tombol Edit dan Hapus. Endpoint PUT /api/prices/:id dan DELETE /api/prices/:id telah ditambahkan.'),
    ('7. Menu katalog error: no such column: email', 'FIXED', 'Ditambahkan deteksi kolom dinamis (email/hp) dan migration 002_add_email_to_customer untuk menambah kolom email jika belum ada.'),
    ('8. Tabel customer tidak ada kolom piutang', 'FIXED', 'Kolom Piutang ditambahkan dan menghitung total order yang belum lunas per customer aktif.'),
    ('9. Kolom sales di tabel customer tidak muncul nama', 'FIXED', 'Query customer sekarang melakukan LEFT JOIN ke tabel sales untuk menampilkan nama sales.'),
    ('10. Edit customer error: no such column:email', 'FIXED', 'Migration 002 menangani penambahan kolom email di tabel customer sehingga operasi edit customer tidak error lagi.'),
]

for title, status, desc in fixes:
    pdf.chapter_title(f'{title} [{status}]', level=2)
    pdf.body_text(desc)

# SECTION 2
pdf.add_page()
pdf.chapter_title('2. Catatan VPS', level=1)
pdf.body_text('Berikut adalah hal-hal yang perlu diperhatikan saat menjalankan aplikasi di VPS (Contabo Linux):')

vps_notes = [
    'Database yang digunakan adalah SQLite. File database terletak di folder data/ pada direktori aplikasi.',
    'Skema database VPS dapat berbeda dari lokal. Beberapa kolom seperti email pada tabel customer mungkin belum ada.',
    'Sistem sekarang memiliki migration runner. Jalankan npm run migrate setelah git pull untuk menerapkan perubahan skema.',
    'Email notification dinonaktifkan (EMAIL_NOTIFY_ENABLED=false) karena SMTP Gmail gagal autentikasi. Jika ingin mengaktifkan, gunakan SendGrid atau Office365.',
    'Aplikasi berjalan di port 3232. Jika berjalan di VPS, pastikan firewall membuka port ini atau di-balance-kan reverse proxy.',
    'Auto-sync cron berjalan setiap 5 jam untuk push perubahan ke GitHub.',
    'Untuk backup database: copy file data/brothersfarm.db ke lokasi aman. Untuk restore: ganti file dengan backup yang valid.',
    'Pastikan Node.js versi stabil terinstal. Aplikasi menggunakan modul native sqlite3.',
    'Jika mengalami error no such column, jalankan migration: node scripts/migrate.js',
    'File seed test sebaiknya tidak dijalankan di VPS untuk menghindari data sampah.',
]

for note in vps_notes:
    pdf.bullet(note)

# SECTION 3
pdf.add_page()
pdf.chapter_title('3. Tutorial Update Aplikasi di VPS', level=1)
pdf.body_text('Ikuti langkah-langkah berikut untuk memperbarui aplikasi di VPS:')

steps = [
    ('Langkah 1: Backup database', [
        'ssh user@vps',
        'cd /path/to/brothers-farm',
        'cp data/brothersfarm.db data/brothersfarm.db.backup-$(date +%Y%m%d)',
    ]),
    ('Langkah 2: Pull kode terbaru dari GitHub', [
        'git pull origin main',
    ]),
    ('Langkah 3: Jalankan migration jika ada', [
        'npm install',
        'node scripts/migrate.js',
    ]),
    ('Langkah 4: Restart aplikasi', [
        'Jika menggunakan systemd: sudo systemctl restart brothers-farm',
        'Jika menggunakan pm2: pm2 restart brothers-farm',
        'Jika manual: pkill -f "node server.js" && nohup node server.js &',
    ]),
    ('Langkah 5: Verifikasi', [
        'curl -s http://localhost:3232/health',
        'Cek log aplikasi untuk memastikan tidak ada error saat startup.',
    ]),
]

for step_title, cmds in steps:
    pdf.chapter_title(step_title, level=2)
    for cmd in cmds:
        pdf.code_line(cmd)

pdf.add_page()
pdf.chapter_title('4. Perintah-perintah Penting', level=1)

pdf.chapter_title('Git', level=2)
for cmd in ['git status', 'git add -A', 'git commit -m "pesan"', 'git push origin main', 'git pull origin main']:
    pdf.code_line(cmd)

pdf.chapter_title('Migration', level=2)
for cmd in ['node scripts/migrate.js', 'npm run migrate']:
    pdf.code_line(cmd)

pdf.chapter_title('Test', level=2)
for cmd in ['node tests/test-transaction-flow.js', 'npm test']:
    pdf.code_line(cmd)

pdf.chapter_title('Database SQLite', level=2)
for cmd in ['sqlite3 data/brothersfarm.db ".tables"', 'sqlite3 data/brothersfarm.db ".schema customer"', 'sqlite3 data/brothersfarm.db "SELECT * FROM orders LIMIT 5;"']:
    pdf.code_line(cmd)

# SECTION 5
pdf.add_page()
pdf.chapter_title('5. Ringkasan Perubahan yang Perlu Diterapkan di VPS', level=1)
pdf.body_text('Berikut adalah commit-commit terbaru yang perlu di-pull ke VPS:')

commits = [
    '169ba27 - fix: test orphan invoice check uses created invoice IDs only',
    '7e121c5 - fix: order status auto Lunas, customer piutang/sales display, price edit/delete, email migration',
    'c925502 - fix: format payment keterangan in order detail and clean legacy JSON',
    '0119164 - feat: add order detail page with payments and invoices tracing',
    '2029075 - feat: show remaining order balance and validate payment amount',
    'c3062c8 - fix: auto-create supplier invoice on pengeluaran_supplier payment',
    '4e49ea6 - feat: add assign sales endpoint and admin UI',
]

for c in commits:
    pdf.bullet(c)

pdf.body_text('Setelah pull, pastikan menjalankan migration dan restart aplikasi.')

# Save
pdf.output(OUTPUT_PATH)
print(f'PDF saved to {OUTPUT_PATH}')
print(f'Size: {os.path.getsize(OUTPUT_PATH)} bytes')
