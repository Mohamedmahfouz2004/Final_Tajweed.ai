import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { staggerContainer, fadeInUp } from '../utils/animations';
import LessonCard from '../components/LessonCard';
import useAppStore from '../store/useAppStore';

export const lessonsData = [
    { id: 'noon-sakinah', title: 'أحكام النون الساكنة', description: 'تعلم الإظهار، الإدغام، الإقلاب، والإخفاء.', icon: <BookOpen color="#10B981" />, duration: '15 دقيقة' },
    { id: 'qalqalah', title: 'القلقلة', description: 'مراتب القلقلة وحروفها (قطب جد).', icon: <BookOpen color="#F59E0B" />, duration: '10 دقائق' },
    { id: 'madd', title: 'المدود', description: 'أنواع المدود وأزمنتها المختلفة.', icon: <BookOpen color="#3B82F6" />, duration: '20 دقيقة' },
    { id: 'tafkheem', title: 'التفخيم والترقيق', description: 'الحروف المفخمة والمرققة دائماً.', icon: <BookOpen color="#EF4444" />, duration: '12 دقيقة' },
    { id: 'meem-sakinah', title: 'أحكام الميم الساكنة', description: 'الإخفاء الشفوي، إدغام المثلين، الإظهار.', icon: <BookOpen color="#6B7280" />, duration: '14 دقيقة' },
];

const LessonsView = () => {
    const navigate = useNavigate();
    const isLoggedIn = useAppStore(s => s.isLoggedIn);
    const openAuthModal = useAppStore(s => s.openAuthModal);
    const lessons = useAppStore(s => s.lessons);
    const fetchLessons = useAppStore(s => s.fetchLessons);
    const userProgress = useAppStore(s => s.userProgress);
    const fetchUserProgress = useAppStore(s => s.fetchUserProgress);

    React.useEffect(() => {
        fetchLessons();
        if (isLoggedIn) fetchUserProgress();
    }, [isLoggedIn]);

    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
            <motion.div variants={fadeInUp} className="mb-8">
                <h2 className="text-[28px] text-primary mb-2 font-amiri">مكتبة الدروس التفاعلية</h2>
                <p className="text-gray-600">شروحات مبسطة وتفاعلية لأحكام الشريعة والتجويد.</p>

                {!isLoggedIn && (
                    <div className="mt-4 bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-teal-100 p-2 rounded-full text-teal-600">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-teal-800 text-sm">سجل دخولك لتتمكن من المشاهدة</h3>
                                <p className="text-xs text-teal-600">يجب عليك تسجيل الدخول للوصول إلى محتوى الدروس والاختبارات.</p>
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
            </motion.div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                {lessons.length > 0 ? (
                    lessons.map((lesson) => {
                        const isCompleted = userProgress?.completedLessonsList?.includes(lesson._id.toString());
                        return (
                            <motion.div key={lesson._id} variants={fadeInUp}>
                                <LessonCard
                                    lesson={lesson}
                                    isCompleted={isCompleted}
                                    onSelect={() => {
                                        const { isLoggedIn, openAuthModal } = useAppStore.getState();
                                        if (!isLoggedIn) {
                                            openAuthModal();
                                        } else {
                                            navigate(`/lessons/${lesson._id}`);
                                        }
                                    }}
                                />
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-500 font-amiri text-xl">جاري تحميل الدروس أو لا توجد دروس حالياً...</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default LessonsView;
