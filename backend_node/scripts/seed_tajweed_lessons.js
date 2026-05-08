/**
 * Seed Tajweed Lessons into MongoDB
 * Run: node scripts/seed_tajweed_lessons.js
 */
const connectDB = require('../config/db');
const Lesson = require('../models/Lesson');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const TAJWEED_LESSONS = [
    {
        title: 'مقدمة في أحكام التجويد',
        description: 'تعريف بعلم التجويد وأهميته وفضله وحكم تعلمه.',
        sequence_order: 1,
        tajweed_rule: 'intro',
        quizzes: [
            { question: 'ما معنى التجويد لغة؟', options: ['التحسين', 'الإسراع', 'الإهمال', 'التغيير'], correct_answer: 'التحسين', points: 10 },
            { question: 'ما حكم تعلم التجويد؟', options: ['فرض كفاية', 'فرض عين', 'مستحب', 'سنة'], correct_answer: 'فرض كفاية', points: 10 },
        ]
    },
    {
        title: 'مخارج الحروف',
        description: 'تعلم مخارج الحروف العربية الصحيحة من الحلق واللسان والشفتين.',
        sequence_order: 2,
        tajweed_rule: 'phoneme',
        quizzes: [
            { question: 'كم عدد مخارج الحروف الرئيسية؟', options: ['خمسة', 'أربعة', 'ثلاثة', 'ستة'], correct_answer: 'خمسة', points: 10 },
            { question: 'من أي مخرج يخرج حرف العين؟', options: ['الحلق', 'اللسان', 'الشفتان', 'الجوف'], correct_answer: 'الحلق', points: 10 },
        ]
    },
    {
        title: 'صفات الحروف',
        description: 'الصفات اللازمة والعارضة للحروف: الهمس والجهر والشدة والرخاوة.',
        sequence_order: 3,
        tajweed_rule: 'sifat',
        quizzes: [
            { question: 'ما هي حروف الهمس؟', options: ['فحثه شخص سكت', 'قطب جد', 'لن عمر', 'أجد قط بكت'], correct_answer: 'فحثه شخص سكت', points: 10 },
            { question: 'ما عكس صفة الشدة؟', options: ['الرخاوة', 'الجهر', 'الهمس', 'القلقلة'], correct_answer: 'الرخاوة', points: 10 },
        ]
    },
    {
        title: 'أحكام المد',
        description: 'المد الطبيعي والمد الفرعي بأنواعه: المتصل والمنفصل والعارض واللازم.',
        sequence_order: 4,
        tajweed_rule: 'madd',
        quizzes: [
            { question: 'كم مقدار المد الطبيعي؟', options: ['حركتان', 'أربع حركات', 'ست حركات', 'حركة واحدة'], correct_answer: 'حركتان', points: 10 },
            { question: 'ما هي حروف المد؟', options: ['الألف والواو والياء', 'النون والميم', 'الباء والتاء', 'الحاء والعين'], correct_answer: 'الألف والواو والياء', points: 10 },
        ]
    },
    {
        title: 'الغنة',
        description: 'تعريف الغنة ومراتبها وأحكامها في النون والميم المشددتين.',
        sequence_order: 5,
        tajweed_rule: 'ghunna',
        quizzes: [
            { question: 'ما هي الغنة؟', options: ['صوت يخرج من الخيشوم', 'صوت يخرج من الحلق', 'صوت يخرج من الشفتين', 'صوت يخرج من اللسان'], correct_answer: 'صوت يخرج من الخيشوم', points: 10 },
            { question: 'في أي حرفين تظهر الغنة بشكل أساسي؟', options: ['النون والميم', 'الباء والتاء', 'السين والصاد', 'القاف والكاف'], correct_answer: 'النون والميم', points: 10 },
        ]
    },
    {
        title: 'القلقلة',
        description: 'حروف القلقلة (قطب جد) ومراتبها: الصغرى والكبرى.',
        sequence_order: 6,
        tajweed_rule: 'qalqala',
        quizzes: [
            { question: 'ما هي حروف القلقلة؟', options: ['قطب جد', 'فحثه شخص سكت', 'لن عمر', 'أجد قط بكت'], correct_answer: 'قطب جد', points: 10 },
            { question: 'متى تكون القلقلة الكبرى؟', options: ['عند الوقف على الحرف', 'في وسط الكلمة', 'عند المد', 'عند الإدغام'], correct_answer: 'عند الوقف على الحرف', points: 10 },
        ]
    },
    {
        title: 'الحركات والتشكيل',
        description: 'الفتحة والضمة والكسرة والسكون والتنوين وأثرها على النطق.',
        sequence_order: 7,
        tajweed_rule: 'vowel',
        quizzes: [
            { question: 'كم عدد الحركات الأساسية في اللغة العربية؟', options: ['ثلاث', 'أربع', 'خمس', 'اثنتان'], correct_answer: 'ثلاث', points: 10 },
        ]
    },
    {
        title: 'أساسيات النطق',
        description: 'تجنب حذف الحروف أو إضافة أصوات زائدة أثناء التلاوة.',
        sequence_order: 8,
        tajweed_rule: 'deletion',
        quizzes: [
            { question: 'ما حكم حذف حرف من القرآن عمداً؟', options: ['حرام', 'مكروه', 'جائز', 'مستحب'], correct_answer: 'حرام', points: 10 },
        ]
    },
];

async function seedLessons() {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Don't delete existing lessons — only add missing ones
        for (const lesson of TAJWEED_LESSONS) {
            const existing = await Lesson.findOne({ tajweed_rule: lesson.tajweed_rule });
            if (!existing) {
                await Lesson.create(lesson);
                console.log(`✅ Created lesson: ${lesson.title}`);
            } else {
                console.log(`⏭️  Lesson already exists: ${lesson.title}`);
            }
        }

        console.log('\n🎉 Tajweed lessons seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

seedLessons();
