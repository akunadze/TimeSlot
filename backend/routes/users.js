const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get: db } = require('../db');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const { sanitizeText, parseId } = require('../utils/sanitize');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function userResponse(u) {
  return {
    id:        u.id,
    username:  u.username,
    fullName:  u.full_name  || null,
    email:     u.email      || null,
    isAdmin:   !!u.is_admin,
    createdAt: u.created_at
  };
}

// GET /api/users — list all users (admin only)
router.get('/', requireAdmin, (req, res) => {
  const users = db().all('SELECT * FROM users ORDER BY username');
  res.json(users.map(userResponse));
});

// PUT /api/users/:id — update profile fields + admin flag (admin only)
router.put('/:id', requireAdmin, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });

  const user = db().get('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { fullName, email, isAdmin } = req.body;

  const trimmedEmail = email?.trim() || null;
  if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (fullName && fullName.trim().length > 100) {
    return res.status(400).json({ error: 'Full name must be 100 characters or fewer' });
  }

  // Prevent removing admin from yourself
  if (user.id === req.user.userId && isAdmin === false) {
    return res.status(400).json({ error: 'You cannot remove your own admin role' });
  }

  db().run(
    'UPDATE users SET full_name = ?, email = ?, is_admin = ? WHERE id = ?',
    [sanitizeText(fullName) || null, trimmedEmail, isAdmin ? 1 : 0, id]
  );

  res.json(userResponse(db().get('SELECT * FROM users WHERE id = ?', [id])));
});

// PUT /api/users/:id/password — set password for any user (admin only)
router.put('/:id/password', requireAdmin, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });

  const user = db().get('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'newPassword is required' });
  if (newPassword.length < 8)  return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (newPassword.length > 72) return res.status(400).json({ error: 'Password must be 72 characters or fewer' });

  db().run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), id]);
  res.json({ message: 'Password updated' });
});

// DELETE /api/users/:id (admin only, cannot delete yourself)
router.delete('/:id', requireAdmin, (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });

  if (id === req.user.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const { changes } = db().run('DELETE FROM users WHERE id = ?', [id]);
  if (changes === 0) return res.status(404).json({ error: 'User not found' });
  res.status(204).end();
});

module.exports = router;
