const { Router } = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validate = require('../middleware/validate');
const { getDb } = require('../db');
const config = require('../config');

const router = Router();

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 100 }).withMessage('Name must be 100 characters or fewer.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

// POST /auth/register — Create a user and return a token
router.post('/register', registerRules, validate, (req, res) => {
  const { name, email, password } = req.body;
  const db = getDb();

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, passwordHash);
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json({ user, token: signToken(user) });
});

// POST /auth/login — Authenticate and return a token
router.post('/login', loginRules, validate, (req, res) => {
  const { email, password } = req.body;
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid credentials.',
    });
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, created_at: user.created_at };
  res.json({ user: safeUser, token: signToken(safeUser) });
});

module.exports = router;
