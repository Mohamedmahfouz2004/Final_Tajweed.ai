const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const authorize = require('../middleware/authorize');

router.get('/', lessonController.getAllLessons);
router.get('/:id', authorize, lessonController.getLessonById);

module.exports = router;
