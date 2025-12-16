const express = require('express');
const router = express.Router();
const resumeRoutes = require('./resume');
const chatRoutes = require('./chat');
const livekitRoutes = require('./livekit');
const transcriptRoutes = require('./transcript');
const practiceRoutes = require('./practiceRoutes');

router.use('/resume', resumeRoutes);
router.use('/chat', chatRoutes);
router.use('/livekit', livekitRoutes);
router.use('/transcript', transcriptRoutes);
router.use('/practice', practiceRoutes);

module.exports = router;
