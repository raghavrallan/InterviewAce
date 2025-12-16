const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practiceController');

// Generate a practice question
router.post('/generate-question', practiceController.generateQuestion);

// Evaluate an answer
router.post('/evaluate-answer', practiceController.evaluateAnswer);

module.exports = router;
