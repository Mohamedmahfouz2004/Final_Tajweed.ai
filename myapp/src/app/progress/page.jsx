'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, BookOpen, ArrowRight, Clock, ChevronDown, ChevronUp, Calendar, Flame, Activity, Target, BarChart3 } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { getErrorInfo } from '../../utils/errorTypeMap';
import AuthGuard from '../../components/AuthGuard';

// ─── Arabic-friendly labels ───
const RULE_LABELS = {
    madd: 'المدود',
    ghunnah: 'الغنة',
    ghunna: 'الغنة',
    qalqalah: 'القلقلة',
    qalqala: 'القلقلة',
    makharij: 'مخارج الحروف',
    phoneme: 'مخارج الحروف',
    ahkam: 'أحكام النون والميم',
    vowel: 'الحركات',
    tafkheem: 'التفخيم والترقيق',
    sifat: 'صفات الحروف',
    deletion: 'نقص حرف',
    insertion: 'زيادة حرف',
    hams_jahr: 'الهمس والجهر',
    shidda: 'الشدة والرخاوة',
};

const getRuleLabel = (ruleId) => {
    if (!ruleId) return 'خطأ غير معروف';
    const info = getErrorInfo(ruleId);
    return RULE_LABELS[ruleId] || info?.name || ruleId;
};

