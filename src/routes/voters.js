const { Router } = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { getDb } = require('../db');

const router = Router();

// ── Validation chains ────────────────────────────────────────────────

const createVoterRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),
];

const idParam = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer.'),
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
];

// ── Helpers ──────────────────────────────────────────────────────────

function paginate(db, table, page, limit) {
  const offset = (page - 1) * limit;
  const [{ total }] = db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).all();
  const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id ASC LIMIT ? OFFSET ?`).all(limit, offset);
  return { data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ── Routes ───────────────────────────────────────────────────────────

// POST /voters — Register a new voter
router.post('/', createVoterRules, validate, (req, res) => {
  const { name, email } = req.body;
  const db = getDb();

  // Cross-role check: email must not belong to any candidate
  const existingCandidate = db.prepare('SELECT id FROM candidates WHERE email = ?').get(email);
  if (existingCandidate) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'This email is already registered as a candidate. A voter cannot also be a candidate.',
    });
  }

  const result = db.prepare('INSERT INTO voters (name, email) VALUES (?, ?)').run(name, email);
  const voter = db.prepare('SELECT * FROM voters WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(voter);
});

// GET /voters — List all voters (with pagination)
router.get('/', paginationRules, validate, (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const db = getDb();

  res.json(paginate(db, 'voters', page, limit));
});

// GET /voters/:id — Get a voter by ID
router.get('/:id', idParam, validate, (req, res) => {
  const voter = getDb().prepare('SELECT * FROM voters WHERE id = ?').get(req.params.id);
  if (!voter) {
    return res.status(404).json({ error: 'Not Found', message: 'Voter not found.' });
  }
  res.json(voter);
});

// DELETE /voters/:id — Delete a voter
router.delete('/:id', idParam, validate, (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM voters WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not Found', message: 'Voter not found.' });
  }
  res.status(204).end();
});

module.exports = router;
