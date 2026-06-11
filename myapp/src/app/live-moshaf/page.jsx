'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mic, Square, Activity, Clock, Layers, X, BookOpen, Info } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import UthmaniViewer from '../../components/UthmaniViewer';
import MushafRevealEngine from '../../components/mushaf/MushafRevealEngine';
import { REVEAL_MODES } from '../../hooks/useMushafReveal';
import { reciters } from '../../utils/data';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { getSimpleErrorMessage, TAJWEED_ERROR_MESSAGES } from '../../utils/tajweedErrors';
import { WS_BASE, MUAALEM_BASE } from '../../utils/apiConfig';
import AuthGuard from '../../components/AuthGuard';

// Use direct connection if on localhost to bypass Localtunnel warning pages
const MUAALEM_WS_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'ws://127.0.0.1:8888/ws/stream'
    : `${WS_BASE}/ws/stream`;

/**
 * Merge annotation chars (from the plain uthmani used for phonetization)
 * into the display uthmani (which includes ayah markers like ۝١).
 *
 * The display text is a superset of the plain text — it has extra marker
 * characters inserted.  We walk both strings in parallel:
 *   - When a display char matches the current plain char → copy annotation
 *   - When a display char is a marker/space not in plain → insert a
 *     synthetic "marker" annotation that is always visible (status 1 = correct,
 *     rendered with special gold styling via data-is-marker).
 */
function mergeCharsWithMarkers(plainUthmani, displayUthmani, annotationChars) {
    if (!displayUthmani) return annotationChars;
    if (!annotationChars || annotationChars.length === 0) {
        // No annotation yet — build all-grey chars for display text
        return [...displayUthmani].map((ch, i) => ({
            char: ch,
            index: i,
            status: isMarkerChar(ch) ? 1 : 0, // markers gold, rest grey
            error: false,
            error_type: 'none',
            severity: 'none',
            tooltip: '',
        }));
    }

    const merged = [];
    let plainPtr = 0;  // pointer into plainUthmani characters
    let annPtr = 0;    // pointer into annotationChars

    for (let di = 0; di < displayUthmani.length; di++) {
        const dch = displayUthmani[di];

        // Check if this character exists at the current position in the plain text
        if (plainPtr < plainUthmani.length && dch === plainUthmani[plainPtr]) {
            // This character exists in both — use the annotation
            if (annPtr < annotationChars.length) {
                const ann = { ...annotationChars[annPtr] };
                ann.char = dch;
                ann.index = di;
                merged.push(ann);
                annPtr++;
            } else {
                merged.push({
                    char: dch, index: di, status: 0,
                    error: false, error_type: 'none', severity: 'none', tooltip: '',
                });
            }
            plainPtr++;
        } else {
            // This character is EXTRA in display (marker, digit, or surrounding space)
            merged.push({
                char: dch,
                index: di,
                status: 1,  // always visible
                error: false,
                error_type: 'none',
                severity: 'none',
                tooltip: '',
            });
        }
    }

    return merged;
}

/** Check if a character is an ayah marker or Eastern Arabic digit */
function isMarkerChar(ch) {
    const cp = ch.codePointAt(0);
    return ch === '\u06DD' || (cp >= 0x0660 && cp <= 0x0669);
}

