'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Mic, ArrowRight, AlertCircle, X, Info, Square, CheckCircle, XCircle, ChevronDown, Minus } from 'lucide-react';
import useAppStore from '../../../../store/useAppStore';
import { WS_BASE } from '../../../../utils/apiConfig';
import { reciters } from '../../../../utils/data';
import { useOnClickOutside } from '../../../../hooks/useOnClickOutside';

const SURAH_NAMES = [
  "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
  "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
  "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
  "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
  "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
  "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
  "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
  "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
  "التكوير", "الانفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
  "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
  "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
  "المسد", "الإخلاص", "الفلق", "الناس"
];

const MUAALEM_WS_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'ws://127.0.0.1:8888/ws/stream'
    : `${WS_BASE}/ws/stream`;

export default function PracticalTestPage({ params }) {
    const paramsResolved = React.use(params);
    const lessonId = paramsResolved.lessonId;
    const router = useRouter();
    const { lessons, fetchLessons, updateUserProgress, showToast } = useAppStore();

    const [lesson, setLesson] = useState(null);
    const [currentTestIndex, setCurrentTestIndex] = useState(0);
    const [verseText, setVerseText] = useState('');
    
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [testResult, setTestResult] = useState(null); // 'passed' | 'failed' | null
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [failCount, setFailCount] = useState(0);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    const mediaRecorderRef = useRef(null);
    const wsRef = useRef(null);
    const streamRef = useRef(null);
    const audioCtxRef = useRef(null);
    const sourceRef = useRef(null);
    const processorRef = useRef(null);
    const latestStructuredCharsRef = useRef(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const failedTests = useAppStore(s => s.userProgress?.lessonProgressDetails?.[lessonId]?.practical_failed) || [];
    const dropdownRef = useRef(null);
    const recordingStartedAtRef = useRef(null);

    useOnClickOutside(dropdownRef, () => setIsDropdownOpen(false));

    const audioRef = useRef(null);

    const selectedReciter = useAppStore(s => s.selectedReciter);

    useEffect(() => {
        if (lessons.length === 0) fetchLessons();
    }, [lessons.length, fetchLessons]);

    useEffect(() => {
        if (lessons.length > 0) {
            const foundLesson = lessons.find(l => (l._id || l.id) === lessonId);
            setLesson(foundLesson);
        }
    }, [lessons, lessonId]);

    const testList = lesson?.practical_tests || [];
    const test = testList[currentTestIndex];

    const practicalProgress = useAppStore(s => s.userProgress?.practicalProgress) || {};
    const passedTestsForLesson = practicalProgress[lessonId] || [];
    const isReviewMode = test && passedTestsForLesson.includes(test.id);
    const isFailedMode = test && failedTests.includes(test.id) && !isReviewMode;

    const formatRuleName = (rule) => {
        if (!rule) return '';
        if (rule === 'ikhfa_shafawi') return 'الإخفاء الشفوي';
        if (rule === 'ghunna') return 'الغنة';
        if (rule === 'qolqola') return 'القلقلة';
        if (rule === 'idgham') return 'الإدغام';
        if (rule === 'izhar') return 'الإظهار';
        if (rule === 'ikhfa') return 'الإخفاء';
        return rule;
    };

    // Fetch verse text from Quran API
    useEffect(() => {
        if (test) {
            setVerseText(''); // Reset while fetching
            fetch(`https://api.quran.com/api/v4/verses/by_chapter/${test.surah_id}?language=ar&words=false&per_page=300&fields=text_uthmani`)
                .then(res => res.json())
                .then(data => {
                    const verse = data.verses.find(v => v.verse_number === test.verse_number);
                    if (verse) setVerseText(verse.text_uthmani);
                })
                .catch(err => console.error("Error fetching verse:", err));
        }
    }, [test]);

    const playVerseAudio = () => {
        if (!test) return;
        if (audioRef.current && isPlayingAudio) {
            audioRef.current.pause();
            setIsPlayingAudio(false);
            return;
        }
        
        const pad = (n) => String(n).padStart(3, '0');
        const reciter = reciters.find(r => r.id === selectedReciter) || reciters[0];
        const url = `https://everyayah.com/data/${reciter.subfolder}/${pad(test.surah_id)}${pad(test.verse_number)}.mp3`;
        
        const audio = new Audio(url);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => { setIsPlayingAudio(false); showToast("تعذر تشغيل الصوت"); };
        
        setIsPlayingAudio(true);
        audio.play().catch(e => {
            console.error(e);
            setIsPlayingAudio(false);
            showToast("تعذر تشغيل الصوت");
        });
        audioRef.current = audio;
    };

    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause();
        };
    }, []);

    const connectWsAndStart = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } 
            });
            streamRef.current = stream;

            const ws = new WebSocket(MUAALEM_WS_URL);
            ws.binaryType = 'arraybuffer';
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    type: 'start',
                    surah: test.surah_id,
                    from_aya: test.verse_number,
                    to_aya: test.verse_number,
                    moshaf_settings: {}
                }));

                const audioCtx = new AudioContext({ sampleRate: 16000 });
                const source = audioCtx.createMediaStreamSource(stream);
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);

                processor.onaudioprocess = (e) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        const samples = e.inputBuffer.getChannelData(0);
                        const buffer = new Float32Array(samples).buffer;
                        ws.send(buffer);
                    }
                };

                source.connect(processor);
                processor.connect(audioCtx.destination);

                audioCtxRef.current = audioCtx;
                sourceRef.current = source;
                processorRef.current = processor;

                setIsRecording(true);
                setTestResult(null);
                latestStructuredCharsRef.current = null;
                recordingStartedAtRef.current = Date.now();
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'result' || data.type === 'stopped') {
                    if (data.structured_chars) {
                        latestStructuredCharsRef.current = data.structured_chars.chars;
                    }
                }
                if (data.type === 'stopped') {
                    setIsRecording(false);
                    setIsProcessing(false);
                    analyzeResults();
                    ws.close();
                }
            };

            ws.onerror = () => {
                setIsRecording(false);
                setIsProcessing(false);
                showToast("تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.");
            };

        } catch (err) {
            console.error("Recording error:", err);
            showToast("حدث خطأ أثناء تشغيل الميكروفون");
        }
    };

    const stopRecording = () => {
        setIsProcessing(true);
        if (processorRef.current) {
            try { processorRef.current.disconnect(); } catch { }
            processorRef.current = null;
        }
        if (sourceRef.current) {
            try { sourceRef.current.disconnect(); } catch { }
            sourceRef.current = null;
        }
        const audioCtx = audioCtxRef.current;
        audioCtxRef.current = null;
        if (audioCtx && audioCtx.state !== 'closed') {
            audioCtx.close().catch(() => { });
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlayingAudio(false);
        }
    };

    const stripDiacritics = (text) => {
        if (!text) return '';
        // Remove tatweel, diacritics, small letters, and quranic marks
        return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
    };

    const analyzeResults = () => {
        if (!latestStructuredCharsRef.current) {
            setTestResult('failed');
            setFeedbackMsg('لم نتمكن من تحليل الصوت، حاول التحدث بصوت أوضح.');
            return;
        }

        const chars = latestStructuredCharsRef.current;
        const targetWordClean = stripDiacritics(test.target_word.trim());
        
        // 1. Group characters into words based on spaces
        const words = [];
        let currentWord = "";
        let currentWordStart = 0;
        
        for (let i = 0; i < chars.length; i++) {
            const isSpace = chars[i].char === ' ' || chars[i].char === '\u00A0';
            if (isSpace) {
                if (currentWord.length > 0) {
                    words.push({ text: currentWord, start: currentWordStart, end: i - 1 });
                    currentWord = "";
                }
                currentWordStart = i + 1;
            } else {
                currentWord += chars[i].char;
            }
        }
        if (currentWord.length > 0) {
            words.push({ text: currentWord, start: currentWordStart, end: chars.length - 1 });
        }

        // 2. Find the word that matches the target word (ignoring diacritics)
        let allOccurrences = [];
        for (let w of words) {
            if (stripDiacritics(w.text).includes(targetWordClean)) {
                allOccurrences.push({ start: w.start, end: w.end });
            }
        }

        let targetWordIndices = [];
        const occurrenceIndex = test.occurrence_index || 1; // Default to the first occurrence
        
        if (allOccurrences.length > 0) {
            // Pick the specific occurrence if specified (1-based index)
            if (occurrenceIndex > 0 && occurrenceIndex <= allOccurrences.length) {
                targetWordIndices = [allOccurrences[occurrenceIndex - 1]];
            } else {
                // Fallback: check all if the index is out of bounds
                targetWordIndices = allOccurrences;
            }
        }

        let hasTargetError = false;

        // 3. Check for errors ONLY inside the matched word(s)
        if (targetWordIndices.length > 0) {
            let wordWasProcessed = false;
            
            for (let bounds of targetWordIndices) {
                // Expand bounds by 1 character on each side to be safe (e.g., attached prepositions)
                for (let i = Math.max(0, bounds.start - 1); i <= Math.min(chars.length - 1, bounds.end + 1); i++) {
                    if (chars[i]) {
                        if (chars[i].status >= 2) {
                            hasTargetError = true;
                            break;
                        }
                        if (chars[i].status > 0) {
                            wordWasProcessed = true;
                        }
                    }
                }
                if (hasTargetError) break;
            }
            
            // If they didn't even read the target word (e.g., stopped early or skipped it)
            if (!hasTargetError && !wordWasProcessed) {
                hasTargetError = true;
            }
        } else {
            // Fallback: If word matching completely failed, we check if ANY error specifically matches the target rule name
            const targetRuleRaw = test.target_rule.toLowerCase();
            for (let char of chars) {
                if (char.status >= 2 && char.error_type) {
                    if (char.error_type.toLowerCase().includes(targetRuleRaw) || char.tooltip?.toLowerCase().includes(targetRuleRaw)) {
                        hasTargetError = true;
                        break;
                    }
                }
            }
        }

        if (hasTargetError) {
            setTestResult('failed');
            const newFailCount = failCount + 1;
            setFailCount(newFailCount);
            
            if (!failedTests.includes(test.id)) {
                useAppStore.getState().markPracticalTestFailed(lessonId, test.id);
            }
            
            if (newFailCount >= 2) {
                setFeedbackMsg(`للأسف لم تطبق حكم "${formatRuleName(test.target_rule)}" بشكل صحيح في كلمة "${test.target_word}". استمع لأداء الشيخ وحاول مجدداً.`);
            } else {
                setFeedbackMsg(`للأسف لم تطبق حكم "${formatRuleName(test.target_rule)}" بشكل صحيح في كلمة "${test.target_word}". حاول مرة أخرى.`);
            }
        } else {
            setTestResult('passed');
            setFeedbackMsg('أحسنت! تلاوة صحيحة وتطبيق ممتاز للحكم.');
            
            if (!passedTestsForLesson.includes(test.id)) {
                useAppStore.getState().markPracticalTestPassed(lessonId, test.id);
                
                const { updateSupabaseProgress, userProgress } = useAppStore.getState();
                const lessonIdStr = lesson._id?.toString() || lesson.id?.toString();
                const details = userProgress?.lessonProgressDetails?.[lessonIdStr] || {};
                
                const newPassedTests = [...(details.practical_passed || [])];
                if (!newPassedTests.includes(test.id)) newPassedTests.push(test.id);
                
                const isPracticalDone = newPassedTests.length === testList.length;
                const isTheoreticalDone = (details.theoretical_score || 0) >= 80;
                
                updateSupabaseProgress(lessonId, { 
                    practical_passed_add: test.id,
                    is_completed: (isPracticalDone && isTheoreticalDone)
                });
            }
        }
    };

    const handleNextTest = () => {
        if (currentTestIndex < testList.length - 1) {
            setCurrentTestIndex(currentTestIndex + 1);
            setTestResult(null);
            setFailCount(0);
            setIsPlayingAudio(false);
        } else {
            router.push('/lessons/' + lessonId);
        }
    };

    if (!lesson) {
        return (
            <div className="ui-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <BookOpen size={36} style={{ color: 'var(--ink-500)', margin: '0 auto 14px' }} />
                <h2 className="ui-title">جاري تحميل الدرس...</h2>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="ui-panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <AlertCircle size={36} style={{ color: 'var(--brass-700)', margin: '0 auto 14px' }} />
                <h2 className="ui-title">لا يوجد اختبار عملي</h2>
                <p className="mt-2 text-ink-700">لم يتم تحديد اختبار عملي لهذا الدرس بعد.</p>
                <button onClick={() => router.back()} className="hm-quiet-btn group mt-6" type="button">
                    <ArrowRight size={14} className="rotate-180 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                    <span>العودة للدرس</span>
                </button>
            </div>
        );
    }

    // Highlight the target word in the verse text
    const renderVerse = () => {
        if (!verseText) return 'جاري تحميل الآية...';
        const parts = verseText.split(test.target_word);
        if (parts.length === 1) return verseText;
        
        return (
            <span>
                {parts[0]}
                <span style={{ color: 'var(--brass-500)', fontWeight: 'bold' }}>{test.target_word}</span>
                {parts[1]}
            </span>
        );
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ui-panel" style={{ padding: 32 }}>
            <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
                <div>
                    <span className="ui-eyebrow"><Mic size={12} className="inline mr-1" /> {isReviewMode ? 'مراجعة عملية' : 'الاختبار العملي'}</span>
                    <h2 className="ui-title mt-1" style={{ fontSize: '2rem' }}>{lesson.title}</h2>
                </div>
                <div className="flex gap-2">
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 cursor-pointer transition-all shadow-sm" 
                            style={{ 
                                background: isReviewMode ? '#e6f4ea' : isFailedMode ? '#fef2f2' : '#f8fafc', 
                                color: isReviewMode ? '#044D29' : isFailedMode ? '#991b1b' : '#334155', 
                                border: isReviewMode ? '1px solid #044D29' : isFailedMode ? '1px solid #991b1b' : '1px solid #cbd5e1',
                                padding: '6px 16px',
                                borderRadius: '999px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold'
                            }}
                        >
                            {isReviewMode ? 'مراجعة' : isFailedMode ? 'إعادة' : 'اختبار'} {currentTestIndex + 1} من {testList.length}
                            <ChevronDown size={16} className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 z-50 w-64 text-right"
                                    style={{ 
                                        top: 'calc(100% + 16px)',
                                        background: 'var(--surface)', 
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        borderRadius: '12px',
                                        padding: '8px',
                                        boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}
                                >
                                    {testList.map((t, idx) => {
                                        const isPassed = passedTestsForLesson.includes(t.id);
                                        const isFailed = failedTests.includes(t.id);
                                        const isActive = currentTestIndex === idx;
                                        
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setCurrentTestIndex(idx);
                                                    setTestResult(null);
                                                    setFailCount(0);
                                                    setIsPlayingAudio(false);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="w-full text-right flex items-center justify-between transition-colors"
                                                style={{ 
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    background: isActive ? 'rgba(212, 175, 55, 0.15)' : 'transparent', 
                                                    color: 'var(--ink-900)',
                                                    border: 'none',
                                                    fontWeight: isActive ? 'bold' : 'normal'
                                                }}
                                                onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
                                                onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                                            >
                                                <span className="text-sm">السؤال {idx + 1} - {formatRuleName(t.target_rule)}</span>
                                                {isPassed ? (
                                                    <CheckCircle size={16} style={{ color: 'var(--emerald-600)' }} />
                                                ) : isFailed ? (
                                                    <XCircle size={16} style={{ color: '#dc2626' }} />
                                                ) : (
                                                    <Minus size={16} style={{ color: 'var(--ink-400)' }} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <span className="ui-badge ui-badge--gold px-3 py-1 text-sm">
                        سورة {SURAH_NAMES[test.surah_id - 1]} - آية {test.verse_number}
                    </span>
                </div>
            </div>

            <div className="ui-divider" aria-hidden />

            <div className="my-8 text-center">
                <p style={{ color: 'var(--ink-700)', fontSize: '1.1rem', marginBottom: 24 }}>
                    {test.instruction}
                </p>

                <div style={{
                    fontFamily: "'Amiri', 'Traditional Arabic', serif",
                    fontSize: 'clamp(2rem, 4vw, 34px)',
                    lineHeight: 2.4,
                    color: 'var(--ink-900)',
                    padding: '30px',
                    background: 'var(--parchment-50)',
                    borderRadius: '16px',
                    border: '1px solid var(--sand-400)',
                    marginBottom: 32
                }}>
                    <div dir="rtl" style={{ textAlign: 'center', wordSpacing: '2px' }}>
                        {renderVerse()} <span style={{ color: 'var(--brass-500)', fontSize: '0.8em', margin: '0 4px' }}>۝</span>
                    </div>
                </div>

                {!testResult && (
                    <div className="flex flex-col items-center justify-center gap-4">
                        {!isRecording ? (
                            <button
                                onClick={connectWsAndStart}
                                disabled={isProcessing}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    background: 'var(--emerald-700)', color: 'var(--parchment-50)',
                                    padding: '16px 32px', borderRadius: '999px',
                                    fontSize: '1.2rem', fontWeight: 600,
                                    cursor: isProcessing ? 'wait' : 'pointer',
                                    opacity: isProcessing ? 0.7 : 1,
                                    transition: 'all 0.2s',
                                    boxShadow: '0 8px 24px -8px rgba(45,125,82,0.6)'
                                }}
                            >
                                <Mic size={24} />
                                {isProcessing ? 'جاري التحليل...' : 'ابدأ التسجيل'}
                            </button>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <motion.div 
                                    animate={{ scale: [1, 1.1, 1] }} 
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    style={{ color: 'var(--rec-error)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold' }}
                                >
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'currentColor' }} />
                                    جاري التسجيل...
                                </motion.div>
                                <button
                                    onClick={stopRecording}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        background: 'transparent', color: 'var(--rec-error)',
                                        border: '2px solid var(--rec-error)',
                                        padding: '12px 28px', borderRadius: '999px',
                                        fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    <Square size={20} fill="currentColor" />
                                    إيقاف التحليل
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Result View */}
                <AnimatePresence>
                    {testResult && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            className={`mt-6 rounded-2xl ${testResult === 'passed' ? 'text-[var(--parchment-50)]' : 'text-red-900'}`}
                            style={{ 
                                padding: '32px 24px',
                                background: testResult === 'passed' ? 'var(--emerald-700)' : '#fef2f2',
                                color: testResult === 'passed' ? 'var(--parchment-50)' : '#991b1b',
                                border: testResult === 'passed' ? 'none' : '1px solid #fecaca'
                            }}
                        >
                            <div className="flex justify-center mb-4">
                                {testResult === 'passed' 
                                    ? <CheckCircle size={48} style={{ color: 'var(--brass-500)' }} />
                                    : <XCircle size={48} />
                                }
                            </div>
                            <h3 className="text-2xl font-bold mb-4">
                                {testResult === 'passed' ? 'ممتاز!' : 'حاول مرة أخرى'}
                            </h3>
                            <p className="text-lg opacity-90 mb-6 mt-4">{feedbackMsg}</p>
                            
                            <div className="flex justify-center gap-4 flex-wrap" style={{ marginTop: '48px' }}>
                                {testResult === 'failed' && (
                                    <>
                                        <button 
                                            onClick={() => { setTestResult(null); if (audioRef.current) audioRef.current.pause(); setIsPlayingAudio(false); }}
                                            className="transition-colors duration-200 hover:bg-gray-100"
                                            style={{ 
                                                background: 'var(--parchment-50)', color: 'var(--ink-900)',
                                                padding: '12px 32px', borderRadius: '999px',
                                                border: '1px solid var(--sand-400)', fontWeight: 'bold',
                                                cursor: 'pointer', fontSize: '1rem'
                                            }}
                                        >
                                            إعادة التسجيل
                                        </button>
                                        <button 
                                            onClick={playVerseAudio}
                                            className="transition-colors duration-200 bg-[#044D29] hover:bg-[#066b3b] text-white shadow-md hover:shadow-lg"
                                            style={{ 
                                                border: 'none', padding: '12px 32px',
                                                borderRadius: '999px', fontWeight: 'bold',
                                                cursor: 'pointer', fontSize: '1rem',
                                                opacity: isPlayingAudio ? 0.8 : 1
                                            }}
                                        >
                                            {isPlayingAudio ? 'إيقاف الصوت' : 'استمع للشيخ'}
                                        </button>
                                    </>
                                )}
                                
                                {testResult === 'passed' && (
                                    <button onClick={handleNextTest} className="ui-cta" style={{ background: 'var(--brass-500)', color: 'var(--ink-900)' }}>
                                        {currentTestIndex < testList.length - 1 ? 'الآية التالية' : 'إنهاء الاختبار والعودة'}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
            
            {/* Back Button (if not recorded yet) */}
            {!testResult && (
                <div className="mt-8 flex justify-between">
                    <button onClick={() => router.back()} className="hm-quiet-btn group" type="button">
                        <ArrowRight size={14} className="rotate-180 transform transition-transform duration-300 group-hover:-translate-x-1.5" />
                        <span>العودة للدرس</span>
                    </button>
                    {failCount >= 2 && !isRecording && (
                        <button onClick={playVerseAudio} disabled={isPlayingAudio} className="hm-quiet-btn" style={{ color: 'var(--brass-700)' }}>
                            {isPlayingAudio ? 'جاري الاستماع...' : 'استمع لأداء الشيخ'}
                        </button>
                    )}
                </div>
            )}
        </motion.div>
    );
}
