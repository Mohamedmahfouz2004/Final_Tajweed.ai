import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Play, Pause, BookOpen, TrendingUp, Award, CheckCircle, XCircle, BarChart3, Home, Video, ChevronDown, ChevronUp, LogIn, LogOut, LayoutDashboard, GraduationCap, User, Mail, Lock, ArrowRight, Menu,
  AlertTriangle, PieChart as PieChartIcon, Activity, Square, SkipBack, SkipForward
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

import VoiceAssistant from './VoiceAssistant';
import './index.css';

// --- Data & Helpers ---

const reciters = [
  { id: 1, name: 'عبد الباسط عبد الصمد', style: 'مرتل', subfolder: 'Abdul_Basit_Murattal_64kbps', quran_api_id: 2 },
  { id: 2, name: 'محمد صديق المنشاوي', style: 'مجود', subfolder: 'Minshawy_Mujawwad_192kbps', quran_api_id: 8 },
  { id: 3, name: 'محمود خليل الحصري', style: 'معلم', subfolder: 'Husary_Muallim_128kbps', quran_api_id: 12 }
];

const progressData = [
  { day: 'السبت', score: 65 },
  { day: 'الأحد', score: 72 },
  { day: 'الاثنين', score: 68 },
  { day: 'الثلاثاء', score: 85 },
  { day: 'الأربعاء', score: 78 },
  { day: 'الخميس', score: 90 },
  { day: 'الجمعة', score: 92 },
];

const accuracyTrend = [
  { session: 1, acc: 60 }, { session: 2, acc: 65 }, { session: 3, acc: 63 }, { session: 4, acc: 75 },
  { session: 5, acc: 80 }, { session: 6, acc: 85 }, { session: 7, acc: 82 }, { session: 8, acc: 88 },
];

// Mock Data for Mistakes Analysis
const mistakeStats = [
  { name: 'أحكام النون الساكنة', value: 35, color: '#EF4444' }, // Red
  { name: 'القلقلة', value: 25, color: '#F59E0B' }, // Orange
  { name: 'المدود', value: 20, color: '#3B82F6' }, // Blue
  { name: 'التفخيم والترقيق', value: 15, color: '#10B981' }, // Emerald
  { name: 'أخرى', value: 5, color: '#6B7280' }, // Gray
];

const generateInitialProgress = () => ({
  versesPracticed: 0,
  averageAccuracy: 0,
  badgesEarned: 0,
});

// --- Components ---

const SplashScreen = ({ show }) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: '#044D29',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    transition: 'opacity 0.8s ease-out',
    opacity: show ? 1 : 0,
    pointerEvents: show ? 'all' : 'none',
  }}>
    <div style={{
      width: 120, height: 120,
      background: '#D4AF37',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 0 40px rgba(212, 175, 55, 0.6)',
      marginBottom: 32,
      animation: 'pulse 2s infinite'
    }}>
      <BookOpen size={64} color="#044D29" />
    </div>
    <h1 style={{ fontFamily: 'Amiri', color: 'white', fontSize: '3rem', marginBottom: 8 }}>Tajweed.ai</h1>
    <p style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'IBM Plex Sans Arabic' }}>ارتقِ بتلاوتك</p>
  </div>
);

const Toast = ({ message }) => {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: '#FEF2F2', border: '1px solid #DC2626', color: '#B91C1C',
      padding: '12px 24px', borderRadius: '50px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      zIndex: 3000, display: 'flex', alignItems: 'center', gap: '12px',
      fontSize: '16px', fontFamily: 'IBM Plex Sans Arabic',
      animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <XCircle size={20} />
      <span style={{ fontWeight: '500' }}>{message}</span>
    </div>
  );
};

// --- Waveform Visualizer ---
const WaveformVisualizer = ({ isPlaying, audioRef }) => {
  const containerRef = useRef(null);
  const animationRef = useRef();
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!audioRef || !audioRef.current) return;

    const initAudio = () => {
      // Prevent multiple initializations
      if (sourceRef.current) return;

      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;

        // Create source from the existing audio element
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
      } catch (e) {
        console.error("Audio Context Setup Error:", e);
      }
    };

    // Initialize on first user interaction (play) to respect autoplay policies
    if (isPlaying) {
      if (!audioContextRef.current) initAudio();
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }

    return () => {
      // Cleanup logic if needed, but usually context persists for the app
    }
  }, [audioRef, isPlaying]);

  useEffect(() => {
    const bars = containerRef.current?.children;
    if (!bars) return;

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame);

      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount; // 32
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const hasSignal = dataArray.some(v => v > 0);
        const center = Math.floor(bars.length / 2); // 32

        for (let i = 0; i < bufferLength; i++) {
          const value = dataArray[i]; // Lower index = lower frequency (bass/vocals)
          const heightPercent = hasSignal ? 10 + (value / 255) * 90 : 10;

          // Map symmetrically from center
          if (bars[center + i]) bars[center + i].style.height = `${heightPercent}%`;
          if (bars[center - 1 - i]) bars[center - 1 - i].style.height = `${heightPercent}%`;
        }
      } else if (isPlaying) {
        // Symmetrical Fallback Simulation
        const center = Math.floor(bars.length / 2);
        const count = Math.min(center, 32);

        for (let i = 0; i < count; i++) {
          const height = 15 + Math.random() * 70;
          if (bars[center + i]) bars[center + i].style.height = `${height}%`;
          if (bars[center - 1 - i]) bars[center - 1 - i].style.height = `${height}%`;
        }
      }
    };

    if (isPlaying) {
      renderFrame();
    } else {
      cancelAnimationFrame(animationRef.current);
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.height = '10%';
      }
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying]);

  return (
    <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '60px', marginBottom: '24px', width: '100%', padding: '0 20px', direction: 'ltr' }}>
      {[...Array(64)].map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            background: i % 2 === 0 ? '#D4AF37' : '#F59E0B',
            borderRadius: '4px',
            height: '10%',
            transition: 'height 0.05s linear',
            opacity: 0.9,
            boxShadow: '0 0 5px rgba(212, 175, 55, 0.3)'
          }}
        />
      ))}
    </div>
  );
};

