import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertTriangle, Activity, Mic, BookOpen } from 'lucide-react';
import { modalOverlay } from '../utils/animations';
import useAppStore from '../store/useAppStore';
import { getErrorInfo } from '../utils/errorTypeMap';

const MistakesModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { userProgress, sessionMistakes } = useAppStore();
    
    const mistakeStats = React.useMemo(() => {
        if (sessionMistakes && sessionMistakes.length > 0) {
            const counts = {};
            let total = 0;
            sessionMistakes.forEach(m => {
                if (!m.name || m.name === 'none') return;
                counts[m.name] = (counts[m.name] || 0) + 1;
                total++;
            });

            return Object.keys(counts).map((name) => {
                const info = getErrorInfo(name);
                return {
                    name: info?.name || name,
                    error_type: name,
                    value: Math.round((counts[name] / total) * 100),
                    count: counts[name],
                    color: info?.color || '#6B7280',
                    icon: info?.icon || '❓',
                    category: info?.category || '',
                };
            }).sort((a, b) => b.value - a.value);
        }
        
        // Fallback to DB stats
        if (userProgress.mistakeStats && userProgress.mistakeStats.length > 0) {
            const total = userProgress.mistakeStats.reduce((acc, m) => acc + m.count, 0);
            return userProgress.mistakeStats.map(m => {
                const info = getErrorInfo(m.name);
                return {
                    name: info?.name || m.name,
                    error_type: m.name,
                    value: total > 0 ? Math.round((m.count / total) * 100) : 0,
                    count: m.count,
                    color: info?.color || '#6B7280',
                    icon: info?.icon || '❓',
                    category: info?.category || m.rule_category || '',
                };
            }).sort((a, b) => b.value - a.value);
        }

        return [];
    }, [sessionMistakes, userProgress.mistakeStats]);

    const topMistake = mistakeStats[0];
    const isSessionActive = sessionMistakes && sessionMistakes.length > 0;

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
                    >        
                        <button onClick={onClose} className="absolute top-5 right-5 bg-transparent border-none cursor-pointer p-1 z-10">
                            <XCircle size={28} color="#6B7280" />
                        </button>

                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center mb-8">
                            <div className="w-[60px] h-[60px] rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-2xl text-primary mb-2 font-amiri">
                                {isSessionActive ? 'تحليل جلستك الحالية' : 'تحليل الأخطاء الشائعة'}
                            </h2>
                            <p className="text-gray-500 text-sm">
                                {isSessionActive 
                                    ? 'توزيع الأخطاء المكتشفة بواسطة الذكاء الاصطناعي في تلاوتك الأخيرة' 
                                    : 'توزيع نسبة الأخطاء المسجلة في الداتا بيز'}
                            </p>
                        </motion.div>

                        <div className="flex flex-col gap-4">
                            {mistakeStats.length > 0 ? (
                                mistakeStats.map((stat, index) => (
                                    <motion.div key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + index * 0.08 }}
                                        className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all hover:shadow-sm"
                                        style={{ background: `${stat.color}05` }}
                                    >
                                        <div className="flex justify-between mb-2 items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{stat.icon}</span>
                                                <div>
                                                    <span className="font-bold text-gray-700 block">{stat.name}</span>
                                                    {stat.category && (
                                                        <span className="text-[10px] text-gray-400">{stat.category}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <span className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}%</span>
                                                <span className="text-xs text-gray-400 block">{stat.count} مرة</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${stat.value}%` }}
                                                transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: 'easeOut' }}
                                                className="h-full rounded-full"
                                                style={{ background: stat.color }}
                                            />
                                        </div>
                                        {/* Action buttons */}
                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={() => { onClose(); navigate('/lessons'); }}
                                                className="text-[11px] px-2 py-1 rounded-lg bg-blue-50 text-blue-600 border-none cursor-pointer hover:bg-blue-100 transition-colors flex items-center gap-1"
                                            >
                                                <BookOpen size={10} /> شرح الدرس
                                            </button>
                                            <button 
                                                onClick={() => { onClose(); navigate(`/practical-quiz/${stat.error_type}`); }}
                                                className="text-[11px] px-2 py-1 rounded-lg bg-green-50 text-green-600 border-none cursor-pointer hover:bg-green-100 transition-colors flex items-center gap-1"
                                            >
                                                <Mic size={10} /> تدريب عملي
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                    <Activity size={32} className="text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 font-amiri">لا توجد أخطاء مسجلة حالياً. استمر في التلاوة!</p>
                                </div>
                            )}
                        </div>

                        {topMistake && (
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex gap-3 items-center"
                            >
                                <Activity size={24} color="#10B981" className="shrink-0" />
                                <div>
                                    <strong className="block text-emerald-800">نصيحة الذكاء الاصطناعي</strong>
                                    <span className="text-sm text-emerald-700">
                                        بناءً على تلاوتك، ننصحك بالتركيز على تمارين "{topMistake.name}" ({topMistake.value}% من أخطائك).
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {/* View full progress button */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-4 text-center">
                            <button
                                onClick={() => { onClose(); navigate('/progress'); }}
                                className="px-6 py-2.5 bg-primary text-white rounded-xl border-none cursor-pointer font-bold text-sm hover:shadow-lg transition-shadow"
                            >
                                عرض لوحة التقدم الكاملة
                            </button>
                        </motion.div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MistakesModal;
