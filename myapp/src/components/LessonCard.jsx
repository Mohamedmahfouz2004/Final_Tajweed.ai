import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const LessonCard = ({ lesson, onSelect, isCompleted }) => {
    return (
        <motion.div
            className={`glass-panel p-6 cursor-pointer border-2 transition-all duration-300 ${isCompleted ? 'border-emerald-500 bg-emerald-50/50' : 'border-white/60 bg-white/85'}`}
            onClick={onSelect}
            whileHover={{ y: -8, borderColor: isCompleted ? '#10B981' : '#D4AF37', boxShadow: '0 15px 30px rgba(0, 0, 0, 0.12)' }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex justify-between items-start mb-4">
                <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                    className={`p-2.5 rounded-xl ${isCompleted ? 'bg-emerald-100/50' : 'bg-gray-100'}`}
                >
                    {lesson.icon}
                </motion.div>
                <div className="flex items-center gap-2">
                    {isCompleted && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">تم الإكمال <CheckCircle size={10} /></span>}
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{lesson.duration}</span>
                </div>
            </div>
            <h3 className="text-xl text-gray-800 mb-2 font-amiri flex items-center gap-2">
                {lesson.title}
            </h3>
            <p className="text-gray-500 text-sm mb-4">{lesson.description}</p>
            <motion.button
                whileHover={{ background: isCompleted ? '#059669' : '#D4AF37', color: 'white' }}
                className={`w-full py-2.5 bg-transparent border-2 rounded-lg font-bold cursor-pointer transition-colors ${isCompleted
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-secondary text-secondary'
                    }`}
            >
                {isCompleted ? 'مراجعة الدرس' : 'ابدأ الدرس'}
            </motion.button>
        </motion.div>
    );
};

export default LessonCard;
