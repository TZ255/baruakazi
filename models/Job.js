const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  companyAddress: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: Object,
    required: true
  },
  reportTo: {
    type: String,
    default: 'Hiring Manager'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  postedBy: {
    type: String,
    required: true // Will store admin email
  },
  views: {
    type: Number,
    default: 0
  },
  applications: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    unique: true,
  },
  metaTitle: String,
  metaDescription: String,
  keywords: [String]
}, {
  timestamps: true
});

// Generate slug before saving
jobSchema.pre('save', function(next) {
  if (!this.slug || this.isModified('jobTitle') || this.isModified('companyName')) {
    const slugBase = `${this.jobTitle}-${this.companyName}`
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Remove multiple hyphens
      .trim();
    
    // Add timestamp to ensure uniqueness
    this.slug = `${slugBase}-${Date.now()}`;
  }
  
  // Generate SEO metadata if not provided
  if (!this.metaTitle) {
    this.metaTitle = `${this.jobTitle} at ${this.companyName} - BARUA KAZI`;
  }
  
  if (!this.metaDescription) {
    const shortDesc = this.description.text.substring(0, 150).replace(/\s+$/, '');
    this.metaDescription = `Apply for ${this.jobTitle} position at ${this.companyName} in ${this.location}. ${shortDesc}...`;
  }
  
  next();
});

// Method to increment views
jobSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to increment applications
jobSchema.methods.incrementApplications = function() {
  this.applications += 1;
  return this.save();
};

module.exports = mongoose.model('Job', jobSchema);