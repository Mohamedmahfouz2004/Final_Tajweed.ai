'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Play, BookOpen, Mic, BookMarked,
  Sparkles, RefreshCw, ChevronRight, Check, UserPlus, Headphones,
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { getErrorInfo } from '../utils/errorTypeMap';
import { API_BASE } from '../utils/apiConfig';

/* ─────────────────────────────────────────────
   THE 11 TAJWEED ATTRIBUTES (mirror Muaalem heads)
   Used to render the mastery list even when the
   user has no data yet.
───────────────────────────────────────────── */
const RULE_CATALOG = [
  { key: 'ghunna',       name: 'الغنّة',                category: 'صفات النون والميم' },
  { key: 'madd',         name: 'أحكام المدّ',           category: 'المدّ' },
  { key: 'qalqala',      name: 'القلقلة',              category: 'الصفات' },
  { key: 'tafkheem',     name: 'التفخيم والترقيق',     category: 'الصفات' },
  { key: 'hams_jahr',    name: 'الهمس والجهر',         category: 'الصفات' },
  { key: 'shidda',       name: 'الشدّة والرخاوة',       category: 'الصفات' },
  { key: 'safeer',       name: 'الصفير',               category: 'الصفات' },
  { key: 'istitala',     name: 'الاستطالة',            category: 'الصفات' },
  { key: 'sifat',        name: 'سائر الصفات',          category: 'الصفات' },
  { key: 'vowel',        name: 'الحركات',              category: 'النطق' },
  { key: 'phoneme',      name: 'الحرف الأساس',          category: 'النطق' },
];

/* ── motion ── */
const reveal = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
};
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/* Western digits → Arabic-Indic, for an authentically Arabic UI */
const ar = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

function masteryLabel(v) {
  if (v >= 90) return 'إتقان';
  if (v >= 70) return 'جيّد';
  if (v >= 40) return 'يتحسّن';
  if (v >  0)  return 'يحتاج تدريبًا';
  return 'لم تبدأ';
}

