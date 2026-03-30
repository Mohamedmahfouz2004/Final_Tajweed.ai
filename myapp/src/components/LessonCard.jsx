import React from 'react';
import { motion } from 'framer-motion';

const LessonCard = ({ lesson, onSelect }) => {
    return (
        <motion.div
            className="glass-panel p-6 cursor-pointer border border-white/60 bg-white/85"
            onClick={onSelect}
            whileHover={{ y: -8, borderColor: '#D4AF37', boxShadow: '0 15px 30px rgba(0, 0, 0, 0.12)' }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex justify-between items-start mb-4">
                <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.4 }}
                    className="bg-gray-100 p-2.5 rounded-xl"
                >
                    {lesson.icon}
                </motion.div>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{lesson.duration}</span>
            </div>
            <h3 className="text-xl text-gray-800 mb-2 font-amiri">{lesson.title}</h3>
            <p className="text-gray-500 text-sm mb-4">{lesson.description}</p>
            <motion.button
                whileHover={{ background: '#D4AF37', color: 'white' }}
                className="w-full py-2.5 bg-transparent border border-secondary text-secondary rounded-lg font-bold cursor-pointer"
            >
                ابدأ الدرس
            </motion.button>
        </motion.div>
    );
};

export default LessonCard;
