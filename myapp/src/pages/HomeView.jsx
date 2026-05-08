import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, BookOpen, Mic } from 'lucide-react';
import { staggerContainer, fadeInUp } from '../utils/animations';
import useAppStore from '../store/useAppStore';

const HomeView = () => {
    const navigate = useNavigate();
    const openMistakesModal = useAppStore(s => s.openMistakesModal);
    const userProgress = useAppStore(s => s.userProgress);
    const fetchUserProgress = useAppStore(s => s.fetchUserProgress);

    React.useEffect(() => {
        fetchUserProgress();
    }, []);

    const totalMistakes = userProgress.totalMistakes || 0;
    const avgAccuracy = userProgress.averageAccuracy || 0;
    const versesPracticed = userProgress.versesPracticed || 0;

    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
            <motion.div variants={fadeInUp} className="hero-card">
                <div className="hero-ornament">قرآن</div>
                <div className="hero-content">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="text-5xl mb-4"
                    >
                        ابدأ رحلة إتقان التلاوة
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.9 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-xl mb-8"
                    >
                        منظومة ذكية تساعدك على تصحيح تلاوتك باستخدام الذكاء الاصطناعي.
                    </motion.p>
                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 15px 30px rgba(212, 175, 55, 0.4)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/practice')}
                        className="px-10 py-4 bg-secondary text-primary border-none rounded-full text-lg font-bold cursor-pointer shadow-lg"
                    >
                        ابدأ التلاوة الآن
                    </motion.button>
                </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center my-10">
                <h2 className="font-amiri text-6xl text-primary relative inline-block" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <span className="text-7xl text-secondary align-middle ml-2.5">﴿</span>
                    وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
                    <span className="text-7xl text-secondary align-middle mr-2.5">﴾</span>
                </h2>
            </motion.div>

            <div className="grid grid-cols-2 gap-6">
                {/* Mistakes Card */}
                <motion.div
                    variants={fadeInUp}
                    whileHover={{ y: -8, borderColor: '#D4AF37', boxShadow: '0 15px 30px rgba(0, 0, 0, 0.12)' }}
                    className="stat-box cursor-pointer min-h-[180px]"
                    onClick={openMistakesModal}
                    style={{ background: 'linear-gradient(to right, #ffffff, #fdfcf5)' }}
                >
                    <div className="flex items-center justify-between w-full mb-2.5">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-50 p-3 rounded-full"> <AlertTriangle size={32} color="#DC2626" /> </div>
                            <div className="text-right"> <h3 className="text-[22px] text-primary m-0">تحليل الأخطاء</h3> <p className="text-gray-500 m-0">اضغط لعرض التفاصيل</p> </div>
                        </div>
                        <div className="text-center px-5">
                            <div className={`text-5xl font-bold leading-none ${totalMistakes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {totalMistakes}
                            </div>
                            <span className="text-sm text-gray-500">خطأ مسجل</span>
                        </div>
                    </div>
                </motion.div>

                {/* Accuracy Card */}
                <motion.div
                    variants={fadeInUp}
                    whileHover={{ y: -8, borderColor: '#D4AF37', boxShadow: '0 15px 30px rgba(0, 0, 0, 0.12)' }}
                    className="stat-box min-h-[180px] flex flex-col justify-center"
                >
                    <TrendingUp size={32} color="#044D29" className="mb-4" />
                    <div className="stat-value-big">{avgAccuracy}%</div>
                    <div className="text-gray-500">متوسط دقة التلاوة</div>
                </motion.div>

                {/* Verses Practiced Card */}
                <motion.div
                    variants={fadeInUp}
                    whileHover={{ y: -8, borderColor: '#D4AF37', boxShadow: '0 15px 30px rgba(0, 0, 0, 0.12)' }}
                    className="stat-box min-h-[180px] flex flex-col justify-center cursor-pointer"
                    onClick={() => navigate('/progress')}
                >
                    <BookOpen size={32} color="#044D29" className="mb-4" />
                    <div className="stat-value-big">{versesPracticed}</div>
                    <div className="text-gray-500">آيات تم التدرب عليها</div>
                </motion.div>

                {/* Quick Practice Card */}
                <motion.div
                    variants={fadeInUp}
                    whileHover={{ y: -8, borderColor: '#1B5E3B', boxShadow: '0 15px 30px rgba(27,94,59,0.15)' }}
                    className="stat-box min-h-[180px] flex flex-col justify-center cursor-pointer"
                    onClick={() => navigate('/practice')}
                    style={{ background: 'linear-gradient(135deg, #f0fdf4, #FFF9F0)' }}
                >
                    <Mic size={32} color="#1B5E3B" className="mb-4" />
                    <div className="text-2xl font-bold text-primary">سجّل تلاوتك</div>
                    <div className="text-gray-500">ابدأ جلسة تسميع جديدة</div>
                </motion.div>
            </div>
        </motion.div >
    );
};

export default HomeView;
