import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './index.css';

// Store
import useAppStore from './store/useAppStore';

// Utils
import { pageVariants } from './utils/animations';

// Lottie
import Lottie from 'lottie-react';
import loadingAnimation from './assets/lottie/loading.json';

// Components (loaded eagerly — always visible)
import SplashScreen from './components/SplashScreen';
import Toast from './components/Toast';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import MistakesModal from './components/MistakesModal';
import AuthModal from './components/AuthModal';

// Pages (lazy loaded — only fetched when route is visited)
const HomeView = lazy(() => import('./pages/HomeView'));
const PracticeView = lazy(() => import('./pages/PracticeView'));
const ProgressView = lazy(() => import('./pages/ProgressView'));
const LessonsView = lazy(() => import('./pages/LessonsView'));
const LessonDetailView = lazy(() => import('./pages/LessonDetailView'));
const QuizView = lazy(() => import('./pages/QuizView'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TafseerView = lazy(() => import('./pages/TafseerView'));
const LiveMoshafView = lazy(() => import('./pages/LiveMoshafView'));
const PracticalQuizView = lazy(() => import('./pages/PracticalQuizView'));

// --- Main Application Component ---
const QuranTajweedApp = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // --- Store state ---
  const showSplash = useAppStore(s => s.showSplash);
  const hideSplash = useAppStore(s => s.hideSplash);
  const toast = useAppStore(s => s.toast);
  const showToast = useAppStore(s => s.showToast);
  const isAuthModalOpen = useAppStore(s => s.isAuthModalOpen);
  const closeAuthModal = useAppStore(s => s.closeAuthModal);
  const loginSuccess = useAppStore(s => s.loginSuccess);

  const isMistakesModalOpen = useAppStore(s => s.isMistakesModalOpen);
  const closeMistakesModal = useAppStore(s => s.closeMistakesModal);
  const selectedLesson = useAppStore(s => s.selectedLesson);
  const setSelectedLesson = useAppStore(s => s.setSelectedLesson);
  const setSurahs = useAppStore(s => s.setSurahs);


  // Recording refs (can't go in Zustand — refs are mutable & non-serializable)
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => { hideSplash(); }, 2500);

    fetch('https://api.quran.com/api/v4/chapters?language=ar')
      .then(res => res.json())
      .then(data => { if (data.chapters) setSurahs(data.chapters); })
      .catch(err => console.error("Error fetching chapters:", err));
    return () => clearTimeout(timer);
  }, []);



  const handleNavigateToLesson = (lessonName) => {
    setSelectedLesson(lessonName);
    navigate('/lessons');
    closeMistakesModal();
  };

  // --- Recording handler (uses refs, so stays in component) ---
  const handleRecording = async () => {
    const store = useAppStore.getState();

    if (!store.isLoggedIn) {
      store.openAuthModal();
      return;
    }

    if (store.isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (wsRef.current && typeof wsRef.current.stop === 'function') {
        try { wsRef.current.stop(); } catch (e) { console.log('Error stopping speech recognition:', e); }
      }
      useAppStore.setState({ isRecording: false });
    } else {
      try {
        useAppStore.setState({ liveTranscription: null, analysisTable: [], phonemeDiffs: [] });

        const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        // Setup Web Speech API for live transcription
        try {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'ar-SA';
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event) => {
              let transcript = '';
              for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
              }
              useAppStore.setState({ liveTranscription: transcript });
            };

            recognition.onerror = (e) => console.log('Speech recognition error:', e.error);
            recognition.onend = () => console.log('Speech recognition ended');

            recognition.start();
            wsRef.current = recognition;
          }
        } catch (speechErr) {
          console.log('Live transcription not available:', speechErr);
        }

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          showToast("جاري تحليل التلاوة...");

          try {
            const s = useAppStore.getState();
            const suraIdx = s.selectedSurah || 1;
            const ayaIdx = s.fromVerse || s.currentVerseIndex || 1;
            const startIdx = 0;
            const numWords = s.currentVerseWords.length || 10;

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            formData.append('sura_idx', suraIdx);
            formData.append('aya_idx', ayaIdx);
            formData.append('start_word_idx', startIdx);
            formData.append('num_words', numWords);

            const response = await fetch("http://127.0.0.1:8888/analyze", { method: "POST", body: formData });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.detail || "Server error"); }
            const result = await response.json();

            if (result) {
              if (result.analysis_table && result.analysis_table.length > 0) {
                useAppStore.setState({ analysisTable: result.analysis_table });
              }
              if (result.diffs && result.diffs.length > 0) {
                useAppStore.setState({ phonemeDiffs: result.diffs });
              }

              const analysisDetails = [];
              if (result.prediction && result.reference) {
                analysisDetails.push({ verse: ayaIdx, type: "مقارنة الفونيمات", correction: `المرجع: ${result.reference.phonemes}\nتلاوتك: ${result.prediction.phonemes}` });
              }
              if (result.transcription && !result.transcription.error && result.transcription.segments) {
                const text = result.transcription.segments.map(s => s.text).join(' ');
                analysisDetails.push({ verse: ayaIdx, type: "النص المفهوم", correction: text });
              }
              useAppStore.setState({
                mistakes: analysisDetails.length > 0 ? analysisDetails : [{ verse: ayaIdx, type: "تقرير المصحح الآلي", correction: "تم تحليل التلاوة بنجاح" }]
              });
              showToast("تم التحليل بنجاح");
            }
          } catch (error) {
            console.error("API Error:", error);
            showToast(`فشل الاتصال: ${error.message || 'تأكد من تشغيل الخادم'}`);
          }
        };

        mediaRecorderRef.current.start();
        useAppStore.setState({ isRecording: true });
      } catch (err) {
        console.error("Error accessing microphone:", err);
        showToast("لا يمكن الوصول للميكروفون");
      }
    }
  };

  const isAdminPath = location.pathname.startsWith('/admin');

  return (
    <div className="app-layout">
      <SplashScreen show={showSplash} />
      <Toast message={toast} />

      {/* GLOBAL MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onLogin={(user, token, selectedRole) => {
          loginSuccess(user, token);
          if (selectedRole === 'admin' && user.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }}
      />
      <MistakesModal isOpen={isMistakesModalOpen} onClose={closeMistakesModal} onNavigateToLesson={handleNavigateToLesson} />

      {/* Hide global components for Admin routes */}
      {!isAdminPath && <Navbar />}

      <main className={isAdminPath ? "admin-layout-wrapper" : "main-content"} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <Lottie animationData={loadingAnimation} loop={true} style={{ width: 80, height: 80 }} />
            </div>
          }>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <HomeView />
                  </motion.div>
                } />
                <Route path="/practice" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <PracticeView handleRecording={handleRecording} />
                  </motion.div>
                } />
                <Route path="/live-moshaf" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <LiveMoshafView />
                  </motion.div>
                } />
                <Route path="/lessons" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <LessonsView />
                  </motion.div>
                } />
                <Route path="/lessons/:lessonId" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <LessonDetailView />
                  </motion.div>
                } />
                <Route path="/lessons/:lessonId/quiz" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <QuizView />
                  </motion.div>
                } />
                <Route path="/progress" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <ProgressView />
                  </motion.div>
                } />
                <Route path="/admin" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <AdminDashboard />
                  </motion.div>
                } />
                <Route path="/tafseer" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <TafseerView />
                  </motion.div>
                } />
                <Route path="/practical-quiz/:errorType" element={
                  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <PracticalQuizView />
                  </motion.div>
                } />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </div>
        {!isAdminPath && <Footer />}
      </main>
    </div>
  );
};

export default QuranTajweedApp;
