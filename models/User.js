const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },
  hasPaid: {
    type: Boolean,
    default: false
  },
  paidUntil: {
    type: Date,
    default: null
  },
  paymentHistory: [{
    amount: {
      type: Number,
    },
    date: {
      type: Date
    }
  }],
  generateLimit: {
    type: Number,
    default: 3
  },
  authProvider: {
    type: String,
    enum: ['google'],
    default: 'google'
  }
}, {
  timestamps: true
});

// No password hashing needed - Firebase handles all authentication

module.exports = mongoose.model('User', userSchema);