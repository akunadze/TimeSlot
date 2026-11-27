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

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const PROD_ORIGIN  = process.env.CORS_ORIGIN || null;
const allowedOrigins = new Set([...DEV_ORIGINS, ...(PROD_ORIGIN ? [PROD_ORIGIN] : [])]);

// Same-origin requests (the frontend served by this server, incl. behind a reverse
// proxy like Caddy that forwards the Host header) are always allowed.
function isSameOrigin(origin, req) {
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

app.use(cors((req, cb) => {
  const origin = req.headers.origin;
  // Allow requests with no origin (curl, Postman), same-origin, and configured origins
  if (!origin || isSameOrigin(origin, req) || allowedOrigins.has(origin)) {
    return cb(null, { origin: true });
  }
  cb(new Error(`CORS: origin not allowed — ${origin}`));
}));

app.use(express.json());
// Express 5 leaves req.body undefined when no body is sent; keep route destructuring safe
app.use((req, _res, next) => { req.body ??= {}; next(); });

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
  app.use('/api/users', require('./routes/users'));
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
    app.get('/{*splat}', (_req, res) => {
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
