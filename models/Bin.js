const mongoose = require('mongoose');

const binSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  // Original form inputs
  jobTitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  jobLocation: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  jobDescription: {
    type: String,
    required: true,
    maxlength: 7500
  },
  // CV file information
  cvFileName: {
    type: String,
    required: true
  },
  // OpenAI response
  openaiResponse: {
    userInfo: {
      fullName: String,
      email: String,
      phone: String,
      address: String
    },
    jobInfo: {
      title: String,
      company: String,
      location: String,
      reportTo: String // Added field for report to person
    },
    letterParts: {
      greeting: String,
      introduction: String,
      body: String,
      closing: String,
      signature: String
    }
  },
  // Processing status
  status: {
    type: String,
    enum: ['processing', 'ready', 'error'],
    default: 'processing'
  },
  errorMessage: String,
  // Editing state
  isEdited: {
    type: Boolean,
    default: false
  },
  editedContent: {
    userInfo: {
      fullName: String,
      email: String,
      phone: String,
      address: String
    },
    jobInfo: {
      title: String,
      company: String,
      location: String,
      reportTo: String // Added field for report to person
    },
    letterParts: {
      greeting: String,
      introduction: String,
      body: String,
      closing: String,
      signature: String
    }
  }
}, {
  timestamps: true,
  collection: 'bins'
});

// Indexes for performance
binSchema.index({ userId: 1, createdAt: -1 });
binSchema.index({ userEmail: 1, createdAt: -1 });
binSchema.index({ status: 1, createdAt: -1 });

// Auto-cleanup: Remove bins older than 24 hours
binSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Bin', binSchema);