'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Play, BookOpen, Mic, BookMarked,
  Sparkles, RefreshCw, ChevronRight, Check,
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
    <motion.div className="hm-root" variants={stagger} initial="hidden" animate="show">

      {/* ─────────── VERSE — free calligraphy on parchment ─────────── */}
      <div className="hm-verse-wrap">
        <motion.div variants={reveal} className="hm-verse">
          <span className="hm-verse-paren">﴿</span>
          <span className="hm-verse-text">
            وَرَتِّلِ&nbsp;الْقُرْآنَ&nbsp;تَرْتِيلًا
          </span>
          <span className="hm-verse-paren">﴾</span>
        </motion.div>
      </div>


      {/* ─────────── HERO — emerald card + gold mastery ring ─────────── */}
      <motion.section variants={reveal} className="hm-hero" style={{
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
        {/* Body — fills available width, text right-aligned for RTL */}
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

        {/* Divider */}
        <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(212,196,160,0.18)', flexShrink: 0 }} />

        {/* Ring — compact aside on the left */}
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

      {/* ─────────── MASTERY SKILLS ─────────── */}
      <motion.section variants={reveal} className="hm-card">
        <header className="hm-card-head">
          <div>
            <span className="hm-eyebrow">المهارات</span>
            <h2 className="hm-card-title">إتقانك لأحكام التجويد</h2>
          </div>
          <button onClick={() => router.push('/progress')} className="hm-quiet-btn" type="button">
            تفصيل الإحصاءات <ChevronRight size={14} className="flip" />
          </button>
        </header>

        <div className="hm-skill-grid">
          {ruleStats.map((rule) => (
            <div key={rule.key} className={`hm-skill ${rule.untouched ? 'is-idle' : ''}`}>
              <span className="hm-skill-cat">{rule.category}</span>
              <div className="hm-skill-name">{rule.name}</div>
              <Bar value={rule.mastery} idle={rule.untouched} />
              <div className="hm-skill-foot">
                <span className={`hm-skill-pct ${rule.untouched ? 'is-idle' : ''}`}>
                  {rule.untouched ? 'لم تبدأ' : `${ar(rule.mastery)}٪`}
                </span>
                {rule.uncorrected > 0 ? (
                  <button onClick={() => drillRule(rule.key)} className="hm-drill" type="button">
                    تدرّب
                  </button>
                ) : !rule.untouched ? (
                  <span className="hm-skill-ok"><Check size={13} strokeWidth={3} /> أُتقن</span>
                ) : (
                  <button onClick={() => drillRule(rule.key)} className="hm-drill ghost" type="button">
                    ابدأ
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ─────────── BOTTOM ROW — FOCUS full-width + links row ─────────── */}
      <motion.section variants={reveal} className="hm-focus-wrap" style={{
        backgroundColor: '#1E3B22',
        backgroundImage: 'radial-gradient(80% 120% at 100% 0%, rgba(45,125,82,0.32), transparent 55%), linear-gradient(135deg, #1E3B22 0%, #223F26 50%, #1C3D28 100%)',
        border: '1px solid rgba(212,196,160,0.28)',
        borderRadius: '20px',
        boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.28)',
        padding: '28px 28px 28px',
        overflow: 'visible',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '10px',
        minHeight: '190px',
        marginTop: '36px',
        marginBottom: '36px',
      }}>
        {/* Text + button — natural block flow, card centers vertically */}
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

      {/* ─────────── QUICK LINKS — 3 cards in a row ─────────── */}
      <motion.section variants={reveal} className="hm-card hm-links-card" style={{ marginBottom: '0' }}>
        <span className="hm-eyebrow">روابط سريعة</span>
        <div className="hm-links" style={{ flexDirection: 'row', gap: '12px', marginTop: '16px' }}>
          <button onClick={() => router.push('/lessons')} className="hm-link" type="button" style={{ flex: 1 }}>
            <span className="hm-link-icon"><BookOpen size={17} /></span>
            <div className="hm-link-text">
              <div className="hm-link-title">مكتبة الدروس</div>
              <div className="hm-link-sub">شروحات نظرية</div>
            </div>
            <ChevronRight size={15} className="hm-link-chev flip" />
          </button>
          <button onClick={() => router.push('/tafseer')} className="hm-link" type="button" style={{ flex: 1 }}>
            <span className="hm-link-icon"><BookMarked size={17} /></span>
            <div className="hm-link-text">
              <div className="hm-link-title">القرآن مفسّر</div>
              <div className="hm-link-sub">تلاوة مع التفسير</div>
            </div>
            <ChevronRight size={15} className="hm-link-chev flip" />
          </button>
          <button onClick={() => router.push('/practice')} className="hm-link" type="button" style={{ flex: 1 }}>
            <span className="hm-link-icon"><Mic size={17} /></span>
            <div className="hm-link-text">
              <div className="hm-link-title">جلسة جديدة</div>
              <div className="hm-link-sub">اختر سورة وآيات</div>
            </div>
            <ChevronRight size={15} className="hm-link-chev flip" />
          </button>
        </div>
      </motion.section>

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
          .hm-hero { grid-template-columns: 1fr; gap: 26px; padding: 32px 26px; }
          .hm-hero-ring { order: -1; }
          .hm-bottom { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .hm-skill-grid { grid-template-columns: 1fr; }
          .hm-hero { padding: 26px 20px; }
        }
      `}</style>
    </motion.div>
  );
}
