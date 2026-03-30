import React from 'react';
import { motion } from 'framer-motion';

const Footer = () => (
    <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full p-8 text-center border-t border-primary/10 text-gray-500 text-sm font-arabic bg-white/80 backdrop-blur-sm mt-10"
    >
        <motion.div whileHover={{ scale: 1.05 }} className="cursor-pointer mb-3 font-bold text-primary text-lg font-sans">Tajweed.ai</motion.div>
        <p className="mb-2">© 2025 جميع الحقوق محفوظة - رفيقك في رحلة إتقان القرآن الكريم</p>
        <div className="flex justify-center gap-4 mt-4">
            {['سياسة الخصوصية', 'شروط الاستخدام', 'اتصل بنا'].map((text, i) => (
                <motion.span key={i} whileHover={{ y: -2, color: '#D4AF37' }} className="cursor-pointer text-primary">{text}</motion.span>
            ))}
        </div>
    </motion.footer>
);

export default Footer;
