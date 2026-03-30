import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle, Activity } from 'lucide-react';
import { modalOverlay, scaleIn } from '../utils/animations';
import useAppStore from '../store/useAppStore';

const MistakesModal = ({ isOpen, onClose, onNavigateToLesson }) => {
    const { userProgress } = useAppStore();
    const mistakeStats = userProgress.mistakeStats || [];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={modalOverlay}
                    initial="initial" animate="animate" exit="exit"
                    className="fixed inset-0 w-screen h-screen bg-black/55 z-[99999] flex items-center justify-center"
                >
                    <div className="absolute inset-0" onClick={onClose}></div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="absolute w-full max-w-[600px] mx-4 p-8 relative max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >        <button onClick={onClose} className="absolute top-5 right-5 bg-transparent border-none cursor-pointer p-1 z-10">
                            <XCircle size={28} color="#6B7280" />
                        </button>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-8">
                            <div className="w-[60px] h-[60px] rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-2xl text-primary mb-2 font-amiri">
                                تحليل الأخطاء الشائعة
                            </h2>
                            <p className="text-gray-500 text-sm">
                                توزيع نسبة الأخطاء في تلاوتك بناءً على الأحكام التجويدية
                            </p>
                        </motion.div>

                        <div className="flex flex-col gap-5">
                            {mistakeStats.map((stat, index) => (
                                <motion.div key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + index * 0.08 }}
                                    className="mistake-row cursor-pointer p-3 rounded-xl border border-transparent mb-2"
                                    onClick={() => onNavigateToLesson && onNavigateToLesson(stat.name)}
                                >
                                    <div className="flex justify-between mb-2 font-bold text-gray-700 items-center">
                                        <span className="flex items-center gap-2">
                                            {stat.name}
                                            <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-xl">شرح الدرس</span>
                                        </span>
                                        <span style={{ color: stat.color }}>{stat.value}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-100 rounded-xl overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stat.value}%` }}
                                            transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: 'easeOut' }}
                                            className="h-full rounded-xl"
                                            style={{ background: stat.color }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {stat.value > 20 ? 'يحتاج إلى مزيد من التدريب' : 'مستوى جيد، استمر'}
                                    </p>
                                </motion.div>
                            ))}
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-500 flex gap-3 items-center"
                        >
                            <Activity size={24} color="#10B981" />
                            <div>
                                <strong className="block text-emerald-800">نصيحة الذكاء الاصطناعي</strong>
                                <span className="text-sm text-emerald-700">ننصحك بالتركيز على تمارين "أحكام النون الساكنة" في الجلسة القادمة لتحسين دقتك العامة.</span>
                            </div>
                        </motion.div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MistakesModal;
