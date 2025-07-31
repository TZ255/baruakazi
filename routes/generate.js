const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { ensureAuthenticated } = require('../middleware/auth');
const PDFGenerator = require('../utils/pdfGenerator');
const Bin = require('../models/Bin');
const File = require('../models/File');
const admin = require('../config/firebase');
const generateCoverLetterAsync = require('../utils/generateCl');
const User = require('../models/User');
const Job = require('../models/Job');

const router = express.Router();

// Configure multer for file upload with debugging
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter called with:', file);
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Initialize services
const pdfGenerator = new PDFGenerator();

// GET /generate - Show form page
router.get('/generate', ensureAuthenticated, async (req, res) => {
  try {
    const { jobid } = req.query;
    const userInfo = await User.findById(req.session.userId);
    
    let jobData = null;
    
    // If jobid is provided, fetch the job data
    if (jobid) {
      try {
        jobData = await Job.findById(jobid);
        if (jobData && jobData.isActive) {
          // Increment applications count when someone starts generating for this job
          await jobData.incrementApplications();
        } else {
          // Job not found or inactive, clear jobData
          jobData = null;
        }
      } catch (jobError) {
        console.error('Error fetching job data:', jobError);
        // Continue without job data if there's an error
        jobData = null;
      }
    }

    const site = {
      title: 'Tengeneza Cover Letter Bure Online - BARUA KAZI',
      description: 'Tengeneza barua ya kazi online bure. Tengeneza barua nzuri na ya kipekee kwa maombi yako ya kazi.'
    }
    
    res.render('generate', {
      site,
      userInfo,
      jobData
    });
  } catch (error) {
    console.error('Error rendering generate page:', error);
    // Fallback render without job data
    res.render('generate', {
      site,
      userInfo: null,
      jobData: null
    });
  }
});

// Error handling middleware for multer
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 2MB limit' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files uploaded' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
}

// POST /generate - Process CV and generate cover letter
router.post('/generate', ensureAuthenticated, upload.single('cv'), handleMulterError, async (req, res) => {
  try {
    const { jobTitle, jobLocation, companyName, jobDescription } = req.body;
    const cvFile = req.file;

    // Validate user has enough generate limit
    const user = await User.findById(req.session.userId);
    if (user.generateLimit <= 0) {
      return res.status(400).json({ error: 'Malipo yako yamekwisha au huna credits za kutosha kutengeneza barua. Fanya malipo kuendelea' });
    }

    // Validate form data
    if (!jobTitle || !jobLocation || !companyName || !jobDescription) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!cvFile) {
      return res.status(400).json({ error: 'Please upload your CV (PDF only)' });
    }

    // Basic CV file validation
    if (cvFile.size > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 2MB' });
    }

    // Create bin document
    const binDoc = new Bin({
      userId: req.session.userId,
      userEmail: req.session.user.email,
      jobTitle,
      jobLocation,
      companyName,
      jobDescription,
      cvFileName: cvFile.originalname,
      status: 'processing'
    });

    await binDoc.save();

    // Generate cover letter with OpenAI (wait for completion)
    try {
      await generateCoverLetterAsync(binDoc._id, {
        jobTitle,
        jobLocation,
        companyName,
        jobDescription
      }, cvFile);

      // Return success response with redirect URL
      res.json({
        success: true,
        redirectUrl: `/generate/${binDoc._id}`,
        message: 'Cover letter generated successfully!'
      });
    } catch (error) {
      console.error('Generation failed:', error?.message);
      res.status(500).json({ error: 'Failed to generate cover letter. Please try again.' });
    }
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to process your request. Please try again.' });
  }
});

// GET /generate/:binId - Edit and review page
router.get('/generate/:binId', ensureAuthenticated, async (req, res) => {
  console.log(req.path)
  try {
    const { binId } = req.params;

    const binDoc = await Bin.findOne({
      _id: binId,
      userId: req.session.userId
    });

    if (!binDoc) {
      req.flash('error', 'Cover letter not found');
      return res.redirect('/generate');
    }

    // Debug logging to see what's in the bin document
    console.log('Bin document status:', binDoc.status);
    console.log('OpenAI response exists:', !!binDoc.openaiResponse);
    if (binDoc.openaiResponse) {
      console.log('OpenAI response structure:', Object.keys(binDoc.openaiResponse));
    }

    const site = {
      title: 'Angalia na Hariri Cover Letter - BARUA KAZI',
      description: 'Angalia na hariri cover letter yako. Rekebisha au ongeza vitu ulivyosahau'
    }

    res.render('generate-edit', {
      site,
      binDoc
    });

  } catch (error) {
    console.error('Edit page error:', error);
    req.flash('error', 'Failed to load cover letter');
    res.redirect('/generate');
  }
});

