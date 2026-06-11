'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ArrowRight, BookOpen, HelpCircle } from 'lucide-react';
import useAppStore from '../../../../store/useAppStore';

export default function LessonQuizPage({ params }) {
    const paramsResolved = React.use(params);
    const lessonId = paramsResolved.lessonId;
    const router = useRouter();
    const { lessons, fetchLessons, userProgress, updateSupabaseProgress, showToast } = useAppStore();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [savedAnswers, setSavedAnswers] = useState({});
    const [showScore, setShowScore] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    
    const isInitialized = useRef(false);

    useEffect(() => {
        if (lessons.length === 0) fetchLessons();
    }, [lessons.length, fetchLessons]);

    const lesson = lessons.find(l => (l._id || l.id) === lessonId);
    const lessonIdStr = lesson?._id?.toString() || lesson?.id?.toString();
    const questions = lesson?.quizzes || [];

    useEffect(() => {
        if (!lesson || questions.length === 0 || isInitialized.current) return;
        
        const details = userProgress?.lessonProgressDetails?.[lessonIdStr] || {};
        const dbAnswers = details.theoretical_answers || {};
        
        setSavedAnswers(dbAnswers);
        
        const answeredCount = Object.keys(dbAnswers).length;
        if (answeredCount >= questions.length) {
            setShowScore(true);
        } else {
            setCurrentQuestionIndex(answeredCount);
        }
        
        isInitialized.current = true;
    }, [lesson, questions.length, userProgress, lessonIdStr]);

    const currentQuestion = questions[currentQuestionIndex];

    const handleAnswerClick = (option) => {
        setSelectedAnswer(option);
        
        const newAnswers = { ...savedAnswers, [currentQuestionIndex]: option };
        setSavedAnswers(newAnswers);
        
        // Save intermediate to Supabase silently
        updateSupabaseProgress(lessonId, { theoretical_answers: { [currentQuestionIndex]: option } });
    };

    const handleNext = () => {
        if (!selectedAnswer) return;
        
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedAnswer(null);
        } else {
            finishQuiz(savedAnswers);
        }
    };

    const finishQuiz = (finalAnswers) => {
        let finalScore = 0;
        questions.forEach((q, idx) => {
            if (finalAnswers[idx] === q.correct_answer) finalScore++;
        });
        
        const percentage = Math.round((finalScore / questions.length) * 100);
        
        const details = useAppStore.getState().userProgress?.lessonProgressDetails?.[lessonIdStr] || {};
        const isTheoreticalDone = percentage >= 80;
        const passedPractical = details.practical_passed?.length || 0;
        const totalPractical = lesson.practical_tests?.length || 0;
        const isPracticalDone = totalPractical > 0 ? passedPractical === totalPractical : true;

        const isNowCompleted = isPracticalDone && isTheoreticalDone;

        showToast("جاري حفظ النتيجة...");
        updateSupabaseProgress(lessonId, { 
            theoretical_score: percentage,
            is_completed: isNowCompleted
        }).then(() => {
            showToast(isNowCompleted ? "أحسنت! أكملت الدرس بنجاح ✅" : "تم حفظ تقدمك");
            setShowScore(true);
        }).catch(err => {
            console.error("Save error:", err);
        });
    };

    const handleRetake = () => {
        updateSupabaseProgress(lessonId, { theoretical_score: 0, theoretical_answers: {}, is_completed: false }).then(() => {
            setSavedAnswers({});
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setShowScore(false);
            isInitialized.current = false;
        });
    };

    if (!lesson) {
        return (
            <div className="ui-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <BookOpen size={36} style={{ color: 'var(--ink-500)', margin: '0 auto 14px' }} />
                <h2 className="ui-title" style={{ fontSize: '1.8rem' }}>جاري تحميل بيانات الدرس...</h2>
                <button onClick={() => router.push('/lessons')} className="hm-quiet-btn group mt-4" type="button">
                    <ArrowRight size={14} className="rotate-180 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                    <span>العودة للدروس</span>
                </button>
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
                <button onClick={() => router.back()} className="hm-quiet-btn group" type="button">
                    <ArrowRight size={14} className="rotate-180 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                    <span>العودة للدرس</span>
                </button>
            </div>
        );
    }

    if (showScore) {
        let finalScore = 0;
        questions.forEach((q, idx) => {
            if (savedAnswers[idx] === q.correct_answer) finalScore++;
        });
        const percentage = Math.round((finalScore / questions.length) * 100);
        const isPassed = percentage >= 80;

        return (
            <div className={`ui-panel ${isPassed ? '' : 'ui-panel--dark'}`} style={{ padding: '48px 24px' }}>
                <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }} style={{ textAlign: 'center' }}>
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
                            ? `أحسنت! أجبت على ${finalScore} من ${questions.length} أسئلة بشكل صحيح.`
                            : `حصلت على ${finalScore} من ${questions.length}. تحتاج إلى 80% على الأقل للنجاح.`}
                    </p>

                    <div className="flex flex-wrap gap-4 justify-center mt-8">
                        {!isPassed && (
                            <button onClick={handleRetake} className="ui-cta group" type="button"
                                style={{ background: 'var(--rec-error)', color: 'white', padding: '14px 28px' }}>
                                إعادة المحاولة
                            </button>
                        )}
                        <button 
                            onClick={() => setShowReview(!showReview)} 
                            className="ui-btn ui-btn--ghost" 
                            type="button"
                            style={{ 
                                padding: '14px 28px', 
                                border: `1px solid ${isPassed ? 'var(--sand-400)' : 'var(--parchment-50)'}`, 
                                color: isPassed ? 'var(--ink-900)' : 'var(--parchment-50)',
                                background: 'transparent'
                            }}
                        >
                            {showReview ? 'إخفاء الإجابات' : 'مراجعة الإجابات'}
                        </button>
                        <button onClick={() => router.back()} className="ui-cta group" type="button"
                                style={{ background: 'var(--brass-500)', color: 'var(--ink-900)', padding: '14px 28px' }}>
                            <ArrowRight size={16} className="rotate-180 transform transition-transform duration-300 group-hover:-translate-x-1.5 ml-2" />
                            <span>العودة للدرس</span>
                        </button>
                    </div>
                </motion.div>

                {/* Review Section */}
                <AnimatePresence>
                    {showReview && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ marginTop: 40, borderTop: '1px solid var(--sand-400)', paddingTop: 32 }}>
                                <h3 className="ui-title mb-6" style={{ fontSize: '1.6rem', color: isPassed ? 'var(--ink-900)' : 'var(--parchment-50)' }}>مراجعة إجاباتك</h3>
                                <div className="grid gap-4">
                                    {questions.map((q, idx) => {
                                        const userAnswer = savedAnswers[idx];
                                        const isCorrect = userAnswer === q.correct_answer;
                                        return (
                                            <div key={idx} style={{ 
                                                padding: '16px 20px', 
                                                border: '1px solid var(--sand-400)', 
                                                borderRadius: '8px',
                                                background: isPassed ? 'var(--parchment-50)' : 'rgba(255,255,255,0.03)'
                                            }}>
                                                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                                    <span className="ui-eyebrow"><span className="num">{String(idx + 1).padStart(2, '0')}</span></span>
                                                    <p style={{ margin: 0, fontWeight: 600, color: isPassed ? 'var(--ink-900)' : 'var(--parchment-50)' }}>{q.question}</p>
                                                </div>
                                                <div style={{ 
                                                    padding: '10px 14px', 
                                                    borderRadius: '6px',
                                                    background: isCorrect ? 'var(--emerald-100)' : '#fee2e2',
                                                    color: isCorrect ? 'var(--emerald-800)' : '#991b1b',
                                                    border: `1px solid ${isCorrect ? 'var(--emerald-300)' : '#f87171'}`,
                                                    display: 'flex', alignItems: 'center', gap: 8
                                                }}>
                                                    {isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                                    <span style={{ fontWeight: 500 }}>{userAnswer || 'لم تتم الإجابة'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="ui-panel" style={{ padding: 28 }}>
            <div className="mb-5 flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span className="ui-badge ui-badge--gold">{lesson.title}</span>
                <span className="ui-eyebrow" style={{ letterSpacing: '2px' }}>
                  <span className="num">{String(currentQuestionIndex + 1).padStart(2, '0')}</span>
                  &nbsp;/&nbsp;<span className="num">{String(questions.length).padStart(2, '0')}</span>
                </span>
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
                        fontFamily: 'var(--font-ibm), Naskh, Arial, sans-serif',
                        fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                        fontWeight: 600,
                        lineHeight: 1.5,
                        color: 'var(--ink-900)',
                        marginBottom: 32,
                        textAlign: 'right'
                    }}>
                        {currentQuestion.question}
                    </h3>

                    <div className="grid gap-3">
                        {currentQuestion.options.map((option, index) => {
                            let style = {
                                background: 'var(--parchment-50)',
                                borderColor: 'var(--sand-400)',
                                color: 'var(--ink-900)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                borderRadius: '12px'
                            };

                            if (selectedAnswer === option) {
                                style = { 
                                    background: 'var(--brass-100)', 
                                    borderColor: 'var(--brass-500)', 
                                    color: 'var(--ink-900)', 
                                    boxShadow: '0 4px 12px rgba(212,175,55,0.15)',
                                    borderRadius: '12px'
                                };
                            }

                            return (
                                <motion.button
                                    key={index}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.06 }}
                                    whileHover={selectedAnswer !== option ? { scale: 1.01, borderColor: 'var(--brass-300)' } : {}}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => handleAnswerClick(option)}
                                    style={{
                                        padding: '16px 20px',
                                        textAlign: 'right',
                                        border: '2px solid',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-ibm), IBM Plex Sans Arabic, sans-serif',
                                        fontSize: '1.05rem',
                                        fontWeight: 500,
                                        transition: 'all 0.16s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        ...style,
                                    }}
                                >
                                    <span style={{ flex: 1, textAlign: 'right' }}>{option}</span>
                                    <div style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        border: `2px solid ${selectedAnswer === option ? 'var(--brass-600)' : 'var(--sand-400)'}`,
                                        background: selectedAnswer === option ? 'var(--brass-500)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {selectedAnswer === option && <CheckCircle size={14} color="var(--ink-900)" strokeWidth={3} />}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex justify-between gap-3 items-center" style={{ borderTop: '1px solid var(--sand-400)', paddingTop: '24px' }}>
                <button onClick={() => router.back()} className="ui-btn ui-btn--ghost group" type="button">
                    <ArrowRight size={14} className="transform transition-transform duration-300 group-hover:translate-x-1.5 ml-2" />
                    إلغاء
                </button>
                <AnimatePresence>
                    {selectedAnswer && (
                        <motion.button
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            onClick={handleNext}
                            className="ui-cta group"
                            style={{ padding: '12px 28px', background: 'var(--brass-500)', color: 'var(--ink-900)' }}
                            type="button"
                        >
                            {currentQuestionIndex < questions.length - 1 ? 'السؤال التالي' : 'عرض النتيجة'}
                            <ArrowRight size={16} className="-scale-x-100 transform transition-transform duration-300 group-hover:-translate-x-1.5 mr-2" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
