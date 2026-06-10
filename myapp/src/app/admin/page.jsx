'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Video, BookOpen, AlertCircle, Save, X, LogOut, ShieldCheck, Users, BarChart3, UserCog, Crown, HelpCircle, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useAppStore from '../../store/useAppStore';
import { fadeInUp } from '../../utils/animations';
import { API_BASE } from '../../utils/apiConfig';
import { supabase } from '../../utils/supabaseClient';

export default function AdminDashboardPage() {
    const router = useRouter();
    const {
        lessons, fetchLessons, addLesson, updateLesson, deleteLesson,
        currentUser, isLoggedIn,
        adminStats, fetchAdminStats,
        adminUsers, fetchAdminUsers, updateUserRole, deleteUser,
        addQuiz, deleteQuiz
    } = useAppStore();

    // In Supabase, custom metadata is often in user_metadata or app_metadata
    const isAdmin = currentUser?.user_metadata?.role === 'admin' || currentUser?.role === 'admin';

    // Gate: only signed-in admins may view this page.
    useEffect(() => {
        // Wait a small tick to allow auth to hydrate, though if strictly not logged in we redirect.
        // For robustness, you might want to wait if store is initializing, but this works if layout handles auth init.
        if (!isLoggedIn || !isAdmin) {
            router.replace('/');
        }
    }, [isLoggedIn, isAdmin, router]);

    const [activeTab, setActiveTab] = useState('stats');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', video_url: '', sequence_order: 1 });
    const [expandedLesson, setExpandedLesson] = useState(null);
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [quizLessonId, setQuizLessonId] = useState(null);
    const [quizForm, setQuizForm] = useState({ question: '', options: ['', '', '', ''], correct_answer: '', points: 10 });

    useEffect(() => {
        fetchLessons();
        fetchAdminStats();
        fetchAdminUsers();
    }, [fetchLessons, fetchAdminStats, fetchAdminUsers]);

    const handleOpenModal = (lesson = null) => {
        if (lesson) {
            setEditingLesson(lesson);
            setFormData({ title: lesson.title, description: lesson.description, video_url: lesson.video_url || '', sequence_order: lesson.sequence_order });
        } else {
            setEditingLesson(null);
            setFormData({ title: '', description: '', video_url: '', sequence_order: lessons.length + 1 });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let success = false;
        if (editingLesson) {
            success = await updateLesson(editingLesson._id || editingLesson.id, formData);
        } else {
            success = await addLesson(formData);
        }
        if (success) setIsModalOpen(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
            await deleteLesson(id);
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المستخدم وجميع بياناته؟')) {
            await deleteUser(id);
            fetchAdminStats();
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        await updateUserRole(userId, newRole);
        fetchAdminStats();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/');
    };

    const openQuizModal = (lessonId) => {
        setQuizLessonId(lessonId);
        setQuizForm({ question: '', options: ['', '', '', ''], correct_answer: '', points: 10 });
        setQuizModalOpen(true);
    };

    const handleQuizSubmit = async (e) => {
        e.preventDefault();
        const success = await addQuiz(quizLessonId, quizForm);
        if (success) setQuizModalOpen(false);
    };

    const handleDeleteQuiz = async (quizId) => {
        if (window.confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
            await deleteQuiz(quizId);
        }
    };

    const tabs = [
        { id: 'stats', label: 'الإحصائيات', icon: <BarChart3 size={20} /> },
        { id: 'users', label: 'المستخدمين', icon: <Users size={20} /> },
        { id: 'lessons', label: 'الدروس', icon: <BookOpen size={20} /> },
    ];

    const statCards = adminStats ? [
        { label: 'إجمالي المستخدمين', value: adminStats.totalUsers, icon: <Users size={28} />, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
        { label: 'المشرفين', value: adminStats.totalAdmins, icon: <Crown size={28} />, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
        { label: 'الدروس المنشورة', value: adminStats.totalLessons, icon: <BookOpen size={28} />, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
        { label: 'مستخدمين جدد (7 أيام)', value: adminStats.newUsersThisWeek, icon: <UserCog size={28} />, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
    ] : [];

    // Avoid flashing admin content before the gate redirect resolves.
    if (!isLoggedIn || !isAdmin) return null;

    return (
        <div className="admin-root flex bg-[#F8FAFC] min-h-screen w-full" dir="rtl">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0F172A] text-white flex flex-col p-6 shrink-0 shadow-2xl z-50">
                <div className="flex items-center gap-3 mb-10 pb-6 border-b border-gray-700">
                    <div className="bg-primary p-2 rounded-lg"><ShieldCheck size={24} color="white" /></div>
                    <h2 className="text-xl font-bold">لوحة الإدارة</h2>
                </div>

                <nav className="flex-1 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-none text-right font-medium cursor-pointer transition-all ${activeTab === tab.id
                                ? 'bg-primary/20 text-primary'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-gray-700">
                    <div className="flex items-center gap-3 mb-6 p-2 bg-gray-800/50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white shadow-inner uppercase">
                            {currentUser?.name?.[0]}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-sm truncate">{currentUser?.name}</p>
                            <p className="text-xs text-gray-400">مشرف النظام</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 p-3 rounded-xl hover:bg-red-50 hover:text-white transition-all border-none font-bold cursor-pointer">
                        <LogOut size={18} /> تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-screen p-8 bg-[#F8FAFC]">
                <div className="max-w-6xl mx-auto">

                    {/* ============ STATS TAB ============ */}
                    {activeTab === 'stats' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 className="text-4xl font-amiri text-gray-900 font-bold mb-2">نظرة عامة</h1>
                            <p className="text-gray-500 mb-8">ملخص شامل عن حالة الموقع والبيانات</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                                {statCards.map((card, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`${card.bg} p-3 rounded-xl`}>
                                                {React.cloneElement(card.icon, { className: `text-${card.color.split('-')[1]}-600` })}
                                            </div>
                                        </div>
                                        <p className="text-4xl font-bold text-gray-900 mb-1">{card.value}</p>
                                        <p className="text-gray-500 text-sm">{card.label}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {adminStats && (
                                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4">معلومات إضافية</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <p className="text-gray-500 text-sm mb-1">إجمالي سجلات التقدم</p>
                                            <p className="text-2xl font-bold text-gray-800">{adminStats.totalProgress}</p>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-xl">
                                            <p className="text-gray-500 text-sm mb-1">نسبة الإكمال</p>
                                            <p className="text-2xl font-bold text-emerald-600">{adminStats.completionRate}%</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ============ USERS TAB ============ */}
                    {activeTab === 'users' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h1 className="text-4xl font-amiri text-gray-900 font-bold mb-2">إدارة المستخدمين</h1>
                            <p className="text-gray-500 mb-8">عرض وإدارة جميع المستخدمين المسجلين ({adminUsers.length} مستخدم)</p>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="text-right p-4 font-bold text-gray-600 text-sm">المستخدم</th>
                                            <th className="text-right p-4 font-bold text-gray-600 text-sm">البريد الإلكتروني</th>
                                            <th className="text-right p-4 font-bold text-gray-600 text-sm">الدور</th>
                                            <th className="text-right p-4 font-bold text-gray-600 text-sm">تاريخ التسجيل</th>
                                            <th className="text-center p-4 font-bold text-gray-600 text-sm">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adminUsers.map((user) => (
                                            <tr key={user._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${user.role === 'admin' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                                                            {user.name?.[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="font-bold text-gray-800">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-500 text-sm">{user.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {user.role === 'admin' ? '🛡️ مشرف' : '👤 مستخدم'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-gray-400 text-sm">
                                                    {new Date(user.createdAt).toLocaleDateString('ar-EG')}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleRoleChange(user._id, user.role === 'admin' ? 'user' : 'admin')}
                                                            className={`px-3 py-2 rounded-xl text-xs font-bold border-none cursor-pointer transition-all ${user.role === 'admin'
                                                                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                                                }`}
                                                            title={user.role === 'admin' ? 'تحويل لمستخدم' : 'ترقية لمشرف'}
                                                        >
                                                            {user.role === 'admin' ? 'تحويل لمستخدم' : 'ترقية لمشرف 🛡️'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user._id)}
                                                            className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold border-none cursor-pointer hover:bg-red-100 transition-all"
                                                        >
                                                            حذف
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {adminUsers.length === 0 && (
                                    <div className="text-center py-10 text-gray-400">لا يوجد مستخدمين</div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ============ LESSONS TAB ============ */}
                    {activeTab === 'lessons' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h1 className="text-4xl font-amiri text-gray-900 font-bold mb-2">إدارة المحتوى التعليمي</h1>
                                    <p className="text-gray-500">لديك الآن {lessons.length} دروس منشورة في النظام</p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleOpenModal()}
                                    className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all cursor-pointer border-none"
                                >
                                    <Plus size={22} /> إضافة درس جديد
                                </motion.button>
                            </div>

                            <div className="grid gap-6">
                                {lessons.map((lesson) => (
                                    <motion.div
                                        key={lesson._id || lesson.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden"
                                    >
                                        <div className="p-6 flex justify-between items-center">
                                            <div className="flex gap-6 items-center flex-1 cursor-pointer" onClick={() => setExpandedLesson(expandedLesson === (lesson._id || lesson.id) ? null : (lesson._id || lesson.id))}>
                                                <div className="bg-gray-100 text-gray-400 p-4 rounded-2xl font-bold w-14 h-14 flex items-center justify-center text-xl">
                                                    {lesson.sequence_order}
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-bold text-gray-800 mb-1">{lesson.title}</h3>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-gray-400 text-sm flex items-center gap-1">
                                                            <Video size={14} /> {lesson.video_url ? 'فيديو متاح' : 'لا يوجد فيديو'}
                                                        </span>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                        <span className="text-gray-400 text-sm flex items-center gap-1">
                                                            <HelpCircle size={14} className="mr-1" /> {lesson.quizzes?.length || 0} أسئلة
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 items-center">
                                                <button onClick={() => handleOpenModal(lesson)} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all cursor-pointer border-none" title="تعديل">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(lesson._id || lesson.id)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all cursor-pointer border-none" title="حذف">
                                                    <Trash2 size={18} />
                                                </button>
                                                <button onClick={() => setExpandedLesson(expandedLesson === (lesson._id || lesson.id) ? null : (lesson._id || lesson.id))} className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all cursor-pointer border-none">
                                                    <ChevronDown size={18} className={`transition-transform ${expandedLesson === (lesson._id || lesson.id) ? 'rotate-180' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Quiz Section */}
                                        <AnimatePresence>
                                            {expandedLesson === (lesson._id || lesson.id) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-gray-100 overflow-hidden"
                                                >
                                                    <div className="p-6 bg-gray-50">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                                                <HelpCircle size={18} /> أسئلة الاختبار ({lesson.quizzes?.length || 0})
                                                            </h4>
                                                            <button
                                                                onClick={() => openQuizModal(lesson._id || lesson.id)}
                                                                className="flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold border-none cursor-pointer hover:bg-primary-dark transition-all"
                                                            >
                                                                <Plus size={16} /> إضافة سؤال
                                                            </button>
                                                        </div>

                                                        {lesson.quizzes && lesson.quizzes.length > 0 ? (
                                                            <div className="space-y-3">
                                                                {lesson.quizzes.map((quiz, qi) => (
                                                                    <div key={quiz._id} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-start">
                                                                        <div>
                                                                            <p className="font-bold text-gray-800 mb-2">س{qi + 1}: {quiz.question}</p>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {quiz.options?.map((opt, oi) => (
                                                                                    <span key={oi} className={`px-3 py-1 rounded-lg text-xs font-bold ${opt === quiz.correct_answer ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                                                                        }`}>
                                                                                        {opt} {opt === quiz.correct_answer && '✓'}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <button onClick={() => handleDeleteQuiz(quiz._id)}
                                                                            className="text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer p-1">
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-400 text-center py-6">لا توجد أسئلة بعد، اضغط &quot;إضافة سؤال&quot; لإضافة أول سؤال</p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))}
                            </div>

                            {lessons.length === 0 && (
                                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 mt-10">
                                    <p className="text-gray-400">لا توجد دروس حالياً، ابدأ بإضافة أول درس</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                </div>
            </main>

            {/* Lesson Form Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
                    >
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-primary p-6 text-white flex justify-between items-center">
                                <h2 className="text-xl font-bold">{editingLesson ? 'تعديل الدرس' : 'إضافة درس جديد'}</h2>
                                <button onClick={() => setIsModalOpen(false)} className="bg-transparent border-none text-white cursor-pointer hover:rotate-90 transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الدرس</label>
                                    <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        placeholder="مثلاً: أحكام النون الساكنة" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                                    <textarea rows="3" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                        placeholder="شرح مختصر للدرس..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">فيديو الدرس</label>
                                        <div className="flex gap-3 items-center">
                                            <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-xl cursor-pointer hover:bg-emerald-100 transition-all">
                                                <Video size={18} className="text-emerald-600" />
                                                <span className="text-emerald-700 font-bold text-sm">{uploading ? 'جاري الرفع...' : 'رفع فيديو من الجهاز'}</span>
                                                <input type="file" accept="video/*" className="hidden" disabled={uploading}
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        setUploading(true);
                                                        const token = await useAppStore.getState().getToken?.();
                                                        const fd = new FormData();
                                                        fd.append('video', file);
                                                        try {
                                                            const res = await fetch(`${API_BASE}/api/admin/upload-video`, {
                                                                method: 'POST',
                                                                headers: { 'Authorization': `Bearer ${token}` },
                                                                body: fd
                                                            });
                                                            if (res.ok) {
                                                                const data = await res.json();
                                                                setFormData(prev => ({ ...prev, video_url: data.url }));
                                                            }
                                                        } catch (err) { console.error(err); }
                                                        setUploading(false);
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        {formData.video_url && (
                                            <div className="mt-2 flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                                <Video size={14} className="text-emerald-600" />
                                                <span className="text-xs text-gray-500 truncate flex-1">{formData.video_url}</span>
                                                <button type="button" onClick={() => setFormData({ ...formData, video_url: '' })} className="text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">أو الصق رابط يوتيوب:</p>
                                        <input type="url" value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                                            className="w-full p-2 mt-1 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                                            placeholder="https://youtube.com/watch?v=..." />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ترتيب الدرس</label>
                                        <input type="number" required value={formData.sequence_order} onChange={(e) => setFormData({ ...formData, sequence_order: parseInt(e.target.value) })}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                                    </div>
                                </div>
                                <button type="submit" className="mt-4 w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-primary-dark transition-all flex items-center justify-center gap-2 cursor-pointer border-none font-bold">
                                    <Save size={20} /> حفظ التعديلات
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quiz Form Modal */}
            <AnimatePresence>
                {quizModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1001] flex items-center justify-center p-4"
                    >
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
                                <h2 className="text-xl font-bold flex items-center gap-2"><HelpCircle size={22} /> إضافة سؤال جديد</h2>
                                <button onClick={() => setQuizModalOpen(false)} className="bg-transparent border-none text-white cursor-pointer hover:rotate-90 transition-all">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleQuizSubmit} className="p-6 flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">نص السؤال</label>
                                    <textarea rows="2" required value={quizForm.question} onChange={(e) => setQuizForm({ ...quizForm, question: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all resize-none"
                                        placeholder="مثلاً: ما هو الحكم التجويدي عند..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">الخيارات (4 خيارات)</label>
                                    {quizForm.options.map((opt, i) => (
                                        <input key={i} type="text" required value={opt}
                                            onChange={(e) => {
                                                const newOpts = [...quizForm.options];
                                                newOpts[i] = e.target.value;
                                                setQuizForm({ ...quizForm, options: newOpts });
                                            }}
                                            className="w-full p-2.5 mb-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none transition-all text-sm"
                                            placeholder={`الخيار ${i + 1}`} />
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الإجابة الصحيحة</label>
                                        <select required value={quizForm.correct_answer}
                                            onChange={(e) => setQuizForm({ ...quizForm, correct_answer: e.target.value })}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                                            <option value="">اختر...</option>
                                            {quizForm.options.filter(o => o).map((opt, i) => (
                                                <option key={i} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">النقاط</label>
                                        <input type="number" required value={quizForm.points}
                                            onChange={(e) => setQuizForm({ ...quizForm, points: parseInt(e.target.value) })}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                                    </div>
                                </div>
                                <button type="submit" className="mt-2 w-full py-4 bg-amber-500 text-white rounded-xl font-bold shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2 cursor-pointer border-none font-bold">
                                    <Save size={20} /> إضافة السؤال
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
