const { db } = require('../../config/database');

function hasColumn(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
  return cols.includes(column);
}

function ensureColumn(table, column, type = 'TEXT') {
  if (!hasColumn(table, column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`Added column ${column} to ${table}`);
  }
}

// Add missing columns
ensureColumn('customer', 'email');

console.log('Migration 002_add_email_to_customer: done');
