const express = require('express');
const router = express.Router();
const resumeRoutes = require('./resume');
const chatRoutes = require('./chat');
const transcriptRoutes = require('./transcript');
const practiceRoutes = require('./practiceRoutes');
const jobDescriptionRoutes = require('./jobDescription');

router.use('/resume', resumeRoutes);
router.use('/chat', chatRoutes);
router.use('/transcript', transcriptRoutes);
router.use('/practice', practiceRoutes);
router.use('/job-description', jobDescriptionRoutes);

module.exports = router;
