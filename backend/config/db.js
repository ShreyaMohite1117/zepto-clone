/**
 * Database connection + schema setup.
 * Uses better-sqlite3 — a real embedded SQL database (file-based, zero server setup).
 * The .db file is created automatically at backend/database/zepto.db on first run.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'zepto.db');
const db = new Database(dbPath);

// Better concurrency + durability for a real app
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone         TEXT DEFAULT '',
    address       TEXT DEFAULT '',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT UNIQUE NOT NULL,
    icon  TEXT DEFAULT 'fa-solid fa-tag'
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    price       REAL NOT NULL,
    discount    INTEGER DEFAULT 0,
    stock       INTEGER DEFAULT 0,
    image_url   TEXT,
    unit        TEXT DEFAULT '1 unit',
    rating      REAL DEFAULT 4.0,
    description TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    total_amount     REAL NOT NULL,
    payment_method   TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    status           TEXT DEFAULT 'Confirmed',
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id           INTEGER NOT NULL,
    product_id         INTEGER NOT NULL,
    product_name       TEXT NOT NULL,
    quantity           INTEGER NOT NULL,
    price_at_purchase  REAL NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

module.exports = db;
