'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, Search, Loader2, BookMarked, X } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

const QURAN_API = 'https://api.quran.com/api/v4';
const TAFSIR_RESOURCE_ID = 16;

function TafseerView() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const surahs = useAppStore(s => s.surahs);

    const initialSura = parseInt(searchParams.get('sura')) || 1;
    const initialFrom = parseInt(searchParams.get('from')) || 1;
    const initialTo = parseInt(searchParams.get('to')) || null;

    const [selectedSura, setSelectedSura] = useState(initialSura);
    const [fromAyah, setFromAyah] = useState(initialFrom);
    const [toAyah, setToAyah] = useState(initialTo);
    const [verses, setVerses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [surahSearch, setSurahSearch] = useState('');
    const [showSurahDropdown, setShowSurahDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const [hoveredAyah, setHoveredAyah] = useState(null);
    const [selectedAyahForTafsir, setSelectedAyahForTafsir] = useState(null);
    const [tafsirCache, setTafsirCache] = useState({});
    const [loadingTafsir, setLoadingTafsir] = useState(null);
    const hoverTimeoutRef = useRef(null);

    // Derive the selected surah's ayah count rather than mirroring it into state.
    const ayahCount = surahs.find(s => s.id === selectedSura)?.verses_count || 7;

    useEffect(() => {
        if (!selectedSura) return;
        // Clamp to the surah bounds so a stale/out-of-range URL param can't break the fetch.
        const from = Math.min(Math.max(fromAyah || 1, 1), ayahCount);
        const to = Math.min(toAyah || ayahCount, ayahCount);

        (async () => {
            setLoading(true);
            setSelectedAyahForTafsir(null);
            try {
                const res = await fetch(
                    `${QURAN_API}/verses/by_chapter/${selectedSura}?language=ar&words=false&per_page=300&fields=text_uthmani,verse_key`
                );
                const data = await res.json();
                const allVerses = data?.verses || [];
                const filtered = allVerses.filter(v => v.verse_number >= from && v.verse_number <= to);
                setVerses(filtered);
                router.replace(`${pathname}?sura=${selectedSura}&from=${from}&to=${to}`);
            } catch (err) {
                console.error('Error fetching verses:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [selectedSura, fromAyah, toAyah, ayahCount, pathname, router]);

    const fetchTafsir = async (verseKey) => {
        if (tafsirCache[verseKey]) return;
        setLoadingTafsir(verseKey);
        try {
            const res = await fetch(`${QURAN_API}/tafsirs/${TAFSIR_RESOURCE_ID}/by_ayah/${verseKey}`);
            const data = await res.json();
            const clean = (data?.tafsir?.text || '').replace(/<[^>]*>/g, '');
            setTafsirCache(prev => ({ ...prev, [verseKey]: clean }));
        } catch (err) {
            console.error('Error fetching tafsir:', err);
            setTafsirCache(prev => ({ ...prev, [verseKey]: 'تعذر تحميل التفسير.' }));
        } finally {
            setLoadingTafsir(null);
        }
    };

    const handleMouseEnter = (verseKey) => {
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredAyah(verseKey);
            fetchTafsir(verseKey);
        }, 400);
    };
    const handleMouseLeave = () => {
        clearTimeout(hoverTimeoutRef.current);
        setHoveredAyah(null);
    };

    const handleAyahClick = (verseKey) => {
        if (selectedAyahForTafsir === verseKey) {
            setSelectedAyahForTafsir(null);
        } else {
            setSelectedAyahForTafsir(verseKey);
            fetchTafsir(verseKey);
        }
    };

    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowSurahDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const currentSurah = surahs.find(s => s.id === selectedSura);
    const filteredSurahs = surahs.filter(s =>
        s.name_arabic?.includes(surahSearch) ||
        s.name_simple?.toLowerCase().includes(surahSearch.toLowerCase()) ||
        String(s.id).includes(surahSearch)
    );

    const toArabicNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

    return (
        <div className="w-full" dir="rtl">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <span className="ui-eyebrow">
                  <span className="num">05</span> &nbsp;//&nbsp; INTERPRETED QURAN
                </span>
                <h1 className="ui-title">القرآن الكريم مُفسَّر</h1>
            </motion.div>

            <div className="ui-divider" aria-hidden />

            {/* Controls */}
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="ui-panel mb-6"
                style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}
            >
                {/* Surah Selector */}
                <div className="relative" ref={dropdownRef} style={{ minWidth: 200, flex: '1 1 220px' }}>
                    <span className="ui-label">SURAH</span>
                    <button
                        type="button"
                        onClick={() => setShowSurahDropdown(v => !v)}
                        className="ui-btn"
                        style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <BookOpen size={14} /> {currentSurah?.name_arabic || 'اختر السورة'}
                        </span>
                        <ChevronDown size={14} className={showSurahDropdown ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s ease' }} />
                    </button>

                    <AnimatePresence>
                        {showSurahDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="ui-panel"
                                style={{
                                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 'min(320px, 92vw)',
                                  zIndex: 9999, padding: 0, boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)',
                                }}
                            >
                                <div style={{ padding: 12, borderBottom: '1px solid var(--sand-400)' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)' }} />
                                        <input
                                            type="text"
                                            placeholder="ابحث..."
                                            value={surahSearch}
                                            onChange={e => setSurahSearch(e.target.value)}
                                            className="ui-input"
                                            style={{ paddingRight: 34, textAlign: 'right' }}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                                    {filteredSurahs.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => { setSelectedSura(s.id); setFromAyah(1); setToAyah(null); setShowSurahDropdown(false); setSurahSearch(''); }}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 14px', borderBottom: '1px solid var(--sand-400)',
                                                background: s.id === selectedSura ? 'var(--ink-900)' : 'transparent',
                                                color: s.id === selectedSura ? 'var(--brass-500)' : 'var(--ink-900)',
                                                cursor: 'pointer', border: 'none', borderTop: '0',
                                                fontFamily: 'var(--font-ibm), IBM Plex Sans Arabic',
                                                textAlign: 'right',
                                            }}
                                        >
                                            <span className="font-num" style={{ fontSize: '0.78rem', opacity: 0.6 }}>{String(s.id).padStart(3, '0')}</span>
                                            <span style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.1rem' }}>{s.name_arabic}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div>
                    <span className="ui-label">FROM</span>
                    <input
                        type="number" min={1} max={ayahCount} value={fromAyah}
                        onChange={e => setFromAyah(Math.max(1, Math.min(ayahCount, Number(e.target.value))))}
                        className="ui-input font-num"
                        style={{ width: 80, textAlign: 'center' }}
                    />
                </div>
                <div>
                    <span className="ui-label">TO</span>
                    <input
                        type="number" min={1} max={ayahCount} value={toAyah || ayahCount}
                        onChange={e => setToAyah(Math.max(1, Math.min(ayahCount, Number(e.target.value))))}
                        className="ui-input font-num"
                        style={{ width: 80, textAlign: 'center' }}
                    />
                </div>

                <div style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <span className="ui-badge ui-badge--emerald">
                        <BookMarked size={11} /> AYAH {fromAyah}–{toAyah || ayahCount}
                    </span>
                </div>
            </motion.div>

            {/* Surah Banner */}
            {currentSurah && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginBottom: 22 }}>
                    <h2 style={{
                      fontFamily: 'var(--font-rakkas), Rakkas',
                      fontSize: 'clamp(2.2rem, 5vw, 3rem)',
                      lineHeight: 1, color: 'var(--ink-900)',
                    }}>
                      سورة {currentSurah.name_arabic}
                    </h2>
                    <span className="ui-eyebrow" style={{ marginTop: 8 }}>
                      {currentSurah.revelation_place === 'makkah' ? 'مكية' : 'مدنية'} · <span className="num font-num">{currentSurah.verses_count}</span> آية
                    </span>
                </motion.div>
            )}

            {/* Content */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="ui-panel" style={{ padding: 28 }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 0' }}>
                        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brass-700)' }} />
                        <p style={{ color: 'var(--ink-500)', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.8rem', letterSpacing: '0.18em' }}>LOADING AYAH ...</p>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', lineHeight: 5.4 }}>
                        {selectedSura !== 9 && fromAyah === 1 && (
                            <p style={{ fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', Amiri, serif", fontSize: '1.7rem', color: 'var(--brass-700)', marginBottom: 18, fontWeight: 700 }}>
                                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                            </p>
                        )}

                        <div style={{ fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', Amiri, serif", fontSize: 'clamp(1.7rem, 3.4vw, 2.4rem)', color: 'var(--ink-900)' }}>
                            {verses.map((verse) => {
                                const vKey = verse.verse_key;
                                const isHovered = hoveredAyah === vKey;
                                const isSelected = selectedAyahForTafsir === vKey;

                                return (
                                    <span key={vKey} style={{ position: 'relative', display: 'inline' }}>
                                        <span
                                            onMouseEnter={() => handleMouseEnter(vKey)}
                                            onMouseLeave={handleMouseLeave}
                                            onClick={() => handleAyahClick(vKey)}
                                            style={{
                                                cursor: 'pointer', padding: '2px 4px',
                                                background: isSelected ? 'var(--brass-300)'
                                                          : (isHovered ? 'var(--parchment-200)' : 'transparent'),
                                                color: 'var(--ink-900)',
                                                transition: 'background 0.25s ease',
                                            }}
                                        >
                                            {verse.text_uthmani}
                                        </span>
                                        {' '}
                                        <span style={{ color: 'var(--brass-700)', fontWeight: 700, fontSize: '1.05em', userSelect: 'none' }}>
                                            ﴿{toArabicNum(verse.verse_number)}﴾
                                        </span>
                                        {' '}

                                        {/* Hover preview */}
                                        <AnimatePresence>
                                            {isHovered && !isSelected && tafsirCache[vKey] && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 6 }}
                                                    style={{
                                                        position: 'absolute', zIndex: 9999, bottom: '100%', right: 0, marginBottom: 8,
                                                        width: 'min(320px, 80vw)',
                                                        background: 'var(--ink-900)', color: 'var(--parchment-50)',
                                                        border: '1px solid var(--sand-400)',
                                                        boxShadow: '0 14px 30px -10px rgba(212,175,55,0.5)',
                                                        padding: 14, textAlign: 'right', pointerEvents: 'none', direction: 'rtl',
                                                    }}
                                                >
                                                    <div className="ui-eyebrow" style={{ color: 'var(--brass-500)', marginBottom: 6 }}>
                                                      <BookMarked size={10} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} /> التفسير الميسّر
                                                    </div>
                                                    <p style={{ fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', Amiri, serif", fontSize: '1rem', lineHeight: 1.7 }}>
                                                      {tafsirCache[vKey].substring(0, 180)}...
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Full Tafsir */}
                                        <AnimatePresence>
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    style={{ display: 'block', width: '100%', textAlign: 'right', margin: '14px 0', overflow: 'hidden' }}
                                                >
                                                    <div className="ui-panel" style={{ background: 'var(--parchment-200)' }}>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="ui-eyebrow">
                                                              <BookMarked size={11} style={{ verticalAlign: 'middle', marginInlineEnd: 4, color: 'var(--brass-700)' }} />
                                                              تفسير {toArabicNum(verse.verse_number)}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); setSelectedAyahForTafsir(null); }}
                                                                className="ui-btn ui-btn--ghost"
                                                                style={{ padding: '4px 8px' }}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                        {loadingTafsir === vKey ? (
                                                            <div className="flex items-center justify-center py-6 gap-2">
                                                                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--brass-700)' }} />
                                                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.74rem', letterSpacing: '0.18em', color: 'var(--ink-500)' }}>LOADING ...</span>
                                                            </div>
                                                        ) : (
                                                            <p style={{ fontFamily: "var(--font-aref-ruqaa), 'Aref Ruqaa', Amiri, serif", fontSize: '1.2rem', lineHeight: 2.1, color: 'var(--ink-900)' }}>
                                                              {tafsirCache[vKey] || 'لا يوجد تفسير متاح.'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

export default function TafseerPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brass-700)' }} />
                <p style={{ color: 'var(--ink-500)', fontFamily: 'Share Tech Mono, monospace', fontSize: '0.78rem', letterSpacing: '0.18em' }}>LOADING TAFSEER ...</p>
            </div>
        }>
            <TafseerView />
        </Suspense>
    );
}
