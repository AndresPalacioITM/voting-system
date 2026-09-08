const { Router } = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { getDb } = require('../db');

const router = Router();

// ── Validation chains ────────────────────────────────────────────────

const createCandidateRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),
  body('party')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Party must be 100 characters or fewer.'),
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

// POST /candidates — Register a new candidate
router.post('/', createCandidateRules, validate, (req, res) => {
  const { name, email, party } = req.body;
  const db = getDb();

  // Cross-role check: email must not belong to any voter
  if (email) {
    const existingVoter = db.prepare('SELECT id FROM voters WHERE email = ?').get(email);
    if (existingVoter) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'This email is already registered as a voter. A candidate cannot also be a voter.',
      });
    }
  }

  const result = db.prepare('INSERT INTO candidates (name, email, party) VALUES (?, ?, ?)').run(
    name,
    email || null,
    party || null,
  );
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(candidate);
});

// GET /candidates — List all candidates (with pagination)
router.get('/', paginationRules, validate, (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const db = getDb();

  res.json(paginate(db, 'candidates', page, limit));
});

// GET /candidates/:id — Get a candidate by ID
router.get('/:id', idParam, validate, (req, res) => {
  const candidate = getDb().prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
  if (!candidate) {
    return res.status(404).json({ error: 'Not Found', message: 'Candidate not found.' });
  }
  res.json(candidate);
});

// DELETE /candidates/:id — Delete a candidate
router.delete('/:id', idParam, validate, (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM candidates WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Not Found', message: 'Candidate not found.' });
  }
  res.status(204).end();
});

module.exports = router;
