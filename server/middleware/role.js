function requireRole(...roles) {
  return (req, res, next) => {
    try {
      const role = req.user?.role;
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ error: 'Permisos insuficientes' });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { requireRole };

