import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, ChevronDown, Square, Activity, BookOpen, BarChart3, CheckCircle } from 'lucide-react';
import SifatBadge from './SifatBadge';
import useAppStore from '../store/useAppStore';

const PracticeRecordCard = ({ isActive, onClick, handleRecording }) => {
    // Store
    const surahs = useAppStore(s => s.surahs);
    const selectedSurah = useAppStore(s => s.selectedSurah);
    const setSelectedSurah = useAppStore(s => s.setSelectedSurah);
    const fromVerse = useAppStore(s => s.fromVerse);
    const setFromVerse = useAppStore(s => s.setFromVerse);
    const isRecording = useAppStore(s => s.isRecording);
    const mistakes = useAppStore(s => s.mistakes);
    const analysisTable = useAppStore(s => s.analysisTable);
    const liveTranscription = useAppStore(s => s.liveTranscription);
    const phonemeDiffs = useAppStore(s => s.phonemeDiffs);

    // Local State
    const [showSurahList, setShowSurahList] = useState(false);
    const [surahSearch, setSurahSearch] = useState('');
    const [startWord, setStartWord] = useState(0);
    const [numWords, setNumWords] = useState(10);
    const [uthmaniText, setUthmaniText] = useState('');
    const [loadingText, setLoadingText] = useState(false);
    const [textError, setTextError] = useState('');

    const surahRef = useRef(null);

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event) {
            if (surahRef.current && !surahRef.current.contains(event.target)) {
                setShowSurahList(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, []);

    const toggleSurahList = (e) => {
        e.stopPropagation();
        setShowSurahList(!showSurahList);
    };

    // Fetch Uthmani Text
    useEffect(() => {
        const fetchUthmani = async () => {
            if (!selectedSurah || !fromVerse) return;
            setLoadingText(true);
            setTextError('');
            try {
                const formData = new FormData();
                formData.append('sura_idx', selectedSurah.toString());
                formData.append('aya_idx', fromVerse.toString());
                formData.append('start_word_idx', startWord.toString());
                formData.append('num_words', numWords.toString());

                const res = await fetch('http://127.0.0.1:8000/uthmani_script', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    setUthmaniText(data.text);
                } else {
                    const err = await res.json();
                    setTextError(err.detail || 'خطأ في جلب النص');
                }
            } catch (e) {
                // Silent error or retry logic could go here
                // setTextError('تأكد من تشغيل الخادم');
            } finally {
                setLoadingText(false);
            }
        };

        const timeoutId = setTimeout(fetchUthmani, 500);
        return () => clearTimeout(timeoutId);
    }, [selectedSurah, fromVerse, startWord, numWords]);

    return (
        <motion.div
            layout
            onClick={onClick}
            className={`glass-panel overflow-hidden cursor-pointer relative transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] flex flex-col ${isActive ? 'flex-[10]' : 'flex-[1]'}`}
            style={{
                background: isActive ? '#FDFCF5' : 'linear-gradient(135deg, #044D29 0%, #065F46 100%)',
                backgroundImage: isActive ? 'radial-gradient(#044D29 0.5px, transparent 0.5px), radial-gradient(#044D29 0.5px, #FDFCF5 0.5px)' : 'linear-gradient(135deg, #044D29 0%, #065F46 100%)',
                backgroundSize: isActive ? '20px 20px' : 'auto',
                backgroundPosition: '0 0, 10px 10px',
                // Removed double border as requested
                color: isActive ? 'inherit' : 'white',
                zIndex: isActive ? 10 : 1
            }}
        >
            {/* Header */}
            <div className={`p-6 flex items-center justify-between flex-shrink-0 ${isActive ? 'bg-white/60 shadow-md backdrop-blur-sm z-10 relative' : ''}`}>
                <h2 className={`text-2xl font-bold font-amiri flex items-center gap-3 ${isActive ? 'text-primary' : 'text-white'}`}>
                    <Mic size={28} className={isActive ? 'text-secondary' : 'text-white'} />
                    سجّل تلاوتك
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
                        {/* Input Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                            <div className="form-group" ref={surahRef}>
                                <label className="block mb-2 font-bold text-primary">السورة</label>
                                <div className="relative">
                                    <button onClick={toggleSurahList} className="w-full p-3 bg-white border border-[#044D29]/40 rounded-lg text-right flex justify-between items-center transition-all hover:border-secondary shadow-md hover:shadow-lg">
                                        {selectedSurah ? surahs.find(s => s.id === selectedSurah)?.name_arabic : 'اختر السورة'} <ChevronDown size={16} className="text-[#044D29]" />
                                    </button>
                                    {showSurahList && (
                                        <div className="absolute top-full w-full bg-white border border-[#044D29]/30 rounded-lg mt-1 max-h-[300px] overflow-y-auto z-20 shadow-xl">
                                            <div className="p-2 border-b border-[#044D29]/10"> <input type="text" placeholder="بحث..." value={surahSearch} onChange={(e) => setSurahSearch(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full p-2 rounded border border-[#044D29]/20 text-right focus:border-secondary outline-none bg-white" /> </div>
                                            {surahs.length > 0 ? surahs.filter(s => s.name_arabic.includes(surahSearch)).map(s => (<div key={s.id} onClick={() => { setSelectedSurah(s.id); setShowSurahList(false); setSurahSearch(''); }} className="p-3 cursor-pointer border-b border-[#044D29]/10 hover:bg-[#FDFCF5] transition-colors text-primary"> {s.name_arabic} </div>)) : <div className="p-3 text-gray-400">جاري تحميل...</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 font-bold text-primary">الآية</label>
                                <input type="number" value={fromVerse} min="1" max={selectedSurah ? surahs.find(s => s.id === selectedSurah)?.verses_count : 286} className="w-full p-3 bg-white border border-[#044D29]/40 rounded-lg focus:border-secondary outline-none transition-all shadow-md hover:shadow-lg text-primary font-bold" onChange={(e) => setFromVerse(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 font-bold text-primary">من الكلمة</label>
                                <input type="number" value={startWord} min="0" placeholder="0" className="w-full p-3 bg-white border border-[#044D29]/40 rounded-lg focus:border-secondary outline-none transition-all shadow-md hover:shadow-lg text-primary font-bold" onChange={(e) => setStartWord(parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="form-group">
                                <label className="block mb-2 font-bold text-primary">عدد الكلمات</label>
                                <input type="number" value={numWords} min="1" placeholder="4" className="w-full p-3 bg-white border border-[#044D29]/40 rounded-lg focus:border-secondary outline-none transition-all shadow-md hover:shadow-lg text-primary font-bold" onChange={(e) => setNumWords(parseInt(e.target.value) || 1)} />
                            </div>
                        </div>

                        {/* Uthmani Text Display */}
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-12 text-center mb-8 relative min-h-[200px] flex items-center justify-center flex-col shadow-inner transition-all hover:bg-primary/10">
                            <div className="absolute top-4 left-4 opacity-10"> <BookOpen size={80} color="#044D29" /> </div>
                            {loadingText && <div className="text-gray-500 animate-pulse">جاري تحميل النص...</div>}
                            {textError && <div className="text-red-600 text-sm">{textError}</div>}
                            {!loadingText && !textError && uthmaniText && (
                                <motion.p key={uthmaniText} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-amiri text-5xl leading-loose text-primary rtl drop-shadow-sm flex flex-wrap justify-center items-center gap-2">
                                    {uthmaniText.replace(/[\d٠-٩]+\s*$/, '')}
                                    <span className="relative inline-flex items-center justify-center w-16 h-16 mx-2 align-middle">
                                        <span className="absolute text-[#D4AF37] text-6xl leading-none" style={{ marginTop: '-8px' }}>۝</span>
                                        <span className="relative z-10 text-2xl font-bold text-primary pt-1 font-amiri">
                                            {(fromVerse || 1).toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])}
                                        </span>
                                    </span>
                                </motion.p>
                            )}
                            {!loadingText && !textError && !uthmaniText && <span className="text-gray-500 text-lg">اختر السورة والآية لعرض النص</span>}
                        </motion.div>

                        {/* Recording Button */}
                        <div className="bg-gray-50 rounded-2xl p-8 mb-8 text-center border border-gray-200 shadow-sm">
                            <h3 className="text-primary mb-4 font-amiri text-xl">ابدأ التسجيل</h3>
                            <p className="text-gray-500 mb-8 text-sm">اضغط على الزر لبدء التسجيل، ثم اقرأ النص المعروض أعلاه</p>
                            <motion.button onClick={handleRecording} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} animate={isRecording ? { scale: [1, 1.08, 1], boxShadow: ['0 0 0 8px rgba(239, 68, 68, 0.3)', '0 0 0 16px rgba(239, 68, 68, 0.1)', '0 0 0 8px rgba(239, 68, 68, 0.3)'] } : {}} transition={isRecording ? { duration: 1.5, repeat: Infinity } : { type: 'spring', stiffness: 400 }} className={`w-24 h-24 rounded-full border-none text-white cursor-pointer flex items-center justify-center mx-auto ${isRecording ? 'bg-red-500' : 'bg-primary'}`} style={{ boxShadow: isRecording ? '0 0 0 8px rgba(239, 68, 68, 0.3)' : '0 10px 25px rgba(4, 77, 41, 0.4)' }}>
                                {isRecording ? <Square size={40} /> : <Mic size={40} />}
                            </motion.button>
                            <p className={`mt-6 ${isRecording ? 'text-red-500 font-bold' : 'text-gray-500'}`}>{isRecording ? 'جاري التسجيل... اضغط لإيقاف' : 'اضغط للتسجيل'}</p>

                            {isRecording && (
                                <div className="mt-8 p-6 rounded-xl border border-secondary bg-primary/5">
                                    <div className="flex items-center justify-center gap-2 mb-3"><Activity size={18} className="text-secondary" /><span className="text-secondary font-bold">التفريغ المباشر</span><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span></div>
                                    {liveTranscription ? <p className="font-amiri text-2xl text-primary leading-loose m-0">{typeof liveTranscription === 'string' ? liveTranscription : liveTranscription.text || (liveTranscription.segments ? liveTranscription.segments.map(seg => seg.text).join(' ') : '')}</p> : <p className="text-gray-400 text-sm">في انتظار صوتك...</p>}
                                </div>
                            )}
                        </div>

                        {/* Analysis Results */}
                        {(mistakes.length > 0 || analysisTable.length > 0 || phonemeDiffs.length > 0) && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 border-t border-gray-200 pt-8">
                                <h3 className="text-primary flex items-center gap-2 mb-6 font-amiri text-2xl"><Activity size={24} /> نتائج التحليل</h3>
                                {phonemeDiffs.length > 0 && (
                                    <div className="bg-white p-6 rounded-xl mb-4 border border-gray-200 shadow-sm">
                                        <h4 className="text-primary mb-4 flex items-center gap-2 font-bold"><BookOpen size={18} /> مقارنة الفونيمات</h4>
                                        <div className="font-mono text-base ltr bg-gray-50 p-4 rounded-lg overflow-x-auto border border-gray-200">
                                            {phonemeDiffs.map((diff, i) => { const [op, text] = diff; return (<span key={i} style={{ color: op === 0 ? '#374151' : op === 1 ? '#059669' : '#DC2626', background: op === 0 ? 'transparent' : op === 1 ? '#D1FAE5' : '#FEE2E2', padding: op !== 0 ? '2px 4px' : '0', borderRadius: '4px', textDecoration: op === -1 ? 'line-through' : 'none', marginRight: '2px' }}>{text}</span>); })}
                                        </div>
                                    </div>
                                )}
                                {analysisTable.length > 0 && (
                                    <div className="bg-white rounded-xl mb-4 border border-gray-200 overflow-hidden shadow-sm">
                                        <h4 className="bg-primary text-white p-4 m-0 flex items-center gap-2"><BarChart3 size={18} /> جدول تحليل صفات الحروف</h4>
                                        <div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><thead><tr className="bg-gray-100">{['الفونيم', 'الهمس/الجهر', 'الشدة/الرخاوة', 'التفخيم/الترقيق', 'الإطباق', 'الصفير', 'القلقلة', 'التكرار', 'التفشي', 'الاستطالة', 'الغنة'].map(h => (<th key={h} className="p-3 text-center border-b border-gray-200 whitespace-nowrap font-bold text-gray-700">{h}</th>))}</tr></thead><tbody>{analysisTable.map((row, idx) => (<tr key={idx} className="border-b border-gray-100 hover:bg-gray-50"><td className="p-3 font-mono text-primary font-bold border-l border-gray-100">{row.phonemes}</td><td className="p-2 text-center"><SifatBadge expected={row.exp_hams_or_jahr} actual={row.hams_or_jahr} /></td><td className="p-2 text-center"><SifatBadge expected={row.exp_shidda_or_rakhawa} actual={row.shidda_or_rakhawa} /></td><td className="p-2 text-center"><SifatBadge expected={row.exp_tafkheem_or_taqeeq} actual={row.tafkheem_or_taqeeq} /></td><td className="p-2 text-center"><SifatBadge expected={row.exp_itbaq} actual={row.itbaq} /></td><td className="p-2 text-center"><SifatBadge expected={row.exp_safeer} actual={row.safeer} /></td><td className="p-2 text-center"><SifatBadge expected={row.exp_qalqla} actual={row.qalqla} /></td><td className="p-2 text-center"><SifatBadge expected={row.exp_tikraar} actual={row.tikraar} /></td><td className="p-2 text-center"><SifatBadge expected={row.exp_tafashie} actual={row.tafashie} /></td><td className="p-2 text-center"><SifatBadge expected={row.exp_istitala} actual={row.istitala} /></td><td className="p-2 text-center"><SifatBadge expected={row.exp_ghonna} actual={row.ghonna} /></td></tr>))}</tbody></table></div>
                                    </div>
                                )}
                                {mistakes.find(m => m.type === 'مقارنة الفونيمات') && phonemeDiffs.length === 0 && (
                                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 rounded-xl mb-4 border border-emerald-500 shadow-sm">
                                        <h4 className="text-emerald-800 mb-3 flex items-center gap-2 font-bold"><CheckCircle size={18} /> مقارنة الفونيمات</h4>
                                        <pre className="font-mono text-sm whitespace-pre-wrap text-emerald-700 ltr bg-white p-4 rounded-lg border border-emerald-200">{mistakes.find(m => m.type === 'مقارنة الفونيمات')?.correction}</pre>
                                    </div>
                                )}
                                {mistakes.filter(m => m.type !== 'مقارنة الفونيمات').map((m, i) => (
                                    <div key={i} className="p-4 rounded-lg mb-3 border-r-4 shadow-sm bg-white border border-gray-100" style={{ borderRightColor: m.type.includes('صفة') ? '#F59E0B' : '#10B981' }}>
                                        <strong style={{ color: m.type.includes('صفة') ? '#92400E' : '#065F46' }}>{m.type}:</strong> <span className={`mr-2 text-gray-700 ${m.type === 'النص المفهوم' ? 'font-amiri' : ''}`}>{m.correction}</span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default PracticeRecordCard;
