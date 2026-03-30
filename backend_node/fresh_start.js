const connectDB = require('./config/db');
const User = require('./models/User');
const Lesson = require('./models/Lesson');
const bcrypt = require('bcryptjs');

async function freshStart() {
    await connectDB();

    // 1. Clear everything
    await User.deleteMany({});
    await Lesson.deleteMany({});
    console.log('🧹 Cleared all data');

    // 2. Create admin with VERIFIED password
    const plainPassword = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // 3. VERIFY the hash works BEFORE saving
    const testResult = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('🔑 Hash verification BEFORE saving:', testResult ? '✅ PASS' : '❌ FAIL');

    if (!testResult) {
        console.error('❌ CRITICAL: bcrypt is broken! Cannot proceed.');
        process.exit(1);
    }

    // 4. Save admin
    const admin = await User.create({
        name: 'Tajweed Admin',
        email: 'admin@tajweed.ai',
        password: hashedPassword,
        role: 'admin',
        is_verified: true
    });

    // 5. Read it back and verify AGAIN
    const savedAdmin = await User.findById(admin._id);
    const finalCheck = await bcrypt.compare(plainPassword, savedAdmin.password);
    console.log('🔑 Hash verification AFTER saving:', finalCheck ? '✅ PASS' : '❌ FAIL');
    console.log('📧 Email:', savedAdmin.email);
    console.log('🔐 Role:', savedAdmin.role);

    // 6. Create a test user too
    const userSalt = await bcrypt.genSalt(10);
    const userHash = await bcrypt.hash('user123', userSalt);
    await User.create({
        name: 'Test User',
        email: 'user@tajweed.ai',
        password: userHash,
        role: 'user',
        is_verified: true
    });
    console.log('👤 Test user created: user@tajweed.ai / user123');

    // 7. Create sample lesson
    await Lesson.create({
        title: 'مقدمة في أحكام التجويد',
        description: 'تعريف بعلم التجويد وأهميته وفضله.',
        video_url: 'https://www.youtube.com/embed/example',
        sequence_order: 1,
        quizzes: [{
            question: 'ما معنى التجويد لغة؟',
            options: ['التحسين', 'الإسراع', 'الإهمال', 'التغيير'],
            correct_answer: 'التحسين',
            points: 10
        }]
    });
    console.log('📚 Sample lesson created');

    console.log('\n========================================');
    console.log('✅ FRESH START COMPLETE!');
    console.log('========================================');
    console.log('Admin Login:  admin@tajweed.ai / admin123');
    console.log('User Login:   user@tajweed.ai  / user123');
    console.log('========================================');

    process.exit(0);
}

freshStart().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
