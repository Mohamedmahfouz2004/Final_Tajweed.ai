import { Howl, Howler } from 'howler';

/**
 * AudioService — Singleton wrapping Howler.js for Quran verse playback.
 * 
 * Features:
 * - Manages play/pause/stop lifecycle
 * - Exposes an AnalyserNode for WaveformVisualizer
 * - Handles audio ended callback
 * - Smooth volume fading
 */
class AudioService {
    constructor() {
        this.currentHowl = null;
        this.analyser = null;
        this.audioContext = null;
        this.onEndCallback = null;
    }

    /**
     * Ensure the Web Audio API context and analyser are set up.
     * Howler uses a shared AudioContext — we tap into it.
     */
    _ensureAnalyser() {
        if (this.analyser) return;

        // Howler exposes its AudioContext
        this.audioContext = Howler.ctx;
        if (!this.audioContext) return;

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;

        // Connect Howler's master gain → our analyser → destination
        // This gives the visualizer frequency data from ALL Howler sounds
        Howler.masterGain.connect(this.analyser);
    }

    /**
     * Play a verse audio URL.
     * @param {string} url - The audio file URL
     * @param {function} onEnd - Callback when playback finishes
     * @returns {Promise} Resolves when audio starts playing
     */
    play(url, onEnd) {
        // Stop any currently playing audio
        this.stop();

        this.onEndCallback = onEnd;

        return new Promise((resolve, reject) => {
            this.currentHowl = new Howl({
                src: [url],
                html5: false, // Use Web Audio API for analyser access
                format: ['mp3'],
                volume: 1.0,
                onplay: () => {
                    this._ensureAnalyser();
                    resolve();
                },
                onend: () => {
                    if (this.onEndCallback) this.onEndCallback();
                },
                onloaderror: (id, err) => {
                    console.error('Audio load error:', err);
                    reject(err);
                },
                onplayerror: (id, err) => {
                    console.error('Audio play error:', err);
                    // Try resuming AudioContext (common browser autoplay policy)
                    if (this.audioContext && this.audioContext.state === 'suspended') {
                        this.audioContext.resume().then(() => this.currentHowl?.play());
                    }
                },
            });

            this.currentHowl.play();
        });
    }

    /** Pause the current audio */
    pause() {
        if (this.currentHowl && this.currentHowl.playing()) {
            this.currentHowl.pause();
        }
    }

    /** Resume paused audio */
    resume() {
        if (this.currentHowl && !this.currentHowl.playing()) {
            this.currentHowl.play();
        }
    }

    /** Toggle between play and pause */
    togglePlayPause() {
        if (!this.currentHowl) return;
        if (this.currentHowl.playing()) {
            this.pause();
        } else {
            this.resume();
        }
    }

    /** Stop and destroy the current audio */
    stop() {
        if (this.currentHowl) {
            this.currentHowl.stop();
            this.currentHowl.unload();
            this.currentHowl = null;
        }
    }

    /** Check if currently playing */
    isPlaying() {
        return this.currentHowl ? this.currentHowl.playing() : false;
    }

    /** Get the AnalyserNode for WaveformVisualizer */
    getAnalyser() {
        this._ensureAnalyser();
        return this.analyser;
    }

    /** Get the AudioContext */
    getAudioContext() {
        return this.audioContext || Howler.ctx;
    }
}

// Export singleton instance
const audioService = new AudioService();
export default audioService;
