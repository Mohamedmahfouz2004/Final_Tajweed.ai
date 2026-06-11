'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabaseClient';
import { 
    User, Settings, Save, Loader2, Upload,
    Camera, Mail, Calendar, Search, Check, ChevronDown, Mic, X
} from 'lucide-react';
import MoshafSettings from '../../components/MoshafSettings';
import { reciters } from '../../utils/data';
import useAppStore from '../../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Shared save footer ─── */
function SaveFooter({ status, saving, onSave }) {
    return (
        <div 
            className="flex flex-col sm:flex-row items-center justify-between"
            style={{ gap: '16px', borderTop: '1px solid var(--sand-200)', paddingTop: '28px', marginTop: '40px' }}
        >
            <div className="text-sm text-ink-500 font-medium">
                {status.msg ? (
                    <motion.span 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`inline-block px-4 py-2 rounded-xl border ${
                            status.type === 'error' 
                                ? 'bg-red-50 text-red-600 border-red-200' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                    >
                        {status.msg}
                    </motion.span>
                ) : (
                    <span className="text-ink-400">تأكد من حفظ أي تعديلات أجريتها.</span>
                )}
            </div>
            <button 
                onClick={onSave} 
                disabled={saving}
                className="ui-btn ui-btn--primary flex items-center gap-2 justify-center w-full sm:w-auto font-bold"
                style={{ padding: '14px 32px', borderRadius: '14px', fontSize: '0.95rem' }}
            >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
            </button>
        </div>
    );
}

export default function ProfilePage() {
    const router = useRouter();
    const isLoggedIn = useAppStore(s => s.isLoggedIn);
    const { setSelectedReciter, moshafSettings, setMoshafSettings, setUserProfile, userProfile } = useAppStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [activeTab, setActiveTab] = useState('account');
    const [userEmail, setUserEmail] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Profile Data
    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        avatar_url: '',
        preferred_reciter: reciters[0]?.id || '',
    });

    // Reciter search state
    const [reciterSearch, setReciterSearch] = useState('');
    const [isReciterDropdownOpen, setIsReciterDropdownOpen] = useState(false);

    useEffect(() => {
        if (!isLoggedIn) {
            router.push('/login');
            return;
        }

        const fetchProfile = async () => {
            setLoading(true);
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData?.session?.user;

            if (user) {
                setUserEmail(user.email || '');
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    const fullName = data.name || user.user_metadata?.full_name || '';
                    const nameParts = fullName.trim().split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

                    setProfile({
                        first_name: firstName,
                        last_name: lastName,
                        date_of_birth: data.date_of_birth || user.user_metadata?.dob || '',
                        avatar_url: data.avatar_url || user.user_metadata?.avatar_url || '',
                        preferred_reciter: data.preferred_reciter || reciters[0]?.id,
                    });
                    
                    if (data.preferred_reciter) setSelectedReciter(data.preferred_reciter);
                    if (data.moshaf_settings && Object.keys(data.moshaf_settings).length > 0) {
                        setMoshafSettings(data.moshaf_settings);
                    }
                }
            }
            setLoading(false);
        };

        fetchProfile();
    }, [isLoggedIn, router, setSelectedReciter, setMoshafSettings]);

    const handleSave = async () => {
        setSaving(true);
        setStatus({ type: '', msg: '' });
        
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
            setSaving(false);
            return;
        }

        const updatePayload = {
            name: `${profile.first_name} ${profile.last_name}`.trim(),
            date_of_birth: profile.date_of_birth || null,
            avatar_url: profile.avatar_url || null,
            preferred_reciter: profile.preferred_reciter,
            moshaf_settings: moshafSettings,
            updated_at: new Date().toISOString()
        };

        console.log('Saving profile for user:', user.id, updatePayload);

        const { data, error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id)
            .select();

        if (error) {
            console.error('Profile save error:', JSON.stringify(error, null, 2));
            setStatus({ type: 'error', msg: `حدث خطأ: ${error.message || 'خطأ غير معروف'}` });
        } else if (!data || data.length === 0) {
            // Row doesn't exist yet, insert it
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({ id: user.id, ...updatePayload });
            
            if (insertError) {
                console.error('Profile insert error:', JSON.stringify(insertError, null, 2));
                setStatus({ type: 'error', msg: `حدث خطأ: ${insertError.message || 'خطأ غير معروف'}` });
            } else {
                setStatus({ type: 'success', msg: 'تم حفظ التعديلات بنجاح' });
                setSelectedReciter(profile.preferred_reciter);
                if (userProfile) setUserProfile({ ...userProfile, ...updatePayload });
                setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
            }
        } else {
            setStatus({ type: 'success', msg: 'تم حفظ التعديلات بنجاح' });
            setSelectedReciter(profile.preferred_reciter);
            if (userProfile) setUserProfile({ ...userProfile, ...updatePayload });
            setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
        }
        setSaving(false);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setStatus({ type: 'error', msg: 'يرجى اختيار صورة بصيغة PNG أو JPG أو WebP' });
            return;
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            setStatus({ type: 'error', msg: 'حجم الصورة يجب أن لا يتجاوز 2 ميجابايت' });
            return;
        }

        setUploading(true);
        setStatus({ type: '', msg: '' });

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const user = sessionData?.session?.user;
            if (!user) throw new Error('Not authenticated');

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage bucket "avatars"
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error('Upload error:', JSON.stringify(uploadError, null, 2));
                throw uploadError;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            if (updateError) {
                console.error('Profile update error:', JSON.stringify(updateError, null, 2));
                throw updateError;
            }

            setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
            if (userProfile) setUserProfile({ ...userProfile, avatar_url: publicUrl });
            setStatus({ type: 'success', msg: 'تم رفع الصورة بنجاح!' });
            setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
        } catch (err) {
            console.error('Avatar upload failed:', err);
            setStatus({ type: 'error', msg: `فشل رفع الصورة: ${err.message || 'خطأ غير معروف'}` });
        } finally {
            setUploading(false);
            // Reset file input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        await supabase
            .from('profiles')
            .update({ avatar_url: null, updated_at: new Date().toISOString() })
            .eq('id', user.id);

        setProfile(prev => ({ ...prev, avatar_url: '' }));
        if (userProfile) setUserProfile({ ...userProfile, avatar_url: null });
        setStatus({ type: 'success', msg: 'تم إزالة الصورة' });
        setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
    };

    const filteredReciters = useMemo(() => {
        return reciters.filter(r => r.name.includes(reciterSearch) || r.style.includes(reciterSearch));
    }, [reciterSearch]);

    const selectedReciterData = reciters.find(r => r.id == profile.preferred_reciter);

    const tabs = [
        { id: 'account', label: 'إدارة البيانات', icon: User },
        { id: 'moshaf',  label: 'إعدادات المصحف', icon: Settings },
        { id: 'reciter', label: 'الشيخ المفضل',   icon: Mic },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-brass-200 border-t-brass-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-brass-700">
                        <Settings size={20} className="animate-pulse" />
                    </div>
                </div>
                <p className="text-ink-600 font-bold font-ibm tracking-wide">جاري تحميل الإعدادات...</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-80px)] relative overflow-hidden" dir="rtl" style={{ padding: '48px 16px 64px' }}>
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-emerald-900/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-brass-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-6xl mx-auto relative z-10">
                
                {/* Page Header */}
                <div className="text-right" style={{ marginBottom: '40px' }}>
                    <span className="ui-eyebrow flex items-center gap-2"><User size={12} className="text-brass-700" /> إعدادات الحساب</span>
                    <h1 className="ui-title">إعدادات الحساب</h1>
                    <p className="ui-sub" style={{ marginTop: '8px' }}>
                        قم بتخصيص تجربتك على منصة تجويد، واضبط إعدادات المصحف واختيار الشيخ المفضل لرحلة قرآنية ممتعة.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row" style={{ gap: '32px' }}>
                    
                    {/* ─── Sidebar ─── */}
                    <div className="w-full md:w-64 flex-shrink-0">
                        <div className="ui-panel sticky top-24 flex flex-row md:flex-col overflow-x-auto hide-scrollbar" style={{ padding: '12px', gap: '6px' }}>
                            {tabs.map(tab => (
                                <button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`ui-tab w-full justify-start rounded-xl transition-all whitespace-nowrap outline-none ${
                                        activeTab === tab.id ? 'is-active' : ''
                                    }`}
                                    style={{ padding: '14px 18px', gap: '12px' }}
                                >
                                    <tab.icon size={18} />
                                    <span className="font-bold text-base">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ─── Main Content ─── */}
                    <div className="flex-1">
                        <AnimatePresence mode="wait">

                            {/* ══════════  TAB 1 – ACCOUNT  ══════════ */}
                            {activeTab === 'account' && (
                                <motion.div 
                                    key="account"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="ui-card text-right"
                                    style={{ padding: 'clamp(28px, 5vw, 48px)' }}
                                >
                                    {/* Section header */}
                                    <div style={{ marginBottom: '36px' }}>
                                        <h2 className="ui-title ui-title--sm" style={{ marginBottom: '6px' }}>المعلومات الشخصية</h2>
                                        <p className="ui-sub">حدث بياناتك الأساسية وصورتك الشخصية لتمييز حسابك.</p>
                                    </div>

                                    {/* Avatar section */}
                                    <div 
                                        className="flex flex-col sm:flex-row items-center sm:items-start rounded-2xl text-right"
                                        style={{ padding: '28px', gap: '28px', marginBottom: '40px', background: 'var(--parchment-50)', border: '1px solid var(--sand-200)' }}
                                    >
                                        {/* Hidden file input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleAvatarUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <div className="relative group cursor-pointer rounded-full" onClick={handleAvatarClick} style={{ flexShrink: 0 }}>
                                            <div className="w-24 h-24 rounded-full bg-parchment-100 border-4 border-white flex items-center justify-center overflow-hidden shadow-md">
                                                {uploading ? (
                                                    <Loader2 size={32} className="animate-spin text-brass-600" />
                                                ) : profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl font-rakkas text-emerald-800">
                                                        {profile.first_name ? profile.first_name.charAt(0).toUpperCase() : <User size={36} />}
                                                    </span>
                                                )}
                                            </div>
                                            {!uploading && (
                                                <div className="absolute inset-0 bg-emerald-900/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                                                    <Camera className="text-white" size={22} />
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 right-0 w-7 h-7 bg-brass-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
                                                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                                            </div>
                                        </div>
                                        <div className="text-center sm:text-right flex-1">
                                            <h3 className="text-base font-bold text-ink-900" style={{ marginBottom: '6px' }}>صورة الملف الشخصي</h3>
                                            <p className="text-sm text-ink-500 leading-relaxed" style={{ marginBottom: '16px', maxWidth: '340px' }}>
                                                يفضل استخدام صورة مربعة واضحة لا تزيد عن 2 ميجابايت (PNG أو JPG أو WebP).
                                            </p>
                                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                                                <button 
                                                    onClick={handleAvatarClick} 
                                                    disabled={uploading}
                                                    className="ui-btn font-bold flex items-center gap-2" 
                                                    style={{ padding: '10px 24px', fontSize: '0.88rem' }}
                                                >
                                                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                    {uploading ? 'جاري الرفع...' : 'رفع صورة جديدة'}
                                                </button>
                                                {profile.avatar_url && (
                                                    <button 
                                                        onClick={handleRemoveAvatar}
                                                        className="text-sm text-red-500 hover:text-red-700 font-bold flex items-center gap-1 transition-colors"
                                                        title="إزالة الصورة"
                                                    >
                                                        <X size={14} />
                                                        إزالة
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '32px 28px', marginBottom: '8px' }}>
                                        {/* First name */}
                                        <div className="flex flex-col" style={{ gap: '8px' }}>
                                            <label className="font-ibm text-[0.88rem] font-bold text-ink-700 flex items-center gap-2">
                                                <User size={14} className="text-brass-600" /> الاسم الأول
                                            </label>
                                            <input type="text" className="ui-input" style={{ padding: '12px 16px' }} placeholder="أحمد"
                                                value={profile.first_name} onChange={(e) => setProfile({...profile, first_name: e.target.value})} />
                                        </div>
                                        {/* Last name */}
                                        <div className="flex flex-col" style={{ gap: '8px' }}>
                                            <label className="font-ibm text-[0.88rem] font-bold text-ink-700 flex items-center gap-2">
                                                اسم العائلة
                                            </label>
                                            <input type="text" className="ui-input" style={{ padding: '12px 16px' }} placeholder="محمد"
                                                value={profile.last_name} onChange={(e) => setProfile({...profile, last_name: e.target.value})} />
                                        </div>
                                        {/* DOB */}
                                        <div className="flex flex-col" style={{ gap: '8px' }}>
                                            <label className="font-ibm text-[0.88rem] font-bold text-ink-700 flex items-center gap-2">
                                                <Calendar size={14} className="text-brass-600" /> تاريخ الميلاد
                                            </label>
                                            <input type="date" className="ui-input text-left" dir="ltr" style={{ padding: '12px 16px' }}
                                                value={profile.date_of_birth} onChange={(e) => setProfile({...profile, date_of_birth: e.target.value})} />
                                        </div>
                                        {/* Email */}
                                        <div className="flex flex-col" style={{ gap: '8px' }}>
                                            <label className="font-ibm text-[0.88rem] font-bold text-ink-700 flex items-center gap-2">
                                                <Mail size={14} className="text-brass-600" /> البريد الإلكتروني
                                            </label>
                                            <input type="email" className="ui-input cursor-not-allowed" 
                                                style={{ padding: '12px 16px', opacity: 0.7, background: 'var(--parchment-50)' }}
                                                value={userEmail} disabled title="لا يمكن تغيير البريد الإلكتروني" />
                                        </div>
                                    </div>

                                    <SaveFooter status={status} saving={saving} onSave={handleSave} />
                                </motion.div>
                            )}

                            {/* ══════════  TAB 2 – MOSHAF  ══════════ */}
                            {activeTab === 'moshaf' && (
                                <motion.div 
                                    key="moshaf"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="ui-card text-right"
                                    style={{ padding: 'clamp(28px, 5vw, 48px)' }}
                                >
                                    <div style={{ marginBottom: '36px' }}>
                                        <h2 className="ui-title ui-title--sm" style={{ marginBottom: '6px' }}>إعدادات المصحف والتلاوة</h2>
                                        <p className="ui-sub">اختر نوع الخط، حجم النص، وطريقة عرض المصحف الأنسب لك.</p>
                                    </div>
                                    <MoshafSettings isProfilePage={true} />
                                    <SaveFooter status={status} saving={saving} onSave={handleSave} />
                                </motion.div>
                            )}

                            {/* ══════════  TAB 3 – RECITER  ══════════ */}
                            {activeTab === 'reciter' && (
                                <motion.div 
                                    key="reciter"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="ui-card text-right"
                                    style={{ padding: 'clamp(28px, 5vw, 48px)' }}
                                >
                                    <div style={{ marginBottom: '36px' }}>
                                        <h2 className="ui-title ui-title--sm" style={{ marginBottom: '6px' }}>الشيخ المفضل للتلاوة</h2>
                                        <p className="ui-sub">اختر القارئ الافتراضي الذي سيتم تشغيل تلاوته تلقائياً في صفحة "استمع وردد".</p>
                                    </div>

                                    {/* Selected reciter selector */}
                                    <div className="relative w-full z-20 text-right" style={{ maxWidth: '540px', marginBottom: '40px' }}>
                                        <label className="font-ibm text-[0.88rem] font-bold text-ink-700 flex items-center gap-2" style={{ marginBottom: '12px' }}>
                                            القارئ المختار حالياً
                                        </label>
                                        <button 
                                            type="button" 
                                            className="w-full bg-white rounded-2xl flex items-center justify-between transition-all focus:outline-none"
                                            style={{ 
                                                padding: '18px 22px', 
                                                border: '1px solid var(--sand-300)',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                            }}
                                            onClick={() => setIsReciterDropdownOpen(!isReciterDropdownOpen)}
                                        >
                                            <div className="flex items-center" style={{ gap: '16px' }}>
                                                <div 
                                                    className="rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"
                                                    style={{ width: '48px', height: '48px' }}
                                                >
                                                    <Mic size={20} />
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-ink-900" style={{ fontSize: '1.05rem', marginBottom: '2px' }}>{selectedReciterData?.name || 'اختر القارئ'}</div>
                                                    <div className="text-xs text-ink-500 font-medium">{selectedReciterData?.style}</div>
                                                </div>
                                            </div>
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-300 ${isReciterDropdownOpen ? 'rotate-180 bg-emerald-50 text-emerald-700' : 'bg-parchment-50 text-ink-500'}`}>
                                                <ChevronDown size={20} />
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {isReciterDropdownOpen && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: -8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -8 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="absolute top-full left-0 right-0 bg-white rounded-2xl overflow-hidden flex flex-col z-30"
                                                    style={{ marginTop: '12px', maxHeight: '400px', boxShadow: '0 16px 48px -6px rgba(0,0,0,0.12)', border: '1px solid var(--sand-200)' }}
                                                >
                                                    {/* Search */}
                                                    <div className="relative" style={{ padding: '16px', borderBottom: '1px solid var(--sand-100)' }}>
                                                        <Search size={16} className="absolute text-ink-400" style={{ right: '32px', top: '50%', transform: 'translateY(-50%)' }} />
                                                        <input 
                                                            type="text" className="ui-input w-full"
                                                            style={{ paddingRight: '44px', paddingLeft: '16px', height: '44px', background: 'var(--parchment-50)', borderRadius: '12px' }}
                                                            placeholder="ابحث عن اسم الشيخ..."
                                                            value={reciterSearch}
                                                            onChange={(e) => setReciterSearch(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    {/* List */}
                                                    <div className="overflow-y-auto flex-1 custom-scrollbar" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {filteredReciters.length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center text-ink-400" style={{ padding: '48px 0', gap: '8px' }}>
                                                                <Search size={28} className="opacity-30" />
                                                                <p className="font-medium text-sm">لا يوجد قارئ يطابق بحثك</p>
                                                            </div>
                                                        ) : (
                                                            filteredReciters.map(reciter => {
                                                                const isSelected = profile.preferred_reciter == reciter.id;
                                                                return (
                                                                    <button
                                                                        key={reciter.id}
                                                                        className="w-full text-right flex items-center transition-all"
                                                                        style={{
                                                                            padding: '12px 16px',
                                                                            borderRadius: '12px',
                                                                            border: 'none',
                                                                            background: isSelected ? '#ecfdf5' : 'transparent',
                                                                            cursor: 'pointer',
                                                                            gap: '14px',
                                                                        }}
                                                                        onClick={() => {
                                                                            setProfile({...profile, preferred_reciter: reciter.id});
                                                                            setIsReciterDropdownOpen(false);
                                                                            setReciterSearch('');
                                                                        }}
                                                                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafaf5'; }}
                                                                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                                                    >
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-parchment-100 text-ink-400'}`}>
                                                                            {isSelected ? <Check size={18} /> : <Mic size={14} />}
                                                                        </div>
                                                                        <div>
                                                                            <div className={`font-bold text-[0.95rem] ${isSelected ? 'text-emerald-900' : 'text-ink-900'}`} style={{ marginBottom: '2px' }}>{reciter.name}</div>
                                                                            <div className="text-xs flex items-center" style={{ gap: '6px' }}>
                                                                                <span className="text-ink-500">{reciter.style}</span>
                                                                                {reciter.isEgyptian && (
                                                                                    <>
                                                                                        <span className="w-1 h-1 rounded-full bg-sand-400"></span>
                                                                                        <span className="text-brass-600 font-bold">قارئ مصري</span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                )
                                                            })
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <SaveFooter status={status} saving={saving} onSave={handleSave} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
