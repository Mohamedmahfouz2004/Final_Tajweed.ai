const connectDB = require('../config/db');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const { Progress, Mistake } = require('../models/Progress');

async function viewData() {
    try {
        await connectDB();

        console.log('\n🔵 --- Users ---');
        const users = await User.find().select('name email role is_verified createdAt').sort({ createdAt: -1 });
        console.table(users.map(u => ({
            name: u.name,
            email: u.email,
            role: u.role,
            verified: u.is_verified,
            created: u.createdAt
        })));

        console.log('\n📚 --- Lessons ---');
        const lessons = await Lesson.find().select('title sequence_order description').sort({ sequence_order: 1 });
        console.table(lessons.map(l => ({
            title: l.title,
            order: l.sequence_order,
            quizzes: (l.quizzes || []).length
        })));

        console.log('\n📈 --- Progress Summary ---');
        const progress = await Progress.find().populate('user', 'name').populate('lesson', 'title');
        console.table(progress.map(p => ({
            user: p.user?.name || 'Unknown',
            lesson: p.lesson?.title || 'Unknown',
            status: p.status,
            score: p.score
        })));

        process.exit(0);
    } catch (err) {
        console.error('❌ Error viewing data:', err.message);
        process.exit(1);
    }
}

viewData();
