const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Fetch user details including user_type
    db.get('SELECT id, email, name, user_type FROM users WHERE id = ?', [decoded.userId], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Attach user object to request
      req.user = {
        userId: user.id,
        email: user.email,
        name: user.name,
        userType: user.user_type
      };
      
      // Also set userId for backward compatibility
      req.userId = user.id;
      
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

const teacherOnlyMiddleware = (req, res, next) => {
  // If user info is already attached by authMiddleware, use it
  if (req.user && req.user.userType) {
    if (req.user.userType !== 'teacher') {
      return res.status(403).json({ error: 'Access denied. Teacher account required.' });
    }
    return next();
  }

  // Fallback: fetch user type from database
  db.get('SELECT user_type FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) {
      console.error('Teacher auth middleware error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.user_type !== 'teacher') {
      return res.status(403).json({ error: 'Access denied. Teacher account required.' });
    }

    next();
  });
};

module.exports = { authMiddleware, teacherOnlyMiddleware };