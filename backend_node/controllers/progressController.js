const { Progress, Mistake } = require('../models/Progress');
const Lesson = require('../models/Lesson');
const mongoose = require('mongoose');

// ─── Error Type → Arabic Mapping (Server-side mirror) ───
const ERROR_TYPE_MAP = {
    'madd':      { category: 'أحكام المدود', name: 'خطأ في المد' },
    'ghunna':    { category: 'الغنة وأحكام النون والميم', name: 'خطأ في الغنة' },
    'qalqala':   { category: 'القلقلة', name: 'خطأ في القلقلة' },
    'vowel':     { category: 'الحركات والتشكيل', name: 'خطأ في الحركات' },
    'tafkheem':  { category: 'التفخيم والترقيق', name: 'خطأ في التفخيم أو الترقيق' },
    'hams_jahr': { category: 'الهمس والجهر', name: 'خطأ في الهمس أو الجهر' },
    'shidda':    { category: 'الشدة والرخاوة', name: 'خطأ في الشدة أو الرخاوة' },
    'safeer':    { category: 'الصفير', name: 'خطأ في الصفير' },
    'istitala':  { category: 'الاستطالة', name: 'خطأ في الاستطالة' },
    'sifat':     { category: 'صفات الحروف', name: 'خطأ في صفة الحرف' },
    'phoneme':   { category: 'مخارج الحروف', name: 'خطأ في مخرج الحرف' },
    'deletion':  { category: 'أخطاء النطق', name: 'حذف حرف أو صوت' },
    'insertion': { category: 'أخطاء النطق', name: 'إضافة صوت زائد' },
};

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
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
};

