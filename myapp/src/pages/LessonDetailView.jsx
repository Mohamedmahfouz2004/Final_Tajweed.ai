import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Play, Mic, ChevronDown, ArrowRight, Lock } from 'lucide-react';
import { staggerContainer, fadeInUp } from '../utils/animations';
import { lessonsData } from './LessonsView';
import useAppStore from '../store/useAppStore';

const LessonDetailView = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { lessons, fetchLessons } = useAppStore();

    const lesson = lessons.find(l => (l._id || l.id) === lessonId);

    React.useEffect(() => {
        if (lessons.length === 0) fetchLessons();
    }, [lessons.length, fetchLessons]);

    if (!lesson) {
        return (
            <div className="text-center py-16 text-gray-500">
                <h2>الدرس غير موجود</h2>
                <button onClick={() => navigate('/lessons')} className="mt-4 px-6 py-2.5 bg-primary text-white border-none rounded-lg cursor-pointer">
                    العودة للدروس
                </button>
            </div>
        );
    }

    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
            <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(-1)}
                className="flex items-center gap-3 bg-white border-2 border-[#D4AF37]/50 text-[#044D29] mb-6 px-6 py-3 rounded-2xl shadow-md hover:shadow-xl transition-all font-bold group cursor-pointer"
            >
                <ArrowRight size={24} strokeWidth={3} className="transform group-hover:-translate-x-1 transition-transform" />
                <span className="font-amiri text-lg">العودة للدروس</span>
            </motion.button>

            <motion.div variants={fadeInUp} className="glass-panel p-0 overflow-hidden mb-8">
                {lesson.video_url ? (
                    lesson.video_url.includes('youtube') || lesson.video_url.includes('youtu.be') ? (
                        <div className="w-full aspect-video">
                            <iframe
                                src={lesson.video_url
                                    .replace('watch?v=', 'embed/')
                                    .replace('youtu.be/', 'www.youtube.com/embed/')
                                    .replace('youtube.com/shorts/', 'youtube.com/embed/')
                                }
                                title={lesson.title}
                                className="w-full h-full border-none"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : (
                        <div className="w-full aspect-video bg-black">
                            <video
                                src={lesson.video_url}
                                controls
                                className="w-full h-full"
                                style={{ objectFit: 'contain' }}
                            >
                                المتصفح لا يدعم تشغيل الفيديو
                            </video>
                        </div>
                    )
                ) : (
                    <div className="bg-black w-full h-[400px] flex items-center justify-center">
                        <div className="text-center text-white">
                            <Play size={40} fill="white" className="mx-auto mb-4 opacity-50" />
                            <p className="opacity-60">لا يوجد فيديو لهذا الدرس</p>
                        </div>
                    </div>
                )}
                <div className="p-6">
                    <h2 className="text-primary text-[28px] font-amiri mb-2">{lesson.title}</h2>
                    <p className="text-gray-700">{lesson.description}</p>
                </div>
            </motion.div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
                {/* Theoretical Section */}
                <motion.div variants={fadeInUp}
                    whileHover={{ y: -8, borderColor: '#D4AF37', boxShadow: '0 15px 30px rgba(0, 0, 0, 0.12)' }}
                    whileTap={{ scale: 0.98 }}
                    className="glass-panel p-8 relative overflow-hidden cursor-pointer border border-white/60">
                    <div className="absolute top-0 right-0 w-full h-[5px] bg-blue-500"></div>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="bg-blue-50 p-2.5 rounded-xl"><BookOpen color="#3B82F6" size={24} /></div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">القسم النظري</h3>
                            <p className="text-xs text-gray-500">اختبر فهمك للقاعدة</p>
                        </div>
                    </div>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        مجموعة من الأسئلة التفاعلية للتأكد من فهمك الصحيح لقواعد {lesson.title} وحالاتها المختلفة.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => {
                            const { isLoggedIn, openAuthModal } = useAppStore.getState();
                            if (!isLoggedIn) {
                                openAuthModal();
                            } else {
                                navigate(`/lessons/${lessonId}/quiz`);
                            }
                        }}
                        className="w-full py-3 bg-blue-500 text-white border-none rounded-xl font-bold cursor-pointer flex items-center justify-center gap-2">
                        ابدأ الاختبار النظري <ChevronDown size={16} className="-rotate-90" />
                    </motion.button>
                </motion.div>

                {/* Practical Section */}
                <motion.div variants={fadeInUp}
                    whileHover={{ y: -8, borderColor: '#D4AF37', boxShadow: '0 15px 30px rgba(0, 0, 0, 0.12)' }}
                    whileTap={{ scale: 0.98 }}
                    className="glass-panel p-8 relative overflow-hidden border border-white/60">
                    <div className="absolute top-0 right-0 w-full h-[5px] bg-emerald-500"></div>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="bg-emerald-50 p-2.5 rounded-xl"><Mic color="#10B981" size={24} /></div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">القسم العملي</h3>
                            <p className="text-xs text-gray-500">تدريب صوتي على التلاوة</p>
                        </div>
                    </div>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        تدريب عملي باستخدام الذكاء الاصطناعي لتصحيح نطقك لأمثلة من القرآن الكريم.
                    </p>
                    <button disabled className="w-full py-3 bg-gray-200 text-gray-400 border-none rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2">
                        قريباً <Lock size={16} />
                    </button>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default LessonDetailView;
