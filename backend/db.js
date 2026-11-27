const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'timeslot.db');

let _db = null;

function makeDb() {
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      location TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_id INTEGER NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
      user_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (end_time > start_time)
    );

    CREATE INDEX IF NOT EXISTS idx_res_tool ON reservations(tool_id);
    CREATE INDEX IF NOT EXISTS idx_res_start ON reservations(start_time);

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      full_name TEXT,
      email TEXT
    );
  `);

  // Seed admin user if no users exist
  const { count: userCount } = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount === 0) {
    db.prepare('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)')
      .run('admin', bcrypt.hashSync('admin', 10));
  }

  // Seed default tools if empty
  const { count: toolCount } = db.prepare('SELECT COUNT(*) as count FROM tools').get();
  if (toolCount === 0) {
    const insert = db.prepare('INSERT INTO tools (name, description, location) VALUES (?, ?, ?)');
    const seeds = [
      ['3D Printer',        'FDM 3D printer, 0.4mm nozzle, 220x220x250mm build volume', 'Lab Room A'],
      ['Laser Cutter',      '60W CO2 laser cutter, 600x400mm bed',                      'Lab Room A'],
      ['CNC Router',        '3-axis CNC router, 800x600mm cutting area',                 'Workshop'],
      ['Oscilloscope',      '4-channel 200MHz digital oscilloscope',                     'Electronics Bench'],
      ['Soldering Station', 'Temperature-controlled soldering station with fume extractor', 'Electronics Bench'],
    ];
    for (const args of seeds) insert.run(...args);
  }

  return createWrapper(db);
}

function createWrapper(db) {
  return {
    run(sql, params = []) {
      return db.prepare(sql).run(...params);
    },
    get(sql, params = []) {
      return db.prepare(sql).get(...params);
    },
    all(sql, params = []) {
      return db.prepare(sql).all(...params);
    }
  };
}

module.exports = {
  init: async () => {
    if (!_db) _db = makeDb();
    return _db;
  },
  get: () => _db
};
