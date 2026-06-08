import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';

const LessonCard = ({ lesson, onSelect, isCompleted, index = 0 }) => {
    const num = String(index + 1).padStart(2, '0');
    return (
        <motion.button
            type="button"
            className={`ui-tile ${isCompleted ? 'ui-tile--emerald' : ''}`}
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
                <span className={`ui-badge ${isCompleted ? 'ui-badge--ok' : ''}`}>
                    {isCompleted ? (<><CheckCircle size={11} strokeWidth={2.4} /> DONE</>) : lesson.duration || '— min'}
                </span>
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="ui-tile-title">{lesson.title}</div>
                {lesson.description && (
                    <div className="ui-tile-desc">{lesson.description}</div>
                )}
            </div>

            <div className="ui-tile-cta">
                {isCompleted ? 'REVIEW' : 'START LESSON'}
                <ArrowRight size={12} className="rotate-180" />
            </div>
        </motion.button>
    );
};

export default LessonCard;
