import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { speakArabic, startVoiceCommands, getRouteFromCommand, getPageNameAr } from '../utils/voiceUtils';
import useAppStore from '../store/useAppStore';

const VoiceAssistant = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const showToast = useAppStore(s => s.showToast);
  const isRecording = useAppStore(s => s.isRecording);
  const isPlaying = useAppStore(s => s.isPlaying);
  const setIsRecording = useAppStore(s => s.setIsRecording);
  const setSelectedSurah = useAppStore(s => s.setSelectedSurah);
  const setFromVerse = useAppStore(s => s.setFromVerse);
  const setToVerse = useAppStore(s => s.setToVerse);
  const playVerse = useAppStore(s => s.playVerse);
  const setSelectedReciter = useAppStore(s => s.setSelectedReciter);
  const setPracticeViewState = useAppStore(s => s.setPracticeViewState);
  const setPracticeActiveTab = useAppStore(s => s.setPracticeActiveTab);
  const surahs = useAppStore(s => s.surahs);

  // Local fallback for surahs to ensure matching always works
  const LOCAL_SURAHS = [
    { id: 1, name: 'الفاتحة' }, { id: 2, name: 'البقرة' }, { id: 3, name: 'آل عمران' },
    { id: 4, name: 'النساء' }, { id: 5, name: 'المائدة' }, { id: 18, name: 'الكهف' },
    { id: 36, name: 'يس' }, { id: 55, name: 'الرحمن' }, { id: 56, name: 'الواقعة' },
    { id: 67, name: 'الملك' }, { id: 112, name: 'الإخلاص' }, { id: 114, name: 'الناس' }
  ];

  const surahListToUse = (surahs && surahs.length > 0) ? surahs : LOCAL_SURAHS;

  const recognitionRef = useRef(null);
  const [debugText, setDebugText] = React.useState('');
  const convStepRef = useRef(null);
  const convDataRef = useRef({ mode: '', reciterId: 1, surahId: null, fromVerse: null, toVerse: null });
  const onCommandRef = useRef(null);

  // Helper to find reciter by name
  const findReciter = (text) => {
    const t = text.toLowerCase();
    if (t.includes('باسط') || t.includes('عبدالباسط')) return { id: 1, name: 'عبد الباسط عبد الصمد' };
    if (t.includes('منشاوي')) return { id: 2, name: 'محمد صديق المنشاوي' };
    if (t.includes('حصري')) return { id: 3, name: 'محمود خليل الحصري' };
    return null;
  };

  // Helper to find surah by name - FAIL-SAFE VERSION
  const findSurah = (text) => {
    const t = text.replace(/[أإآ]/g, 'ا').replace(/[ةت]/g, 'ه').replace(/\s+/g, '').toLowerCase();
    
    // Direct keyword matching for common surahs (Fail-safe)
    if (t.includes('كهف')) return { id: 18, name: 'الكهف' };
    if (t.includes('بقره')) return { id: 2, name: 'البقرة' };
    if (t.includes('عمران')) return { id: 3, name: 'آل عمران' };
    if (t.includes('ياسين') || t.includes('يس')) return { id: 36, name: 'يس' };
    if (t.includes('فاتحه')) return { id: 1, name: 'الفاتحة' };
    if (t.includes('رحمن')) return { id: 55, name: 'الرحمن' };
    if (t.includes('واقعه')) return { id: 56, name: 'الواقعة' };
    if (t.includes('ملك')) return { id: 67, name: 'الملك' };

    const clean = (str) => {
      if (!str) return "";
      return str.replace(/[أإآ]/g, 'ا').replace(/[ةت]/g, 'ه').replace(/ال/g, '').replace(/\s+/g, '').toLowerCase();
    };

    const cleanT = clean(text);
    return surahListToUse.find(s => {
      const n = clean(s.name);
      return cleanT.includes(n) || n.includes(cleanT);
    });
  };

  // Helper to extract numbers
  const extractNumber = (text) => {
    const match = text.match(/\d+/);
    if (match) return parseInt(match[0]);
    // Arabic written numbers
    if (text.includes('واحد')) return 1;
    if (text.includes('اثنين') || text.includes('اتنين')) return 2;
    if (text.includes('ثلاثه') || text.includes('تلاته')) return 3;
    if (text.includes('اربعه')) return 4;
    if (text.includes('خمسه')) return 5;
    return null;
  };

  onCommandRef.current = (transcript) => {
    const t = transcript.toLowerCase();
    setDebugText(t);

    if (t.includes('الغ') || t.includes('توقف') || t.includes('كنسل')) {
      convStepRef.current = null;
      speakArabic("تم إلغاء العملية.");
      return;
    }

    // Navigation (Highest priority - allows breaking out of conversation)
    const route = getRouteFromCommand(t);
    if (route && route !== location.pathname) {
      convStepRef.current = null; // Reset conversation if navigating away
      
      if (route === '/progress') {
        setTimeout(() => {
          speakArabic("أنت الآن في صفحة التقدم. هل تريد أن تسمع ملخص الإنجازات والأخطاء؟");
        }, 2500);
      }

      setTimeout(() => {
        navigate(route);
      }, 500);
      return;
    }

    // --- Conversational Logic ---
    const step = convStepRef.current;
    
    if (location.pathname === '/practice' && step) {
      if (step === 'ASK_MODE') {
        if (t.includes('سمع') || t.includes('استماع')) {
          convDataRef.current.mode = 'listen';
          setPracticeActiveTab('listen');
          setPracticeViewState('practice');
          speakArabic("تمام، سمع التلاوة. أي قارئ تحب أن تسمع له؟ متاح عبد الباسط، المنشاوي، والحصري.");
          convStepRef.current = 'ASK_RECITER';
        } else if (t.includes('تسميع') || t.includes('تسجيل') || t.includes('سجل')) {
          convDataRef.current.mode = 'record';
          setPracticeActiveTab('record');
          setPracticeViewState('practice');
          speakArabic("تمام، تسميع التلاوة. ما هي السورة التي تريدها؟");
          convStepRef.current = 'ASK_SURAH';
        }
        return;
      }

      if (step === 'ASK_RECITER') {
        const reciter = findReciter(t);
        if (reciter) {
          convDataRef.current.reciterId = reciter.id;
          speakArabic(`اختيار موفق، القارئ ${reciter.name}. ما هي السورة التي تريدها؟`);
          convStepRef.current = 'ASK_SURAH';
        } else {
          speakArabic("عذراً، لم أتعرف على القارئ. يرجى اختيار عبد الباسط، المنشاوي، أو الحصري.");
        }
        return;
      }

      if (step === 'ASK_SURAH') {
        const found = findSurah(t);
        if (found) {
          convDataRef.current.surahId = found.id;
          speakArabic(`تمام، سورة ${found.name}. من الآية رقم كم؟`);
          convStepRef.current = 'ASK_VERSE_FROM';
        } else {
          speakArabic(`عذراً، لم أجد سورة بهذا الاسم في قائمتي. لقد سمعت ${t}. يرجى المحاولة مرة أخرى.`);
        }
        return;
      }

      if (step === 'ASK_VERSE_FROM') {
        const num = extractNumber(t);
        if (num) {
          convDataRef.current.fromVerse = num;
          speakArabic(`من الآية ${num}. إلى الآية رقم كم؟`);
          convStepRef.current = 'ASK_VERSE_TO';
        } else {
          speakArabic("يرجى ذكر رقم الآية بوضوح.");
        }
        return;
      }

      if (step === 'ASK_VERSE_TO') {
        const num = extractNumber(t);
        if (num) {
          convDataRef.current.toVerse = num;
          speakArabic(`إلى الآية ${num}. هل أنت جاهز للبدء الآن؟`);
          convStepRef.current = 'ASK_CONFIRM';
        } else {
          speakArabic("يرجى ذكر رقم الآية بوضوح.");
        }
        return;
      }

      if (step === 'ASK_CONFIRM') {
        if (t.includes('نعم') || t.includes('جاهز') || t.includes('ايوة') || t.includes('ماشي') || t.includes('بدأ')) {
          speakArabic("بالتوفيق، نبدأ الآن.");
          const data = convDataRef.current;
          
          // Apply settings
          if (data.mode === 'listen') {
            setSelectedReciter(data.reciterId);
          }
          setSelectedSurah(data.surahId);
          setFromVerse(data.fromVerse);
          setToVerse(data.toVerse);
          
          if (data.mode === 'listen') {
            setTimeout(() => playVerse(data.fromVerse), 500);
          } else {
            // Start Live Recitation mode
            setTimeout(() => {
              navigate('/live-moshaf');
            }, 500);
          }
          convStepRef.current = null;
        }
        return;
      }
    }

    // Handle detailed stats request explicitly - Removed "قولي" and added new triggers
    const triggerKeywords = ['الملخص', 'النتائج', 'انجازاتي', 'مستوايا', 'اريد الملخص', 'ما هي النتائج', 'عملت ايه'];
    if (triggerKeywords.some(key => t.includes(key))) {
        const up = useAppStore.getState().userProgress;
        const accuracy = up.averageAccuracy || 0;
        const verses = up.versesPracticed || 0;
        const mistakes = up.totalMistakes || 0;
        
        let report = `ما شاء الله، لقد تدربت على ${verses} آية حتى الآن. `;
        if (verses > 0) {
          report += `نسبة دقتك في التلاوة هي ${accuracy} في المائة. `;
          if (mistakes > 0) {
            report += `لديك ${mistakes} من الأخطاء المسجلة، وقد قمت بتصحيح الكثير منها. استمر في الممارسة لتصل للإتقان.`;
          }
        } else {
          report += "ابدأ في التلاوة الآن لكي أستطيع تتبع تقدمك وإخبارك بإنجازاتك.";
        }
        
        speakArabic(report);
        return;
    }
  };

  useEffect(() => {
    if (isRecording || isPlaying) {
      if (recognitionRef.current) {
        if (recognitionRef.current._restartTimeout) {
          clearTimeout(recognitionRef.current._restartTimeout);
        }
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = startVoiceCommands((t) => onCommandRef.current(t), (err) => {
        console.error("Voice Error:", err);
      });
    }
  }, [isRecording, isPlaying]);

  const lastSpokenPath = useRef('');

  useEffect(() => {
    // Prevent double-speaking on mount or strict mode
    if (lastSpokenPath.current === location.pathname) return;
    
    const pageName = getPageNameAr(location.pathname);
    
    if (location.pathname === '/practice') {
      speakArabic(`أنت الآن في ${pageName}. هل تريد سمع التلاوة أم تسميع لتلاوة؟`);
      convStepRef.current = 'ASK_MODE';
    } else {
      speakArabic(`أنت الآن في ${pageName}`);
      convStepRef.current = null; // Reset if leaving practice
    }
    
    lastSpokenPath.current = location.pathname;
  }, [location.pathname]);

  return (
    <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none">
      {debugText && (
        <div className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-sans border border-white/20 shadow-2xl animate-pulse">
          🎤 {debugText}
        </div>
      )}
    </div>
  );
};

export default VoiceAssistant;
