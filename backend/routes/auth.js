const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get: db } = require('../db');
const { requireAuth, SECRET } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

function makeToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, isAdmin: !!user.is_admin },
    SECRET,
    { expiresIn: '7d' }
  );
}

function userResponse(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name || null,
    email: user.email || null,
    isAdmin: !!user.is_admin,
    createdAt: user.created_at
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, password, fullName } = req.body;
  if (!username || !username.trim()) return res.status(400).json({ error: 'Username is required' });
  if (username.trim().length > 50) return res.status(400).json({ error: 'Username must be 50 characters or fewer' });
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!fullName || !fullName.trim()) return res.status(400).json({ error: 'Full name is required' });
  if (fullName.trim().length > 100) return res.status(400).json({ error: 'Full name must be 100 characters or fewer' });

  const hash = bcrypt.hashSync(password, 10);
  try {
    const { lastInsertRowid } = db().run(
      'INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)',
      [sanitizeText(username), hash, sanitizeText(fullName)]
    );
    const user = db().get('SELECT * FROM users WHERE id = ?', [lastInsertRowid]);
    res.status(201).json({ token: makeToken(user), user: userResponse(user) });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already taken' });
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  const user = db().get('SELECT * FROM users WHERE username = ?', [username.trim()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  res.json({ token: makeToken(user), user: userResponse(user) });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db().get('SELECT * FROM users WHERE id = ?', [req.user.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(userResponse(user));
});

// PUT /api/auth/profile — update full name and email
router.put('/profile', requireAuth, (req, res) => {
  const { fullName, email } = req.body;
  const trimmedEmail = email?.trim() || null;
  if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (fullName && fullName.trim().length > 100) {
    return res.status(400).json({ error: 'Full name must be 100 characters or fewer' });
  }
  db().run(
    'UPDATE users SET full_name = ?, email = ? WHERE id = ?',
    [sanitizeText(fullName) || null, trimmedEmail, req.user.userId]
  );
  const user = db().get('SELECT * FROM users WHERE id = ?', [req.user.userId]);
  res.json(userResponse(user));
});

// PUT /api/auth/password — change password
router.put('/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  if (newPassword.length > 72) {
    return res.status(400).json({ error: 'Password must be 72 characters or fewer' });
  }

  const user = db().get('SELECT * FROM users WHERE id = ?', [req.user.userId]);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  db().run(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [bcrypt.hashSync(newPassword, 10), req.user.userId]
  );
  res.json({ message: 'Password updated successfully' });
});

module.exports = router;
