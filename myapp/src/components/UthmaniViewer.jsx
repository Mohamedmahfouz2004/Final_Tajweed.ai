import { useMemo, useCallback, memo } from 'react'
import './uthmani-viewer.css'

/**
 * UthmaniViewer — Production-grade Quran recitation feedback component.
 *
 * Renders Uthmani text with per-character error highlighting based on
 * structured annotation data from the backend pipeline.
 *
 * Props:
 *   - chars: Array of { char, index, status, error, error_type, severity, tooltip }
 *   - text: Raw Uthmani text (fallback if no chars)
 *   - showTooltips: Whether to show error tooltips on hover (default: true)
 *   - className: Additional CSS class
 */

// ── Status → Style Mapping ───────────────────────────────────────────────
const STATUS_CONFIG = {
    0: { color: '#94A3B8', label: 'Not recited yet',   cssClass: 'uv-future'  },
    1: { color: '#22C55E', label: 'Correct',           cssClass: 'uv-correct' },
    2: { color: '#DC2626', label: 'Phoneme error',     cssClass: 'uv-error'   },
    3: { color: '#DC2626', label: 'Tajweed error',     cssClass: 'uv-error'   },
}

// ── Error Type → Decoration Mapping ──────────────────────────────────────
const ERROR_DECORATION = {
    madd:      { className: 'uv-err-madd',      label: 'Madd (elongation) error' },
    ghunna:    { className: 'uv-err-ghunna',     label: 'Ghunna (nasalization) error' },
    qalqala:   { className: 'uv-err-qalqala',    label: 'Qalqala (bounce) error' },
    vowel:     { className: 'uv-err-vowel',      label: 'Vowel/Harakat error' },
    phoneme:   { className: 'uv-err-phoneme',    label: 'Phoneme mismatch' },
    deletion:  { className: 'uv-err-deletion',   label: 'Missing phoneme' },
    insertion: { className: 'uv-err-insertion',   label: 'Extra phoneme' },
    sifat:     { className: 'uv-err-sifat',      label: 'Tajweed attribute error' },
    none:      { className: '',                   label: '' },
}

// ── CharSpan: Memoized individual character span ─────────────────────────
const CharSpan = memo(function CharSpan({ char, status, errorType, severity, tooltip, showTooltips }) {
    const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG[0]
    const errCfg = ERROR_DECORATION[errorType] || ERROR_DECORATION.none

    const classes = [
        'uv-char',
        statusCfg.cssClass,
        errCfg.className,
        severity !== 'none' ? `uv-severity-${severity}` : '',
        status === 'highlight' ? 'uv-highlight' : '',
    ].filter(Boolean).join(' ')

    const title = showTooltips && tooltip
        ? tooltip
        : showTooltips && errCfg.label
            ? errCfg.label
            : undefined

    return (
        <span className={classes} title={title} data-status={status}>
            {char}
        </span>
    )
})

// ── CharGroup: Groups consecutive chars with same status for perf ────────
const CharGroup = memo(function CharGroup({ chars, showTooltips }) {
    // If all chars in the group have the same status+errorType, render as one span
    const first = chars[0]
    const statusCfg = STATUS_CONFIG[first.status] || STATUS_CONFIG[0]
    const errCfg = ERROR_DECORATION[first.error_type] || ERROR_DECORATION.none

    const classes = [
        'uv-char-group',
        statusCfg.cssClass,
        errCfg.className,
        first.severity !== 'none' ? `uv-severity-${first.severity}` : '',
    ].filter(Boolean).join(' ')

    const title = showTooltips && first.tooltip
        ? first.tooltip
        : showTooltips && errCfg.label
            ? errCfg.label
            : undefined

    const text = chars.map(c => c.char).join('')
    const isMarker = /[\s\u06DD٠-٩١-٩0-9]/.test(first.char)

    return (
        <span className={classes} title={title} data-status={first.status} data-is-marker={isMarker}>
            {text}
        </span>
    )
})

// ── Main Component ───────────────────────────────────────────────────────
function UthmaniViewer({ chars, text, highlightIndices = [], showTooltips = true, memorizeMode = false, className = '' }) {

    // Group consecutive characters with same status + error_type for perf
    const charGroups = useMemo(() => {
        if (!chars || chars.length === 0) return []

        const groups = []
        let currentGroup = [chars[0]]

        const isMarkerChar = (c) => /[\s\u06DD٠-٩١-٩0-9]/.test(c)

        for (let i = 1; i < chars.length; i++) {
            const prev = chars[i - 1]
            const curr = chars[i]

            const currIsMarker = isMarkerChar(curr.char)
            const prevIsMarker = isMarkerChar(prev.char)

            if (curr.status === prev.status && curr.error_type === prev.error_type && currIsMarker === prevIsMarker) {
                currentGroup.push(curr)
            } else {
                groups.push(currentGroup)
                currentGroup = [curr]
            }
        }
        groups.push(currentGroup)
        return groups
    }, [chars])

    // Compute stats from chars
    const stats = useMemo(() => {
        if (!chars || chars.length === 0) return null

        // Only count letter chars (skip diacritics attached to same letter)
        const seen = new Set()
        let correct = 0, errors = 0, future = 0

        for (const c of chars) {
            if (seen.has(c.index)) continue
            seen.add(c.index)

            if (c.status === 1) correct++
            else if (c.status >= 2) errors++
            else future++
        }

        const total = correct + errors
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

        return { correct, errors, future, accuracy }
    }, [chars])

    // Fallback: if no structured chars, render raw text (with optional highlights)
    if (!chars || chars.length === 0) {
        if (!text) return null;
        
        return (
            <div className={`uv-container ${className}`} dir="rtl">
                <div className="uv-text">
                    {[...text].map((ch, i) => (
                        <span 
                            key={i} 
                            className={`uv-char ${highlightIndices.includes(i) ? 'uv-highlight' : 'uv-future'}`}
                        >
                            {ch}
                        </span>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className={`uv-container ${className} ${memorizeMode ? 'uv-memorize-mode' : ''}`}>
            {/* ── Annotated Text ── */}
            <div className="uv-text" dir="rtl">
                {charGroups.map((group, idx) => (
                    <CharGroup
                        key={idx}
                        chars={group}
                        showTooltips={showTooltips}
                    />
                ))}
            </div>

            {/* ── Legend ── */}
            <div className="uv-legend">
                <span className="uv-legend-item">
                    <span className="uv-legend-dot uv-legend-dot--correct" />
                    Correct
                </span>
                <span className="uv-legend-item">
                    <span className="uv-legend-dot uv-legend-dot--error" />
                    Error
                </span>
                <span className="uv-legend-item">
                    <span className="uv-legend-dot uv-legend-dot--future" />
                    Not recited
                </span>
            </div>

            {/* ── Live Stats Bar ── */}
            {stats && stats.correct + stats.errors > 0 && (
                <div className="uv-stats">
                    <div className="uv-stats-bar">
                        <div
                            className="uv-stats-fill uv-stats-fill--correct"
                            style={{ width: `${stats.accuracy}%` }}
                        />
                        <div
                            className="uv-stats-fill uv-stats-fill--error"
                            style={{ width: `${100 - stats.accuracy}%` }}
                        />
                    </div>
                    <div className="uv-stats-labels">
                        <span className="uv-stats-label uv-stats-label--accuracy">
                            {stats.accuracy}% Accuracy
                        </span>
                        <span className="uv-stats-label">
                            {stats.correct} ✓ · {stats.errors} ✗
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(UthmaniViewer)
