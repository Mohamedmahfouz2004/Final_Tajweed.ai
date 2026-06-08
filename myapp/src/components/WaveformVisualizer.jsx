import React, { useEffect, useRef } from 'react';
import audioService from '../utils/audioService';

const WaveformVisualizer = ({ isPlaying }) => {
    const containerRef = useRef(null);
    const animationRef = useRef();

    useEffect(() => {
        const bars = containerRef.current?.children;
        if (!bars) return;

        const analyser = audioService.getAnalyser();

        const renderFrame = () => {
            animationRef.current = requestAnimationFrame(renderFrame);

            if (analyser) {
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);

                const hasSignal = dataArray.some(v => v > 0);
                const center = Math.floor(bars.length / 2);

                for (let i = 0; i < bufferLength; i++) {
                    const value = dataArray[i];
                    const heightPercent = hasSignal ? 10 + (value / 255) * 90 : 10;
                    if (bars[center + i]) bars[center + i].style.height = `${heightPercent}%`;
                    if (bars[center - 1 - i]) bars[center - 1 - i].style.height = `${heightPercent}%`;
                }
            } else if (isPlaying) {
                const center = Math.floor(bars.length / 2);
                const count = Math.min(center, 32);
                for (let i = 0; i < count; i++) {
                    const height = 15 + Math.random() * 70;
                    if (bars[center + i]) bars[center + i].style.height = `${height}%`;
                    if (bars[center - 1 - i]) bars[center - 1 - i].style.height = `${height}%`;
                }
            }
        };

        if (isPlaying) {
            renderFrame();
        } else {
            cancelAnimationFrame(animationRef.current);
            for (let i = 0; i < bars.length; i++) {
                bars[i].style.height = '10%';
            }
        }

        return () => cancelAnimationFrame(animationRef.current);
    }, [isPlaying]);

    return (
        <div
            ref={containerRef}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '3px', height: '64px', width: '100%', padding: '0 12px', direction: 'ltr',
            }}
        >
            {[...Array(64)].map((_, i) => (
                <div
                    key={i}
                    style={{
                        flex: 1,
                        background: i % 2 === 0 ? 'var(--brass-500)' : 'var(--ink-900)',
                        borderRadius: 0,
                        height: '10%',
                        transition: 'height 0.05s linear',
                    }}
                />
            ))}
        </div>
    );
};

export default WaveformVisualizer;