// POST /generate/:binId/finalize - Create final PDF
router.post('/generate/:binId/finalize', ensureAuthenticated, async (req, res) => {
  try {
    const { binId } = req.params;

    const binDoc = await Bin.findOne({
      _id: binId,
      userId: req.session.userId
    });

    if (!binDoc) {
      return res.status(404).json({ error: 'Cover letter not found' });
    }

    if (binDoc.status === 'error') {
      return res.status(400).json({ error: binDoc.errorMessage || 'Generation failed' });
    }

    if (binDoc.status === 'processing') {
      return res.status(202).json({ error: 'Still processing. Please wait.' });
    }

    // Get final content (edited or original)
    const finalContent = binDoc.isEdited ? binDoc.editedContent : binDoc.openaiResponse;

    // Update with any form edits
    if (req.body.userInfo || req.body.letterParts) {
      if (req.body.userInfo) {
        finalContent.userInfo = { ...finalContent.userInfo, ...req.body.userInfo };
      }
      if (req.body.letterParts) {
        finalContent.letterParts = { ...finalContent.letterParts, ...req.body.letterParts };
      }

      binDoc.editedContent = finalContent;
      binDoc.isEdited = true;
      await binDoc.save();
    }

    // Generate PDF
    const pdfBuffer = await pdfGenerator.generateCoverLetterPDF(finalContent);

    // Upload to Firebase Storage
    const fileId = uuidv4();
    const fileName = `generated-pdf/${fileId}.pdf`;

    const bucket = admin.storage().bucket();
    const file = bucket.file(fileName);

    console.log('Uploading to bucket:', bucket.name);
    console.log('File path:', fileName);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'public, max-age=604800', // 7 days cache
        metadata: {
          userId: req.session.userId.toString(),
          binId: binDoc._id.toString(),
          jobTitle: binDoc.jobTitle,
          companyName: binDoc.companyName,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          createdAt: new Date().toISOString()
        }
      }
    });

    // Make file publicly accessible
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    console.log('File uploaded successfully:', publicUrl);

    // Save to files collection
    const fileDoc = new File({
      fileId,
      userId: req.session.userId,
      userEmail: req.session.user.email,
      binId: binDoc._id,
      fileName: `${binDoc.companyName}_${binDoc.jobTitle}_Cover_Letter.pdf`,
      fileSize: pdfBuffer.length,
      firebaseUrl: publicUrl,
      firebasePath: fileName,
      jobTitle: binDoc.jobTitle,
      companyName: binDoc.companyName
    });

    await fileDoc.save();

    // Update user's generate limit
    const user = await User.findById(req.session.userId);
    if (user) {
      user.generateLimit -= 1; // Decrement by 1
      await user.save();
      console.log(`User ${user.email} generate limit updated to ${user.generateLimit}`);
    } else {
      console.error('User not found for generate limit update');
    }

    // return success response
    res.json({
      success: true,
      fileId: fileId,
      redirectUrl: `/generated/${fileId}`
    });
  } catch (error) {
    console.error('Finalization error:', error);
    res.status(500).json({ error: 'Failed to create final cover letter' });
  }
});


// API endpoint to check generation status
router.get('/generate/api/status/:binId', ensureAuthenticated, async (req, res) => {
  try {
    const { binId } = req.params;

    const binDoc = await Bin.findOne({
      _id: binId,
      userId: req.session.userId
    });

    if (!binDoc) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({
      status: binDoc.status,
      errorMessage: binDoc.errorMessage
    });

  } catch (error) {
    res.status(500).json({ error: 'Status check failed' });
  }
});

// GET /generated/:fileId - Final success page
router.get('/generated/:fileId', ensureAuthenticated, async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileDoc = await File.findOne({
      fileId,
      userId: req.session.userId
    });

    if (!fileDoc) {
      req.flash('error', 'File not found');
      return res.redirect('/generate');
    }

    const userInfo = await User.findById(req.session.userId);

    const site = {
      title: 'Barua imetengenezwa kikamilifu - BARUA KAZI',
      description: 'Barua yako imetengenezwa kikamilifu',
    }

    res.render('generated', {
      site,
      fileDoc,
      userInfo
    });

  } catch (error) {
    console.error('Generated page error:', error);
    req.flash('error', 'Failed to load file');
    res.redirect('/generate');
  }
});


router.get('/download/:fileId', ensureAuthenticated, async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileDoc = await File.findOne({
      fileId,
      userId: req.session.userId
    });

    if (!fileDoc) {
      return res.status(404).send('File not found');
    }

    // Increment download count
    await fileDoc.incrementDownload();

    // Redirect to Firebase URL
    res.redirect(fileDoc.firebaseUrl);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Download failed');
  }
});

module.exports = router;