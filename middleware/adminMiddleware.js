const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.session.userId);
    if (user && user.role === 'admin') {
      return next();
    }
    res.status(403).render('error', { 
      message: 'Akses ditolak. Hanya untuk admin.',
      theme: req.session.theme || 'light'
    });
  } catch (error) {
    res.status(500).send('Server error');
  }
};

module.exports = isAdmin;