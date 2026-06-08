'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, BookOpen, HelpCircle } from 'lucide-react';
import useAppStore from '../../../../store/useAppStore';

export default function LessonQuizPage({ params }) {
    const paramsResolved = React.use(params);
    const lessonId = paramsResolved.lessonId;
    const router = useRouter();
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
            const finalScore = score;
            const percentage = Math.round((finalScore / questions.length) * 100);
            const status = percentage >= 70 ? 'completed' : 'in-progress';
            const { showToast, updateUserProgress } = useAppStore.getState();
            showToast("جاري حفظ النتيجة...");
            updateUserProgress(lessonId, status, percentage)
                .then(() => {
                    showToast(status === 'completed' ? "تم بنجاح! مبروك إكمال الدرس" : "تم حفظ تقدمك");
                })
                .catch(err => console.error("Save error:", err));
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
            <div className="ui-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <BookOpen size={36} style={{ color: 'var(--ink-500)', margin: '0 auto 14px' }} />
                <h2 className="ui-title" style={{ fontSize: '1.8rem' }}>جاري تحميل بيانات الدرس...</h2>
                <button onClick={() => router.push('/lessons')} className="ui-cta mt-4" type="button">العودة للدروس</button>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="ui-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <HelpCircle size={36} style={{ color: 'var(--brass-700)', margin: '0 auto 14px' }} />
                <h2 className="ui-title" style={{ fontSize: '1.8rem' }}>لا يوجد اختبار متاح لهذا الدرس حالياً</h2>
                <p style={{ color: 'var(--ink-700)', maxWidth: '40ch', margin: '14px auto 22px' }}>
                  المشرف لم يقم بإضافة أسئلة لهذا الاختبار بعد. يرجى مراجعة الدرس أو العودة لاحقاً.
                </p>
                <button onClick={() => router.back()} className="ui-cta" type="button">العودة للدرس</button>
            </div>
        );
    }

    if (showScore) {
        const percentage = Math.round((score / questions.length) * 100);
        const isPassed = percentage >= 70;

        return (
            <div className={`ui-panel ${isPassed ? '' : 'ui-panel--dark'}`} style={{ textAlign: 'center', padding: '48px 24px' }}>
                <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
                    <div style={{
                        width: 88, height: 88, margin: '0 auto 18px',
                        background: isPassed ? 'var(--emerald-700)' : 'var(--rec-error)',
                        color: 'var(--parchment-50)',
                        border: '1px solid var(--sand-400)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `6px 6px 0 0 ${isPassed ? 'var(--brass-500)' : 'var(--ink-900)'}`,
                    }}>
                        {isPassed ? <CheckCircle size={42} strokeWidth={2.4} /> : <XCircle size={42} strokeWidth={2.4} />}
                    </div>

                    <h2 className="ui-title" style={{ fontSize: '2.4rem', color: isPassed ? 'var(--ink-900)' : 'var(--parchment-50)' }}>
                        {isPassed ? 'مبارك!' : 'حاول مرة أخرى'}
                    </h2>
                    <div className="font-num" style={{
                        fontSize: '4rem', fontWeight: 700, lineHeight: 1, margin: '12px 0',
                        color: isPassed ? 'var(--emerald-700)' : 'var(--brass-500)',
                    }}>
                        {percentage}%
                    </div>

                    <p style={{ color: isPassed ? 'var(--ink-700)' : 'rgba(245,239,227,0.7)', maxWidth: '42ch', margin: '0 auto 24px' }}>
                        {isPassed
                            ? `أحسنت! أجبت على ${score} من ${questions.length} أسئلة بشكل صحيح.`
                            : `حصلت على ${score} من ${questions.length}. تحتاج إلى 70% على الأقل للنجاح.`}
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center">
                        {!isPassed && (
                            <button onClick={handleRetake} className="ui-cta" type="button"
                                style={{ background: 'var(--brass-500)', color: 'var(--ink-900)' }}>
                                إعادة المحاولة
                            </button>
                        )}
                        <button onClick={() => router.back()} className="ui-btn ui-btn--ghost" type="button">
                            العودة للدرس
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="ui-panel" style={{ padding: 28 }}>
            <div className="mb-5 flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span className="ui-eyebrow">
                  <span className="num">{String(currentQuestionIndex + 1).padStart(2, '0')}</span>
                  &nbsp;/&nbsp;{String(questions.length).padStart(2, '0')}
                </span>
                <span className="ui-badge ui-badge--gold">{lesson.title}</span>
            </div>

            <div className="ui-bar mb-6">
                <motion.div
                    animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="ui-bar-fill"
                />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestionIndex}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22 }}
                >
                    <h3 style={{
                        fontFamily: 'var(--font-rakkas), Rakkas',
                        fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                        lineHeight: 1.25,
                        color: 'var(--ink-900)',
                        marginBottom: 22,
                    }}>
                        {currentQuestion.question}
                    </h3>

                    <div className="grid gap-3">
                        {currentQuestion.options.map((option, index) => {
                            let style = {
                                background: 'var(--parchment-50)',
                                borderColor: 'var(--ink-900)',
                                color: 'var(--ink-900)',
                                boxShadow: 'none',
                            };

                            if (isAnswerChecked) {
                                if (option === currentQuestion.correct_answer) {
                                    style = { background: 'var(--emerald-700)', borderColor: 'var(--ink-900)', color: 'var(--parchment-50)', boxShadow: '0 14px 30px -10px rgba(212,175,55,0.5)' };
                                } else if (option === selectedAnswer) {
                                    style = { background: 'var(--rec-error)', borderColor: 'var(--ink-900)', color: 'var(--parchment-50)', boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)' };
                                } else {
                                    style.color = 'var(--ink-500)';
                                }
                            } else if (selectedAnswer === option) {
                                style = { background: 'var(--brass-300)', borderColor: 'var(--ink-900)', color: 'var(--ink-900)', boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)' };
                            }

                            return (
                                <motion.button
                                    key={index}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.06 }}
                                    whileHover={!isAnswerChecked ? { translateX: -3, translateY: -3, boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)' } : {}}
                                    onClick={() => handleAnswerClick(option)}
                                    disabled={isAnswerChecked}
                                    style={{
                                        padding: '14px 18px',
                                        textAlign: 'right',
                                        border: '2px solid',
                                        cursor: isAnswerChecked ? 'default' : 'pointer',
                                        fontFamily: 'var(--font-ibm), IBM Plex Sans Arabic, sans-serif',
                                        fontSize: '0.96rem',
                                        fontWeight: 500,
                                        transition: 'all 0.16s ease',
                                        ...style,
                                    }}
                                >
                                    {option}
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>

            <div className="mt-7 flex justify-end gap-3">
                <button onClick={() => router.back()} className="ui-btn ui-btn--ghost" type="button">إلغاء</button>
                <AnimatePresence>
                    {isAnswerChecked && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            onClick={handleNext}
                            className="ui-cta"
                            type="button"
                        >
                            {currentQuestionIndex < questions.length - 1 ? 'السؤال التالي' : 'عرض النتيجة'}
                            <ArrowRight size={14} className="rotate-180 arrow" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
