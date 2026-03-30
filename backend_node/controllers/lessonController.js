const Lesson = require('../models/Lesson');

// Get all lessons with basic info
exports.getAllLessons = async (req, res) => {
    try {
        const lessons = await Lesson.find().sort({ sequence_order: 1 });
        res.json(lessons);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// Get a single lesson with its quizzes
exports.getLessonById = async (req, res) => {
    try {
        const { id } = req.params;
        const lesson = await Lesson.findById(id);

        if (!lesson) {
            return res.status(404).json({ msg: 'Lesson not found' });
        }

        res.json(lesson);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
