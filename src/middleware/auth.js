const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Auth middleware: verifies the Bearer JWT and attaches the user to req.user.
 */
function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Use: Authorization: Bearer <token>',
    });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token has expired.' : 'Invalid token.';
    return res.status(401).json({ error: 'Unauthorized', message });
  }
}

module.exports = auth;
