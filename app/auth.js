const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cambia-esto-en-produccion-genera-con-openssl-rand-hex-32';
const JWT_EXPIRES_IN = '7d';
const COOKIE_NAME = 'retro_token';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function createToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, is_admin: user.is_admin ? 1 : 0 },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authRequired(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
  req.user = payload;
  next();
}

function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }
    next();
  });
}

function authOptional(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 4 && password.length <= 100;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  authRequired,
  adminRequired,
  authOptional,
  setAuthCookie,
  clearAuthCookie,
  validateUsername,
  validatePassword,
  COOKIE_NAME
};