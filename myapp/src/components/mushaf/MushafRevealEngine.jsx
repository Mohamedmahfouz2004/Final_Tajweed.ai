import { useMemo, memo, useCallback } from 'react';
import MushafAyah from './MushafAyah';
import MushafChar from './MushafChar';
import MushafModeSelector from './MushafModeSelector';
import { splitByAyah, findActiveIndex, calcProgress, REVEAL_MODES } from '../../hooks/useMushafReveal';
import './mushaf-reveal.css';

/**
 * MushafRevealEngine — Production-grade realtime Mushaf rendering system.
 * 
 * This is the main orchestrator that replaces the raw UthmaniViewer in the
 * LiveMoshafView during recitation. It provides:
 * 
 *   1. Four reveal modes (Full, Hidden, Ghost, Progressive Fill)
 *   2. Per-character rendering with minimal re-renders
 *   3. Active character glow tracking
 *   4. Circular progress indicator
 *   5. Error decoration overlays
 *   6. Ayah-level play overlay (Husary audio)
 * 
 * Props:
 *   - chars: Array<{ char, index, status, error, error_type, severity, tooltip }>
 *   - revealMode: 'full' | 'hidden' | 'ghost' | 'fill'
 *   - onModeChange: (mode: string) => void
 *   - onPlayAya: (ayaNum: number) => void
 *   - playingAya: number | null
 *   - fromVerse: number
 *   - onExplainError: (char) => void
 *   - selectedSurah: string | number
 *   - isRecording: boolean
 */
const MushafRevealEngine = memo(function MushafRevealEngine({
    chars,
    revealMode = REVEAL_MODES.GHOST,
    onModeChange,
    onPlayAya,
    playingAya,
    fromVerse = 1,
    onExplainError,
    selectedSurah,
    isRecording = false,
}) {
    // ── Compute active character index ──
    const activeIndex = useMemo(() => {
        if (!isRecording) return null;
        return findActiveIndex(chars);
    }, [chars, isRecording]);

    // ── Split characters into ayah groups ──
    const ayahGroups = useMemo(() => {
        return splitByAyah(chars, fromVerse);
    }, [chars, fromVerse]);

    // ── Progress stats ──
    const progress = useMemo(() => {
        return calcProgress(chars);
    }, [chars]);

    // ── Mode CSS class ──
    const modeClass = `mr-mode-${revealMode}`;

    // ── SVG progress ring calculation ──
    const circumference = 2 * Math.PI * 22; // radius = 22
    const dashOffset = circumference - (circumference * progress.progress / 100);

    // ── Empty state ──
    if (!chars || chars.length === 0) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex justify-center py-3">
                    <MushafModeSelector
                        currentMode={revealMode}
                        onModeChange={onModeChange}
                        disabled={false}
                    />
                </div>
                <div className={`mr-mushaf-page ${modeClass} flex-1 flex items-center justify-center`}>
                    <p className="text-gray-400 font-arabic text-lg">جاري تحميل النص...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative">
            {/* ── Mode Selector ── */}
            <div className="flex justify-center py-3 shrink-0">
                <MushafModeSelector
                    currentMode={revealMode}
                    onModeChange={onModeChange}
                    disabled={false}
                />
            </div>

            {/* ── Mushaf Text Area ── */}
            <div className={`mr-mushaf-page ${modeClass}`} dir="rtl">
                {ayahGroups.length > 0
                    ? ayahGroups.map(({ ayaNum, chars: ayaChars }) => (
                        <MushafAyah
                            key={ayaNum}
                            chars={ayaChars}
                            ayaNum={ayaNum}
                            activeIndex={activeIndex}
                            onPlayAya={onPlayAya}
                            playingAya={playingAya}
                            onExplainError={onExplainError}
                            selectedSurah={selectedSurah}
                        />
                    ))
                    : chars.map((char) => (
                        <MushafChar
                            key={char.index}
                            char={char}
                            activeIndex={activeIndex}
                            onExplainError={onExplainError}
                        />
                    ))
                }
            </div>

            {/* ── Legend ── */}
            <div className="mr-legend">
                <span className="mr-legend-item">
                    <span className="mr-legend-dot mr-legend-dot--correct" />
                    صحيح
                </span>
                <span className="mr-legend-item">
                    <span className="mr-legend-dot mr-legend-dot--error" />
                    خطأ
                </span>
                <span className="mr-legend-item">
                    <span className="mr-legend-dot mr-legend-dot--active" />
                    الحرف الحالي
                </span>
                <span className="mr-legend-item">
                    <span className="mr-legend-dot mr-legend-dot--future" />
                    لم يُقرأ
                </span>
            </div>

            {/* ── Accuracy Stats ── */}
            {progress.correct + progress.errors > 0 && (
                <div className="px-4 pb-3 shrink-0">
                    <div className="w-full h-[5px] rounded-full bg-gray-100 overflow-hidden flex">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${progress.total > 0 ? (progress.correct / (progress.correct + progress.errors)) * 100 : 0}%`,
                                background: 'linear-gradient(90deg, #16A34A, #22C55E)',
                            }}
                        />
                        <div
                            className="h-full transition-all duration-500"
                            style={{
                                width: `${progress.total > 0 ? (progress.errors / (progress.correct + progress.errors)) * 100 : 0}%`,
                                background: 'linear-gradient(90deg, #DC2626, #EF4444)',
                            }}
                        />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[11px] font-arabic">
                        <span className="text-green-600 font-bold">
                            {progress.total > 0 ? Math.round((progress.correct / (progress.correct + progress.errors)) * 100) : 0}% دقة
                        </span>
                        <span className="text-gray-400">
                            {progress.correct} ✓ · {progress.errors} ✗
                        </span>
                    </div>
                </div>
            )}

            {/* ── Floating Progress Ring ── */}
            {isRecording && progress.progress > 0 && (
                <div className="mr-progress-ring">
                    <svg viewBox="0 0 48 48" width="100%" height="100%">
                        <circle
                            className="mr-progress-track"
                            cx="24" cy="24" r="22"
                        />
                        <circle
                            className="mr-progress-fill"
                            cx="24" cy="24" r="22"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                        />
                    </svg>
                    <div className="mr-progress-text">
                        {progress.progress}%
                    </div>
                </div>
            )}
        </div>
    );
});

export default MushafRevealEngine;
