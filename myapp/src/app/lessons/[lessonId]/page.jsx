'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Play, Mic, ArrowRight, Lock, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const reveal  = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.32 } } };

export default function LessonDetailPage({ params }) {
    const paramsResolved = React.use(params);
    const lessonId = paramsResolved.lessonId;
    const router = useRouter();
    const { lessons, fetchLessons, userProgress, updateSupabaseProgress, showToast, isLoggedIn } = useAppStore();

    const lesson = lessons.find(l => (l._id || l.id) === lessonId);
    const lessonIdStr = lesson?._id?.toString() || lesson?.id?.toString();
    const isVideoWatched = userProgress?.lessonProgressDetails?.[lessonIdStr]?.video_watched;

    const handleMarkWatched = () => {
        if (!isLoggedIn) {
            useAppStore.getState().requireAuth();
            return;
        }
        updateSupabaseProgress(lessonId, { video_watched: true }).then(() => {
            showToast('تم تسجيل المشاهدة ✅');
        });
    };

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
                className="hm-quiet-btn group mb-6"
                type="button"
            >
                <ArrowRight size={14} className="rotate-180 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="ui-eyebrow"><span className="num">الدرس</span> {lesson.sequence_order}</span>
                    </div>
                    <h2 className="ui-title" style={{ fontSize: '2.4rem', marginTop: 8 }}>{lesson.title}</h2>
                    <p style={{ color: 'var(--ink-700)', marginTop: 12, maxWidth: '60ch' }}>{lesson.description}</p>
                    
                    <div className="mt-6 flex gap-4 items-center">
                        <button
                            onClick={handleMarkWatched}
                            disabled={isVideoWatched}
                            className="ui-cta flex items-center gap-2 transition-all"
                            style={{
                                background: isVideoWatched ? 'var(--emerald-100)' : 'var(--brass-500)',
                                color: isVideoWatched ? 'var(--emerald-800)' : 'var(--ink-900)',
                                padding: '8px 20px',
                                fontSize: '0.9rem',
                                border: isVideoWatched ? '1px solid var(--emerald-300)' : 'none',
                                cursor: isVideoWatched ? 'default' : 'pointer'
                            }}
                        >
                            <CheckCircle size={18} />
                            {isVideoWatched ? 'تمت مشاهدة الفيديو' : 'تحديد كمقروء / مشاهد'}
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <motion.div variants={reveal} style={{ position: 'relative' }} className="h-full">
                    {/* Theoretical Progress Bubble */}
                    {(() => {
                        const score = userProgress?.lessonProgressDetails?.[lessonIdStr]?.theoretical_score;
                        const answers = userProgress?.lessonProgressDetails?.[lessonIdStr]?.theoretical_answers || {};
                        const isComplete = score !== undefined && score >= 70;
                        const inProgress = Object.keys(answers).length > 0 && !isComplete;
                        
                        if (!isComplete && !inProgress) return null;
                        
                        return (
                            <div style={{
                                position: 'absolute',
                                top: -14,
                                left: -14,
                                background: isComplete ? '#10b981' : '#f59e0b',
                                color: '#ffffff',
                                borderRadius: '999px',
                                padding: '6px 14px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                boxShadow: `0 4px 12px ${isComplete ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                direction: 'ltr'
                            }}>
                                {isComplete ? '✅ ' + score + '%' : '⏳'}
                            </div>
                        );
                    })()}
                    <button
                        onClick={() => {
                            const { isLoggedIn, requireAuth } = useAppStore.getState();
                            if (!isLoggedIn) requireAuth();
                            else router.push(`/lessons/${lessonId}/quiz`);
                        }}
                        className="ui-tile group w-full h-full text-start"
                        type="button"
                    >
                        <div className="ui-action-row" style={{ position: 'relative', zIndex: 1 }}>
                            <span className="ui-tile-icon" style={{ color: 'var(--emerald-700)' }}>
                                <BookOpen size={18} strokeWidth={2.2} />
                            </span>
                            <span className="ui-badge">اختبار نظري</span>
                        </div>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div className="ui-tile-title">القسم النظري</div>
                            <div className="ui-tile-desc">
                                مجموعة أسئلة تفاعلية للتأكد من فهمك لقواعد {lesson.title}.
                            </div>
                        </div>
                        <div style={{ marginTop: 'auto', paddingTop: '24px', alignSelf: 'flex-start' }}>
                            <span className="hm-quiet-btn" style={{ fontSize: '0.82rem', pointerEvents: 'none' }}>
                                {(() => {
                                    const score = userProgress?.lessonProgressDetails?.[lessonIdStr]?.theoretical_score;
                                    const answers = userProgress?.lessonProgressDetails?.[lessonIdStr]?.theoretical_answers || {};
                                    if (score !== undefined) {
                                        if (score >= 70) return `الدرجة: ${score}% - مراجعة الإجابات`;
                                        return `إعادة المحاولة (${score}%)`;
                                    }
                                    if (Object.keys(answers).length > 0) return 'متابعة الاختبار';
                                    return 'امتحن';
                                })()}
                                <ChevronRight size={13} className="-scale-x-100 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                            </span>
                        </div>
                    </button>
                </motion.div>

                <motion.div variants={reveal} style={{ position: 'relative' }}>
                    {/* Practical Progress Bubble */}
                    {lesson?.practical_tests?.length > 0 && (() => {
                        const completedCount = userProgress?.practicalProgress?.[lessonId]?.length || 0;
                        const totalCount = lesson.practical_tests.length;
                        const isPracticalComplete = completedCount === totalCount;
                        return (
                            <div style={{
                                position: 'absolute',
                                top: -14,
                                left: -14,
                                background: isPracticalComplete ? '#10b981' : '#f59e0b', // Green if complete, Amber if in progress
                                color: '#ffffff',
                                borderRadius: '999px',
                                padding: '6px 14px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                boxShadow: `0 4px 12px ${isPracticalComplete ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                direction: 'ltr'
                            }}>
                                {completedCount} / {totalCount}
                            </div>
                        );
                    })()}
                    
                    <button 
                        className="ui-tile group w-full h-full text-start" 
                        onClick={() => router.push(`/lessons/${lessonId}/practical`)}
                        type="button"
                    >
                        <div className="ui-action-row" style={{ position: 'relative', zIndex: 1 }}>
                        <span className="ui-tile-icon" style={{ color: 'var(--brass-700)' }}>
                            <Mic size={18} strokeWidth={2.2} />
                        </span>
                        <span className="ui-badge ui-badge--gold">اختبار عملي</span>
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="ui-tile-title">القسم العملي</div>
                        <div className="ui-tile-desc">
                            تدريب صوتي على أمثلة من القرآن الكريم باستخدام محرك Muaalem.
                        </div>
                    </div>
                        <div style={{ marginTop: 'auto', paddingTop: '24px', alignSelf: 'flex-start' }}>
                            <span className="hm-quiet-btn" style={{ fontSize: '0.82rem', pointerEvents: 'none' }}>
                                {(() => {
                                    const completedCount = userProgress?.practicalProgress?.[lessonId]?.length || 0;
                                    const totalCount = lesson.practical_tests?.length || 0;
                                    if (totalCount === 0) return 'امتحن';
                                    if (completedCount === totalCount) return 'مكتمل - راجع التدريب';
                                    if (completedCount > 0) return `متابعة التدريب (${completedCount}/${totalCount})`;
                                    return 'امتحن';
                                })()}
                                <ChevronRight size={13} className="-scale-x-100 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                            </span>
                        </div>
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
}
