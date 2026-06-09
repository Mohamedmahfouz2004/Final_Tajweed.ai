import { useCallback, useRef, useMemo } from 'react';

/**
 * useMushafReveal — Custom hook for Progressive Mushaf Reveal state management.
 * 
 * Manages:
 *   - Reveal mode state (full | hidden | ghost | fill)
 *   - Active character tracking (currently being read)
 *   - Progress calculation
 *   - Character classification (marker detection, status mapping)
 * 
 * Performance: Uses refs for high-frequency updates, only triggers
 * re-renders when mode changes or progress thresholds are crossed.
 */

export const REVEAL_MODES = {
    FULL: 'full',
    HIDDEN: 'hidden',
};

export const MODE_LABELS = {
    [REVEAL_MODES.FULL]:   { label: 'إظهار النص',    icon: '📖', description: 'النص ظاهر بالكامل' },
    [REVEAL_MODES.HIDDEN]: { label: 'إخفاء النص',   icon: '🔒', description: 'النص مخفي — يظهر عند القراءة' },
};

const MARKER_REGEX = /[\s\u06DD٠-٩0-9]/;

/**
 * Classify a character as marker or text
 */
export function isMarkerChar(ch) {
    return MARKER_REGEX.test(ch);
}

/**
 * Error type → CSS class mapping
 */
const ERROR_CSS = {
    madd:      'mr-err-madd',
    ghunna:    'mr-err-ghunna',
    qalqala:   'mr-err-qalqala',
    vowel:     'mr-err-vowel',
    phoneme:   'mr-err-phoneme',
    deletion:  'mr-err-deletion',
    insertion: 'mr-err-insertion',
    sifat:     'mr-err-sifat',
};

/**
 * Build the CSS class string for a single character based on its state.
 * This is the core rendering decision — called for every char, must be fast.
 */
export function getCharClasses(char, activeIndex) {
    const classes = ['mr-char'];
    
    // Marker characters are always visible
    if (isMarkerChar(char.char)) {
        classes.push('mr-marker');
    }
    
    // Status class
    classes.push(`mr-status-${char.status || 0}`);
    
    // Active (currently being read) glow
    if (activeIndex !== null && char.index === activeIndex) {
        classes.push('mr-active');
    }
    
    // Error decoration
    if (char.status >= 2 && char.error_type && char.error_type !== 'none') {
        const errClass = ERROR_CSS[char.error_type];
        if (errClass) classes.push(errClass);
    }
    
    return classes.join(' ');
}

/**
 * Calculate progress stats from chars array.
 * Returns { correct, errors, future, total, progress (0-100) }
 */
export function calcProgress(chars) {
    if (!chars || chars.length === 0) return { correct: 0, errors: 0, future: 0, total: 0, progress: 0 };
    
    let correct = 0, errors = 0, future = 0;
    const seen = new Set();
    
    for (const c of chars) {
        if (isMarkerChar(c.char)) continue;
        if (seen.has(c.index)) continue;
        seen.add(c.index);
        
        if (c.status === 1) correct++;
        else if (c.status >= 2) errors++;
        else future++;
    }
    
    const total = correct + errors + future;
    const progress = total > 0 ? Math.round(((correct + errors) / total) * 100) : 0;
    
    return { correct, errors, future, total, progress };
}

/**
 * Find the index of the "active" character — the last character with
 * status > 0, which represents the current reading position.
 */
export function findActiveIndex(chars) {
    if (!chars || chars.length === 0) return null;
    
    let lastActive = null;
    for (let i = chars.length - 1; i >= 0; i--) {
        if (chars[i].status > 0 && !isMarkerChar(chars[i].char)) {
            lastActive = chars[i].index;
            break;
        }
    }
    
    // Return the NEXT unread character (one after the last read)
    if (lastActive !== null) {
        for (const c of chars) {
            if (c.index > lastActive && c.status === 0 && !isMarkerChar(c.char)) {
                return c.index;
            }
        }
    }
    
    return lastActive;
}

/**
 * Group consecutive characters with the same status + error_type.
 * This reduces DOM nodes significantly (from per-char to per-group).
 * 
 * Returns: Array of { chars: CharObj[], key: string }
 */
export function groupChars(chars) {
    if (!chars || chars.length === 0) return [];
    
    const groups = [];
    let current = [chars[0]];
    
    for (let i = 1; i < chars.length; i++) {
        const prev = chars[i - 1];
        const curr = chars[i];
        
        const sameStatus = curr.status === prev.status;
        const sameError = curr.error_type === prev.error_type;
        const sameMarker = isMarkerChar(curr.char) === isMarkerChar(prev.char);
        
        if (sameStatus && sameError && sameMarker) {
            current.push(curr);
        } else {
            groups.push(current);
            current = [curr];
        }
    }
    groups.push(current);
    
    return groups;
}

/**
 * Split chars into ayah groups, using the ۝ (U+06DD) marker.
 * Returns: Array of { ayaNum, groups: CharGroup[] }
 */
export function splitByAyah(chars, fromVerse = 1) {
    if (!chars || chars.length === 0) return [];
    
    const ayas = [];
    let currentChars = [];
    let ayaNum = parseInt(fromVerse) || 1;
    
    for (const ch of chars) {
        currentChars.push(ch);
        if (ch.char === '\u06DD') {
            ayas.push({ ayaNum, chars: currentChars });
            currentChars = [];
            ayaNum++;
        }
    }
    
    if (currentChars.length > 0) {
        ayas.push({ ayaNum, chars: currentChars });
    }
    
    return ayas;
}

export default function useMushafReveal() {
    // This hook is intentionally stateless — state is managed by the parent.
    // It provides memoized utility functions only.
    
    const getClasses = useCallback(getCharClasses, []);
    const getProgress = useCallback(calcProgress, []);
    const getActive = useCallback(findActiveIndex, []);
    const getGroups = useCallback(groupChars, []);
    const getAyahs = useCallback(splitByAyah, []);
    
    return {
        getCharClasses: getClasses,
        calcProgress: getProgress,
        findActiveIndex: getActive,
        groupChars: getGroups,
        splitByAyah: getAyahs,
        REVEAL_MODES,
        MODE_LABELS,
    };
}
