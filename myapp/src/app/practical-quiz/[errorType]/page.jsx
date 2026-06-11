'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mic, Square, CheckCircle, XCircle, Target, Award } from 'lucide-react';
import useAppStore from '../../../store/useAppStore';
import UthmaniViewer from '../../../components/UthmaniViewer';
import { getErrorInfo } from '../../../utils/errorTypeMap';
import { API_BASE, WS_BASE } from '../../../utils/apiConfig';

const MUAALEM_WS_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'ws://127.0.0.1:8888/ws/stream'
    : `${WS_BASE}/ws/stream`;
const API_URL = API_BASE;

export default function PracticalQuizPage({ params }) {
    const paramsResolved = React.use(params);
    const errorType = paramsResolved.errorType;
    const router = useRouter();
    const searchParams = useSearchParams();
    const errorInfo = getErrorInfo(errorType);

    const [quizData, setQuizData] = useState(null);
    const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
    const [results, setResults] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);
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

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                if (errorType === 'by-ayah') {
                    const surah = searchParams.get('surah');
                    const ayah = searchParams.get('ayah');
                    
                    if (surah && ayah) {
                        const quranRes = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surah}?language=ar&words=false&per_page=300&fields=text_uthmani`);
                        const quranData = await quranRes.json();
                        const verseText = quranData.verses.find(v => v.verse_number == ayah)?.text_uthmani || '';
                        
                        setQuizData({
                            verses: [{
                                surah_number: parseInt(surah),
                                ayah_number: parseInt(ayah),
                                ayah_text: verseText,
                                char_indices: []
                            }]
                        });
                    }
                } else {
                    const state = useAppStore.getState();
                    // Load mistakes if not loaded
                    if (!state.userActiveMistakes || state.userActiveMistakes.length === 0) {
                        await state.fetchUserMistakes();
                    }
                    const activeMistakes = useAppStore.getState().userActiveMistakes?.filter(m => m.rule_category === errorType && !m.is_corrected) || [];
                    
                    if (activeMistakes.length > 0) {
                        const uniqueVerses = [];
                        const seen = new Set();
                        for (const m of activeMistakes) {
                            const key = `${m.surah_number}-${m.ayah_number}`;
                            if (!seen.has(key) && uniqueVerses.length < 3) { // max 3 verses
                                seen.add(key);
                                const quranRes = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${m.surah_number}?language=ar&words=false&per_page=300&fields=text_uthmani`);
                                const quranData = await quranRes.json();
                                const verseText = quranData.verses.find(v => v.verse_number == m.ayah_number)?.text_uthmani || '';
                                uniqueVerses.push({
                                    surah_number: m.surah_number,
                                    ayah_number: m.ayah_number,
                                    ayah_text: verseText,
                                    char_indices: []
                                });
                            }
                        }
                        setQuizData({ verses: uniqueVerses });
                    } else {
                        setQuizData({ verses: [] });
                    }
                }
            } catch (err) { console.error('Failed to setup quiz:', err); }
            setLoading(false);
        };
        fetchQuiz();
    }, [errorType, searchParams]);

    const currentVerse = quizData?.verses?.[currentVerseIdx];
    const totalVerses = quizData?.verses?.length || 0;

    const connectWs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        const ws = new WebSocket(MUAALEM_WS_URL);
        ws.binaryType = 'arraybuffer';
        ws.onopen = () => {
            setWsConnected(true);
            setConnectionError(null);
        };
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
        ws.onerror = () => {
            setWsConnected(false);
            setConnectionError('تعذر الاتصال بخادم الذكاء الاصطناعي. يرجى التأكد من تشغيله.');
        };
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
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = audioCtx.createMediaStreamSource(stream);
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
                if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                wsRef.current.send(new Float32Array(e.inputBuffer.getChannelData(0)).buffer);
            };
            source.connect(processor);
            processor.connect(audioCtx.destination);
            audioCtxRef.current = audioCtx;
            sourceRef.current = source;
            processorRef.current = processor;
            setIsRecording(true);
            pollIntervalRef.current = setInterval(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'poll' }));
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
        if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'stop' }));
        setTimeout(() => evaluateVerse(), 1000);
    };

    const evaluateVerse = async () => {
        const chars = structuredChars?.chars || [];
        const targetIndices = currentVerse?.char_indices || [];
        const hasTargetError = chars.some(c => c.error_type === errorType && c.status >= 2);
        let ruleRecitedCorrectly = true;
        if (targetIndices.length > 0) {
            ruleRecitedCorrectly = targetIndices.every(idx => chars[idx] && chars[idx].status === 1);
        } else {
            const correctCount = chars.filter(c => c.status === 1).length;
            ruleRecitedCorrectly = correctCount > (chars.length * 0.5);
        }
        const passed = !hasTargetError && ruleRecitedCorrectly;
        setResults(prev => [...prev, { verse: currentVerse, passed }]);

        if (passed) {
            try {
                const targetRule = errorType === 'by-ayah' ? searchParams.get('errors') : errorType;
                if (targetRule && targetRule !== 'unknown') {
                    const userId = useAppStore.getState().currentUser?.id;
                    if (userId) {
                        const { supabase } = await import('../../../utils/supabaseClient');
                        await supabase
                            .from('mistakes')
                            .update({ is_corrected: true, corrected_at: new Date().toISOString() })
                            .eq('user_id', userId)
                            .eq('surah_number', currentVerse.surah_number)
                            .eq('ayah_number', currentVerse.ayah_number)
                            .eq('rule_category', targetRule);
                    }
                }
            } catch (err) { console.error('Failed to mark corrected:', err); }
        }

        if (currentVerseIdx < totalVerses - 1) {
            setCurrentVerseIdx(prev => prev + 1);
            setStructuredChars(null);
            setDisplayUthmani('');
        } else {
            setShowResults(true);
            useAppStore.getState().fetchUserProgress();
        }
    };

    if (loading) {
        return (
            <div className="ui-panel" style={{ textAlign: 'center', padding: '52px 24px' }}>
                <div style={{ display: 'inline-block', width: 32, height: 32, border: '1px solid var(--sand-400)', borderTopColor: 'var(--brass-500)', animation: 'spin 0.7s linear infinite', marginBottom: 12 }} />
                <p style={{ color: 'var(--ink-500)', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.18em' }}>LOADING QUIZ ...</p>
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!quizData?.verses?.length) {
        return (
            <div className="ui-panel" style={{ textAlign: 'center', padding: '48px 24px', maxWidth: 520, margin: '40px auto' }}>
                <div style={{
                    width: 64, height: 64, margin: '0 auto 18px',
                    background: 'var(--emerald-700)', color: 'var(--parchment-50)',
                    border: '1px solid var(--sand-400)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 14px 30px -10px rgba(212,175,55,0.5)',
                }}>
                    <CheckCircle size={32} strokeWidth={2.2} />
                </div>
                <h2 className="ui-title" style={{ fontSize: '2rem' }}>ممتاز! لا توجد أخطاء</h2>
                <p style={{ color: 'var(--ink-700)', marginTop: 12, marginBottom: 22 }}>
                    لم نجد أخطاء مسجلة من النوع &quot;{errorInfo?.name || errorType}&quot; تحتاج تصحيح.
                </p>
                <button onClick={() => router.push('/progress')} className="ui-cta" type="button">العودة للتقدم</button>
            </div>
        );
    }

    if (showResults) {
        const passedCount = results.filter(r => r.passed).length;
        const percentage = Math.round((passedCount / results.length) * 100);
        const isPassed = percentage >= 50;

        return (
            <div className={`ui-panel ${isPassed ? '' : 'ui-panel--dark'}`} style={{ maxWidth: 640, margin: '0 auto', padding: 32 }}>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 92, height: 92, margin: '0 auto 18px',
                        background: isPassed ? 'var(--emerald-700)' : 'var(--rec-error)',
                        color: 'var(--parchment-50)',
                        border: '1px solid var(--sand-400)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 14px 30px -10px rgba(212,175,55,0.5)',
                    }}>
                        {isPassed ? <Award size={42} strokeWidth={2.2} /> : <Target size={42} strokeWidth={2.2} />}
                    </div>

                    <h2 className="ui-title" style={{ fontSize: '2.2rem', color: isPassed ? 'var(--ink-900)' : 'var(--parchment-50)' }}>
                        {isPassed ? 'أحسنت!' : 'تحتاج تدريب'}
                    </h2>
                    <div className="font-num" style={{ fontSize: '4rem', fontWeight: 700, lineHeight: 1, margin: '14px 0', color: isPassed ? 'var(--emerald-700)' : 'var(--brass-500)' }}>
                        {percentage}%
                    </div>
                    <p style={{ color: isPassed ? 'var(--ink-700)' : 'rgba(245,239,227,0.7)', marginBottom: 24 }}>
                        قرأت <span className="font-num">{passedCount}</span> من <span className="font-num">{results.length}</span> آية بشكل صحيح في &quot;{errorInfo?.name}&quot;.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, textAlign: 'right' }}>
                        {results.map((r, i) => (
                            <div key={i} style={{
                                background: r.passed ? 'var(--emerald-700)' : 'var(--rec-error)',
                                color: 'var(--parchment-50)',
                                border: '1px solid var(--sand-400)',
                                padding: '10px 14px',
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                                {r.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                <span style={{ fontSize: '0.86rem' }}>سورة {r.verse.surah_number} — آية {r.verse.ayah_number}</span>
                                <span className="ui-badge" style={{ marginInlineStart: 'auto', background: 'var(--parchment-50)', color: 'var(--ink-900)', borderColor: 'var(--ink-900)' }}>
                                    {r.passed ? 'صحيح' : 'يحتاج تدريب'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 justify-center" style={{ flexWrap: 'wrap' }}>
                        {!isPassed && (
                            <button onClick={() => { setCurrentVerseIdx(0); setResults([]); setShowResults(false); setStructuredChars(null); }} className="ui-cta" type="button"
                                style={{ background: 'var(--brass-500)', color: 'var(--ink-900)' }}>
                                إعادة المحاولة
                            </button>
                        )}
                        <button onClick={() => router.push('/progress')} className="ui-btn ui-btn--ghost" type="button"
                            style={isPassed ? {} : { borderColor: 'var(--parchment-50)', color: 'var(--parchment-50)' }}>
                            العودة للتقدم
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto" style={{ width: '100%' }}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <span className="ui-eyebrow">
                  <span className="num">PRACTICE</span> &nbsp;//&nbsp; {errorInfo?.category || ''}
                </span>
                <span className="ui-badge ui-badge--emerald">
                  <span className="font-num">{String(currentVerseIdx + 1).padStart(2, '0')}/{String(totalVerses).padStart(2, '0')}</span>
                </span>
            </div>

            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="ui-panel mb-4" style={{
                display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 48, height: 48, fontSize: '1.6rem',
                        background: 'var(--parchment-200)',
                        border: '1px solid var(--sand-400)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{errorInfo?.icon || '◇'}</div>
                    <div>
                        <h2 className="ui-title" style={{ fontSize: '1.6rem' }}>{errorInfo?.name}</h2>
                        <p style={{ color: 'var(--ink-500)', fontSize: '0.8rem' }}>اختبار عملي</p>
                    </div>
                </div>
            </motion.div>

            <div className="ui-bar mb-6">
                <motion.div animate={{ width: `${((currentVerseIdx + 1) / totalVerses) * 100}%` }} className="ui-bar-fill" />
            </div>

            {connectionError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <XCircle size={18} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{connectionError}</span>
                </div>
            )}

            <motion.div key={currentVerseIdx} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="ui-panel mb-4" style={{ padding: 28, textAlign: 'center' }}>
                <span className="ui-eyebrow">سورة {currentVerse?.surah_number} · آية {currentVerse?.ayah_number}</span>
                <div style={{ fontFamily: 'Amiri, serif', fontSize: 'clamp(1.6rem, 3.6vw, 2.4rem)', lineHeight: 2.2, color: 'var(--ink-900)', marginTop: 14 }} dir="rtl">
                    <UthmaniViewer
                        chars={structuredChars?.chars}
                        text={currentVerse?.ayah_text || displayUthmani}
                        highlightIndices={(() => {
                            if (!currentVerse?.char_indices || !currentVerse?.ayah_text) return [];
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
                    <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--sand-400)', color: 'var(--ink-500)' }}>
                        <Mic size={22} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                        <p style={{ fontSize: '0.86rem' }}>اضغط زر التسميع للقراءة</p>
                    </div>
                )}
            </motion.div>

            <div className="flex justify-center gap-4 flex-wrap">
                <button onClick={() => router.push('/progress')} className="ui-btn ui-btn--ghost" type="button">إلغاء</button>
                {!isRecording ? (
                    <button onClick={handleStartRecording} disabled={!wsConnected} className="ui-cta" type="button">
                        <Mic size={18} strokeWidth={2.2} /> ابدأ التسميع
                    </button>
                ) : (
                    <button onClick={handleStopRecording} className="ui-cta" type="button" style={{ background: 'var(--rec-error)', boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)' }}>
                        <Square size={18} strokeWidth={2.4} /> أنهي التسميع
                    </button>
                )}
            </div>
        </div>
    );
}
