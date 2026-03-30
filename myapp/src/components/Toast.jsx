import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const Toast = ({ message }) => (
    <AnimatePresence>
        {message && (
            <motion.div
                initial={{ opacity: 0, y: 50, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 20, x: '-50%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="fixed bottom-10 left-1/2 bg-emerald-50 border border-emerald-500 text-emerald-700 px-6 py-3 rounded-full shadow-lg z-[3000] flex items-center gap-3 text-base font-arabic"
            >
                <CheckCircle size={20} />
                <span className="font-medium">{message}</span>
            </motion.div>
        )}
    </AnimatePresence>
);

export default Toast;
