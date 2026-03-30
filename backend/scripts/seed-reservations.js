/**
 * Seed script — adds test users and a spread of reservations.
 * Run from the backend directory: node scripts/seed-reservations.js
 */
const { init } = require('../db');
const bcrypt = require('bcryptjs');

const USERS = [
  { username: 'alice',   fullName: 'Alice Chen',      email: 'alice@lab.local'   },
  { username: 'bob',     fullName: 'Bob Martinez',    email: 'bob@lab.local'     },
  { username: 'charlie', fullName: 'Charlie Kim',     email: 'charlie@lab.local' },
  { username: 'diana',   fullName: 'Diana Okafor',    email: 'diana@lab.local'   },
];

// Returns an ISO string for today + offsetDays at the given hour:minute
function dt(offsetDays, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// [tool_id, username, start, end, notes]
const RESERVATIONS = [
  // --- past week ---
  [1, 'alice',   dt(-6,  9),    dt(-6, 11),    'Printing bracket prototype'],
  [2, 'bob',     dt(-6, 13),    dt(-6, 15),    'Cutting acrylic panels'],
  [3, 'charlie', dt(-5,  8,30), dt(-5, 12),    'Milling aluminum stock'],
  [4, 'diana',   dt(-5, 14),    dt(-5, 16),    'Signal analysis — motor driver'],
  [5, 'alice',   dt(-5, 16),    dt(-5, 17,30), null],
  [1, 'bob',     dt(-4, 10),    dt(-4, 13),    'Enclosure lid × 3'],
  [2, 'diana',   dt(-4, 15),    dt(-4, 16,30), 'Leather etching demo'],
  [3, 'alice',   dt(-3,  9),    dt(-3, 11,30), null],
  [4, 'charlie', dt(-3, 13),    dt(-3, 14),    'Oscilloscope calibration check'],
  [5, 'bob',     dt(-2, 10),    dt(-2, 11),    'Rework PCB rev2'],
  [1, 'diana',   dt(-2, 14),    dt(-2, 16),    'Filament change + test print'],
  [2, 'charlie', dt(-1,  9),    dt(-1, 11),    'Cutting MDF templates'],
  [5, 'alice',   dt(-1, 13),    dt(-1, 14,30), null],

  // --- today ---
  [3, 'bob',     dt(0,  8),     dt(0, 10),     'Fixture plate'],
  [1, 'charlie', dt(0, 10,30),  dt(0, 12),     null],
  [4, 'diana',   dt(0, 13),     dt(0, 14,30),  'Bench testing new sensor board'],
  [2, 'alice',   dt(0, 15),     dt(0, 17),     'Cutting gaskets'],

  // --- next 7 days ---
  [1, 'diana',   dt(1,  9),     dt(1, 11),     'Large print — overnight prep'],
  [5, 'charlie', dt(1, 11),     dt(1, 12,30),  'Assembly of 10 units'],
  [3, 'alice',   dt(1, 13),     dt(1, 16),     'CNC surfacing run'],
  [2, 'bob',     dt(2,  9),     dt(2, 10,30),  null],
  [4, 'alice',   dt(2, 14),     dt(2, 15,30),  'Frequency sweep'],
  [1, 'bob',     dt(3, 10),     dt(3, 13),     'Batch: 6 mounts'],
  [5, 'diana',   dt(3, 15),     dt(3, 16),     null],
  [2, 'charlie', dt(4,  9),     dt(4, 11),     'Logo engraving — wood plaques'],
  [3, 'diana',   dt(4, 13),     dt(4, 15,30),  'Prototype v3 chassis'],
  [4, 'bob',     dt(5, 10),     dt(5, 12),     'Power supply noise floor check'],
  [1, 'alice',   dt(5, 14),     dt(5, 16),     null],
  [5, 'charlie', dt(6,  9),     dt(6, 10,30),  'Repair connectors on dev board'],
  [2, 'alice',   dt(6, 13),     dt(6, 14),     'Stencil cuts'],

  // --- week 2 ---
  [3, 'bob',     dt(8,  8,30),  dt(8, 11),     'Production run — 20 parts'],
  [1, 'diana',   dt(8, 13),     dt(8, 15),     'TPU flex print test'],
  [4, 'charlie', dt(9, 10),     dt(9, 11,30),  null],
  [2, 'bob',     dt(9, 14),     dt(9, 16),     'Acrylic display case'],
  [5, 'alice',   dt(10, 9),     dt(10, 10),    'Hot-air rework'],
  [1, 'charlie', dt(10, 11),    dt(10, 14),    'Multi-colour print — badge holders'],
  [3, 'diana',   dt(11, 9),     dt(11, 12,30), 'End-mill shakedown'],
  [4, 'alice',   dt(11, 14),    dt(11, 15),    null],
  [2, 'charlie', dt(12, 10),    dt(12, 12),    'Cutting rubber seals'],
  [5, 'bob',     dt(12, 13),    dt(12, 14,30), 'Fine-pitch SMD work'],
];

async function run() {
  const db = await init();
  const hash = bcrypt.hashSync('password', 10);

  // Insert test users
  let created = 0, skipped = 0;
  for (const u of USERS) {
    const exists = db.get('SELECT id FROM users WHERE username = ?', [u.username]);
    if (exists) { skipped++; continue; }
    db.run(
      'INSERT INTO users (username, password_hash, full_name, email) VALUES (?, ?, ?, ?)',
      [u.username, hash, u.fullName, u.email]
    );
    created++;
  }
  console.log(`Users: ${created} created, ${skipped} already existed`);

  // Map username → id for the tool_id sanity check
  const toolCount = db.get('SELECT COUNT(*) as c FROM tools').c;
  if (toolCount === 0) {
    console.error('No tools found — run the server once first to seed default tools.');
    process.exit(1);
  }

  // Insert reservations (skip any that conflict)
  let resCreated = 0, resSkipped = 0;
  for (const [tool_id, username, start, end, notes] of RESERVATIONS) {
    const conflict = db.get(
      'SELECT id FROM reservations WHERE tool_id = ? AND start_time < ? AND end_time > ?',
      [tool_id, end, start]
    );
    if (conflict) { resSkipped++; continue; }
    db.run(
      'INSERT INTO reservations (tool_id, user_name, start_time, end_time, notes) VALUES (?, ?, ?, ?, ?)',
      [tool_id, username, start, end, notes]
    );
    resCreated++;
  }
  console.log(`Reservations: ${resCreated} created, ${resSkipped} skipped (conflict)`);
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