const ProgressView = () => {
    const router = useRouter();

    // Store
    const fetchAdaptiveData = useAppStore(s => s.fetchAdaptiveData);
    const fetchSessionsList = useAppStore(s => s.fetchSessionsList);
    const fetchSessionsSummary = useAppStore(s => s.fetchSessionsSummary);
    const dailyPlaylist = useAppStore(s => s.dailyPlaylist);
    const masteryRadar = useAppStore(s => s.masteryRadar);
    const sessionsList = useAppStore(s => s.sessionsList);
    const sessionsSummary = useAppStore(s => s.sessionsSummary);
    const surahs = useAppStore(s => s.surahs);

    const [showHistory, setShowHistory] = useState(false);
    const [expandedSession, setExpandedSession] = useState(null);

    useEffect(() => {
        fetchAdaptiveData();
        fetchSessionsList();
        fetchSessionsSummary();
        document.title = "تقدمي | Tajweed.ai";
    }, []);

    // Helpers
    const getSurahName = (num) => {
        const s = Array.isArray(surahs) ? surahs.find(x => x.id == num) : null;
        return s?.name || `سورة ${num}`;
    };
    const formatTime = (sec) => {
        if (!sec) return '0 د';
        const m = Math.floor(sec / 60);
        return m === 0 ? `${sec} ث` : `${m} دقيقة`;
    };
    const formatDate = (d) => {
        try {
            return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });
        } catch { return d; }
    };

    // Mastery: transform to simple progress bars
    const masteryBars = useMemo(() => {
        if (!masteryRadar) return [];
        const labels = {
            madd: { name: 'المدود', emoji: '〰️', color: 'var(--primary)' },
            ghunnah: { name: 'الغنة', emoji: '🗣️', color: 'var(--primary-dark)' },
            qalqalah: { name: 'القلقلة', emoji: '🔔', color: 'var(--secondary)' },
            makharij: { name: 'مخارج الحروف', emoji: '🔤', color: '#C97B6A' },
            ahkam: { name: 'أحكام النون والميم', emoji: '✨', color: '#8B3A2A' },
        };
        return Object.keys(masteryRadar).map(key => ({
            id: key,
            name: labels[key]?.name || key,
            emoji: labels[key]?.emoji || '🎯',
            color: labels[key]?.color || 'var(--primary)',
            percent: Math.round(masteryRadar[key] * 100),
        }));
    }, [masteryRadar]);

    // Summary stats
    const totalRecitationTime = sessionsSummary?.total_recitation_time || 0;
    const totalSessions = sessionsList?.length || 0;

    // Greeting based on time of day
    const getGreeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'صباح الخير 🌤️';
        if (h < 17) return 'مساء النور 🌤️';
        return 'مساء الخير 🌙';
    };

    const hasRemediation = dailyPlaylist?.remediation_practice?.length > 0;
    const hasRevision = dailyPlaylist?.warmup_revision?.length > 0;
    const hasProgression = !!dailyPlaylist?.progression;
    const hasAnyTask = hasRemediation || hasRevision || hasProgression;

    return (
        <div className="w-full space-y-8 animate-fade-in" dir="rtl">
            {/* ─── PAGE HEAD ─── */}
            <div className="ui-page-head flex flex-col gap-2 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--parchment-200)] border-2 border-[var(--ink-900)] rounded-full text-xs font-bold text-[var(--ink-900)] w-fit mb-2 shadow-[2px_2px_0_var(--ink-900)]">
                    <Activity size={14} />
                    <span>{getGreeting()}</span>
                </div>
                <h1 className="ui-title text-4xl md:text-5xl flex items-center gap-4">
                    تقدمك في التلاوة
                </h1>
                <p className="ui-sub text-lg mt-2 max-w-2xl font-medium">
                    هنا تقدر تتابع مستواك وتشوف إيه اللي محتاج تتدرب عليه بناءً على تحليلات ذكاء التجويد.
                </p>
            </div>

            {/* ─── QUICK STATS ─── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                <div className="ui-stat-card p-5 bg-[#F5F2E8] border-2 border-[var(--ink-900)] rounded-xl shadow-[4px_4px_0_var(--ink-900)] transition-transform hover:-translate-y-1">
                    <div className="flex items-center gap-3 mb-3 text-[var(--ink-700)]">
                        <div className="p-2 bg-[var(--parchment-200)] rounded-lg border-2 border-[var(--ink-900)]">
                            <Calendar size={20} />
                        </div>
                        <span className="font-bold text-sm">جلسة تدريب</span>
                    </div>
                    <div className="text-4xl font-rakkas text-[var(--ink-900)] px-1">{totalSessions}</div>
                </div>
                
                <div className="ui-stat-card p-5 bg-[#F5F2E8] border-2 border-[var(--ink-900)] rounded-xl shadow-[4px_4px_0_var(--ink-900)] transition-transform hover:-translate-y-1">
                    <div className="flex items-center gap-3 mb-3 text-[var(--ink-700)]">
                        <div className="p-2 bg-[var(--parchment-200)] rounded-lg border-2 border-[var(--ink-900)]">
                            <Clock size={20} />
                        </div>
                        <span className="font-bold text-sm">وقت التلاوة</span>
                    </div>
                    <div className="text-4xl font-rakkas text-[var(--ink-900)] px-1">{formatTime(totalRecitationTime)}</div>
                </div>
                
                <div className="ui-stat-card p-5 bg-[#F5F2E8] border-2 border-[var(--ink-900)] rounded-xl shadow-[4px_4px_0_var(--ink-900)] col-span-2 md:col-span-1 transition-transform hover:-translate-y-1">
                    <div className="flex items-center gap-3 mb-3 text-[var(--ink-700)]">
                        <div className="p-2 bg-[var(--parchment-200)] rounded-lg border-2 border-[var(--ink-900)]">
                            <Target size={20} />
                        </div>
                        <span className="font-bold text-sm">متوسط الإتقان</span>
                    </div>
                    <div className="text-4xl font-rakkas text-[var(--ink-900)] px-1">
                        {masteryBars.length > 0 ? `${Math.round(masteryBars.reduce((a, b) => a + b.percent, 0) / masteryBars.length)}%` : '—'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                
                {/* ─── WHAT TO DO TODAY ─── */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-2xl font-bold font-ibm text-[var(--ink-900)] flex items-center gap-3 mb-4">
                        <div className="bg-[var(--parchment-200)] p-2 rounded-xl border-2 border-[var(--ink-900)] shadow-[2px_2px_0_var(--ink-900)]">
                            <Flame className="text-[var(--secondary)]" size={24} />
                        </div>
                        خطة التدريب اليومية
                    </h2>

                    {!dailyPlaylist ? (
                        <div className="ui-panel text-center py-16 flex flex-col items-center justify-center border-2 border-[var(--ink-900)] shadow-[4px_4px_0_var(--ink-900)] bg-[var(--parchment-50)] rounded-2xl">
                            <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mb-6 shadow-sm"></div>
                            <p className="text-[var(--ink-700)] font-bold text-lg">جاري تحليل مستواك وبناء الخطة...</p>
                        </div>
                    ) : !hasAnyTask ? (
                        <div className="ui-panel text-center py-16 px-6 flex flex-col items-center justify-center border-2 border-[var(--ink-900)] shadow-[4px_4px_0_var(--ink-900)] bg-[#ecfdf5] rounded-2xl">
                            <div className="text-6xl mb-6 drop-shadow-md">🎉</div>
                            <h3 className="text-2xl font-rakkas text-[var(--primary-dark)] mb-3">ممتاز! مفيش أخطاء متراكمة</h3>
                            <p className="text-[var(--ink-700)] mb-8 font-medium max-w-md mx-auto">لم نرصد أي أخطاء متكررة تحتاج لمعالجة. استمر في تلاوتك وتدرب أكثر!</p>
                            <button
                                onClick={() => router.push('/practice')}
                                className="px-8 py-3.5 bg-[var(--primary)] text-white border-2 border-[var(--ink-900)] rounded-xl font-bold shadow-[4px_4px_0_var(--ink-900)] hover:translate-y-1 hover:shadow-[2px_2px_0_var(--ink-900)] transition-all flex items-center gap-3 text-lg"
                            >
                                <BookOpen size={20} />
                                افتح المصحف واقرأ
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Remediation */}
                            {hasRemediation && dailyPlaylist.remediation_practice.map((item, idx) => (
                                <div
                                    key={`rem-${idx}`}
                                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-2 border-[var(--ink-900)] bg-[#fef2f2] rounded-2xl shadow-[4px_4px_0_var(--ink-900)] transition-transform hover:-translate-y-1"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-white border-2 border-[var(--ink-900)] rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_0_var(--ink-900)]">⚠️</div>
                                        <div className="pt-1">
                                            <div className="font-bold text-[var(--ink-900)] text-lg mb-1">صحّح خطأك في {getRuleLabel(item.rule)}</div>
                                            <div className="text-[var(--ink-700)] text-sm font-medium">
                                                {getSurahName(item.surah)} — آية {item.ayah}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/practical-quiz/by-ayah?surah=${item.surah}&ayah=${item.ayah}&errors=${item.rule}`)}
                                        className="px-6 py-3 w-full sm:w-auto bg-[#DC2626] text-white border-2 border-[var(--ink-900)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#B91C1C] transition-colors shrink-0 shadow-[2px_2px_0_var(--ink-900)]"
                                    >
                                        <Mic size={18} /> ابدأ التصحيح
                                    </button>
                                </div>
                            ))}

                            {/* Revision */}
                            {hasRevision && dailyPlaylist.warmup_revision.map((item, idx) => (
                                <div
                                    key={`rev-${idx}`}
                                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-2 border-[var(--ink-900)] bg-[#eff6ff] rounded-2xl shadow-[4px_4px_0_var(--ink-900)] transition-transform hover:-translate-y-1"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-white border-2 border-[var(--ink-900)] rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_0_var(--ink-900)]">🔁</div>
                                        <div className="pt-1">
                                            <div className="font-bold text-[var(--ink-900)] text-lg mb-1">راجع إتقانك: {getRuleLabel(item.rule)}</div>
                                            <div className="text-[var(--ink-700)] text-sm font-medium">
                                                {getSurahName(item.surah)} — آية {item.ayah}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => router.push(`/practical-quiz/by-ayah?surah=${item.surah}&ayah=${item.ayah}&errors=${item.rule}`)}
                                        className="px-6 py-3 w-full sm:w-auto bg-[#2563EB] text-white border-2 border-[var(--ink-900)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition-colors shrink-0 shadow-[2px_2px_0_var(--ink-900)]"
                                    >
                                        <Mic size={18} /> ابدأ المراجعة
                                    </button>
                                </div>
                            ))}

                            {/* Progression */}
                            {hasProgression && (
                                <div
                                    onClick={() => router.push(`/practice?surah=${dailyPlaylist.progression.surah}&startAyah=${dailyPlaylist.progression.from_ayah}`)}
                                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-2 border-[var(--ink-900)] bg-[var(--parchment-100)] rounded-2xl shadow-[4px_4px_0_var(--ink-900)] cursor-pointer group transition-transform hover:-translate-y-1"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-[var(--primary)] border-2 border-[var(--ink-900)] rounded-xl flex items-center justify-center text-white text-2xl shrink-0 shadow-[2px_2px_0_var(--ink-900)]">📖</div>
                                        <div className="pt-1">
                                            <div className="font-bold text-[var(--ink-900)] text-lg mb-1">كمّل تلاوتك</div>
                                            <div className="text-[var(--ink-700)] text-sm font-medium">
                                                {getSurahName(dailyPlaylist.progression.surah)} — من آية {dailyPlaylist.progression.from_ayah}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 self-end sm:self-auto border-2 border-[var(--ink-900)] bg-white rounded-full flex items-center justify-center text-[var(--ink-900)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors shadow-[2px_2px_0_var(--ink-900)] shrink-0">
                                        <ArrowRight size={22} className="rtl:rotate-180" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── MASTERY BARS ─── */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-2xl font-bold font-ibm text-[var(--ink-900)] flex items-center gap-3 mb-4">
                        <div className="bg-[var(--parchment-200)] p-2 rounded-xl border-2 border-[var(--ink-900)] shadow-[2px_2px_0_var(--ink-900)]">
                            <Target className="text-[var(--primary)]" size={24} />
                        </div>
                        مستوى الإتقان
                    </h2>
                    
                    <div className="ui-panel p-6 border-2 border-[var(--ink-900)] bg-[var(--parchment-50)] rounded-2xl shadow-[4px_4px_0_var(--ink-900)]">
                        {masteryBars.length > 0 ? (
                            <div className="space-y-6">
                                {masteryBars.map((bar, idx) => (
                                    <div key={bar.id}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-[var(--ink-900)] text-sm flex items-center gap-2">
                                                <span>{bar.emoji}</span>
                                                {bar.name}
                                            </span>
                                            <span className="text-sm font-black font-mono" style={{ color: bar.color }}>{bar.percent}%</span>
                                        </div>
                                        <div className="w-full h-3.5 border-2 border-[var(--ink-900)] bg-white rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${bar.percent}%` }}
                                                transition={{ duration: 0.8, delay: idx * 0.1 }}
                                                className="h-full border-l-2 border-[var(--ink-900)]"
                                                style={{ backgroundColor: bar.color }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-[var(--ink-500)] font-medium">
                                <div className="text-4xl mb-4 opacity-50">📊</div>
                                اقرأ المزيد من الآيات ليتمكن الذكاء الاصطناعي من تحليل مستواك بدقة.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── SESSION HISTORY ─── */}
            <div className="mt-12 border-2 border-[var(--ink-900)] rounded-2xl overflow-hidden shadow-[4px_4px_0_var(--ink-900)] bg-[var(--parchment-50)]">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full p-6 flex items-center justify-between text-right bg-[var(--parchment-200)] border-none cursor-pointer outline-none hover:bg-[#E8DCB8] transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-xl border-2 border-[var(--ink-900)] shadow-[2px_2px_0_var(--ink-900)]">
                            <Calendar className="text-[var(--ink-900)]" size={24} />
                        </div>
                        <span className="font-bold text-[var(--ink-900)] text-xl font-rakkas">سجل الجلسات السابقة</span>
                        <span className="text-xs bg-[var(--ink-900)] text-white px-3 py-1 rounded-full font-bold shadow-sm">{totalSessions} جلسة</span>
                    </div>
                    {showHistory ? <ChevronUp className="text-[var(--ink-900)]" size={28} /> : <ChevronDown className="text-[var(--ink-900)]" size={28} />}
                </button>

                <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                            className="border-t-2 border-[var(--ink-900)] overflow-hidden"
                        >
                            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                                {sessionsList && sessionsList.length > 0 ? sessionsList.map((session, idx) => (
                                    <div key={session._id || idx} className="bg-white border-2 border-[var(--ink-900)] rounded-xl overflow-hidden shadow-[2px_2px_0_var(--ink-900)]">
                                        <button
                                            onClick={() => setExpandedSession(expandedSession === session._id ? null : session._id)}
                                            className="w-full p-5 flex items-center justify-between text-right bg-transparent border-none cursor-pointer hover:bg-[var(--parchment-50)] transition-colors outline-none"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-xl border-2 border-[var(--ink-900)] bg-[#ecfdf5] text-[var(--primary)] flex flex-col items-center justify-center shadow-[2px_2px_0_var(--ink-900)]">
                                                    <span className="text-lg font-black leading-none">{new Date(session.date + 'T00:00:00').getDate()}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-[var(--ink-900)] text-lg mb-1">{formatDate(session.date)}</div>
                                                    <div className="text-sm font-medium text-[var(--ink-500)] flex flex-wrap gap-x-4 gap-y-2">
                                                        <span className="flex items-center gap-1.5"><span className="text-base">⚡</span> {session.activities?.length || 0} نشاط</span>
                                                        <span className="text-[#DC2626] flex items-center gap-1.5"><span className="text-base">⚠️</span> {session.total_mistakes || 0} أخطاء</span>
                                                        <span className="text-[var(--primary)] flex items-center gap-1.5"><span className="text-base">✅</span> {session.total_corrections || 0} تصحيحات</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-2 rounded-full hover:bg-[var(--parchment-200)] transition-colors">
                                                {expandedSession === session._id ? <ChevronUp size={24} className="text-[var(--ink-500)]" /> : <ChevronDown size={24} className="text-[var(--ink-500)]" />}
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {expandedSession === session._id && (
                                                <motion.div
                                                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                                    className="px-5 pb-5 overflow-hidden border-t-2 border-[var(--ink-900)] bg-[var(--parchment-50)]"
                                                >
                                                    <div className="pt-5 space-y-4">
                                                    {session.activities?.map((act, aIdx) => (
                                                        <div key={aIdx} className="bg-white p-4 rounded-xl border-2 border-[var(--ink-900)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[2px_2px_0_var(--ink-900)] transition-transform hover:-translate-y-0.5">
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-2xl bg-[var(--parchment-100)] border-2 border-[var(--ink-900)] w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-[2px_2px_0_var(--ink-900)]">
                                                                    {act.type === 'recitation' ? '🎙️' : act.type === 'lesson_viewed' ? '📖' : act.type === 'quiz_completed' ? '📝' : '🎯'}
                                                                </span>
                                                                <div>
                                                                    <div className="font-bold text-[var(--ink-900)] text-base mb-1">
                                                                        {act.type === 'recitation'
                                                                            ? `${getSurahName(act.surah_number)} (آية ${act.from_ayah}${act.to_ayah !== act.from_ayah ? `-${act.to_ayah}` : ''})`
                                                                            : act.lesson_title || act.error_type || 'نشاط'
                                                                        }
                                                                    </div>
                                                                    {act.type === 'recitation' && act.mistakes_count > 0 && (
                                                                        <span className="text-xs font-bold text-[#DC2626] bg-[#fef2f2] px-2.5 py-1 rounded border-2 border-[#DC2626] inline-block shadow-sm">
                                                                            {act.mistakes_count} أخطاء تم رصدها
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {act.type === 'recitation' && (
                                                                <span className="font-mono font-bold text-[var(--ink-700)] bg-[var(--parchment-200)] px-3 py-1.5 rounded-lg border-2 border-[var(--ink-900)] shadow-sm self-start sm:self-auto">
                                                                    {formatTime(act.duration_seconds)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(!session.activities || session.activities.length === 0) && (
                                                        <div className="text-center text-[var(--ink-500)] py-4 font-bold">لم يتم تسجيل تفاصيل الأنشطة لهذه الجلسة</div>
                                                    )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )) : (
                                    <div className="text-center text-[var(--ink-500)] py-10 font-bold text-lg border-2 border-dashed border-[var(--ink-500)] rounded-xl opacity-70">
                                        لسه مسجلتش أي جلسات
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default function ProgressPage() {
    return (
        <AuthGuard
            title="إحصائياتك ومستواك"
            subtitle="سجّل دخولك عشان تقدر تتابع تقدمك وتشوف تحليلات أداءك في التجويد وسجل جلساتك."
            icon={<BarChart3 size={36} strokeWidth={2} />}
        >
            <ProgressView />
        </AuthGuard>
    );
}
