const jwt = require('jsonwebtoken');

// Falls back to a dev secret so the project runs out-of-the-box.
// For real deployments, set JWT_SECRET in backend/.env
const JWT_SECRET = process.env.JWT_SECRET || 'zepto_dev_secret_change_in_production';

function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
  }
}

module.exports = { authenticate, JWT_SECRET };
