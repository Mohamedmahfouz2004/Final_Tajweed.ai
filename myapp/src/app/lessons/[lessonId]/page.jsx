'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Play, Mic, ArrowRight, Lock, ChevronDown } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const reveal  = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32 } } };

export default function LessonDetailPage({ params }) {
    const paramsResolved = React.use(params);
    const lessonId = paramsResolved.lessonId;
    const router = useRouter();
    const { lessons, fetchLessons } = useAppStore();

    const lesson = lessons.find(l => (l._id || l.id) === lessonId);

    React.useEffect(() => {
        if (lessons.length === 0) fetchLessons();
    }, [lessons.length, fetchLessons]);

    if (!lesson) {
        return (
            <div className="ui-panel" style={{ textAlign: 'center', padding: '52px 24px' }}>
                <h2 className="ui-title" style={{ fontSize: '2rem' }}>الدرس غير موجود</h2>
                <button onClick={() => router.push('/lessons')} className="ui-cta mt-4" type="button">
                    العودة للدروس
                </button>
            </div>
        );
    }

    return (
        <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.button
                variants={reveal}
                onClick={() => router.back()}
                className="ui-btn ui-btn--ghost mb-6"
                type="button"
            >
                <ArrowRight size={14} className="rotate-180" />
                <span>العودة للدروس</span>
            </motion.button>

            <motion.div variants={reveal} className="ui-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
                {lesson.video_url ? (
                    lesson.video_url.includes('youtube') || lesson.video_url.includes('youtu.be') ? (
                        <div className="w-full aspect-video">
                            <iframe
                                src={lesson.video_url
                                    .replace('watch?v=', 'embed/')
                                    .replace('youtu.be/', 'www.youtube.com/embed/')
                                    .replace('youtube.com/shorts/', 'youtube.com/embed/')
                                }
                                title={lesson.title}
                                className="w-full h-full border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        <div className="w-full aspect-video" style={{ background: 'var(--ink-900)' }}>
                            <video src={lesson.video_url} controls className="w-full h-full" style={{ objectFit: 'contain' }}>
                                المتصفح لا يدعم تشغيل الفيديو
                            </video>
                        </div>
                    )
                ) : (
                    <div className="w-full" style={{
                        background: 'var(--ink-900)', color: 'var(--parchment-50)',
                        height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                    }}>
                        <Play size={40} fill="currentColor" style={{ opacity: 0.45 }} />
                        <p style={{ opacity: 0.6, marginTop: 14 }}>لا يوجد فيديو لهذا الدرس</p>
                    </div>
                )}

                <div style={{ padding: 24, borderTop: '1px solid var(--sand-400)' }}>
                    <span className="ui-eyebrow"><span className="num">LESSON</span> · {lessonId.slice(-4)}</span>
                    <h2 className="ui-title" style={{ fontSize: '2.4rem', marginTop: 4 }}>{lesson.title}</h2>
                    <p style={{ color: 'var(--ink-700)', marginTop: 12, maxWidth: '60ch' }}>{lesson.description}</p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <motion.button
                    variants={reveal}
                    onClick={() => {
                        const { isLoggedIn, requireAuth } = useAppStore.getState();
                        if (!isLoggedIn) requireAuth();
                        else router.push(`/lessons/${lessonId}/quiz`);
                    }}
                    className="ui-tile"
                    type="button"
                >
                    <div className="ui-action-row" style={{ position: 'relative', zIndex: 1 }}>
                        <span className="ui-tile-icon" style={{ color: 'var(--emerald-700)' }}>
                            <BookOpen size={18} strokeWidth={2.2} />
                        </span>
                        <span className="ui-badge">QUIZ · THEORY</span>
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="ui-tile-title">القسم النظري</div>
                        <div className="ui-tile-desc">
                            مجموعة أسئلة تفاعلية للتأكد من فهمك لقواعد {lesson.title}.
                        </div>
                    </div>
                    <div className="ui-tile-cta">
                        START QUIZ <ChevronDown size={12} className="-rotate-90" />
                    </div>
                </motion.button>

                <motion.div variants={reveal} className="ui-tile" style={{ cursor: 'not-allowed', opacity: 0.62 }}>
                    <div className="ui-action-row" style={{ position: 'relative', zIndex: 1 }}>
                        <span className="ui-tile-icon" style={{ color: 'var(--brass-700)' }}>
                            <Mic size={18} strokeWidth={2.2} />
                        </span>
                        <span className="ui-badge ui-badge--gold">SOON</span>
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="ui-tile-title">القسم العملي</div>
                        <div className="ui-tile-desc">
                            تدريب صوتي على أمثلة من القرآن الكريم باستخدام محرك Muaalem.
                        </div>
                    </div>
                    <div className="ui-tile-cta">
                        COMING SOON <Lock size={12} />
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
