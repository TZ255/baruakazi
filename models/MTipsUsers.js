const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true, strict: false
});

const MTipsUsersModel = mongoose.connection.useDb('mikekatips').model('User', userSchema);

module.exports = MTipsUsersModel;