// MISTAKES MODAL - Correctly Styled for High Z-Index Interaction
const MistakesModal = ({ isOpen, onClose, onNavigateToLesson }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      zIndex: 99999, /* EXTREMELY HIGH Z-INDEX */
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Click Outside Listener on Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} onClick={onClose}></div>

      <div className="glass-panel" style={{
        width: '600px', maxWidth: '90%', padding: '40px',
        position: 'relative', animation: 'scaleUp 0.3s ease-out',
        maxHeight: '90vh', overflowY: 'auto',
        background: '#fff', // Ensure solid background transparency doesn't show content behind easily
        zIndex: 100000 // Higher than container
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 5, zIndex: 10 }}>
          <XCircle size={28} color="#6B7280" />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '24px', color: '#044D29', marginBottom: '8px', fontFamily: 'Amiri' }}>
            تحليل الأخطاء الشائعة
          </h2>
          <p style={{ color: '#6B7280', fontSize: '14px' }}>
            توزيع نسبة الأخطاء في تلاوتك بناءً على الأحكام التجويدية
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {mistakeStats.map((stat, index) => (
            <div key={index}
              onClick={() => onNavigateToLesson && onNavigateToLesson(stat.name)}
              style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '12px', borderRadius: '12px', border: '1px solid transparent', marginBottom: '8px' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F9FAFB'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 'bold', color: '#374151', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {stat.name}
                  <span style={{ fontSize: '11px', color: '#4F46E5', background: '#EEF2FF', padding: '2px 8px', borderRadius: '10px' }}>شرح الدرس</span>
                </span>
                <span style={{ color: stat.color }}>{stat.value}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: '#F3F4F6', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${stat.value}%`, height: '100%', background: stat.color, borderRadius: '10px', transition: 'width 1s ease-out' }}></div>
              </div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                {stat.value > 20 ? 'يحتاج إلى مزيد من التدريب' : 'مستوى جيد، استمر'}
              </p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32, padding: '16px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #10B981', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Activity size={24} color="#10B981" />
          <div>
            <strong style={{ display: 'block', color: '#065F46' }}>نصيحة الذكاء الاصطناعي</strong>
            <span style={{ fontSize: '14px', color: '#047857' }}>ننصحك بالتركيز على تمارين "أحكام النون الساكنة" في الجلسة القادمة لتحسين دقتك العامة.</span>
          </div>
        </div>

      </div>
    </div>
  );
};

const AuthModal = ({ isOpen, onClose, onLogin }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    // Validation Logic
    if (!formData.email || !formData.password) { setError('الرجاء ملء جميع الحقول المطلوبة'); return; }
    if (!isLoginView && !formData.name) { setError('الرجاء إدخال الاسم الكامل'); return; }
    setLoading(true);
    // Simulate Network
    setTimeout(() => {
      setLoading(false);
      const user = {
        name: isLoginView ? (formData.name || formData.email.split('@')[0]) : formData.name,
        email: formData.email, level: 'طالب علم'
      };
      localStorage.setItem('tajweed_user', JSON.stringify(user));
      onLogin(user); onClose();
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{ width: '400px', padding: '40px', position: 'relative', animation: 'slideUp 0.3s ease-out' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer' }}>
          <XCircle size={24} color="#6B7280" />
        </button>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontSize: '24px', color: '#044D29', marginBottom: '8px' }}> {isLoginView ? 'تسجيل الدخول' : 'إنشاء حساب جديد'} </h2>
          <p style={{ color: '#6B7280', fontSize: '14px' }}> {isLoginView ? 'مرحباً بعودتك إلى رحلة التعلم' : 'انضم إلينا وابدأ رحلة إتقان القرآن'} </p>
        </div>
        <form onSubmit={handleSubmit}>
          {!isLoginView && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#374151' }}>الاسم الكامل</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #D1D5DB' }} />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#374151' }}>البريد الإلكتروني</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #D1D5DB' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: '#374151' }}>كلمة المرور</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #D1D5DB' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#044D29', color: 'white', border: 'none', borderRadius: 8, fontWeight: 'bold' }}> {loading ? 'جاري المعالجة...' : (isLoginView ? 'دخول' : 'إنشاء حساب')} </button>
        </form>
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
          <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} style={{ background: 'none', border: 'none', color: '#D4AF37', fontWeight: 'bold', marginRight: 8, cursor: 'pointer', textDecoration: 'underline' }}> {isLoginView ? 'سجل الآن' : 'سجل الدخول'} </button>
        </div>
      </div>
    </div>
  );
};

const Footer = () => (
  <footer style={{
    width: '100%',
    padding: '32px',
    textAlign: 'center',
    borderTop: '1px solid rgba(4, 77, 41, 0.1)',
    color: '#6B7280',
    fontSize: '14px',
    fontFamily: 'IBM Plex Sans Arabic',
    background: 'rgba(255, 255, 255, 0.8)', // Slightly more opaque
    backdropFilter: 'blur(5px)',
    marginTop: '40px' // Ensure space above
  }}>
    <div style={{ cursor: 'pointer', marginBottom: '12px', fontWeight: 'bold', color: '#044D29', fontSize: '18px', fontFamily: 'sans-serif' }}>Tajweed.ai</div>
    <p style={{ marginBottom: '8px' }}>© 2025 جميع الحقوق محفوظة - رفيقك في رحلة إتقان القرآن الكريم</p>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
      <span style={{ cursor: 'pointer', color: '#044D29' }}>سياسة الخصوصية</span>
      <span style={{ cursor: 'pointer', color: '#044D29' }}>شروط الاستخدام</span>
      <span style={{ cursor: 'pointer', color: '#044D29' }}>اتصل بنا</span>
    </div>
  </footer>
);

const Navbar = ({ activeTab, setActiveTab, isLoggedIn, onOpenAuth, handleLogout, currentUser }) => (
  <nav className="sidebar">
    <div className="sidebar-brand" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer', margin: 0 }}>
      <div className="logo-icon"><BookOpen color="white" size={24} /></div>
      <div className="brand-text"><h1 style={{ fontFamily: 'sans-serif', letterSpacing: '1px', fontSize: '20px', margin: 0 }}>Tajweed.ai</h1></div>
    </div>
    <div className="nav-links">
      <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}> <LayoutDashboard size={20} /> <span>الرئيسية</span> </div>
      <div className={`nav-item ${activeTab === 'practice' ? 'active' : ''}`} onClick={() => setActiveTab('practice')}> <CheckCircle size={20} /> <span>صحح تلاوتك</span> </div>
      <div className={`nav-item ${activeTab === 'lessons' ? 'active' : ''}`} onClick={() => setActiveTab('lessons')}> <GraduationCap size={20} /> <span>الدروس</span> </div>
      <div className={`nav-item ${activeTab === 'progress' ? 'active' : ''}`} onClick={() => setActiveTab('progress')}> <BarChart3 size={20} /> <span>التقدم</span> </div>
    </div>
    {isLoggedIn ? (
      <div className="user-profile-mini" onClick={handleLogout} style={{ width: 'auto', background: 'transparent' }}>
        <div style={{ width: 35, height: 35, borderRadius: '50%', background: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#044D29' }}> {currentUser.name[0]} </div>
        <LogOut size={18} style={{ opacity: 0.8 }} />
      </div>
    ) : (
      <div className="nav-item" onClick={onOpenAuth} style={{ padding: '8px 16px', background: '#D4AF37', color: '#044D29', borderRadius: '50px' }}> <LogIn size={20} /> <span style={{ color: '#044D29' }}>دخول</span> </div>
    )}
  </nav>
);

// HomeView is now stateless regarding the modal - it purely triggers the prop
const HomeView = ({ isLoggedIn, currentUser, setActiveTab, onOpenAuth, onOpenMistakes }) => {
  return (
    <div className="animate-fade-in">
      <div className="hero-card">
        <div className="hero-ornament">قرآن</div>
        <div className="hero-content">
          <h2 style={{ fontSize: '3em', marginBottom: '16px' }}> {isLoggedIn ? `أهلاً بك، ${currentUser.name}` : 'ابدأ رحلة إتقان التلاوة'} </h2>
          <p style={{ fontSize: '1.2em', opacity: 0.9, marginBottom: '32px' }}> منظومة ذكية تساعدك على تصحيح تلاوتك باستخدام الذكاء الاصطناعي. </p>
          <button onClick={() => isLoggedIn ? setActiveTab('practice') : onOpenAuth()} style={{ padding: '16px 40px', background: '#D4AF37', color: '#044D29', border: 'none', borderRadius: '50px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 20px rgba(212, 175, 55, 0.3)' }}> {isLoggedIn ? 'صحح تلاوتك الآن' : 'سجل الآن مجاناً'} </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', margin: '40px 0' }}>
        <h2 style={{ fontFamily: 'Amiri', fontSize: '3.5rem', color: '#044D29', textShadow: '0 2px 4px rgba(0,0,0,0.1)', position: 'relative', display: 'inline-block' }}>
          <span style={{ fontSize: '4rem', color: '#D4AF37', verticalAlign: 'middle', marginLeft: '10px' }}>﴿</span>
          وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
          <span style={{ fontSize: '4rem', color: '#D4AF37', verticalAlign: 'middle', marginRight: '10px' }}>﴾</span>
        </h2>
      </div>

      <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="stat-box" onClick={() => isLoggedIn ? onOpenMistakes() : onOpenAuth()} style={{ cursor: 'pointer', minHeight: '180px', background: 'linear-gradient(to right, #ffffff, #fdfcf5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: '#FEF2F2', padding: 12, borderRadius: '50%' }}> <AlertTriangle size={32} color="#DC2626" /> </div>
              <div style={{ textAlign: 'right' }}> <h3 style={{ fontSize: '22px', color: '#044D29', margin: 0 }}>تحليل الأخطاء</h3> <p style={{ color: '#6B7280', margin: 0 }}>اضغط لعرض التفاصيل</p> </div>
            </div>
            <div style={{ textAlign: 'center', padding: '0 20px' }}> <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#DC2626', lineHeight: 1 }}>{isLoggedIn ? '12' : '0'}</div> <span style={{ fontSize: '14px', color: '#6B7280' }}>خطأ مسجل</span> </div>
          </div>
          {isLoggedIn ? (
            <div style={{ width: '100%', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}> <span>أحكام النون الساكنة (الأكثر تكراراً)</span> <span>35%</span> </div>
              <div style={{ width: '100%', height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}> <div style={{ width: '35%', height: '100%', background: '#EF4444', borderRadius: '4px' }}></div> </div>
            </div>
          ) : (<div style={{ width: '100%', marginTop: '10px', textAlign: 'center', color: '#aaa', fontSize: '14px' }}> سجل الدخول لعرض التحليل </div>)}
        </div>
        <div className="stat-box" style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}> <TrendingUp size={32} color="#044D29" style={{ marginBottom: 16 }} /> <div className="stat-value-big">{isLoggedIn ? '88%' : '0%'}</div> <div style={{ color: '#6B7280' }}>متوسط دقة التلاوة</div> </div>
      </div>
    </div>
  );
};

// Helper component for Sifat Badge in analysis table
const SifatBadge = ({ expected, actual }) => {
  if (!actual) return <span style={{ color: '#9CA3AF' }}>-</span>;

  const isMatch = expected === actual;
  const displayText = actual.replace(/_/g, ' ');
  const expectedText = expected?.replace(/_/g, ' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <span style={{
        color: isMatch ? '#059669' : '#DC2626',
        background: isMatch ? '#D1FAE5' : '#FEE2E2',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {displayText}
      </span>
      {!isMatch && expectedText && (
        <span style={{ fontSize: '10px', color: '#9CA3AF', textDecoration: 'line-through' }}>
          {expectedText}
        </span>
      )}
    </div>
  );
};

const PracticeView = ({ surahs, selectedSurah, setSelectedSurah, showSurahList, setShowSurahList, selectedReciter, setSelectedReciter, showReciterList, setShowReciterList, fromVerse, setFromVerse, toVerse, setToVerse, isPlaying, handlePlayReference, handleStopRecitation, currentPlayingAudio, isRecording, handleRecording, mistakes, currentVerseWords, currentVerseIndex, handleAudioEnded, handleNextVerse, handlePrevVerse, analysisTable, liveTranscription, phonemeDiffs, listenSurah, setListenSurah, listenFromVerse, setListenFromVerse, listenToVerse, setListenToVerse, showListenSurahList, setShowListenSurahList, listenSurahSearch, setListenSurahSearch }) => {
  const [surahSearch, setSurahSearch] = useState('');
  const [reciterSearch, setReciterSearch] = useState('');
  const [startWord, setStartWord] = useState(0);
  const [numWords, setNumWords] = useState(10);
  const [uthmaniText, setUthmaniText] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState('');
  const [showListenSection, setShowListenSection] = useState(false);

  // Separate state for Listen section (LIFTED TO APP)


  // Get max verses for selected surah
  const getMaxVerses = (surahId) => {
    const surah = surahs.find(s => s.id === surahId);
    return surah?.verses_count || 286;
  };

  // Sync Listen section to Record section
  useEffect(() => {
    if (listenSurah) {
      setSelectedSurah(listenSurah);
      setFromVerse(listenFromVerse);
      // Set numWords based on verse range (approximate)
      const verseCount = (listenToVerse || getMaxVerses(listenSurah)) - listenFromVerse + 1;
      setNumWords(Math.min(verseCount * 5, 50)); // Estimate ~5 words per verse, max 50
    }
  }, [listenSurah, listenFromVerse, listenToVerse]);

  const surahRef = useRef(null);
  const reciterRef = useRef(null);
  const listenSurahRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (surahRef.current && !surahRef.current.contains(event.target)) { setShowSurahList(false); }
      if (reciterRef.current && !reciterRef.current.contains(event.target)) { setShowReciterList(false); }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, [showSurahList, showReciterList, setShowSurahList, setShowReciterList]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Play error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentPlayingAudio]);

  // Fetch Uthmani text when selection changes
  useEffect(() => {
    const fetchUthmani = async () => {
      if (!selectedSurah || !fromVerse) return;
      setLoadingText(true);
      setTextError('');
      try {
        const formData = new FormData();
        formData.append('sura_idx', selectedSurah.toString());
        formData.append('aya_idx', fromVerse.toString());
        formData.append('start_word_idx', startWord.toString());
        formData.append('num_words', numWords.toString());

        const res = await fetch('http://127.0.0.1:8000/uthmani_script', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          setUthmaniText(data.text);
        } else {
          const err = await res.json();
          setTextError(err.detail || 'خطأ في جلب النص');
        }
      } catch (e) {
        setTextError('تأكد من تشغيل الخادم على port 8000');
      } finally {
        setLoadingText(false);
      }
    };

    const timeoutId = setTimeout(fetchUthmani, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedSurah, fromVerse, startWord, numWords]);

  const toggleSurahList = () => { const newState = !showSurahList; setShowSurahList(newState); if (newState) setShowReciterList(false); };
  const toggleReciterList = () => { const newState = !showReciterList; setShowReciterList(newState); if (newState) setShowSurahList(false); };

  return (
    <div className="animate-fade-in">
      <div className="glass-panel" style={{ padding: '40px' }}>
        <h2 style={{ fontSize: '28px', color: '#044D29', marginBottom: '32px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', fontFamily: 'Amiri' }}>
          صحح تلاوتك
        </h2>

        {/* ============ SECTION 1: Listen to Recitation (Expandable) ============ */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setShowListenSection(!showListenSection)}
            style={{
              width: '100%', padding: '20px',
              background: showListenSection ? 'linear-gradient(135deg, #044D29 0%, #065F46 100%)' : '#F3F4F6',
              border: 'none', borderRadius: '12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: showListenSection ? 'white' : '#044D29',
              fontSize: '18px', fontWeight: 'bold', fontFamily: 'Amiri'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Play size={24} /> استمع للتلاوة الصحيحة
            </span>
            <ChevronDown size={24} style={{ transform: showListenSection ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>

          {/* Expandable Listen Controls */}
          {showListenSection && (
            <div style={{ background: 'linear-gradient(135deg, #044D29 0%, #065F46 100%)', borderRadius: '0 0 12px 12px', padding: '24px', marginTop: '-8px' }}>
              {/* Listen Controls Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                {/* Surah Selector for Listen */}
                <div ref={listenSurahRef}>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>السورة</label>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowListenSurahList(!showListenSurahList)} style={{ width: '100%', padding: '10px', background: 'white', border: 'none', borderRadius: '8px', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {listenSurah ? surahs.find(s => s.id === listenSurah)?.name_arabic : 'اختر السورة'} <ChevronDown size={14} />
                    </button>
                    {showListenSurahList && (
                      <div style={{ position: 'absolute', top: '100%', width: '100%', background: 'white', border: '1px solid #D1D5DB', borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}><input type="text" placeholder="بحث..." value={listenSurahSearch} onChange={(e) => setListenSurahSearch(e.target.value)} onClick={(e) => e.stopPropagation()} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', textAlign: 'right' }} /></div>
                        {surahs.filter(s => s.name_arabic.includes(listenSurahSearch)).map(s => (<div key={s.id} onClick={() => { setListenSurah(s.id); setShowListenSurahList(false); setListenSurahSearch(''); setListenFromVerse(1); setListenToVerse(s.verses_count); }} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>{s.name_arabic}</div>))}
                      </div>
                    )}
                  </div>
                </div>

                {/* From Verse */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>من الآية</label>
                  <input type="number" value={listenFromVerse} min="1" max={getMaxVerses(listenSurah)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', textAlign: 'center' }} onChange={(e) => { const v = Math.min(parseInt(e.target.value) || 1, getMaxVerses(listenSurah)); setListenFromVerse(v); }} />
                </div>

                {/* To Verse */}
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>للآية</label>
                  <input type="number" value={listenToVerse || getMaxVerses(listenSurah)} min="1" max={getMaxVerses(listenSurah)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', textAlign: 'center' }} onChange={(e) => { const v = Math.min(parseInt(e.target.value) || 1, getMaxVerses(listenSurah)); setListenToVerse(v); }} />
                </div>

                {/* Reciter Selector */}
                <div ref={reciterRef}>
                  <label style={{ display: 'block', marginBottom: '6px', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>القارئ</label>
                  <div style={{ position: 'relative' }}>
                    <button onClick={toggleReciterList} style={{ width: '100%', padding: '10px', background: 'white', border: 'none', borderRadius: '8px', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {selectedReciter ? reciters.find(s => s.id == selectedReciter)?.name : 'اختر القارئ'} <ChevronDown size={14} />
                    </button>
                    {showReciterList && (
                      <div style={{ position: 'absolute', top: '100%', width: '100%', background: 'white', border: '1px solid #D1D5DB', borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}><input type="text" placeholder="بحث..." value={reciterSearch} onChange={(e) => setReciterSearch(e.target.value)} onClick={(e) => e.stopPropagation()} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', textAlign: 'right' }} /></div>
                        {reciters.filter(r => r.name.includes(reciterSearch)).map(s => (<div key={s.id} onClick={() => { setSelectedReciter(s.id); setShowReciterList(false); setReciterSearch(''); }} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>{s.name}</div>))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Play Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
                {!currentPlayingAudio ? (
                  <button onClick={handlePlayReference} style={{ padding: '14px 32px', borderRadius: '50px', border: 'none', background: '#D4AF37', color: '#044D29', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                    <Play size={20} /> تشغيل
                  </button>
                ) : (
                  <>
                    <button onClick={handlePrevVerse} style={{ padding: '10px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}><SkipForward size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                    <button onClick={handlePlayReference} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: '#D4AF37', color: '#044D29', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{isPlaying ? <Pause size={24} /> : <Play size={24} />}</button>
                    <button onClick={handleNextVerse} style={{ padding: '10px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }}><SkipBack size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                    <button onClick={handleStopRecitation} style={{ padding: '10px', borderRadius: '50%', border: 'none', background: 'rgba(220, 38, 38, 0.8)', color: 'white', cursor: 'pointer' }}><Square size={20} /></button>
                  </>
                )}
              </div>

              {/* Live Verse Display */}
              {currentPlayingAudio && (
                <>
                  <div style={{ background: '#FDFCF5', border: '2px solid #D4AF37', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Amiri', fontSize: '28px', lineHeight: '2', color: '#044D29', direction: 'rtl', margin: 0 }}>
                      {currentVerseWords.map(w => w.text_uthmani).join(' ') || `الآية ${currentVerseIndex}`}
                    </p>
                    <p style={{ color: '#6B7280', marginTop: '8px', fontSize: '14px' }}>الآية {currentVerseIndex}</p>
                  </div>
                  <audio ref={audioRef} src={currentPlayingAudio} crossOrigin="anonymous" autoPlay onEnded={handleAudioEnded} style={{ display: 'none' }} />
                </>
              )}
              {currentPlayingAudio && <WaveformVisualizer isPlaying={isPlaying} audioRef={audioRef} />}
            </div>
          )}
        </div>

        {/* ============ SECTION 2: Record Your Recitation (Model Input) ============ */}
        <div style={{ background: '#F9FAFB', borderRadius: '12px', padding: '24px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ color: '#044D29', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Amiri', fontSize: '20px' }}>
            <Mic size={22} /> سجّل تلاوتك
          </h3>

          {/* Model Input Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
            {/* Surah Selector */}
            <div className="form-group" ref={surahRef}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#044D29' }}>السورة</label>
              <div style={{ position: 'relative' }}>
                <button onClick={toggleSurahList} style={{ width: '100%', padding: '12px', background: 'white', border: '1px solid #D1D5DB', borderRadius: '8px', textAlign: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {selectedSurah ? surahs.find(s => s.id === selectedSurah)?.name_arabic : 'اختر السورة'} <ChevronDown size={16} />
                </button>
                {showSurahList && (
                  <div style={{ position: 'absolute', top: '100%', width: '100%', background: 'white', border: '1px solid #D1D5DB', borderRadius: '8px', marginTop: '4px', maxHeight: '300px', overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}> <input type="text" placeholder="بحث عن سورة..." value={surahSearch} onChange={(e) => setSurahSearch(e.target.value)} onClick={(e) => e.stopPropagation()} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', textAlign: 'right' }} /> </div>
                    {surahs.length > 0 ? surahs.filter(s => s.name_arabic.includes(surahSearch)).map(s => (<div key={s.id} onClick={() => { setSelectedSurah(s.id); setShowSurahList(false); setSurahSearch(''); }} style={{ padding: '12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}> {s.name_arabic} </div>)) : <div style={{ padding: '12px' }}>جاري تحميل السور...</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Ayah Selector */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#044D29' }}>الآية</label>
              <input
                type="number"
                value={fromVerse}
                min="1"
                max={selectedSurah ? surahs.find(s => s.id === selectedSurah)?.verses_count : 286}
                placeholder="رقم الآية"
                style={{ width: '100%', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px' }}
                onChange={(e) => setFromVerse(e.target.value)}
              />
            </div>

            {/* Start Word */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#044D29' }}>من الكلمة</label>
              <input
                type="number"
                value={startWord}
                min="0"
                placeholder="0"
                style={{ width: '100%', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px' }}
                onChange={(e) => setStartWord(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Num Words */}
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#044D29' }}>عدد الكلمات</label>
              <input
                type="number"
                value={numWords}
                min="1"
                placeholder="4"
                style={{ width: '100%', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px' }}
                onChange={(e) => setNumWords(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Uthmani Text Display */}
          <div style={{ background: '#FDFCF5', border: '2px solid #D4AF37', borderRadius: '16px', padding: '48px', textAlign: 'center', marginBottom: '32px', boxShadow: 'inset 0 0 60px rgba(212, 175, 55, 0.1)', position: 'relative', minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, opacity: 0.1 }}> <BookOpen size={80} color="#D4AF37" /> </div>

            {loadingText && <div style={{ color: '#6B7280' }}>جاري تحميل النص...</div>}
            {textError && <div style={{ color: '#DC2626', fontSize: '14px' }}>{textError}</div>}
            {!loadingText && !textError && uthmaniText && (
              <p style={{ fontFamily: 'Amiri', fontSize: '36px', lineHeight: '2', color: '#044D29', direction: 'rtl' }}>
                {uthmaniText}
              </p>
            )}
            {!loadingText && !textError && !uthmaniText && (
              <span style={{ color: '#6B7280', fontSize: '18px' }}>اختر السورة والآية لعرض النص</span>
            )}
          </div>

        </div> {/* End SECTION 2: Record */}


        {/* Recording Section */}
        <div style={{ background: '#F3F4F6', borderRadius: '16px', padding: '32px', marginBottom: '32px', textAlign: 'center' }}>
          <h3 style={{ color: '#044D29', marginBottom: '16px', fontFamily: 'Amiri' }}>سجّل تلاوتك</h3>
          <p style={{ color: '#6B7280', marginBottom: '24px', fontSize: '14px' }}>
            اضغط على الزر لبدء التسجيل، ثم اقرأ النص المعروض أعلاه
          </p>

          <button onClick={handleRecording} style={{
            width: '80px', height: '80px', borderRadius: '50%', border: 'none',
            background: isRecording ? '#EF4444' : '#044D29',
            color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
            boxShadow: isRecording ? '0 0 0 8px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(4, 77, 41, 0.3)',
            animation: isRecording ? 'pulse 1.5s infinite' : 'none'
          }}>
            {isRecording ? <Square size={32} /> : <Mic size={32} />}
          </button>

          <p style={{ marginTop: '16px', color: isRecording ? '#EF4444' : '#6B7280', fontWeight: isRecording ? 'bold' : 'normal' }}>
            {isRecording ? 'جاري التسجيل... اضغط لإيقاف' : 'اضغط للتسجيل'}
          </p>

          {/* Live Transcription Display */}
          {isRecording && (
            <div style={{ marginTop: '24px', background: 'linear-gradient(135deg, #044D29 0%, #065F46 100%)', padding: '20px', borderRadius: '12px', border: '2px solid #D4AF37' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                <Activity size={18} style={{ color: '#D4AF37' }} />
                <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>التفريغ المباشر</span>
                <span style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
              </div>

              {liveTranscription ? (
                <div style={{ direction: 'rtl' }}>
                  <p style={{ fontFamily: 'Amiri', fontSize: '28px', color: 'white', lineHeight: '2', margin: 0 }}>
                    {typeof liveTranscription === 'string' ? liveTranscription :
                      liveTranscription.text ? liveTranscription.text :
                        liveTranscription.segments ? liveTranscription.segments.map(seg => seg.text).join(' ') :
                          JSON.stringify(liveTranscription)}
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px' }}>
                    <span style={{ width: '8px', height: '8px', background: '#D4AF37', borderRadius: '50%', animation: 'bounce 1s infinite' }}></span>
                    <span style={{ width: '8px', height: '8px', background: '#D4AF37', borderRadius: '50%', animation: 'bounce 1s infinite 0.1s' }}></span>
                    <span style={{ width: '8px', height: '8px', background: '#D4AF37', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }}></span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: 0 }}>في انتظار صوتك...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {(mistakes.length > 0 || analysisTable.length > 0 || phonemeDiffs.length > 0) && (
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ color: '#044D29', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontFamily: 'Amiri', fontSize: '24px' }}>
              <Activity size={24} /> نتائج التحليل
            </h3>

            {/* Phoneme Diff Visualization */}
            {phonemeDiffs.length > 0 && (
              <div style={{ background: '#FDFCF5', padding: '24px', borderRadius: '12px', marginBottom: '16px', border: '2px solid #D4AF37' }}>
                <h4 style={{ color: '#044D29', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} /> مقارنة الفونيمات
                </h4>
                <div style={{ fontFamily: 'monospace', fontSize: '16px', direction: 'ltr', background: 'white', padding: '16px', borderRadius: '8px', overflowX: 'auto' }}>
                  {phonemeDiffs.map((diff, i) => {
                    const [op, text] = diff;
                    return (
                      <span key={i} style={{
                        color: op === 0 ? '#374151' : op === 1 ? '#059669' : '#DC2626',
                        background: op === 0 ? 'transparent' : op === 1 ? '#D1FAE5' : '#FEE2E2',
                        padding: op !== 0 ? '2px 4px' : '0',
                        borderRadius: '4px',
                        textDecoration: op === -1 ? 'line-through' : 'none',
                        marginRight: '2px'
                      }}>
                        {text}
                      </span>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#6B7280' }}>
                  <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#D1FAE5', borderRadius: '2px', marginLeft: '4px' }}></span> إضافة</span>
                  <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#FEE2E2', borderRadius: '2px', marginLeft: '4px' }}></span> ناقص</span>
                </div>
              </div>
            )}

            {/* Sifat Analysis Table */}
            {analysisTable.length > 0 && (
              <div style={{ background: 'white', borderRadius: '12px', marginBottom: '16px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <h4 style={{ background: '#044D29', color: 'white', padding: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={18} /> جدول تحليل صفات الحروف
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#F3F4F6' }}>
                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>الفونيم</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>الهمس/الجهر</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>الشدة/الرخاوة</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>التفخيم/الترقيق</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>الإطباق</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>الصفير</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>القلقلة</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>التكرار</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>التفشي</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>الاستطالة</th>
                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap' }}>الغنة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisTable.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <td style={{ padding: '8px', fontFamily: 'monospace', color: '#044D29', fontWeight: 'bold' }}>{row.phonemes}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_hams_or_jahr} actual={row.hams_or_jahr} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_shidda_or_rakhawa} actual={row.shidda_or_rakhawa} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_tafkheem_or_taqeeq} actual={row.tafkheem_or_taqeeq} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_itbaq} actual={row.itbaq} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_safeer} actual={row.safeer} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_qalqla} actual={row.qalqla} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_tikraar} actual={row.tikraar} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_tafashie} actual={row.tafashie} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_istitala} actual={row.istitala} />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <SifatBadge expected={row.exp_ghonna} actual={row.ghonna} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Phoneme Comparison Text */}
            {mistakes.find(m => m.type === 'مقارنة الفونيمات') && phonemeDiffs.length === 0 && (
              <div style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', padding: '24px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #10B981' }}>
                <h4 style={{ color: '#065F46', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={18} /> مقارنة الفونيمات
                </h4>
                <pre style={{ fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'pre-wrap', color: '#047857', direction: 'ltr', background: 'white', padding: '16px', borderRadius: '8px' }}>
                  {mistakes.find(m => m.type === 'مقارنة الفونيمات')?.correction}
                </pre>
              </div>
            )}

            {/* Other Results */}
            {mistakes.filter(m => m.type !== 'مقارنة الفونيمات').map((m, i) => (
              <div key={i} style={{
                background: m.type.includes('صفة') ? '#FEF3C7' : '#F0FDF4',
                padding: '16px',
                borderRadius: '8px',
                borderRight: `4px solid ${m.type.includes('صفة') ? '#F59E0B' : '#10B981'}`,
                marginBottom: '12px'
              }}>
                <strong style={{ color: m.type.includes('صفة') ? '#92400E' : '#065F46' }}>
                  {m.type}:
                </strong>
                <span style={{ marginRight: '8px', color: '#374151', fontFamily: m.type === 'النص المفهوم' ? 'Amiri' : 'inherit' }}>{m.correction}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const ProgressView = () => (
  <div className="animate-fade-in">
    <h2 style={{ fontSize: '28px', color: '#044D29', marginBottom: '32px', fontFamily: 'Amiri' }}>لوحة الإحصائيات المتقدمة</h2>
    <div className="stats-row">
      <div className="stat-box"> <CheckCircle size={32} color="#044D29" /> <div className="stat-value-big">92%</div> <div style={{ color: '#6B7280' }}>الدقة الأسبوعية</div> </div>
      <div className="stat-box"> <TrendingUp size={32} color="#044D29" /> <div className="stat-value-big">+5%</div> <div style={{ color: '#6B7280' }}>تحسن في الأداء</div> </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
      <div className="glass-panel" style={{ padding: '32px' }}> <h3 style={{ marginBottom: '24px', color: '#044D29', display: 'flex', alignItems: 'center', gap: '10px' }}> <BarChart3 /> الأداء الأسبوعي </h3> <div style={{ height: 300 }}> <ResponsiveContainer width="100%" height="100%"> <BarChart data={progressData}> <CartesianGrid strokeDasharray="3 3" opacity={0.3} /> <XAxis dataKey="day" /> <YAxis /> <Tooltip /> <Bar dataKey="score" fill="#044D29" radius={[4, 4, 0, 0]} /> </BarChart> </ResponsiveContainer> </div> </div>
      <div className="glass-panel" style={{ padding: '32px' }}> <h3 style={{ marginBottom: '24px', color: '#044D29', display: 'flex', alignItems: 'center', gap: '10px' }}> <TrendingUp /> تطور الدقة </h3> <div style={{ height: 300 }}> <ResponsiveContainer width="100%" height="100%"> <LineChart data={accuracyTrend}> <CartesianGrid strokeDasharray="3 3" opacity={0.3} /> <XAxis dataKey="session" /> <YAxis domain={[0, 100]} /> <Tooltip /> <Line type="monotone" dataKey="acc" stroke="#D4AF37" strokeWidth={3} dot={{ r: 6 }} /> </LineChart> </ResponsiveContainer> </div> </div>
    </div>
  </div>
);

// --- Quiz Component ---
const QuizView = ({ lessonTitle, onFinish, onCancel }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);

  // Mock Question Database
  const allQuestions = {
    'أحكام النون الساكنة': [
      { question: 'ما هو الحكم التجويدي عند التقاء النون الساكنة بحرف الباء؟', options: ['الإظهار', 'الإقلاب', 'الإدغام', 'الإخفاء'], correct: 1 },
      { question: 'كم عدد حروف الإدغام؟', options: ['4', '5', '6', '2'], correct: 2 },
      { question: 'أي من الحروف التالية من حروف الإظهار الحلقي؟', options: ['ق', 'ل', 'هـ', 'م'], correct: 2 },
      { question: 'ما هو الحكم في قوله تعالى: "من يقول"؟', options: ['إدغام بغنة', 'إدغام بغير غنة', 'إخفاء', 'إظهار'], correct: 0 },
    ],
    'default': [
      { question: 'هذا مجرد سؤال اختباري لتجربة النظام.', options: ['خيار 1', 'خيار 2', 'خيار 3', 'خيار 4'], correct: 0 },
      { question: 'سؤال آخر للتجربة.', options: ['أ', 'ب', 'ج', 'د'], correct: 1 },
    ]
  };

  const questions = allQuestions[lessonTitle] || allQuestions['default'];
  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerClick = (index) => {
    if (isAnswerChecked) return;
    setSelectedAnswer(index);
    setIsAnswerChecked(true);
    if (index === currentQuestion.correct) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
    } else {
      setShowScore(true);
    }
  };

  if (showScore) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: score > questions.length / 2 ? '#ECFDF5' : '#FEF2F2', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {score > questions.length / 2 ? <CheckCircle size={40} color="#10B981" /> : <XCircle size={40} color="#DC2626" />}
        </div>
        <h2 style={{ fontSize: '24px', fontFamily: 'Amiri', marginBottom: '16px', color: '#044D29' }}>
          {score > questions.length / 2 ? 'أحسنت! أداء ممتاز' : 'حاول مرة أخرى'}
        </h2>
        <p style={{ fontSize: '18px', color: '#374151', marginBottom: '32px' }}>
          لقد أجبت بشكل صحيح على {score} من أصل {questions.length} أسئلة
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ padding: '12px 32px', background: 'transparent', border: '1px solid #D1D5DB', borderRadius: '8px', color: '#374151', cursor: 'pointer' }}>
            العودة للدرس
          </button>
          <button onClick={onFinish} style={{ padding: '12px 32px', background: '#044D29', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
            إنهاء
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: '#6B7280' }}>سؤال {currentQuestionIndex + 1} من {questions.length}</span>
        <span style={{ fontSize: '14px', color: '#D4AF37', fontWeight: 'bold' }}>اختبار نظري: {lessonTitle}</span>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontFamily: 'Amiri', lineHeight: '1.6', color: '#1F2937' }}>{currentQuestion.question}</h3>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {currentQuestion.options.map((option, index) => {
          let backgroundColor = 'white';
          let borderColor = '#E5E7EB';
          let textColor = '#374151';

          if (isAnswerChecked) {
            if (index === currentQuestion.correct) {
              backgroundColor = '#ECFDF5';
              borderColor = '#10B981';
              textColor = '#065F46';
            } else if (index === selectedAnswer) {
              backgroundColor = '#FEF2F2';
              borderColor = '#EF4444';
              textColor = '#991B1B';
            }
          } else if (selectedAnswer === index) {
            borderColor = '#D4AF37';
            backgroundColor = '#FFFBEB';
          }

          return (
            <button key={index}
              onClick={() => handleAnswerClick(index)}
              disabled={isAnswerChecked}
              style={{
                padding: '16px',
                textAlign: 'right',
                background: backgroundColor,
                border: `2px solid ${borderColor}`,
                borderRadius: '12px',
                cursor: isAnswerChecked ? 'default' : 'pointer',
                color: textColor,
                fontSize: '16px',
                fontFamily: 'IBM Plex Sans Arabic',
                transition: 'all 0.2s'
              }}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
        <button onClick={onCancel} style={{ padding: '10px 20px', background: 'transparent', color: '#6B7280', border: 'none', cursor: 'pointer' }}>إلغاء</button>
        {isAnswerChecked && (
          <button onClick={handleNext} style={{ padding: '10px 32px', background: '#044D29', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentQuestionIndex < questions.length - 1 ? 'السؤال التالي' : 'عرض النتيجة'} <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}
      </div>
    </div>
  );
};

const LessonDetailView = ({ lesson, onBack }) => {
  const [isQuizActive, setIsQuizActive] = useState(false);

  if (isQuizActive) {
    return (
      <div className="glass-panel" style={{ padding: '40px' }}>
        <QuizView
          lessonTitle={lesson.title}
          onFinish={() => setIsQuizActive(false)}
          onCancel={() => setIsQuizActive(false)}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#6B7280', marginBottom: '20px', cursor: 'pointer', fontSize: '16px' }}>
        <ArrowRight size={20} /> العودة للدروس
      </button>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ background: '#000', width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {/* Placeholder for Video Player */}
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
              <Play size={40} fill="white" />
            </div>
            <h3 style={{ fontSize: '24px', fontFamily: 'Amiri' }}>شرح درس {lesson.title}</h3>
            <p style={{ opacity: 0.8 }}>اضغط للمشاهدة</p>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <h2 style={{ color: '#044D29', fontSize: '28px', fontFamily: 'Amiri', marginBottom: '8px' }}>{lesson.title}</h2>
          <p style={{ color: '#374151' }}>{lesson.description}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Theoretical Section */}
        <div className="glass-panel" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '5px', background: '#3B82F6' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#EFF6FF', padding: '10px', borderRadius: '12px' }}><BookOpen color="#3B82F6" size={24} /></div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937' }}>القسم النظري</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>اختبر فهمك للقاعدة</p>
            </div>
          </div>
          <p style={{ color: '#4B5563', marginBottom: '24px', lineHeight: '1.6' }}>
            مجموعة من الأسئلة التفاعلية للتأكد من فهمك الصحيح لقواعد {lesson.title} وحالاتها المختلفة.
          </p>
          <button onClick={() => setIsQuizActive(true)} style={{ width: '100%', padding: '12px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            ابدأ الاختبار النظري <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </div>

        {/* Practical Section */}
        <div className="glass-panel" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '5px', background: '#10B981' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#ECFDF5', padding: '10px', borderRadius: '12px' }}><Mic color="#10B981" size={24} /></div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1F2937' }}>القسم العملي</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>تدريب صوتي على التلاوة</p>
            </div>
          </div>
          <p style={{ color: '#4B5563', marginBottom: '24px', lineHeight: '1.6' }}>
            تدريب عملي باستخدام الذكاء الاصطناعي لتصحيح نطقك لأمثلة من القرآن الكريم.
          </p>
          <button disabled style={{ width: '100%', padding: '12px', background: '#E5E7EB', color: '#9CA3AF', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            قريباً <Lock size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const LessonCard = ({ lesson, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="glass-panel"
      onClick={onSelect}
      style={{
        padding: '24px',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.6)',
        background: 'rgba(255,255,255,0.85)',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-5px)' : 'none',
        borderColor: isHovered ? '#D4AF37' : 'rgba(255,255,255,0.6)',
        boxShadow: isHovered ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ background: '#F3F4F6', padding: 10, borderRadius: '12px' }}>{lesson.icon}</div>
        <span style={{ fontSize: '12px', color: '#6B7280', background: '#e5e7eb', padding: '4px 8px', borderRadius: '4px' }}>{lesson.duration}</span>
      </div>
      <h3 style={{ fontSize: '20px', color: '#1F2937', marginBottom: 8, fontFamily: 'Amiri' }}>{lesson.title}</h3>
      <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: 16 }}>{lesson.description}</p>
      <button
        style={{
          width: '100%',
          padding: '10px',
          background: isHovered ? '#D4AF37' : 'transparent',
          border: '1px solid #D4AF37',
          color: isHovered ? 'white' : '#D4AF37',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.3s'
        }}
      >
        ابدأ الدرس
      </button>
    </div>
  );
};

const LessonsView = ({ selectedLesson, onSelectLesson }) => {
  const lessons = [
    { title: 'أحكام النون الساكنة', description: 'تعلم الإظهار، الإدغام، الإقلاب، والإخفاء.', icon: <BookOpen color="#10B981" />, duration: '15 دقيقة' },
    { title: 'القلقلة', description: 'مراتب القلقلة وحروفها (قطب جد).', icon: <BookOpen color="#F59E0B" />, duration: '10 دقائق' },
    { title: 'المدود', description: 'أنواع المدود وأزمنتها المختلفة.', icon: <BookOpen color="#3B82F6" />, duration: '20 دقيقة' },
    { title: 'التفخيم والترقيق', description: 'الحروف المفخمة والمرققة دائماً.', icon: <BookOpen color="#EF4444" />, duration: '12 دقيقة' },
    { title: 'أحكام الميم الساكنة', description: 'الإخفاء الشفوي، إدغام المثلين، الإظهار.', icon: <BookOpen color="#6B7280" />, duration: '14 دقيقة' },
  ];

  const activeLesson = selectedLesson ? lessons.find(l => l.title === selectedLesson) : null;

  if (activeLesson) {
    return <LessonDetailView lesson={activeLesson} onBack={() => onSelectLesson(null)} />;
  }

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '28px', color: '#044D29', marginBottom: '32px', fontFamily: 'Amiri' }}>مكتبة الدروس التفاعلية</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {lessons.map((lesson, index) => (
          <LessonCard key={index} lesson={lesson} onSelect={() => onSelectLesson(lesson.title)} />
        ))}
      </div>
    </div>
  );
};

// --- Main Application Component ---
const QuranTajweedApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [userProgress, setUserProgress] = useState(generateInitialProgress());
  const [showSplash, setShowSplash] = useState(true);
  const [surahs, setSurahs] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMistakesModalOpen, setIsMistakesModalOpen] = useState(false); // HOISTED STATE
  const [selectedLesson, setSelectedLesson] = useState(null); // New Navigation State
  const [toast, setToast] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => { setShowSplash(false); }, 2500);
    const savedUser = localStorage.getItem('tajweed_user');
    if (savedUser) { setCurrentUser(JSON.parse(savedUser)); setIsLoggedIn(true); }
    fetch('https://api.quran.com/api/v4/chapters?language=ar').then(res => res.json()).then(data => { if (data.chapters) setSurahs(data.chapters); }).catch(err => console.error("Error fetching chapters:", err));
    return () => clearTimeout(timer);
  }, []);

  const [selectedSurah, setSelectedSurah] = useState('');
  const [selectedReciter, setSelectedReciter] = useState('ar.alafasy');
  const [fromVerse, setFromVerse] = useState('');
  const [toVerse, setToVerse] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mistakes, setMistakes] = useState([]);
  const [showSurahList, setShowSurahList] = useState(false);
  const [showReciterList, setShowReciterList] = useState(false);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState(null);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [currentVerseWords, setCurrentVerseWords] = useState([]);
  const [analysisTable, setAnalysisTable] = useState([]); // Sifat analysis table
  const [liveTranscription, setLiveTranscription] = useState(null); // WhisperX live text
  const [phonemeDiffs, setPhonemeDiffs] = useState([]); // Phoneme diff visualization
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const wsRef = useRef(null); // WebSocket for live transcription
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);

  // --- LIFTED STATE FOR PRACTICE VIEW (Shared with Voice Assistant) ---
  const [listenSurah, setListenSurah] = useState(null);
  const [listenFromVerse, setListenFromVerse] = useState(1);
  const [listenToVerse, setListenToVerse] = useState(null);
  const [showListenSurahList, setShowListenSurahList] = useState(false);
  const [listenSurahSearch, setListenSurahSearch] = useState('');

  const handleLoginSuccess = (user) => { setIsLoggedIn(true); setCurrentUser(user); setActiveTab('home'); };
  const handleLogout = () => { setIsLoggedIn(false); setCurrentUser(null); localStorage.removeItem('tajweed_user'); setActiveTab('home'); };
  const openAuthModal = () => { setIsAuthModalOpen(true); }; // Corrected from setShowAuthModal
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleNavigateToLesson = (lessonName) => {
    // Logic to select lesson and navigate
    // Assuming onSelectLesson is handled inside LessonsView or passed down
    // Ideally we set active lesson then switch tab
    setSelectedLesson(lessonName); // Added this line to set the selected lesson
    setActiveTab('lessons');
    setIsMistakesModalOpen(false); // Corrected from setShowMistakesModal
  };

  const playVerse = (verseNum) => {
    if (!selectedReciter) { showToast('الرجاء اختيار القارئ أولاً'); return; }
    if (!selectedSurah) { showToast('الرجاء اختيار السورة أولاً'); return; }
    const reciter = reciters.find(r => r.id == selectedReciter);
    if (!reciter) { showToast('القارئ غير موجود'); return; }
    const pad = (num) => num.toString().padStart(3, '0');
    const url = `https://everyayah.com/data/${reciter.subfolder}/${pad(selectedSurah)}${pad(verseNum)}.mp3`;
    const textUrl = `https://api.quran.com/api/v4/verses/by_key/${selectedSurah}:${verseNum}?language=en&words=true&word_fields=text_uthmani`;
    fetch(textUrl).then(res => res.json()).then(data => { if (data.verse && data.verse.words) { setCurrentVerseWords(data.verse.words); } });
    setCurrentPlayingAudio(url); setIsPlaying(true); setCurrentVerseIndex(parseInt(verseNum));
  };

  const handleStopRecitation = () => {
    setIsPlaying(false);
    setCurrentPlayingAudio(null);
  };

  const handlePlayReference = () => {
    if (!selectedSurah) { showToast('يرجى تحديد السورة'); return; }

    // Resume/Pause toggle logic
    if (currentPlayingAudio) {
      setIsPlaying(!isPlaying);
      return;
    }

    // Start new playback
    let start = fromVerse;
    if (!fromVerse || !toVerse) {
      const surahObj = surahs.find(s => s.id === selectedSurah);
      if (surahObj) {
        if (!fromVerse) { start = 1; setFromVerse(1); }
        if (!toVerse) { setToVerse(surahObj.verses_count); }
        showToast(`جارٍ تشغيل سورة ${surahObj.name_arabic} كاملة...`);
      }
    } else { if (parseInt(fromVerse) > parseInt(toVerse)) { showToast('عفواً.. رقم آية البداية أكبر من النهاية'); return; } }
    playVerse(start);
  };
  const handleAudioEnded = () => { const end = parseInt(toVerse || 999); if (currentVerseIndex < end) { playVerse(currentVerseIndex + 1); } else { setIsPlaying(false); setCurrentPlayingAudio(null); } };

  const handleNextVerse = () => {
    if (currentVerseIndex < parseInt(toVerse || 999)) {
      playVerse(currentVerseIndex + 1);
    } else {
      showToast('وصلت لنهاية المقطع المحدد');
    }
  };

  const handlePrevVerse = () => {
    if (currentVerseIndex > parseInt(fromVerse || 1)) {
      playVerse(currentVerseIndex - 1);
    } else {
      showToast('هذه أول آية في المقطع المحدد');
    }
  };
  // Helper to communicate with Quran Muaalem FastAPI server
  const submitToMualem = async (audioBlob, sura, aya, start, numWords) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('sura_idx', sura);
      formData.append('aya_idx', aya);
      formData.append('start_word_idx', start);
      formData.append('num_words', numWords);

      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Server error");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error submitting to Muaalem:", error);
      throw error;
    }
  };

  const handleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      // Stop Speech Recognition
      if (wsRef.current && typeof wsRef.current.stop === 'function') {
        try {
          wsRef.current.stop();
        } catch (e) {
          console.log('Error stopping speech recognition:', e);
        }
      }

      setIsRecording(false);
    } else {
      // Start recording
      try {
        setLiveTranscription(null);
        setAnalysisTable([]);
        setPhonemeDiffs([]);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };


        // Setup Web Speech API for live transcription (browser-based, no server needed)
        try {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'ar-SA'; // Arabic
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event) => {
              let transcript = '';
              for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
              }
              setLiveTranscription(transcript);
            };

            recognition.onerror = (e) => console.log('Speech recognition error:', e.error);
            recognition.onend = () => console.log('Speech recognition ended');

            recognition.start();
            wsRef.current = recognition; // Store reference for stopping later
            console.log('Web Speech API started for live transcription');
          } else {
            console.log('Web Speech API not supported');
          }
        } catch (speechErr) {
          console.log('Live transcription not available:', speechErr);
        }

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          showToast("جاري تحليل التلاوة...");

          try {
            const suraIdx = selectedSurah || 1;
            const ayaIdx = fromVerse || currentVerseIndex || 1;
            const startIdx = 0;
            const numWords = currentVerseWords.length || 10;

            const result = await submitToMualem(audioBlob, suraIdx, ayaIdx, startIdx, numWords);
            console.log("API Result:", result); // Debug log

            if (result) {
              // Save analysis table for matrix display
              console.log("analysis_table:", result.analysis_table); // Debug
              console.log("diffs:", result.diffs); // Debug

              if (result.analysis_table && result.analysis_table.length > 0) {
                setAnalysisTable(result.analysis_table);
              }

              // Save phoneme diffs for visualization
              if (result.diffs && result.diffs.length > 0) {
                setPhonemeDiffs(result.diffs);
              }

              const analysisDetails = [];

              // Add phoneme comparison
              if (result.prediction && result.reference) {
                analysisDetails.push({
                  verse: ayaIdx,
                  type: "مقارنة الفونيمات",
                  correction: `المرجع: ${result.reference.phonemes}\nتلاوتك: ${result.prediction.phonemes}`,
                });
              }

              // Add transcription if available
              if (result.transcription && !result.transcription.error && result.transcription.segments) {
                const text = result.transcription.segments.map(s => s.text).join(' ');
                analysisDetails.push({
                  verse: ayaIdx,
                  type: "النص المفهوم",
                  correction: text,
                });
              }

              setMistakes(analysisDetails.length > 0 ? analysisDetails : [{
                verse: ayaIdx,
                type: "تقرير المصحح الآلي",
                correction: "تم تحليل التلاوة بنجاح",
              }]);

              showToast("تم التحليل بنجاح");
            }
          } catch (error) {
            console.error("API Error:", error);
            showToast(`فشل الاتصال: ${error.message || 'تأكد من تشغيل الخادم'}`);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        showToast("لا يمكن الوصول للميكروفون");
      }
    }
  };

  const handleVoiceAction = (action, params) => {
    console.log("Voice Action:", action, params);

    switch (action) {
      case 'navigate':
        if (params.page && ['home', 'lessons', 'practice', 'progress'].includes(params.page)) {
          setActiveTab(params.page);
          setSelectedLesson(null); // Clear lesson selection when navigating
        }
        break;

      case 'select_lesson':
        if (params.lesson_id) {
          setActiveTab('lessons');
          setSelectedLesson(params.lesson_id);
        }
        break;

      case 'go_back':
        if (selectedLesson) {
          setSelectedLesson(null);
        } else if (activeTab !== 'home') {
          setActiveTab('home');
        }
        break;

      case 'read_page':
        // Backend already responded with audio
        break;

      case 'select_surah':
        if (params.surah_id) {
          const s = surahs.find(sur => sur.id === Number(params.surah_id));
          if (s) {
            setListenSurah(s);
            setSelectedSurah(s.id);
            setFromVerse(1);
            setToVerse(s.verses_count);
            setActiveTab('practice');
          }
        }
        break;

      case 'set_verses':
        if (params.from) setFromVerse(Number(params.from));
        if (params.to) setToVerse(Number(params.to));
        if (params.from) setListenFromVerse(Number(params.from));
        if (params.to) setListenToVerse(Number(params.to));
        break;

      case 'select_reciter':
        if (params.reciter_id) {
          setSelectedReciter(Number(params.reciter_id));
        }
        break;

      case 'play':
        if (!isPlaying) handlePlayReference();
        break;

      case 'pause':
        if (isPlaying) handleStopRecitation();
        break;

      case 'start_recording':
        if (!isRecording) handleRecording();
        break;

      case 'stop_recording':
        if (isRecording) handleRecording();
        break;

      case 'help':
        break;

      default:
        break;
    }
  };

  return (
    <div className="app-layout">
      <SplashScreen show={showSplash} />
      <Toast message={toast} />

      {/* GLOBAL MODALS */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={handleLoginSuccess} />
      <MistakesModal isOpen={isMistakesModalOpen} onClose={() => setIsMistakesModalOpen(false)} onNavigateToLesson={handleNavigateToLesson} />

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} isLoggedIn={isLoggedIn} onOpenAuth={openAuthModal} handleLogout={handleLogout} currentUser={currentUser} />

      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {activeTab === 'home' && (<HomeView isLoggedIn={isLoggedIn} currentUser={currentUser} setActiveTab={setActiveTab} onOpenAuth={openAuthModal} onOpenMistakes={() => setIsMistakesModalOpen(true)} />)}
          {activeTab === 'practice' && (
            <PracticeView
              surahs={surahs} selectedSurah={selectedSurah} setSelectedSurah={setSelectedSurah}
              showSurahList={showSurahList} setShowSurahList={setShowSurahList}
              selectedReciter={selectedReciter} setSelectedReciter={setSelectedReciter}
              showReciterList={showReciterList} setShowReciterList={setShowReciterList}
              fromVerse={fromVerse} setFromVerse={setFromVerse}
              toVerse={toVerse} setToVerse={setToVerse}
              isPlaying={isPlaying} handlePlayReference={handlePlayReference} handleStopRecitation={handleStopRecitation}
              currentPlayingAudio={currentPlayingAudio} isRecording={isRecording}
              handleRecording={handleRecording} mistakes={mistakes}
              currentVerseWords={currentVerseWords} currentVerseIndex={currentVerseIndex}
              handleAudioEnded={handleAudioEnded}
              handleNextVerse={handleNextVerse}
              handlePrevVerse={handlePrevVerse}
              analysisTable={analysisTable}
              liveTranscription={liveTranscription}
              phonemeDiffs={phonemeDiffs}
              listenSurah={listenSurah}
              setListenSurah={setListenSurah}
              listenFromVerse={listenFromVerse}
              setListenFromVerse={setListenFromVerse}
              listenToVerse={listenToVerse}
              setListenToVerse={setListenToVerse}
              showListenSurahList={showListenSurahList}
              setShowListenSurahList={setShowListenSurahList}
              listenSurahSearch={listenSurahSearch}
              setListenSurahSearch={setListenSurahSearch}
            />
          )}
          {activeTab === 'lessons' && <LessonsView selectedLesson={selectedLesson} onSelectLesson={setSelectedLesson} />}
          {activeTab === 'progress' && <ProgressView />}
        </div>
        <Footer />
        <VoiceAssistant
          currentPage={activeTab}
          onNavigate={(page) => handleVoiceAction('navigate', { page })}
          onAction={handleVoiceAction}
        />
      </main>
    </div>
  );
};

export default QuranTajweedApp;
