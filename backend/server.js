const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'upgrade-insecure-requests': null
    }
  }
}));
app.use(cors());
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Initialise DB before handling requests
init().then(() => {
  app.use('/api/auth', authLimiter, require('./routes/auth'));
  app.use('/api/tools', require('./routes/tools'));
  app.use('/api/reservations', require('./routes/reservations'));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Serve frontend static files if dist/ exists
  const dist = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    // SPA fallback — all non-API routes return index.html
    app.get('*', (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`TimeSlot API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
