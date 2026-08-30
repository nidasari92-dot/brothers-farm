const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token tidak ditemukan. Silakan login.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, role, salesId, supplierId }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

// Hanya admin yang boleh lewat
function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Akses ditolak. Hanya Admin yang diizinkan.' });
}

// Blokir akses ke data finansial sensitif untuk role 'user'
function blockSensitiveFinancial(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Akses ditolak. Dashboard finansial hanya untuk Admin.' });
}

module.exports = { authenticate, adminOnly, blockSensitiveFinancial };
