const express = require('express');
const User = require('../models/User');
const { verifyFirebaseToken, redirectIfAuthenticated } = require('../middleware/firebaseAuth');
const admin = require('../config/firebase');
const { getFirebaseClientConfig } = require('../config/firebaseClientConfig');
const router = express.Router();

// Note: redirectIfAuthenticated middleware is now imported from firebaseAuth.js

// GET /auth/login
router.get('/auth/login', redirectIfAuthenticated, (req, res) => {

  const site = {
    title: 'Ingia - BARUA KAZI',
    description: 'Ingia kwenye account yako ya BARUA KAZI na uanze kutengeneza barua za kazi.'
  }
  res.render('auth/login', {
    site,
    firebaseConfig: getFirebaseClientConfig()
  });
});

// POST /auth/login - Firebase authentication only
// Note: Login is now handled client-side via Firebase, then tokens sent to /auth/firebase-login

// POST /auth/firebase-login - Google OAuth only
router.post('/auth/firebase-login', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, email, name, firebase } = req.firebaseUser;
    
    // Only allow Google authentication
    if (firebase.sign_in_provider !== 'google.com') {
      return res.status(400).json({ error: 'Only Google authentication is allowed' });
    }
    
    const authProvider = 'google';
    
    // First check if user exists by firebaseUid
    let user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      // Check if user exists by email (for migration from old system)
      user = await User.findOne({ email: email });
      
      if (user) {
        // Update existing user with Firebase UID
        user.firebaseUid = uid;
        user.authProvider = authProvider;
        await user.save();
        console.log(`Existing user updated with Firebase UID:`, email);
      } else {
        // Create new user
        try {
          user = new User({
            firebaseUid: uid,
            email: email,
            name: name || email.split('@')[0],
            authProvider: authProvider
          });
          await user.save();
          console.log(`New Google user created:`, email);
        } catch (duplicateError) {
          // Handle race condition where user was created between checks
          if (duplicateError.code === 11000) {
            user = await User.findOne({ email: email });
            if (user) {
              user.firebaseUid = uid;
              user.authProvider = authProvider;
              await user.save();
            }
          } else {
            throw duplicateError;
          }
        }
      }
    }
    
    // Set session
    req.session.userId = user._id;
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
      firebaseUid: user.firebaseUid,
      hasPaid: user.hasPaid,
      paidUntil: user.paidUntil,
      generateLimit: user.generateLimit
    };
    
    res.json({ success: true, redirectUrl: '/dashboard' });
  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/signup
router.get('/auth/signup', redirectIfAuthenticated, (req, res) => {

  const site = {
    title: 'Jisajili - BARUA KAZI',
    description: 'Jisajili BARUA KAZI na uanze kutengeneza barua za kazi'
  }
  res.render('auth/signup', {
    site,
    firebaseConfig: getFirebaseClientConfig()
  });
});

// POST /auth/signup - Firebase authentication only
// Note: Signup is now handled client-side via Firebase, then tokens sent to /auth/firebase-login

// GET /auth/logout
router.get('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.redirect('/dashboard');
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    // Redirect to home with success message as query parameter
    res.redirect('/');
  });
});

module.exports = router;