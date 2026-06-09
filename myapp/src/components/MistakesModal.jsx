'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Activity, Mic, BookOpen } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { getErrorInfo } from '../utils/errorTypeMap';

const MistakesModal = ({ isOpen, onClose }) => {
    const router = useRouter();
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
            return Object.keys(counts).map(name => {
                const info = getErrorInfo(name);
                return {
                    name: info?.name || name,
                    error_type: name,
                    value: Math.round((counts[name] / total) * 100),
                    count: counts[name],
                    color: info?.color || 'var(--ink-700)',
                    icon: info?.icon || '◇',
                    category: info?.category || '',
                };
            }).sort((a, b) => b.value - a.value);
        }
        if (userProgress.mistakeStats && userProgress.mistakeStats.length > 0) {
            const total = userProgress.mistakeStats.reduce((acc, m) => acc + m.count, 0);
            return userProgress.mistakeStats.map(m => {
                const info = getErrorInfo(m.name);
                return {
                    name: info?.name || m.name,
                    error_type: m.name,
                    value: total > 0 ? Math.round((m.count / total) * 100) : 0,
                    count: m.count,
                    color: info?.color || 'var(--ink-700)',
                    icon: info?.icon || '◇',
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="ui-modal-backdrop"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 16 }}
                        className="ui-modal"
                        style={{ maxWidth: 640, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="ui-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <AlertTriangle size={18} color="var(--rec-error)" />
                                <span className="ui-modal-title">
                                  {isSessionActive ? 'جلستك الحالية' : 'الأخطاء الشائعة'}
                                </span>
                            </div>
                            <button onClick={onClose} className="ui-modal-close" type="button" aria-label="close">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="ui-modal-body" style={{ overflowY: 'auto', maxHeight: 'calc(88vh - 70px)' }}>
                            <p style={{ color: 'var(--ink-700)', fontSize: '0.92rem', marginBottom: 18 }}>
                                {isSessionActive
                                    ? 'توزيع الأخطاء المكتشفة بواسطة الذكاء الاصطناعي في تلاوتك الأخيرة.'
                                    : 'توزيع نسبة الأخطاء المسجلة في قاعدة البيانات.'}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {mistakeStats.length > 0 ? mistakeStats.map((stat, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 + index * 0.04 }}
                                        style={{
                                            padding: '12px 14px',
                                            border: '1px solid var(--sand-400)',
                                            background: 'var(--parchment-50)',
                                        }}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-3">
                                                <span style={{
                                                    width: 38, height: 38, fontSize: '1.4rem',
                                                    border: '1px solid var(--sand-400)',
                                                    background: 'var(--parchment-200)',
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                }}>{stat.icon}</span>
                                                <div>
                                                    <div style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.2rem', lineHeight: 1 }}>{stat.name}</div>
                                                    {stat.category && (
                                                        <div className="ui-eyebrow" style={{ marginTop: 4 }}>{stat.category}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <div className="font-num" style={{ color: stat.color, fontWeight: 700, fontSize: '1.2rem' }}>{stat.value}%</div>
                                                <div className="font-num" style={{ color: 'var(--ink-500)', fontSize: '0.72rem' }}>{stat.count} مرة</div>
                                            </div>
                                        </div>
                                        <div className="ui-bar" style={{ height: 8 }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${stat.value}%` }}
                                                transition={{ duration: 0.6, delay: 0.2 + index * 0.05, ease: 'easeOut' }}
                                                className="ui-bar-fill"
                                                style={{ background: stat.color }}
                                            />
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => { onClose(); router.push('/lessons'); }}
                                                className="ui-btn ui-btn--ghost" style={{ padding: '6px 10px', fontSize: '0.72rem' }} type="button">
                                                <BookOpen size={11} /> شرح
                                            </button>
                                            <button onClick={() => { onClose(); router.push(`/practical-quiz/${stat.error_type}`); }}
                                                className="ui-btn ui-btn--primary" style={{ padding: '6px 10px', fontSize: '0.72rem' }} type="button">
                                                <Mic size={11} /> تدريب
                                            </button>
                                        </div>
                                    </motion.div>
                                )) : (
                                    <div style={{ textAlign: 'center', padding: '40px 14px', border: '1px dashed var(--sand-400)' }}>
                                        <Activity size={28} style={{ color: 'var(--ink-500)', margin: '0 auto 10px' }} />
                                        <p style={{ color: 'var(--ink-500)', fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.2rem' }}>
                                          لا توجد أخطاء مسجلة. استمر في التلاوة!
                                        </p>
                                    </div>
                                )}
                            </div>

                            {topMistake && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                    className="ui-panel ui-panel--emerald"
                                    style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}
                                >
                                    <Activity size={20} color="var(--brass-500)" style={{ flexShrink: 0 }} />
                                    <div>
                                        <strong style={{ display: 'block', color: 'var(--brass-500)', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.72rem', letterSpacing: '0.18em', marginBottom: 4 }}>
                                          AI HINT
                                        </strong>
                                        <span style={{ fontSize: '0.92rem' }}>
                                          ركّز على تمارين &quot;{topMistake.name}&quot; ({topMistake.value}% من أخطائك).
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 text-center">
                                <button
                                    onClick={() => { onClose(); router.push('/progress'); }}
                                    className="ui-cta"
                                    type="button"
                                >
                                    عرض لوحة التقدم الكاملة
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MistakesModal;
