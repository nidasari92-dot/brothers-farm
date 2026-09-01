const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function ensureMigrationsTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      appliedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
}

function getAppliedMigrations() {
  return db.prepare('SELECT name FROM migrations').all().map(r => r.name);
}

function applyMigration(filePath, name, ext) {
  if (ext === '.js') {
    require(filePath);
  } else {
    const sql = fs.readFileSync(filePath, 'utf8');
    db.exec(sql);
  }
  db.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)').run(name);
}

function run() {
  ensureMigrationsTable();
  const applied = getAppliedMigrations();
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') || f.endsWith('.js'))
    .sort();

  let count = 0;
  for (const file of files) {
    const name = path.basename(file, path.extname(file));
    if (!applied.includes(name)) {
      console.log(`Applying migration: ${name}`);
      const ext = path.extname(file);
      applyMigration(path.join(MIGRATIONS_DIR, file), name, ext);
      count++;
    }
  }

  if (count === 0) {
    console.log('No new migrations to apply.');
  } else {
    console.log(`Applied ${count} migration(s).`);
  }
}

run();
