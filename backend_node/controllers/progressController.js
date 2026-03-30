const { Progress, Mistake } = require('../models/Progress');

// Update lesson progress (completed status)
exports.updateProgress = async (req, res) => {
    try {
        const { lesson_id, status, score } = req.body;
        const user_id = req.user; // from authorize middleware

        const result = await Progress.findOneAndUpdate(
            { user: user_id, lesson: lesson_id },
            {
                status,
                score,
                last_accessed: new Date()
            },
            { upsert: true, new: true }
        );

        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// Log a mistake
exports.logMistake = async (req, res) => {
    try {
        const { lesson_id, error_type, audio_url, feedback } = req.body;
        const user_id = req.user;

        const newMistake = await Mistake.create({
            user: user_id,
            lesson: lesson_id,
            error_type,
            audio_url,
            feedback
        });

        res.json({ msg: 'Attempt logged successfully', mistake: newMistake });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// Get summary for dashboard
exports.getProgressSummary = async (req, res) => {
    try {
        const user_id = req.user;

        // Accuracy over time (Simplified aggregation)
        // Groups by day of month for the last 7 entries
        const weeklyStats = await Progress.aggregate([
            { $match: { user: user_id } },
            { $sort: { last_accessed: -1 } },
            { $limit: 7 },
            {
                $project: {
                    day_num: { $dayOfMonth: "$last_accessed" },
                    score: 1
                }
            }
        ]);

        // Common mistakes count
        const commonMistakes = await Mistake.aggregate([
            { $match: { user: user_id } },
            { $group: { _id: "$error_type", count: { $sum: 1 } } },
            { $project: { name: "$_id", count: 1, _id: 0 } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            weekly: weeklyStats,
            mistakes: commonMistakes
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
