const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { getDb, closeDb } = require('./db');
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');

const authRouter = require('./routes/auth');
const votersRouter = require('./routes/voters');
const candidatesRouter = require('./routes/candidates');
const votesRouter = require('./routes/votes');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Initialize DB on startup ─────────────────────────────────────────
getDb();

// ── Routes ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/voters', auth, votersRouter);
app.use('/candidates', auth, candidatesRouter);
app.use('/votes', auth, votesRouter);

// ── 404 catch-all ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist.' });
});

// ── Error handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(`[Voting API] Server running on http://localhost:${config.port}`);
  console.log(`[Voting API] Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Voting API] Shutting down...');
  server.close(() => {
    closeDb();
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    closeDb();
    process.exit(0);
  });
});

module.exports = app;
