'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle, TrendingUp, BarChart3, AlertTriangle,
  BookOpen, Target, Award, Mic, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import useAppStore from '../../store/useAppStore';
import { getErrorInfo } from '../../utils/errorTypeMap';
import { API_BASE, fetchJsonSafe } from '../../utils/apiConfig';

const API_URL = API_BASE;

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const reveal  = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

// Brutalist palette for charts (no neon, all on-brand)
const CHART_COLORS = ['#105640', '#92682B', '#8B3A2A', '#3D362C', '#1B7355', '#B58A40', '#6B6155', '#C97B6A'];

export default function ProgressPage() {
    const router = useRouter();
    const userProgress = useAppStore(s => s.userProgress);
    const fetchUserProgress = useAppStore(s => s.fetchUserProgress);
    const fetchSurahs = useAppStore(s => s.fetchSurahs);
    const surahs = useAppStore(s => s.surahs);
    const [detailedData, setDetailedData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchUserProgress();
        fetchSurahs();

        let cancelled = false;
        (async () => {
            const token = await useAppStore.getState().getToken?.();
            if (!token) return;
            const data = await fetchJsonSafe(`${API_URL}/api/progress/detailed-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (data && !cancelled) setDetailedData(data);
        })();
        return () => { cancelled = true; };
    }, [fetchUserProgress, fetchSurahs]);

    const totalMistakes    = detailedData?.summary?.totalMistakes    || 0;
    const totalCorrected   = detailedData?.summary?.totalCorrected   || 0;
    const totalUncorrected = detailedData?.summary?.totalUncorrected || 0;
    const overallAccuracy  = totalMistakes > 0
        ? Math.round((totalCorrected / totalMistakes) * 100)
        : 100;

    const pieData = (detailedData?.mistakesByCategory || []).map((m, i) => ({
        name: m.rule_name_ar || m.error_type,
        value: m.uncorrected,
        color: CHART_COLORS[i % CHART_COLORS.length]
    })).filter(d => d.value > 0);

    const SUMMARY = [
        { icon: Target,         value: `${overallAccuracy}%`,                       label: 'نسبة التصحيح',        accent: 'var(--emerald-700)' },
        { icon: AlertTriangle,  value: totalUncorrected,                            label: 'أخطاء غير مصححة',     accent: 'var(--rec-error)' },
        { icon: CheckCircle,    value: totalCorrected,                              label: 'أخطاء تم تصحيحها',    accent: 'var(--emerald-500)' },
        { icon: BookOpen,       value: userProgress.versesPracticed || 0,           label: 'آيات تم التدرب عليها', accent: 'var(--brass-700)' },
    ];

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-6xl mx-auto">
            <motion.div variants={reveal}>
                <span className="ui-eyebrow">
                  <span className="num">04</span> &nbsp;//&nbsp; PROGRESS TRACKER
                </span>
                <h1 className="ui-title">لوحة تتبع التقدم</h1>
            </motion.div>

            <div className="ui-divider" aria-hidden />

            {/* Tabs */}
            <motion.div variants={reveal} className="mb-6">
                <div className="ui-tabs">
                    {[
                      { key: 'overview', label: 'OVERVIEW', icon: BarChart3 },
                      { key: 'mistakes', label: 'ERRORS',   icon: AlertTriangle },
                      { key: 'surahs',   label: 'SURAHS',   icon: BookOpen },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`ui-tab ${activeTab === tab.key ? 'is-active' : ''}`}
                            type="button"
                        >
                            <tab.icon size={12} /> {tab.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* ═══ OVERVIEW ═══ */}
            {activeTab === 'overview' && (
                <motion.div key="overview" variants={reveal} initial="hidden" animate="show">

                    {/* Summary boxes — 4 columns, single rounded card */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      border: '1px solid #DDCDA6',
                      background: '#FFFDF8',
                      borderRadius: 18,
                      overflow: 'hidden',
                      boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.28)',
                      marginBottom: 28,
                    }}>
                      {SUMMARY.map((s, i) => (
                          <div key={i} style={{
                              padding: 22, borderInlineStart: i ? '1px solid var(--sand-400)' : 'none',
                              display: 'flex', flexDirection: 'column', gap: 6, position: 'relative',
                          }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <s.icon size={16} color={s.accent} strokeWidth={2} />
                                  <span className="ui-stat-label">{s.label}</span>
                              </div>
                              <div className="ui-stat-num" style={{ color: s.accent, fontSize: 'clamp(2rem, 4vw, 2.6rem)' }}>
                                  {s.value}
                              </div>
                          </div>
                      ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        {/* Daily perf */}
                        <motion.div variants={reveal} className="ui-panel">
                            <div className="flex items-center justify-between mb-3">
                                <span className="ui-stat-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <TrendingUp size={12} /> DAILY PERFORMANCE
                                </span>
                                <span className="ui-badge">7D</span>
                            </div>
                            <div className="h-[230px]">
                                {(detailedData?.dailyPerformance || []).length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={detailedData?.dailyPerformance}>
                                            <defs>
                                                <linearGradient id="colMis" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--rec-error)" stopOpacity={0.35}/>
                                                    <stop offset="95%" stopColor="var(--rec-error)" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colCor" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--emerald-500)" stopOpacity={0.35}/>
                                                    <stop offset="95%" stopColor="var(--emerald-500)" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="2 4" stroke="var(--ink-500)" opacity={0.25} />
                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ink-700)' }} />
                                            <YAxis tick={{ fontSize: 11, fill: 'var(--ink-700)' }} />
                                            <Tooltip contentStyle={{ background: 'var(--ink-900)', border: 'none', color: 'var(--parchment-50)', borderRadius: 0 }} />
                                            <Area type="monotone" dataKey="mistakes"  stroke="var(--rec-error)"   fill="url(#colMis)" name="أخطاء" />
                                            <Area type="monotone" dataKey="corrected" stroke="var(--emerald-500)" fill="url(#colCor)" name="مصححة" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyChart text="لا توجد بيانات بعد. ابدأ التلاوة لتتبع أداءك اليومي." />
                                )}
                            </div>
                        </motion.div>

                        {/* Error distribution */}
                        <motion.div variants={reveal} className="ui-panel">
                            <div className="flex items-center justify-between mb-3">
                                <span className="ui-stat-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <BarChart3 size={12} /> ERROR DISTRIBUTION
                                </span>
                                <span className="ui-badge ui-badge--gold">LIVE</span>
                            </div>
                            <div className="h-[230px]">
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={88}
                                                 paddingAngle={2} dataKey="value" nameKey="name"
                                                 stroke="var(--ink-900)" strokeWidth={2}
                                                 label={({ name, percent }) => `${(percent*100).toFixed(0)}%`}
                                                 labelLine={false}
                                            >
                                                {pieData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ background: 'var(--ink-900)', border: 'none', color: 'var(--parchment-50)', borderRadius: 0 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <EmptyChart text="لا توجد أخطاء مسجلة." />
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Lesson progress */}
                    {detailedData?.lessonProgress?.length > 0 && (
                        <motion.div variants={reveal} className="ui-panel mb-8">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="ui-stat-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <Award size={12} /> THEORY LESSONS
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {detailedData.lessonProgress.map((lp, i) => (
                                    <div key={i} style={{
                                        background: lp.status === 'completed' ? 'var(--emerald-900)' : 'var(--parchment-200)',
                                        color: lp.status === 'completed' ? 'var(--parchment-50)' : 'var(--ink-900)',
                                        border: '1px solid var(--sand-400)',
                                        borderRadius: 14,
                                        padding: 16,
                                    }}>
                                        <div style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.15rem', lineHeight: 1.1, marginBottom: 10 }}>
                                            {lp.lessonTitle}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className={`ui-badge ${lp.status === 'completed' ? 'ui-badge--ok' : 'ui-badge--gold'}`}>
                                                {lp.status === 'completed' ? 'DONE' : 'IN PROG'}
                                            </span>
                                            <span className="font-num" style={{ fontWeight: 700, fontSize: '1.4rem' }}>
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

            {/* ═══ MISTAKES ═══ */}
            {activeTab === 'mistakes' && (
                <motion.div key="mistakes" variants={reveal} initial="hidden" animate="show">
                    {(detailedData?.mistakesByCategory || []).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {detailedData.mistakesByCategory.map((mistake, i) => {
                                const info = getErrorInfo(mistake.error_type);
                                const errPct = mistake.error_percentage;
                                const barColor = errPct > 70 ? 'var(--rec-error)' : errPct > 40 ? 'var(--brass-700)' : 'var(--emerald-500)';
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="ui-row"
                                        style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div style={{
                                                width: 44, height: 44, border: '1px solid var(--sand-400)', borderRadius: 12,
                                                background: 'var(--parchment-200)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                                                flexShrink: 0,
                                            }}>
                                                {info?.icon || '◇'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="ui-row-title" style={{ fontSize: '1.15rem' }}>
                                                      {info?.name || mistake.rule_name_ar || mistake.error_type}
                                                    </span>
                                                    <span className="ui-badge">{info?.category || mistake.rule_category}</span>
                                                </div>
                                                {info?.description && (
                                                    <p className="ui-row-sub">{info.description}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button onClick={() => router.push('/lessons')} className="ui-btn ui-btn--ghost" type="button" style={{ padding: '6px 10px', fontSize: '0.74rem' }}>
                                                    شرح
                                                </button>
                                                {mistake.uncorrected > 0 && (
                                                    <button onClick={() => router.push(`/practical-quiz/${mistake.error_type}`)} className="ui-btn ui-btn--primary" type="button" style={{ padding: '6px 10px', fontSize: '0.74rem' }}>
                                                        <Mic size={12} /> تدريب
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="ui-bar" style={{ height: 10 }}>
                                            <div className="ui-bar-fill" style={{ width: `${errPct}%`, background: barColor }} />
                                        </div>
                                        <div className="flex gap-4 text-xs" style={{ color: 'var(--ink-500)' }}>
                                            <span>إجمالي: <span className="font-num" style={{ color: 'var(--ink-900)' }}>{mistake.total}</span></span>
                                            <span>مصحح: <span className="font-num" style={{ color: 'var(--emerald-500)' }}>{mistake.corrected}</span></span>
                                            <span style={{ marginInlineStart: 'auto', color: barColor, fontWeight: 600 }}>{errPct}%</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState
                          icon={<CheckCircle size={40} />}
                          title="لا توجد أخطاء مسجلة"
                          desc="ابدأ جلسة تسميع وسيتم تتبع أخطاءك تلقائياً."
                          ctaLabel="ابدأ التسميع"
                          onCta={() => router.push('/practice')}
                        />
                    )}
                </motion.div>
            )}

            {/* ═══ SURAHS ═══ */}
            {activeTab === 'surahs' && (
                <motion.div key="surahs" variants={reveal} initial="hidden" animate="show">
                    {(detailedData?.surahStats || []).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {detailedData.surahStats.map((surah, i) => {
                                const sInfo = Array.isArray(surahs) ? surahs.find(s => s.id == surah.surah_number) : null;
                                const acc = surah.accuracy;
                                const accColor = acc >= 70 ? 'var(--emerald-500)' : acc >= 40 ? 'var(--brass-700)' : 'var(--rec-error)';
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="ui-panel"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="ui-row-title" style={{ fontSize: '1.4rem' }}>
                                                {sInfo?.name ? `سورة ${sInfo.name}` : `سورة ${surah.surah_number}`}
                                            </div>
                                            <span className="font-num" style={{ color: accColor, fontWeight: 700, fontSize: '1.4rem' }}>{acc}%</span>
                                        </div>
                                        <div className="space-y-1 text-sm" style={{ color: 'var(--ink-700)' }}>
                                            <Row label="آيات تَدُرّب عليها"     value={surah.ayahs_count}        />
                                            <Row label="إجمالي الأخطاء"         value={surah.total_mistakes}   color="var(--rec-error)" />
                                            <Row label="أخطاء مصححة"            value={surah.corrected}        color="var(--emerald-500)" />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <EmptyState
                          icon={<BookOpen size={40} />}
                          title="لم تتدرب على أي سورة بعد"
                          desc="ابدأ التسميع وستظهر إحصائيات كل سورة هنا."
                          ctaLabel="ابدأ"
                          onCta={() => router.push('/practice')}
                        />
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}

function Row({ label, value, color }) {
  return (
    <div className="flex justify-between">
      <span>{label}:</span>
      <span className="font-num" style={{ color: color || 'var(--ink-900)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function EmptyChart({ text }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--parchment-200)',
      border: '1px dashed var(--sand-400)',
      color: 'var(--ink-500)',
      fontSize: '0.9rem',
      padding: 16, textAlign: 'center',
    }}>
      {text}
    </div>
  );
}

function EmptyState({ icon, title, desc, ctaLabel, onCta }) {
  return (
    <div className="ui-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 64, height: 64, border: '1px solid var(--sand-400)', borderRadius: 16,
          marginBottom: 14, color: 'var(--ink-700)',
      }}>{icon}</div>
      <div className="ui-title" style={{ fontSize: '2rem' }}>{title}</div>
      <p style={{ color: 'var(--ink-700)', maxWidth: '40ch', margin: '12px auto 22px' }}>{desc}</p>
      <button onClick={onCta} className="ui-cta" type="button">{ctaLabel}</button>
    </div>
  );
}
