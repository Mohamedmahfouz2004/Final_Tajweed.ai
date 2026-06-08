'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, ChevronDown, BookOpen, Play, Headphones } from 'lucide-react';
import { reciters } from '../../utils/data';
import useAppStore from '../../store/useAppStore';

const ar = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: 0.04 } } };
const reveal = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function SurahsPage() {
  const router = useRouter();
  const surahs = useAppStore(s => s.surahs);
  const selectedReciter = useAppStore(s => s.selectedReciter);
  const setSelectedReciter = useAppStore(s => s.setSelectedReciter);
  const setListenSurah = useAppStore(s => s.setListenSurah);
  const setListenFromVerse = useAppStore(s => s.setListenFromVerse);
  const setListenToVerse = useAppStore(s => s.setListenToVerse);

  const [search, setSearch] = useState('');
  const [showReciter, setShowReciter] = useState(false);
  const [reciterSearch, setReciterSearch] = useState('');
  const reciterRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (reciterRef.current && !reciterRef.current.contains(e.target)) setShowReciter(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const filtered = (surahs || []).filter(s =>
    s.name_arabic?.includes(search) ||
    s.name_simple?.toLowerCase().includes(search.toLowerCase()) ||
    String(s.id).includes(search));

  const filteredReciters = reciters.filter(r => r.name.includes(reciterSearch));

  const openSurah = (s) => {
    setListenSurah(s.id);
    setListenFromVerse(1);
    setListenToVerse(s.verses_count);
    router.push(`/listen?sura=${s.id}&from=1&to=${s.verses_count}`);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={reveal} className="ui-page-head">
        <span className="ui-eyebrow"><BookOpen size={12} /> المصحف &nbsp;//&nbsp; BROWSE SURAHS</span>
        <h1 className="ui-title">تصفّح المصحف</h1>
        <p className="ui-sub">
          اختر سورة للاستماع إليها بصوت أحد كبار القرّاء مع متابعة الآيات كما في المصحف الشريف.
        </p>
      </motion.div>

      <div className="ui-divider" aria-hidden />

      {/* Controls: search + reciter */}
      <motion.div variants={reveal} className="ui-card" style={{
        display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24,
      }}>
        <div style={{ flex: '1 1 240px' }}>
          <span className="ui-label">بحث</span>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)' }} />
            <input className="ui-input" placeholder="اسم السورة أو رقمها..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingRight: 38 }} />
          </div>
        </div>

        <div ref={reciterRef} style={{ flex: '1 1 220px', minWidth: 200 }}>
          <span className="ui-label">القارئ</span>
          <div style={{ position: 'relative' }}>
            <button type="button" className="ui-select"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}
              onClick={() => setShowReciter(v => !v)}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Headphones size={14} /> {reciters.find(r => r.id == selectedReciter)?.name || 'اختر القارئ'}
              </span>
              <ChevronDown size={15} style={{ transition: 'transform .2s', transform: showReciter ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showReciter && (
              <div className="ui-panel" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 10, borderBottom: '1px solid var(--sand-400)', position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)' }} />
                  <input className="ui-input" placeholder="ابحث..." value={reciterSearch}
                    onChange={e => setReciterSearch(e.target.value)} style={{ paddingRight: 32 }} />
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {filteredReciters.map(r => (
                    <button key={r.id} type="button"
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        padding: '10px 14px', borderBottom: '1px solid rgba(212,196,160,0.4)', cursor: 'pointer', border: 'none',
                        background: r.id == selectedReciter ? 'rgba(45,125,82,0.12)' : 'transparent', textAlign: 'start',
                      }}
                      onClick={() => { setSelectedReciter(r.id); setShowReciter(false); setReciterSearch(''); }}>
                      <span style={{ fontFamily: 'var(--font-ibm), IBM Plex Sans Arabic', fontSize: '0.92rem' }}>{r.name}</span>
                      <span className="ui-badge ui-badge--gold" style={{ fontSize: '0.62rem', padding: '2px 8px' }}>{r.style}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Surah grid */}
      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {filtered.map(s => (
            <motion.button key={s.id} variants={reveal} type="button" className="ui-link"
              onClick={() => openSurah(s)} style={{ padding: '14px 16px' }}>
              <span className="ui-link-icon" style={{ position: 'relative' }}>
                <span className="font-num" style={{ fontFamily: 'var(--font-ibm), IBM Plex Sans Arabic', fontWeight: 700, fontSize: '0.95rem' }}>
                  {ar(s.id)}
                </span>
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.3rem', lineHeight: 1.1, color: 'var(--ink-900)' }}>
                  {s.name_arabic}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--ink-500)' }}>{ar(s.verses_count)} آية</span>
                  <span className="ui-badge" style={{ fontSize: '0.62rem', padding: '1px 8px' }}>
                    {s.revelation_place === 'makkah' ? 'مكية' : 'مدنية'}
                  </span>
                </span>
              </span>
              <Play size={15} fill="currentColor" style={{ color: 'var(--brass-500)', flexShrink: 0 }} className="ui-flip" />
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="ui-empty">
          <BookOpen size={34} style={{ margin: '0 auto 12px', color: 'var(--ink-500)' }} />
          <p style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.3rem' }}>
            {(surahs || []).length === 0 ? 'جاري تحميل السور...' : 'لا توجد نتائج مطابقة'}
          </p>
        </div>
      )}
    </motion.div>
  );
}
