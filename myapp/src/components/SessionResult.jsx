'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, ArrowLeft, CheckCircle, RotateCcw, Sparkles, BookOpen } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { getErrorInfo } from '../utils/errorTypeMap';

/* ── Group mistakes by error type for the drill list ── */
function groupMistakes(mistakes) {
  const map = {};
  (mistakes || []).forEach(m => {
    const key = m.name;
    if (!key || key === 'none') return;
    if (!map[key]) map[key] = { name: key, count: 0, samples: [] };
    map[key].count += 1;
    if (map[key].samples.length < 3) map[key].samples.push(m);
  });
  return Object.values(map).sort((a, b) => b.count - a.count);
}

const SessionResult = ({ onRetry, onContinue }) => {
  const router = useRouter();
  const isOpen        = useAppStore(s => s.sessionResultOpen);
  const close         = useAppStore(s => s.closeSessionResult);
  const sessionMistakes = useAppStore(s => s.sessionMistakes);
  const selectedSurah   = useAppStore(s => s.selectedSurah);
  const surahs          = useAppStore(s => s.surahs);
  const fromVerse       = useAppStore(s => s.fromVerse);
  const toVerse         = useAppStore(s => s.toVerse);

  const surahName = useMemo(() => {
    const s = surahs?.find?.(s => s.id == selectedSurah);
    return s?.name_arabic || s?.name || `سورة ${selectedSurah}`;
  }, [selectedSurah, surahs]);

  const groups = useMemo(() => groupMistakes(sessionMistakes), [sessionMistakes]);
  const totalAyahs = Math.max(1, (Number(toVerse) || 1) - (Number(fromVerse) || 1) + 1);
  const totalErrors = sessionMistakes?.length || 0;
  // Rough accuracy heuristic: assume each ayah has ~30 phonetic positions; less is conservative.
  const positions = totalAyahs * 30;
  const accuracy = Math.max(0, Math.min(100, Math.round(((positions - totalErrors) / positions) * 100)));
  const isFlawless = totalErrors === 0;

  const goDrill = (rule) => {
    close();
    router.push(`/practical-quiz/${rule}`);
  };

  const goHome = () => { close(); router.push('/'); };
  const handleRetry = () => {
    close();
    if (onRetry) onRetry();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="sr-backdrop"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.25,0.1,0.25,1] }}
            className="sr-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sr-head">
              <div className="sr-head-meta">
                <span className="sr-eyebrow">انتهت الجلسة</span>
                <h2 className="sr-title">
                  {isFlawless ? 'تلاوة متقنة' : 'فلنُحسِّن هذه المواضع'}
                </h2>
                <div className="sr-sub">
                  {surahName} · الآيات {fromVerse}–{toVerse}
                </div>
              </div>

              <button className="sr-close" onClick={close} type="button" aria-label="close">
                <X size={16} />
              </button>
            </div>

            {/* Stats */}
            <div className="sr-stats">
              <div className="sr-stat">
                <div className="sr-stat-num font-num" style={{ color: 'var(--primary)' }}>
                  {accuracy}<span className="sr-pct">%</span>
                </div>
                <div className="sr-stat-label">دقّة الجلسة</div>
              </div>
              <div className="sr-stat">
                <div className="sr-stat-num font-num" style={{ color: 'var(--text)' }}>
                  {totalAyahs}
                </div>
                <div className="sr-stat-label">آيات قُرئت</div>
              </div>
              <div className="sr-stat">
                <div className="sr-stat-num font-num" style={{ color: totalErrors > 0 ? 'var(--rec-error)' : 'var(--primary)' }}>
                  {totalErrors}
                </div>
                <div className="sr-stat-label">أخطاء مرصودة</div>
              </div>
            </div>

            {/* Mistake drills OR flawless state */}
            <div className="sr-body">
              {isFlawless ? (
                <div className="sr-flawless">
                  <div className="sr-flawless-icon">
                    <CheckCircle size={28} strokeWidth={2.2} />
                  </div>
                  <h3 className="sr-flawless-title">ما شاء الله — تلاوة دقيقة</h3>
                  <p className="sr-flawless-sub">
                    لم نرصد أي خطأ في الأحكام خلال هذه الجلسة. تابع التدرّب على مقاطع أطول لتثبيت الإتقان.
                  </p>
                </div>
              ) : (
                <>
                  <div className="sr-section-eyebrow">
                    <Sparkles size={11} /> أحكام تستحقّ التدريب الآن
                  </div>
                  <ul className="sr-drill-list">
                    {groups.map((g, i) => {
                      const info = getErrorInfo(g.name);
                      return (
                        <motion.li
                          key={g.name}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 + i * 0.04 }}
                        >
                          <button onClick={() => goDrill(g.name)} className="sr-drill" type="button">
                            <span className="sr-drill-icon">{info?.icon || '◆'}</span>
                            <div className="sr-drill-text">
                              <div className="sr-drill-name">{info?.name || g.name}</div>
                              <div className="sr-drill-meta">
                                {info?.category ? `${info.category} · ` : ''}{g.count} موضع
                              </div>
                            </div>
                            <span className="sr-drill-cta">
                              تدريب <ArrowLeft size={13} />
                            </span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="sr-foot">
              <button onClick={handleRetry} className="sr-btn-ghost" type="button">
                <RotateCcw size={14} /> أعد الجلسة نفسها
              </button>
              <div className="sr-foot-right">
                <button onClick={goHome} className="sr-btn-ghost" type="button">
                  <BookOpen size={14} /> الرئيسية
                </button>
                <button onClick={onContinue || (() => { close(); router.push('/practice'); })} className="sr-btn-primary" type="button">
                  <Mic size={14} /> تابع التدريب
                  <ArrowLeft size={13} className="sr-cta-arrow" />
                </button>
              </div>
            </div>

            <style jsx>{`
              .sr-modal {
                width: min(640px, 100%);
                background: var(--surface);
                color: var(--text);
                border: 1px solid var(--border);
                border-radius: 18px;
                box-shadow: 0 24px 60px rgba(13,30,18,0.28);
                overflow: hidden;
                max-height: 92vh;
                display: flex; flex-direction: column;
              }
              .sr-head {
                display: flex; align-items: flex-start; justify-content: space-between;
                gap: 14px;
                padding: 22px 24px 16px;
                background:
                  url('/pattern.svg'),
                  linear-gradient(135deg, #0F1A0D, #1B3018);
                background-size: 320px 160px, 100% 100%;
                background-blend-mode: soft-light;
                color: #F0EAD6;
                position: relative;
              }
              .sr-head::after {
                content: '';
                position: absolute; left: 14%; right: 14%; bottom: 0; height: 1px;
                background: linear-gradient(90deg, transparent, rgba(212,175,55,0.55), transparent);
              }
              .sr-eyebrow {
                display: inline-block;
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.62rem; letter-spacing: 0.22em; text-transform: uppercase;
                color: rgba(212,175,55,0.75);
                margin-bottom: 8px;
              }
              .sr-title {
                font-family: 'Rakkas', cursive;
                font-weight: 400;
                font-size: clamp(1.6rem, 4vw, 2.2rem);
                line-height: 1.05; margin: 0;
              }
              .sr-sub {
                margin-top: 6px;
                font-family: 'IBM Plex Sans Arabic', sans-serif;
                font-size: 0.84rem;
                color: rgba(240,234,214,0.7);
              }
              .sr-close {
                width: 30px; height: 30px;
                display: inline-flex; align-items: center; justify-content: center;
                background: transparent; border: 1px solid rgba(212,175,55,0.35);
                color: rgba(240,234,214,0.85);
                border-radius: 8px; cursor: pointer; flex-shrink: 0;
                transition: background 0.15s ease, color 0.15s ease;
              }
              .sr-close:hover { background: rgba(212,175,55,0.12); color: #F0EAD6; }

              .sr-stats {
                display: grid; grid-template-columns: repeat(3, 1fr);
                background: var(--surface);
                border-bottom: 1px solid var(--border);
              }
              .sr-stat {
                padding: 18px 14px;
                text-align: center;
                border-inline-end: 1px solid var(--border);
              }
              .sr-stat:last-child { border-inline-end: none; }
              .sr-stat-num {
                font-family: 'IBM Plex Sans Arabic', sans-serif;
                font-feature-settings: "tnum" 1, "lnum" 1;
                font-size: 2rem; font-weight: 700; line-height: 1;
              }
              .sr-pct { font-size: 0.7em; opacity: 0.85; margin-inline-start: 2px; }
              .sr-stat-label {
                margin-top: 6px;
                font-family: 'IBM Plex Sans Arabic', sans-serif;
                font-size: 0.78rem;
                color: var(--text-muted);
              }

              .sr-body { padding: 18px 22px 4px; overflow-y: auto; }
              .sr-section-eyebrow {
                display: inline-flex; align-items: center; gap: 6px;
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.64rem; letter-spacing: 0.22em; text-transform: uppercase;
                color: var(--text-muted);
                margin-bottom: 12px;
              }
              .sr-drill-list {
                list-style: none; padding: 0; margin: 0;
                display: flex; flex-direction: column; gap: 8px;
              }
              .sr-drill {
                width: 100%;
                display: flex; align-items: center; gap: 14px;
                padding: 12px 14px; background: var(--accent);
                border: 1px solid var(--border); border-radius: 12px;
                cursor: pointer; text-align: right;
                transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
              }
              .sr-drill:hover {
                transform: translateY(-2px);
                border-color: var(--secondary);
                background: rgba(184,150,62,0.10);
              }
              .sr-drill-icon {
                width: 38px; height: 38px;
                display: inline-flex; align-items: center; justify-content: center;
                background: var(--surface); border: 1px solid var(--border);
                font-size: 1.2rem; border-radius: 10px; flex-shrink: 0;
              }
              .sr-drill-text { flex: 1; min-width: 0; }
              .sr-drill-name {
                font-family: 'Rakkas', cursive;
                font-size: 1.25rem; line-height: 1; color: var(--text);
              }
              .sr-drill-meta {
                margin-top: 4px;
                font-family: 'IBM Plex Sans Arabic', sans-serif;
                font-size: 0.78rem;
                color: var(--text-muted);
              }
              .sr-drill-cta {
                display: inline-flex; align-items: center; gap: 4px;
                font-family: 'IBM Plex Sans Arabic', sans-serif;
                font-size: 0.82rem; font-weight: 700;
                color: var(--primary);
              }

              .sr-flawless {
                text-align: center; padding: 14px 8px 24px;
              }
              .sr-flawless-icon {
                width: 56px; height: 56px; margin: 0 auto 12px;
                background: rgba(45,125,82,0.10);
                color: var(--primary);
                display: inline-flex; align-items: center; justify-content: center;
                border-radius: 50%;
              }
              .sr-flawless-title {
                font-family: 'Rakkas', cursive;
                font-weight: 400; font-size: 1.8rem; line-height: 1.1; margin: 0;
                color: var(--text);
              }
              .sr-flawless-sub {
                margin: 10px auto 0; max-width: 42ch;
                font-size: 0.92rem; color: var(--text-muted); line-height: 1.6;
              }

              .sr-foot {
                display: flex; align-items: center; justify-content: space-between;
                gap: 12px; flex-wrap: wrap;
                padding: 16px 22px 18px;
                border-top: 1px solid var(--border);
                background: var(--surface);
              }
              .sr-foot-right { display: inline-flex; gap: 10px; }
              .sr-btn-ghost {
                display: inline-flex; align-items: center; gap: 6px;
                background: transparent; border: 1px solid var(--border);
                color: var(--text-muted);
                padding: 9px 14px; border-radius: 999px; cursor: pointer;
                font-family: 'IBM Plex Sans Arabic', sans-serif;
                font-size: 0.84rem;
                transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
              }
              .sr-btn-ghost:hover { color: var(--text); border-color: var(--text-muted); background: var(--accent); }
              .sr-btn-primary {
                display: inline-flex; align-items: center; gap: 8px;
                background: var(--primary); color: #FFF;
                padding: 10px 18px; border: none; border-radius: 999px; cursor: pointer;
                font-family: 'IBM Plex Sans Arabic', sans-serif;
                font-size: 0.88rem; font-weight: 700;
                box-shadow: 0 6px 18px rgba(45,125,82,0.28);
                transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
              }
              .sr-btn-primary:hover {
                transform: translateY(-1px); background: var(--primary-dark);
                box-shadow: 0 8px 24px rgba(45,125,82,0.38);
              }
              .sr-cta-arrow { transition: transform 0.15s ease; }
              .sr-btn-primary:hover .sr-cta-arrow { transform: translateX(-3px); }

              @media (max-width: 640px) {
                .sr-modal { border-radius: 14px; max-height: 88vh; }
                .sr-head { padding: 16px 18px 14px; }
                .sr-title { font-size: 1.3rem !important; }
                .sr-stat-num { font-size: 1.5rem; }
                .sr-body { padding: 14px 16px 4px; }
                .sr-drill { padding: 10px 12px; gap: 10px; }
                .sr-drill-icon { width: 32px; height: 32px; font-size: 1rem; }
                .sr-drill-name { font-size: 1.05rem; }
                .sr-foot { flex-direction: column; gap: 10px; padding: 14px 16px; }
                .sr-foot-right { width: 100%; display: flex; gap: 8px; }
                .sr-foot-right > * { flex: 1; justify-content: center; }
                .sr-btn-ghost { font-size: 0.78rem; padding: 8px 12px; justify-content: center; }
                .sr-btn-primary { font-size: 0.82rem; padding: 10px 14px; justify-content: center; }
              }
            `}</style>

            <style jsx global>{`
              .sr-backdrop {
                position: fixed; inset: 0; z-index: 10000;
                background: rgba(13,17,11,0.65);
                backdrop-filter: blur(6px);
                display: flex; align-items: center; justify-content: center;
                padding: 18px;
              }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionResult;
