const express = require('express');
const router = express.Router();
const { get: db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendCancellationEmail } = require('../email');
const { sanitizeText, parseId, parseDate } = require('../utils/sanitize');

const SELECT_COLS = `
  SELECT r.*,
    t.name as tool_name, t.location as tool_location,
    COALESCE(NULLIF(u.full_name, ''), r.user_name) as display_name
  FROM reservations r
  JOIN tools t ON r.tool_id = t.id
  LEFT JOIN users u ON LOWER(u.username) = LOWER(r.user_name)
`;

router.get('/', (req, res) => {
  const { tool_id, date } = req.query;
  let query = SELECT_COLS + ' WHERE 1=1';
  const params = [];

  if (tool_id) {
    const id = parseId(tool_id);
    if (!id) return res.status(400).json({ error: 'Invalid tool_id' });
    query += ' AND r.tool_id = ?'; params.push(id);
  }
  if (date) {
    const d = parseDate(date);
    if (!d) return res.status(400).json({ error: 'Invalid date, expected YYYY-MM-DD' });
    query += ' AND date(r.start_time) = ?'; params.push(d);
  }
  query += ' ORDER BY r.start_time';

  res.json(db().all(query, params));
});

router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid reservation id' });
  const r = db().get(SELECT_COLS + ' WHERE r.id = ?', [id]);
  if (!r) return res.status(404).json({ error: 'Reservation not found' });
  res.json(r);
});

router.post('/', requireAuth, (req, res) => {
  const { tool_id, start_time, end_time, notes } = req.body;
  const user_name = req.user.username;

  const toolId = parseId(tool_id);
  if (!toolId || !start_time || !end_time) {
    return res.status(400).json({ error: 'tool_id, start_time, and end_time are required' });
  }
  if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ error: 'end_time must be after start_time' });
  }

  const tool = db().get('SELECT id FROM tools WHERE id = ?', [toolId]);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });

  const conflict = db().get(
    'SELECT id FROM reservations WHERE tool_id = ? AND start_time < ? AND end_time > ?',
    [toolId, end_time, start_time]
  );
  if (conflict) {
    return res.status(409).json({ error: 'This time slot conflicts with an existing reservation' });
  }

  const { lastInsertRowid } = db().run(
    'INSERT INTO reservations (tool_id, user_name, start_time, end_time, notes) VALUES (?, ?, ?, ?, ?)',
    [toolId, user_name, start_time, end_time, sanitizeText(notes) || null]
  );

  res.status(201).json(db().get(SELECT_COLS + ' WHERE r.id = ?', [lastInsertRowid]));
});

router.delete('/:id', requireAuth, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid reservation id' });
  const r = db().get('SELECT * FROM reservations WHERE id = ?', [id]);
  if (!r) return res.status(404).json({ error: 'Reservation not found' });
  if (!req.user.isAdmin && r.user_name.toLowerCase() !== req.user.username.toLowerCase()) {
    return res.status(403).json({ error: 'You can only cancel your own reservations' });
  }

  // Capture full details before deletion for the email
  const adminCancellingOther = req.user.isAdmin &&
    r.user_name.toLowerCase() !== req.user.username.toLowerCase();

  let emailPayload = null;
  if (adminCancellingOther) {
    const full = db().get(SELECT_COLS + ' WHERE r.id = ?', [r.id]);
    const user = db().get('SELECT email FROM users WHERE username = ?', [r.user_name]);
    if (user?.email) {
      emailPayload = {
        to:          user.email,
        displayName: full.display_name,
        toolName:    full.tool_name,
        toolLocation:full.tool_location,
        startTime:   r.start_time,
        endTime:     r.end_time,
        notes:       r.notes
      };
    }
  }

  db().run('DELETE FROM reservations WHERE id = ?', [id]);

  if (emailPayload) {
    sendCancellationEmail(emailPayload)
      .catch(err => console.error('[email] Failed to send cancellation notice:', err));
  }

  res.status(204).end();
});

module.exports = router;
