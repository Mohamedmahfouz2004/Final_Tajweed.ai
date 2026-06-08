'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronDown, SkipBack, SkipForward, Square, BookOpen, Search } from 'lucide-react';
import { reciters } from '../utils/data';
import WaveformVisualizer from './WaveformVisualizer';
import useAppStore from '../store/useAppStore';

const PracticeListenCard = ({ isActive = true }) => {
    const surahs = useAppStore(s => s.surahs);
    const listenSurah = useAppStore(s => s.listenSurah);
    const setListenSurah = useAppStore(s => s.setListenSurah);
    const listenFromVerse = useAppStore(s => s.listenFromVerse);
    const setListenFromVerse = useAppStore(s => s.setListenFromVerse);
    const listenToVerse = useAppStore(s => s.listenToVerse);
    const setListenToVerse = useAppStore(s => s.setListenToVerse);
    const selectedReciter = useAppStore(s => s.selectedReciter);
    const setSelectedReciter = useAppStore(s => s.setSelectedReciter);
    const isPlaying = useAppStore(s => s.isPlaying);
    const handlePlayReference = useAppStore(s => s.handlePlayReference);
    const handleStopRecitation = useAppStore(s => s.handleStopRecitation);
    const currentPlayingAudio = useAppStore(s => s.currentPlayingAudio);
    const handleNextVerse = useAppStore(s => s.handleNextVerse);
    const handlePrevVerse = useAppStore(s => s.handlePrevVerse);
    const currentVerseWords = useAppStore(s => s.currentVerseWords);
    const currentVerseIndex = useAppStore(s => s.currentVerseIndex);

    const [showListenSurahList, setShowListenSurahList] = useState(false);
    const [showReciterList, setShowReciterList] = useState(false);
    const [listenSurahSearch, setListenSurahSearch] = useState('');
    const [reciterSearch, setReciterSearch] = useState('');
    const listenSurahRef = useRef(null);
    const reciterRef = useRef(null);

    const getMaxVerses = (surahId) => {
        const surah = surahs.find(s => s.id === surahId);
        return surah?.verses_count || 286;
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (listenSurahRef.current && !listenSurahRef.current.contains(event.target)) setShowListenSurahList(false);
            if (reciterRef.current && !reciterRef.current.contains(event.target)) setShowReciterList(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredSurahs = surahs.filter(s => s.name_arabic?.includes(listenSurahSearch));
    const filteredReciters = reciters.filter(r => r.name.includes(reciterSearch));

    if (!isActive) return null;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto" dir="rtl">
            <div className="flex items-center gap-3 mb-6">
                <div style={{
                    width: 56, height: 56, background: 'var(--brass-500)', color: 'var(--ink-900)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)',
                }}>
                    <Play size={22} strokeWidth={2.4} />
                </div>
                <div>
                    <h2 className="ui-title" style={{ fontSize: '2.2rem' }}>استمع للتلاوة</h2>
                    <span className="ui-eyebrow">LISTEN &nbsp;//&nbsp; SELECT &amp; PLAY</span>
                </div>
            </div>

            {/* Selection Form */}
            <div className="ui-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>

                {/* Surah Selector */}
                <div ref={listenSurahRef}>
                    <span className="ui-label">السورة</span>
                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={() => setShowListenSurahList(!showListenSurahList)}
                            className="ui-btn"
                            style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {listenSurah ? surahs.find(s => s.id === listenSurah)?.name_arabic : 'اختر السورة'}
                            </span>
                            <ChevronDown size={14} style={{ transform: showListenSurahList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                        </button>
                        {showListenSurahList && (
                            <div className="ui-panel" style={{
                                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                                padding: 0, zIndex: 30, boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)',
                            }}>
                                <div style={{ padding: 10, borderBottom: '1px solid var(--sand-400)', position: 'relative' }}>
                                    <Search size={13} style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)' }} />
                                    <input type="text" placeholder="بحث..." value={listenSurahSearch}
                                        onChange={e => setListenSurahSearch(e.target.value)} onClick={e => e.stopPropagation()}
                                        className="ui-input" style={{ paddingRight: 28, textAlign: 'right' }} />
                                </div>
                                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                    {filteredSurahs.map(s => (
                                        <button
                                            key={s.id} type="button"
                                            onClick={() => { setListenSurah(s.id); setShowListenSurahList(false); setListenSurahSearch(''); setListenFromVerse(1); setListenToVerse(s.verses_count); }}
                                            style={{
                                                width: '100%', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
                                                borderBottom: '1px solid var(--sand-400)',
                                                background: 'transparent', cursor: 'pointer', border: 'none',
                                                color: 'var(--ink-900)', textAlign: 'right',
                                                fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.05rem',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--parchment-200)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <span className="font-num" style={{ color: 'var(--brass-700)', fontSize: '0.74rem', width: 28 }}>
                                              {String(s.id).padStart(3, '0')}
                                            </span>
                                            {s.name_arabic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <span className="ui-label">من الآية</span>
                    <input
                        type="number" value={listenFromVerse ?? ''} min="1" max={getMaxVerses(listenSurah)}
                        className="ui-input font-num"
                        style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 600 }}
                        onChange={e => setListenFromVerse(e.target.value)}
                        onBlur={e => {
                            let v = parseInt(e.target.value);
                            const max = getMaxVerses(listenSurah);
                            if (isNaN(v) || v < 1) v = 1;
                            if (v > max) v = max;
                            setListenFromVerse(v);
                        }}
                    />
                </div>
                <div>
                    <span className="ui-label">للآية</span>
                    <input
                        type="number" value={listenToVerse ?? ''} min="1" max={getMaxVerses(listenSurah)}
                        className="ui-input font-num"
                        style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 600 }}
                        onChange={e => setListenToVerse(e.target.value)}
                        onBlur={e => {
                            let v = parseInt(e.target.value);
                            const max = getMaxVerses(listenSurah);
                            if (isNaN(v) || v < 1) v = 1;
                            if (v > max) v = max;
                            setListenToVerse(v);
                        }}
                    />
                </div>

                <div ref={reciterRef}>
                    <span className="ui-label">القارئ</span>
                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setShowReciterList(!showReciterList); setShowListenSurahList(false); }}
                            className="ui-btn"
                            style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {selectedReciter ? reciters.find(r => r.id == selectedReciter)?.name : 'اختر القارئ'}
                            </span>
                            <ChevronDown size={14} style={{ transform: showReciterList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                        </button>
                        {showReciterList && (
                            <div className="ui-panel" style={{
                                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                                padding: 0, zIndex: 30, boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)',
                            }}>
                                <div style={{ padding: 10, borderBottom: '1px solid var(--sand-400)', position: 'relative' }}>
                                    <Search size={13} style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)' }} />
                                    <input type="text" placeholder="بحث..." value={reciterSearch}
                                        onChange={e => setReciterSearch(e.target.value)} onClick={e => e.stopPropagation()}
                                        className="ui-input" style={{ paddingRight: 28, textAlign: 'right' }} />
                                </div>
                                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                    {filteredReciters.map(r => (
                                        <button
                                            key={r.id} type="button"
                                            onClick={() => { setSelectedReciter(r.id); setShowReciterList(false); setReciterSearch(''); }}
                                            style={{
                                                width: '100%', padding: '8px 12px',
                                                borderBottom: '1px solid var(--sand-400)',
                                                background: 'transparent', cursor: 'pointer', border: 'none',
                                                color: 'var(--ink-900)', textAlign: 'right',
                                                fontFamily: 'var(--font-ibm), IBM Plex Sans Arabic', fontSize: '0.92rem',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--parchment-200)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {r.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Play Controls */}
            <div className="flex items-center justify-center gap-3 mb-6">
                {!currentPlayingAudio ? (
                    <button onClick={handlePlayReference} className="ui-cta" type="button">
                        <Play size={18} strokeWidth={2.4} /> تشغيل التلاوة
                    </button>
                ) : (
                    <>
                        <button onClick={handlePrevVerse} className="ui-btn" type="button" style={{ padding: 12 }}>
                            <SkipForward size={18} className="rotate-180" />
                        </button>
                        <button onClick={handlePlayReference} className="ui-mic" type="button" style={{ width: 64, height: 64 }}>
                            {isPlaying ? <Pause size={26} strokeWidth={2.4} /> : <Play size={26} strokeWidth={2.4} />}
                        </button>
                        <button onClick={handleNextVerse} className="ui-btn" type="button" style={{ padding: 12 }}>
                            <SkipBack size={18} className="rotate-180" />
                        </button>
                        <button onClick={handleStopRecitation} className="ui-btn ui-btn--danger" type="button" style={{ padding: 12 }}>
                            <Square size={18} />
                        </button>
                    </>
                )}
            </div>

            {/* Verse Display */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="ui-panel"
                style={{ minHeight: 200, padding: 36, position: 'relative', overflow: 'hidden' }}
            >
                <BookOpen size={120} style={{ position: 'absolute', top: 18, right: 24, opacity: 0.04, color: 'var(--ink-900)' }} />

                {currentPlayingAudio ? (
                    <p style={{
                        fontFamily: 'Amiri, serif', fontSize: 'clamp(1.6rem, 3.6vw, 2.4rem)',
                        lineHeight: 2, color: 'var(--ink-900)', textAlign: 'center', position: 'relative', zIndex: 1,
                    }}>
                        {(currentVerseWords.map(w => w.text_uthmani).join(' ') || `الآية ${currentVerseIndex}`).replace(/[\d٠-٩]+\s*$/, '')}
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, margin: '0 10px', position: 'relative' }}>
                            <span style={{ position: 'absolute', color: 'var(--brass-500)', fontSize: '3rem', lineHeight: 1, marginTop: -8 }}>۝</span>
                            <span className="font-num" style={{ position: 'relative', zIndex: 1, fontWeight: 700, color: 'var(--ink-900)', paddingTop: 2 }}>
                                {currentVerseIndex.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])}
                            </span>
                        </span>
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 12 }}>
                        <div style={{
                            width: 56, height: 56, background: 'var(--emerald-700)', color: 'var(--parchment-50)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid var(--sand-400)',
                            boxShadow: '0 14px 30px -10px rgba(212,175,55,0.5)',
                        }}>
                            <BookOpen size={26} strokeWidth={2.2} />
                        </div>
                        <span style={{ color: 'var(--ink-700)', fontSize: '1.05rem', fontWeight: 600 }}>
                          اختر السورة والآية لبدء الاستماع
                        </span>
                    </div>
                )}
            </motion.div>

            <AnimatePresence>
                {currentPlayingAudio && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 ui-panel" style={{ padding: 16 }}>
                        <WaveformVisualizer isPlaying={isPlaying} />
                    </motion.div>
                )}
            </AnimatePresence>
            <audio className="hidden" />
        </motion.div>
    );
};

export default PracticeListenCard;
