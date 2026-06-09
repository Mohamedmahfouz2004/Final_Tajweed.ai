'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mic, Square, Activity, Clock, Layers, X } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import UthmaniViewer from '../../components/UthmaniViewer';
import SessionResult from '../../components/SessionResult';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

import { WS_BASE } from '../../utils/apiConfig';

const MUAALEM_WS_URL = `${WS_BASE}/ws/stream`;
// http(s) URL of the model server — used to open the LocalTunnel "Click to Continue" page.
const MODEL_HTTP_URL = WS_BASE.replace(/^ws/, 'http');

/**
 * Merge annotation chars (from the plain uthmani used for phonetization)
 * into the display uthmani (which includes ayah markers like ۝١).
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

export default function LiveMoshafPage() {
    const router = useRouter();
    
    const { 
        selectedSurah, 
        surahs, 
        fromVerse, 
        toVerse, 
        moshafSettings,
        setLastSessionMetrics,
        setCurrentSessionId,
        fetchSessionAnalytics,
        updateLiveMistake,
        isRecording,
        setIsRecording,
        setSessionMistakes
    } = useAppStore();

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
    const [connectFailed, setConnectFailed] = useState(false);
    
    // Refs
    const wsRef = useRef(null);
    const audioCtxRef = useRef(null);
    const processorRef = useRef(null);
    const sourceRef = useRef(null);
    const streamRef = useRef(null);
    const pollIntervalRef = useRef(null);

    // Get surah name
    const surahName = selectedSurah ? surahs.find(s => s.id == selectedSurah)?.name : '';

    // Build merged chars: annotation data + marker characters
    const mergedChars = useMemo(() => {
        return mergeCharsWithMarkers(uthmaniRef, displayUthmani, structuredChars?.chars);
    }, [uthmaniRef, displayUthmani, structuredChars]);

    // Redirect if no setup data
    useEffect(() => {
        if (!selectedSurah) {
            router.push('/practice');
        }
    }, [selectedSurah, router]);

    const handleStop = useCallback(() => {
        setIsRecording(false);
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
        if (processorRef.current) { try { processorRef.current.disconnect(); } catch { } }
        if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch { } }
        if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { } }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
    }, [setIsRecording]);

    const handleStart = useCallback(async (socket) => {
        const activeWs = socket || wsRef.current;
        if (!activeWs || activeWs.readyState !== WebSocket.OPEN) return;

        // Reset session-specific mistake tracking
        setSessionMistakes([]);

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

            const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
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

            pollIntervalRef.current = setInterval(() => {
                if (activeWs?.readyState === WebSocket.OPEN) {
                    activeWs.send(JSON.stringify({ type: 'poll' }));
                }
            }, 500);

        } catch (err) {
            console.error('Microphone error:', err);
            alert('لم يتم السماح بالوصول للميكروفون');
        }
    }, [selectedSurah, fromVerse, toVerse, moshafSettings, setSessionMistakes, setIsRecording]);

    // WebSocket connection
    const connectWs = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(MUAALEM_WS_URL);
        ws.binaryType = 'arraybuffer';

        // If we don't connect within a few seconds, surface the likely cause (tunnel locked / down).
        const failTimer = setTimeout(() => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) setConnectFailed(true);
        }, 6000);

        ws.onopen = () => {
            clearTimeout(failTimer);
            setWsConnected(true);
            setConnectFailed(false);
            console.log('✅ WebSocket connected to Muaalem server');
            handleStart(ws);
        };

        ws.onmessage = (event) => {
            let data;
            try {
                data = JSON.parse(event.data);
            } catch {
                // LocalTunnel interstitial / non-JSON frame — not a real model message.
                console.warn('Non-JSON WS frame (LocalTunnel "Click to Continue" page?). Open the model URL once and click Continue.');
                setConnectFailed(true);
                return;
            }

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
                    if (data.structured_chars.chars) {
                        data.structured_chars.chars.forEach((char, idx) => {
                            if (char.status >= 2 && char.error_type && char.error_type !== 'none') {
                                finalMistakes.push({
                                    name: char.error_type,
                                    idx,
                                    surahNumber: parseInt(useAppStore.getState().selectedSurah),
                                    ayahNumber: parseInt(useAppStore.getState().fromVerse),
                                    charIndex: idx,
                                    ayahText: displayUthmani || uthmaniRef
                                });
                                // Update global live mistake stats locally
                                useAppStore.getState().updateLiveMistake(char.error_type, {
                                    surahNumber: parseInt(useAppStore.getState().selectedSurah),
                                    ayahNumber: parseInt(useAppStore.getState().fromVerse),
                                    charIndex: idx,
                                });
                            }
                        });
                    }
                }
                
                // Update UI state and save to DB
                useAppStore.getState().setSessionMistakes(finalMistakes);
                const saveSessionMistakes = useAppStore.getState().saveSessionMistakes;
                if (finalMistakes.length > 0 && saveSessionMistakes) {
                    saveSessionMistakes(finalMistakes);
                } else {
                    useAppStore.getState().fetchUserProgress();
                }

                // Persist this session for the "continue today" hero on the home page
                useAppStore.getState().setLastSession({
                    surahId:  parseInt(useAppStore.getState().selectedSurah),
                    fromAyah: parseInt(useAppStore.getState().fromVerse),
                    toAyah:   parseInt(useAppStore.getState().toVerse),
                    endedAt:  Date.now(),
                    errors:   finalMistakes.length,
                });

                // Surface the mastery-studio result overlay
                useAppStore.getState().openSessionResult();

                if (data.metrics) setMetrics(data.metrics);
                if (data.metrics_history && data.metrics_history.length > 0) {
                    setMetricsHistory(data.metrics_history);
                    useAppStore.getState().setLastSessionMetrics(data.metrics_history);
                    if (data.session_id) useAppStore.getState().fetchSessionAnalytics(data.session_id);
                }
            } else if (data.type === 'auto_stop') {
                handleStop();
            }
        };

        ws.onclose = () => { clearTimeout(failTimer); setWsConnected(false); };
        ws.onerror = (err) => { console.error('WebSocket error:', err); setConnectFailed(true); };

        wsRef.current = ws;
    }, [displayUthmani, uthmaniRef, setCurrentSessionId, handleStart, handleStop]);

    const fetchUserProgress = useAppStore(s => s.fetchUserProgress);

    useEffect(() => {
        connectWs();
        return () => {
            handleStop();
            if (wsRef.current) wsRef.current.close();
        };
    }, [connectWs, handleStop]);

    const handleExit = () => {
        handleStop();
        fetchUserProgress();
        router.push('/practice');
    };

    return (
        <div className="flex flex-col flex-1 font-arabic min-h-[calc(100vh-80px)]" dir="rtl" style={{ background: 'var(--parchment-100)' }}>
            <SessionResult
                onRetry={() => handleStart()}
                onContinue={() => { handleExit(); }}
            />

            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{
                background: 'var(--ink-900)', color: 'var(--parchment-50)',
                borderBottom: '4px solid var(--brass-500)',
            }}>
                <button onClick={handleExit} className="ui-btn ui-btn--ghost" style={{ borderColor: 'var(--parchment-50)', color: 'var(--parchment-50)' }} type="button">
                    <X size={16} /> إنهاء
                </button>

                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.6rem', lineHeight: 1, color: 'var(--parchment-50)', margin: 0 }}>{surahName}</h2>
                    <p style={{ fontSize: '0.72rem', color: 'var(--brass-300)', margin: '6px 0 0', fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.18em' }}>
                      AYAH {fromVerse} → {toVerse}
                    </p>
                </div>

                <div className="ui-pill" style={{ color: isRecording ? 'var(--rec-error)' : 'var(--parchment-50)', opacity: isRecording ? 1 : 0.6 }}>
                    <span style={{
                        width: 8, height: 8, background: isRecording ? 'var(--rec-error)' : 'var(--sand-400)',
                        boxShadow: isRecording ? '0 0 8px var(--rec-error)' : 'none',
                        animation: isRecording ? 'brutBlink 1.4s ease infinite' : 'none',
                    }} />
                    {isRecording ? 'REC' : 'IDLE'}
                </div>
            </div>

            {/* Moshaf Area */}
            <div className="flex-1 overflow-hidden p-4 md:p-6 flex items-center justify-center">
                <div className="ui-panel" style={{
                    width: '100%', maxWidth: 920, height: '100%',
                    display: 'flex', flexDirection: 'column', padding: 0,
                    boxShadow: '0 14px 30px -12px rgba(15,26,13,0.4)',
                }}>
                    <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-10">
                        {!displayUthmani && !uthmaniRef ? (
                            connectFailed ? (
                                <div className="flex flex-col items-center justify-center min-h-[400px] text-center" style={{ gap: 14 }}>
                                    <p style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '1.6rem', color: 'var(--ink-900)' }}>
                                        تعذّر الاتصال بالنموذج
                                    </p>
                                    <p className="ui-sub" style={{ maxWidth: '40ch', marginTop: 0 }}>
                                        إن كان الخادم يعمل عبر LocalTunnel، افتح رابط النموذج مرة واحدة واضغط
                                        «Click to Continue»، ثم أعد المحاولة.
                                    </p>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <a href={MODEL_HTTP_URL} target="_blank" rel="noreferrer" className="ui-btn ui-btn--ghost">
                                            فتح رابط النموذج ↗
                                        </a>
                                        <button type="button" className="ui-cta" style={{ padding: '11px 20px' }}
                                            onClick={() => { setConnectFailed(false); try { wsRef.current?.close(); } catch {} connectWs(); }}>
                                            إعادة المحاولة
                                        </button>
                                    </div>
                                    <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '0.62rem', color: 'var(--ink-500)', direction: 'ltr', marginTop: 6 }}>
                                        {MUAALEM_WS_URL}
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[400px]" style={{ color: 'var(--brass-700)' }}>
                                    <Activity size={28} className="animate-pulse mb-3" />
                                    <p style={{ fontWeight: 700, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '0.18em', fontSize: '0.78rem' }}>
                                      PREPARING AYAH ...
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col gap-6 w-full h-full overflow-y-auto pr-2">
                                <UthmaniViewer
                                    chars={mergedChars}
                                    text={displayUthmani || uthmaniRef}
                                    memorizeMode={false}
                                    className="w-full shrink-0"
                                />
                                {showDebug && liveHtml && (
                                    <div
                                        className="w-full shrink-0"
                                        style={{
                                            background: 'var(--ink-900)', color: 'var(--brass-300)',
                                            border: '1px solid var(--sand-400)', padding: 14, overflowX: 'auto',
                                        }}
                                        dangerouslySetInnerHTML={{ __html: liveHtml }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="shrink-0" style={{
                background: 'var(--parchment-50)', borderTop: '1px solid var(--sand-400)', padding: 16,
            }}>
                <div className="max-w-4xl mx-auto flex items-center flex-wrap md:flex-nowrap justify-center md:justify-between gap-4">
                    <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
                        <span className="ui-pill" style={{ color: 'var(--emerald-700)' }}>
                            <Clock size={12} />
                            <span className="font-num" dir="ltr">{metrics.buffer_s}s</span>
                        </span>
                        <span className="ui-pill" style={{ color: 'var(--ink-700)' }}>
                            <Layers size={12} />
                            <span className="font-num">{metrics.chunks}</span>
                        </span>
                        <button
                            onClick={() => setShowDebug(!showDebug)}
                            className={`ui-pill`}
                            type="button"
                            style={{
                                cursor: 'pointer', border: '1px solid var(--ink-900)',
                                background: showDebug ? 'var(--ink-900)' : 'transparent',
                                color: showDebug ? 'var(--brass-500)' : 'var(--ink-700)',
                            }}
                            title="Toggle Debug Panel"
                        >
                            DEBUG
                        </button>
                    </div>

                    <motion.button
                        animate={isRecording ? { scale: [1, 1.04, 1] } : {}}
                        transition={isRecording ? { repeat: Infinity, duration: 1.5 } : {}}
                        onClick={isRecording ? handleStop : () => handleStart()}
                        className={`ui-mic ${isRecording ? 'is-active' : ''}`}
                        type="button"
                    >
                        {isRecording ? <Square size={26} strokeWidth={2.4} /> : <Mic size={26} strokeWidth={2.2} />}
                    </motion.button>

                    <div className="w-32 h-10 hidden md:block" style={{ border: '1px solid var(--sand-400)' }}>
                        {metricsHistory.length > 0 && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricsHistory}>
                                    <defs>
                                        <linearGradient id="colorDelayLiveMoshaf" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="var(--brass-500)" stopOpacity={0.55}/>
                                            <stop offset="95%" stopColor="var(--brass-500)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <YAxis hide domain={['dataMin', 'dataMax + 20']} />
                                    <Area type="monotone" dataKey="inference_ms" stroke="var(--brass-500)" fillOpacity={1} fill="url(#colorDelayLiveMoshaf)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
