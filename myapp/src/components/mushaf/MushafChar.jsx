import { memo } from 'react';
import { getCharClasses, isMarkerChar } from '../../hooks/useMushafReveal';

/**
 * MushafChar — Atomic character renderer for the Mushaf Reveal Engine.
 * 
 * This is the smallest renderable unit. Each character is wrapped in a <span>
 * with CSS classes that control its visibility, color, and animation based on:
 *   - The current reveal mode (applied via parent container class)
 *   - The character's recitation status (0=future, 1=correct, 2+=error)
 *   - Whether it's the active (currently being read) character
 *   - Any error decoration (madd, ghunna, etc.)
 * 
 * Performance: Memoized with a custom comparator. Only re-renders when
 * status, active state, or error_type changes.
 */
const MushafChar = memo(function MushafChar({ char, activeIndex, onExplainError }) {
    const classes = getCharClasses(char, activeIndex);
    const isError = char.status >= 2 && char.error_type && char.error_type !== 'none';
    
    return (
        <span
            className={classes}
            data-index={char.index}
            onClick={isError && onExplainError ? () => onExplainError(char) : undefined}
            role={isError && onExplainError ? 'button' : undefined}
            title={char.tooltip || undefined}
        >
            {char.char}
        </span>
    );
}, (prev, next) => {
    // Custom equality — skip re-render if nothing visual changed
    return prev.char.status === next.char.status
        && prev.char.error_type === next.char.error_type
        && prev.activeIndex === next.activeIndex
        && prev.char.index === next.char.index
        && prev.char.char === next.char.char;
});

export default MushafChar;
