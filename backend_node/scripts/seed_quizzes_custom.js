const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: '../.env' });

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tajweed_ai';
        console.log(`Connecting to: ${uri}`);
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
};

const Lesson = require('../models/Lesson');

const updateQuizzes = async () => {
    await connectDB();

    const noonId = '69acb568b4ab47fb1fc60580';
    const meemId = '69ad3386a713c68508ea4970';
    const maddId = '69e075c293a71c12d42abeb4';

    const quizzesNoon = [
        {
            question: "ما هو الحكم التجويدي في كلمة (مِن مَّاء)؟",
            options: ["أ) إظهار حلقي", "ب) إخفاء حقيقي", "ج) إدغام بغنة", "د) إقلاب"],
            correct_answer: "ج) إدغام بغنة"
        },
        {
            question: "حروف الإظهار الحلقي (الهمزة، الهاء، العين، الحاء، الغين، الخاء) تخرج من:",
            options: ["أ) الخيشوم", "ب) الشفتين", "ج) الحلق", "د) اللسان"],
            correct_answer: "ج) الحلق"
        },
        {
            question: "أي من الكلمات التالية تحتوي على حكم (إقلاب)؟",
            options: ["أ) مِنهُم", "ب) مَن بَخل", "ج) مَن يَعمل", "د) أنداداً"],
            correct_answer: "ب) مَن بَخل"
        },
        {
            question: "الإدغام بغير غنة يقع إذا جاء بعد النون الساكنة أو التنوين حرفا:",
            options: ["أ) الياء والواو", "ب) الميم والنون", "ج) اللام والراء", "د) الهمزة والهاء"],
            correct_answer: "ج) اللام والراء"
        },
        {
            question: "عدد حروف الإخفاء الحقيقي هو:",
            options: ["أ) 6 حروف", "ب) 4 حروف", "ج) 15 حرفاً", "د) 28 حرفاً"],
            correct_answer: "ج) 15 حرفاً"
        },
        {
            question: "ما هو حكم النون الساكنة في كلمة (يَنأون)؟",
            options: ["أ) إدغام", "ب) إظهار حلقي", "ج) إخفاء", "د) إقلاب"],
            correct_answer: "ب) إظهار حلقي"
        },
        {
            question: "تجمّع حروف الإدغام (بنوعيه) في كلمة:",
            options: ["أ) يرملون", "ب) ينمو", "ج) قطب جد", "د) سكت"],
            correct_answer: "أ) يرملون"
        },
        {
            question: "الإخفاء الحقيقي يكون حال النطق به في حالة بين:",
            options: ["أ) الإظهار والإدغام", "ب) الإدغام والإقلاب", "ج) الإظهار والإقلاب", "د) المد والقصر"],
            correct_answer: "أ) الإظهار والإدغام"
        },
        {
            question: "يسمى حكم الكلمات (دنيا، صنوان، قنوان، بنيان) بـ:",
            options: ["أ) إدغام ناقص", "ب) إخفاء حقيقي", "ج) إظهار مطلق", "د) إقلاب"],
            correct_answer: "ج) إظهار مطلق"
        },
        {
            question: "الغنة هي صفة لازمة تلحق بحرفي:",
            options: ["أ) الميم والنون", "ب) اللام والراء", "ج) الألف والواو", "د) العين والحاء"],
            correct_answer: "أ) الميم والنون"
        }
    ];

    const quizzesMeem = [
        {
            question: "للميم الساكنة عند التقائها بحروف الهجاء:",
            options: ["أ) حكمان فقط", "ب) ثلاثة أحكام", "ج) أربعة أحكام", "د) خمسة أحكام"],
            correct_answer: "ب) ثلاثة أحكام"
        },
        {
            question: "يقع الإخفاء الشفوي إذا جاء بعد الميم الساكنة حرف:",
            options: ["أ) الميم", "ب) النون", "ج) الباء", "د) الفاء"],
            correct_answer: "ج) الباء"
        },
        {
            question: "يسمى إدغام الميم الساكنة في ميم مثلها بـ:",
            options: ["أ) إدغام ناقص", "ب) إدغام مثلين صغير", "ج) إدغام شمسي", "د) إدغام كبير"],
            correct_answer: "ب) إدغام مثلين صغير"
        },
        {
            question: "جميع حروف الهجاء تعتبر حروف \"إظهار شفوي\" للميم الساكنة ما عدا:",
            options: ["أ) الميم والباء", "ب) الألف والواو", "ج) النون واللام", "د) الهاء والهمزة"],
            correct_answer: "أ) الميم والباء"
        },
        {
            question: "يجب الحذر من إخفاء الميم الساكنة إذا جاء بعدها واو أو فاء بسبب:",
            options: ["أ) تباعد المخرج", "ب) قرب المخرج واتحاده", "ج) صعوبة النطق", "د) كثرة الحروف"],
            correct_answer: "ب) قرب المخرج واتحاده"
        },
        {
            question: "في قوله تعالى (أَمْ لَمْ تُنذِرْهُمْ)، الميم في \"أَمْ\" حكمها:",
            options: ["أ) إخفاء شفوي", "ب) إدغام مثلين", "ج) إظهار شفوي", "د) إقلاب"],
            correct_answer: "ج) إظهار شفوي"
        },
        {
            question: "الميم الساكنة هي الميم:",
            options: ["أ) المكسورة", "ب) المشددة بالفتح", "ج) الخالية من الحركة (سكونها ثابت)", "د) المنونة"],
            correct_answer: "ج) الخالية من الحركة (سكونها ثابت)"
        },
        {
            question: "مخرج الميم الساكنة الأساسي هو:",
            options: ["أ) اللسان", "ب) الشفتان", "ج) الجوف", "د) الحلق"],
            correct_answer: "ب) الشفتان"
        },
        {
            question: "علامة الإظهار الشفوي في ضبط المصحف هي:",
            options: ["أ) وضع رأس حاء صغيرة فوق الميم", "ب) تجريد الميم من الحركة", "ج) تشديد الميم التالية", "د) قلب الميم إلى نون"],
            correct_answer: "أ) وضع رأس حاء صغيرة فوق الميم"
        },
        {
            question: "مقدار الغنة في إدغام المثلين الصغير هو:",
            options: ["أ) حركة واحدة", "ب) حركتان", "ج) ثلاث حركات", "د) أربع حركات"],
            correct_answer: "ب) حركتان"
        }
    ];

    const quizzesMadd = [
        {
            question: "حروف المد الثلاثة (الألف، الواو، الياء) مجموعة في كلمة:",
            options: ["أ) يرملون", "ب) نأى", "ج) وُا حِيها (أو واي)", "د) قطب جد"],
            correct_answer: "ج) وُا حِيها (أو واي)"
        },
        {
            question: "المد الذي لا يتوقف على سبب (همز أو سكون) يسمى:",
            options: ["أ) المد الفرعي", "ب) المد الطبيعي", "ج) المد العارض", "د) المد اللازم"],
            correct_answer: "ب) المد الطبيعي"
        },
        {
            question: "المد المتصل هو أن يأتي الهمز بعد حرف المد في:",
            options: ["أ) كلمة واحدة", "ب) كلمتين منفصلتين", "ج) أول السورة", "د) نهاية الآية فقط"],
            correct_answer: "أ) كلمة واحدة"
        },
        {
            question: "ما هو مقدار مد (المد المنفصل) عند من يمدّه؟",
            options: ["أ) حركتان فقط", "ب) 4 أو 5 حركات جوازاً", "ج) 6 حركات وجوباً", "د) لا يمد إطلاقاً"],
            correct_answer: "ب) 4 أو 5 حركات جوازاً"
        },
        {
            question: "المد اللازم يمد بمقدار:",
            options: ["أ) حركتين", "ب) 4 حركات", "ج) 6 حركات لزوماً", "د) 2 أو 4 حركات"],
            correct_answer: "ج) 6 حركات لزوماً"
        },
        {
            question: "مثال المد اللازم الكلمي المثقل كلمة:",
            options: ["أ) الحاقّة", "ب) يس", "ج) السوء", "د) جاء"],
            correct_answer: "أ) الحاقّة"
        },
        {
            question: "يسمى المد في كلمة (آمنوا) بمد:",
            options: ["أ) متصل", "ب) منفصل", "ج) بدل", "د) عارض للسكون"],
            correct_answer: "ج) بدل"
        },
        {
            question: "المد العارض للسكون يحدث بسبب:",
            options: ["أ) وجود همزة بعد حرف المد", "ب) وجود سكون أصلي", "ج) الوقف على كلمة آخرها حرف مد يليه حرف متحرك", "د) كسر ما قبل الياء"],
            correct_answer: "ج) الوقف على كلمة آخرها حرف مد يليه حرف متحرك"
        },
        {
            question: "المد في كلمة (طه) يمد حرف \"الطاء\" بمقدار:",
            options: ["أ) حركتين (مد طبيعي حرفي)", "ب) 4 حركات", "ج) 6 حركات", "د) لا يمد"],
            correct_answer: "أ) حركتين (مد طبيعي حرفي)"
        },
        {
            question: "أقوى أنواع المدود حسب قاعدة (أقوى المدود) هو:",
            options: ["أ) المد الطبيعي", "ب) المد المنفصل", "ج) المد اللازم", "د) مد البدل"],
            correct_answer: "ج) المد اللازم"
        }
    ];

    try {
        console.log('Updating Noon questions for ID:', noonId);
        const resNoon = await Lesson.updateOne({ _id: noonId }, { $set: { quizzes: quizzesNoon } });
        console.log('Noon status:', resNoon);
        
        console.log('Updating Meem questions for ID:', meemId);
        const resMeem = await Lesson.updateOne({ _id: meemId }, { $set: { quizzes: quizzesMeem } });
        console.log('Meem status:', resMeem);
        
        console.log('Updating Madd questions for ID:', maddId);
        const resMadd = await Lesson.updateOne({ _id: maddId }, { $set: { quizzes: quizzesMadd } });
        console.log('Madd status:', resMadd);
        
        console.log('Done! All quizzes updated.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

updateQuizzes();
