const { Router } = require('express');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { getDb } = require('../db');

const router = Router();

// ── Validation chains ────────────────────────────────────────────────

const castVoteRules = [
  body('voter_id')
    .isInt({ min: 1 }).withMessage('voter_id must be a positive integer.'),
  body('candidate_id')
    .isInt({ min: 1 }).withMessage('candidate_id must be a positive integer.'),
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.'),
];

// ── Routes ───────────────────────────────────────────────────────────

// POST /votes — Cast a vote
router.post('/', castVoteRules, validate, (req, res) => {
  const { voter_id, candidate_id } = req.body;
  const db = getDb();

  // 1. Validate voter exists
  const voter = db.prepare('SELECT * FROM voters WHERE id = ?').get(voter_id);
  if (!voter) {
    return res.status(404).json({ error: 'Not Found', message: 'Voter not found.' });
  }

  // 2. Validate candidate exists
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidate_id);
  if (!candidate) {
    return res.status(404).json({ error: 'Not Found', message: 'Candidate not found.' });
  }

  // 3. Check voter hasn't already voted
  if (voter.has_voted) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'This voter has already cast their vote.',
    });
  }

  // 4. Cast vote in a transaction
  const castVote = db.transaction(() => {
    db.prepare('INSERT INTO votes (voter_id, candidate_id) VALUES (?, ?)').run(voter_id, candidate_id);
    db.prepare('UPDATE voters SET has_voted = 1 WHERE id = ?').run(voter_id);
    db.prepare('UPDATE candidates SET votes = votes + 1 WHERE id = ?').run(candidate_id);
  });

  castVote();

  const vote = db.prepare('SELECT * FROM votes WHERE voter_id = ?').get(voter_id);
  res.status(201).json(vote);
});

// GET /votes — List all votes (with pagination)
router.get('/', paginationRules, validate, (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const db = getDb();

  const offset = (page - 1) * limit;
  const [{ total }] = db.prepare('SELECT COUNT(*) AS total FROM votes').all();
  const rows = db.prepare(`
    SELECT v.*, voter.name AS voter_name, c.name AS candidate_name
    FROM votes v
    JOIN voters voter ON v.voter_id = voter.id
    JOIN candidates c ON v.candidate_id = c.id
    ORDER BY v.id ASC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /votes/statistics — Voting statistics
router.get('/statistics', (req, res) => {
  const db = getDb();

  const totalVotes = db.prepare('SELECT COUNT(*) AS total FROM votes').get().total;
  const totalVotersWhoVoted = db.prepare('SELECT COUNT(*) AS total FROM voters WHERE has_voted = 1').get().total;

  const candidatesWithStats = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.party,
      c.votes,
      CASE
        WHEN ? > 0 THEN ROUND((c.votes * 100.0) / ?, 2)
        ELSE 0
      END AS percentage
    FROM candidates c
    ORDER BY c.votes DESC
  `).all(totalVotes, totalVotes);

  res.json({
    total_votes: totalVotes,
    total_voters_who_voted: totalVotersWhoVoted,
    candidates: candidatesWithStats,
  });
});

module.exports = router;
