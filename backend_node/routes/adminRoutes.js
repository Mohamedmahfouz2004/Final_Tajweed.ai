const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const adminController = require('../controllers/adminController');
const authorize = require('../middleware/authorize');
const adminAuthorize = require('../middleware/adminAuthorize');

// Multer config for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'videos')),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB max

// All routes here require both authorization and admin privileges
router.use(authorize);
router.use(adminAuthorize);

// Dashboard Stats
router.get('/stats', adminController.getStats);

// Video Upload
router.post('/upload-video', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).json({ msg: 'No video file uploaded' });
    const videoUrl = `http://localhost:5000/uploads/videos/${req.file.filename}`;
    res.json({ url: videoUrl, filename: req.file.filename });
});

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Lessons
router.post('/lessons', adminController.createLesson);
router.put('/lessons/:id', adminController.updateLesson);
router.delete('/lessons/:id', adminController.deleteLesson);

// Quizzes
router.post('/quizzes', adminController.createQuiz);
router.delete('/quizzes/:id', adminController.deleteQuiz);

module.exports = router;
