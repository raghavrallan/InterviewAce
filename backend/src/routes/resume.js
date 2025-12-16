const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const resumeService = require('../services/resumeService');
const logger = require('../utils/logger');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed.'));
    }
  }
});

// Upload and parse resume
router.post('/upload', upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info(`Processing resume: ${req.file.filename}`);

    const resumeData = await resumeService.parseResume(req.file.path);
    const summary = await resumeService.generateResumeSummary(resumeData.text);

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        text: resumeData.text,
        summary,
        metadata: resumeData.metadata
      }
    });
  } catch (error) {
    logger.error('Resume upload error:', error);
    next(error);
  }
});

// Get resume context for GPT
router.get('/context', async (req, res, next) => {
  try {
    const context = await resumeService.getStoredResumeContext();
    res.json({ success: true, data: context });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
