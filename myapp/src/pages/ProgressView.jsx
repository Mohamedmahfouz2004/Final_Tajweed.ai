import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, TrendingUp, BarChart3, AlertTriangle, BookOpen, Target, Award, Mic } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { staggerContainer, fadeInUp } from '../utils/animations';
import useAppStore from '../store/useAppStore';
import { getErrorInfo } from '../utils/errorTypeMap';

const API_URL = 'http://localhost:5000';

const ProgressView = () => {
    const navigate = useNavigate();
    const userProgress = useAppStore(s => s.userProgress);
    const fetchUserProgress = useAppStore(s => s.fetchUserProgress);
    const fetchSurahs = useAppStore(s => s.fetchSurahs);
    const surahs = useAppStore(s => s.surahs);
    const [detailedData, setDetailedData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // overview | mistakes | surahs

    useEffect(() => {
        fetchUserProgress();
        fetchDetailedSummary();
        fetchSurahs();
    }, []);

    const fetchDetailedSummary = async () => {
        const token = localStorage.getItem('tajweed_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/progress/detailed-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDetailedData(data);
            }
        } catch (err) {
            console.error('Failed to fetch detailed summary:', err);
        }
    };

    const totalMistakes = detailedData?.summary?.totalMistakes || 0;
    const totalCorrected = detailedData?.summary?.totalCorrected || 0;
    const totalUncorrected = detailedData?.summary?.totalUncorrected || 0;

    const overallAccuracy = totalMistakes > 0 
        ? Math.round((totalCorrected / totalMistakes) * 100) 
        : 100;

    const COLORS = ['#1B5E3B', '#B8923E', '#DC2626', '#8B5CF6', '#0EA5E9', '#F97316', '#6366F1', '#EF4444'];

    // Pie chart data
    const pieData = (detailedData?.mistakesByCategory || []).map((m, i) => ({
        name: m.rule_name_ar || m.error_type,
        value: m.uncorrected,
        color: COLORS[i % COLORS.length]
    })).filter(d => d.value > 0);

    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="max-w-6xl mx-auto">
            <motion.h2 variants={fadeInUp} className="text-[28px] text-primary mb-6 font-amiri">
                لوحة تتبع التقدم
            </motion.h2>

            {/* Tab Switcher */}
            <motion.div variants={fadeInUp} className="flex gap-2 mb-8">
                {[
                    { key: 'overview', label: 'نظرة عامة', icon: BarChart3 },
                    { key: 'mistakes', label: 'تفصيل الأخطاء', icon: AlertTriangle },
                    { key: 'surahs', label: 'السور والتدريب', icon: BookOpen },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-none cursor-pointer
                            ${activeTab === tab.key 
                                ? 'bg-gradient-to-r from-[#1B5E3B] to-[#2D8A56] text-white shadow-lg' 
                                : 'bg-[#FFF9F0] text-[#6B5D4F] hover:bg-[#f5eedf]'}`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </motion.div>

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
                <motion.div key="overview" variants={fadeInUp} initial="initial" animate="animate">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        {[
                            { icon: Target, value: `${overallAccuracy}%`, label: 'نسبة التصحيح', color: '#1B5E3B' },
                            { icon: AlertTriangle, value: totalUncorrected, label: 'أخطاء غير مصححة', color: '#DC2626' },
                            { icon: CheckCircle, value: totalCorrected, label: 'أخطاء تم تصحيحها', color: '#22C55E' },
                            { icon: BookOpen, value: userProgress.versesPracticed || 0, label: 'آيات تم التدرب عليها', color: '#B8923E' },
                        ].map((card, i) => (
                            <motion.div key={i} variants={fadeInUp}
                                whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}
                                className="stat-box flex flex-col items-center p-6"
                            >
                                <card.icon size={28} color={card.color} className="mb-3" />
                                <div className="text-3xl font-bold mb-1" style={{ color: card.color }}>{card.value}</div>
                                <div className="text-sm text-gray-500 text-center">{card.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(380px,1fr))] gap-6 mb-8">
                        {/* Daily Performance */}
                        <motion.div variants={fadeInUp} className="glass-panel p-6">
                            <h3 className="mb-4 text-primary flex items-center gap-2 text-lg">
                                <TrendingUp size={20} /> الأداء اليومي
                            </h3>
                            <div className="h-[250px]">
                                {(detailedData?.dailyPerformance || []).length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={detailedData?.dailyPerformance}>
                                            <defs>
                                                <linearGradient id="colorMistakes" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorCorrected" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="mistakes" stroke="#DC2626" fill="url(#colorMistakes)" name="أخطاء" />
                                            <Area type="monotone" dataKey="corrected" stroke="#22C55E" fill="url(#colorCorrected)" name="مصححة" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        <p>لا توجد بيانات بعد. ابدأ التلاوة لتتبع أداءك اليومي.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Error Distribution */}
                        <motion.div variants={fadeInUp} className="glass-panel p-6">
                            <h3 className="mb-4 text-primary flex items-center gap-2 text-lg">
                                <BarChart3 size={20} /> توزيع الأخطاء
                            </h3>
                            <div className="h-[250px]">
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                                                paddingAngle={3} dataKey="value" nameKey="name"
                                                label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`}
                                                labelLine={{ strokeWidth: 1 }}
                                            >
                                                {pieData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        <p>لا توجد أخطاء مسجلة.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Lesson Progress */}
                    {detailedData?.lessonProgress?.length > 0 && (
                        <motion.div variants={fadeInUp} className="glass-panel p-6 mb-6">
                            <h3 className="mb-4 text-primary flex items-center gap-2 text-lg">
                                <Award size={20} /> تقدم الدروس النظرية
                            </h3>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                                {detailedData?.lessonProgress?.map((lp, i) => (
                                    <div key={i} className="rounded-xl p-4 border border-gray-100"
                                        style={{ background: lp.status === 'completed' ? '#f0fdf4' : '#FFF9F0' }}>
                                        <div className="text-sm font-bold text-gray-800 mb-2">{lp.lessonTitle}</div>
                                        <div className="flex justify-between items-center">
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold
                                                ${lp.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {lp.status === 'completed' ? '✅ مكتمل' : '🔄 جاري'}
                                            </span>
                                            <span className="text-lg font-bold" style={{ color: lp.score >= 70 ? '#22C55E' : '#F59E0B' }}>
                                                {lp.score}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}

            {/* ═══ MISTAKES TAB ═══ */}
            {activeTab === 'mistakes' && (
                <motion.div key="mistakes" variants={fadeInUp} initial="initial" animate="animate" className="tab-content">
                    {(detailedData?.mistakesByCategory || []).length > 0 ? (
                        <div className="space-y-4">
                            {detailedData?.mistakesByCategory?.map((mistake, i) => {
                                const info = getErrorInfo(mistake.error_type);
                                return (
                                    <motion.div key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="glass-panel p-5 flex items-center gap-5"
                                    >
                                        {/* Icon */}
                                        <div className="text-3xl w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: `${info?.color || '#6B7280'}15` }}>
                                            {info?.icon || '❓'}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-800">{info?.name || mistake.rule_name_ar || mistake.error_type}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                                    {info?.category || mistake.rule_category}
                                                </span>
                                            </div>
                                            {info?.description && (
                                                <p className="text-xs text-gray-400 mb-2 leading-relaxed">{info.description}</p>
                                            )}
                                            {/* Progress bar */}
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${mistake.error_percentage}%`,
                                                        background: mistake.error_percentage > 70 ? '#DC2626' 
                                                            : mistake.error_percentage > 40 ? '#F59E0B' : '#22C55E'
                                                    }}
                                                />
                                            </div>
                                            <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                                <span>إجمالي: {mistake.total}</span>
                                                <span>مصحح: {mistake.corrected}</span>
                                                <span className="font-bold" style={{ color: info?.color }}>
                                                    نسبة الخطأ: {mistake.error_percentage}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => navigate(`/lessons`)}
                                                className="px-3 py-2 rounded-lg text-xs font-bold border-none cursor-pointer
                                                    bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                            >
                                                📖 شرح الدرس
                                            </button>
                                            {mistake.uncorrected > 0 && (
                                                <button
                                                    onClick={() => navigate(`/practical-quiz/${mistake.error_type}`)}
                                                    className="px-3 py-2 rounded-lg text-xs font-bold border-none cursor-pointer
                                                        bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                                >
                                                    <Mic size={12} className="inline mr-1" />
                                                    تدريب عملي
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="glass-panel p-12 text-center">
                            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                            <h3 className="text-xl font-amiri text-gray-600 mb-2">لا توجد أخطاء مسجلة</h3>
                            <p className="text-gray-400">ابدأ جلسة تسميع وسيتم تتبع أخطاءك تلقائياً.</p>
                            <button onClick={() => navigate('/practice')}
                                className="mt-4 px-6 py-2.5 bg-primary text-white rounded-lg border-none cursor-pointer font-bold">
                                ابدأ التسميع
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══ SURAHS TAB ═══ */}
            {activeTab === 'surahs' && (
                <motion.div key="surahs" variants={fadeInUp} initial="initial" animate="animate" className="tab-content">
                    {(detailedData?.surahStats || []).length > 0 ? (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                            {detailedData?.surahStats?.map((surah, i) => {
                                const sInfo = Array.isArray(surahs) ? surahs.find(s => s.id == surah.surah_number) : null;
                                if (!sInfo) console.warn(`[ProgressView] Could not find name for surah ${surah.surah_number}`);
                                return (
                                    <motion.div key={i}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="glass-panel p-5"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-amiri text-lg text-primary">{sInfo?.name ? `سورة ${sInfo.name}` : `سورة رقم ${surah.surah_number}`}</h4>
                                            <span className="text-2xl font-bold" style={{ 
                                                color: surah.accuracy >= 70 ? '#22C55E' : surah.accuracy >= 40 ? '#F59E0B' : '#DC2626' 
                                            }}>
                                                {surah.accuracy}%
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <div className="flex justify-between">
                                                <span>عدد الآيات المتدرب عليها:</span>
                                                <span className="font-bold">{surah.ayahs_count}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>إجمالي الأخطاء:</span>
                                                <span className="font-bold text-red-600">{surah.total_mistakes}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>أخطاء مصححة:</span>
                                                <span className="font-bold text-green-600">{surah.corrected}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="glass-panel p-12 text-center">
                            <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-amiri text-gray-600 mb-2">لم تتدرب على أي سورة بعد</h3>
                            <p className="text-gray-400">ابدأ التسميع وستظهر إحصائيات كل سورة هنا.</p>
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

export default ProgressView;
