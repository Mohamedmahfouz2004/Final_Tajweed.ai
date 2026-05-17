import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Square, Activity, Clock, Layers, X } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import UthmaniViewer from '../components/UthmaniViewer';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';

const MUAALEM_WS_URL = 'ws://localhost:8888/ws/stream';

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
    const navigate = useNavigate();
    
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
        setIsRecording
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
    const [showDebug, setShowDebug] = useState(true);
    
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
            navigate('/practice');
        }
    }, [selectedSurah, navigate]);

    // WebSocket connection
    const connectWs = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(MUAALEM_WS_URL);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            setWsConnected(true);
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

        ws.onclose = () => setWsConnected(false);
        ws.onerror = (err) => console.error('WebSocket error:', err);

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

            pollIntervalRef.current = setInterval(() => {
                if (activeWs?.readyState === WebSocket.OPEN) {
                    activeWs.send(JSON.stringify({ type: 'poll' }));
                }
            }, 500);

        } catch (err) {
            console.error('Microphone error:', err);
            alert('لم يتم السماح بالوصول للميكروفون');
        }
    };

    const handleStop = () => {
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

        // DB save is now handled in the 'stopped' WS message callback
        // to ensure we get the final confirmed matrix.
    };

    const handleExit = () => {
        handleStop();
        fetchUserProgress();
        navigate('/practice');
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#F3EFE9] font-arabic" dir="rtl">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#FFF9F0] border-b border-[#E5D5C5] shadow-sm shrink-0">
                <button 
                    onClick={handleExit}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-[#6B5D4F] bg-[#EBE0CD] rounded-xl hover:bg-[#DFD0B8] transition-all border-none cursor-pointer"
                >
                    <X size={18} /> إنهاء التسميع
                </button>
                
                <div className="text-center">
                    <h2 className="text-xl font-bold font-amiri text-[#2C1810] m-0">{surahName}</h2>
                    <p className="text-xs text-[#8B6D2E] m-0 mt-1">الآيات {fromVerse} إلى {toVerse}</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <span className="font-bold text-[#6B5D4F]">{isRecording ? 'جاري التسميع...' : 'متوقف'}</span>
                </div>
            </div>

            {/* Moshaf Area */}
            <div className="flex-1 overflow-hidden p-4 md:p-8 flex items-center justify-center">
                <div className="w-full max-w-4xl h-full bg-white shadow-2xl rounded-2xl flex flex-col relative" style={{
                    boxShadow: '0 20px 40px rgba(44,24,16,0.1)'
                }}>
                    {/* Text and Stats Area */}
                    <div className="flex-1 flex flex-col overflow-hidden p-8 md:p-14">
                        {!displayUthmani && !uthmaniRef ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] text-[#B8923E]">
                                <Activity size={32} className="animate-pulse mb-4" />
                                <p className="font-bold">جاري تجهيز الآيات...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8 w-full h-full overflow-y-auto pr-2 custom-scrollbar">
                                <UthmaniViewer
                                    chars={mergedChars}
                                    text={displayUthmani || uthmaniRef}
                                    memorizeMode={false}
                                    className="w-full shrink-0"
                                />
                                
                                {/* Original Model Output rendered directly below the text */}
                                {showDebug && liveHtml && (
                                    <div 
                                        className="w-full bg-black text-white rounded-lg p-4 overflow-x-auto shadow-2xl border border-gray-800 shrink-0"
                                        dangerouslySetInnerHTML={{ __html: liveHtml }} 
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-[#FFF9F0] border-t border-[#E5D5C5] p-4 shrink-0 shadow-[0_-10px_30px_rgba(44,24,16,0.05)]">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 relative">
                    
                    {/* Metrics */}
                    {/* Metrics & Toggles */}
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-[#2D8A56]">
                            <Clock size={16} />
                            <span className="font-bold text-sm" dir="ltr">{metrics.buffer_s} s</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#1A4B6E]">
                            <Layers size={16} />
                            <span className="font-bold text-sm">{metrics.chunks}</span>
                        </div>
                        <button 
                            onClick={() => setShowDebug(!showDebug)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-colors ${showDebug ? 'bg-[#1A1A1A] text-[#00FF41]' : 'bg-gray-200 text-gray-500'}`}
                            title="Toggle Debug Panel"
                        >
                            <span>Model Output</span>
                        </button>
                    </div>

                    {/* Mic Button */}
                    <motion.button
                        animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
                        transition={isRecording ? { repeat: Infinity, duration: 1.5 } : {}}
                        onClick={isRecording ? handleStop : () => handleStart()}
                        className="w-16 h-16 rounded-full border-none cursor-pointer shadow-xl flex items-center justify-center transition-all"
                        style={{
                            background: isRecording
                                ? 'linear-gradient(135deg, #C53030, #9B2C2C)'
                                : 'linear-gradient(135deg, #1B5E3B, #2D8A56)',
                            boxShadow: isRecording
                                ? '0 10px 30px rgba(197,48,48,0.4)'
                                : '0 10px 30px rgba(27,94,59,0.3)',
                        }}
                    >
                        {isRecording ? <Square size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
                    </motion.button>

                    {/* Live Latency Graph */}
                    <div className="w-32 h-10 hidden md:block">
                        {metricsHistory.length > 0 && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricsHistory}>
                                    <defs>
                                        <linearGradient id="colorDelayLiveMoshaf" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5}/>
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <YAxis hide domain={['dataMin', 'dataMax + 20']} />
                                    <Area type="monotone" dataKey="inference_ms" stroke="#f59e0b" fillOpacity={1} fill="url(#colorDelayLiveMoshaf)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    
                </div>
            </div>
        </div>
    );
};

export default LiveMoshafView;
