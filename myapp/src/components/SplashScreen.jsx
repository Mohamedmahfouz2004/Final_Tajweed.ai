import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import Lottie from 'lottie-react';
import loadingAnimation from '../assets/lottie/loading.json';

const SplashScreen = ({ show }) => (
    <AnimatePresence>
        {show && (
            <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center z-[9999]"
                style={{ background: 'linear-gradient(135deg, #033520 0%, #044D29 50%, #065F46 100%)' }}
            >
                {/* Decorative background pattern */}
                <div
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 20% 50%, #D4AF37 1px, transparent 1px), radial-gradient(circle at 80% 20%, #D4AF37 1px, transparent 1px), radial-gradient(circle at 60% 80%, #D4AF37 1px, transparent 1px)',
                        backgroundSize: '60px 60px, 80px 80px, 100px 100px',
                    }}
                />

                {/* Spinning Lottie ring behind the icon */}
                <div className="relative w-[180px] h-[180px] flex items-center justify-center">
                    <div className="absolute -inset-5">
                        <Lottie animationData={loadingAnimation} loop={true} style={{ width: 220, height: 220 }} />
                    </div>

                    {/* Decorative Octagon Shapes behind Icon */}
                    <motion.div
                        initial={{ scale: 0, rotate: 45 }}
                        animate={{ scale: 1, rotate: 45 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute inset-0 flex items-center justify-center opacity-30"
                    >
                        <div className="w-[160px] h-[160px] border-2 border-[#D4AF37] rounded-3xl"></div>
                    </motion.div>

                    {/* Original spinning golden circle + BookOpen icon */}
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                        className="w-[120px] h-[120px] bg-secondary rounded-full flex items-center justify-center relative z-[2] border-4 border-[#D4AF37]/50"
                        style={{
                            boxShadow: '0 0 50px rgba(212, 175, 55, 0.5), 0 0 100px rgba(212, 175, 55, 0.2)',
                        }}
                    >
                        <BookOpen size={64} color="#044D29" />
                    </motion.div>
                </div>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
                    className="flex flex-col items-center mt-8 mb-2"
                >
                    <h1 className="font-amiri text-7xl text-[#FDFCF5] leading-tight m-0 tracking-wide drop-shadow-[0_4px_10px_rgba(0,0,0,0.3)]">تجويد</h1>
                    <span className="font-sans text-sm tracking-[0.5em] text-[#D4AF37] uppercase font-bold mt-1" style={{ textShadow: '0 2px 10px rgba(212, 175, 55, 0.2)' }}>Tajweed.ai</span>
                </motion.div>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="text-white/75 font-arabic text-lg tracking-widest"
                >
                    ارتقِ بتلاوتك
                </motion.p>

                {/* Loading bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.4 }}
                    className="mt-10 w-40 h-[3px] bg-white/15 rounded overflow-hidden"
                >
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 1.1, duration: 1.3, ease: 'easeInOut' }}
                        className="h-full rounded"
                        style={{ background: 'linear-gradient(90deg, #D4AF37, #F5D76E)' }}
                    />
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default SplashScreen;
