const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'timeslot.db');

let _db = null;

function save() {
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Wrap sql.js to look like better-sqlite3 (sync interface)
function makeDb(sqljs) {
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new sqljs.Database(buf);
  } else {
    _db = new sqljs.Database();
  }

  _db.exec(`
    PRAGMA foreign_keys = ON;

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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrate: add profile columns to users if they don't exist yet
  try { _db.run('ALTER TABLE users ADD COLUMN full_name TEXT'); } catch (e) {}
  try { _db.run('ALTER TABLE users ADD COLUMN email TEXT'); } catch (e) {}
  save();

  // Seed admin user if no users exist
  const [{ values: uCount }] = _db.exec('SELECT COUNT(*) FROM users');
  if (uCount[0][0] === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    _db.run('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)', ['admin', hash]);
    save();
  }

  // Seed default tools if empty
  const [{ values }] = _db.exec('SELECT COUNT(*) FROM tools');
  if (values[0][0] === 0) {
    const seeds = [
      ['3D Printer', 'FDM 3D printer, 0.4mm nozzle, 220x220x250mm build volume', 'Lab Room A'],
      ['Laser Cutter', '60W CO2 laser cutter, 600x400mm bed', 'Lab Room A'],
      ['CNC Router', '3-axis CNC router, 800x600mm cutting area', 'Workshop'],
      ['Oscilloscope', '4-channel 200MHz digital oscilloscope', 'Electronics Bench'],
      ['Soldering Station', 'Temperature-controlled soldering station with fume extractor', 'Electronics Bench']
    ];
    for (const [name, desc, loc] of seeds) {
      _db.run('INSERT INTO tools (name, description, location) VALUES (?, ?, ?)', [name, desc, loc]);
    }
    save();
  }

  return createWrapper();
}

function createWrapper() {
  return {
    // Run a statement (INSERT/UPDATE/DELETE), returns { lastInsertRowid, changes }
    run(sql, params = []) {
      _db.run(sql, params);
      const lastInsertRowid = _db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? null;
      const changes = _db.exec('SELECT changes()')[0]?.values[0][0] ?? 0;
      save();
      return { lastInsertRowid, changes };
    },
    // Return first matching row as object, or undefined
    get(sql, params = []) {
      const result = _db.exec(sql, params);
      if (!result.length || !result[0].values.length) return undefined;
      const { columns, values } = result[0];
      return Object.fromEntries(columns.map((c, i) => [c, values[0][i]]));
    },
    // Return all matching rows as objects
    all(sql, params = []) {
      const result = _db.exec(sql, params);
      if (!result.length) return [];
      const { columns, values } = result[0];
      return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
    }
  };
}

// Export a promise that resolves to the db wrapper
let dbReady;
module.exports = {
  init: async () => {
    if (!dbReady) {
      const sqljs = await initSqlJs();
      dbReady = makeDb(sqljs);
    }
    return dbReady;
  },
  get: () => dbReady
};
