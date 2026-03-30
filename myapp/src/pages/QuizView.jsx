import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, BookOpen, HelpCircle } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const QuizView = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { lessons, fetchLessons } = useAppStore();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showScore, setShowScore] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswerChecked, setIsAnswerChecked] = useState(false);

    useEffect(() => {
        if (lessons.length === 0) fetchLessons();
    }, [lessons.length, fetchLessons]);

    const lesson = lessons.find(l => (l._id || l.id) === lessonId);
    const questions = lesson?.quizzes || [];
    const currentQuestion = questions[currentQuestionIndex];

    const handleAnswerClick = (option) => {
        if (isAnswerChecked) return;
        setSelectedAnswer(option);
        setIsAnswerChecked(true);
        if (option === currentQuestion.correct_answer) setScore(score + 1);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
            setIsAnswerChecked(false);
        } else {
            setShowScore(true);
        }
    };

    const handleRetake = () => {
        setCurrentQuestionIndex(0);
        setScore(0);
        setShowScore(false);
        setSelectedAnswer(null);
        setIsAnswerChecked(false);
    };

    if (!lesson) {
        return (
            <div className="glass-panel p-10 text-center">
                <div className="flex flex-col items-center gap-4">
                    <BookOpen size={48} className="text-gray-300" />
                    <h2 className="text-2xl font-amiri text-gray-700">جاري تحميل بيانات الدرس...</h2>
                    <button onClick={() => navigate('/lessons')} className="px-6 py-2 bg-primary text-white rounded-lg cursor-pointer border-none">العودة للدروس</button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="glass-panel p-10 text-center">
                <div className="flex flex-col items-center gap-4">
                    <HelpCircle size={48} className="text-amber-400 opacity-50" />
                    <h2 className="text-2xl font-amiri text-gray-700">لا يوجد اختبار متاح لهذا الدرس حالياً</h2>
                    <p className="text-gray-500 max-w-md mx-auto">المشرف لم يقم بإضافة أسئلة لهذا الاختبار بعد. يرجى مراجعة الدرس أو العودة لاحقاً.</p>
                    <button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary text-white rounded-lg cursor-pointer border-none mt-4">العودة للدرس</button>
                </div>
            </div>
        );
    }

    if (showScore) {
        const percentage = Math.round((score / questions.length) * 100);
        const isPassed = percentage >= 70;

        return (
            <div className="glass-panel p-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="text-center p-10"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
                        className={`w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center ${isPassed ? 'bg-emerald-50 border-4 border-emerald-100' : 'bg-red-50 border-4 border-red-100'}`}
                    >
                        {isPassed ? <CheckCircle size={56} color="#10B981" /> : <XCircle size={56} color="#DC2626" />}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                        <h2 className={`text-4xl font-amiri mb-2 ${isPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                            {isPassed ? 'مبارك! لقد اجتزت الاختبار' : 'للأسف، لم تجتز الاختبار'}
                        </h2>
                        <div className="text-6xl font-black mb-4 font-inter" style={{ color: isPassed ? '#059669' : '#DC2626' }}>
                            {percentage}%
                        </div>
                    </motion.div>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="text-lg text-gray-700 mb-8 max-w-md mx-auto">
                        {isPassed
                            ? `أحسنت صنعاً! لقد أجبت بشكل صحيح على ${score} من أصل ${questions.length} أسئلة.`
                            : `لقد حصلت على ${score} من أصل ${questions.length}. تحتاج إلى 70% على الأقل للنجاح.`
                        }
                    </motion.p>

                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="flex flex-wrap gap-4 justify-center">
                        {!isPassed && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRetake} className="px-8 py-3 bg-amber-500 border-none rounded-xl text-white font-bold cursor-pointer shadow-lg shadow-amber-200">
                                إعادة المحاولة
                            </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate(-1)} className="px-8 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-bold cursor-pointer">
                            العودة للدرس
                        </motion.button>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <div className="mb-6 flex justify-between items-center">
                    <span className="text-sm text-gray-500">سؤال {currentQuestionIndex + 1} من {questions.length}</span>
                    <span className="text-sm text-secondary font-bold">اختبار نظري: {lesson.title}</span>
                </div>

                <div className="w-full h-1 bg-gray-200 rounded mb-6 overflow-hidden">
                    <motion.div
                        animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="h-full rounded"
                        style={{ background: 'linear-gradient(90deg, #044D29, #D4AF37)' }}
                    />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestionIndex}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="mb-8">
                            <h3 className="text-xl font-amiri leading-relaxed text-gray-800">{currentQuestion.question}</h3>
                        </div>

                        <div className="grid gap-4">
                            {currentQuestion.options.map((option, index) => {
                                let bgClass = 'bg-white';
                                let borderColor = '#E5E7EB';
                                let textColor = '#374151';

                                if (isAnswerChecked) {
                                    if (option === currentQuestion.correct_answer) {
                                        bgClass = 'bg-emerald-50'; borderColor = '#10B981'; textColor = '#065F46';
                                    } else if (option === selectedAnswer) {
                                        bgClass = 'bg-red-50'; borderColor = '#EF4444'; textColor = '#991B1B';
                                    }
                                } else if (selectedAnswer === option) {
                                    borderColor = '#D4AF37'; bgClass = 'bg-amber-50';
                                }

                                return (
                                    <motion.button key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.08 }}
                                        whileHover={!isAnswerChecked ? { scale: 1.01, x: -4 } : {}}
                                        whileTap={!isAnswerChecked ? { scale: 0.99 } : {}}
                                        onClick={() => handleAnswerClick(option)}
                                        disabled={isAnswerChecked}
                                        className={`p-4 text-right ${bgClass} rounded-xl font-arabic text-base`}
                                        style={{
                                            border: `2px solid ${borderColor}`,
                                            cursor: isAnswerChecked ? 'default' : 'pointer',
                                            color: textColor,
                                        }}
                                    >
                                        {option}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="mt-8 flex justify-end gap-4">
                    <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-transparent text-gray-500 border-none cursor-pointer">إلغاء</button>
                    <AnimatePresence>
                        {isAnswerChecked && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleNext}
                                className="px-8 py-2.5 bg-primary text-white border-none rounded-lg cursor-pointer flex items-center gap-2"
                            >
                                {currentQuestionIndex < questions.length - 1 ? 'السؤال التالي' : 'عرض النتيجة'} <ArrowRight size={16} className="rotate-180" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default QuizView;
