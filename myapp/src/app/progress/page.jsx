'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, BookOpen, ArrowRight, Clock, ChevronDown, ChevronUp, Calendar, Flame, Activity, Target, BarChart3, Square, Zap, Trophy } from 'lucide-react';
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

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } } };
const reveal = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] } },
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
    const fetchUserMistakes = useAppStore(s => s.fetchUserMistakes);
    const userMistakes = useAppStore(s => s.userActiveMistakes);
    const fetchProgressOverview = useAppStore(s => s.fetchProgressOverview);
    const overview = useAppStore(s => s.progressOverview);

    const [showHistory, setShowHistory] = useState(false);
    const [expandedSession, setExpandedSession] = useState(null);
    const [playingMistakeAya, setPlayingMistakeAya] = useState(null);

    useEffect(() => {
        fetchAdaptiveData();
        fetchSessionsList();
        fetchSessionsSummary();
        fetchUserMistakes();
        fetchProgressOverview();
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

    // Mastery bars. Prefer the real rolling EWMA mastery (from user_rule_mastery,
    // updated each recitation). Fall back to a corrected/total estimate from the
    // mistakes table if the progress-system migration hasn't been applied yet.
    const masteryBars = useMemo(() => {
        if (overview?.mastery?.length) {
            return overview.mastery
                .map((m) => ({
                    id: m.rule_id,
                    name: m.name || getRuleLabel(m.rule_id),
                    emoji: m.icon || '🎯',
                    color: m.color || 'var(--primary)',
                    percent: m.percent,
                }))
                .sort((a, b) => b.percent - a.percent);
        }

        // Fallback (pre-migration): estimate from mistakes corrected/total.
        if (!userMistakes || userMistakes.length === 0) return [];
        const ruleStats = {};
        userMistakes.forEach((m) => {
            const rule = m.rule_category;
            if (!ruleStats[rule]) {
                ruleStats[rule] = { total: 0, corrected: 0, nameAr: m.rule_name_ar || getRuleLabel(rule) };
            }
            ruleStats[rule].total += 1;
            if (m.is_corrected) ruleStats[rule].corrected += 1;
        });
        return Object.keys(ruleStats).map((key) => {
            const stats = ruleStats[key];
            const percent = stats.total > 0 ? Math.round((stats.corrected / stats.total) * 100) : 100;
            const info = getErrorInfo(key);
            return {
                id: key,
                name: stats.nameAr || key,
                emoji: info?.icon || '🎯',
                color: info?.color || 'var(--primary)',
                percent,
            };
        }).sort((a, b) => b.percent - a.percent);
    }, [overview, userMistakes]);

    const avgMastery = masteryBars.length > 0
        ? Math.round(masteryBars.reduce((a, b) => a + b.percent, 0) / masteryBars.length)
        : null;

    // Active Mistakes grouped by rule for display
    const activeMistakesList = useMemo(() => {
        if (!userMistakes) return [];
        const active = userMistakes.filter(m => !m.is_corrected);
        
        const grouped = {};
        active.forEach(m => {
            if (!grouped[m.rule_category]) {
                grouped[m.rule_category] = {
                    ruleId: m.rule_category,
                    ruleName: m.rule_name_ar || getRuleLabel(m.rule_category),
                    count: 0,
                    examples: []
                };
            }
            grouped[m.rule_category].count += 1;
            
            // Only add up to 3 examples per rule to avoid clutter
            if (grouped[m.rule_category].examples.length < 3) {
                grouped[m.rule_category].examples.push(m);
            }
        });

        return Object.values(grouped).sort((a, b) => b.count - a.count);
    }, [userMistakes]);

    const playMistakeAudio = (surahNum, ayahNum, mistakeId) => {
        if (playingMistakeAya === mistakeId) {
            setPlayingMistakeAya(null);
            const audios = document.getElementsByTagName('audio');
            for(let i=0; i<audios.length; i++) audios[i].pause();
            return;
        }
        
        const audios = document.getElementsByTagName('audio');
        for(let i=0; i<audios.length; i++) audios[i].pause();

        const pad = (n) => String(n).padStart(3, '0');
        // using default reciter (e.g. Alafasy) for simplicity in progress page
        const url = `https://everyayah.com/data/Alafasy_128kbps/${pad(surahNum)}${pad(ayahNum)}.mp3`;
        const audio = new Audio(url);
        audio.onended = () => setPlayingMistakeAya(null);
        audio.play();
        setPlayingMistakeAya(mistakeId);
    };

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

    // ── Gamification (streak / level / daily goal) ──
    const streak = overview?.currentStreak || 0;
    const longestStreak = overview?.longestStreak || 0;
    const level = overview?.level || 1;
    const xpInto = overview?.xpIntoLevel || 0;
    const xpFor = overview?.xpForNextLevel || 500;
    const dailyGoal = overview?.dailyGoal || 5;
    const todayKey = new Date().toISOString().split('T')[0];
    const todaySession = Array.isArray(sessionsList) ? sessionsList.find((s) => s.date === todayKey) : null;
    const todayVerses = todaySession
        ? todaySession.activities.reduce((a, act) => a + Math.max(1, (act.to_ayah || 0) - (act.from_ayah || 0) + 1), 0)
        : 0;
    const goalPct = Math.min(100, Math.round((todayVerses / Math.max(1, dailyGoal)) * 100));

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ maxWidth: '1040px', margin: '0 auto', width: '100%' }} dir="rtl">
            {/* ─── PAGE HEAD ─── */}
            <motion.div variants={reveal}>
                <span className="ui-eyebrow">
                    <span className="num">05</span> &nbsp;//&nbsp; {getGreeting()}
                </span>
                <h1 className="ui-title">تقدمك في التلاوة</h1>
                <p className="ui-sub">
                    تابع مستواك وشوف إيه اللي محتاج تتدرب عليه بناءً على تحليلات ذكاء التجويد.
                </p>
            </motion.div>

            <div className="ui-divider" aria-hidden />

            {/* ─── GAMIFICATION STRIP (streak · level · daily goal) ─── */}
            <motion.div variants={reveal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* Streak */}
                <div style={{ background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFDF8 100%)', border: '1px solid #F5C99B', borderRadius: '18px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: streak > 0 ? 'linear-gradient(135deg,#F97316,#EA580C)' : '#E7E0CF', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Flame size={26} fill={streak > 0 ? 'currentColor' : 'none'} />
                    </div>
                    <div>
                        <div style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '2.2rem', color: 'var(--ink-900)', lineHeight: 1 }}>{streak}</div>
                        <div style={{ fontFamily: 'var(--font-ibm)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-600)', marginTop: 4 }}>
                            يوم متتالي{longestStreak > streak ? ` · الأطول ${longestStreak}` : ''}
                        </div>
                    </div>
                </div>

                {/* Level + XP */}
                <div style={{ background: '#FFFDF8', border: '1px solid #DDCDA6', borderRadius: '18px', padding: '20px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="ui-tile-icon" style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(218,165,32,0.15)', color: 'var(--brass-500)' }}><Trophy size={18} /></span>
                            <span style={{ fontFamily: 'var(--font-ibm)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink-700)' }}>المستوى {level}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-ibm)', fontWeight: 700, fontSize: '0.74rem', color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Zap size={12} /> {xpInto}/{xpFor}
                        </span>
                    </div>
                    <div className="ui-bar" style={{ height: 10 }}>
                        <motion.span className="ui-bar-fill" initial={{ width: 0 }} animate={{ width: `${Math.round((xpInto / xpFor) * 100)}%` }} transition={{ duration: 0.8 }}
                            style={{ display: 'block', background: 'linear-gradient(90deg,#DAA520,#B8860B)' }} />
                    </div>
                </div>

                {/* Daily goal */}
                <div style={{ background: '#FFFDF8', border: '1px solid #DDCDA6', borderRadius: '18px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                        <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="26" cy="26" r="22" fill="none" stroke="#EBE3CE" strokeWidth="6" />
                            <circle cx="26" cy="26" r="22" fill="none" stroke="var(--emerald-700)" strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 22} strokeDashoffset={2 * Math.PI * 22 * (1 - goalPct / 100)} />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ibm)', fontWeight: 800, fontSize: '0.8rem', color: 'var(--ink-900)' }}>{goalPct}%</div>
                    </div>
                    <div>
                        <div style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.5rem', color: 'var(--ink-900)', lineHeight: 1 }}>{todayVerses}<span style={{ fontSize: '0.95rem', color: 'var(--ink-500)' }}> / {dailyGoal}</span></div>
                        <div style={{ fontFamily: 'var(--font-ibm)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-600)', marginTop: 4 }}>هدف اليوم (آيات)</div>
                    </div>
                </div>
            </motion.div>

            {/* ─── QUICK STATS ─── */}
            <motion.div variants={reveal} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                {[
                    { icon: <Calendar size={18} />, label: 'جلسة تدريب', value: totalSessions },
                    { icon: <Clock size={18} />, label: 'وقت التلاوة', value: formatTime(totalRecitationTime) },
                    { icon: <Target size={18} />, label: 'متوسط الإتقان', value: avgMastery != null ? `${avgMastery}%` : '—' },
                ].map((stat, i) => (
                    <div key={i} style={{
                        background: '#FFFDF8', border: '1px solid #DDCDA6', borderRadius: '18px', padding: '24px',
                        boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.15)',
                        transition: 'transform 0.18s ease', cursor: 'default'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: 'var(--ink-600)' }}>
                            <span className="ui-tile-icon" style={{ width: 36, height: 36, borderRadius: 10, fontSize: '0.85rem' }}>{stat.icon}</span>
                            <span style={{ fontFamily: 'var(--font-ibm)', fontWeight: 700, fontSize: '0.82rem' }}>{stat.label}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '2.6rem', color: 'var(--ink-900)', lineHeight: 1 }}>{stat.value}</div>
                    </div>
                ))}
            </motion.div>

            <div className="ui-split-main">
                {/* ─── DAILY PLAN ─── */}
                <motion.div variants={reveal}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <span className="ui-tile-icon" style={{ color: 'var(--brass-500)' }}><Flame size={18} /></span>
                        <h2 style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.6rem', color: 'var(--ink-900)', margin: 0 }}>خطة التدريب اليومية</h2>
                    </div>

                    {!dailyPlaylist ? (
                        <div className="ui-tile" style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>
                            <div style={{ width: 44, height: 44, border: '3px solid var(--emerald-700)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <p style={{ color: 'var(--ink-600)', fontFamily: 'var(--font-ibm)', fontWeight: 600 }}>جاري تحليل مستواك وبناء الخطة...</p>
                        </div>
                    ) : !hasAnyTask ? (
                        <div className="ui-tile ui-tile--emerald" style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: 'default' }}>
                            <span style={{ fontSize: '3rem' }}>🎉</span>
                            <div className="ui-tile-title" style={{ color: 'var(--brass-300)' }}>ممتاز! مفيش أخطاء متراكمة</div>
                            <p style={{ color: 'rgba(245,239,227,0.7)', maxWidth: '38ch', margin: '0 auto 16px' }}>لم نرصد أي أخطاء متكررة. استمر في تلاوتك!</p>
                            <button onClick={() => router.push('/practice')} className="ui-cta" style={{ background: 'var(--brass-500)', color: 'var(--ink-900)' }}>
                                <BookOpen size={18} /> افتح المصحف واقرأ
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {hasRemediation && dailyPlaylist.remediation_practice.map((item, idx) => (
                                <div key={`rem-${idx}`} className="ui-tile group" style={{ minHeight: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', gap: '16px', background: '#FFF5F5', borderColor: '#F5C6C6' }}
                                    onClick={() => router.push(`/practical-quiz/by-ayah?surah=${item.surah}&ayah=${item.ayah}&errors=${item.rule}`)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <span className="ui-tile-icon" style={{ background: '#FECACA', color: '#991B1B' }}>⚠️</span>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-ibm)' }}>صحّح خطأك في {getRuleLabel(item.rule)}</div>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--ink-600)', fontFamily: 'var(--font-ibm)' }}>{getSurahName(item.surah)} — آية {item.ayah}</div>
                                        </div>
                                    </div>
                                    <span className="hm-quiet-btn" style={{ fontSize: '0.8rem', pointerEvents: 'none', color: '#991B1B' }}>ابدأ التصحيح <Mic size={13} /></span>
                                </div>
                            ))}

                            {hasRevision && dailyPlaylist.warmup_revision.map((item, idx) => (
                                <div key={`rev-${idx}`} className="ui-tile group" style={{ minHeight: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', gap: '16px', background: '#F0F7FF', borderColor: '#B8D4F0' }}
                                    onClick={() => router.push(`/practical-quiz/by-ayah?surah=${item.surah}&ayah=${item.ayah}&errors=${item.rule}`)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <span className="ui-tile-icon" style={{ background: '#DBEAFE', color: '#1E40AF' }}>🔁</span>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-ibm)' }}>راجع إتقانك: {getRuleLabel(item.rule)}</div>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--ink-600)', fontFamily: 'var(--font-ibm)' }}>{getSurahName(item.surah)} — آية {item.ayah}</div>
                                        </div>
                                    </div>
                                    <span className="hm-quiet-btn" style={{ fontSize: '0.8rem', pointerEvents: 'none', color: '#1E40AF' }}>ابدأ المراجعة <Mic size={13} /></span>
                                </div>
                            ))}

                            {hasProgression && (
                                <div className="ui-tile group" style={{ minHeight: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', gap: '16px' }}
                                    onClick={() => router.push(`/practice?surah=${dailyPlaylist.progression.surah}&startAyah=${dailyPlaylist.progression.from_ayah}`)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <span className="ui-tile-icon" style={{ background: 'var(--emerald-700)', color: 'var(--parchment-50)' }}>📖</span>
                                        <div>
                                            <div style={{ fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-ibm)' }}>كمّل تلاوتك</div>
                                            <div style={{ fontSize: '0.82rem', color: 'var(--ink-600)', fontFamily: 'var(--font-ibm)' }}>{getSurahName(dailyPlaylist.progression.surah)} — من آية {dailyPlaylist.progression.from_ayah}</div>
                                        </div>
                                    </div>
                                    <span className="hm-quiet-btn" style={{ fontSize: '0.8rem', pointerEvents: 'none' }}>استمر <ArrowRight size={13} className="rotate-180" /></span>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* ─── MASTERY BARS ─── */}
                <motion.div variants={reveal}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <span className="ui-tile-icon" style={{ color: 'var(--emerald-700)' }}><Target size={18} /></span>
                        <h2 style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.6rem', color: 'var(--ink-900)', margin: 0 }}>مستوى الإتقان (التاريخي)</h2>
                    </div>
                    
                    <div style={{
                        background: '#FFFDF8', border: '1px solid #DDCDA6', borderRadius: '18px', padding: '28px',
                        boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.15)'
                    }}>
                        {masteryBars.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                                {masteryBars.map((bar, idx) => (
                                    <div key={bar.id}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontFamily: 'var(--font-ibm)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{bar.emoji}</span> {bar.name}
                                            </span>
                                            <span style={{ fontFamily: 'var(--font-ibm)', fontWeight: 800, fontSize: '0.85rem', color: bar.color }}>{bar.percent}%</span>
                                        </div>
                                        <div className="ui-bar" style={{ height: 10 }}>
                                            <motion.span
                                                className="ui-bar-fill"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${bar.percent}%` }}
                                                transition={{ duration: 0.8, delay: idx * 0.1 }}
                                                style={{ display: 'block', background: bar.color }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--ink-500)', fontFamily: 'var(--font-ibm)' }}>
                                <div style={{ fontSize: '2.4rem', marginBottom: '14px', opacity: 0.4 }}>📊</div>
                                اقرأ المزيد من الآيات ليتمكن الذكاء الاصطناعي من تحليل مستواك بدقة.
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* ─── ACTIVE MISTAKES (NEEDS REVIEW) ─── */}
            <motion.div variants={reveal} style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span className="ui-tile-icon" style={{ background: '#FECACA', color: '#991B1B' }}>⚠️</span>
                    <h2 style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.6rem', color: 'var(--ink-900)', margin: 0 }}>أحكام تحتاج لمراجعة وتدريب</h2>
                </div>

                {activeMistakesList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {activeMistakesList.map((group, gIdx) => (
                            <div key={gIdx} style={{ background: '#FFFDF8', border: '1px solid #DDCDA6', borderRadius: '18px', padding: '24px', boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.15)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #DDCDA6', paddingBottom: '16px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(218, 165, 32, 0.15)', color: 'var(--brass-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem' }}>
                                            {group.count}
                                        </div>
                                        <div>
                                            <h3 style={{ fontFamily: 'var(--font-ibm)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink-900)' }}>{group.ruleName}</h3>
                                            <p style={{ fontFamily: 'var(--font-ibm)', fontSize: '0.85rem', color: 'var(--ink-600)', marginTop: 2 }}>تكرر هذا الخطأ {group.count} مرات في تلاواتك الأخيرة.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => router.push(`/lessons`)} className="hm-quiet-btn" style={{ fontSize: '0.85rem' }}>
                                        راجع الدرس <BookOpen size={14} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <h4 style={{ fontFamily: 'var(--font-ibm)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-500)', marginBottom: 4 }}>أمثلة من تلاوتك:</h4>
                                    {group.examples.map((ex) => (
                                        <div key={ex.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#FAF8F2', borderRadius: '10px', border: '1px solid #EBE3CE' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <button className="tap" onClick={() => playMistakeAudio(ex.surah_number, ex.ayah_number, ex.id)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}>
                                                    {playingMistakeAya === ex.id ? <Square size={12} fill="currentColor" /> : <Mic size={14} />}
                                                </button>
                                                <div>
                                                    <div style={{ fontFamily: 'var(--font-ibm)', fontSize: '0.82rem', color: 'var(--ink-600)' }}>
                                                        {getSurahName(ex.surah_number)} - آية {ex.ayah_number}
                                                    </div>
                                                    <div className="selectable" style={{ fontFamily: 'var(--font-quran)', fontSize: '1.1rem', color: 'var(--ink-900)', marginTop: 4 }}>
                                                        ... {ex.ayah_text} ...
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="ui-badge" style={{ background: '#fef2f2', color: '#991B1B', borderColor: '#FECACA' }}>خطأ حالي</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', background: '#FFFDF8', border: '1px dashed #DDCDA6', borderRadius: '18px' }}>
                        <span style={{ fontSize: '3rem' }}>🎉</span>
                        <h3 style={{ fontFamily: 'var(--font-ibm)', fontWeight: 700, color: 'var(--ink-900)', marginTop: '12px' }}>تلاوتك خالية من الأخطاء المتراكمة!</h3>
                        <p style={{ color: 'var(--ink-600)', fontFamily: 'var(--font-ibm)', fontSize: '0.9rem', marginTop: '4px' }}>استمر في التلاوة للحفاظ على هذا المستوى.</p>
                    </div>
                )}
            </motion.div>


            {/* ─── SESSION HISTORY ─── */}
            <motion.div variants={reveal} style={{ marginTop: '48px' }}>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                        width: '100%', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#FFFDF8', border: '1px solid #DDCDA6', borderRadius: showHistory ? '18px 18px 0 0' : '18px',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.15)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span className="ui-tile-icon"><Calendar size={18} /></span>
                        <span style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.3rem', color: 'var(--ink-900)' }}>سجل الجلسات السابقة</span>
                        <span className="ui-badge">{totalSessions} جلسة</span>
                    </div>
                    {showHistory ? <ChevronUp size={22} style={{ color: 'var(--ink-600)' }} /> : <ChevronDown size={22} style={{ color: 'var(--ink-600)' }} />}
                </button>

                <AnimatePresence>
                    {showHistory && (
                        <motion.div
                            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                            style={{ overflow: 'hidden', background: '#FFFDF8', borderLeft: '1px solid #DDCDA6', borderRight: '1px solid #DDCDA6', borderBottom: '1px solid #DDCDA6', borderRadius: '0 0 18px 18px' }}
                        >
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                                {sessionsList && sessionsList.length > 0 ? sessionsList.map((session, idx) => (
                                    <div key={session._id || idx} style={{ background: '#FFFDF8', border: '1px solid #DDCDA6', borderRadius: '14px', overflow: 'hidden' }}>
                                        <button
                                            onClick={() => setExpandedSession(expandedSession === session._id ? null : session._id)}
                                            style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'right' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--emerald-50, #ecfdf5)', color: 'var(--emerald-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', border: '1px solid #DDCDA6' }}>
                                                    {new Date(session.date + 'T00:00:00').getDate()}
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-ibm)', marginBottom: '4px' }}>{formatDate(session.date)}</div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-500)', fontFamily: 'var(--font-ibm)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                                        <span>⚡ {session.activities?.length || 0} نشاط</span>
                                                        <span style={{ color: '#DC2626' }}>⚠️ {session.total_mistakes || 0} أخطاء</span>
                                                        <span style={{ color: 'var(--emerald-700)' }}>✅ {session.total_corrections || 0} تصحيحات</span>
                                                    </div>
                                                </div>
                                            </div>
                                            {expandedSession === session._id ? <ChevronUp size={20} style={{ color: 'var(--ink-500)' }} /> : <ChevronDown size={20} style={{ color: 'var(--ink-500)' }} />}
                                        </button>

                                        <AnimatePresence>
                                            {expandedSession === session._id && (
                                                <motion.div
                                                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                                    style={{ overflow: 'hidden', borderTop: '1px solid #DDCDA6' }}
                                                >
                                                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {session.activities?.map((act, aIdx) => (
                                                        <div key={aIdx} style={{
                                                            padding: '14px 18px', background: '#FAF8F2', border: '1px solid #DDCDA6', borderRadius: '12px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <span style={{ fontSize: '1.4rem' }}>
                                                                    {act.type === 'recitation' ? '🎙️' : act.type === 'lesson_viewed' ? '📖' : act.type === 'quiz_completed' ? '📝' : '🎯'}
                                                                </span>
                                                                <div>
                                                                    <div style={{ fontWeight: 700, color: 'var(--ink-900)', fontFamily: 'var(--font-ibm)', fontSize: '0.9rem' }}>
                                                                        {act.type === 'recitation'
                                                                            ? `${getSurahName(act.surah_number)} (آية ${act.from_ayah}${act.to_ayah !== act.from_ayah ? `-${act.to_ayah}` : ''})`
                                                                            : act.lesson_title || act.error_type || 'نشاط'
                                                                        }
                                                                    </div>
                                                                    {act.type === 'recitation' && act.mistakes_count > 0 && (
                                                                        <span className="ui-badge" style={{ marginTop: 4, background: '#fef2f2', color: '#991B1B', borderColor: '#FECACA' }}>
                                                                            {act.mistakes_count} أخطاء
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {act.type === 'recitation' && (
                                                                <span className="ui-badge" style={{ fontFamily: 'var(--font-ibm)' }}>{formatTime(act.duration_seconds)}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(!session.activities || session.activities.length === 0) && (
                                                        <div style={{ textAlign: 'center', color: 'var(--ink-500)', padding: '20px 0', fontFamily: 'var(--font-ibm)' }}>لم يتم تسجيل تفاصيل الأنشطة لهذه الجلسة</div>
                                                    )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )) : (
                                    <div style={{ textAlign: 'center', color: 'var(--ink-500)', padding: '40px 0', fontFamily: 'var(--font-ibm)', fontWeight: 600 }}>
                                        لسه مسجلتش أي جلسات
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
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
