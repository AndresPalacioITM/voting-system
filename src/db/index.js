const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

let db;

function getDb() {
  if (!db) {
    const dbDir = path.dirname(path.resolve(config.dbPath));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(path.resolve(config.dbPath));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS voters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      has_voted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      party TEXT,
      votes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_id INTEGER NOT NULL UNIQUE,
      candidate_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
