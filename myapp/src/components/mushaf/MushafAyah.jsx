import { memo, useState, useCallback, useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import MushafChar from './MushafChar';
import { isMarkerChar } from '../../hooks/useMushafReveal';

/** Check if char is an Eastern Arabic digit ٠١٢٣٤٥٦٧٨٩ */
function isEasternDigit(ch) {
    const cp = ch.codePointAt(0);
    return cp >= 0x0660 && cp <= 0x0669;
}

/**
 * Group chars into render segments. We ignore Eastern Arabic digits in the text stream
 * because we dynamically render the ayah number inside the ۝ symbol.
 */
function buildSegments(chars) {
    const segments = [];
    for (let i = 0; i < chars.length; i++) {
        if (chars[i].char === '\u06DD') {
            segments.push({ type: 'marker', key: chars[i].index });
        } else if (!isEasternDigit(chars[i].char)) {
            segments.push({ type: 'char', char: chars[i], key: chars[i].index });
        }
    }
    return segments;
}
/**
 * MushafAyah — Renders a single ayah with all its characters,
 * ayah number badge, and hover-play overlay.
 * 
 * Performance: Memoized. Only re-renders when chars array reference changes
 * or activeIndex enters/leaves this ayah's range.
 */
const MushafAyah = memo(function MushafAyah({
    chars,
    ayaNum,
    activeIndex,
    onPlayAya,
    playingAya,
    onExplainError,
    selectedSurah,
}) {
    const [hovered, setHovered] = useState(false);
    const isPlaying = playingAya === ayaNum;
    const showOverlay = onPlayAya && (hovered || isPlaying);

    const handlePlay = useCallback((e) => {
        e.stopPropagation();
        onPlayAya(ayaNum);
    }, [onPlayAya, ayaNum]);

    return (
        <span
            className={`uv-aya-group${hovered && !isPlaying ? ' uv-aya-hovered' : ''}${isPlaying ? ' uv-aya-playing' : ''}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <span className="uv-aya-text">
                {buildSegments(chars).map((seg) => {
                    if (seg.type === 'marker') {
                        return (
                            <span key={seg.key} className="mr-ayah-end-marker" data-ayah={ayaNum}>
                                <span className="mr-ayah-symbol">۝</span>
                                <span className="mr-ayah-number">{ayaNum}</span>
                            </span>
                        );
                    }
                    return (
                        <MushafChar
                            key={seg.key}
                            char={seg.char}
                            activeIndex={activeIndex}
                            onExplainError={onExplainError}
                        />
                    );
                })}
            </span>

            {/* Hover overlay with play button */}
            {showOverlay && (
                <div className={`uv-aya-overlay-wrapper${isPlaying ? ' uv-aya-overlay-wrapper--playing' : ''}`}>
                    <div className="uv-husary-container">
                        <img src="/husary.png" alt="الشيخ الحصري" className="uv-husary-img-large" />
                    </div>
                    <button
                        className={`uv-aya-overlay-btn${isPlaying ? ' uv-aya-overlay-btn--playing' : ''}`}
                        onClick={handlePlay}
                    >
                        {isPlaying ? (
                            <>
                                <span className="uv-wave-bars">
                                    <span /><span /><span /><span />
                                </span>
                                <span className="uv-btn-label">إيقاف</span>
                            </>
                        ) : (
                            <>
                                <Volume2 size={15} className="uv-btn-icon" />
                                <span className="uv-btn-label">استمع للآية</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </span>
    );
}, (prev, next) => {
    // Re-render only if chars changed or active index is within this ayah
    if (prev.chars !== next.chars) return false;
    if (prev.playingAya !== next.playingAya) return false;
    if (prev.ayaNum !== next.ayaNum) return false;
    
    // Check if activeIndex is relevant to THIS ayah
    const prevInRange = prev.activeIndex !== null && prev.chars.some(c => c.index === prev.activeIndex);
    const nextInRange = next.activeIndex !== null && next.chars.some(c => c.index === next.activeIndex);
    if (prevInRange !== nextInRange) return false;
    if (prevInRange && nextInRange && prev.activeIndex !== next.activeIndex) return false;
    
    return true;
});

export default MushafAyah;
