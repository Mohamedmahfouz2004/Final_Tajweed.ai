import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Mic, ArrowRight, BookOpen } from 'lucide-react';
import { staggerContainer, fadeInUp } from '../utils/animations';
import PracticeListenCard from '../components/PracticeListenCard';
import PracticeRecordCard from '../components/PracticeRecordCard';
import MoshafSettings from '../components/MoshafSettings';
import useAppStore from '../store/useAppStore';
import { Settings } from 'lucide-react';

const PracticeView = ({ handleRecording }) => {
    const { isLoggedIn, openAuthModal } = useAppStore();
    const [viewState, setViewState] = useState('selection'); // 'selection' | 'practice'
    const [activeTab, setActiveTab] = useState('record'); // 'listen' | 'record'

    const handleSelection = (mode) => {
        setActiveTab(mode);
        setViewState('practice');
    };

    return (
        <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col relative">
            <AnimatePresence mode="wait">
                {viewState === 'selection' ? (
                    <motion.div
                        key="selection"
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center justify-center flex-1 py-10"
                    >
                        <motion.div variants={fadeInUp} className="text-center mb-10 max-w-xl">
                            <h1 className="text-2xl md:text-3xl font-bold font-amiri text-[#1B5E3B] mb-3 leading-tight">
                                مرحبًا بك في مساحة التدريب
                            </h1>
                            <p className="text-base text-[#6B5D4F] leading-relaxed">
                                استمع للتلاوة الصحيحة من كبار القراء، أو سجّل تلاوتك واحصل على تقييم فوري بالذكاء الاصطناعي.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl px-4">
                            {/* Listen Option */}
                            <motion.div
                                variants={fadeInUp}
                                onClick={() => handleSelection('listen')}
                                className="group relative rounded-2xl p-8 shadow-md transition-all duration-500 cursor-pointer overflow-hidden hover:-translate-y-1"
                                style={{ background: '#FFF9F0', border: '1px solid rgba(184,146,62,0.15)' }}
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#B8923E]/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-[#B8923E]/20 transition-colors"></div>
                                <div className="relative z-10 flex flex-col items-center text-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#B8923E] to-[#8B6D2E] text-white flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform duration-300">
                                        <Play size={32} className="ml-1 fill-current" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold font-amiri text-[#2C1810] mb-3">
                                            استمع للتلاوة
                                        </h3>
                                        <p className="text-sm text-[#6B5D4F] leading-relaxed mb-5">
                                            استمع لتلاوة الآيات بصوت مشاهير القراء، مع إمكانية تكرار الآيات.
                                        </p>
                                        <span className="inline-flex items-center gap-2 text-[#B8923E] font-bold text-sm group-hover:gap-3 transition-all">
                                            ابدأ الاستماع <ArrowRight size={16} className="rotate-180" />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Record Option */}
                            <motion.div
                                variants={fadeInUp}
                                onClick={() => handleSelection('record')}
                                className="group relative rounded-2xl p-8 shadow-md transition-all duration-500 cursor-pointer overflow-hidden hover:-translate-y-1"
                                style={{ background: '#FFF9F0', border: '1px solid rgba(27,94,59,0.15)' }}
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[#1B5E3B]/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-[#1B5E3B]/20 transition-colors"></div>
                                <div className="relative z-10 flex flex-col items-center text-center gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1B5E3B] to-[#2D8A56] text-white flex items-center justify-center shadow-lg group-hover:-rotate-6 transition-transform duration-300">
                                        <Mic size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold font-amiri text-[#2C1810] mb-3">
                                            سجّل تلاوتك
                                        </h3>
                                        <p className="text-sm text-[#6B5D4F] leading-relaxed mb-5">
                                            سجّل تلاوتك وسيقوم محرك Muaalem بتحليلها فوراً مع اكتشاف أخطاء التجويد.
                                        </p>
                                        <span className="inline-flex items-center gap-2 text-[#1B5E3B] font-bold text-sm group-hover:gap-3 transition-all">
                                            ابدأ التسجيل <ArrowRight size={16} className="rotate-180" />
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="practice"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col h-full"
                    >
                        {/* Tab Switcher */}
                        <div className="flex justify-center mb-6">
                            <div className="flex p-1 rounded-xl shadow-md gap-0.5" style={{ background: '#FFF9F0', border: '1px solid rgba(184,146,62,0.15)' }}>
                                <button
                                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-bold text-xs transition-all duration-300 border-none cursor-pointer ${activeTab === 'listen' ? 'bg-gradient-to-r from-[#B8923E] to-[#8B6D2E] text-white shadow-md' : 'text-[#9C8E7C] hover:text-[#8B6D2E]'}`}
                                    onClick={() => setActiveTab('listen')}
                                >
                                    <Play size={14} className={activeTab === 'listen' ? 'fill-current' : ''} /> استمع
                                </button>
                                <button
                                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-bold text-xs transition-all duration-300 border-none cursor-pointer ${activeTab === 'record' ? 'bg-gradient-to-r from-[#1B5E3B] to-[#2D8A56] text-white shadow-md' : 'text-[#9C8E7C] hover:text-[#1B5E3B]'}`}
                                    onClick={() => setActiveTab('record')}
                                >
                                    <Mic size={14} /> سجّل
                                </button>
                                <button
                                    className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-bold text-xs transition-all duration-300 border-none cursor-pointer ${activeTab === 'settings' ? 'bg-gradient-to-r from-[#044D29] to-[#044D29] text-white shadow-md' : 'text-[#9C8E7C] hover:text-[#044D29]'}`}
                                    onClick={() => setActiveTab('settings')}
                                >
                                    <Settings size={14} className={activeTab === 'settings' ? 'text-white' : ''} /> الإعدادات
                                </button>
                                <button
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs text-[#9C8E7C] hover:text-[#2C1810] transition-all border-none cursor-pointer"
                                    onClick={() => setViewState('selection')}
                                >
                                    <ArrowRight size={14} /> رجوع
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 relative min-h-[400px]">
                            <AnimatePresence mode="wait">
                                {activeTab === 'listen' && (
                                    <motion.div key="listen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                        <PracticeListenCard isActive={true} onClick={() => {}} activeViewTab={activeTab} setActiveViewTab={setActiveTab} />
                                    </motion.div>
                                )}

                                {activeTab === 'record' && (
                                    <motion.div key="record" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
                                        {!isLoggedIn ? (
                                            <div className="flex-1 flex items-center justify-center min-h-[40vh] py-8">
                                                <div className="rounded-2xl p-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto shadow-md" style={{ background: '#FFF9F0', border: '1px solid rgba(184,146,62,0.15)' }}>
                                                    <div className="w-16 h-16 bg-gradient-to-br from-[#B8923E] to-[#8B6D2E] rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                                        <BookOpen size={32} className="text-white" />
                                                    </div>
                                                    <h2 className="text-xl font-bold text-[#2C1810] font-amiri mb-3">سجل دخولك لتتمكن من التسميع</h2>
                                                    <p className="text-sm text-[#6B5D4F] mb-6 leading-relaxed max-w-sm">
                                                        انضم إلينا لتسجيل تلاوتك واكتشاف أحكام التجويد وحفظ تقدمك.
                                                    </p>
                                                    <button
                                                        onClick={openAuthModal}
                                                        className="px-10 py-3 text-sm rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 w-full max-w-xs border-none cursor-pointer text-white"
                                                        style={{ background: 'linear-gradient(135deg, #1B5E3B, #2D8A56)' }}
                                                    >
                                                        ابدأ الآن مجاناً
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <PracticeRecordCard />
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'settings' && (
                                    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
                                        <MoshafSettings />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PracticeView;
