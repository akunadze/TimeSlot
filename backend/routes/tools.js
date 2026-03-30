const express = require('express');
const router = express.Router();
const { get: db } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { sanitizeText, parseId } = require('../utils/sanitize');

router.get('/', (req, res) => {
  const tools = db().all('SELECT * FROM tools ORDER BY name');
  res.json(tools);
});

router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid tool id' });
  const tool = db().get('SELECT * FROM tools WHERE id = ?', [id]);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  res.json(tool);
});

router.post('/', requireAdmin, (req, res) => {
  const { name, description, location } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tool name is required' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Tool name must be 100 characters or fewer' });
  }
  if (description && description.length > 500) {
    return res.status(400).json({ error: 'Description must be 500 characters or fewer' });
  }
  if (location && location.trim().length > 100) {
    return res.status(400).json({ error: 'Location must be 100 characters or fewer' });
  }
  try {
    const { lastInsertRowid } = db().run(
      'INSERT INTO tools (name, description, location) VALUES (?, ?, ?)',
      [sanitizeText(name), sanitizeText(description) || null, sanitizeText(location) || null]
    );
    const tool = db().get('SELECT * FROM tools WHERE id = ?', [lastInsertRowid]);
    res.status(201).json(tool);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A tool with that name already exists' });
    }
    throw err;
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid tool id' });
  const { name, description, location } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tool name is required' });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Tool name must be 100 characters or fewer' });
  }
  if (description && description.length > 500) {
    return res.status(400).json({ error: 'Description must be 500 characters or fewer' });
  }
  if (location && location.trim().length > 100) {
    return res.status(400).json({ error: 'Location must be 100 characters or fewer' });
  }
  try {
    const { changes } = db().run(
      'UPDATE tools SET name = ?, description = ?, location = ? WHERE id = ?',
      [sanitizeText(name), sanitizeText(description) || null, sanitizeText(location) || null, id]
    );
    if (changes === 0) return res.status(404).json({ error: 'Tool not found' });
    const tool = db().get('SELECT * FROM tools WHERE id = ?', [id]);
    res.json(tool);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A tool with that name already exists' });
    }
    throw err;
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid tool id' });
  const { changes } = db().run('DELETE FROM tools WHERE id = ?', [id]);
  if (changes === 0) return res.status(404).json({ error: 'Tool not found' });
  res.status(204).end();
});

module.exports = router;
