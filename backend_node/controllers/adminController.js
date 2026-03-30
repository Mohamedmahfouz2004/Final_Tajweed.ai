const Lesson = require('../models/Lesson');
const User = require('../models/User');
const { Progress } = require('../models/Progress');

// --- Dashboard Stats ---

exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalLessons = await Lesson.countDocuments();
        const totalProgress = await Progress.countDocuments();
        const completedProgress = await Progress.countDocuments({ status: 'completed' });

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: weekAgo } });

        res.json({
            totalUsers,
            totalAdmins,
            totalLessons,
            totalProgress,
            completedProgress,
            newUsersThisWeek,
            completionRate: totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// --- User Management ---

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ msg: 'Invalid role' });
        }
        const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user) {
            return res.status(400).json({ msg: 'Cannot delete your own account' });
        }
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ msg: 'User not found' });
        await Progress.deleteMany({ user: id });
        res.json({ msg: 'User deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// --- Lesson Management ---

exports.createLesson = async (req, res) => {
    try {
        const { title, description, video_url, sequence_order } = req.body;
        const newLesson = await Lesson.create({ title, description, video_url, sequence_order });
        res.json(newLesson);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.updateLesson = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, video_url, sequence_order } = req.body;
        const updatedLesson = await Lesson.findByIdAndUpdate(id, { title, description, video_url, sequence_order }, { new: true });
        res.json(updatedLesson);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.deleteLesson = async (req, res) => {
    try {
        const { id } = req.params;
        await Lesson.findByIdAndDelete(id);
        res.json({ msg: 'Lesson deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// --- Quiz Management ---

exports.createQuiz = async (req, res) => {
    try {
        const { lesson_id, question, options, correct_answer, points } = req.body;
        const updatedLesson = await Lesson.findByIdAndUpdate(lesson_id, { $push: { quizzes: { question, options, correct_answer, points } } }, { new: true });
        res.json(updatedLesson.quizzes[updatedLesson.quizzes.length - 1]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

exports.deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const lesson = await Lesson.findOne({ 'quizzes._id': id });
        if (!lesson) return res.status(404).json({ msg: 'Quiz not found' });
        lesson.quizzes.pull(id);
        await lesson.save();
        res.json({ msg: 'Quiz question deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
