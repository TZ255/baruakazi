const express = require('express');
const { ensureAdmin } = require('../middleware/admin');
const Job = require('../models/Job');
const OpenAI = require('openai');
const { refineJobDescription } = require('../utils/openaiAdminJob');

const router = express.Router();

// Initialize OpenAI (will be used for formatting job descriptions)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET /admin - Admin dashboard
router.get('/admin', ensureAdmin, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ isActive: true });
    const totalViews = await Job.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const totalApplications = await Job.aggregate([
      { $group: { _id: null, totalApplications: { $sum: '$applications' } } }
    ]);

    const site = {
      title: 'Admin Dashboard - BARUA KAZI',
      description: 'Manage job posts and view analytics'
    }

    res.render('admin/dashboard', {
      site,
      jobs,
      stats: {
        totalJobs,
        activeJobs,
        totalViews: totalViews[0]?.totalViews || 0,
        totalApplications: totalApplications[0]?.totalApplications || 0
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error', 'Failed to load admin dashboard');
    res.redirect('/');
  }
});

// GET /admin/jobs/new - Show job creation form
router.get('/admin/jobs/new', ensureAdmin, (req, res) => {
  const site = {
    title: 'Post New Job - Admin',
    description: 'Create a new job posting'
  }
  res.render('admin/job-form', {
    site,
    job: null, // null means new job
    action: 'create'
  });
});

// POST /admin/jobs - Create new job
router.post('/admin/jobs', ensureAdmin, async (req, res) => {
  try {
    const {
      jobTitle,
      location,
      companyName,
      description,
      reportTo,
    } = req.body;

    // Format job description using OpenAI
    let formattedHTMLDescription = await refineJobDescription(description);

    // Create job post
    const job = new Job({
      jobTitle: jobTitle.trim(),
      location: location.trim(),
      companyName: companyName.trim(),
      description: {
        html: formattedHTMLDescription.html,
        text: formattedHTMLDescription.text
      },
      reportTo: reportTo || 'Hiring Manager',
      postedBy: req.session.user.email,
      keywords: [jobTitle.toLowerCase(), companyName.toLowerCase(), location.toLowerCase()]
    });

    await job.save();
    
    req.flash('success', 'Job posted successfully!');
    res.redirect('/admin');
  } catch (error) {
    console.error('Job creation error:', error);
    req.flash('error', 'Failed to create job post');
    res.redirect('/admin/jobs/new');
  }
});

// GET /admin/jobs/:id/edit - Show job edit form
router.get('/admin/jobs/:id/edit', ensureAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      req.flash('error', 'Job not found');
      return res.redirect('/admin');
    }

    const site = {
      title: 'Edit Job - Admin',
      description: 'Edit job posting'
    }

    res.render('admin/job-form', {
      site,
      job,
      action: 'edit'
    });
  } catch (error) {
    console.error('Job edit form error:', error);
    req.flash('error', 'Failed to load job for editing');
    res.redirect('/admin');
  }
});

// PUT /admin/jobs/:id - Update job
router.put('/admin/jobs/:id', ensureAdmin, async (req, res) => {
  try {
    const {
      jobTitle,
      location,
      companyName,
      description,
      reportTo,
      jobType,
      salaryMin,
      salaryMax,
      requirements,
      benefits,
      applicationDeadline,
      isActive
    } = req.body;

    const job = await Job.findById(req.params.id);
    if (!job) {
      req.flash('error', 'Job not found');
      return res.redirect('/admin');
    }

    // Update job fields
    job.jobTitle = jobTitle.trim();
    job.location = location.trim();
    job.companyName = companyName.trim();
    job.description = description;
    job.reportTo = reportTo || 'Hiring Manager';
    job.jobType = jobType;
    job.salary = {
      min: salaryMin ? parseInt(salaryMin) : undefined,
      max: salaryMax ? parseInt(salaryMax) : undefined,
      currency: 'TZS'
    };
    job.requirements = requirements ? requirements.split('\n').filter(req => req.trim()) : [];
    job.benefits = benefits ? benefits.split('\n').filter(benefit => benefit.trim()) : [];
    job.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : undefined;
    job.isActive = isActive === 'true';
    job.keywords = [jobTitle.toLowerCase(), companyName.toLowerCase(), location.toLowerCase()];

    await job.save();
    
    req.flash('success', 'Job updated successfully!');
    res.redirect('/admin');
  } catch (error) {
    console.error('Job update error:', error);
    req.flash('error', 'Failed to update job post');
    res.redirect(`/admin/jobs/${req.params.id}/edit`);
  }
});

// DELETE /admin/jobs/:id - Delete job
router.delete('/admin/jobs/:id', ensureAdmin, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Job deletion error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// POST /admin/jobs/:id/toggle - Toggle job active status
router.post('/admin/jobs/:id/toggle', ensureAdmin, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.isActive = !job.isActive;
    await job.save();

    res.json({ 
      success: true, 
      isActive: job.isActive,
      message: `Job ${job.isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Job toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle job status' });
  }
});

module.exports = router;