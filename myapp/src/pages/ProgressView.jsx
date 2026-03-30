import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { staggerContainer, fadeInUp } from '../utils/animations';
import useAppStore from '../store/useAppStore';

const ProgressView = () => {
    const { userProgress, fetchUserProgress } = useAppStore();

    React.useEffect(() => {
        fetchUserProgress();
    }, [fetchUserProgress]);

    const weeklyStats = userProgress.weeklyStats || [];
    const mistakeStats = userProgress.mistakeStats || [];

    // Calculate average accuracy from weekly stats if available
    const avgAccuracy = weeklyStats.length > 0
        ? Math.round(weeklyStats.reduce((acc, curr) => acc + parseFloat(curr.avg_score), 0) / weeklyStats.length)
        : 0;

    return (
        <motion.div variants={staggerContainer} initial="initial" animate="animate">
            <motion.h2 variants={fadeInUp} className="text-[28px] text-primary mb-8 font-amiri">لوحة الإحصائيات المتقدمة</motion.h2>
            <div className="stats-row">
                <motion.div variants={fadeInUp} whileHover={{ y: -8, borderColor: '#D4AF37', boxShadow: '0 15px 30px rgba(0, 0, 0, 0.12)' }} className="stat-box"> <CheckCircle size={32} color="#044D29" /> <div className="stat-value-big">{avgAccuracy}%</div> <div className="text-gray-500">الدقة الأسبوعية</div> </motion.div>
                <motion.div variants={fadeInUp} whileHover={{ y: -8, borderColor: '#D4AF37', boxShadow: '0 15px 30px rgba(0, 0, 0, 0.12)' }} className="stat-box"> <TrendingUp size={32} color="#044D29" /> <div className="stat-value-big">{userProgress.versesPracticed}</div> <div className="text-gray-500">آيات تم ممارستها</div> </motion.div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6">
                <motion.div variants={fadeInUp} className="glass-panel p-8"> <h3 className="mb-6 text-primary flex items-center gap-2.5"> <BarChart3 /> الأداء الأسبوعي </h3> <div className="h-[300px]"> <ResponsiveContainer width="100%" height="100%"> <BarChart data={weeklyStats}> <CartesianGrid strokeDasharray="3 3" opacity={0.3} /> <XAxis dataKey="day_num" /> <YAxis /> <Tooltip /> <Bar dataKey="avg_score" fill="#044D29" radius={[4, 4, 0, 0]} /> </BarChart> </ResponsiveContainer> </div> </motion.div>
                <motion.div variants={fadeInUp} className="glass-panel p-8"> <h3 className="mb-6 text-primary flex items-center gap-2.5"> <TrendingUp /> الأخطاء الشائعة </h3> <div className="h-[300px]"> <ResponsiveContainer width="100%" height="100%"> <LineChart data={mistakeStats}> <CartesianGrid strokeDasharray="3 3" opacity={0.3} /> <XAxis dataKey="name" /> <YAxis /> <Tooltip /> <Line type="monotone" dataKey="count" stroke="#D4AF37" strokeWidth={3} dot={{ r: 6 }} /> </LineChart> </ResponsiveContainer> </div> </motion.div>
            </div>
        </motion.div>
    );
};

export default ProgressView;
