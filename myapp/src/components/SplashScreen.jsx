'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_LINES = [
  'INITIALIZING TAJWEED.AI ENGINE...',
  'LOADING ARABIC NLP MODELS...',
  'CALIBRATING VOICE RECOGNITION...',
  'SYSTEM READY ✓',
];

function BootText() {
  const [lines, setLines] = useState([]);
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setLines(prev => [...prev, BOOT_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 380);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '0.66rem',
        letterSpacing: '0.1em',
        color: 'var(--brass-500)',
        textAlign: 'left',
        direction: 'ltr',
        lineHeight: 1.9,
        minHeight: '5.5em',
        width: 280,
      }}
    >
      {lines.map((line, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          {'> '}{line}
        </motion.div>
      ))}
    </div>
  );
}

const SplashScreen = ({ show }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center z-[9999]"
        style={{ background: 'var(--ink-900)' }}
      >
        {/* CRT scanline */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.025) 3px, rgba(255,255,255,0.025) 4px)',
          pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Brass border frame */}
        <div style={{
          position: 'absolute', top: 24, bottom: 24, left: 24, right: 24,
          border: '2px solid var(--brass-500)', pointerEvents: 'none', zIndex: 1,
        }} />
        <div style={{
          position: 'absolute', top: 32, bottom: 32, left: 32, right: 32,
          border: '1px dashed rgba(216,185,120,0.35)', pointerEvents: 'none', zIndex: 1,
        }} />

        {/* Corner markers */}
        {[
          { top: 24, left: 24 },
          { top: 24, right: 24 },
          { bottom: 24, left: 24 },
          { bottom: 24, right: 24 },
        ].map((style, i) => (
          <div key={i} style={{
              position: 'absolute', ...style, width: 14, height: 14,
              background: 'var(--brass-500)', zIndex: 2,
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          {/* Logo */}
          <motion.img
            src="/logo.svg"
            alt="تجويد.ai"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              width: 'auto', height: 140,
              filter: 'drop-shadow(0 14px 30px rgba(200,150,62,0.5))',
            }}
          />

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            style={{ textAlign: 'center' }}
          >
            <h1 style={{
              fontFamily: "var(--font-rakkas), 'Rakkas', cursive",
              fontSize: '4.5rem',
              color: 'var(--parchment-50)',
              lineHeight: 1, margin: 0, letterSpacing: '0.01em', fontWeight: 400,
            }}>
              تجويد
            </h1>
            <span style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '0.78rem', letterSpacing: '0.42em',
              color: 'var(--brass-500)',
              display: 'block', marginTop: 8, textTransform: 'uppercase',
            }}>
              . AI
            </span>
          </motion.div>

          {/* Boot terminal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{
              padding: '14px 18px',
              background: 'var(--ink-900)',
              border: '2px solid var(--brass-500)',
              boxShadow: '0 14px 30px -10px rgba(184,150,62,0.5)',
            }}
          >
            <BootText />
          </motion.div>

          {/* Brutalist loading bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            style={{
              width: 220, height: 10,
              background: 'var(--ink-900)',
              border: '2px solid var(--brass-500)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.9, duration: 1.4, ease: 'easeInOut' }}
              style={{
                height: '100%',
                background: 'repeating-linear-gradient(45deg, var(--brass-500) 0 6px, var(--brass-700) 6px 12px)',
              }}
            />
          </motion.div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default SplashScreen;
