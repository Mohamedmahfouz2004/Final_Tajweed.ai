import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronDown, SkipBack, SkipForward, Square, BookOpen, Mic } from 'lucide-react';
import { reciters } from '../utils/data';
import WaveformVisualizer from './WaveformVisualizer';
import useAppStore from '../store/useAppStore';

const PracticeListenCard = ({ isActive, onClick, activeViewTab, setActiveViewTab }) => {
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
            className={`overflow-hidden cursor-pointer relative transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] flex flex-col ${isActive ? 'flex-[10]' : 'flex-[1]'}`}
            style={{
                background: 'transparent',
                color: isActive ? 'inherit' : 'white',
                zIndex: isActive ? 10 : 1
            }}
        >
            {/* Unified Header with View Switcher */}
            {isActive && setActiveViewTab && (
                <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 px-5 py-3.5 mb-6 shadow-lg flex flex-col md:flex-row justify-between items-center">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* View Switcher (Listen / Record) */}
                        <div className="flex bg-white/60 backdrop-blur-sm p-1 rounded-xl shadow-md border border-white/80 gap-0.5">
                            <button
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 ${activeViewTab === 'listen' ? 'bg-gradient-to-r from-[#D4AF37] to-[#B49428] text-white shadow-md' : 'text-gray-500 hover:text-[#B49428]'}`}
                                onClick={() => setActiveViewTab('listen')}
                            >
                                <Play size={14} className={activeViewTab === 'listen' ? 'fill-current' : ''} /> استمع
                            </button>
                            <button
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 ${activeViewTab === 'record' ? 'bg-gradient-to-r from-[#044D29] to-[#066b3b] text-white shadow-md' : 'text-gray-500 hover:text-[#044D29]'}`}
                                onClick={() => setActiveViewTab('record')}
                            >
                                <Mic size={14} /> سجّل
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 md:mt-0">
                        <div className="text-right">
                            <h2 className="text-lg font-bold text-[#D4AF37] font-amiri leading-none mb-0.5">استمع للتلاوة</h2>
                            <p className="text-[10px] text-amber-700/60 font-bold tracking-widest uppercase">Listen & Learn</p>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B49428] flex items-center justify-center text-white shadow-md">
                            <Play size={18} className="fill-current" />
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsed Header */}
            {!isActive && (
                <div className="py-3 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-[#D4AF37] to-[#B49428] rounded-xl px-5 shadow-lg">
                    <h2 className="text-xl font-bold font-amiri flex items-center gap-3 text-white">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20 text-white">
                            <Play size={20} />
                        </div>
                        استمع للتلاوة الصحيحة
                    </h2>
                    <motion.div animate={{ rotate: 0 }}><ChevronDown className="text-white opacity-80" size={20} /></motion.div>
                </div>
            )}

            {/* Content */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {/* Surah Selector */}
                            <div ref={listenSurahRef} className="space-y-1.5">
                                <label className="block text-[#044D29] font-bold text-sm px-1">السورة</label>
                                <div className="relative">
                                    <button onClick={() => setShowListenSurahList(!showListenSurahList)} className="w-full p-3 bg-white border border-[#D4AF37]/20 rounded-xl text-right flex justify-between items-center text-[#044D29] font-bold text-base transition-all hover:border-[#D4AF37] shadow-md">
                                        {listenSurah ? surahs.find(s => s.id === listenSurah)?.name_arabic : 'اختر السورة'} <ChevronDown size={16} className="text-[#D4AF37]" />
                                    </button>
                                    {showListenSurahList && (
                                        <div className="absolute top-full w-full bg-white border border-[#D4AF37]/20 rounded-xl mt-2 max-h-[250px] overflow-y-auto z-20 shadow-xl">
                                            <div className="p-2.5 border-b border-[#D4AF37]/10"><input type="text" placeholder="بحث..." value={listenSurahSearch} onChange={(e) => setListenSurahSearch(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full p-2.5 rounded-lg border border-[#D4AF37]/20 text-right focus:border-[#044D29] outline-none bg-gray-50 text-sm" /></div>
                                            {surahs.filter(s => s.name_arabic.includes(listenSurahSearch)).map(s => (<div key={s.id} onClick={() => { setListenSurah(s.id); setShowListenSurahList(false); setListenSurahSearch(''); setListenFromVerse(1); setListenToVerse(s.verses_count); }} className="p-2.5 cursor-pointer border-b border-[#D4AF37]/10 hover:bg-[#D4AF37]/5 transition-colors text-[#044D29] font-bold text-sm">{s.name_arabic}</div>))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* From Verse */}
                            <div className="space-y-1.5">
                                <label className="block text-[#044D29] font-bold text-sm px-1">من الآية</label>
                                <input
                                    type="number"
                                    value={listenFromVerse}
                                    min="1"
                                    max={getMaxVerses(listenSurah)}
                                    className="w-full p-3 bg-white border border-[#D4AF37]/20 rounded-xl text-center font-bold text-[#044D29] text-base focus:border-[#044D29] outline-none shadow-md"
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
                            <div className="space-y-1.5">
                                <label className="block text-[#044D29] font-bold text-sm px-1">للآية</label>
                                <input
                                    type="number"
                                    value={listenToVerse}
                                    min="1"
                                    max={getMaxVerses(listenSurah)}
                                    className="w-full p-3 bg-white border border-[#D4AF37]/20 rounded-xl text-center font-bold text-[#044D29] text-base focus:border-[#044D29] outline-none shadow-md"
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
                            <div ref={reciterRef} className="space-y-1.5">
                                <label className="block text-[#044D29] font-bold text-sm px-1">القارئ</label>
                                <div className="relative">
                                    <button onClick={toggleReciterList} className="w-full p-3 bg-white border border-[#D4AF37]/20 rounded-xl text-right flex justify-between items-center text-[#044D29] font-bold text-base transition-all hover:border-[#D4AF37] shadow-md">
                                        {selectedReciter ? reciters.find(s => s.id == selectedReciter)?.name : 'اختر القارئ'} <ChevronDown size={16} className="text-[#D4AF37]" />
                                    </button>
                                    {showReciterList && (
                                        <div className="absolute top-full w-full bg-white border border-[#D4AF37]/20 rounded-xl mt-2 max-h-[250px] overflow-y-auto z-20 shadow-xl">
                                            <div className="p-2.5 border-b border-[#D4AF37]/10"><input type="text" placeholder="بحث..." value={reciterSearch} onChange={(e) => setReciterSearch(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full p-2.5 rounded-lg border border-[#D4AF37]/20 text-right focus:border-[#044D29] outline-none bg-gray-50 text-sm" /></div>
                                            {reciters.filter(r => r.name.includes(reciterSearch)).map(s => (<div key={s.id} onClick={() => { setSelectedReciter(s.id); setShowReciterList(false); setReciterSearch(''); }} className="p-2.5 cursor-pointer border-b border-[#D4AF37]/10 hover:bg-[#D4AF37]/5 transition-colors text-[#044D29] font-bold text-sm">{s.name}</div>))}
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

                        {/* Verse Display */}
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/90 backdrop-blur-md border-2 border-[#044D29]/15 rounded-2xl p-8 text-center relative min-h-[200px] flex items-center justify-center flex-col shadow-lg transition-all hover:bg-white"
                            >
                                <div className="absolute top-6 right-6 opacity-5">
                                    <BookOpen size={100} color="#044D29" />
                                </div>

                                {currentPlayingAudio ? (
                                    <div className="w-full px-4">
                                        <p className="font-amiri text-4xl leading-[1.8] text-[#044D29] rtl m-0 drop-shadow-sm relative z-10 transition-all">
                                            {(currentVerseWords.map(w => w.text_uthmani).join(' ') || `الآية ${currentVerseIndex}`).replace(/[\d٠-٩]+\s*$/, '')}
                                            <span className="relative inline-flex items-center justify-center w-14 h-14 mx-3 align-middle">
                                                <span className="absolute text-[#D4AF37] text-5xl leading-none" style={{ marginTop: '-8px' }}>۝</span>
                                                <span className="relative z-10 text-xl font-bold text-[#044D29] pt-1 font-amiri">
                                                    {currentVerseIndex.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])}
                                                </span>
                                            </span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                            <BookOpen size={28} />
                                        </div>
                                        <span className="text-[#044D29] text-lg font-bold opacity-60">اختر السورة والآية لبدء الاستماع</span>
                                    </div>
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
