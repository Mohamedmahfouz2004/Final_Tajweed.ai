'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Square, Repeat,
  ChevronDown, Search, Loader2, Mic, BookOpen, Headphones,
} from 'lucide-react';
import { reciters } from '../../utils/data';
import useAppStore from '../../store/useAppStore';

const QURAN_API = 'https://api.quran.com/api/v4';
const ar = (n) => String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const reveal = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

function ListenView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const surahs = useAppStore(s => s.surahs);
  const selectedReciter = useAppStore(s => s.selectedReciter);
  const setSelectedReciter = useAppStore(s => s.setSelectedReciter);
  const listenSurah = useAppStore(s => s.listenSurah);
  const setListenSurah = useAppStore(s => s.setListenSurah);
  const listenFromVerse = useAppStore(s => s.listenFromVerse);
  const setListenFromVerse = useAppStore(s => s.setListenFromVerse);
  const listenToVerse = useAppStore(s => s.listenToVerse);
  const setListenToVerse = useAppStore(s => s.setListenToVerse);

  const isPlaying = useAppStore(s => s.isPlaying);
  const currentPlayingAudio = useAppStore(s => s.currentPlayingAudio);
  const currentVerseIndex = useAppStore(s => s.currentVerseIndex);
  const handlePlayReference = useAppStore(s => s.handlePlayReference);
  const handleStopRecitation = useAppStore(s => s.handleStopRecitation);
  const handleNextVerse = useAppStore(s => s.handleNextVerse);
  const handlePrevVerse = useAppStore(s => s.handlePrevVerse);
  const listenRepeat = useAppStore(s => s.listenRepeat);
  const toggleListenRepeat = useAppStore(s => s.toggleListenRepeat);

  const setSelectedSurah = useAppStore(s => s.setSelectedSurah);
  const setFromVerse = useAppStore(s => s.setFromVerse);
  const setToVerse = useAppStore(s => s.setToVerse);
  const setPracticeViewState = useAppStore(s => s.setPracticeViewState);
  const setPracticeActiveTab = useAppStore(s => s.setPracticeActiveTab);

  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSurahList, setShowSurahList] = useState(false);
  const [showReciterList, setShowReciterList] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');
  const [reciterSearch, setReciterSearch] = useState('');
  const surahRef = useRef(null);
  const reciterRef = useRef(null);

  // Optional deep-link via query params: ?sura=&from=&to=
  useEffect(() => {
    const sura = parseInt(searchParams.get('sura'));
    const from = parseInt(searchParams.get('from'));
    const to = parseInt(searchParams.get('to'));
    if (sura) setListenSurah(sura);
    else if (!listenSurah) setListenSurah(1);
    if (from) setListenFromVerse(from);
    if (to) setListenToVerse(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSurah = surahs.find(s => s.id === listenSurah);
  const maxVerses = currentSurah?.verses_count || 7;
  const fromV = parseInt(listenFromVerse) || 1;
  const toV = parseInt(listenToVerse) || maxVerses;

  // Fetch the selected range so we can render a real mushaf
  useEffect(() => {
    if (!listenSurah) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${QURAN_API}/verses/by_chapter/${listenSurah}?language=ar&words=false&per_page=300&fields=text_uthmani,verse_key`
        );
        const data = await res.json();
        const all = data?.verses || [];
        if (!cancelled) setVerses(all.filter(v => v.verse_number >= fromV && v.verse_number <= toV));
      } catch (e) {
        console.error('verse fetch failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listenSurah, fromV, toV]);

  useEffect(() => {
    const onClick = (e) => {
      if (surahRef.current && !surahRef.current.contains(e.target)) setShowSurahList(false);
      if (reciterRef.current && !reciterRef.current.contains(e.target)) setShowReciterList(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Changing the surah or reciter is a hard content switch: stop the current
  // recitation immediately so the old audio doesn't keep playing. (Verse-range
  // changes are handled lazily by handlePlayReference's signature check, so we
  // don't stop on every keystroke in the range inputs.)
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    handleStopRecitation();
  }, [selectedReciter, listenSurah, handleStopRecitation]);

  const filteredSurahs = surahs.filter(s =>
    s.name_arabic?.includes(surahSearch) || String(s.id).includes(surahSearch));
  const filteredReciters = reciters.filter(r => r.name.includes(reciterSearch));

  const clampVerse = (v) => Math.max(1, Math.min(maxVerses, parseInt(v) || 1));

  const testYourself = () => {
    setSelectedSurah(listenSurah);
    setFromVerse(fromV);
    setToVerse(toV);
    setPracticeActiveTab('record');
    setPracticeViewState('practice');
    router.push('/practice');
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={reveal} className="ui-page-head">
        <span className="ui-eyebrow"><Headphones size={12} /> الاستماع &nbsp;//&nbsp; LISTEN &amp; REPEAT</span>
        <h1 className="ui-title">استمع وردِّد</h1>
        <p className="ui-sub">
          اختر السورة والقارئ، واستمع إلى التلاوة بينما تتابع الآيات كما في المصحف. كرِّر المقطع حتى
          تتقنه، ثم اختبر نفسك بتسجيل تلاوتك.
        </p>
      </motion.div>

      <div className="ui-divider" aria-hidden />

      {/* Tabs */}
      <motion.div variants={reveal} className="flex items-center justify-start mb-6 flex-wrap">
        <div className="ui-tabs">
          <button type="button" className="ui-tab" onClick={testYourself}>
            <Mic size={13} /> سجّل
          </button>
          <button type="button" className="ui-tab is-active">
            <Headphones size={14} /> استمع أولاً
          </button>
        </div>
      </motion.div>

      {/* Selectors */}
      <motion.div variants={reveal} className="ui-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          {/* Surah */}
          <div ref={surahRef}>
            <span className="ui-label">السورة</span>
            <div style={{ position: 'relative' }}>
              <button type="button" className="ui-select" style={selBtn}
                onClick={() => { setShowSurahList(v => !v); setShowReciterList(false); }}>
                <span style={ellipsis}>{currentSurah ? `${currentSurah.name_arabic}` : 'اختر السورة'}</span>
                <ChevronDown size={15} style={{ transition: 'transform .2s', transform: showSurahList ? 'rotate(180deg)' : 'none' }} />
              </button>
              {showSurahList && (
                <div className="ui-panel" style={dropdown}>
                  <div style={{ padding: 10, borderBottom: '1px solid var(--sand-400)', position: 'relative' }}>
                    <Search size={13} style={searchIcon} />
                    <input className="ui-input" placeholder="ابحث..." value={surahSearch} autoFocus
                      onChange={e => setSurahSearch(e.target.value)} style={{ paddingRight: 32 }} />
                  </div>
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {filteredSurahs.map(s => (
                      <button key={s.id} type="button" style={ddItem(s.id === listenSurah)}
                        onClick={() => { setListenSurah(s.id); setListenFromVerse(1); setListenToVerse(s.verses_count); setShowSurahList(false); setSurahSearch(''); }}>
                        <span className="font-num" style={{ color: 'var(--brass-700)', fontSize: '0.74rem', width: 30 }}>{String(s.id).padStart(3, '0')}</span>
                        <span style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.05rem' }}>{s.name_arabic}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* From */}
          <div>
            <span className="ui-label">من الآية</span>
            <input type="number" min={1} max={maxVerses} value={listenFromVerse ?? ''} className="ui-input font-num"
              style={{ textAlign: 'center', fontWeight: 600 }}
              onChange={e => {
                const val = e.target.value;
                if (val === '') return setListenFromVerse('');
                const parsed = parseInt(val);
                setListenFromVerse(parsed > maxVerses ? maxVerses : parsed);
              }}
              onBlur={e => setListenFromVerse(clampVerse(e.target.value))} />
          </div>

          {/* To */}
          <div>
            <span className="ui-label">إلى الآية</span>
            <input type="number" min={1} max={maxVerses} value={listenToVerse ?? ''} className="ui-input font-num"
              style={{ textAlign: 'center', fontWeight: 600 }}
              onChange={e => {
                const val = e.target.value;
                if (val === '') return setListenToVerse('');
                const parsed = parseInt(val);
                setListenToVerse(parsed > maxVerses ? maxVerses : parsed);
              }}
              onBlur={e => setListenToVerse(clampVerse(e.target.value))} />
          </div>

          {/* Reciter */}
          <div ref={reciterRef}>
            <span className="ui-label">القارئ</span>
            <div style={{ position: 'relative' }}>
              <button type="button" className="ui-select" style={selBtn}
                onClick={() => { setShowReciterList(v => !v); setShowSurahList(false); }}>
                <span style={ellipsis}>{reciters.find(r => r.id == selectedReciter)?.name || 'اختر القارئ'}</span>
                <ChevronDown size={15} style={{ transition: 'transform .2s', transform: showReciterList ? 'rotate(180deg)' : 'none' }} />
              </button>
              {showReciterList && (
                <div className="ui-panel" style={dropdown}>
                  <div style={{ padding: 10, borderBottom: '1px solid var(--sand-400)', position: 'relative' }}>
                    <Search size={13} style={searchIcon} />
                    <input className="ui-input" placeholder="ابحث..." value={reciterSearch}
                      onChange={e => setReciterSearch(e.target.value)} style={{ paddingRight: 32 }} />
                  </div>
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {filteredReciters.map(r => (
                      <button key={r.id} type="button" style={ddItem(r.id == selectedReciter)}
                        onClick={() => { setSelectedReciter(r.id); setShowReciterList(false); setReciterSearch(''); }}>
                        <span style={{ fontFamily: 'var(--font-ibm), IBM Plex Sans Arabic', fontSize: '0.92rem' }}>{r.name}</span>
                        <span className="ui-badge ui-badge--gold" style={{ fontSize: '0.62rem', padding: '2px 8px' }}>{r.style}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div variants={reveal} className="ui-card--emerald" style={{ padding: '22px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button type="button" onClick={handlePrevVerse} className="ui-ghost" style={ctrlBtn} title="الآية السابقة">
            <SkipForward size={18} className="ui-flip" />
          </button>

          <button type="button" onClick={handlePlayReference} className="ui-mic" style={{ width: 70, height: 70 }} title="تشغيل / إيقاف مؤقت">
            {isPlaying ? <Pause size={26} strokeWidth={2.4} /> : <Play size={26} strokeWidth={2.4} fill="currentColor" />}
          </button>

          <button type="button" onClick={handleNextVerse} className="ui-ghost" style={ctrlBtn} title="الآية التالية">
            <SkipBack size={18} className="ui-flip" />
          </button>

          <button type="button" onClick={toggleListenRepeat} className="ui-ghost"
            style={{ ...ctrlBtn, ...(listenRepeat ? activeCtrl : {}) }} title="تكرار المقطع">
            <Repeat size={17} />
          </button>

          {currentPlayingAudio && (
            <button type="button" onClick={handleStopRecitation} className="ui-ghost" style={ctrlBtn} title="إيقاف">
              <Square size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <span className="ui-badge ui-badge--gold">
            {listenRepeat ? 'التكرار مفعّل · يُعاد المقطع تلقائيًا' : `الآية الحالية ${currentPlayingAudio ? ar(currentVerseIndex) : '—'}`}
          </span>
        </div>
      </motion.div>

      {/* Surah banner */}
      {currentSurah && (
        <motion.div variants={reveal} style={{ textAlign: 'center', marginBottom: 18 }}>
          <h2 style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: 'clamp(2rem,5vw,2.8rem)', lineHeight: 1, color: 'var(--ink-900)' }}>
            سورة {currentSurah.name_arabic}
          </h2>
          <span className="ui-eyebrow" style={{ marginTop: 8 }}>
            {currentSurah.revelation_place === 'makkah' ? 'مكية' : 'مدنية'} · الآيات {ar(fromV)}–{ar(toV)}
          </span>
        </motion.div>
      )}

      {/* Mushaf */}
      <motion.div variants={reveal} className="ui-card" style={{ padding: 'clamp(16px, 4vw, 32px)', marginBottom: 24, minHeight: 220 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '50px 0' }}>
            <Loader2 size={26} className="animate-spin" style={{ color: 'var(--brass-700)' }} />
            <p style={{ color: 'var(--ink-500)', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.78rem', letterSpacing: '0.18em' }}>LOADING AYAH ...</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', lineHeight: 2.4 }}>
            {listenSurah !== 9 && fromV === 1 && (
              <p style={{ fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', Amiri, serif", fontSize: '1.7rem', color: '#000', marginBottom: 14, fontWeight: 700 }}>
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            )}
            <div style={{ fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', Amiri, serif", fontSize: 'clamp(1.7rem, 3.4vw, 2.4rem)', color: '#000', lineHeight: 2.2 }}>
              {verses.map(v => {
                const active = currentPlayingAudio && v.verse_number === currentVerseIndex;
                return (
                  <span key={v.verse_key}>
                    <span style={{
                      padding: '2px 6px', borderRadius: 8,
                      background: active ? 'rgba(212,175,55,0.22)' : 'transparent',
                      color: active ? '#0D3D24' : '#000',
                      fontWeight: active ? 700 : 400,
                      transition: 'background 0.3s ease, color 0.3s ease',
                    }}>
                      {v.text_uthmani}
                    </span>
                    <span style={{ color: 'var(--brass-700)', fontWeight: 700, margin: '0 4px', userSelect: 'none' }}>
                      ﴿{ar(v.verse_number)}﴾
                    </span>{' '}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Test yourself CTA */}
      <motion.div variants={reveal} className="ui-card" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <span className="ui-eyebrow ui-eyebrow--gold">التالي</span>
          <h3 className="ui-title ui-title--sm" style={{ marginTop: 6 }}>جاهز لتختبر نفسك؟</h3>
          <p className="ui-sub" style={{ marginTop: 6 }}>
            سجّل تلاوتك لنفس الآيات واحصل على تحليل فوري لأحكام التجويد.
          </p>
        </div>
        <button type="button" onClick={testYourself} className="ui-cta">
          <Mic size={16} strokeWidth={2.4} /> اختبر نفسك على هذه الآيات
        </button>
      </motion.div>
    </motion.div>
  );
}

/* inline style helpers */
const selBtn = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer', textAlign: 'start' };
const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const dropdown = { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40, padding: 0, overflow: 'hidden' };
const searchIcon = { position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)' };
const ddItem = (active) => ({
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  padding: '10px 14px', borderBottom: '1px solid rgba(212,196,160,0.4)', cursor: 'pointer', border: 'none',
  background: active ? 'rgba(45,125,82,0.12)' : 'transparent',
  color: 'var(--ink-900)', textAlign: 'start',
});
const ctrlBtn = { width: 46, height: 46, padding: 0, justifyContent: 'center', borderRadius: 999 };
const activeCtrl = { color: '#F4E4BC', borderColor: 'rgba(212,175,55,0.65)', background: 'rgba(212,175,55,0.14)' };

export default function ListenPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brass-700)' }} />
      </div>
    }>
      <ListenView />
    </Suspense>
  );
}
