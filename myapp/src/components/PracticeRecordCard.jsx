'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mic, ChevronDown, Search } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const PracticeRecordCard = () => {
    const router = useRouter();
    const surahs = useAppStore(s => s.surahs);
    const fetchSurahs = useAppStore(s => s.fetchSurahs);

    const {
        selectedSurah, setSelectedSurah,
        fromVerse, setFromVerse,
        toVerse, setToVerse,
    } = useAppStore();

    const [showSurahList, setShowSurahList] = useState(false);
    const [surahSearch, setSurahSearch] = useState('');
    const [maxAya, setMaxAya] = useState(7);
    const surahListRef = useRef(null);

    useEffect(() => { fetchSurahs(); }, []);

    useEffect(() => {
        if (selectedSurah && Array.isArray(surahs)) {
            const s = surahs.find(s => s.id == selectedSurah);
            if (s) {
                const newMax = s.aya_count || 7;
                setMaxAya(newMax);
                if (fromVerse > newMax || fromVerse < 1) setFromVerse(1);
                if (toVerse > newMax || toVerse < 1) setToVerse(newMax);
            }
        }
    }, [selectedSurah, surahs]);

    useEffect(() => {
        function handleClickOutside(e) {
            if (surahListRef.current && !surahListRef.current.contains(e.target)) {
                setShowSurahList(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleStart = () => {
        if (!selectedSurah) { alert('اختر السورة أولاً'); return; }
        router.push('/live-moshaf');
    };

    const surahName = (selectedSurah && Array.isArray(surahs))
        ? surahs.find(s => s.id == selectedSurah)?.name
        : '';

    const filtered = Array.isArray(surahs) ? surahs.filter(s => s.name && s.name.includes(surahSearch)) : [];

    return (
        <div className="max-w-3xl mx-auto" dir="rtl">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div style={{
                        width: 56, height: 56, background: 'var(--ink-900)', color: 'var(--brass-500)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 14px 30px -10px rgba(212,175,55,0.5)',
                    }}>
                        <Mic size={24} strokeWidth={2.2} />
                    </div>
                    <div>
                        <h2 className="ui-title" style={{ fontSize: '2.2rem' }}>سَجِّل تلاوتك</h2>
                        <span className="ui-eyebrow" style={{ marginTop: 4 }}>
                          STUDIO &nbsp;//&nbsp; CONFIGURE SESSION
                        </span>
                    </div>
                </div>

                {/* Selection Form */}
                <div className="ui-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Surah Selector */}
                    <div ref={surahListRef}>
                        <span className="ui-label">السورة</span>
                        <div style={{ position: 'relative' }}>
                            <button
                                type="button"
                                onClick={() => setShowSurahList(!showSurahList)}
                                className="ui-btn"
                                style={{ width: '100%', justifyContent: 'space-between' }}
                            >
                                <span>{surahName || 'اختر السورة...'}</span>
                                <ChevronDown size={14} style={{ transform: showSurahList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                            </button>
                            {showSurahList && (
                                <div className="ui-panel" style={{
                                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                                    padding: 0, zIndex: 30, boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)',
                                }}>
                                    <div style={{ padding: 12, borderBottom: '1px solid var(--sand-400)', position: 'relative' }}>
                                        <Search size={14} style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-500)' }} />
                                        <input
                                            type="text"
                                            placeholder="ابحث..."
                                            value={surahSearch}
                                            onChange={e => setSurahSearch(e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                            className="ui-input"
                                            style={{ paddingRight: 32, textAlign: 'right' }}
                                        />
                                    </div>
                                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                                        {filtered.map(s => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => { setSelectedSurah(s.id); setShowSurahList(false); setSurahSearch(''); }}
                                                style={{
                                                    width: '100%', padding: '10px 14px',
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    borderBottom: '1px solid var(--sand-400)',
                                                    background: 'transparent', cursor: 'pointer',
                                                    border: 'none', color: 'var(--ink-900)',
                                                    textAlign: 'right',
                                                    fontFamily: 'var(--font-ibm), IBM Plex Sans Arabic',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--parchment-200)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span className="font-num" style={{ color: 'var(--brass-700)', fontSize: '0.8rem', width: 28 }}>
                                                  {String(s.id).padStart(3, '0')}
                                                </span>
                                                <span style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.1rem' }}>{s.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Aya Range */}
                    <div className="ui-split">
                        <div>
                            <span className="ui-label">من الآية</span>
                            <input
                                type="number" value={fromVerse} min={1} max={maxAya}
                                onChange={e => setFromVerse(Math.max(1, Math.min(maxAya, parseInt(e.target.value) || 1)))}
                                className="ui-input font-num"
                                style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }}
                            />
                        </div>
                        <div>
                            <span className="ui-label">إلى الآية</span>
                            <input
                                type="number" value={toVerse} min={fromVerse} max={maxAya}
                                onChange={e => setToVerse(Math.max(fromVerse, Math.min(maxAya, parseInt(e.target.value) || 1)))}
                                className="ui-input font-num"
                                style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 600 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Start Button */}
                <button
                    type="button"
                    onClick={handleStart}
                    disabled={!selectedSurah}
                    className="ui-cta"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 18, opacity: selectedSurah ? 1 : 0.4, cursor: selectedSurah ? 'pointer' : 'not-allowed' }}
                >
                    <Mic size={18} strokeWidth={2.2} />
                    ابدأ التلاوة المباشرة
                </button>
            </motion.div>
        </div>
    );
};

export default PracticeRecordCard;
