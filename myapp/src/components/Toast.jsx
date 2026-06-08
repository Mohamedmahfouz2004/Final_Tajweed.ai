import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const Toast = ({ message }) => (
    <AnimatePresence>
        {message && (
            <motion.div
                initial={{ opacity: 0, y: 30, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 16, x: '-50%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="fixed bottom-10 left-1/2 z-[3000]"
                style={{
                    background: 'var(--ink-900)',
                    color: 'var(--parchment-50)',
                    border: '1px solid rgba(212,196,160,0.3)',
                    borderRadius: 999,
                    boxShadow: '0 16px 36px -12px rgba(15,26,13,0.5)',
                    padding: '12px 20px',
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    fontFamily: 'var(--font-ibm), IBM Plex Sans Arabic, sans-serif',
                    fontWeight: 600, fontSize: '0.92rem',
                }}
            >
                <CheckCircle size={18} color="var(--emerald-500)" strokeWidth={2.4} />
                <span>{message}</span>
            </motion.div>
        )}
    </AnimatePresence>
);

export default Toast;
