import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Square, CheckCircle, XCircle, ArrowRight, Target, Award } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import UthmaniViewer from '../components/UthmaniViewer';
import { getErrorInfo } from '../utils/errorTypeMap';

const MUAALEM_WS_URL = 'ws://localhost:8888/ws/stream';
const API_URL = 'http://localhost:5000';

const PracticalQuizView = () => {
    const { errorType } = useParams();
    const navigate = useNavigate();
    const errorInfo = getErrorInfo(errorType);

    const [quizData, setQuizData] = useState(null);
    const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
    const [results, setResults] = useState([]); // { verse, passed: bool }
    const [isRecording, setIsRecording] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [structuredChars, setStructuredChars] = useState(null);
    const [displayUthmani, setDisplayUthmani] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(true);

    const wsRef = useRef(null);
    const audioCtxRef = useRef(null);
    const processorRef = useRef(null);
    const sourceRef = useRef(null);
    const streamRef = useRef(null);
    const pollIntervalRef = useRef(null);

    // Fetch quiz verses from backend
    useEffect(() => {
        const fetchQuiz = async () => {
            const token = localStorage.getItem('tajweed_token');
            if (!token) { navigate('/'); return; }

            try {
                const res = await fetch(`${API_URL}/api/progress/practical-quiz/${errorType}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setQuizData(data);
            } catch (err) {
                console.error('Failed to fetch quiz:', err);
            }
            setLoading(false);
        };
        fetchQuiz();
    }, [errorType, navigate]);

    const currentVerse = quizData?.verses?.[currentVerseIdx];
    const totalVerses = quizData?.verses?.length || 0;

    // WebSocket for live analysis
    const connectWs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        const ws = new WebSocket(MUAALEM_WS_URL);
        ws.binaryType = 'arraybuffer';
        ws.onopen = () => setWsConnected(true);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'started') {
                setDisplayUthmani(data.display_uthmani || data.uthmani);
            } else if (data.type === 'result') {
                if (data.structured_chars) setStructuredChars(data.structured_chars);
            } else if (data.type === 'stopped') {
                if (data.structured_chars) setStructuredChars(data.structured_chars);
            }
        };
        ws.onclose = () => setWsConnected(false);
        ws.onerror = (err) => console.error('WS error:', err);
        wsRef.current = ws;
    }, []);

    useEffect(() => {
        connectWs();
        return () => { if (wsRef.current) wsRef.current.close(); };
    }, [connectWs]);

    const handleStartRecording = async () => {
        if (!currentVerse || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        setStructuredChars(null);
        setDisplayUthmani('');

        wsRef.current.send(JSON.stringify({
            type: 'start',
            surah: currentVerse.surah_number,
            from_aya: currentVerse.ayah_number,
            to_aya: currentVerse.ayah_number,
            moshaf_settings: {}
        }));

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
            });
            streamRef.current = stream;

            const audioCtx = new AudioContext({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
                if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                const samples = e.inputBuffer.getChannelData(0);
                wsRef.current.send(new Float32Array(samples).buffer);
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);

            audioCtxRef.current = audioCtx;
            sourceRef.current = source;
            processorRef.current = processor;
            setIsRecording(true);

            pollIntervalRef.current = setInterval(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'poll' }));
                }
            }, 500);
        } catch (err) {
            console.error('Mic error:', err);
            alert('لم يتم السماح بالوصول للميكروفون');
        }
    };

    const handleStopRecording = () => {
        setIsRecording(false);
        if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
        if (processorRef.current) { try { processorRef.current.disconnect(); } catch {} }
        if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch {} }
        if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }

        // Evaluate: check if the specific error_type appeared in structured_chars
        setTimeout(() => evaluateVerse(), 1000);
    };

    const evaluateVerse = async () => {
        const chars = structuredChars?.chars || [];
        // A verse is passed ONLY if:
        // 1. No errors of the target errorType were detected (status >= 2)
        // 2. The specific characters where the rule exists were recited correctly (status === 1)
        
        const targetIndices = currentVerse?.char_indices || [];
        
        const hasTargetError = chars.some(c => c.error_type === errorType && c.status >= 2);
        
        let ruleRecitedCorrectly = true;
        if (targetIndices.length > 0) {
            // Check if all characters in the rule were recited correctly
            ruleRecitedCorrectly = targetIndices.every(idx => chars[idx] && chars[idx].status === 1);
        } else {
            // Fallback for old data: at least 50% of the verse must be correct
            const correctCount = chars.filter(c => c.status === 1).length;
            ruleRecitedCorrectly = correctCount > (chars.length * 0.5);
        }

        const passed = !hasTargetError && ruleRecitedCorrectly;

        const newResult = { verse: currentVerse, passed };
        setResults(prev => [...prev, newResult]);

        // If passed, mark as corrected in DB
        if (passed) {
            const token = localStorage.getItem('tajweed_token');
            if (token) {
                try {
                    await fetch(`${API_URL}/api/progress/mark-corrected`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            error_type: errorType,
                            surah_number: currentVerse.surah_number,
                            ayah_number: currentVerse.ayah_number,
                        })
                    });
                } catch (err) {
                    console.error('Failed to mark corrected:', err);
                }
            }
        }

        // Move to next verse or show results
        if (currentVerseIdx < totalVerses - 1) {
            setCurrentVerseIdx(prev => prev + 1);
            setStructuredChars(null);
            setDisplayUthmani('');
        } else {
            setShowResults(true);
            // Refresh progress
            useAppStore.getState().fetchUserProgress();
        }
    };

    // ═══ LOADING ═══
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-amiri">جاري تحميل الاختبار العملي...</p>
                </div>
            </div>
        );
    }

    // ═══ NO VERSES ═══
    if (!quizData?.verses?.length) {
        return (
            <div className="glass-panel p-12 text-center max-w-lg mx-auto mt-10">
                <CheckCircle size={56} className="text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-amiri text-primary mb-3">ممتاز! لا توجد أخطاء</h2>
                <p className="text-gray-500 mb-6">
                    لم نجد أخطاء مسجلة من النوع "{errorInfo?.name || errorType}" تحتاج تصحيح.
                </p>
                <button onClick={() => navigate('/progress')}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl border-none cursor-pointer font-bold">
                    العودة للتقدم
                </button>
            </div>
        );
    }

    // ═══ RESULTS ═══
    if (showResults) {
        const passedCount = results.filter(r => r.passed).length;
        const percentage = Math.round((passedCount / results.length) * 100);
        const isPassed = percentage >= 50;

        return (
            <div className="glass-panel p-10 max-w-2xl mx-auto mt-6">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                        className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${isPassed ? 'bg-green-50' : 'bg-red-50'}`}>
                        {isPassed ? <Award size={48} className="text-green-600" /> : <Target size={48} className="text-red-600" />}
                    </motion.div>

                    <h2 className={`text-3xl font-amiri mb-2 ${isPassed ? 'text-green-700' : 'text-red-700'}`}>
                        {isPassed ? 'أحسنت! تم تصحيح الأخطاء' : 'تحتاج مزيد من التدريب'}
                    </h2>
                    <div className="text-5xl font-bold mb-4" style={{ color: isPassed ? '#22C55E' : '#DC2626' }}>
                        {percentage}%
                    </div>
                    <p className="text-gray-600 mb-6">
                        قرأت {passedCount} من {results.length} آية بشكل صحيح في حكم "{errorInfo?.name}".
                    </p>

                    {/* Per-verse breakdown */}
                    <div className="space-y-2 mb-6 text-right">
                        {results.map((r, i) => (
                            <div key={i} className={`p-3 rounded-lg flex items-center gap-2 ${r.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                                {r.passed ? <CheckCircle size={18} className="text-green-600 shrink-0" /> : <XCircle size={18} className="text-red-600 shrink-0" />}
                                <span className="text-sm text-gray-700">سورة {r.verse.surah_number} - آية {r.verse.ayah_number}</span>
                                <span className={`mr-auto text-xs font-bold ${r.passed ? 'text-green-600' : 'text-red-600'}`}>
                                    {r.passed ? 'صحيح ✓' : 'يحتاج تدريب'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 justify-center">
                        {!isPassed && (
                            <button onClick={() => { setCurrentVerseIdx(0); setResults([]); setShowResults(false); setStructuredChars(null); }}
                                className="px-6 py-2.5 bg-amber-500 text-white rounded-xl border-none cursor-pointer font-bold shadow-lg">
                                إعادة المحاولة
                            </button>
                        )}
                        <button onClick={() => navigate('/progress')}
                            className="px-6 py-2.5 bg-primary text-white rounded-xl border-none cursor-pointer font-bold">
                            العودة للتقدم
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ═══ QUIZ IN PROGRESS ═══
    return (
        <div className="max-w-3xl mx-auto mt-4">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-5 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-2xl w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: `${errorInfo?.color || '#6B7280'}15` }}>
                        {errorInfo?.icon || '❓'}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-primary m-0">اختبار عملي: {errorInfo?.name}</h2>
                        <p className="text-sm text-gray-500 m-0">{errorInfo?.category}</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{currentVerseIdx + 1}/{totalVerses}</div>
                    <div className="text-xs text-gray-400">آية</div>
                </div>
            </motion.div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
                <motion.div
                    animate={{ width: `${((currentVerseIdx + 1) / totalVerses) * 100}%` }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, #1B5E3B, ${errorInfo?.color || '#B8923E'})` }}
                />
            </div>

            {/* Verse Info */}
            <motion.div key={currentVerseIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="glass-panel p-8 mb-4 text-center">
                <p className="text-sm text-gray-400 mb-3">
                    سورة {currentVerse?.surah_number} - آية {currentVerse?.ayah_number}
                </p>

                {/* Display recitation area */}
                <div className="font-amiri text-3xl leading-[2.5] text-gray-800 mb-4" dir="rtl">
                    <UthmaniViewer
                        chars={structuredChars?.chars}
                        text={currentVerse?.ayah_text || displayUthmani}
                        highlightIndices={(() => {
                            if (!currentVerse?.char_indices || !currentVerse?.ayah_text) return [];
                            // Expand indices to full words
                            const text = currentVerse.ayah_text;
                            const indices = currentVerse.char_indices;
                            const expanded = new Set();
                            const words = text.split(' ');
                            let ptr = 0;
                            words.forEach(w => {
                                const start = ptr;
                                const end = ptr + w.length;
                                if (indices.some(idx => idx >= start && idx < end)) {
                                    for (let i = start; i < end; i++) expanded.add(i);
                                }
                                ptr = end + 1;
                            });
                            return Array.from(expanded);
                        })()}
                        memorizeMode={false}
                    />
                </div>
                
                {!isRecording && !displayUthmani && (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-gray-400">
                        <Mic size={24} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">اضغط "ابدأ التسميع" للقراءة</p>
                    </div>
                )}
            </motion.div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
                <button onClick={() => navigate('/progress')}
                    className="px-5 py-2.5 bg-transparent text-gray-500 border-none cursor-pointer font-bold">
                    إلغاء
                </button>

                {!isRecording ? (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStartRecording}
                        disabled={!wsConnected}
                        className="px-8 py-3 rounded-xl border-none cursor-pointer font-bold text-white shadow-xl flex items-center gap-2 disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #1B5E3B, #2D8A56)' }}
                    >
                        <Mic size={20} /> ابدأ التسميع
                    </motion.button>
                ) : (
                    <motion.button
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        onClick={handleStopRecording}
                        className="px-8 py-3 rounded-xl border-none cursor-pointer font-bold text-white shadow-xl flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}
                    >
                        <Square size={20} /> أنهي التسميع
                    </motion.button>
                )}
            </div>
        </div>
    );
};

export default PracticalQuizView;
