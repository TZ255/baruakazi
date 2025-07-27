const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
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
  binId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bin',
    required: true
  },
  // File information
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    default: 'application/pdf'
  },
  // Firebase storage
  firebaseUrl: {
    type: String,
    required: true
  },
  firebasePath: {
    type: String,
    required: true
  },
  // Generation metadata
  jobTitle: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  // Download tracking
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloaded: Date,
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true,
  collection: 'files'
});

// Indexes for performance
fileSchema.index({ userId: 1, createdAt: -1 });
fileSchema.index({ userEmail: 1, createdAt: -1 });
fileSchema.index({ fileId: 1 }, { unique: true });
fileSchema.index({ status: 1, createdAt: -1 });

// Methods
fileSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

// Generate a readable filename
fileSchema.methods.generateFileName = function() {
  const date = this.createdAt.toISOString().split('T')[0];
  const company = this.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  const title = this.jobTitle.replace(/[^a-zA-Z0-9]/g, '_');
  return `Cover_Letter_${company}_${title}_${date}.pdf`;
};

module.exports = mongoose.model('File', fileSchema);