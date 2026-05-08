import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, ChevronDown } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const MUAALEM_API_URL = 'http://localhost:8888';

const PracticeRecordCard = () => {
    const navigate = useNavigate();
    const surahs = useAppStore(s => s.surahs);
    const fetchSurahs = useAppStore(s => s.fetchSurahs);
    
    const { 
        selectedSurah, setSelectedSurah, 
        fromVerse, setFromVerse,
        toVerse, setToVerse
    } = useAppStore();
    
    const [showSurahList, setShowSurahList] = useState(false);
    const [surahSearch, setSurahSearch] = useState('');
    const [maxAya, setMaxAya] = useState(7);
    const surahListRef = useRef(null);

    // Load surahs from API via store
    useEffect(() => {
        fetchSurahs();
    }, []);

    // Update maxAya when surah changes
    useEffect(() => {
        console.log('[PracticeRecord] selectedSurah changed:', selectedSurah);
        if (selectedSurah && Array.isArray(surahs)) {
            const s = surahs.find(s => s.id == selectedSurah);
            if (s) {
                console.log('[PracticeRecord] Found surah info:', s);
                setMaxAya(s.aya_count || 7);
                setFromVerse(1);
                setToVerse(s.aya_count || 7);
            }
        }
    }, [selectedSurah, surahs]);

    // Click outside handler for surah list
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
        if (!selectedSurah) {
            alert('اختر السورة أولاً');
            return;
        }
        navigate('/live-moshaf');
    };

    const surahName = (selectedSurah && Array.isArray(surahs)) 
        ? surahs.find(s => s.id == selectedSurah)?.name 
        : '';

    return (
        <div className="font-arabic max-w-5xl mx-auto" dir="rtl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(27,94,59,0.1)', border: '1px solid rgba(27,94,59,0.2)' }}>
                        <Mic size={28} className="text-[#1B5E3B]" />
                    </div>
                    <h2 className="text-2xl font-amiri font-bold text-[#2C1810] mb-2">سجّل تلاوتك</h2>
                    <p className="text-[#6B5D4F] text-sm">اختر السورة والآيات ثم ابدأ التسجيل في وضع التسميع</p>
                </div>

                {/* Selection Form */}
                <div className="rounded-2xl p-6 space-y-5" style={{ background: '#FFF9F0', border: '1px solid rgba(184,146,62,0.15)', boxShadow: '0 4px 20px rgba(44,24,16,0.06)' }}>

                    {/* Surah Selector */}
                    <div ref={surahListRef} className="space-y-2">
                        <label className="block text-[#8B6D2E] font-bold text-sm">السورة</label>
                        <div className="relative">
                            <button
                                onClick={() => setShowSurahList(!showSurahList)}
                                className="w-full p-3.5 rounded-xl text-right flex justify-between items-center text-[#2C1810] font-bold text-base transition-all cursor-pointer border-none"
                                style={{ background: '#FAF5EC', border: '1px solid rgba(184,146,62,0.2)' }}
                            >
                                {surahName || 'اختر السورة...'} <ChevronDown size={16} className="text-[#B8923E]" />
                            </button>
                            {showSurahList && (
                                <div className="absolute top-full w-full rounded-xl mt-2 max-h-[280px] overflow-y-auto z-20 shadow-xl" style={{ background: '#FFF9F0', border: '1px solid rgba(184,146,62,0.2)' }}>
                                    <div className="p-2.5" style={{ borderBottom: '1px solid rgba(184,146,62,0.1)' }}>
                                        <input type="text" placeholder="ابحث عن سورة..." value={surahSearch} onChange={(e) => setSurahSearch(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full p-2.5 rounded-lg text-right outline-none text-sm text-[#2C1810] placeholder:text-[#9C8E7C]"
                                            style={{ background: '#FAF5EC', border: '1px solid rgba(184,146,62,0.15)' }}
                                        />
                                    </div>
                                    {Array.isArray(surahs) && surahs.filter(s => s.name && s.name.includes(surahSearch)).map(s => (
                                        <div key={s.id} onClick={() => { setSelectedSurah(s.id); setShowSurahList(false); setSurahSearch(''); }}
                                            className="p-3 cursor-pointer hover:bg-[#F5EDE0] transition-colors text-[#2C1810] font-bold text-sm"
                                            style={{ borderBottom: '1px solid rgba(184,146,62,0.06)' }}>
                                            <span className="text-[#B8923E] ml-2">{s.id}.</span> {s.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Aya Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[#8B6D2E] font-bold text-sm">من الآية</label>
                            <input type="number" value={fromVerse} min={1} max={maxAya}
                                onChange={(e) => setFromVerse(Math.max(1, Math.min(maxAya, parseInt(e.target.value) || 1)))}
                                className="w-full p-3.5 rounded-xl text-center font-bold text-[#2C1810] text-lg outline-none"
                                style={{ background: '#FAF5EC', border: '1px solid rgba(184,146,62,0.2)' }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[#8B6D2E] font-bold text-sm">إلى الآية</label>
                            <input type="number" value={toVerse} min={fromVerse} max={maxAya}
                                onChange={(e) => setToVerse(Math.max(fromVerse, Math.min(maxAya, parseInt(e.target.value) || 1)))}
                                className="w-full p-3.5 rounded-xl text-center font-bold text-[#2C1810] text-lg outline-none"
                                style={{ background: '#FAF5EC', border: '1px solid rgba(184,146,62,0.2)' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Start Button */}
                <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 12px 30px rgba(27,94,59,0.2)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStart}
                    disabled={!selectedSurah}
                    className="w-full py-4 rounded-2xl font-bold text-lg text-white border-none cursor-pointer shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #1B5E3B, #2D8A56)' }}
                >
                    <Mic size={22} /> ابدأ التلاوة المباشرة
                </motion.button>
            </motion.div>
        </div>
    );
};

export default PracticeRecordCard;
