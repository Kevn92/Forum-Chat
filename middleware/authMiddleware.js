const isAuthenticated = (req, res, next) => {
  console.log('Session check:', req.session);
  console.log('UserId:', req.session?.userId);
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/auth/login');
};

const isGuest = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return next();
  }
  res.redirect('/forums');
};

module.exports = { isAuthenticated, isGuest };