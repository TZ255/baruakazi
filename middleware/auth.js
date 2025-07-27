// Firebase Authentication middleware

// Ensure user is authenticated (session-based)
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Please log in to access this page');
  res.redirect('/auth/login');
}

// Ensure user is not authenticated (for login/signup pages)
function ensureNotAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

// Optional authentication - sets user if logged in, but doesn't redirect
function optionalAuth(req, res, next) {
  // User is already set in res.locals.user by app.js middleware
  next();
}

module.exports = {
  ensureAuthenticated,
  ensureNotAuthenticated,
  optionalAuth
};