// ─── Log a Mistake (Enhanced with full context) ───
exports.logMistake = async (req, res) => {
    try {
        const { error_type, surah_number, ayah_number, ayah_text, char_index, lesson_id, feedback } = req.body;
        const user_id = req.user;

        // Get Arabic names from map
        const ruleInfo = ERROR_TYPE_MAP[error_type] || { category: 'أخطاء أخرى', name: error_type };

        const newMistake = await Mistake.create({
            user: user_id,
            lesson: lesson_id || undefined,
            error_type,
            rule_category: ruleInfo.category,
            rule_name_ar: ruleInfo.name,
            surah_number: surah_number || null,
            ayah_number: ayah_number || null,
            ayah_text: ayah_text || '',
            char_index: char_index || null,
            feedback: feedback || `خطأ تجويدي: ${ruleInfo.name}`,
        });

        console.log(`[MISTAKE] Logged: ${error_type} (${ruleInfo.name}) - Surah ${surah_number}, Ayah ${ayah_number}`);
        res.json({ msg: 'Mistake logged', mistake: newMistake });
    } catch (err) {
        console.error('[MISTAKE] Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// ─── Get Summary for Dashboard (Enhanced) ───
exports.getProgressSummary = async (req, res) => {
    try {
        const user_id = new mongoose.Types.ObjectId(req.user);

        // Current progress overview
        const progressRecords = await Progress.find({ user: user_id });
        const completedCount = progressRecords.filter(p => p.status === 'completed').length;

        // Count unique verses practiced (from mistakes)
        const uniqueLessonsPracticed = await Progress.distinct('lesson', { user: user_id });
        const versesPracticed = uniqueLessonsPracticed.length;

        // Weekly Stats
        const weeklyStats = await Progress.aggregate([
            { $match: { user: user_id } },
            { $sort: { last_accessed: -1 } },
            { $limit: 7 },
            {
                $project: {
                    day_num: { $dayOfMonth: "$last_accessed" },
                    score: 1,
                    avg_score: "$score"
                }
            }
        ]);

        // Common mistakes by error_type (uncorrected only)
        const commonMistakes = await Mistake.aggregate([
            { $match: { user: user_id, is_corrected: { $ne: true } } },
            { $group: { 
                _id: "$error_type", 
                count: { $sum: 1 },
                rule_category: { $first: "$rule_category" },
                rule_name_ar: { $first: "$rule_name_ar" },
            }},
            { $project: { 
                name: "$_id", 
                count: 1, 
                rule_category: 1,
                rule_name_ar: 1,
                _id: 0 
            }},
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Total mistake count
        const totalMistakes = await Mistake.countDocuments({ user: user_id, is_corrected: { $ne: true } });
        const totalCorrected = await Mistake.countDocuments({ user: user_id, is_corrected: true });

        // Unique ayahs practiced
        const uniqueAyahs = await Mistake.distinct('ayah_number', { user: user_id, surah_number: { $exists: true } });

        res.json({
            weekly: weeklyStats,
            mistakes: commonMistakes,
            versesPracticed: uniqueAyahs.length || versesPracticed,
            completedLessons: completedCount,
            completedLessonIds: progressRecords.filter(p => p.status === 'completed').map(p => p.lesson.toString()),
            totalMistakes,
            totalCorrected,
            averageAccuracy: weeklyStats.length > 0
                ? Math.round(weeklyStats.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0) / weeklyStats.length)
                : 0
        });
    } catch (err) {
        console.error('[PROGRESS] Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// ─── Detailed Summary (for ProgressView) ───
exports.getDetailedSummary = async (req, res) => {
    try {
        const user_id = new mongoose.Types.ObjectId(req.user);

        // Mistakes grouped by category with correction stats
        const mistakesByCategory = await Mistake.aggregate([
            { $match: { user: user_id } },
            { $group: {
                _id: { error_type: "$error_type", rule_category: "$rule_category" },
                total: { $sum: 1 },
                corrected: { $sum: { $cond: ["$is_corrected", 1, 0] } },
                uncorrected: { $sum: { $cond: ["$is_corrected", 0, 1] } },
                rule_name_ar: { $first: "$rule_name_ar" },
                sample_ayahs: { $push: { surah: "$surah_number", ayah: "$ayah_number", text: "$ayah_text" } }
            }},
            { $project: {
                error_type: "$_id.error_type",
                rule_category: "$_id.rule_category",
                rule_name_ar: 1,
                total: 1,
                corrected: 1,
                uncorrected: 1,
                error_percentage: { $round: [{ $multiply: [{ $divide: ["$uncorrected", "$total"] }, 100] }, 1] },
                sample_ayahs: { $slice: ["$sample_ayahs", 5] },
                _id: 0
            }},
            { $sort: { uncorrected: -1 } }
        ]);

        // Daily performance (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyPerformance = await Mistake.aggregate([
            { $match: { user: user_id, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                mistakes: { $sum: 1 },
                corrected: { $sum: { $cond: ["$is_corrected", 1, 0] } },
            }},
            { $sort: { _id: 1 } },
            { $project: { date: "$_id", mistakes: 1, corrected: 1, _id: 0 } }
        ]);

        // Surahs practiced
        const surahStats = await Mistake.aggregate([
            { $match: { user: user_id, surah_number: { $exists: true, $ne: null } } },
            { $group: {
                _id: "$surah_number",
                total_mistakes: { $sum: 1 },
                corrected: { $sum: { $cond: ["$is_corrected", 1, 0] } },
                unique_ayahs: { $addToSet: "$ayah_number" }
            }},
            { $project: {
                surah_number: "$_id",
                total_mistakes: 1,
                corrected: 1,
                ayahs_count: { $size: "$unique_ayahs" },
                accuracy: { $round: [{ $multiply: [{ $divide: ["$corrected", "$total_mistakes"] }, 100] }, 1] },
                _id: 0
            }},
            { $sort: { surah_number: 1 } }
        ]);

        // Lesson completion (theoretical quizzes)
        const lessonProgress = await Progress.find({ user: user_id }).populate('lesson', 'title tajweed_rule sequence_order');

        const summary = {
            totalCategories: mistakesByCategory.length,
            totalMistakes: mistakesByCategory.reduce((acc, m) => acc + (m.total || 0), 0),
            totalCorrected: mistakesByCategory.reduce((acc, m) => acc + (m.corrected || 0), 0),
            totalUncorrected: mistakesByCategory.reduce((acc, m) => acc + (m.uncorrected || 0), 0),
        };

        res.json({
            summary,
            mistakesByCategory,
            dailyPerformance,
            surahStats,
            lessonProgress: lessonProgress.map(p => ({
                lessonTitle: p.lesson?.title || 'Unknown',
                tajweed_rule: p.lesson?.tajweed_rule || '',
                status: p.status,
                score: p.score,
                last_accessed: p.last_accessed
            }))
        });
    } catch (err) {
        console.error('[DETAILED SUMMARY] Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// ─── Get Practical Quiz Verses ───
exports.getPracticalQuizVerses = async (req, res) => {
    try {
        const user_id = new mongoose.Types.ObjectId(req.user);
        const { errorType } = req.params;

        // Get uncorrected mistakes for this error type, with ayah info
        const mistakes = await Mistake.find({
            user: user_id,
            error_type: errorType,
            is_corrected: { $ne: true },
            surah_number: { $exists: true, $ne: null },
            ayah_number: { $exists: true, $ne: null },
        }).sort({ createdAt: -1 });

        if (mistakes.length === 0) {
            return res.json({ verses: [], message: 'لا توجد أخطاء مسجلة لهذا الحكم' });
        }

        // Group by surah+ayah and collect char_indices
        const verseMap = new Map();
        for (const m of mistakes) {
            const key = `${m.surah_number}:${m.ayah_number}`;
            if (!verseMap.has(key)) {
                verseMap.set(key, {
                    surah_number: m.surah_number,
                    ayah_number: m.ayah_number,
                    ayah_text: m.ayah_text,
                    error_type: m.error_type,
                    char_indices: [],
                });
            }
            if (m.char_index !== null && m.char_index !== undefined) {
                if (!verseMap.get(key).char_indices.includes(m.char_index)) {
                    verseMap.get(key).char_indices.push(m.char_index);
                }
            }
        }

        // Ensure all verses have text (fetch from Muaalem API if missing)
        const uniqueVerses = [];
        for (const [key, verse] of verseMap.entries()) {
            if (!verse.ayah_text) {
                try {
                    const res = await fetch(`http://localhost:8888/api/uthmani?surah=${verse.surah_number}&from_aya=${verse.ayah_number}&to_aya=${verse.ayah_number}`);
                    const data = await res.json();
                    if (data.text) verse.ayah_text = data.text;
                } catch (err) {
                    console.warn(`[QUIZ] Could not fetch text for ${key}:`, err.message);
                }
            }
            uniqueVerses.push(verse);
        }

        // Select 50% (minimum 1)
        const quizCount = Math.max(1, Math.ceil(uniqueVerses.length * 0.5));
        
        // Shuffle and pick
        const shuffled = uniqueVerses.sort(() => Math.random() - 0.5);
        const selectedVerses = shuffled.slice(0, quizCount);

        console.log(`[QUIZ] ${errorType}: ${uniqueVerses.length} total verses, selected ${selectedVerses.length} for quiz`);

        res.json({
            verses: selectedVerses,
            totalErrors: uniqueVerses.length,
            quizSize: selectedVerses.length,
            errorType,
        });
    } catch (err) {
        console.error('[QUIZ] Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// ─── Mark Mistake as Corrected ───
exports.markMistakeCorrected = async (req, res) => {
    try {
        const user_id = req.user;
        const { error_type, surah_number, ayah_number } = req.body;

        // Mark ALL uncorrected mistakes for this user+error_type+ayah as corrected
        const result = await Mistake.updateMany(
            {
                user: user_id,
                error_type,
                surah_number,
                ayah_number,
                is_corrected: false,
            },
            {
                is_corrected: true,
                corrected_at: new Date(),
            }
        );

        console.log(`[CORRECTED] ${error_type} Surah ${surah_number}:${ayah_number} - ${result.modifiedCount} mistakes corrected`);
        res.json({ msg: 'Mistakes marked as corrected', correctedCount: result.modifiedCount });
    } catch (err) {
        console.error('[CORRECTED] Error:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};
