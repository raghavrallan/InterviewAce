// Load environment variables FIRST before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 InterviewAce Backend running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;

