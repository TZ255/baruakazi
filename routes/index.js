const express = require('express');
const { ensureAuthenticated } = require('../middleware/auth');
const Job = require('../models/Job');
const File = require('../models/File');
const User = require('../models/User');
const router = express.Router();

// Homepage
router.get('/', async (req, res) => {
  try {
    // Fetch active jobs sorted by creation date (newest first)
    const jobs = await Job.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(3); // Limit to 3 jobs for better performance

    const site = {
      title: 'Tengeneza Barua ya Maombi ya Kazi Online | Bure, Haraka na Bora',
      description: `Tengeneza barua ya kazi yenye muundo mzuri na wa kipekee kwa kutumia AI. BARUA KAZI itakusaidia kuandika barua ya maombi ya kazi kwa haraka, bora, na inayolenga kazi unayotafuta Tanzania na kukuwezesha kuipakua katika PDF.`,
    }

    res.render('index', { site, jobs });
  } catch (error) {
    console.error('Error loading homepage:', error);
    res.sendStatus(500).send('Internal Server Error');
  }
});

// Dashboard (protected)
router.get('/dashboard', ensureAuthenticated, async (req, res) => {
  try {
    // Fetch recent cover letters for the user
    const recentCoverLetters = await File.find({
      userId: req.session.userId,
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fileId jobTitle companyName createdAt downloadCount');

    // Calculate stats
    const totalCoverLetters = await File.countDocuments({
      userId: req.session.userId,
      status: 'active'
    });

    const totalDownloads = await File.aggregate([
      { $match: { userId: req.session.userId, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$downloadCount' } } }
    ]);

    // Get this month's count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthCount = await File.countDocuments({
      userId: req.session.userId,
      status: 'active',
      createdAt: { $gte: startOfMonth }
    });

    const stats = {
      totalCoverLetters,
      totalDownloads: totalDownloads.length > 0 ? totalDownloads[0].total : 0,
      jobsApplied: totalCoverLetters, // Assuming each cover letter = one job application
      thisMonth: thisMonthCount
    };

    const site = {
      title: 'Dashboard - BARUA KAZI',
      description: `Barua zako, credits na maombi ya kazi.`,
    }

    res.render('dashboard', {
      site, recentCoverLetters, stats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('dashboard', {
      site,
      recentCoverLetters: [],
      stats: {
        totalCoverLetters: 0,
        totalDownloads: 0,
        jobsApplied: 0,
        thisMonth: 0
      }
    });
  }
});

// Blog/Jobs listing (public)
router.get('/job', async (req, res) => {
  try {
    // Fetch active jobs sorted by creation date (newest first)
    const jobs = await Job.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(12); // Limit to 12 jobs for better performance

    const site = {
      title: 'Ajira, Kazi na Nafasi - BARUA KAZI',
      description: `Angalia nafasi za ajira zilizotoka, namna ya kutengeneza cover letter nzuri na kuwa na nafasi nzuri zaidi ya kupata kazi`,
    }

    res.render('job', {
      site,
      jobs
    });
  } catch (error) {
    console.error('Blog page error:', error);
    // Fallback to empty jobs array if database error
    res.render('job', {
      site,
      jobs: []
    });
  }
});

// Individual job detail page
router.get('/job/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Find job by slug and increment views
    const job = await Job.findOne({ slug, isActive: true });

    if (!job) {
      req.flash('error', 'Job not found or no longer active');
      return res.redirect('/job');
    }

    // Increment view count
    await job.incrementViews();

    // Get related jobs (same company or similar job title)
    const relatedJobs = await Job.find({
      $and: [
        { _id: { $ne: job._id } }, // Exclude current job
        { isActive: true },
        {
          $or: [
            { companyName: job.companyName },
            { jobTitle: new RegExp(job.jobTitle.split(' ')[0], 'i') } // Match first word of job title
          ]
        }
      ]
    })
      .limit(3)
      .sort({ createdAt: -1 });

    const site = {
      title: `Nafasi ya Kazi | ${job.metaTitle || job.jobTitle} at ${job.companyName} - BARUA KAZI`,
      description: job.metaDescription || `Apply for ${job.jobTitle} position at ${job.companyName} in ${job.location}`
    }

    res.render('job-detail', {
      site,
      job,
      relatedJobs
    });
  } catch (error) {
    console.error('Job detail page error:', error);
    req.flash('error', 'Failed to load job details');
    res.redirect('/job');
  }
});

// Settings (protected)
router.get('/settings', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/dashboard');
    }

    const site = {
      title: 'Settings - BARUA KAZI',
      description: 'Manage your account settings and preferences.'
    }

    res.render('settings', {
      site,
      user
    });
  } catch (error) {
    console.error('Settings page error:', error);
    req.flash('error', 'Failed to load settings');
    res.redirect('/dashboard');
  }
});

// Update settings (protected)
router.post('/settings', ensureAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      req.flash('error', 'Name must be at least 2 characters long');
      return res.redirect('/settings');
    }

    await User.findByIdAndUpdate(req.session.userId, {
      name: name.trim()
    });

    req.flash('success', 'Settings updated successfully');
    res.redirect('/settings');
  } catch (error) {
    console.error('Settings update error:', error);
    req.flash('error', 'Failed to update settings');
    res.redirect('/settings');
  }
});

// Profile (protected)
router.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/dashboard');
    }

    // Get user stats
    const totalCoverLetters = await File.countDocuments({
      userId: req.session.userId,
      status: 'active'
    });

    const totalDownloads = await File.aggregate([
      { $match: { userId: req.session.userId, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$downloadCount' } } }
    ]);

    const userStats = {
      totalCoverLetters,
      totalDownloads: totalDownloads.length > 0 ? totalDownloads[0].total : 0
    };

    const site = {
      title: 'Profile - BARUA KAZI',
      description: 'View your profile information and account details.'
    }
    res.render('profile', {
      site,
      user,
      userStats
    });
  } catch (error) {
    console.error('Profile page error:', error);
    req.flash('error', 'Failed to load profile');
    res.redirect('/dashboard');
  }
});

module.exports = router;