'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Calendar, X } from 'lucide-react';
import Link from 'next/link';

export default function AuthContainer({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  
  // Registration state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Shared state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: OTP, 3: new password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const router = useRouter();

  // Sync state if initialMode prop changes (e.g., if user navigates via browser history)
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Clear fields on mount (in case of logout and reopen)
  useEffect(() => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setDobDay('');
    setDobMonth('');
    setDobYear('');
    setConfirmPassword('');
    setError(null);
  }, []);

  const switchMode = (newMode) => {
    setError(null);
    setMode(newMode);
    // Update the URL without reloading or doing a Next.js route transition
    window.history.pushState(null, '', `/${newMode}`);
  };

  // --- Handlers ---
  const handleDayChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setDobDay(val);
    if (val.length === 2) document.getElementById('dob-month')?.focus();
  };

  const handleMonthChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    setDobMonth(val);
    if (val.length === 2) document.getElementById('dob-year')?.focus();
  };

  const handleYearChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    setDobYear(val);
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Backspace' && e.target.value === '') {
      if (field === 'month') document.getElementById('dob-day')?.focus();
      if (field === 'year') document.getElementById('dob-month')?.focus();
    }
  };

  const handleOAuthLogin = async (provider) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` }
    });
    if (error) setError(error.message);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    } else {
      router.push('/');
  const handleRequestOTP = async (e) => {
    e?.preventDefault();
    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني.');
      return;
    }
    setLoading(true);
    setError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setError('حدث خطأ أثناء إرسال الرابط. تأكد من أن البريد مسجل لدينا.');
    } else {
      setResetStep(2);
    }
  };

  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    if (!otp) return setError('يرجى إدخال كود التحقق.');
    setLoading(true); setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'recovery' });
    setLoading(false);
    if (error) {
      setError('الكود غير صحيح أو منتهي الصلاحية.');
    } else {
      setResetStep(3);
    }
  };

  const handleUpdatePassword = async (e) => {
    e?.preventDefault();
    if (!isNewPasswordValid) return setError('يرجى استيفاء شروط كلمة المرور.');
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      alert('تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
      switchMode('login');
      setResetStep(1);
      setPassword('');
      setNewPassword('');
      setOtp('');
    }
  };

  const criteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const isPasswordValid = Object.values(criteria).every(Boolean);

  const resetCriteria = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };
  const isNewPasswordValid = Object.values(resetCriteria).every(Boolean);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) return setError('يرجى استيفاء جميع شروط كلمة المرور.');
    if (password !== confirmPassword) return setError('كلمتا المرور غير متطابقتين.');
    if (!dobDay || !dobMonth || !dobYear) return setError('يرجى اختيار تاريخ ميلاد كامل.');

    setLoading(true);
    const formattedDobForDB = `${dobYear}-${dobMonth}-${dobDay}`;
    if (!supabase) return;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          dob: formattedDobForDB
        }
      }
    });
    setLoading(false);
    
    if (error) {
      setError(error.message);
    } else if (data && !data.session) {
      // Supabase returns no session and no error if the email already exists, 
      // or if Email Confirmation is still required.
      setError('هذا البريد الإلكتروني مسجل بالفعل، أو يرجى مراجعة بريدك لتفعيل الحساب.');
    } else {
      router.push('/'); 
    }
  };

  const formVariants = {
    hidden: (direction) => ({
      opacity: 0,
      x: direction > 0 ? 30 : -30,
      filter: 'blur(2px)'
    }),
    visible: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction < 0 ? 30 : -30,
      filter: 'blur(2px)',
      transition: { duration: 0.3, ease: 'easeIn' }
    })
  };

  // 1 if navigating to register, -1 if to login
  const direction = mode === 'register' ? 1 : -1;

  return (
    <>
      <style>{`
        .auth-field:focus-within .dob-input::placeholder,
        .auth-field.has-value .dob-input::placeholder {
          color: #9CA3AF !important;
        }
      `}</style>

      <motion.div 
        className="auth-modal-overlay" 
        dir="rtl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ padding: '20px' }}
      >
        <motion.div 
          className="auth-modal-card"
          layout
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ layout: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
          style={{ overflow: 'hidden', position: 'relative', margin: 'auto', width: '100%', maxWidth: '500px', borderRadius: '28px' }}
        >
          {/* Close Button */}
          <Link href="/" className="auth-close-button" aria-label="إغلاق" style={{ color: '#1C1208' }}>
            <X size={20} strokeWidth={2.5} color="#1C1208" />
          </Link>

          <main className="auth-form-panel bg-[#FDFCF5]" style={{ padding: '40px 24px' }}>
            
            <motion.div layout className="flex flex-col items-center justify-center mb-6 mt-2">
              <div className="flex items-center gap-2 mb-4" dir="rtl">
                <img src="/logo.svg" alt="تجويد.ai" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                <strong className="flex items-baseline" aria-label="تجويد ai" dir="rtl" style={{ gap: '0px', flexDirection: 'row' }}>
                  <span style={{ fontFamily: 'var(--font-reem-kufi), "Reem Kufi", sans-serif', fontWeight: 'bold', fontSize: '28px', color: '#1B5E3B' }}>تجويد</span>
                  <span style={{ fontFamily: '"Share Tech Mono", monospace', fontWeight: 'bold', fontSize: '24px', color: '#B8923E', position: 'relative', top: '1px' }}>.</span>
                  <span dir="ltr" style={{ fontFamily: '"Share Tech Mono", monospace', fontWeight: 'bold', fontSize: '24px', color: '#B8923E', position: 'relative', top: '1px', marginRight: '2px' }}>ai</span>
                </strong>
              </div>
            </motion.div>

            <motion.div layout>
              <AnimatePresence mode="wait" custom={direction}>
                {mode === 'login' ? (
                  <motion.div
                    key="login"
                    custom={direction}
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="auth-view-stack w-full"
                  >
                    <div className="auth-heading text-center w-full" style={{ alignItems: 'center', marginBottom: '16px' }}>
                      <h2 className="text-[#1C1208] text-center">تسجيل الدخول</h2>
                      <p className="text-center">سجل الدخول لمتابعة رحلة التلاوة</p>
                    </div>

                    {error && <div className="auth-alert error">{error}</div>}

                    <form onSubmit={handleLogin} className="auth-form w-full" noValidate>
                      <label className={`auth-field ${email ? 'has-value' : ''}`}>
                        <div>
                          <Mail size={19} color="#8A958D" />
                          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " dir="ltr" />
                          <span className="auth-floating-label">البريد الإلكتروني</span>
                        </div>
                      </label>

                      <label className={`auth-field ${password ? 'has-value' : ''}`}>
                        <div>
                          <Lock size={19} color="#8A958D" />
                          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder=" " dir="ltr" />
                          <span className="auth-floating-label">كلمة المرور</span>
                          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="إظهار أو إخفاء كلمة المرور">
                            {showPassword ? <EyeOff size={18} color="#8A958D" /> : <Eye size={18} color="#8A958D" />}
                          </button>
                        </div>
                      </label>

                      <button type="button" onClick={() => { switchMode('forgot'); setResetStep(1); setError(null); }} className="auth-inline-link !text-[#1B5E3B] hover:!text-[#0A3527]">
                        نسيت كلمة المرور؟
                      </button>

                      <button type="submit" className="auth-submit-button" style={{ background: '#1B5E3B' }} disabled={loading || !email || !password}>
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'دخول النظام'}
                      </button>
                    </form>

                    <div style={{ position: 'relative', marginTop: '28px', marginBottom: '16px', textAlign: 'center' }}>
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid rgba(28, 18, 8, 0.1)' }}></div>
                      <span style={{ position: 'relative', background: '#FDFCF5', padding: '0 16px', color: '#8A958D', fontSize: '13px', fontWeight: 'bold' }}>أو أكمل بواسطة</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOAuthLogin('google')}
                      style={{
                        width: '100%', minHeight: '52px', borderRadius: '15px', border: '1px solid rgba(28, 18, 8, 0.12)',
                        backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        fontWeight: '700', color: '#1C1208', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F9F9F9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '22px', height: '22px' }} />
                      <span>المتابعة باستخدام Google</span>
                    </button>

                    <div className="auth-footer-action">
                      <p>جديد معنا؟ <button type="button" onClick={() => switchMode('register')} className="text-[#1B5E3B] hover:text-[#0A3527] font-bold" style={{background:'none', border:'none', padding:0, cursor:'pointer'}}>إنشاء حساب</button></p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    custom={direction}
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="auth-view-stack w-full"
                  >
                    <div className="auth-heading text-center w-full" style={{ alignItems: 'center', marginBottom: '16px' }}>
                      <h2 className="text-[#1C1208] text-center">إنشاء حساب</h2>
                      <p className="text-center">إنشاء حساب جديد في منصة التجويد</p>
                    </div>

                    {error && <div className="auth-alert error">{error}</div>}

                    <form onSubmit={handleRegister} className="auth-form w-full" noValidate>
                      <div className="flex gap-3">
                        <label className={`auth-field flex-1 ${firstName ? 'has-value' : ''}`}>
                          <div>
                            <User size={19} color="#8A958D" />
                            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder=" " />
                            <span className="auth-floating-label">الاسم الأول</span>
                          </div>
                        </label>
                        <label className={`auth-field flex-1 ${lastName ? 'has-value' : ''}`}>
                          <div>
                            <User size={19} color="#8A958D" />
                            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder=" " />
                            <span className="auth-floating-label">الاسم الأخير</span>
                          </div>
                        </label>
                      </div>

                      <label className={`auth-field ${email ? 'has-value' : ''}`}>
                        <div>
                          <Mail size={19} className="text-gray-400" />
                          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " dir="ltr" autoComplete="off" />
                          <span className="auth-floating-label">البريد الإلكتروني</span>
                        </div>
                      </label>

                      <label className={`auth-field ${dobDay || dobMonth || dobYear ? 'has-value' : ''}`}>
                        <div>
                          <Calendar size={19} color="#8A958D" />
                          <div className="flex items-center w-full" dir="ltr" style={{ paddingTop: '15px' }}>
                            <input id="dob-day" type="text" value={dobDay} onChange={handleDayChange} placeholder="يوم" className="dob-input text-center" style={{ width: '45px', padding: '0', paddingTop: '0', fontSize: '14px' }} autoComplete="off" />
                            <span className="text-gray-300 mx-1">/</span>
                            <input id="dob-month" type="text" value={dobMonth} onChange={handleMonthChange} onKeyDown={(e) => handleKeyDown(e, 'month')} placeholder="شهر" className="dob-input text-center" style={{ width: '45px', padding: '0', paddingTop: '0', fontSize: '14px' }} autoComplete="off" />
                            <span className="text-gray-300 mx-1">/</span>
                            <input id="dob-year" type="text" value={dobYear} onChange={handleYearChange} onKeyDown={(e) => handleKeyDown(e, 'year')} placeholder="سنة" className="dob-input text-center" style={{ width: '55px', padding: '0', paddingTop: '0', fontSize: '14px' }} autoComplete="off" />
                          </div>
                          <span className="auth-floating-label">تاريخ الميلاد</span>
                        </div>
                      </label>

                      <label className={`auth-field ${password ? 'has-value' : ''}`}>
                        <div>
                          <Lock size={19} className="text-gray-400" />
                          <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder=" " dir="ltr" />
                          <span className="auth-floating-label">كلمة المرور</span>
                          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="إظهار أو إخفاء كلمة المرور">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </label>

                      {password.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1.5 border border-gray-200 mt-[-6px]" dir="rtl">
                          <p className="font-semibold text-gray-600 mb-2">يجب أن تحتوي كلمة المرور على:</p>
                          <div className={`flex items-center gap-2 ${criteria.length ? 'text-green-600' : 'text-gray-500'}`}><span className="text-sm">{criteria.length ? '✓' : '○'}</span><span>8 أحرف على الأقل</span></div>
                          <div className={`flex items-center gap-2 ${criteria.uppercase ? 'text-green-600' : 'text-gray-500'}`}><span className="text-sm">{criteria.uppercase ? '✓' : '○'}</span><span>حرف إنجليزي كبير (A-Z)</span></div>
                          <div className={`flex items-center gap-2 ${criteria.number ? 'text-green-600' : 'text-gray-500'}`}><span className="text-sm">{criteria.number ? '✓' : '○'}</span><span>رقم واحد على الأقل (0-9)</span></div>
                          <div className={`flex items-center gap-2 ${criteria.special ? 'text-green-600' : 'text-gray-500'}`}><span className="text-sm">{criteria.special ? '✓' : '○'}</span><span>رمز مميز (!@#$%^&*)</span></div>
                        </div>
                      )}

                      <label className={`auth-field ${confirmPassword ? 'has-value' : ''}`}>
                        <div>
                          <Lock size={19} className="text-gray-400" />
                          <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder=" " dir="ltr" />
                          <span className="auth-floating-label">تأكيد كلمة المرور</span>
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="إظهار أو إخفاء كلمة المرور">
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </label>

                      <button type="submit" className="auth-submit-button" style={{ background: '#1B5E3B' }} disabled={loading || !isPasswordValid || !firstName || !lastName || !dobDay || !dobMonth || !dobYear || !email}>
                        {loading ? <Loader2 className="animate-spin" size={18} /> : 'إنشاء الحساب'}
                      </button>
                    </form>

                    <div style={{ position: 'relative', marginTop: '28px', marginBottom: '16px', textAlign: 'center' }}>
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid rgba(28, 18, 8, 0.1)' }}></div>
                      <span style={{ position: 'relative', background: '#FDFCF5', padding: '0 16px', color: '#8A958D', fontSize: '13px', fontWeight: 'bold' }}>أو سجل باستخدام</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOAuthLogin('google')}
                      style={{
                        width: '100%', minHeight: '52px', borderRadius: '15px', border: '1px solid rgba(28, 18, 8, 0.12)',
                        backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        fontWeight: '700', color: '#1C1208', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F9F9F9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '22px', height: '22px' }} />
                      <span>المتابعة باستخدام Google</span>
                    </button>

                    <div className="auth-footer-action">
                      <p>لديك حساب بالفعل؟ <button type="button" onClick={() => switchMode('login')} className="text-[#1B5E3B] hover:text-[#0A3527] font-bold" style={{background:'none', border:'none', padding:0, cursor:'pointer'}}>تسجيل الدخول</button></p>
                    </div>
                  </motion.div>
                ) : mode === 'forgot' ? (
                  <motion.div
                    key="forgot"
                    custom={direction}
                    variants={formVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="auth-view-stack w-full"
                  >
                    <div className="auth-heading text-center w-full" style={{ alignItems: 'center', marginBottom: '16px' }}>
                      <h2 className="text-[#1C1208] text-center">استعادة كلمة المرور</h2>
                      <p className="text-center">
                        {resetStep === 1 ? 'أدخل بريدك الإلكتروني لاستلام كود التحقق' : resetStep === 2 ? 'أدخل كود التحقق المرسل لبريدك' : 'أدخل كلمة المرور الجديدة'}
                      </p>
                    </div>

                    {error && <div className="auth-alert error">{error}</div>}

                    {resetStep === 1 && (
                      <form onSubmit={handleRequestOTP} className="auth-form w-full" noValidate>
                        <label className={`auth-field ${email ? 'has-value' : ''}`}>
                          <div>
                            <Mail size={19} color="#8A958D" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " dir="ltr" />
                            <span className="auth-floating-label">البريد الإلكتروني</span>
                          </div>
                        </label>
                        <button type="submit" className="auth-submit-button" style={{ background: '#1B5E3B' }} disabled={loading || !email}>
                          {loading ? <Loader2 className="animate-spin" size={18} /> : 'إرسال كود التحقق'}
                        </button>
                      </form>
                    )}

                    {resetStep === 2 && (
                      <form onSubmit={handleVerifyOTP} className="auth-form w-full" noValidate>
                        <label className={`auth-field ${otp ? 'has-value' : ''}`}>
                          <div>
                            <Lock size={19} color="#8A958D" />
                            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder=" " dir="ltr" maxLength={6} style={{ letterSpacing: '8px', textAlign: 'center', fontWeight: 'bold' }} />
                            <span className="auth-floating-label">كود التحقق (6 أرقام)</span>
                          </div>
                        </label>
                        <button type="submit" className="auth-submit-button" style={{ background: '#1B5E3B' }} disabled={loading || !otp}>
                          {loading ? <Loader2 className="animate-spin" size={18} /> : 'تأكيد الكود'}
                        </button>
                      </form>
                    )}

                    {resetStep === 3 && (
                      <form onSubmit={handleUpdatePassword} className="auth-form w-full" noValidate>
                        <label className={`auth-field ${newPassword ? 'has-value' : ''}`}>
                          <div>
                            <Lock size={19} color="#8A958D" />
                            <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder=" " dir="ltr" />
                            <span className="auth-floating-label">كلمة المرور الجديدة</span>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="إظهار أو إخفاء كلمة المرور">
                              {showPassword ? <EyeOff size={18} color="#8A958D" /> : <Eye size={18} color="#8A958D" />}
                            </button>
                          </div>
                        </label>

                        {newPassword.length > 0 && (
                          <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1.5 border border-gray-200 mt-[-6px]" dir="rtl">
                            <p className="font-semibold text-gray-600 mb-2">يجب أن تحتوي كلمة المرور على:</p>
                            <div className={`flex items-center gap-2 ${resetCriteria.length ? 'text-green-600' : 'text-gray-500'}`}><span className="text-sm">{resetCriteria.length ? '✓' : '○'}</span><span>8 أحرف على الأقل</span></div>
                            <div className={`flex items-center gap-2 ${resetCriteria.uppercase ? 'text-green-600' : 'text-gray-500'}`}><span className="text-sm">{resetCriteria.uppercase ? '✓' : '○'}</span><span>حرف إنجليزي كبير (A-Z)</span></div>
                            <div className={`flex items-center gap-2 ${resetCriteria.number ? 'text-green-600' : 'text-gray-500'}`}><span className="text-sm">{resetCriteria.number ? '✓' : '○'}</span><span>رقم واحد على الأقل (0-9)</span></div>
                            <div className={`flex items-center gap-2 ${resetCriteria.special ? 'text-green-600' : 'text-gray-500'}`}><span className="text-sm">{resetCriteria.special ? '✓' : '○'}</span><span>رمز مميز (!@#$%^&*)</span></div>
                          </div>
                        )}

                        <button type="submit" className="auth-submit-button" style={{ background: '#1B5E3B' }} disabled={loading || !isNewPasswordValid}>
                          {loading ? <Loader2 className="animate-spin" size={18} /> : 'تحديث كلمة المرور'}
                        </button>
                      </form>
                    )}

                    <div className="auth-footer-action mt-6">
                      <p><button type="button" onClick={() => switchMode('login')} className="text-[#1C1208] hover:text-[#0A3527] font-bold" style={{background:'none', border:'none', padding:0, cursor:'pointer'}}>العودة لتسجيل الدخول</button></p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </main>
        </motion.div>
      </motion.div>
    </>
  );
}
