const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authorize = require('../middleware/authorize');

router.post('/update', authorize, progressController.updateProgress);
router.post('/log-mistake', authorize, progressController.logMistake);
router.get('/summary', authorize, progressController.getProgressSummary);

module.exports = router;
