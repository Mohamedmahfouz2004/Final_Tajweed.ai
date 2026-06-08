'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import LessonCard from '../../components/LessonCard';
import useAppStore from '../../store/useAppStore';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } };
const reveal  = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.25,0.1,0.25,1] } },
};

export default function LessonsPage() {
    const router = useRouter();
    const isLoggedIn = useAppStore(s => s.isLoggedIn);
    const requireAuth = useAppStore(s => s.requireAuth);
    const lessons = useAppStore(s => s.lessons);
    const fetchLessons = useAppStore(s => s.fetchLessons);
    const userProgress = useAppStore(s => s.userProgress);
    const fetchUserProgress = useAppStore(s => s.fetchUserProgress);

    React.useEffect(() => {
        fetchLessons();
        if (isLoggedIn) fetchUserProgress();
    }, [isLoggedIn, fetchLessons, fetchUserProgress]);

    return (
        <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={reveal}>
                <span className="ui-eyebrow">
                  <span className="num">03</span> &nbsp;//&nbsp; INTERACTIVE LIBRARY
                </span>
                <h1 className="ui-title">مكتبة الدروس</h1>
                <p className="ui-sub">
                  شروحات تفاعلية ومتدرّجة لأحكام التجويد بصيغة سهلة الفهم.
                </p>
            </motion.div>

            <div className="ui-divider" aria-hidden />

            {!isLoggedIn && (
                <motion.div variants={reveal} className="ui-panel ui-panel--dark mb-6"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 40, height: 40, background: 'var(--brass-500)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 10px 22px -10px rgba(15,26,13,0.35)', flexShrink: 0,
                        }}>
                            <BookOpen size={20} color="var(--ink-900)" strokeWidth={2.2} />
                        </div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.3rem', lineHeight: 1 }}>
                              سجّل دخولك لتتمكن من المشاهدة
                            </div>
                            <div style={{ color: 'rgba(245,239,227,0.7)', fontSize: '0.84rem', marginTop: 4 }}>
                              يجب تسجيل الدخول للوصول إلى محتوى الدروس والاختبارات.
                            </div>
                        </div>
                    </div>
                    <button onClick={requireAuth} className="ui-cta" type="button"
                        style={{ background: 'var(--brass-500)', color: 'var(--ink-900)' }}>
                        تسجيل الدخول
                    </button>
                </motion.div>
            )}

            <motion.div variants={reveal} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {lessons.length > 0 ? (
                    lessons.map((lesson, idx) => {
                        const isCompleted = userProgress?.completedLessonsList?.includes(lesson._id.toString());
                        return (
                            <motion.div key={lesson._id} variants={reveal}>
                                <LessonCard
                                    lesson={lesson}
                                    index={idx}
                                    isCompleted={isCompleted}
                                    onSelect={() => {
                                        const { isLoggedIn, requireAuth } = useAppStore.getState();
                                        if (!isLoggedIn) requireAuth();
                                        else router.push(`/lessons/${lesson._id}`);
                                    }}
                                />
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="col-span-full ui-panel" style={{ textAlign: 'center', padding: '52px 24px' }}>
                        <BookOpen size={36} style={{ color: 'var(--ink-500)', margin: '0 auto 14px' }} />
                        <p style={{ color: 'var(--ink-500)', fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.4rem' }}>
                          جاري تحميل الدروس...
                        </p>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
