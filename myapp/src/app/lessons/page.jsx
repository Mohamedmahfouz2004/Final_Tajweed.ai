'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Lock } from 'lucide-react';
import LessonCard from '../../components/LessonCard';
import useAppStore from '../../store/useAppStore';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } };
const reveal  = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.25,0.1,0.25,1] } },
};

export default function LessonsPage() {
    const router = useRouter();
    const lessons = useAppStore(s => s.lessons);
    const isLoadingLessons = useAppStore(s => s.isLoadingLessons);
    const fetchLessons = useAppStore(s => s.fetchLessons);
    const userProgress = useAppStore(s => s.userProgress);
    const fetchUserProgress = useAppStore(s => s.fetchUserProgress);
    const isLoggedIn = useAppStore(s => s.isLoggedIn);
    const requireAuth = useAppStore(s => s.requireAuth);

    React.useEffect(() => {
        fetchLessons();
        if (isLoggedIn) {
            fetchUserProgress();
        }
    }, [fetchLessons, fetchUserProgress, isLoggedIn]);

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ maxWidth: '1040px', margin: '0 auto', width: '100%' }}>
            <motion.div variants={reveal}>
                <span className="ui-eyebrow">
                  <span className="num">03</span> &nbsp;//&nbsp; INTERACTIVE LIBRARY
                </span>
                <h1 className="ui-title">مكتبة الدروس</h1>
                <p className="ui-sub">
                  شروحات تفاعلية ومتدرّجة لأحكام التجويد بصيغة سهلة الفهم.
                </p>

                {!isLoggedIn && (
                    <div className="mt-6 border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ backgroundColor: '#FFFDF8', borderColor: '#DDCDA6', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37' }}>
                                <Lock size={22} />
                            </div>
                            <div>
                                <h3 className="font-bold text-[15px]" style={{ color: 'var(--ink-900)', fontFamily: 'var(--font-ibm)' }}>سجل دخولك لتتمكن من المشاهدة</h3>
                                <p className="text-xs mt-1" style={{ color: 'var(--ink-600)', fontFamily: 'var(--font-ibm)' }}>يجب عليك تسجيل الدخول للوصول إلى محتوى الدروس والاختبارات التفاعلية.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => requireAuth()}
                            className="px-6 py-2.5 text-sm rounded-lg font-bold transition-all w-full sm:w-auto"
                            style={{ backgroundColor: '#1E3B22', color: '#FBF7EF', fontFamily: 'var(--font-ibm)' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#152918'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1E3B22'}
                        >
                            تسجيل الدخول
                        </button>
                    </div>
                )}
            </motion.div>

            <div className="ui-divider" aria-hidden />

            <motion.div variants={reveal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', alignItems: 'stretch' }}>
                {isLoadingLessons ? (
                    <div className="col-span-full ui-panel" style={{ textAlign: 'center', padding: '52px 24px' }}>
                        <BookOpen size={36} style={{ color: 'var(--ink-500)', margin: '0 auto 14px' }} />
                        <p style={{ color: 'var(--ink-500)', fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.4rem' }}>
                          جاري تحميل الدروس...
                        </p>
                    </div>
                ) : lessons.length > 0 ? (
                    lessons.map((lesson, idx) => {
                        const lessonIdStr = lesson._id?.toString() || lesson.id?.toString();
                        const details = userProgress?.lessonProgressDetails?.[lessonIdStr] || {};
                        const theoreticalScore = details.theoretical_score || 0;
                        const passedPractical = details.practical_passed?.length || 0;
                        const totalPractical = lesson.practical_tests?.length || 0;
                        
                        const isPracticalDone = totalPractical > 0 ? passedPractical === totalPractical : true;
                        const isTheoreticalDone = theoreticalScore >= 80;
                        const isCompleted = isPracticalDone && isTheoreticalDone;
                        const isVideoWatched = !!details.video_watched;
                        const answeredCount = Object.keys(details.theoretical_answers || {}).length;
                        const totalQuestions = lesson.quizzes?.length || 1;
                        const hasTheoreticalAttempt = answeredCount > 0 || theoreticalScore > 0;
                        const isTheoreticalInProgress = answeredCount > 0 && answeredCount < totalQuestions;

                        return (
                            <motion.div key={lessonIdStr || idx} variants={reveal} className="h-full w-full">
                                <LessonCard
                                    lesson={lesson}
                                    index={idx}
                                    isCompleted={isCompleted}
                                    isVideoWatched={isVideoWatched}
                                    theoreticalScore={theoreticalScore}
                                    hasTheoreticalAttempt={hasTheoreticalAttempt}
                                    isTheoreticalInProgress={isTheoreticalInProgress}
                                    onSelect={() => {
                                        if (!isLoggedIn) {
                                            requireAuth();
                                        } else {
                                            router.push(`/lessons/${lesson._id || lesson.id}`);
                                        }
                                    }}
                                />
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="col-span-full ui-panel" style={{ textAlign: 'center', padding: '52px 24px' }}>
                        <BookOpen size={36} style={{ color: 'var(--ink-400)', margin: '0 auto 14px', opacity: 0.5 }} />
                        <p style={{ color: 'var(--ink-500)', fontFamily: 'var(--font-ibm)', fontSize: '1.1rem', fontWeight: 500 }}>
                          لا توجد دروس متاحة حالياً
                        </p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
