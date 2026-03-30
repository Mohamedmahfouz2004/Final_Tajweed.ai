const connectDB = require('./config/db');
const User = require('./models/User');
const Lesson = require('./models/Lesson');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        await connectDB();

        // Clear existing data
        await User.deleteMany();
        await Lesson.deleteMany();

        console.log('🧹 Old data cleared');

        // Create Admin
        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('admin123', salt);

        await User.create({
            name: 'Tajweed Admin',
            email: 'admin@tajweed.ai',
            password: adminPassword,
            role: 'admin',
            is_verified: true
        });

        console.log('👤 Admin user created: admin@tajweed.ai / admin123');
        console.log('🔑 Password Hash used:', adminPassword);

        // Create Lessons
        const lessons = [
            {
                title: 'مقدمة في أحكام التجويد',
                description: 'تعريف بعلم التجويد وأهميته وفضله.',
                video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                sequence_order: 1,
                quizzes: [
                    {
                        question: 'ما معنى التجويد لغة؟',
                        options: ['التحسين', 'الإسراع', 'الإهمال', 'التغيير'],
                        correct_answer: 'التحسين',
                        points: 10
                    }
                ]
            }
        ];

        await Lesson.insertMany(lessons);
        console.log('📚 Sample lesson seeded');

        console.log('✅ Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
};

seedData();
