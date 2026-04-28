const express = require('express');
const router = express.Router();
const {
  shortenUrl,
  redirectUrl,
  getStats,
  getRecentUrls,
} = require('../controllers/urlController');

// API routes
router.post('/api/shorten', shortenUrl);
router.get('/api/stats/:shortCode', getStats);
router.get('/api/urls/recent', getRecentUrls);

// Redirect route — must be last to avoid catching API routes
router.get('/:shortCode', redirectUrl);

module.exports = router;
