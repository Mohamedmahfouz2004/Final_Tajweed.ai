import { motion } from 'framer-motion';
import { CheckCircle, ChevronRight, Hourglass } from 'lucide-react';

const LessonCard = ({ lesson, onSelect, isCompleted, isVideoWatched, theoreticalScore, hasTheoreticalAttempt, isTheoreticalInProgress, index = 0 }) => {
    const num = String(index + 1).padStart(2, '0');
    // Count videos by splitting comma-separated URLs or fallback to 1 if there's a URL
    const videoCount = lesson.video_url ? lesson.video_url.split(',').length : 0;
    
    return (
        <div style={{ position: 'relative', height: '100%' }}>
            {/* Top Left Floating Bubble */}
            {(isCompleted || hasTheoreticalAttempt) && (
                <div style={{
                    position: 'absolute',
                    top: -14,
                    left: -14,
                    background: isCompleted ? '#10b981' : '#f59e0b', // Green if completed, Amber if in progress
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 12px ${isCompleted ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    zIndex: 10
                }}>
                    {isCompleted ? <CheckCircle size={16} strokeWidth={3} /> : <Hourglass size={16} strokeWidth={2.5} />}
                </div>
            )}

            <motion.button
                type="button"
                className={`ui-tile group ${isCompleted ? 'ui-tile--emerald' : ''}`}
                style={{ height: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}
                onClick={onSelect}
                whileHover={{}}
                whileTap={{ scale: 0.98 }}
            >
                <div className="ui-tile-ghost-num">{num}</div>

            <div className="ui-action-row" style={{ position: 'relative', zIndex: 1 }}>
                <span className="ui-tile-icon" style={{
                    color: isCompleted ? 'var(--brass-500)' : 'var(--emerald-700)'
                }}>
                    {lesson.icon || <span style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.4rem' }}>{num.slice(-1)}</span>}
                </span>
                <div className="flex gap-2 items-center">
                    <span className={`ui-badge ${isCompleted ? 'ui-badge--ok' : ''}`}>
                        {isCompleted ? (<><CheckCircle size={11} strokeWidth={2.4} /> مكتمل</>) : `${videoCount} فيديو`}
                    </span>
                </div>
            </div>

            <div className="flex-1 text-right" style={{ position: 'relative', zIndex: 1 }}>
                <div className="ui-tile-title">{lesson.title}</div>
                {lesson.description && (
                    <div className="ui-tile-desc">{lesson.description}</div>
                )}
            </div>

            <div style={{ marginTop: '24px', alignSelf: 'flex-start' }}>
                <span className="hm-quiet-btn" style={{ fontSize: '0.82rem', pointerEvents: 'none' }}>
                    {isCompleted ? 'مراجعة' : 'ابدأ الدرس'}
                    <ChevronRight size={13} className="-scale-x-100 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                </span>
            </div>
        </motion.button>
        </div>
    );
};

export default LessonCard;
