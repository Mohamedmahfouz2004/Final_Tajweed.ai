import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, AlertCircle, Loader2, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';

// Islamic Star Pattern SVG
const IslamicPattern = () => (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="islamic-star" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M20 0L24 16L40 20L24 24L20 40L16 24L0 20L16 16Z" fill="none" stroke="#D4AF37" strokeWidth="0.5" opacity="0.2" />
                <circle cx="20" cy="20" r="2" fill="#D4AF37" opacity="0.3" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic-star)" />
    </svg>
);

const AuthModal = ({ isOpen, onClose, onLogin }) => {
    const [view, setView] = useState('login'); // login, register, etc.
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedRole, setSelectedRole] = useState('user'); // 'user' or 'admin'

    // Form States
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', otp: '', newPassword: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    if (!isOpen) return null;

    const handleSwitch = (newView) => {
        setError('');
        setSuccessMsg('');
        if ((view === 'login' && newView === 'register') || (view === 'register' && newView === 'login')) {
            setIsFlipped(!isFlipped);
        }
        setView(newView);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);
        // ... (Logic simplified for brevity, assume same API calls)
        try {
            const baseUrl = 'http://localhost:5000/auth';
            let endpoint = '';
            let body = {};

            if (view === 'login') {
                endpoint = `${baseUrl}/login`;
                body = { email: formData.email, password: formData.password };
            } else if (view === 'register') {
                if (formData.password !== formData.confirmPassword) throw new Error('كلمة المرور غير متطابقة');
                endpoint = `${baseUrl}/register`;
                body = {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword
                };
            } else if (view.includes('forgot') || view.includes('reset')) {
                // Handled inside the "Front Face" usually or separately
                if (view === 'forgot-password') {
                    endpoint = `${baseUrl}/forgot-password`;
                    body = { email: formData.email };
                } else {
                    if (formData.newPassword !== formData.confirmPassword) throw new Error('كلمة المرور غير متطابقة');
                    endpoint = `${baseUrl}/reset-password`;
                    body = { email: formData.email, otp: formData.otp, newPassword: formData.newPassword };
                }
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || 'حدث خطأ ما');

            if (view === 'login') {
                const userRole = (data.user.role || '').trim().toLowerCase();
                const targetRole = (selectedRole || '').trim().toLowerCase();

                if (targetRole === 'admin' && userRole !== 'admin') {
                    throw new Error('عذراً، هذا الحساب لا يمتلك صلاحيات المشرف');
                }
                onLogin(data.user, data.accessToken, selectedRole);
                onClose();
            } else if (view === 'register') {
                handleSwitch('login');
                setSuccessMsg('تم إنشاء الحساب بنجاح! سجل الدخول الآن.');
            } else if (view === 'forgot-password') {
                setView('reset-otp');
                setSuccessMsg('تم إرسال كود OTP.');
            } else if (view === 'reset-otp') {
                handleSwitch('login');
                setSuccessMsg('تم تغيير كلمة المرور.');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/90 backdrop-blur-sm" style={{ perspective: '2000px' }} dir="rtl">
                    {/* Close Button (Outside or fixed) */}
                    <button onClick={onClose} className="absolute left-6 top-6 z-[60] p-2 rounded-full bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-white transition-all">
                        <X size={24} />
                    </button>

                    <div className="perspective-1000 w-full max-w-5xl relative">
                        <motion.div
                            initial={false}
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            className="w-full relative preserve-3d grid grid-cols-1"
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            {/* FRONT FACE (Login) */}
                            <div className="backface-hidden col-start-1 row-start-1" style={{ backfaceVisibility: 'hidden' }}>
                                <CardFace
                                    type="login"
                                    view={view}
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleSwitch={handleSwitch}
                                    handleSubmit={handleSubmit}
                                    loading={loading}
                                    error={error}
                                    successMsg={successMsg}
                                    selectedRole={selectedRole}
                                    setSelectedRole={setSelectedRole}
                                />
                            </div>

                            {/* BACK FACE (Register) */}
                            <div
                                className="backface-hidden col-start-1 row-start-1"
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                            >
                                <CardFace
                                    type="register"
                                    view={view}
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleSwitch={handleSwitch}
                                    handleSubmit={handleSubmit}
                                    loading={loading}
                                    error={error}
                                    successMsg={successMsg}
                                />
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

// Reusable Card Face Component
const CardFace = ({ type, view, formData, setFormData, handleSwitch, handleSubmit, loading, error, successMsg, selectedRole, setSelectedRole }) => {
    // If type is login, we show Login OR Forgot Password based on 'view' state
    // If type is register, we show Register

    // Helper to determine what to render
    const isLoginFace = type === 'login';
    const isRegisterFace = type === 'register';

    // On the Login Face, we might show 'forgot-password' or 'reset-otp' views too, using simple conditional rendering
    const currentFaceView = isLoginFace ? (['login', 'forgot-password', 'reset-otp'].includes(view) ? view : 'login') : 'register';

    return (
        <div className="w-full h-full bg-[#FDFBF7] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border-4 border-[#D4AF37] min-h-[600px]">
            {/* Ornaments */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-[#D4AF37] rounded-tl-[1.8rem] z-20 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-[#D4AF37] rounded-tr-[1.8rem] z-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-[#D4AF37] rounded-bl-[1.8rem] z-20 pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-[#D4AF37] rounded-br-[1.8rem] z-20 pointer-events-none"></div>

            {/* ART SECTION */}
            <div className="w-full md:w-[250px] bg-[#044D29] relative flex flex-col items-center justify-center text-center p-4 overflow-hidden shrink-0">
                <div className="absolute inset-0 opacity-10"><IslamicPattern /></div>
                <div className="relative z-10 w-32 h-32 border-2 border-[#D4AF37]/30 rounded-full flex items-center justify-center mb-6 rotate-45">
                    <div className="w-24 h-24 border-2 border-[#D4AF37]/50 rounded-full flex items-center justify-center -rotate-45">
                        <img src="/logo.png" alt="Tajweed Logo" className="w-16 opacity-90 brightness-0 invert" onError={(e) => e.target.style.display = 'none'} />
                        <User size={40} className="text-[#D4AF37]" />
                    </div>
                </div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-amiri font-bold text-[#D4AF37] mb-2 drop-shadow-md">Tajweed.ai</h2>
                    <p className="text-[#E0E0E0] text-sm font-amiri hidden md:block">رفيقك الذكي لإتقان تلاوة القرآن الكريم.</p>
                </div>
            </div>

            {/* FORM SECTION */}
            <div className="flex-1 bg-[#FDFBF7] relative flex flex-col justify-center p-8 md:p-12">
                <div className="absolute inset-4 border border-[#D4AF37]/20 rounded-3xl pointer-events-none"></div>
                <div className="relative z-10 max-w-sm mx-auto w-full">
                    <div className="text-center mb-8">
                        <h3 className="text-2xl font-amiri font-bold text-[#044D29] mb-2">
                            {currentFaceView === 'login' && 'تسجيل الدخول'}
                            {currentFaceView === 'register' && 'إنشاء حساب جديد'}
                            {currentFaceView === 'forgot-password' && 'استعادة الحساب'}
                            {currentFaceView === 'reset-otp' && 'تغيير كلمة المرور'}
                        </h3>
                        <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto"></div>
                    </div>

                    {currentFaceView === 'login' && (
                        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                            <button
                                type="button"
                                onClick={() => setSelectedRole('user')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all border-none cursor-pointer ${selectedRole === 'user' ? 'bg-primary text-white shadow-md' : 'text-gray-500'}`}
                            >
                                حساب مستخدم
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedRole('admin')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all border-none cursor-pointer ${selectedRole === 'admin' ? 'bg-[#D4AF37] text-white shadow-md' : 'text-gray-500'}`}
                            >
                                دخول المشرفين
                            </button>
                        </div>
                    )}

                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 font-bold flex gap-2"><AlertCircle size={16} /> {error}</div>}
                    {successMsg && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4 font-bold flex gap-2"><CheckCircle2 size={16} /> {successMsg}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {currentFaceView === 'register' && (
                            <InputGroup icon={<User />} type="text" placeholder="الاسم الكامل" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        )}

                        {['login', 'register', 'forgot-password'].includes(currentFaceView) && (
                            <InputGroup icon={<Mail />} type="email" placeholder="البريد الإلكتروني" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        )}

                        {['login', 'register'].includes(currentFaceView) && (
                            <InputGroup icon={<Lock />} type="password" placeholder="كلمة المرور" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        )}

                        {currentFaceView === 'register' && (
                            <InputGroup icon={<Lock />} type="password" placeholder="تأكيد كلمة المرور" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />
                        )}

                        {currentFaceView === 'reset-otp' && (
                            <>
                                <InputGroup icon={<KeyRound />} type="text" placeholder="رمز OTP" value={formData.otp} onChange={e => setFormData({ ...formData, otp: e.target.value })} center />
                                <InputGroup icon={<Lock />} type="password" placeholder="كلمة المرور الجديدة" value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} />
                                <InputGroup icon={<Lock />} type="password" placeholder="تأكيدها" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />
                            </>
                        )}

                        {currentFaceView === 'login' && (
                            <div className="flex justify-end">
                                <button type="button" onClick={() => handleSwitch('forgot-password')} className="text-sm text-[#D4AF37] font-bold hover:underline">نسيت كلمة المرور؟</button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{ backgroundColor: selectedRole === 'admin' && currentFaceView === 'login' ? '#D4AF37' : '#044D29' }}
                            className="w-full text-white py-3 rounded-xl font-bold shadow-lg transition-transform transform hover:-translate-y-1 flex justify-center gap-2 border-none cursor-pointer"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (currentFaceView === 'register' ? 'إنشاء حساب' : currentFaceView === 'login' ? 'دخول النظام' : 'إرسال')}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        {isLoginFace ? (
                            currentFaceView === 'login' ? (
                                <p>جديد معنا؟ <button type="button" onClick={() => handleSwitch('register')} className="text-[#D4AF37] font-bold hover:underline">إنشاء حساب</button></p>
                            ) : (
                                <button type="button" onClick={() => handleSwitch('login')} className="flex items-center justify-center gap-2 mx-auto text-gray-500 hover:text-[#044D29]"><ArrowLeft size={16} /> عودة</button>
                            )
                        ) : (
                            <p>لديك حساب؟ <button type="button" onClick={() => handleSwitch('login')} className="text-[#D4AF37] font-bold hover:underline">تسجيل الدخول</button></p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InputGroup = ({ icon, type, placeholder, value, onChange, center }) => (
    <div className="relative group">
        <div className="absolute right-4 top-3.5 text-[#D4AF37] group-focus-within:text-[#044D29] transition-colors">
            {React.cloneElement(icon, { size: 20 })}
        </div>
        <input
            type={type} value={value} onChange={onChange}
            className={`w-full bg-white border border-gray-300 rounded-xl py-3 pr-12 pl-4 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all font-amiri ${center ? 'text-center' : ''}`}
            placeholder={placeholder} required
        />
    </div>
);

export default AuthModal;
