const { Progress, Mistake } = require('../models/Progress');
const mongoose = require('mongoose');

exports.updateProgress = async (req, res) => {
    try {
        const { lesson_id, status, score } = req.body;
        const user_id = req.user; // from authorize middleware

        console.log(`[PROGRESS] Update request - User: ${user_id}, Lesson: ${lesson_id}, Status: ${status}, Score: ${score}`);

        if (!user_id || !lesson_id) {
            console.error('[PROGRESS] Missing user_id or lesson_id');
            return res.status(400).json({ msg: 'Missing user or lesson ID' });
        }

        const uId = new mongoose.Types.ObjectId(user_id);
        const lId = new mongoose.Types.ObjectId(lesson_id);

        const result = await Progress.findOneAndUpdate(
            { user: uId, lesson: lId },
            {
                status,
                score,
                last_accessed: new Date()
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`[PROGRESS] Save result: ${result ? 'Success' : 'Failed'}`);
        res.json(result);
    } catch (err) {
        console.error('[PROGRESS] Error in updateProgress:', err);
        res.status(500).json({
            msg: 'Server Error: ' + err.message,
            error: err.name,
            debug_info: {
                user_provided: user_id,
                lesson_provided: lesson_id
            }
        });
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
        const user_id = new mongoose.Types.ObjectId(req.user);

        // Current progress overview
        const progressRecords = await Progress.find({ user: user_id });
        console.log(`[PROGRESS] User: ${user_id}, Records found: ${progressRecords.length}`);
        const completedCount = progressRecords.filter(p => p.status === 'completed').length;

        // Count unique verses practiced (from mistakes or progress)
        const uniqueLessonsPracticed = await Progress.distinct('lesson', { user: user_id });
        console.log(`[PROGRESS] Unique lessons: ${uniqueLessonsPracticed.length}`);
        const versesPracticed = uniqueLessonsPracticed.length;

        // Weekly Stats: Groups by day of month for the last 7 entries
        const weeklyStats = await Progress.aggregate([
            { $match: { user: user_id } },
            { $sort: { last_accessed: -1 } },
            { $limit: 7 },
            {
                $project: {
                    day_num: { $dayOfMonth: "$last_accessed" },
                    score: 1,
                    avg_score: "$score" // Frontend expects avg_score
                }
            }
        ]);

        console.log(`[PROGRESS] Weekly stats count: ${weeklyStats.length}`);
        if (weeklyStats.length > 0) console.log(`[PROGRESS] First weekly score: ${weeklyStats[0].score}`);

        // Common mistakes count
        const commonMistakes = await Mistake.aggregate([
            { $match: { user: user_id } },
            { $group: { _id: "$error_type", count: { $sum: 1 } } },
            { $project: { name: "$_id", count: 1, _id: 0 } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        console.log(`[PROGRESS] Mistakes found: ${commonMistakes.length}`);

        res.json({
            weekly: weeklyStats, // matches frontend weeklyStats
            mistakes: commonMistakes, // matches frontend mistakeStats
            versesPracticed: versesPracticed,
            completedLessons: completedCount,
            completedLessonIds: progressRecords.filter(p => p.status === 'completed').map(p => p.lesson.toString()),
            averageAccuracy: weeklyStats.length > 0
                ? Math.round(weeklyStats.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0) / weeklyStats.length)
                : 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
