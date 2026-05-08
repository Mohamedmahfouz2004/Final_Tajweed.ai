import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, Search, Loader2, BookMarked, X } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const QURAN_API = 'https://api.quran.com/api/v4';
// Arabic Tafsir Al-Muyassar (التفسير الميسر)
const TAFSIR_RESOURCE_ID = 16;

export default function TafseerView() {
    const location = useLocation();
    const navigate = useNavigate();
    const surahs = useAppStore(s => s.surahs);

    const query = new URLSearchParams(location.search);
    const initialSura = parseInt(query.get('sura')) || 1;
    const initialFrom = parseInt(query.get('from')) || 1;
    const initialTo = parseInt(query.get('to')) || null;

    const [selectedSura, setSelectedSura] = useState(initialSura);
    const [fromAyah, setFromAyah] = useState(initialFrom);
    const [toAyah, setToAyah] = useState(initialTo);
    const [ayahCount, setAyahCount] = useState(7);
    const [verses, setVerses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [surahSearch, setSurahSearch] = useState('');
    const [showSurahDropdown, setShowSurahDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Tafsir state
    const [hoveredAyah, setHoveredAyah] = useState(null);
    const [selectedAyahForTafsir, setSelectedAyahForTafsir] = useState(null);
    const [tafsirCache, setTafsirCache] = useState({});
    const [loadingTafsir, setLoadingTafsir] = useState(null);
    const hoverTimeoutRef = useRef(null);

    // Update ayah count when surah changes
    useEffect(() => {
        if (surahs.length > 0) {
            const surah = surahs.find(s => s.id === selectedSura);
            if (surah) {
                setAyahCount(surah.verses_count);
                if (!initialTo || selectedSura !== initialSura) {
                    setToAyah(surah.verses_count);
                }
                if (fromAyah > surah.verses_count) setFromAyah(1);
            }
        }
    }, [selectedSura, surahs]);

    // Fetch verses for the selected range
    useEffect(() => {
        if (!selectedSura) return;
        setLoading(true);
        setSelectedAyahForTafsir(null);
        const from = fromAyah || 1;
        const to = toAyah || ayahCount;

        const fetchVerses = async () => {
            try {
                const res = await fetch(
                    `${QURAN_API}/verses/by_chapter/${selectedSura}?language=ar&words=false&per_page=300&fields=text_uthmani,verse_key`
                );
                const data = await res.json();
                const allVerses = data?.verses || [];
                const filtered = allVerses.filter(v => {
                    const num = v.verse_number;
                    return num >= from && num <= to;
                });
                setVerses(filtered);
                navigate(`/tafseer?sura=${selectedSura}&from=${from}&to=${to}`, { replace: true });
            } catch (err) {
                console.error('Error fetching verses:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchVerses();
    }, [selectedSura, fromAyah, toAyah, ayahCount]);

    // Fetch tafsir for a specific ayah
    const fetchTafsir = async (verseKey) => {
        if (tafsirCache[verseKey]) return;
        setLoadingTafsir(verseKey);
        try {
            const res = await fetch(`${QURAN_API}/tafsirs/${TAFSIR_RESOURCE_ID}/by_ayah/${verseKey}`);
            const data = await res.json();
            const rawText = data?.tafsir?.text || '';
            const cleanText = rawText.replace(/<[^>]*>/g, '');
            setTafsirCache(prev => ({ ...prev, [verseKey]: cleanText }));
        } catch (err) {
            console.error('Error fetching tafsir:', err);
            setTafsirCache(prev => ({ ...prev, [verseKey]: 'تعذر تحميل التفسير.' }));
        } finally {
            setLoadingTafsir(null);
        }
    };

    // Hover handlers
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

    // Click handler - show full tafsir
    const handleAyahClick = (verseKey) => {
        if (selectedAyahForTafsir === verseKey) {
            setSelectedAyahForTafsir(null);
        } else {
            setSelectedAyahForTafsir(verseKey);
            fetchTafsir(verseKey);
        }
    };

    // Click outside dropdown
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
        <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 max-w-5xl mx-auto w-full" dir="rtl">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 px-5 py-3.5 mb-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-3 relative z-[100]"
            >
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Surah Selector */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowSurahDropdown(!showSurahDropdown)}
                            className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold text-[#1B5E3B] shadow-sm border border-[#1B5E3B]/10 hover:border-[#1B5E3B]/30 transition-all"
                        >
                            <BookOpen size={14} />
                            {currentSurah?.name_arabic || 'اختر السورة'}
                            <ChevronDown size={14} className={`transition-transform ${showSurahDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showSurahDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    className="absolute top-full mt-2 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden"
                                >
                                    <div className="p-3 border-b border-gray-100">
                                        <div className="relative">
                                            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="ابحث عن سورة..."
                                                value={surahSearch}
                                                onChange={e => setSurahSearch(e.target.value)}
                                                className="w-full pr-9 pl-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-[#1B5E3B] text-right"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {filteredSurahs.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => { setSelectedSura(s.id); setFromAyah(1); setToAyah(null); setShowSurahDropdown(false); setSurahSearch(''); }}
                                                className={`w-full px-4 py-2.5 text-right text-sm hover:bg-[#1B5E3B]/5 transition-colors flex items-center justify-between ${s.id === selectedSura ? 'bg-[#1B5E3B]/10 text-[#1B5E3B] font-bold' : 'text-gray-700'}`}
                                            >
                                                <span className="text-xs text-gray-400">{s.id}</span>
                                                <span className="font-amiri text-base">{s.name_arabic}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Range Selectors */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">من:</span>
                        <input
                            type="number" min={1} max={ayahCount}
                            className="bg-white/80 px-2 py-1.5 rounded-lg text-sm font-bold text-[#1B5E3B] shadow-sm border border-[#1B5E3B]/10 outline-none text-center w-16"
                            value={fromAyah}
                            onChange={e => setFromAyah(Math.max(1, Math.min(ayahCount, Number(e.target.value))))}
                        />
                        <span className="text-xs font-bold text-gray-500">إلى:</span>
                        <input
                            type="number" min={1} max={ayahCount}
                            className="bg-white/80 px-2 py-1.5 rounded-lg text-sm font-bold text-[#1B5E3B] shadow-sm border border-[#1B5E3B]/10 outline-none text-center w-16"
                            value={toAyah || ayahCount}
                            onChange={e => setToAyah(Math.max(1, Math.min(ayahCount, Number(e.target.value))))}
                        />
                    </div>
                </div>

                {/* Title */}
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <h2 className="text-lg font-bold text-[#1B5E3B] font-amiri leading-none mb-0.5">القرآن الكريم مفسّر</h2>
                        <p className="text-[10px] text-emerald-800/60 font-bold tracking-widest uppercase">Interpreted Quran</p>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#B8923E] to-[#8B6D2E] flex items-center justify-center text-white shadow-md">
                        <BookMarked size={18} />
                    </div>
                </div>
            </motion.div>

            {/* Surah Title Banner */}
            {currentSurah && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mb-6"
                >
                    <div className="inline-flex flex-col items-center gap-1">
                        <div className="flex items-center gap-3">
                            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#B8923E]/40"></div>
                            <h2 className="text-2xl font-amiri font-bold text-[#1B5E3B]">
                                سورة {currentSurah.name_arabic}
                            </h2>
                            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#B8923E]/40"></div>
                        </div>
                        <span className="text-xs text-gray-500 font-bold">
                            {currentSurah.revelation_place === 'makkah' ? 'مكية' : 'مدنية'} — {currentSurah.verses_count} آية
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Quran Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/40 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-10 shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#B8923E]/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1B5E3B]/5 rounded-full -ml-32 -mb-32 blur-3xl opacity-50"></div>

                <div className="relative z-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 size={32} className="text-[#B8923E] animate-spin" />
                            <p className="text-gray-500 text-sm font-bold">جاري تحميل الآيات...</p>
                        </div>
                    ) : (
                        <div className="text-center" style={{ lineHeight: '6.5' }}>
                            {/* Bismillah (except for Surah 9) */}
                            {selectedSura !== 9 && fromAyah === 1 && (
                                <p className="font-amiri text-2xl text-[#B8923E] mb-6 font-bold">
                                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                                </p>
                            )}

                            {/* Verses */}
                            <div className="font-amiri text-2xl md:text-3xl text-[#1B5E3B]">
                                {verses.map((verse) => {
                                    const vKey = verse.verse_key;
                                    const isHovered = hoveredAyah === vKey;
                                    const isSelected = selectedAyahForTafsir === vKey;

                                    return (
                                        <span key={vKey} className="relative inline">
                                            <span
                                                className={`cursor-pointer transition-all duration-300 rounded-lg px-1 relative
                                                    ${isSelected ? 'bg-[#B8923E]/15 text-[#1B5E3B]' : ''}
                                                    ${isHovered && !isSelected ? 'bg-[#1B5E3B]/5' : ''}
                                                    hover:bg-[#1B5E3B]/5
                                                `}
                                                onMouseEnter={() => handleMouseEnter(vKey)}
                                                onMouseLeave={handleMouseLeave}
                                                onClick={() => handleAyahClick(vKey)}
                                            >
                                                {verse.text_uthmani}
                                            </span>
                                            {' '}
                                            <span className="text-[#B8923E] font-bold text-lg select-none">
                                                ﴿{toArabicNum(verse.verse_number)}﴾
                                            </span>
                                            {' '}

                                            {/* Hover Tooltip */}
                                            <AnimatePresence>
                                                {isHovered && !isSelected && tafsirCache[vKey] && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 8 }}
                                                        className="absolute z-[9999] bottom-full right-0 mb-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#B8923E]/20 p-4 text-right pointer-events-none"
                                                        style={{ direction: 'rtl' }}
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <BookMarked size={12} className="text-[#B8923E]" />
                                                            <span className="text-xs font-bold text-[#B8923E]">التفسير الميسّر</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed font-arabic line-clamp-4">
                                                            {tafsirCache[vKey].substring(0, 200)}...
                                                        </p>
                                                        <p className="text-[10px] text-[#1B5E3B] mt-2 font-bold">اضغط لعرض التفسير كاملاً</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Full Tafsir Panel (on click) */}
                                            <AnimatePresence>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="block w-full text-right my-4 overflow-hidden"
                                                    >
                                                        <div className="bg-gradient-to-br from-[#1B5E3B]/[0.03] to-[#B8923E]/[0.05] rounded-2xl border border-[#B8923E]/20 p-5 shadow-inner">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedAyahForTafsir(null); }}
                                                                    className="w-6 h-6 rounded-full bg-gray-200/80 flex items-center justify-center hover:bg-gray-300 transition-colors"
                                                                >
                                                                    <X size={12} className="text-gray-500" />
                                                                </button>
                                                                <div className="flex items-center gap-2">
                                                                    <BookMarked size={14} className="text-[#B8923E]" />
                                                                    <span className="text-sm font-bold text-[#1B5E3B]">
                                                                        تفسير الآية {toArabicNum(verse.verse_number)} — التفسير الميسّر
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {loadingTafsir === vKey ? (
                                                                <div className="flex items-center justify-center py-6 gap-2">
                                                                    <Loader2 size={16} className="text-[#B8923E] animate-spin" />
                                                                    <span className="text-sm text-gray-500">جاري التحميل...</span>
                                                                </div>
                                                            ) : (
                                                                <p className="text-base text-gray-700 leading-[2.2] whitespace-pre-wrap font-arabic">
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
                </div>
            </motion.div>
        </div>
    );
}
