// Admin middleware to check if user is authorized admin
const ensureAdmin = (req, res, next) => {
  // Check if user is logged in
  if (!req.session.user) {
    req.flash('error', 'Access denied. Please login first.');
    return res.redirect('/auth/login');
  }
  
  // Check if user email is the authorized admin
  if (req.session.user.email !== 'georgehmariki@gmail.com') {
    req.flash('error', 'Access denied. Admin privileges required.');
    return res.redirect('/');
  }
  
  next();
};

module.exports = { ensureAdmin };