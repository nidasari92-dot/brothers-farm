const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_PATH = path.join(__dirname, '..', 'data', 'brothersfarm.db');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// List backups
function listBackups(req, res) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.db') || f.endsWith('.sql') || f.endsWith('.json'))
      .map(f => {
        const filepath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(filepath);
        return {
          filename: f,
          size: stats.size,
          created: stats.birthtime,
          type: f.endsWith('.db') ? 'database' : f.endsWith('.sql') ? 'sql' : 'json'
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json({ backups: files });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membaca daftar backup: ' + err.message });
  }
}

// Create backup
function createBackup(req, res) {
  try {
    const { type = 'full', password } = req.body || {};
    
    // Verify admin password for safety
    if (!password) {
      return res.status(400).json({ error: 'Password admin wajib diisi untuk backup.' });
    }

    const admin = db.prepare('SELECT password FROM users WHERE role = ?').get('admin');
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Password admin salah.' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    let backupFilename, backupPath;

    if (type === 'full') {
      // Full database backup (copy SQLite file)
      backupFilename = `brothers-farm-full-${timestamp}.db`;
      backupPath = path.join(BACKUP_DIR, backupFilename);
      fs.copyFileSync(DB_PATH, backupPath);
    } else if (type === 'sql') {
      // SQL dump backup
      backupFilename = `brothers-farm-${timestamp}.sql`;
      backupPath = path.join(BACKUP_DIR, backupFilename);
      
      // Export SQL schema and data
      const tables = db.pragma('table_list').map(t => t.name);
      let sql = `-- CV Brothers Farm Database Backup\n-- Generated: ${new Date().toISOString()}\n\n`;
      
      for (const table of tables) {
        const schema = db.pragma(`table_info(${table})`);
        const columns = schema.map(c => c.name).join(', ');
        const rows = db.prepare(`SELECT * FROM ${table}`).all();
        
        sql += `-- Table: ${table}\n`;
        sql += `CREATE TABLE ${table} (${schema.map(c => `${c.name} ${c.type}${c.notnull ? ' NOT NULL' : ''}${c.dflt_value ? ' DEFAULT ' + c.dflt_value : ''}`).join(', ')});\n\n`;
        
        for (const row of rows) {
          const values = Object.values(row).map(v => v === null ? 'NULL' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v);
          sql += `INSERT INTO ${table} (${columns}) VALUES (${values.join(', ')});\n`;
        }
        sql += '\n';
      }
      
      fs.writeFileSync(backupPath, sql);
    } else {
      return res.status(400).json({ error: 'Tipe backup tidak didukung. Gunakan "full" atau "sql".' });
    }

    const stats = fs.statSync(backupPath);
    res.json({
      message: 'Backup berhasil dibuat.',
      backup: {
        filename: backupFilename,
        type,
        size: stats.size,
        created: stats.birthtime,
        downloadUrl: `/api/backup/${backupFilename}/download`
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal membuat backup: ' + err.message });
  }
}

// Restore backup
function restoreBackup(req, res) {
  try {
    const { filename, password } = req.body || {};
    
    if (!filename) {
      return res.status(400).json({ error: 'Nama file backup wajib diisi.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password admin wajib diisi untuk restore.' });
    }

    const admin = db.prepare('SELECT password FROM users WHERE role = ?').get('admin');
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Password admin salah.' });
    }

    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'File backup tidak ditemukan.' });
    }

    // Create safety backup before restore
    const safetyTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safetyBackup = path.join(BACKUP_DIR, `safety-before-restore-${safetyTimestamp}.db`);
    fs.copyFileSync(DB_PATH, safetyBackup);

    // Restore based on file type
    if (filename.endsWith('.db')) {
      // Full database restore
      fs.copyFileSync(backupPath, DB_PATH);
    } else if (filename.endsWith('.sql')) {
      // SQL restore - execute SQL file
      const sql = fs.readFileSync(backupPath, 'utf8');
      db.exec(sql);
    } else {
      return res.status(400).json({ error: 'Format file backup tidak didukung.' });
    }

    res.json({
      message: 'Restore berhasil. Server akan restart.',
      safetyBackup: path.basename(safetyBackup),
      restoredFrom: filename
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal restore: ' + err.message });
  }
}

// Delete backup
function deleteBackup(req, res) {
  try {
    const { filename } = req.params;
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'File backup tidak ditemukan.' });
    }

    // Prevent deleting safety backups
    if (filename.startsWith('safety-before-restore')) {
      return res.status(403).json({ error: 'Tidak dapat menghapus safety backup.' });
    }

    fs.unlinkSync(backupPath);
    res.json({ message: 'Backup berhasil dihapus.', filename });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus backup: ' + err.message });
  }
}

// Download backup
function downloadBackup(req, res) {
  try {
    const { filename } = req.params;
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'File backup tidak ditemukan.' });
    }

    res.download(backupPath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal download: ' + err.message });
  }
}

module.exports = {
  listBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
  downloadBackup
};
