'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Edit2, Trash2, Video, BookOpen, Save, X, LogOut, ShieldCheck, Users,
    BarChart3, UserCog, Crown, HelpCircle, ChevronDown, Loader2, Target,
    Activity, CheckCircle2, Upload, Settings, Mail, Phone, Link2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import useAppStore from '../../store/useAppStore';
import { supabase } from '../../utils/supabaseClient';
import { useIsMobile } from '../../hooks/useIsMobile';

const IBM = 'var(--font-ibm), "IBM Plex Sans Arabic", sans-serif';
const RAKKAS = 'var(--font-rakkas), Rakkas';

const CARD = {
    background: '#FFFDF8', border: '1px solid #DDCDA6', borderRadius: '18px',
    boxShadow: '0 1px 2px rgba(15,26,13,0.05), 0 18px 40px -22px rgba(15,26,13,0.15)',
};
const iconBtn = (color, danger) => ({
    width: 38, height: 38, borderRadius: 10, display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', border: `1px solid ${danger ? 'rgba(139,58,42,0.3)' : '#DDCDA6'}`,
    background: danger ? 'rgba(139,58,42,0.06)' : '#FFFDF8', color, cursor: 'pointer', transition: 'all .15s ease',
});

const EMPTY_QUIZ = { question: '', options: ['', '', '', ''], correct_answer: '', points: 10 };
const EMPTY_TEST = { surah_id: '', verse_number: '', target_word: '', target_rule: '', instruction: '', occurrence_index: 0 };
const DEFAULT_FOOTER = {
    description: 'منصة تعليمية ذكية لتحليل تلاوتك بدقة وتدريبك على إتقان أحكام التجويد خطوة بخطوة باستخدام الذكاء الاصطناعي.',
    email: 'tajweed.ai0@gmail.com', phone: '+201055664001', whatsapp: 'https://wa.me/201055664001',
    facebook: '', instagram: '', tiktok: '', support: '',
    privacy_url: '', terms_url: '', disclaimer_url: '',
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const {
        lessons, fetchLessons, addLesson, updateLesson, deleteLesson, uploadLessonVideo,
        currentUser, userProfile, isLoggedIn, authChecked,
        adminStats, fetchAdminStats,
        adminUsers, fetchAdminUsers, updateUserRole, deleteUser,
        addQuiz, updateQuiz, deleteQuiz, addPracticalTest, deletePracticalTest,
        refreshUserProfile,
        siteSettings, fetchSiteSettings, updateSiteSettings,
    } = useAppStore();

    const isAdmin = userProfile?.role === 'admin';
    const isMobile = useIsMobile();
    const [profileTried, setProfileTried] = useState(false);

    useEffect(() => {
        if (!authChecked) return;
        if (!isLoggedIn) { router.replace('/login'); return; }
        if (currentUser?.id) refreshUserProfile().finally(() => setProfileTried(true));
    }, [authChecked, isLoggedIn, currentUser?.id, refreshUserProfile, router]);

    const [activeTab, setActiveTab] = useState('stats');
    const [uploading, setUploading] = useState(false);

    const [lessonModalOpen, setLessonModalOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [lessonForm, setLessonForm] = useState({ title: '', description: '', video_url: '', sequence_order: 1 });
    const [expandedLesson, setExpandedLesson] = useState(null);

    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [quizLessonId, setQuizLessonId] = useState(null);
    const [editingQuizId, setEditingQuizId] = useState(null);
    const [quizForm, setQuizForm] = useState(EMPTY_QUIZ);

    const [testModalOpen, setTestModalOpen] = useState(false);
    const [testLessonId, setTestLessonId] = useState(null);
    const [testForm, setTestForm] = useState(EMPTY_TEST);

    // Footer/contact/legal settings form
    const [settingsForm, setSettingsForm] = useState(null);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (!isAdmin) return;
        fetchLessons();
        fetchAdminStats();
        fetchAdminUsers();
        fetchSiteSettings();
        document.title = 'لوحة الإدارة | Tajweed.ai';
    }, [isAdmin, fetchLessons, fetchAdminStats, fetchAdminUsers, fetchSiteSettings]);

    // ── handlers ──
    const openLessonModal = (lesson = null) => {
        if (lesson) {
            setEditingLesson(lesson);
            setLessonForm({ title: lesson.title, description: lesson.description || '', video_url: lesson.video_url || '', sequence_order: lesson.sequence_order });
        } else {
            setEditingLesson(null);
            setLessonForm({ title: '', description: '', video_url: '', sequence_order: lessons.length + 1 });
        }
        setLessonModalOpen(true);
    };
    const submitLesson = async (e) => {
        e.preventDefault();
        const ok = editingLesson ? await updateLesson(editingLesson.id, lessonForm) : await addLesson(lessonForm);
        if (ok) { setLessonModalOpen(false); fetchAdminStats(); }
    };
    const onVideoFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const url = await uploadLessonVideo(file);
        if (url) setLessonForm((prev) => ({ ...prev, video_url: url }));
        setUploading(false);
        e.target.value = '';
    };

    const openQuizModal = (lessonId, quiz = null) => {
        setQuizLessonId(lessonId);
        if (quiz) {
            setEditingQuizId(quiz.id);
            const opts = Array.isArray(quiz.options) ? [...quiz.options] : ['', '', '', ''];
            while (opts.length < 4) opts.push('');
            setQuizForm({ question: quiz.question, options: opts, correct_answer: quiz.correct_answer, points: quiz.points || 10 });
        } else {
            setEditingQuizId(null);
            setQuizForm(EMPTY_QUIZ);
        }
        setQuizModalOpen(true);
    };
    const submitQuiz = async (e) => {
        e.preventDefault();
        const payload = { ...quizForm, options: quizForm.options.filter((o) => o.trim()) };
        const ok = editingQuizId ? await updateQuiz(editingQuizId, payload) : await addQuiz(quizLessonId, payload);
        if (ok) setQuizModalOpen(false);
    };

    const openTestModal = (lessonId) => { setTestLessonId(lessonId); setTestForm(EMPTY_TEST); setTestModalOpen(true); };
    const submitTest = async (e) => {
        e.preventDefault();
        const ok = await addPracticalTest(testLessonId, {
            ...testForm,
            surah_id: parseInt(testForm.surah_id),
            verse_number: parseInt(testForm.verse_number),
            occurrence_index: parseInt(testForm.occurrence_index) || 0,
        });
        if (ok) setTestModalOpen(false);
    };

    const confirmAnd = (msg, fn) => { if (window.confirm(msg)) fn(); };
    const handleLogout = async () => { if (supabase) await supabase.auth.signOut(); router.replace('/'); };

    // Effective form values = the admin's in-progress edits, else the saved settings,
    // else built-in defaults. Never gate the form on loaded data (that caused an
    // infinite spinner when the site_settings row/table didn't exist yet).
    const settingsValue = settingsForm ?? { ...DEFAULT_FOOTER, ...(siteSettings || {}) };
    const setSetting = (key, val) => setSettingsForm({ ...settingsValue, [key]: val });
    const submitSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        await updateSiteSettings(settingsValue);
        setSavingSettings(false);
    };

    const tabs = [
        { id: 'stats', label: 'نظرة عامة', icon: <BarChart3 size={16} /> },
        { id: 'users', label: 'المستخدمين', icon: <Users size={16} /> },
        { id: 'lessons', label: 'الدروس والاختبارات', icon: <BookOpen size={16} /> },
        { id: 'settings', label: 'الإعدادات', icon: <Settings size={16} /> },
    ];

    // Fields rendered in the settings form (the footer/contact/legal info).
    const settingFields = [
        { key: 'description', label: 'وصف الموقع (التذييل)', textarea: true, icon: <BookOpen size={15} /> },
        { key: 'email', label: 'البريد الإلكتروني', icon: <Mail size={15} />, placeholder: 'name@example.com' },
        { key: 'phone', label: 'رقم الهاتف / واتساب', icon: <Phone size={15} />, placeholder: '+201234567890', dir: 'ltr' },
        { key: 'whatsapp', label: 'رابط واتساب', icon: <Link2 size={15} />, placeholder: 'https://wa.me/2012...', dir: 'ltr' },
        { key: 'facebook', label: 'رابط فيسبوك', icon: <Link2 size={15} />, placeholder: 'https://facebook.com/...', dir: 'ltr' },
        { key: 'instagram', label: 'رابط إنستاجرام', icon: <Link2 size={15} />, placeholder: 'https://instagram.com/...', dir: 'ltr' },
        { key: 'tiktok', label: 'رابط تيك توك', icon: <Link2 size={15} />, placeholder: 'https://tiktok.com/@...', dir: 'ltr' },
        { key: 'support', label: 'رابط الدعم الفني', icon: <Link2 size={15} />, placeholder: 'https://...', dir: 'ltr' },
        { key: 'privacy_url', label: 'سياسة الخصوصية (رابط)', icon: <Link2 size={15} />, placeholder: 'https://...', dir: 'ltr' },
        { key: 'terms_url', label: 'شروط الاستخدام (رابط)', icon: <Link2 size={15} />, placeholder: 'https://...', dir: 'ltr' },
        { key: 'disclaimer_url', label: 'إخلاء المسؤولية (رابط)', icon: <Link2 size={15} />, placeholder: 'https://...', dir: 'ltr' },
    ];

    const statCards = adminStats ? [
        { label: 'المستخدمين', value: adminStats.totalUsers, icon: <Users size={20} />, bg: 'rgba(45,125,82,0.14)', fg: '#1A5C3A' },
        { label: 'المشرفين', value: adminStats.totalAdmins, icon: <Crown size={20} />, bg: 'rgba(212,175,55,0.18)', fg: '#8B6D2E' },
        { label: 'الدروس المنشورة', value: adminStats.totalLessons, icon: <BookOpen size={20} />, bg: 'rgba(15,26,13,0.08)', fg: '#1B5E3B' },
        { label: 'جلسات التلاوة', value: adminStats.totalSessions, icon: <Activity size={20} />, bg: 'rgba(28,18,8,0.08)', fg: '#3D2F1C' },
    ] : [];

    // ── gate states ──
    if (!authChecked || (isLoggedIn && !userProfile && !profileTried)) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--parchment-50)' }} dir="rtl">
                <Loader2 className="animate-spin" size={40} style={{ color: 'var(--emerald-700)' }} />
                <p style={{ fontFamily: IBM, fontWeight: 700, color: 'var(--ink-600)' }}>جاري التحقق من الصلاحيات...</p>
            </div>
        );
    }
    if (!isLoggedIn) return null;
    if (!isAdmin) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--parchment-50)' }} dir="rtl">
                <div style={{ ...CARD, padding: '40px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: 16, background: 'rgba(139,58,42,0.1)', color: '#8B3A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={32} /></div>
                    <h1 style={{ fontFamily: RAKKAS, fontSize: '1.9rem', color: 'var(--ink-900)', marginBottom: 8 }}>لا تملك صلاحية الدخول</h1>
                    <p style={{ fontFamily: IBM, color: 'var(--ink-600)', marginBottom: 4 }}>هذه الصفحة للمشرفين فقط.</p>
                    <p style={{ fontFamily: IBM, color: 'var(--ink-500)', fontSize: '0.85rem', marginBottom: 24 }}>
                        {userProfile
                            ? <>دورك الحالي: <span style={{ fontWeight: 700, color: 'var(--ink-700)' }}>{userProfile.role || 'غير محدد'}</span></>
                            : 'تعذّر تحميل ملفك الشخصي (تحقق من تشغيل ملفات الـ migration وسياسات RLS).'}
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button onClick={() => refreshUserProfile()} className="ui-btn ui-btn--primary">إعادة المحاولة</button>
                        <button onClick={() => router.replace('/')} className="ui-btn ui-btn--ghost">الرئيسية</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── dashboard ──
    return (
        <div style={{ minHeight: '100vh', width: '100%', background: 'var(--parchment-50)', padding: '40px 20px' }} dir="rtl">
        <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
                <div>
                    <span className="ui-eyebrow"><ShieldCheck size={13} /> &nbsp;//&nbsp; لوحة التحكم</span>
                    <h1 className="ui-title" style={{ fontFamily: RAKKAS, fontSize: '2.4rem', color: 'var(--ink-900)', margin: '4px 0 0' }}>لوحة الإدارة</h1>
                    <p className="ui-sub" style={{ fontFamily: IBM, color: 'var(--ink-600)' }}>إدارة المستخدمين والمحتوى التعليمي والاختبارات.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', ...CARD, borderRadius: 999 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#0F1A0D,#1A5C3A)', color: '#F1E6CA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: IBM, textTransform: 'uppercase' }}>
                            {(userProfile?.name || currentUser?.email || '?')[0]}
                        </div>
                        <div style={{ lineHeight: 1.2 }}>
                            <div style={{ fontFamily: IBM, fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink-900)' }}>{userProfile?.name || 'مشرف'}</div>
                            <div style={{ fontFamily: IBM, fontSize: '0.7rem', color: 'var(--ink-500)' }}>مشرف النظام</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="ui-btn ui-btn--danger"><LogOut size={16} /> خروج</button>
                </div>
            </motion.div>

            <div className="ui-divider" aria-hidden />

            {/* Tabs */}
            <div className="ui-tabs" style={{ marginBottom: 28 }}>
                {tabs.map((t) => (
                    <button key={t.id} className={`ui-tab ${activeTab === t.id ? 'is-active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.icon} {t.label}</button>
                ))}
            </div>

            {/* ===== OVERVIEW ===== */}
            {activeTab === 'stats' && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                        {statCards.map((c, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} style={{ ...CARD, padding: '22px 24px' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{c.icon}</div>
                                <div style={{ fontFamily: RAKKAS, fontSize: '2.6rem', color: 'var(--ink-900)', lineHeight: 1 }}>{c.value ?? '—'}</div>
                                <div style={{ fontFamily: IBM, fontWeight: 700, fontSize: '0.82rem', color: 'var(--ink-600)', marginTop: 6 }}>{c.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {adminStats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                            <div style={{ ...CARD, padding: '22px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-600)', marginBottom: 10 }}><UserCog size={16} /><span style={{ fontFamily: IBM, fontWeight: 700, fontSize: '0.8rem' }}>مستخدمون جدد (7 أيام)</span></div>
                                <div style={{ fontFamily: RAKKAS, fontSize: '2.2rem', color: 'var(--ink-900)', lineHeight: 1 }}>{adminStats.newUsersThisWeek}</div>
                            </div>
                            <div style={{ ...CARD, padding: '22px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-600)', marginBottom: 10 }}><Target size={16} /><span style={{ fontFamily: IBM, fontWeight: 700, fontSize: '0.8rem' }}>سجلات التقدم</span></div>
                                <div style={{ fontFamily: RAKKAS, fontSize: '2.2rem', color: 'var(--ink-900)', lineHeight: 1 }}>{adminStats.totalProgress}</div>
                                <div style={{ fontFamily: IBM, fontSize: '0.72rem', color: 'var(--ink-500)', marginTop: 6 }}>منها {adminStats.completedProgress} مكتمل</div>
                            </div>
                            <div style={{ ...CARD, padding: '22px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-600)', marginBottom: 10 }}><CheckCircle2 size={16} /><span style={{ fontFamily: IBM, fontWeight: 700, fontSize: '0.8rem' }}>نسبة إكمال الدروس</span></div>
                                <div style={{ fontFamily: RAKKAS, fontSize: '2.2rem', color: 'var(--emerald-700)', lineHeight: 1 }}>{adminStats.completionRate}%</div>
                                <div className="ui-bar" style={{ height: 8, marginTop: 12 }}>
                                    <motion.span className="ui-bar-fill" initial={{ width: 0 }} animate={{ width: `${adminStats.completionRate}%` }} transition={{ duration: 0.8 }} style={{ display: 'block', background: 'var(--emerald-700)' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ===== USERS ===== */}
            {activeTab === 'users' && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="ui-action-row" style={{ marginBottom: 18 }}>
                        <h2 style={{ fontFamily: RAKKAS, fontSize: '1.5rem', color: 'var(--ink-900)', margin: 0 }}>المستخدمون</h2>
                        <span className="ui-badge">{adminUsers.length} مستخدم</span>
                    </div>
                    {isMobile ? (
                        /* Mobile: stacked cards (a 5-col table is unreadable on a phone) */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {adminUsers.map((user) => (
                                <div key={user.id} style={{ ...CARD, padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                        <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#FBF7EF', fontFamily: IBM, background: user.role === 'admin' ? 'linear-gradient(135deg,#B8963E,#8B6D2E)' : 'linear-gradient(135deg,#1B5E3B,#2D7D52)' }}>{user.name?.[0]?.toUpperCase()}</div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ fontFamily: IBM, fontWeight: 700, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                                            <div style={{ fontFamily: IBM, fontSize: '0.78rem', color: 'var(--ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                                        </div>
                                        <span className={`ui-badge ${user.role === 'admin' ? 'ui-badge--gold' : ''}`}>{user.role === 'admin' ? '🛡️ مشرف' : '👤 مستخدم'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                        <span style={{ fontFamily: IBM, fontSize: '0.74rem', color: 'var(--ink-500)' }}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : '—'}</span>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')} className="ui-btn" style={{ padding: '9px 14px', fontSize: '0.76rem' }}>{user.role === 'admin' ? 'تنزيل' : 'ترقية 🛡️'}</button>
                                            <button onClick={() => confirmAnd('حذف هذا المستخدم وكل بياناته؟', () => deleteUser(user.id).then(fetchAdminStats))} className="ui-btn ui-btn--danger" style={{ padding: '9px 14px', fontSize: '0.76rem' }}>حذف</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {adminUsers.length === 0 && <div className="ui-empty" style={{ fontFamily: IBM }}>لا يوجد مستخدمون</div>}
                        </div>
                    ) : (
                    <div style={{ ...CARD, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 2.2fr 1fr 1.2fr 1.6fr', padding: '14px 20px', borderBottom: '1px solid #EBE3CE', background: '#FAF8F2' }}>
                            {['المستخدم', 'البريد', 'الدور', 'التسجيل', 'إجراءات'].map((h, i) => (
                                <span key={i} className="ui-stat-label" style={{ textAlign: i === 4 ? 'center' : 'start' }}>{h}</span>
                            ))}
                        </div>
                        {adminUsers.map((user) => (
                            <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '2.2fr 2.2fr 1fr 1.2fr 1.6fr', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F1EADA' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#FBF7EF', fontFamily: IBM, background: user.role === 'admin' ? 'linear-gradient(135deg,#B8963E,#8B6D2E)' : 'linear-gradient(135deg,#1B5E3B,#2D7D52)' }}>{user.name?.[0]?.toUpperCase()}</div>
                                    <span style={{ fontFamily: IBM, fontWeight: 700, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</span>
                                </div>
                                <span style={{ fontFamily: IBM, fontSize: '0.84rem', color: 'var(--ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</span>
                                <span><span className={`ui-badge ${user.role === 'admin' ? 'ui-badge--gold' : ''}`}>{user.role === 'admin' ? '🛡️ مشرف' : '👤 مستخدم'}</span></span>
                                <span style={{ fontFamily: IBM, fontSize: '0.8rem', color: 'var(--ink-500)' }}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : '—'}</span>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button onClick={() => updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin')} className="ui-btn" style={{ padding: '7px 12px', fontSize: '0.74rem' }}>{user.role === 'admin' ? 'تنزيل' : 'ترقية 🛡️'}</button>
                                    <button onClick={() => confirmAnd('حذف هذا المستخدم وكل بياناته؟', () => deleteUser(user.id).then(fetchAdminStats))} className="ui-btn ui-btn--danger" style={{ padding: '7px 12px', fontSize: '0.74rem' }}>حذف</button>
                                </div>
                            </div>
                        ))}
                        {adminUsers.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-500)', fontFamily: IBM }}>لا يوجد مستخدمون</div>}
                    </div>
                    )}
                </motion.div>
            )}

            {/* ===== LESSONS ===== */}
            {activeTab === 'lessons' && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="ui-action-row" style={{ marginBottom: 20 }}>
                        <div>
                            <h2 style={{ fontFamily: RAKKAS, fontSize: '1.5rem', color: 'var(--ink-900)', margin: 0 }}>المحتوى التعليمي</h2>
                            <p style={{ fontFamily: IBM, fontSize: '0.82rem', color: 'var(--ink-500)', marginTop: 2 }}>{lessons.length} دروس · فيديوهات وأسئلة واختبارات عملية</p>
                        </div>
                        <button onClick={() => openLessonModal()} className="ui-btn ui-btn--primary"><Plus size={18} /> إضافة درس</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {lessons.map((lesson) => {
                            const open = expandedLesson === lesson.id;
                            return (
                                <div key={lesson.id} style={{ ...CARD, overflow: 'hidden' }}>
                                    <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpandedLesson(open ? null : lesson.id)}>
                                            <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0, background: 'rgba(212,175,55,0.15)', color: '#8B6D2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: RAKKAS, fontSize: '1.5rem' }}>{lesson.sequence_order}</div>
                                            <div style={{ minWidth: 0 }}>
                                                <h3 style={{ fontFamily: RAKKAS, fontSize: '1.45rem', color: 'var(--ink-900)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.title}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontFamily: IBM, fontSize: '0.78rem', color: 'var(--ink-500)', flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Video size={13} /> {lesson.video_url ? 'فيديو متاح' : 'بدون فيديو'}</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><HelpCircle size={13} /> {lesson.quizzes?.length || 0} أسئلة</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Target size={13} /> {lesson.practical_tests?.length || 0} اختبارات</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <button onClick={() => openLessonModal(lesson)} style={iconBtn('#1A5C3A')} title="تعديل"><Edit2 size={17} /></button>
                                            <button onClick={() => confirmAnd('حذف هذا الدرس وكل أسئلته؟', () => deleteLesson(lesson.id).then(fetchAdminStats))} style={iconBtn('#8B3A2A', true)} title="حذف"><Trash2 size={17} /></button>
                                            <button onClick={() => setExpandedLesson(open ? null : lesson.id)} style={iconBtn('var(--ink-500)')}><ChevronDown size={17} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} /></button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {open && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', borderTop: '1px solid #EBE3CE' }}>
                                                <div style={{ padding: 22, background: '#FAF8F2', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22 }}>
                                                    {/* Quizzes */}
                                                    <div>
                                                        <div className="ui-action-row" style={{ marginBottom: 14 }}>
                                                            <h4 style={{ fontFamily: IBM, fontWeight: 700, color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 7, margin: 0 }}><HelpCircle size={16} /> أسئلة ({lesson.quizzes?.length || 0})</h4>
                                                            <button onClick={() => openQuizModal(lesson.id)} className="ui-btn" style={{ padding: '7px 12px', fontSize: '0.76rem' }}><Plus size={14} /> سؤال</button>
                                                        </div>
                                                        {lesson.quizzes?.length ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                {lesson.quizzes.map((quiz, qi) => (
                                                                    <div key={quiz.id} style={{ background: '#FFFDF8', border: '1px solid #EBE3CE', borderRadius: 12, padding: 14 }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                                                            <p style={{ fontFamily: IBM, fontWeight: 700, color: 'var(--ink-900)', margin: '0 0 8px', fontSize: '0.9rem' }}>س{qi + 1}: {quiz.question}</p>
                                                                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                                                <button onClick={() => openQuizModal(lesson.id, quiz)} style={{ ...iconBtn('#1A5C3A'), width: 30, height: 30 }}><Edit2 size={14} /></button>
                                                                                <button onClick={() => confirmAnd('حذف هذا السؤال؟', () => deleteQuiz(quiz.id))} style={{ ...iconBtn('#8B3A2A', true), width: 30, height: 30 }}><Trash2 size={14} /></button>
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                            {quiz.options?.map((opt, oi) => (
                                                                                <span key={oi} className={`ui-badge ${opt === quiz.correct_answer ? 'ui-badge--ok' : ''}`} style={{ fontSize: '0.7rem', padding: '3px 10px' }}>{opt} {opt === quiz.correct_answer && '✓'}</span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <p style={{ textAlign: 'center', color: 'var(--ink-500)', fontFamily: IBM, fontSize: '0.82rem', padding: '18px 0' }}>لا توجد أسئلة بعد</p>}
                                                    </div>

                                                    {/* Practical tests */}
                                                    <div>
                                                        <div className="ui-action-row" style={{ marginBottom: 14 }}>
                                                            <h4 style={{ fontFamily: IBM, fontWeight: 700, color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 7, margin: 0 }}><Target size={16} /> اختبارات عملية ({lesson.practical_tests?.length || 0})</h4>
                                                            <button onClick={() => openTestModal(lesson.id)} className="ui-btn" style={{ padding: '7px 12px', fontSize: '0.76rem' }}><Plus size={14} /> اختبار</button>
                                                        </div>
                                                        {lesson.practical_tests?.length ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                {lesson.practical_tests.map((t) => (
                                                                    <div key={t.id} style={{ background: '#FFFDF8', border: '1px solid #EBE3CE', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                                                        <div>
                                                                            <p style={{ fontFamily: IBM, fontWeight: 700, color: 'var(--ink-900)', margin: 0, fontSize: '0.9rem' }}>{t.target_word} <span style={{ fontSize: '0.72rem', color: '#8B6D2E' }}>({t.target_rule})</span></p>
                                                                            <p style={{ fontFamily: IBM, fontSize: '0.72rem', color: 'var(--ink-500)', margin: '4px 0 0' }}>سورة {t.surah_id} · آية {t.verse_number}</p>
                                                                            {t.instruction && <p style={{ fontFamily: IBM, fontSize: '0.72rem', color: 'var(--ink-600)', margin: '4px 0 0' }}>{t.instruction}</p>}
                                                                        </div>
                                                                        <button onClick={() => confirmAnd('حذف هذا الاختبار؟', () => deletePracticalTest(t.id))} style={{ ...iconBtn('#8B3A2A', true), width: 30, height: 30, flexShrink: 0 }}><Trash2 size={14} /></button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <p style={{ textAlign: 'center', color: 'var(--ink-500)', fontFamily: IBM, fontSize: '0.82rem', padding: '18px 0' }}>لا توجد اختبارات عملية</p>}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                    {lessons.length === 0 && <div className="ui-empty" style={{ marginTop: 8, fontFamily: IBM }}>لا توجد دروس، ابدأ بإضافة أول درس</div>}
                </motion.div>
            )}

            {/* ===== SETTINGS (footer / contact / legal) ===== */}
            {activeTab === 'settings' && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ marginBottom: 20 }}>
                        <h2 style={{ fontFamily: RAKKAS, fontSize: '1.5rem', color: 'var(--ink-900)', margin: 0 }}>إعدادات التذييل والتواصل</h2>
                        <p style={{ fontFamily: IBM, fontSize: '0.82rem', color: 'var(--ink-500)', marginTop: 2 }}>
                            هذه البيانات تظهر في أسفل الموقع (Footer). تظهر روابط التواصل والقانونية فقط عند إدخال رابط لها.
                        </p>
                    </div>

                    <form onSubmit={submitSettings} style={{ ...CARD, padding: 24, maxWidth: 760 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                            {settingFields.map((f) => (
                                <div key={f.key} style={{ gridColumn: f.textarea ? '1 / -1' : 'auto' }}>
                                    <label className="ui-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{f.icon} {f.label}</label>
                                    {f.textarea ? (
                                        <textarea className="ui-input" rows="2" value={settingsValue[f.key] || ''} onChange={(e) => setSetting(f.key, e.target.value)} style={{ resize: 'none' }} placeholder={f.placeholder} />
                                    ) : (
                                        <input className="ui-input" value={settingsValue[f.key] || ''} onChange={(e) => setSetting(f.key, e.target.value)} placeholder={f.placeholder} dir={f.dir || 'rtl'} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="submit" disabled={savingSettings} className="ui-btn ui-btn--primary" style={{ justifyContent: 'center', padding: '14px', width: '100%', marginTop: 20, opacity: savingSettings ? 0.6 : 1 }}>
                            {savingSettings ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ الإعدادات
                        </button>
                    </form>
                </motion.div>
            )}

            {/* ===== Lesson modal ===== */}
            <AnimatePresence>
                {lessonModalOpen && (
                    <motion.div className="ui-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLessonModalOpen(false)}>
                        <motion.div className="ui-modal" initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }} style={{ maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <div className="ui-modal-header">
                                <h2 className="ui-modal-title">{editingLesson ? 'تعديل الدرس' : 'إضافة درس جديد'}</h2>
                                <button className="ui-modal-close" onClick={() => setLessonModalOpen(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={submitLesson} className="ui-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div><label className="ui-label">عنوان الدرس</label><input className="ui-input" required value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} placeholder="مثلاً: أحكام النون الساكنة" /></div>
                                <div><label className="ui-label">الوصف</label><textarea className="ui-input" rows="3" value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} style={{ resize: 'none' }} placeholder="شرح مختصر للدرس..." /></div>
                                <div>
                                    <label className="ui-label">فيديو الدرس</label>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, border: `2px dashed ${uploading ? '#DDCDA6' : 'rgba(45,125,82,0.4)'}`, borderRadius: 12, cursor: 'pointer', background: uploading ? '#F1EADA' : 'rgba(45,125,82,0.06)' }}>
                                        {uploading ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--ink-500)' }} /> : <Upload size={18} style={{ color: 'var(--emerald-700)' }} />}
                                        <span style={{ fontFamily: IBM, fontWeight: 700, fontSize: '0.84rem', color: 'var(--emerald-700)' }}>{uploading ? 'جاري الرفع...' : 'رفع فيديو من الجهاز'}</span>
                                        <input type="file" accept="video/*" style={{ display: 'none' }} disabled={uploading} onChange={onVideoFile} />
                                    </label>
                                    {lessonForm.video_url && (
                                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, background: '#FAF8F2', padding: 8, borderRadius: 8, border: '1px solid #EBE3CE' }}>
                                            <Video size={14} style={{ color: 'var(--emerald-700)' }} />
                                            <span style={{ fontFamily: IBM, fontSize: '0.74rem', color: 'var(--ink-500)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lessonForm.video_url}</span>
                                            <button type="button" onClick={() => setLessonForm({ ...lessonForm, video_url: '' })} style={{ background: 'transparent', border: 'none', color: '#8B3A2A', cursor: 'pointer' }}><X size={14} /></button>
                                        </div>
                                    )}
                                    <p style={{ fontFamily: IBM, fontSize: '0.72rem', color: 'var(--ink-500)', margin: '8px 0 4px' }}>أو الصق رابطًا (يوتيوب / رابط مباشر):</p>
                                    <input className="ui-input" type="url" value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} placeholder="https://..." style={{ fontSize: '0.84rem' }} />
                                </div>
                                <div><label className="ui-label">ترتيب الدرس</label><input className="ui-input" type="number" required min="1" value={lessonForm.sequence_order} onChange={(e) => setLessonForm({ ...lessonForm, sequence_order: parseInt(e.target.value) || 1 })} /></div>
                                <button type="submit" disabled={uploading} className="ui-btn ui-btn--primary" style={{ justifyContent: 'center', padding: '14px', opacity: uploading ? 0.6 : 1 }}><Save size={18} /> حفظ</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== Quiz modal ===== */}
            <AnimatePresence>
                {quizModalOpen && (
                    <motion.div className="ui-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQuizModalOpen(false)}>
                        <motion.div className="ui-modal" initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }} style={{ maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <div className="ui-modal-header">
                                <h2 className="ui-modal-title">{editingQuizId ? 'تعديل السؤال' : 'إضافة سؤال'}</h2>
                                <button className="ui-modal-close" onClick={() => setQuizModalOpen(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={submitQuiz} className="ui-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div><label className="ui-label">نص السؤال</label><textarea className="ui-input" rows="2" required value={quizForm.question} onChange={(e) => setQuizForm({ ...quizForm, question: e.target.value })} style={{ resize: 'none' }} placeholder="مثلاً: ما الحكم التجويدي عند..." /></div>
                                <div>
                                    <label className="ui-label">الخيارات</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {quizForm.options.map((opt, i) => (
                                            <input key={i} className="ui-input" value={opt} onChange={(e) => { const o = [...quizForm.options]; o[i] = e.target.value; setQuizForm({ ...quizForm, options: o }); }} placeholder={`الخيار ${i + 1}`} style={{ fontSize: '0.86rem' }} />
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                                    <div><label className="ui-label">الإجابة الصحيحة</label>
                                        <select className="ui-select" required value={quizForm.correct_answer} onChange={(e) => setQuizForm({ ...quizForm, correct_answer: e.target.value })}>
                                            <option value="">اختر...</option>
                                            {quizForm.options.filter((o) => o.trim()).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                    <div><label className="ui-label">النقاط</label><input className="ui-input" type="number" required min="0" value={quizForm.points} onChange={(e) => setQuizForm({ ...quizForm, points: parseInt(e.target.value) || 0 })} /></div>
                                </div>
                                <button type="submit" className="ui-btn ui-btn--primary" style={{ justifyContent: 'center', padding: '14px' }}><Save size={18} /> {editingQuizId ? 'حفظ التعديل' : 'إضافة السؤال'}</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== Practical-test modal ===== */}
            <AnimatePresence>
                {testModalOpen && (
                    <motion.div className="ui-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setTestModalOpen(false)}>
                        <motion.div className="ui-modal" initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }} style={{ maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <div className="ui-modal-header">
                                <h2 className="ui-modal-title">إضافة اختبار عملي</h2>
                                <button className="ui-modal-close" onClick={() => setTestModalOpen(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={submitTest} className="ui-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                                    <div><label className="ui-label">رقم السورة</label><input className="ui-input" type="number" required min="1" max="114" value={testForm.surah_id} onChange={(e) => setTestForm({ ...testForm, surah_id: e.target.value })} /></div>
                                    <div><label className="ui-label">رقم الآية</label><input className="ui-input" type="number" required min="1" value={testForm.verse_number} onChange={(e) => setTestForm({ ...testForm, verse_number: e.target.value })} /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                                    <div><label className="ui-label">الكلمة المستهدفة</label><input className="ui-input" required value={testForm.target_word} onChange={(e) => setTestForm({ ...testForm, target_word: e.target.value })} dir="rtl" /></div>
                                    <div><label className="ui-label">الحكم المستهدف</label><input className="ui-input" required value={testForm.target_rule} onChange={(e) => setTestForm({ ...testForm, target_rule: e.target.value })} placeholder="madd / ghunna" /></div>
                                </div>
                                <div><label className="ui-label">التعليمات (اختياري)</label><input className="ui-input" value={testForm.instruction} onChange={(e) => setTestForm({ ...testForm, instruction: e.target.value })} placeholder="انطق الكلمة مع تطبيق الحكم" /></div>
                                <button type="submit" className="ui-btn ui-btn--primary" style={{ justifyContent: 'center', padding: '14px' }}><Save size={18} /> إضافة الاختبار</button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        </div>
    );
}
