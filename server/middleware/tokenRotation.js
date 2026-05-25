const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function rotateToken(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (req.user && req.user.uid) {
      const newToken = jwt.sign(
        {
          uid: req.user.uid,
          storeId: req.user.storeId,
          role: req.user.role,
          username: req.user.username,
          is_super_admin: req.user.is_super_admin,
          jti: req.user.jti,
        },
        JWT_SECRET,
        { expiresIn: '12h' }
      );
      res.setHeader('X-New-Token', newToken);
    }
    return originalJson(body);
  };
  next();
}

module.exports = { rotateToken };