const LiveMoshafView = () => {
    const router = useRouter();

    const {
        selectedSurah,
        surahs,
        fromVerse,
        toVerse,
        moshafSettings,
        selectedReciter,
        setLastSessionMetrics,
        setCurrentSessionId,
        fetchSessionAnalytics,
        updateLiveMistake,
        logSessionActivity
    } = useAppStore();

    const [isRecording, setIsRecording] = useState(false);
    const [uthmaniRef, setUthmaniRef] = useState('');          // Plain text for annotation
    const [displayUthmani, setDisplayUthmani] = useState('');  // Text with ayah markers for display
    const [annotatedUthmani, setAnnotatedUthmani] = useState('');
    const [structuredChars, setStructuredChars] = useState(null);
    const [metrics, setMetrics] = useState({ buffer_s: 0, inference_ms: 0, chunks: 0, active: false });
    const [wsConnected, setWsConnected] = useState(false);
    const [metricsHistory, setMetricsHistory] = useState([]);
    const [livePhonemes, setLivePhonemes] = useState("");
    const [liveHtml, setLiveHtml] = useState("");
    const [showDebug, setShowDebug] = useState(false);
    const [selectedError, setSelectedError] = useState(null);
    const [revealMode, setRevealMode] = useState(REVEAL_MODES.FULL);
    const [isMounted, setIsMounted] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Refs
    const wsRef = useRef(null);
    const audioCtxRef = useRef(null);
    const processorRef = useRef(null);
    const sourceRef = useRef(null);
    const streamRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const recordingStartedAtRef = useRef(null);
    const hasLoggedCurrentSessionRef = useRef(false);
    const latestRef = useRef({});
    const debugScrollRef = useRef(null);

    // Auto-scroll the debug matrix (Disabled by user request)
    useEffect(() => {
        // if (debugScrollRef.current) {
        //     debugScrollRef.current.scrollTop = debugScrollRef.current.scrollHeight;
        // }
    }, [liveHtml]);

    // Get surah name
    const surahName = selectedSurah ? surahs.find(s => s.id == selectedSurah)?.name : '';

    // ── Aya audio playback ───────────────────────────────────────
    const [playingAya, setPlayingAya] = useState(null);
    const ayaAudioRef = useRef(null);

    const pad = (n) => String(n).padStart(3, '0');

    const playAya = useCallback((ayaNum) => {
        // Stop current if already playing same aya
        if (ayaAudioRef.current) {
            ayaAudioRef.current.pause();
            ayaAudioRef.current = null;
        }
        if (playingAya === ayaNum) {
            setPlayingAya(null);
            return;
        }
        
        const reciter = reciters.find(r => r.id == selectedReciter) || reciters[0];
        const url = `https://everyayah.com/data/${reciter.subfolder}/${pad(selectedSurah)}${pad(ayaNum)}.mp3`;
        const audio = new Audio(url);
        audio.onended = () => setPlayingAya(null);
        audio.onerror = () => setPlayingAya(null);
        audio.play();
        ayaAudioRef.current = audio;
        setPlayingAya(ayaNum);
    }, [playingAya, selectedSurah]);

    // Stop aya audio when recording starts
    useEffect(() => {
        if (isRecording && ayaAudioRef.current) {
            ayaAudioRef.current.pause();
            ayaAudioRef.current = null;
            setPlayingAya(null);
        }
    }, [isRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (ayaAudioRef.current) ayaAudioRef.current.pause();
        };
    }, []);

    // Build merged chars: annotation data + marker characters
    const mergedChars = useMemo(() => {
        return mergeCharsWithMarkers(uthmaniRef, displayUthmani, structuredChars?.chars);
    }, [uthmaniRef, displayUthmani, structuredChars]);

    const getAyahNumberForChar = useCallback((charIndex) => {
        const start = parseInt(fromVerse) || 1;
        let aya = start;
        for (const ch of mergedChars || []) {
            if ((ch.index ?? 0) >= charIndex) break;
            if (ch.char === '\u06DD') aya += 1;
        }
        return aya;
    }, [fromVerse, mergedChars]);

    useEffect(() => {
        latestRef.current = {
            selectedSurah,
            surahName,
            fromVerse,
            toVerse,
            displayUthmani,
            uthmaniRef,
            mergedChars,
        };
    }, [selectedSurah, surahName, fromVerse, toVerse, displayUthmani, uthmaniRef, mergedChars]);

    const getAyahFromLatestChars = (charIndex) => {
        const latest = latestRef.current;
        const start = parseInt(latest.fromVerse) || 1;
        let aya = start;
        for (const ch of latest.mergedChars || []) {
            if ((ch.index ?? 0) >= charIndex) break;
            if (ch.char === '\u06DD') aya += 1;
        }
        return aya;
    };

    // Redirect if no setup data
    useEffect(() => {
        if (!selectedSurah) {
            router.push('/practice?tab=record');
        }
    }, [selectedSurah, router]);

    // WebSocket connection
    const connectWs = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(MUAALEM_WS_URL);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            setWsConnected(true);
            setConnectionError(null);
            console.log('✅ WebSocket connected to Muaalem server');
            handleStart(ws);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'started') {
                setUthmaniRef(data.uthmani);
                setDisplayUthmani(data.display_uthmani || data.uthmani);
                setAnnotatedUthmani(data.uthmani);
                if (data.session_id) {
                    setCurrentSessionId(data.session_id);
                }
            } else if (data.type === 'result') {
                if (data.annotated_uthmani) setAnnotatedUthmani(data.annotated_uthmani);
                if (data.structured_chars) setStructuredChars(data.structured_chars);
                if (data.phonemes) setLivePhonemes(data.phonemes);
                if (data.html) setLiveHtml(data.html);
                if (data.metrics) {
                    setMetrics(data.metrics);
                    setMetricsHistory(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.chunk === data.metrics.chunks) return prev;
                        return [...prev, {
                            chunk: data.metrics.chunks,
                            buffer_s: data.metrics.buffer_s,
                            model_ms: data.metrics.model_ms,
                            post_ms: data.metrics.post_ms,
                            total_ms: data.metrics.inference_ms,
                            inference_ms: data.metrics.inference_ms,
                            gpu: data.metrics.gpu
                        }];
                    });
                }
            } else if (data.type === 'stopped') {
                if (data.annotated_uthmani) setAnnotatedUthmani(data.annotated_uthmani);
                if (data.html) setLiveHtml(data.html);

                let finalMistakes = [];
                if (data.structured_chars) {
                    setStructuredChars(data.structured_chars);
                    // EXTRACT FINAL MISTAKES DIRECTLY FROM THE MATRIX (structured_chars)
                    if (data.structured_chars.chars) {
                        let activeMistake = null;

                        data.structured_chars.chars.forEach((char, idx) => {
                            if (char.status >= 2 && char.error_type && char.error_type !== 'none') {
                                const displayIndex = char.index ?? idx;
                                const latest = latestRef.current;
                                const ayahNumber = getAyahFromLatestChars(displayIndex);

                                // Group consecutive identical errors into a single mistake entry
                                if (activeMistake && activeMistake.name === char.error_type && activeMistake.ayahNumber === ayahNumber && displayIndex === activeMistake.lastCharIndex + 1) {
                                    activeMistake.lastCharIndex = displayIndex; // extend the range
                                } else {
                                    if (activeMistake) {
                                        finalMistakes.push(activeMistake);
                                    }
                                    activeMistake = {
                                        name: char.error_type,
                                        tooltip: char.tooltip,
                                        idx: idx,
                                        surahNumber: parseInt(useAppStore.getState().selectedSurah),
                                        ayahNumber,
                                        charIndex: displayIndex,
                                        lastCharIndex: displayIndex,
                                        ayahText: latest.displayUthmani || latest.uthmaniRef,
                                        rule_name_ar: char.tooltip || char.error_type
                                    };
                                }
                            } else {
                                if (activeMistake) {
                                    finalMistakes.push(activeMistake);
                                    activeMistake = null;
                                }
                            }
                        });

                        if (activeMistake) {
                            finalMistakes.push(activeMistake);
                        }
                    }
                }

                // Update UI state
                useAppStore.getState().setSessionMistakes(finalMistakes);
                const saveSessionMistakes = useAppStore.getState().saveSessionMistakes;
                if (saveSessionMistakes) {
                    saveSessionMistakes(finalMistakes);
                }

                if (data.metrics) setMetrics(data.metrics);
                if (data.metrics_history && data.metrics_history.length > 0) {
                    setMetricsHistory(data.metrics_history);
                    useAppStore.getState().setLastSessionMetrics(data.metrics_history);
                    if (data.session_id) useAppStore.getState().fetchSessionAnalytics(data.session_id);
                }

                const startedAt = recordingStartedAtRef.current;
                const duration = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
                const latest = latestRef.current;
                if (hasLoggedCurrentSessionRef.current) {
                    console.log('[MOSHAF] Session already logged, skipping duplicate.');
                    return;
                }
                hasLoggedCurrentSessionRef.current = true;

                // Calculate a mock score for now based on mistakes ratio
                const totalChars = data.structured_chars?.chars?.length || 1;
                const errorCharsCount = data.structured_chars?.chars?.filter(c => c.error)?.length || 0;
                const score = Math.max(0, Math.round(((totalChars - errorCharsCount) / totalChars) * 100));

                const appStore = useAppStore.getState();
                
                // 1. Save Session to Supabase
                appStore.saveRecitationSession({
                    surah_number: parseInt(latest.selectedSurah),
                    from_ayah: parseInt(latest.fromVerse),
                    to_ayah: parseInt(latest.toVerse),
                    duration_seconds: duration,
                    total_mistakes: finalMistakes.length,
                    score: score
                }).then(sessionId => {
                    // 2. Process mistakes against Supabase
                    if (data.structured_chars && data.structured_chars.chars) {
                        appStore.processLiveMistakes(
                            sessionId,
                            data.structured_chars.chars,
                            getAyahFromLatestChars,
                            parseInt(latest.selectedSurah),
                            parseInt(latest.fromVerse),
                            parseInt(latest.toVerse)
                        );
                    }
                });
            } else if (data.type === 'auto_stop') {
                handleStop();
            }
        };

        ws.onclose = (e) => {
            setWsConnected(false);
            if (!e.wasClean && !wsConnected) {
                setConnectionError("تعذر الاتصال بخادم الذكاء الاصطناعي. يرجى التأكد من تشغيله.");
            }
        };
        ws.onerror = (e) => {
            setWsConnected(false);
            setConnectionError("تعذر الاتصال بخادم الذكاء الاصطناعي. يرجى التأكد من تشغيله.");
        };

        wsRef.current = ws;
    }, []);

    const fetchUserProgress = useAppStore(s => s.fetchUserProgress);
    const setSessionMistakes = useAppStore(s => s.setSessionMistakes);
    // The incremental mistake tracking useEffect has been removed.
    // Mistakes are now extracted from the final Matrix when the session stops.

    useEffect(() => {
        connectWs();
        return () => {
            handleStop();
            if (wsRef.current) wsRef.current.close();
        };
    }, [connectWs]);

    const handleStart = async (socket) => {
        const activeWs = socket || wsRef.current;
        if (!activeWs || activeWs.readyState !== WebSocket.OPEN) return;

        // Reset session-specific mistake tracking
        setSessionMistakes([]);
        setSelectedError(null);
        recordingStartedAtRef.current = Date.now();
        hasLoggedCurrentSessionRef.current = false; // Reset on every start

        activeWs.send(JSON.stringify({
            type: 'start',
            surah: parseInt(selectedSurah),
            from_aya: parseInt(fromVerse),
            to_aya: parseInt(toVerse),
            moshaf_settings: moshafSettings || {}
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
                if (activeWs?.readyState !== WebSocket.OPEN) return;
                const samples = e.inputBuffer.getChannelData(0);
                const buffer = new Float32Array(samples).buffer;
                activeWs.send(buffer);
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);

            audioCtxRef.current = audioCtx;
            sourceRef.current = source;
            processorRef.current = processor;

            setIsRecording(true);

            // ❌ Polling is KILLED: The server will push results instantly instead of us polling!
            // No more setInterval here.

        } catch (err) {
            console.error('Microphone error:', err);
            alert('لم يتم السماح بالوصول للميكروفون');
        }
    };

    const handleStop = () => {
        setIsRecording(false);
        // Polling was removed, so no interval to clear here
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
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }

        // DB save is now handled in the 'stopped' WS message callback
        // to ensure we get the final confirmed matrix.
    };

    const handleExit = () => {
        handleStop();
        fetchUserProgress();
        router.push('/practice?tab=record');
    };

    if (!isMounted) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--parchment-100)] font-arabic" dir="rtl">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--parchment-50)] border-b border-[var(--sand-400)] shadow-sm shrink-0">
                <button
                    onClick={handleExit}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[var(--ink-500)] bg-[var(--sand-300)] rounded-xl hover:bg-[var(--sand-500)] transition-all border-none cursor-pointer"
                >
                    <X size={18} /> إنهاء التسميع
                </button>

                <div className="text-center">
                    <h2 className="text-xl font-bold font-amiri text-[var(--ink-900)] m-0">{surahName}</h2>
                    <p className="text-xs text-[var(--brass-500)] m-0 mt-1">الآيات {fromVerse} إلى {toVerse}</p>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <span className="font-bold text-[var(--ink-500)]">{isRecording ? 'جاري التسميع...' : 'متوقف'}</span>
                </div>
            </div>

            {/* Moshaf Area */}
            <div className="flex-1 overflow-hidden p-4 md:p-8 flex items-center justify-center">
                <div className="w-full max-w-4xl h-full bg-white shadow-2xl rounded-2xl flex flex-col relative" style={{
                    boxShadow: '0 20px 40px rgba(44,24,16,0.1)'
                }}>
                    {/* Mushaf Reveal Engine */}
                    <div className="flex-1 flex flex-col overflow-hidden p-4 md:p-8">
                        {!displayUthmani && !uthmaniRef ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] text-[var(--brass-400)]">
                                {connectionError ? (
                                    <>
                                        <div className="text-red-500 mb-4 bg-red-50 p-4 rounded-full">
                                            <X size={32} />
                                        </div>
                                        <p className="font-bold text-red-600 mb-2">خطأ في الاتصال</p>
                                        <p className="text-sm text-center text-red-500/80">{connectionError}</p>
                                        <div className="flex flex-col gap-3 mt-6">
                                            <a 
                                                href={MUAALEM_BASE}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-6 py-2 bg-[#044D29] hover:bg-[#066b3b] text-white rounded-xl transition-colors font-bold text-sm text-center no-underline"
                                            >
                                                1. تنشيط الخادم (اضغط للذهاب لصفحة تخطي الحماية)
                                            </a>
                                            <button 
                                                onClick={() => { setConnectionError(null); connectWs(); }}
                                                className="px-6 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-colors font-bold text-sm border-none cursor-pointer"
                                            >
                                                2. إعادة المحاولة بعد التنشيط
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Activity size={32} className="animate-pulse mb-4" />
                                        <p className="font-bold">جاري تجهيز الآيات...</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col w-full h-full">
                                <MushafRevealEngine
                                    chars={mergedChars}
                                    revealMode={revealMode}
                                    onModeChange={setRevealMode}
                                    onPlayAya={playAya}
                                    playingAya={playingAya}
                                    fromVerse={fromVerse}
                                    onExplainError={(char) => {
                                        const ayahNumber = getAyahNumberForChar(char.index);
                                        setSelectedError({
                                            ...char,
                                            ayahNumber,
                                            error_type: char.error_type,
                                        });
                                    }}
                                    selectedSurah={selectedSurah}
                                    isRecording={isRecording}
                                />

                                {selectedError && (
                                    <div className="rounded-2xl border border-red-100 bg-red-50/80 p-4 text-right shadow-sm mt-4 shrink-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <button onClick={() => setSelectedError(null)} className="border-none bg-transparent text-red-400 cursor-pointer">
                                                <X size={18} />
                                            </button>
                                            <div className="flex items-start gap-3">
                                                <Info size={20} className="text-red-600 mt-1" />
                                                <div>
                                                    <h3 className="font-amiri text-xl font-bold text-red-800">تحليل موضع الخطأ</h3>
                                                    <p className="text-sm text-red-700 leading-relaxed">
                                                        الآية {selectedError.ayahNumber}: {getSimpleErrorMessage(selectedError.tooltip) || TAJWEED_ERROR_MESSAGES[selectedError.error_type] || `تم رصد خطأ من نوع ${selectedError.error_type} عند هذا الموضع.`}
                                                    </p>
                                                    <p className="mt-2 text-xs text-red-500">اضغط على زر &quot;استمع للآية&quot; فوق النص لسماع التلاوة الصحيحة ومقارنة النطق.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Original Model Output (Debug) */}
                                {showDebug && liveHtml && (
                                    <div
                                        ref={debugScrollRef}
                                        className="w-full bg-black text-white rounded-lg p-4 overflow-x-auto overflow-y-auto shadow-2xl border border-gray-800 shrink-0 mt-4 max-h-[250px] custom-scrollbar"
                                        dangerouslySetInnerHTML={{ __html: liveHtml }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-[var(--parchment-50)] border-t border-[var(--sand-400)] p-4 shrink-0 shadow-[0_-10px_30px_rgba(44,24,16,0.05)]">
                <div className="max-w-4xl mx-auto flex items-center justify-center md:justify-between gap-4 relative">

                    {/* Metrics & dev toggles — desktop only (clutter on mobile) */}
                    <div className="hidden md:flex gap-4">
                        <div className="flex items-center gap-2 text-[var(--emerald-600)]">
                            <Clock size={16} />
                            <span className="font-bold text-sm" dir="ltr">{metrics.buffer_s} s</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--ink-700)]">
                            <Layers size={16} />
                            <span className="font-bold text-sm">{metrics.chunks}</span>
                        </div>
                        <button
                            onClick={() => setShowDebug(!showDebug)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-colors ${showDebug ? 'bg-black text-[#00FF41]' : 'bg-gray-200 text-gray-500'}`}
                            title="Toggle Debug Panel"
                        >
                            <span>Model Output</span>
                        </button>
                    </div>

                    {/* Mic + Change Surah Buttons */}
                    <div className="flex items-center gap-3">
                        <motion.button
                            animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
                            transition={isRecording ? { repeat: Infinity, duration: 1.5 } : {}}
                            onClick={isRecording ? handleStop : () => handleStart()}
                            className="w-16 h-16 rounded-full border-none cursor-pointer shadow-xl flex items-center justify-center transition-all"
                            style={{
                                background: isRecording
                                    ? 'linear-gradient(135deg, #C53030, #9B2C2C)'
                                    : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                boxShadow: isRecording
                                    ? '0 10px 30px rgba(197,48,48,0.4)'
                                    : '0 10px 30px rgba(27,94,59,0.3)',
                            }}
                        >
                            {isRecording ? <Square size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
                        </motion.button>

                        <button
                            onClick={() => { handleStop(); router.push('/practice?tab=record'); }}
                            className="w-11 h-11 rounded-full border-none cursor-pointer shadow-lg flex items-center justify-center transition-all hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, #E6C875, var(--color-secondary))',
                                boxShadow: '0 6px 20px rgba(212,175,55,0.3)',
                            }}
                            title="تغيير السورة"
                        >
                            <BookOpen size={18} className="text-[#1C1208]" />
                        </button>
                    </div>

                    {/* Live Latency Graph */}
                    <div className="hidden md:block">
                        {metricsHistory.length > 0 && (
                            <AreaChart width={128} height={40} data={metricsHistory}>
                                <defs>
                                    <linearGradient id="colorDelayLiveMoshaf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <YAxis hide domain={['dataMin', 'dataMax + 20']} />
                                <Area type="monotone" dataKey="inference_ms" stroke="#f59e0b" fillOpacity={1} fill="url(#colorDelayLiveMoshaf)" isAnimationActive={false} />
                            </AreaChart>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default function LiveMoshafPage() {
    return (
        <AuthGuard
            title="المصحف المباشر"
            subtitle="سجّل دخولك عشان تقدر تسجل تلاوتك وتاخد تحليل فوري من محرك التجويد."
            icon={<Mic size={36} strokeWidth={2} />}
        >
            <LiveMoshafView />
        </AuthGuard>
    );
}
