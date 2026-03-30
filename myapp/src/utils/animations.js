// --- Framer Motion Variants (Premium) ---
export const premiumEase = [0.25, 0.46, 0.45, 0.94];

export const pageVariants = {
    initial: { opacity: 0, y: 30, scale: 0.98 },
    animate: {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.6, ease: premiumEase }
    },
    exit: { opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.35, ease: 'easeIn' } },
};

export const staggerContainer = {
    initial: {},
    animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const fadeInUp = {
    initial: { opacity: 0, y: 40 },
    animate: {
        opacity: 1, y: 0,
        transition: { duration: 0.55, ease: premiumEase }
    },
};

export const scaleIn = {
    initial: { opacity: 0, scale: 0.85 },
    animate: {
        opacity: 1, scale: 1,
        transition: { type: 'spring', stiffness: 260, damping: 22 }
    },
    exit: { opacity: 0, scale: 0.85, transition: { duration: 0.25 } },
};

export const modalOverlay = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, transition: { duration: 0.25 } },
};

export const cardHover = {
    rest: { scale: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
    hover: {
        scale: 1.03, y: -6,
        boxShadow: '0 20px 50px rgba(4,77,41,0.15)',
        transition: { type: 'spring', stiffness: 300, damping: 20 }
    },
    tap: { scale: 0.98 },
};

export const buttonPop = {
    rest: { scale: 1 },
    hover: { scale: 1.05, transition: { type: 'spring', stiffness: 400, damping: 15 } },
    tap: { scale: 0.95 },
};

export const slideInRight = {
    initial: { opacity: 0, x: 60 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.5, ease: premiumEase } },
    exit: { opacity: 0, x: -60, transition: { duration: 0.3 } },
};

export const slideInLeft = {
    initial: { opacity: 0, x: -60 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.5, ease: premiumEase } },
    exit: { opacity: 0, x: 60, transition: { duration: 0.3 } },
};
