import { memo } from 'react';
import { REVEAL_MODES, MODE_LABELS } from '../../hooks/useMushafReveal';

/**
 * MushafModeSelector — Premium mode switcher for the Mushaf Reveal Engine.
 * 
 * Allows the user to switch between 4 memorization modes:
 *   - Full (Reading) — Text always visible
 *   - Hidden (Test) — Text hidden until read
 *   - Ghost — Faint text becomes clear
 *   - Fill (Ink) — Empty page fills with ink
 */
const MushafModeSelector = memo(function MushafModeSelector({ currentMode, onModeChange, disabled }) {
    const modes = Object.values(REVEAL_MODES);

    return (
        <div className="mr-mode-selector" dir="rtl">
            {modes.map((mode) => {
                const info = MODE_LABELS[mode];
                const isActive = currentMode === mode;

                return (
                    <button
                        key={mode}
                        className={`mr-mode-btn${isActive ? ' mr-mode-active' : ''}`}
                        onClick={() => onModeChange(mode)}
                        disabled={disabled}
                        title={info.description}
                    >
                        <span className="mr-mode-icon">{info.icon}</span>
                        <span className="mr-mode-label">{info.label}</span>
                    </button>
                );
            })}
        </div>
    );
});

export default MushafModeSelector;
