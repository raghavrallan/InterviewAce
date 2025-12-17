const express = require('express');
const router = express.Router();
const companyService = require('../services/companyService');
const logger = require('../utils/logger');

/**
 * Get list of all companies
 */
router.get('/list', async (req, res, next) => {
  try {
    logger.info('Fetching companies list...');
    const companies = await companyService.getAllCompanies();

    res.json({
      success: true,
      data: {
        companies,
        count: companies.length
      }
    });
  } catch (error) {
    logger.error('Get companies list error:', error);
    next(error);
  }
});

/**
 * Get detailed company information
 */
router.get('/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    logger.info(`Fetching company details for: ${companyId}`);

    const company = await companyService.getCompanyById(companyId);

    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    logger.error('Get company details error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * Get company interview tips
 */
router.get('/:companyId/tips', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    logger.info(`Fetching interview tips for: ${companyId}`);

    const tips = await companyService.getCompanyTips(companyId);

    res.json({
      success: true,
      data: tips
    });
  } catch (error) {
    logger.error('Get company tips error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * Get common company questions
 */
router.get('/:companyId/questions', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { type = 'all' } = req.query;

    logger.info(`Fetching ${type} questions for: ${companyId}`);

    const questions = await companyService.getCompanyQuestions(companyId, type);

    res.json({
      success: true,
      data: {
        companyId,
        type,
        questions
      }
    });
  } catch (error) {
    logger.error('Get company questions error:', error);
    if (error.message.includes('not found') || error.message.includes('Invalid question type')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * Generate AI-powered company-specific questions
 */
router.post('/:companyId/generate-questions', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { resumeText, count = 5, questionType = 'behavioral' } = req.body;

    logger.info(`Generating ${count} ${questionType} questions for: ${companyId}`);

    const result = await companyService.generateCompanyQuestions(
      companyId,
      resumeText,
      count,
      questionType
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Generate company questions error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * Assess culture fit for a company
 */
router.post('/:companyId/culture-fit', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { candidateAnswers } = req.body;

    if (!candidateAnswers) {
      return res.status(400).json({
        success: false,
        error: 'candidateAnswers is required'
      });
    }

    logger.info(`Assessing culture fit for: ${companyId}`);

    const assessment = await companyService.assessCultureFit(companyId, candidateAnswers);

    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    logger.error('Culture fit assessment error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
});

/**
 * Search companies
 */
router.get('/search/:query', async (req, res, next) => {
  try {
    const { query } = req.params;
    logger.info(`Searching companies: ${query}`);

    const results = await companyService.searchCompanies(query);

    res.json({
      success: true,
      data: {
        query,
        results,
        count: results.length
      }
    });
  } catch (error) {
    logger.error('Search companies error:', error);
    next(error);
  }
});

module.exports = router;
