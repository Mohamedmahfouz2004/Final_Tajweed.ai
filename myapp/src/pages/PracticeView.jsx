import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Mic, ArrowRight, ChevronRight, BookOpen } from 'lucide-react';
import { staggerContainer, fadeInUp } from '../utils/animations';
import PracticeListenCard from '../components/PracticeListenCard';
import PracticeRecordCard from '../components/PracticeRecordCard';
import useAppStore from '../store/useAppStore';

const PracticeView = ({ handleRecording }) => {
    const { isLoggedIn, openAuthModal } = useAppStore();
    const [viewState, setViewState] = useState('selection'); // 'selection' | 'practice'
    const [activeTab, setActiveTab] = useState('record'); // 'listen' | 'record'

    const handleSelection = (mode) => {
        setActiveTab(mode);
        setViewState('practice');
    };

    const handleBack = () => {
        setViewState('selection');
    };

    return (
        <div className="min-h-[calc(100vh-140px)] p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col">
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
                        <motion.div variants={fadeInUp} className="text-center mb-16 max-w-2xl">
                            <h1 className="text-4xl md:text-5xl font-bold font-amiri text-primary mb-6 leading-tight">
                                مرحبًا بك في مساحة التدريب
                            </h1>
                            <p className="text-xl text-gray-600 leading-relaxed">
                                يمكنك البدء بالاستماع إلى التلاوة الصحيحة من كبار القراء للتعلم، أو الانتقال مباشرة لتسجيل تلاوتك واختبار نفسك والحصول على تقييم فوري.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl px-4">
                            {/* Listen Option */}
                            <motion.div
                                variants={fadeInUp}
                                onClick={() => handleSelection('listen')}
                                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-white hover:border-secondary shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-32 bg-secondary/5 rounded-full -mr-16 -mt-16 group-hover:bg-secondary/10 transition-colors"></div>

                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-24 h-24 rounded-2xl bg-secondary/10 text-secondary mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Play size={40} className="ml-1 fill-current" />
                                    </div>
                                    <h3 className="text-3xl font-bold font-amiri text-primary mb-4 group-hover:text-secondary-dark transition-colors">
                                        استمع للتلاوة
                                    </h3>
                                    <p className="text-gray-600 mb-8 leading-relaxed">
                                        استمع لتلاوة الآيات بصوت مشاهير القراء، مع إمكانية تكرار الآيات والتركيز على مخارج الحروف الصحيحة.
                                    </p>
                                    <span className="inline-flex items-center gap-2 text-secondary font-bold text-lg group-hover:gap-3 transition-all">
                                        ابدأ الاستماع <ArrowRight size={20} className="rotate-180" />
                                    </span>
                                </div>
                            </motion.div>

                            {/* Record Option */}
                            <motion.div
                                variants={fadeInUp}
                                onClick={() => handleSelection('record')}
                                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-white hover:border-primary shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>

                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-24 h-24 rounded-2xl bg-primary/10 text-primary mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Mic size={40} />
                                    </div>
                                    <h3 className="text-3xl font-bold font-amiri text-primary mb-4 group-hover:text-primary-dark transition-colors">
                                        سجّل تلاوتك
                                    </h3>
                                    <p className="text-gray-600 mb-8 leading-relaxed">
                                        قم بتسجيل تلاوتك وسيقوم الذكاء الاصطناعي بتحليلها فوراً لاكتشاف أحكام التجويد والأخطاء وتصحيحها.
                                    </p>
                                    <span className="inline-flex items-center gap-2 text-primary font-bold text-lg group-hover:gap-3 transition-all">
                                        ابدأ التسجيل <ArrowRight size={20} className="rotate-180" />
                                    </span>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="practice"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col gap-6 h-full"
                    >
                        {/* Header with Back Button and Tabs */}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 h-auto shrink-0 mb-4">
                            {/* Back Button */}
                            <button
                                onClick={handleBack}
                                className="p-4 rounded-2xl bg-white border-2 border-[#D4AF37]/50 shadow-md hover:shadow-xl text-[#044D29] transition-all hover:scale-105 active:scale-95 group"
                                aria-label="Back"
                            >
                                <ChevronRight size={28} strokeWidth={3} className="transform group-hover:-translate-x-1 transition-transform" />
                            </button>

                            <div className="flex-1 flex gap-4 w-full md:w-auto h-20 md:h-24">
                                <button
                                    onClick={() => setActiveTab('listen')}
                                    className={`flex-1 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-lg md:text-2xl font-bold font-amiri transition-all duration-300 border-2
                                        ${activeTab === 'listen'
                                            ? 'bg-white text-secondary-dark border-secondary shadow-xl scale-100 ring-2 ring-secondary/20'
                                            : 'bg-gradient-to-br from-secondary to-secondary-dark text-white border-transparent hover:shadow-lg scale-95 opacity-90 hover:opacity-100 hover:scale-[0.97]'
                                        }
                                    `}
                                >
                                    <div className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full shrink-0 ${activeTab === 'listen' ? 'bg-secondary/10 text-secondary-dark' : 'bg-white/20 text-white'}`}>
                                        <Play size={20} className={`md:w-6 md:h-6 ${activeTab === 'listen' ? 'fill-current' : ''}`} />
                                    </div>
                                    <span>استمع للتلاوة</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('record')}
                                    className={`flex-1 rounded-2xl flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-lg md:text-2xl font-bold font-amiri transition-all duration-300 border-2
                                        ${activeTab === 'record'
                                            ? 'bg-white text-primary border-primary shadow-xl scale-100 ring-2 ring-primary/20'
                                            : 'bg-gradient-to-br from-primary to-primary-dark text-white border-transparent hover:shadow-lg scale-95 opacity-90 hover:opacity-100 hover:scale-[0.97]'
                                        }
                                    `}
                                >
                                    <div className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full shrink-0 ${activeTab === 'record' ? 'bg-primary/10 text-primary' : 'bg-white/20 text-white'}`}>
                                        <Mic size={20} className="md:w-6 md:h-6" />
                                    </div>
                                    <span>سجّل تلاوتك</span>
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 relative rounded-3xl shadow-sm min-h-[500px]">
                            <AnimatePresence mode="wait">
                                {activeTab === 'listen' && (
                                    <motion.div
                                        key="listen"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <PracticeListenCard isActive={true} onClick={() => { }} />
                                    </motion.div>
                                )}

                                {activeTab === 'record' && (
                                    <motion.div
                                        key="record"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {!isLoggedIn && (
                                            <div className="mb-6 bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-teal-100 p-2 rounded-full text-teal-600">
                                                        <BookOpen size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-teal-800 text-sm">سجل دخولك لتتمكن من التسميع</h3>
                                                        <p className="text-xs text-teal-600">يجب عليك تسجيل الدخول لتسجيل تلاوتك وحفظ تقدمك.</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={openAuthModal}
                                                    className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg font-bold hover:bg-teal-700 transition"
                                                >
                                                    تسجيل الدخول
                                                </button>
                                            </div>
                                        )}
                                        <PracticeRecordCard
                                            isActive={true}
                                            onClick={() => { }}
                                            handleRecording={handleRecording}
                                        />
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
