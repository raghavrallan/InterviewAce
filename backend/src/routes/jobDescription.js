const express = require('express');
const router = express.Router();
const multer = require('multer');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const jobDescriptionService = require('../services/jobDescriptionService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT are allowed.'));
    }
  }
});

/**
 * Parse job description text from uploaded file
 */
async function extractTextFromFile(file) {
  try {
    const filePath = path.join(process.cwd(), file.path);

    if (file.mimetype === 'application/pdf') {
      // Parse PDF
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Parse DOCX
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (file.mimetype === 'text/plain') {
      // Read TXT
      return await fs.readFile(filePath, 'utf-8');
    }

    throw new Error('Unsupported file type');
  } catch (error) {
    logger.error('Text extraction error:', error);
    throw error;
  } finally {
    // Clean up uploaded file
    try {
      await fs.unlink(path.join(process.cwd(), file.path));
    } catch (err) {
      logger.warn('Failed to delete temp file:', err);
    }
  }
}

/**
 * Upload and parse job description
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info(`Processing JD: ${req.file.originalname}`);

    // Extract text from file
    const jdText = await extractTextFromFile(req.file);

    // Parse job description
    const parsedJD = await jobDescriptionService.parseJobDescription(jdText);

    res.json({
      success: true,
      data: {
        rawText: jdText,
        parsed: parsedJD
      }
    });
  } catch (error) {
    logger.error('JD upload error:', error);
    next(error);
  }
});

/**
 * Parse JD from text (no file upload)
 */
router.post('/parse-text', async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Job description text is required' });
    }

    logger.info('Parsing JD from text...');

    const parsedJD = await jobDescriptionService.parseJobDescription(text);

    res.json({
      success: true,
      data: parsedJD
    });
  } catch (error) {
    logger.error('JD parsing error:', error);
    next(error);
  }
});

/**
 * Calculate skill match with resume
 */
router.post('/skill-match', async (req, res, next) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Resume text and job description are required' });
    }

    logger.info('Calculating skill match...');

    const skillMatch = await jobDescriptionService.calculateSkillMatch(resumeText, jobDescription);

    res.json({
      success: true,
      data: skillMatch
    });
  } catch (error) {
    logger.error('Skill match error:', error);
    next(error);
  }
});

/**
 * Generate tailored interview questions
 */
router.post('/tailored-questions', async (req, res, next) => {
  try {
    const { jobDescription, count } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    logger.info('Generating tailored questions...');

    const questions = await jobDescriptionService.generateTailoredQuestions(
      jobDescription,
      count || 5
    );

    res.json({
      success: true,
      data: {
        questions,
        count: questions.length
      }
    });
  } catch (error) {
    logger.error('Tailored questions error:', error);
    next(error);
  }
});

module.exports = router;
