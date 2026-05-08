const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const authorize = require('../middleware/authorize');

router.post('/update', authorize, progressController.updateProgress);
router.post('/log-mistake', authorize, progressController.logMistake);
router.get('/summary', authorize, progressController.getProgressSummary);
router.get('/detailed-summary', authorize, progressController.getDetailedSummary);
router.get('/practical-quiz/:errorType', authorize, progressController.getPracticalQuizVerses);
router.post('/mark-corrected', authorize, progressController.markMistakeCorrected);

module.exports = router;
