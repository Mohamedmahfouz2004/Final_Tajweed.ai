import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronDown, SkipBack, SkipForward, Square, BookOpen } from 'lucide-react';
import { reciters } from '../utils/data';
import WaveformVisualizer from './WaveformVisualizer';
import useAppStore from '../store/useAppStore';

const PracticeListenCard = ({ isActive, onClick }) => {
    // Store
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

    // Local State
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

    // Word count fetcher logic (simplified for card)
    useEffect(() => {
        // Logic to fetch word counts if needed, but mainly handled by store or main view
        // Keeping it minimal here as store handles most playback logic
    }, [listenSurah, listenFromVerse, listenToVerse]);

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event) {
            if (listenSurahRef.current && !listenSurahRef.current.contains(event.target)) {
                setShowListenSurahList(false);
            }
            if (reciterRef.current && !reciterRef.current.contains(event.target)) {
                setShowReciterList(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, []);

    const toggleReciterList = (e) => {
        e.stopPropagation();
        setShowReciterList(!showReciterList);
        setShowListenSurahList(false);
    };

    return (
        <motion.div
            layout
            onClick={onClick}
            className={`glass-panel overflow-hidden cursor-pointer relative transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] flex flex-col ${isActive ? 'flex-[10]' : 'flex-[1]'}`}
            style={{
                background: isActive ? '#FDFCF5' : 'linear-gradient(135deg, #D4AF37 0%, #B49428 100%)',
                backgroundImage: isActive ? 'radial-gradient(#D4AF37 0.5px, transparent 0.5px), radial-gradient(#D4AF37 0.5px, #FDFCF5 0.5px)' : 'linear-gradient(135deg, #D4AF37 0%, #B49428 100%)',
                backgroundSize: isActive ? '20px 20px' : 'auto',
                backgroundPosition: '0 0, 10px 10px',
                // Removed double border
                color: isActive ? 'inherit' : 'white',
                zIndex: isActive ? 10 : 1
            }}
        >
            {/* Header */}
            <div className={`p-6 flex items-center justify-between flex-shrink-0 ${isActive ? 'bg-white/60 shadow-md backdrop-blur-sm z-10 relative' : ''}`}>
                <h2 className={`text-2xl font-bold font-amiri flex items-center gap-3 ${isActive ? 'text-primary' : 'text-white'}`}>
                    <Play size={28} className={isActive ? 'text-secondary' : 'text-white'} />
                    استمع للتلاوة الصحيحة
                </h2>
                {!isActive && <motion.div animate={{ rotate: 0 }}><ChevronDown className="text-white opacity-80" /></motion.div>}
            </div>

            {/* Content */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-y-auto p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {/* Surah Selector */}
                            <div ref={listenSurahRef}>
                                <label className="block mb-1.5 text-primary font-bold text-sm">السورة</label>
                                <div className="relative">
                                    <button onClick={() => setShowListenSurahList(!showListenSurahList)} className="w-full p-2.5 bg-white border border-[#D4AF37]/40 rounded-lg text-right flex justify-between items-center text-primary font-bold transition-all hover:border-secondary shadow-md hover:shadow-lg">
                                        {listenSurah ? surahs.find(s => s.id === listenSurah)?.name_arabic : 'اختر السورة'} <ChevronDown size={14} className="text-[#D4AF37]" />
                                    </button>
                                    {showListenSurahList && (
                                        <div className="absolute top-full w-full bg-white border border-[#D4AF37]/30 rounded-lg mt-1 max-h-[200px] overflow-y-auto z-20 shadow-xl">
                                            <div className="p-2 border-b border-[#D4AF37]/10"><input type="text" placeholder="بحث..." value={listenSurahSearch} onChange={(e) => setListenSurahSearch(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full p-2 rounded border border-[#D4AF37]/20 text-right focus:border-secondary outline-none bg-white" /></div>
                                            {surahs.filter(s => s.name_arabic.includes(listenSurahSearch)).map(s => (<div key={s.id} onClick={() => { setListenSurah(s.id); setShowListenSurahList(false); setListenSurahSearch(''); setListenFromVerse(1); setListenToVerse(s.verses_count); }} className="p-2.5 cursor-pointer border-b border-[#D4AF37]/10 hover:bg-[#FDFCF5] transition-colors text-primary">{s.name_arabic}</div>))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* From Verse */}
                            <div>
                                <label className="block mb-1.5 text-primary font-bold text-sm">من الآية</label>
                                <input
                                    type="number"
                                    value={listenFromVerse}
                                    min="1"
                                    max={getMaxVerses(listenSurah)}
                                    className="w-full p-2.5 bg-white border border-[#D4AF37]/40 rounded-lg text-center font-bold text-primary focus:border-secondary outline-none shadow-md hover:shadow-lg transition-all"
                                    onChange={(e) => setListenFromVerse(e.target.value)}
                                    onBlur={(e) => {
                                        let v = parseInt(e.target.value);
                                        const max = getMaxVerses(listenSurah);
                                        if (isNaN(v) || v < 1) v = 1;
                                        if (v > max) v = max;
                                        setListenFromVerse(v);
                                    }}
                                />
                            </div>

                            {/* To Verse */}
                            <div>
                                <label className="block mb-1.5 text-primary font-bold text-sm">للآية</label>
                                <input
                                    type="number"
                                    value={listenToVerse}
                                    min="1"
                                    max={getMaxVerses(listenSurah)}
                                    className="w-full p-2.5 bg-white border border-[#D4AF37]/40 rounded-lg text-center font-bold text-primary focus:border-secondary outline-none shadow-md hover:shadow-lg transition-all"
                                    onChange={(e) => setListenToVerse(e.target.value)}
                                    onBlur={(e) => {
                                        let v = parseInt(e.target.value);
                                        const max = getMaxVerses(listenSurah);
                                        if (isNaN(v) || v < 1) v = 1;
                                        if (v > max) v = max;
                                        setListenToVerse(v);
                                    }}
                                />
                            </div>

                            {/* Reciter Selector */}
                            <div ref={reciterRef}>
                                <label className="block mb-1.5 text-primary font-bold text-sm">القارئ</label>
                                <div className="relative">
                                    <button onClick={toggleReciterList} className="w-full p-2.5 bg-white border border-[#D4AF37]/40 rounded-lg text-right flex justify-between items-center text-primary font-bold transition-all hover:border-secondary shadow-md hover:shadow-lg">
                                        {selectedReciter ? reciters.find(s => s.id == selectedReciter)?.name : 'اختر القارئ'} <ChevronDown size={14} className="text-[#D4AF37]" />
                                    </button>
                                    {showReciterList && (
                                        <div className="absolute top-full w-full bg-white border border-[#D4AF37]/30 rounded-lg mt-1 max-h-[200px] overflow-y-auto z-20 shadow-xl">
                                            <div className="p-2 border-b border-[#D4AF37]/10"><input type="text" placeholder="بحث..." value={reciterSearch} onChange={(e) => setReciterSearch(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full p-2 rounded border border-[#D4AF37]/20 text-right focus:border-secondary outline-none bg-white" /></div>
                                            {reciters.filter(r => r.name.includes(reciterSearch)).map(s => (<div key={s.id} onClick={() => { setSelectedReciter(s.id); setShowReciterList(false); setReciterSearch(''); }} className="p-2.5 cursor-pointer border-b border-[#D4AF37]/10 hover:bg-[#FDFCF5] transition-colors text-primary">{s.name}</div>))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Play Controls */}
                        <div className="flex items-center justify-center gap-4 mb-8">
                            {!currentPlayingAudio ? (
                                <button onClick={handlePlayReference} className="py-3 px-8 rounded-full border-none bg-secondary text-primary font-bold cursor-pointer flex items-center gap-2 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                                    <Play size={24} /> تشغيل التلاوة
                                </button>
                            ) : (
                                <>
                                    <button onClick={handlePrevVerse} className="p-3 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer shadow-sm transition-transform hover:scale-105"><SkipForward size={24} className="rotate-180" /></button>
                                    <button onClick={handlePlayReference} className="w-16 h-16 rounded-full border-none bg-secondary text-primary flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">{isPlaying ? <Pause size={32} /> : <Play size={32} />}</button>
                                    <button onClick={handleNextVerse} className="p-3 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer shadow-sm transition-transform hover:scale-105"><SkipBack size={24} className="rotate-180" /></button>
                                    <button onClick={handleStopRecitation} className="p-3 rounded-full border-none bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer shadow-sm transition-transform hover:scale-105"><Square size={24} /></button>
                                </>
                            )}
                        </div>

                        {/* Live Verse Display & Visualizer */}
                        {/* Live Verse Display & Visualizer */}
                        <div className="space-y-6">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-12 text-center relative min-h-[200px] flex items-center justify-center flex-col shadow-inner transition-all hover:bg-primary/10"
                            >
                                <div className="absolute top-4 left-4 opacity-10">
                                    <Square size={80} color="#044D29" className="hidden" /> {/* Placeholder for consistent import if needed, but using BookOpen below */}
                                    <BookOpen size={80} color="#044D29" />
                                </div>

                                {currentPlayingAudio ? (
                                    <>
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50"></div>
                                        <p className="font-amiri text-4xl leading-loose text-primary rtl m-0 drop-shadow-sm relative z-10">
                                            {(currentVerseWords.map(w => w.text_uthmani).join(' ') || `الآية ${currentVerseIndex}`).replace(/[\d٠-٩]+\s*$/, '')}
                                            <span className="relative inline-flex items-center justify-center w-16 h-16 mx-2 align-middle">
                                                <span className="absolute text-[#D4AF37] text-6xl leading-none" style={{ marginTop: '-8px' }}>۝</span>
                                                <span className="relative z-10 text-2xl font-bold text-primary pt-1 font-amiri">
                                                    {currentVerseIndex.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])}
                                                </span>
                                            </span>
                                        </p>
                                        {/* Label Removed as requested */}
                                    </>
                                ) : (
                                    <span className="text-gray-500 text-lg relative z-10">اختر السورة والآية لبدء الاستماع</span>
                                )}
                            </motion.div>

                            {/* Visualizer Container - Transparent */}
                            {currentPlayingAudio && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 px-4"
                                >
                                    <WaveformVisualizer isPlaying={isPlaying} />
                                </motion.div>
                            )}
                            <audio className="hidden" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default PracticeListenCard;