/* slim parchment progress bar with emerald fill */
function Bar({ value = 0, idle = false }) {
  return (
    <span className="hm-bar" aria-hidden>
      <motion.span
        className={`hm-bar-fill ${idle ? 'is-idle' : ''}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   HOME — illuminated, warm, calligraphy-forward
═══════════════════════════════════════════════════ */
export default function HomeView() {
  const router = useRouter();
  const isLoggedIn         = useAppStore(s => s.isLoggedIn);
  const userProgress       = useAppStore(s => s.userProgress);
  const fetchUserProgress  = useAppStore(s => s.fetchUserProgress);
  const lastSession        = useAppStore(s => s.lastSession);
  const resumeLastSession  = useAppStore(s => s.resumeLastSession);
  const setSelectedSurah   = useAppStore(s => s.setSelectedSurah);
  const setFromVerse       = useAppStore(s => s.setFromVerse);
  const setToVerse         = useAppStore(s => s.setToVerse);
  const surahs             = useAppStore(s => s.surahs);
  const requireAuth        = useAppStore(s => s.requireAuth);

  const [detailed, setDetailed] = useState(null);

  useEffect(() => {
    if (isLoggedIn) fetchUserProgress();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      const token = await useAppStore.getState().getToken?.();
      if (!token) return;
      fetch(`${API_BASE}/api/progress/detailed-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(d => setDetailed(d))
        .catch(() => {});
    })();
  }, [isLoggedIn]);

  /* Compute mastery per rule: (total - uncorrected) / total × 100 */
  const ruleStats = useMemo(() => {
    const byKey = {};
    (detailed?.mistakesByCategory || []).forEach(m => {
      byKey[m.error_type] = {
        total: m.total ?? 0,
        corrected: m.corrected ?? 0,
        uncorrected: m.uncorrected ?? 0,
        error_pct: m.error_percentage ?? 0,
      };
    });

    return RULE_CATALOG.map(rule => {
      const r = byKey[rule.key];
      if (!r || r.total === 0) {
        return { ...rule, mastery: 0, total: 0, uncorrected: 0, untouched: true };
      }
      const mastery = r.total > 0
        ? Math.round(((r.total - r.uncorrected) / r.total) * 100)
        : 100;
      return { ...rule, mastery, total: r.total, uncorrected: r.uncorrected, untouched: false };
    });
  }, [detailed]);

  const overallMastery = useMemo(() => {
    const touched = ruleStats.filter(r => !r.untouched);
    if (touched.length === 0) return 0;
    return Math.round(touched.reduce((s, r) => s + r.mastery, 0) / touched.length);
  }, [ruleStats]);

  const touchedCount = useMemo(
    () => ruleStats.filter(r => !r.untouched).length,
    [ruleStats]
  );

  /* Suggested next focus: rule with most uncorrected mistakes; fallback first untouched */
  const suggestedRule = useMemo(() => {
    const withWork = ruleStats.filter(r => r.uncorrected > 0)
      .sort((a, b) => b.uncorrected - a.uncorrected);
    if (withWork.length) return withWork[0];
    return ruleStats.find(r => r.untouched) || ruleStats[0];
  }, [ruleStats]);

  /* Continue CTA target. Prefer lastSession; else Al-Fatiha 1..7 */
  const resumeTarget = useMemo(() => {
    if (lastSession?.surahId) {
      const s = surahs?.find?.(s => s.id == lastSession.surahId);
      return {
        surahId:  lastSession.surahId,
        fromAyah: lastSession.fromAyah || 1,
        toAyah:   lastSession.toAyah   || (s?.verses_count ?? 7),
        surahName: s?.name_arabic || s?.name || `سورة ${lastSession.surahId}`,
        firstTime: false,
      };
    }
    return {
      surahId: 1, fromAyah: 1, toAyah: 7,
      surahName: 'الفاتحة', firstTime: true,
    };
  }, [lastSession, surahs]);

  const startSession = () => {
    setSelectedSurah(resumeTarget.surahId);
    setFromVerse(resumeTarget.fromAyah);
    setToVerse(resumeTarget.toAyah);
    if (isLoggedIn) router.push('/live-moshaf');
    else requireAuth();
  };

  const drillRule = (key) => {
    if (!isLoggedIn) { requireAuth(); return; }
    router.push(`/practical-quiz/${key}`);
  };

  const ringCirc = 2 * Math.PI * 50; // r=50

  return (
    <div className="hm-root">

      {/* ─────────── VERSE — free calligraphy on parchment ─────────── */}
      <div className="hm-verse-wrap">
        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="hm-verse"
        >
          <span className="hm-verse-paren">﴿</span>
          <span className="hm-verse-text">
            وَرَتِّلِ&nbsp;الْقُرْآنَ&nbsp;تَرْتِيلًا
          </span>
          <span className="hm-verse-paren">﴾</span>
        </motion.div>
      </div>


      {/* ─────────── HERO — conditional on auth ─────────── */}
      {isLoggedIn ? (
        /* ── LOGGED IN: session resume + mastery ring ── */
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="hm-hero" style={{
          backgroundColor: '#1E3B22',
          backgroundImage: 'radial-gradient(130% 120% at 100% 0%, rgba(45,125,82,0.35), transparent 55%), linear-gradient(135deg, #1E3B22 0%, #223F26 48%, #1A3D28 100%)',
          border: '1px solid rgba(212,196,160,0.28)',
          borderRadius: '20px',
          boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.28)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '0',
          padding: '28px 28px 24px',
          marginBottom: '24px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div className="hm-hero-body" style={{ flex: 1, minWidth: 0, paddingInlineEnd: '24px' }}>
            <span className="hm-eyebrow gold">
              {resumeTarget.firstTime ? 'ابدأ من هنا' : 'تابع من حيث توقّفت'}
            </span>
            <h1 className="hm-hero-title">
              سورة {resumeTarget.surahName}
              <span className="hm-hero-range">
                {' '}·{' '}الآيات {ar(resumeTarget.fromAyah)} – {ar(resumeTarget.toAyah)}
              </span>
            </h1>
            <p className="hm-hero-sub">
              جلسة تدريبية قصيرة على القراءة بتطبيق
              {suggestedRule ? ` حكم «${suggestedRule.name}»` : ' أحكام التجويد'}
              ، مع تحليلٍ لحظيٍّ ودقيقٍ لتلاوتك.
            </p>
            <div className="hm-cta-row">
              <button onClick={startSession} className="hm-cta" type="button">
                <Play size={16} strokeWidth={2.5} fill="currentColor" />
                {resumeTarget.firstTime ? 'ابدأ التلاوة' : 'تابع الجلسة'}
                <ArrowLeft size={15} strokeWidth={2.5} className="hm-cta-arrow" />
              </button>
              <button onClick={() => router.push('/practice')} className="hm-ghost" type="button">
                <RefreshCw size={13} strokeWidth={2.2} /> اختيار سورة أخرى
              </button>
            </div>
          </div>

          <div className="hm-hero-divider" style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(212,196,160,0.18)', flexShrink: 0 }} />

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', paddingInlineStart: '24px' }}>
            <svg viewBox="0 0 120 120" width="108" height="108" aria-hidden>
              <defs>
                <linearGradient id="hmRing" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#D4AF37" />
                  <stop offset="1" stopColor="#F1E6CA" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth="9" />
              <motion.circle
                cx="60" cy="60" r="50" fill="none"
                stroke="url(#hmRing)" strokeWidth="9" strokeLinecap="round"
                strokeDasharray={ringCirc}
                initial={{ strokeDashoffset: ringCirc }}
                animate={{ strokeDashoffset: ringCirc - (overallMastery / 100) * ringCirc }}
                transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
              <text x="60" y="58" textAnchor="middle" className="hm-ring-num">{ar(overallMastery)}٪</text>
              <text x="60" y="76" textAnchor="middle" className="hm-ring-lbl">الإتقان العام</text>
            </svg>
            <span className="hm-ring-foot" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
              {ar(touchedCount)} / {ar(RULE_CATALOG.length)} · {masteryLabel(overallMastery)}
            </span>
          </div>
        </motion.section>
      ) : (
        /* ── NOT LOGGED IN: welcome CTA ── */
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="hm-hero" style={{
          backgroundColor: '#1E3B22',
          backgroundImage: 'radial-gradient(130% 120% at 100% 0%, rgba(45,125,82,0.35), transparent 55%), linear-gradient(135deg, #1E3B22 0%, #223F26 48%, #1A3D28 100%)',
          border: '1px solid rgba(212,196,160,0.28)',
          borderRadius: '20px',
          boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.28)',
          padding: '36px 28px 32px',
          marginBottom: '24px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div className="hm-hero-body" style={{ position: 'relative', zIndex: 1 }}>
            <span className="hm-eyebrow gold">
              <Sparkles size={11} /> منصة تعليمية بالذكاء الاصطناعي
            </span>
            <h1 className="hm-hero-title" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '14px' }}>
              أتقن التجويد مع معلّم ذكي
            </h1>
            <p className="hm-hero-sub" style={{ maxWidth: '52ch', marginBottom: '10px' }}>
              سجّل تلاوتك واحصل على تحليل فوري ودقيق لأحكام التجويد. نظامنا يحلل صوتك على مستوى الحرف والحركة ويرشدك للتصحيح خطوة بخطوة.
            </p>

            <div style={{
              display: 'flex', gap: '12px', flexWrap: 'wrap',
              margin: '18px 0 24px',
              fontSize: '0.88rem', color: 'rgba(240,234,214,0.75)',
              fontFamily: "'IBM Plex Sans Arabic', sans-serif",
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mic size={14} style={{ color: '#D4AF37' }} /> تسجيل وتحليل فوري
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={14} style={{ color: '#D4AF37' }} /> دروس تفاعلية
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Headphones size={14} style={{ color: '#D4AF37' }} /> استمع وردّد
              </span>
            </div>

            <div className="hm-cta-row">
              <button onClick={() => router.push('/register')} className="hm-cta" type="button">
                <UserPlus size={16} strokeWidth={2.2} />
                انضم إلينا — مجاناً
                <ArrowLeft size={15} strokeWidth={2.5} className="hm-cta-arrow" />
              </button>
              <button onClick={() => router.push('/login')} className="hm-ghost" type="button">
                عندي حساب بالفعل
              </button>
            </div>
          </div>
        </motion.section>
      )}




      {/* ─────────── FOCUS — only for logged-in users ─────────── */}
      {isLoggedIn && (
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="hm-focus-wrap" style={{
        backgroundColor: '#1E3B22',
        backgroundImage: 'radial-gradient(80% 120% at 100% 0%, rgba(45,125,82,0.32), transparent 55%), linear-gradient(135deg, #1E3B22 0%, #223F26 50%, #1C3D28 100%)',
        border: '1px solid rgba(212,196,160,0.28)',
        borderRadius: '20px',
        boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.28)',
        padding: '28px',
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '10px',
        minHeight: '190px',
        marginTop: '12px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'contents' }}>
          <span className="hm-eyebrow gold"><Sparkles size={11} /> التالي</span>
          <h3 className="hm-focus-head" style={{ paddingInlineEnd: '8px' }}>ركّز على</h3>
          {suggestedRule ? (
            <button onClick={() => drillRule(suggestedRule.key)} className="hm-focus" type="button">
              <div>
                <div className="hm-focus-name">{suggestedRule.name}</div>
                <div className="hm-focus-meta">
                  {suggestedRule.untouched
                    ? 'لم تتدرّب على هذا الحكم بعد'
                    : `${ar(suggestedRule.uncorrected)} حالة تحتاج تصحيحًا`}
                </div>
              </div>
              <ArrowLeft size={18} className="hm-focus-arrow" />
            </button>
          ) : (
            <p className="hm-focus-empty">أحسنت! لا توجد أحكام تحتاج تدريبًا الآن.</p>
          )}
        </div>
      </motion.section>
      )}

      {/* ═══════════ SHARED SECTIONS — visible to ALL users ═══════════ */}

          {/* ─── HOW IT WORKS ─── */}
          <motion.section 
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-20px" }}
            className="hm-card" 
            style={{ marginTop: '12px' }}
          >
            <header className="hm-card-head">
              <div>
                <span className="hm-eyebrow">كيف يعمل؟</span>
                <h2 className="hm-card-title">ثلاث خطوات لإتقان التجويد</h2>
              </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
              {[
                {
                  num: '١',
                  title: 'استمع أولاً',
                  desc: 'اختر السورة والقارئ واستمع للتلاوة الصحيحة. كرّر المقطع حتى تحفظ النطق.',
                  color: '#2D7D52',
                },
                {
                  num: '٢',
                  title: 'سجّل تلاوتك',
                  desc: 'افتح المصحف المباشر وسجّل صوتك. نظامنا يحلل كل حرف وحركة في الوقت الفعلي.',
                  color: '#D4AF37',
                },
                {
                  num: '٣',
                  title: 'تابع تقدمك',
                  desc: 'شاهد إحصائياتك وتعرّف على نقاط ضعفك. النظام يقترح لك تمارين مخصصة للتحسين.',
                  color: '#8B6D2E',
                },
              ].map((step) => (
                <motion.div variants={reveal} key={step.num} style={{
                  padding: '24px 22px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(212,196,160,0.55)',
                  borderRadius: '14px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'default',
                }}>
                  <div style={{
                    width: '44px', height: '44px',
                    borderRadius: '12px',
                    background: step.color,
                    color: '#FBF7EF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Rakkas', cursive",
                    fontSize: '1.5rem',
                    marginBottom: '14px',
                    boxShadow: `0 6px 16px -6px ${step.color}55`,
                  }}>
                    {step.num}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                    fontWeight: 700, fontSize: '1.1rem', color: '#1C1208',
                    marginBottom: '8px',
                  }}>
                    {step.title}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                    fontSize: '0.88rem', color: '#6B5E44', lineHeight: 1.7,
                  }}>
                    {step.desc}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ─── FEATURES SHOWCASE ─── */}
          <motion.section 
            variants={stagger}
            initial="hidden" 
            whileInView="show" 
            viewport={{ once: true, margin: "-20px" }}
            style={{ marginTop: '12px' }}
          >
            <div style={{ marginBottom: '22px' }}>
              <span className="hm-eyebrow">ماذا نقدم لك؟</span>
              <h2 className="hm-card-title" style={{ marginTop: '8px' }}>كل ما تحتاجه لتعلّم التجويد</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', alignItems: 'stretch' }}>
              {/* Feature 1: Listen */}
              <motion.div 
                variants={reveal}
                onClick={() => router.push('/listen')}
                whileHover={{ y: -5, boxShadow: '0 18px 40px -15px rgba(212,175,55,0.3)' }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '28px 24px',
                  background: '#FFFDF8',
                  border: '1px solid #DDCDA6',
                  borderRadius: '20px',
                  boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 12px 28px -18px rgba(15,26,13,0.2)',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0F1A0D, #1A5C3A)',
                  color: '#F1E6CA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '18px',
                  boxShadow: '0 4px 12px -4px rgba(15,26,13,0.5)',
                }}>
                  <Headphones size={24} />
                </div>
                <h3 style={{ fontFamily: "'Rakkas', cursive", fontSize: '1.4rem', color: '#1C1208', marginBottom: '8px' }}>
                  استمع وردّد
                </h3>
                <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '0.9rem', color: '#6B5E44', lineHeight: 1.7, marginBottom: '16px' }}>
                  اختر من بين عشرات القراء المشهورين واستمع لأي سورة وأي مقطع تريده. كرّر الآيات حتى تتقنها ثم اختبر نفسك.
                </p>
                <div style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
                  <span className="hm-quiet-btn" style={{ fontSize: '0.82rem', pointerEvents: 'none' }}>
                    ابدأ الاستماع <ChevronRight size={13} className="flip" />
                  </span>
                </div>
              </motion.div>

              {/* Feature 2: Practice */}
              <motion.div 
                variants={reveal}
                onClick={() => router.push('/register')}
                whileHover={{ y: -5, boxShadow: '0 18px 40px -15px rgba(212,175,55,0.3)' }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '28px 24px',
                  background: '#FFFDF8',
                  border: '1px solid #DDCDA6',
                  borderRadius: '20px',
                  boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 12px 28px -18px rgba(15,26,13,0.2)',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0F1A0D, #1A5C3A)',
                  color: '#F1E6CA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '18px',
                  boxShadow: '0 4px 12px -4px rgba(15,26,13,0.5)',
                }}>
                  <Mic size={24} />
                </div>
                <h3 style={{ fontFamily: "'Rakkas', cursive", fontSize: '1.4rem', color: '#1C1208', marginBottom: '8px' }}>
                  تحليل ذكي للتلاوة
                </h3>
                <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '0.9rem', color: '#6B5E44', lineHeight: 1.7, marginBottom: '16px' }}>
                  سجّل تلاوتك ونظامنا يحلل صوتك بالذكاء الاصطناعي — يرصد أخطاء المد والغنة والقلقلة والمخارج بدقة على مستوى الحرف.
                </p>
                <div style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
                  <span className="hm-quiet-btn" style={{ fontSize: '0.82rem', pointerEvents: 'none' }}>
                    سجّل للبدء <ChevronRight size={13} className="flip" />
                  </span>
                </div>
              </motion.div>

              {/* Feature 3: Lessons */}
              <motion.div 
                variants={reveal}
                onClick={() => router.push('/register')}
                whileHover={{ y: -5, boxShadow: '0 18px 40px -15px rgba(212,175,55,0.3)' }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '28px 24px',
                  background: '#FFFDF8',
                  border: '1px solid #DDCDA6',
                  borderRadius: '20px',
                  boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 12px 28px -18px rgba(15,26,13,0.2)',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0F1A0D, #1A5C3A)',
                  color: '#F1E6CA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '18px',
                  boxShadow: '0 4px 12px -4px rgba(15,26,13,0.5)',
                }}>
                  <BookOpen size={24} />
                </div>
                <h3 style={{ fontFamily: "'Rakkas', cursive", fontSize: '1.4rem', color: '#1C1208', marginBottom: '8px' }}>
                  دروس تفاعلية
                </h3>
                <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '0.9rem', color: '#6B5E44', lineHeight: 1.7, marginBottom: '16px' }}>
                  تعلّم أحكام التجويد من الصفر بأسلوب سهل ومتدرّج. كل درس يتضمن شرحًا نظريًا وأمثلة صوتية واختبارًا عمليًا لقياس فهمك.
                </p>
                <div style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
                  <span className="hm-quiet-btn" style={{ fontSize: '0.82rem', pointerEvents: 'none' }}>
                    سجّل للبدء <ChevronRight size={13} className="flip" />
                  </span>
                </div>
              </motion.div>

              {/* Feature 4: Tafseer */}
              <motion.div 
                variants={reveal}
                onClick={() => router.push('/tafseer')}
                whileHover={{ y: -5, boxShadow: '0 18px 40px -15px rgba(212,175,55,0.3)' }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  padding: '28px 24px',
                  background: '#FFFDF8',
                  border: '1px solid #DDCDA6',
                  borderRadius: '20px',
                  boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 12px 28px -18px rgba(15,26,13,0.2)',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0F1A0D, #1A5C3A)',
                  color: '#F1E6CA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '18px',
                  boxShadow: '0 4px 12px -4px rgba(15,26,13,0.5)',
                }}>
                  <BookMarked size={24} />
                </div>
                <h3 style={{ fontFamily: "'Rakkas', cursive", fontSize: '1.4rem', color: '#1C1208', marginBottom: '8px' }}>
                  القرآن مع التفسير
                </h3>
                <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '0.9rem', color: '#6B5E44', lineHeight: 1.7, marginBottom: '16px' }}>
                  اقرأ القرآن الكريم بخط عثماني مع تفسير ابن كثير. تصفّح السور واستمع للتلاوة مع فهم المعاني في مكان واحد.
                </p>
                <div style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
                  <span className="hm-quiet-btn" style={{ fontSize: '0.82rem', pointerEvents: 'none' }}>
                    تصفح التفسير <ChevronRight size={13} className="flip" />
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.section>



      {/* ─── BOTTOM CTA BANNER — guest only ─── */}
      {!isLoggedIn && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }} 
            whileInView={{ opacity: 1, scale: 1 }} 
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="hm-hero" style={{
            backgroundColor: '#1E3B22',
            backgroundImage: 'radial-gradient(80% 120% at 100% 0%, rgba(45,125,82,0.32), transparent 55%), linear-gradient(135deg, #1E3B22 0%, #223F26 50%, #1C3D28 100%)',
            border: '1px solid rgba(212,196,160,0.28)',
            borderRadius: '20px',
            boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.28)',
            padding: '36px 28px',
            marginTop: '24px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '580px', margin: '0 auto' }}>
              <h2 style={{
                fontFamily: "'Rakkas', cursive",
                fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
                color: '#FFFFFF', lineHeight: 1.3,
                marginBottom: '14px',
              }}>
                ابدأ رحلتك في إتقان التجويد اليوم
              </h2>
              <p style={{
                fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.7, marginBottom: '24px',
              }}>
                انضم لآلاف المتعلمين الذين يحسّنون تلاوتهم يوميًا بمساعدة الذكاء الاصطناعي. مجاني بالكامل.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button onClick={() => router.push('/register')} className="hm-cta" type="button">
                  <UserPlus size={16} strokeWidth={2.2} />
                  أنشئ حسابك مجاناً
                  <ArrowLeft size={15} strokeWidth={2.5} className="hm-cta-arrow" />
                </button>
              </div>
            </div>
          </motion.section>
      )}


      {/* ════════════ PAGE STYLES — WARM / ILLUMINATED ════════════ */}
      <style jsx>{`
        .hm-root { display: flex; flex-direction: column; }

        /* shared eyebrow */
        .hm-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.66rem; letter-spacing: 0.22em; text-transform: uppercase;
          color: #8B6D2E;
        }
        .hm-eyebrow.gold { color: #D4AF37; }
        .flip { transform: scaleX(-1); }

        /* ── VERSE (free calligraphy) ── */
        .hm-verse-wrap {
          display: flex;
          justify-content: center;
          width: 100%;
          margin: 16px 0 24px;
        }
        .hm-verse {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
        }
        .hm-verse-paren {
          font-family: 'Rakkas', cursive;
          color: #B8963E; opacity: 0.85;
          font-size: clamp(2.2rem, 5vw, 3.2rem); line-height: 1;
        }
        .hm-verse-text {
          font-family: 'Rakkas', cursive;
          font-size: clamp(2rem, 5.5vw, 3.2rem); line-height: 1.4;
          color: #0D3D24;
        }
        .hm-verse-cite {
          display: flex; align-items: center; justify-content: center; gap: 12px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-size: 0.82rem; color: #6B5E44;
          margin-bottom: 30px;
        }
        .hm-verse-cite .line {
          width: 34px; height: 1px;
          background: linear-gradient(90deg, transparent, #B8963E);
        }
        .hm-verse-cite .line:last-child {
          background: linear-gradient(90deg, #B8963E, transparent);
        }

        /* ── HERO — layout fully in inline styles; only ::before texture here ── */
        .hm-hero { position: relative; }
        .hm-hero::after { content: none; }
        /* faint woven texture for depth (no external asset) */
        .hm-hero::before {
          content: '';
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            radial-gradient(circle at 1px 1px, rgba(212,175,55,0.10) 1px, transparent 0),
            repeating-linear-gradient(45deg, rgba(212,175,55,0.035) 0 12px, transparent 12px 24px);
          background-size: 22px 22px, auto;
          opacity: 0.7;
          mask-image: radial-gradient(120% 100% at 100% 0%, #000 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(120% 100% at 100% 0%, #000 30%, transparent 75%);
        }
        .hm-hero-body { position: relative; z-index: 1; min-width: 0; }
        .hm-hero-title {
          font-family: 'Rakkas', cursive; font-weight: 400;
          font-size: clamp(1.7rem, 3.5vw, 2.2rem); line-height: 1.2;
          margin: 10px 0 0; color: #FFFFFF;
        }
        .hm-hero-range {
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-size: 0.52em; font-weight: 500;
          color: rgba(212,175,55,0.95);
        }
        .hm-hero-sub {
          margin: 12px 0 20px; max-width: 46ch;
          color: rgba(255,255,255,0.78);
          font-size: 0.95rem; line-height: 1.72;
        }
        .hm-cta-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
        .hm-cta {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 14px 28px;
          background: linear-gradient(135deg, #D4AF37 0%, #F1E6CA 100%);
          color: #0F1A0D;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-weight: 700; font-size: 0.98rem;
          border: none; border-radius: 999px; cursor: pointer;
          box-shadow: 0 8px 24px -6px rgba(212,175,55,0.55);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .hm-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 32px -6px rgba(212,175,55,0.7); }
        .hm-cta-arrow { transition: transform 0.18s ease; }
        .hm-cta:hover .hm-cta-arrow { transform: translateX(-5px); }
        .hm-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          background: transparent; color: rgba(240,234,214,0.85);
          border: 1px solid rgba(212,196,160,0.32);
          border-radius: 999px; padding: 11px 18px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-size: 0.86rem; cursor: pointer;
          transition: all 0.16s ease;
        }
        .hm-ghost:hover { color: #F4E4BC; border-color: rgba(212,175,55,0.65); background: rgba(212,175,55,0.08); }

        .hm-hero-ring {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .hm-hero-ring :global(.hm-ring-num) {
          font-family: 'Rakkas', cursive; font-size: 26px; fill: #F4E4BC;
        }
        .hm-hero-ring :global(.hm-ring-lbl) {
          font-family: 'IBM Plex Sans Arabic', sans-serif; font-size: 8.5px;
          letter-spacing: 0.04em; fill: rgba(212,175,55,0.85);
        }
        .hm-ring-foot {
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-size: 0.76rem; color: rgba(255,255,255,0.65);
          text-align: center;
        }

        /* ── CARD shell ── */
        .hm-card {
          background: #FFFDF8;
          border: 1px solid #DDCDA6;
          border-radius: 20px;
          padding: 28px 28px 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.28);
        }
        .hm-card-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 14px; margin-bottom: 22px;
        }
        .hm-card-title {
          font-family: 'Rakkas', cursive; font-weight: 400;
          font-size: 1.85rem; line-height: 1.1; margin: 8px 0 0; color: #1C1208;
        }
        .hm-quiet-btn {
          display: inline-flex; align-items: center; gap: 5px;
          background: #F1E6CA; border: 1px solid rgba(212,196,160,0.9);
          border-radius: 999px; padding: 8px 15px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-size: 0.8rem; color: #3D2F1C; cursor: pointer;
          transition: all 0.15s ease; white-space: nowrap;
        }
        .hm-quiet-btn:hover { background: #E8DCB8; border-color: #B8963E; }

        /* ── SKILLS GRID ── */
        .hm-skill-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .hm-skill {
          display: flex; flex-direction: column; gap: 9px;
          padding: 18px 18px 16px;
          background: #FFFFFF;
          border: 1px solid rgba(212,196,160,0.55);
          border-radius: 14px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .hm-skill:hover {
          transform: translateY(-3px);
          border-color: rgba(184,150,62,0.55);
          box-shadow: 0 14px 30px -16px rgba(15,26,13,0.28);
        }
        .hm-skill.is-idle { background: #FBF8F0; }
        .hm-skill-cat {
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.6rem; letter-spacing: 0.04em;
          color: #9A8A6A;
        }
        .hm-skill-name {
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-weight: 700; font-size: 1.12rem; color: #1C1208; line-height: 1.2;
        }
        .hm-skill-foot {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-top: 2px;
        }
        .hm-skill-pct {
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-weight: 700; font-size: 0.92rem; color: #1A5C3A;
        }
        .hm-skill-pct.is-idle { color: #9A8A6A; font-weight: 500; font-size: 0.82rem; }
        .hm-skill-ok {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-size: 0.8rem; font-weight: 600; color: #2D7D52;
        }
        .hm-drill {
          display: inline-flex; align-items: center;
          padding: 7px 16px;
          background: #1A5C3A; color: #FBF7EF;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-weight: 700; font-size: 0.8rem;
          border: none; border-radius: 999px; cursor: pointer;
          transition: all 0.15s ease;
        }
        .hm-drill:hover { background: #2D7D52; transform: translateY(-1px); box-shadow: 0 6px 14px -4px rgba(45,125,82,0.5); }
        .hm-drill.ghost {
          background: transparent; color: #8B6D2E;
          border: 1px solid rgba(184,150,62,0.5);
        }
        .hm-drill.ghost:hover { background: #F1E6CA; color: #6B5417; box-shadow: none; }

        /* ── BAR ── */
        .hm-bar {
          display: block; width: 100%; height: 7px;
          background: #ECE3D2; border-radius: 999px; overflow: hidden;
        }
        .hm-bar-fill {
          display: block; height: 100%;
          background: linear-gradient(90deg, #1A5C3A, #2D7D52);
          border-radius: 999px;
        }
        .hm-bar-fill.is-idle { background: #D4C4A0; }

        /* hm-bottom removed — focus card is now full-width above links row */

        /* hm-focus-card: all styles moved to inline — no CSS class conflict */
        .hm-focus-head {
          font-family: 'Rakkas', cursive; font-weight: 400;
          font-size: 1.2rem; margin: 0; color: #FFFFFF;
        }
        .hm-focus {
          width: 100%; margin-top: 0;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 20px 22px;
          background: rgba(251,247,239,0.07);
          border: 1px solid rgba(212,196,160,0.26);
          border-radius: 14px; cursor: pointer; text-align: start;
          transition: all 0.18s ease;
        }
        .hm-focus:hover {
          background: rgba(212,175,55,0.10);
          border-color: rgba(212,175,55,0.55);
          transform: translateY(-2px);
        }
        .hm-focus-name {
          font-family: 'Rakkas', cursive; font-size: 1.25rem; line-height: 1.2; color: #FFFFFF;
        }
        .hm-focus-meta { margin-top: 6px; font-size: 0.84rem; color: rgba(255,255,255,0.68); }
        .hm-focus-arrow { color: #D4AF37; transition: transform 0.16s ease; flex-shrink: 0; }
        .hm-focus:hover .hm-focus-arrow { transform: translateX(-5px); }
        .hm-focus-empty {
          margin-top: auto;
          padding: 20px; border-radius: 14px;
          background: rgba(251,247,239,0.06);
          border: 1px solid rgba(212,175,55,0.2);
          color: #F4E4BC; font-size: 0.96rem; font-weight: 600;
        }

        /* LINKS card */
        .hm-links-card { display: flex; flex-direction: column; }
        .hm-links { display: flex; gap: 10px; }
        .hm-link {
          display: flex; align-items: center; gap: 15px;
          padding: 15px 16px;
          background: #FFFFFF;
          border: 1px solid rgba(212,196,160,0.55);
          border-radius: 14px; cursor: pointer; width: 100%; text-align: start;
          transition: all 0.18s ease;
        }
        .hm-link:hover {
          border-color: rgba(184,150,62,0.55);
          background: #FFFDF8;
          transform: translateX(-3px);
          box-shadow: 0 12px 26px -16px rgba(15,26,13,0.28);
        }
        .hm-link-icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; flex-shrink: 0;
          background: linear-gradient(135deg, #0F1A0D, #1A5C3A);
          color: #F1E6CA; border-radius: 12px;
          box-shadow: 0 4px 12px -4px rgba(15,26,13,0.5);
        }
        .hm-link-text { min-width: 0; }
        .hm-link-title {
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-weight: 700; font-size: 1.04rem; color: #1C1208;
        }
        .hm-link-sub { font-size: 0.8rem; color: #6B5E44; margin-top: 2px; }
        .hm-link-chev { color: #9A8A6A; margin-inline-start: auto; flex-shrink: 0; }
        .hm-link:hover .hm-link-chev { color: #B8963E; }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .hm-skill-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 760px) {
          .hm-hero { flex-direction: column !important; padding: 24px 20px !important; gap: 20px !important; }
          .hm-hero-divider { display: none !important; }
          .hm-hero-ring { order: -1; }
          .hm-hero-body { padding-inline-end: 0 !important; }
          .hm-bottom { grid-template-columns: 1fr; }
          .hm-links { flex-direction: column !important; }
          .hm-cta-row { justify-content: center; }
          .hm-cta { width: 100%; justify-content: center; }
          .hm-ghost { width: 100%; justify-content: center; }
          .hm-card { padding: 22px 18px 20px; }
          .hm-card-head { flex-direction: column; gap: 10px; }
          .hm-focus-wrap { padding: 22px 18px !important; min-height: auto !important; }
          .hm-verse-text { font-size: 1.6rem !important; }
          .hm-verse-paren { font-size: 1.8rem !important; }
        }
        @media (max-width: 480px) {
          .hm-skill-grid { grid-template-columns: 1fr; }
          .hm-hero { padding: 20px 16px !important; }
          .hm-hero-title { font-size: 1.5rem !important; }
          .hm-card-title { font-size: 1.4rem !important; }
        }
      `}</style>
    </div>
  );
}
