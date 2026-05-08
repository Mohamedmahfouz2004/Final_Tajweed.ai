import React, { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Clock, Zap, BarChart2, Activity, TrendingUp, Gauge, MemoryStick, Download } from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ComposedChart, ReferenceLine, Cell,
    PieChart, Pie
} from 'recharts';

// ── Utility Functions ────────────────────────────────────────────
const calcStats = (arr) => {
    if (!arr || arr.length === 0) return { avg: 0, min: 0, max: 0, p95: 0, p99: 0, std: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    const variance = arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length;
    return {
        avg: Math.round(avg * 10) / 10,
        min: Math.round(sorted[0] * 10) / 10,
        max: Math.round(sorted[sorted.length - 1] * 10) / 10,
        p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
        p99: Math.round(sorted[Math.floor(sorted.length * 0.99)] * 10) / 10,
        std: Math.round(Math.sqrt(variance) * 10) / 10,
    };
};

const getLatencyColor = (ms) => {
    if (ms < 200) return '#10b981';
    if (ms < 400) return '#f59e0b';
    return '#ef4444';
};

// ── Custom Tooltip ───────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.95)', borderRadius: 10, padding: '10px 14px',
            border: '1px solid rgba(99, 102, 241, 0.3)', backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
            <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 6px', fontWeight: 600 }}>Chunk #{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, fontSize: 12, margin: '2px 0', fontWeight: 500 }}>
                    {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
                    {p.name.includes('ms') || p.dataKey.includes('ms') ? ' ms' : p.dataKey.includes('mb') || p.dataKey.includes('MB') ? ' MB' : ''}
                </p>
            ))}
        </div>
    );
};

// ── Stat Card ────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, unit, color, subtitle }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))',
            borderRadius: 16, padding: '20px 18px',
            border: `1px solid ${color}22`, position: 'relative', overflow: 'hidden',
        }}
    >
        <div style={{
            position: 'absolute', top: -20, right: -20, width: 80, height: 80,
            borderRadius: '50%', background: `${color}08`,
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${color}18`, border: `1px solid ${color}30`,
            }}>
                <Icon size={18} color={color} />
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.5px' }}>{label}</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-1px' }}>
            {value}<span style={{ fontSize: 14, color: '#64748b', marginLeft: 4, fontWeight: 500 }}>{unit}</span>
        </div>
        {subtitle && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{subtitle}</div>}
    </motion.div>
);

// ── Chart Wrapper ────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children, span = 1 }) => {
    const cardRef = useRef(null);
    const [isDownloadingCard, setIsDownloadingCard] = useState(false);

    const handleDownloadCard = async () => {
        if (!cardRef.current) return;
        setIsDownloadingCard(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                style: { background: '#0f172a' },
                pixelRatio: 3 // High res for printing individual charts
            });
            const link = document.createElement('a');
            link.download = `${title.replace(/\s+/g, '_').toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download chart', err);
        } finally {
            setIsDownloadingCard(false);
        }
    };

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))',
                borderRadius: 16, padding: 24, border: '1px solid rgba(51, 65, 85, 0.4)',
                gridColumn: span > 1 ? `span ${span}` : undefined,
                position: 'relative'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: 0, letterSpacing: '-0.3px' }}>{title}</h3>
                    {subtitle && <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>{subtitle}</p>}
                </div>
                <button
                    onClick={handleDownloadCard}
                    disabled={isDownloadingCard}
                    title="Download this chart"
                    style={{
                        background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                        cursor: isDownloadingCard ? 'not-allowed' : 'pointer',
                        color: '#818cf8', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', opacity: isDownloadingCard ? 0.5 : 1
                    }}
                    onMouseOver={(e) => { if (!isDownloadingCard) { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; } }}
                    onMouseOut={(e) => { if (!isDownloadingCard) { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; } }}
                >
                    <Download size={16} />
                </button>
            </div>
            {children}
        </motion.div>
    );
};

// ══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
const AnalyticsDashboard = ({ isOpen, onClose, metricsHistory = [] }) => {

    const analytics = useMemo(() => {
        if (!metricsHistory || metricsHistory.length === 0) return null;

        const totalMs = metricsHistory.map(m => m.total_ms || m.inference_ms || 0);
        const modelMs = metricsHistory.map(m => m.model_ms || 0);
        const postMs = metricsHistory.map(m => m.post_ms || 0);
        const gpuMem = metricsHistory.filter(m => m.gpu?.mem_alloc_mb).map(m => m.gpu.mem_alloc_mb);

        const totalStats = calcStats(totalMs);
        const modelStats = calcStats(modelMs);
        const postStats = calcStats(postMs);
        const gpuStats = gpuMem.length > 0 ? calcStats(gpuMem) : null;

        // Build histogram for latency distribution
        const bucketSize = 50;
        const maxVal = Math.ceil(totalStats.max / bucketSize) * bucketSize;
        const histogram = [];
        for (let i = 0; i <= maxVal; i += bucketSize) {
            const count = totalMs.filter(v => v >= i && v < i + bucketSize).length;
            histogram.push({ range: `${i}-${i + bucketSize}`, count, mid: i + bucketSize / 2 });
        }

        // Pipeline breakdown (avg)
        const pipeline = [
            { name: 'Model Inference', value: modelStats.avg, color: '#6366f1' },
            { name: 'Post-Processing', value: postStats.avg, color: '#22d3ee' },
        ];

        // Speed factor (processing 1s of audio)
        const lastEntry = metricsHistory[metricsHistory.length - 1];
        const totalAudioS = lastEntry?.buffer_s || 0;
        const totalProcessingS = totalMs.reduce((s, v) => s + v, 0) / 1000;
        const speedFactor = totalAudioS > 0 && totalProcessingS > 0 ? (totalAudioS / totalProcessingS).toFixed(1) : 'N/A';

        const gpuName = metricsHistory.find(m => m.gpu?.name)?.gpu?.name || 'N/A';

        return {
            totalStats, modelStats, postStats, gpuStats,
            histogram, pipeline, speedFactor, gpuName,
            totalAudioS, totalChunks: metricsHistory.length,
        };
    }, [metricsHistory]);

    if (!isOpen) return null;

    const hasData = analytics && metricsHistory.length > 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
                    overflowY: 'auto', padding: '10px 20px',
                }}
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 40 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                        width: '100%', maxWidth: 1300,
                        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                        borderRadius: 24, border: '1px solid rgba(99, 102, 241, 0.15)',
                        boxShadow: '0 25px 100px rgba(0,0,0,0.5), 0 0 60px rgba(99, 102, 241, 0.08)',
                        overflow: 'hidden',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Header ──────────────────────────────────── */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '24px 32px', borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                        background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.05), transparent)',
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                }}>
                                    <BarChart2 size={20} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
                                        Model Performance Analytics
                                    </h2>
                                    <p style={{ margin: 0, fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                                        Muaalem v3.2 — Real-Time Inference Report
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={onClose}
                            style={{
                                background: 'rgba(51, 65, 85, 0.5)', border: '1px solid rgba(71, 85, 105, 0.5)',
                                borderRadius: 10, width: 36, height: 36, display: 'flex',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                color: '#94a3b8', transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#ef4444'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(51, 65, 85, 0.5)'; e.currentTarget.style.color = '#94a3b8'; }}
                        >
                            <X size={18} />
                        </button>
                        </div>
                    </div>

                    {/* ── Body ────────────────────────────────────── */}
                    <div style={{ padding: '28px 32px 36px' }}>
                        {!hasData ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                <Activity size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                                <p style={{ fontSize: 16, fontWeight: 600 }}>No session data available</p>
                                <p style={{ fontSize: 13 }}>Complete a recitation to see performance analytics.</p>
                            </div>
                        ) : (
                            <>
                                {/* ── KPI Summary Cards ──────────────── */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
                                    <StatCard icon={Clock} label="AVG LATENCY" value={analytics.totalStats.avg} unit="ms"
                                        color={getLatencyColor(analytics.totalStats.avg)}
                                        subtitle={`Min: ${analytics.totalStats.min}ms • Max: ${analytics.totalStats.max}ms`} />
                                    <StatCard icon={Zap} label="P95 LATENCY" value={analytics.totalStats.p95} unit="ms"
                                        color={getLatencyColor(analytics.totalStats.p95)}
                                        subtitle={`P99: ${analytics.totalStats.p99}ms • σ: ${analytics.totalStats.std}ms`} />
                                    <StatCard icon={TrendingUp} label="SPEED FACTOR" value={analytics.speedFactor} unit="x"
                                        color="#6366f1"
                                        subtitle={`${analytics.totalAudioS}s audio in ${analytics.totalChunks} chunks`} />
                                    <StatCard icon={Cpu} label="GPU" value={analytics.gpuStats ? analytics.gpuStats.avg : 'N/A'} unit={analytics.gpuStats ? 'MB' : ''}
                                        color="#22d3ee"
                                        subtitle={analytics.gpuName} />
                                </div>

                                {/* ── Charts Grid ────────────────────── */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

                                    {/* Chart 1: End-to-End Latency Timeline */}
                                    <ChartCard title="End-to-End Latency Timeline" subtitle="Total inference latency per chunk over session duration" span={2}>
                                        <div style={{ height: 200 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={metricsHistory}>
                                                    <defs>
                                                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                                                    <XAxis dataKey="chunk" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} label={{ value: 'Chunk #', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 11 }} />
                                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                                                    <ReferenceLine y={analytics.totalStats.avg} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `Avg: ${analytics.totalStats.avg}ms`, fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                                                    <Area isAnimationActive={false} type="monotone" dataKey="total_ms" name="Total Latency (ms)" stroke="#6366f1" fill="url(#gradTotal)" strokeWidth={2} dot={false} />
                                                    <Line isAnimationActive={false} type="monotone" dataKey="model_ms" name="Model (ms)" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                                                    <Line isAnimationActive={false} type="monotone" dataKey="post_ms" name="Post-Process (ms)" stroke="#22d3ee" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </ChartCard>

                                    {/* Chart 2: Latency Distribution */}
                                    <ChartCard title="Latency Distribution" subtitle="Histogram of total inference times across all chunks" span={1}>
                                        <div style={{ height: 180 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analytics.histogram}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                                                    <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#334155' }} label={{ value: 'Latency Range (ms)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                                                    <Bar isAnimationActive={false} dataKey="count" name="Chunk Count" radius={[6, 6, 0, 0]}>
                                                        {analytics.histogram.map((entry, i) => (
                                                            <Cell key={i} fill={getLatencyColor(entry.mid)} fillOpacity={0.8} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </ChartCard>

                                    {/* Chart 3: Pipeline Breakdown */}
                                    <ChartCard title="Pipeline Breakdown" subtitle="Average time spent in each processing stage" span={1}>
                                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={analytics.pipeline}
                                                        cx="50%" cy="50%"
                                                        innerRadius={55} outerRadius={90}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                        isAnimationActive={false}
                                                    >
                                                        {analytics.pipeline.map((entry, i) => (
                                                            <Cell key={i} fill={entry.color} stroke="transparent" />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
                                            {analytics.pipeline.map((p, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                                                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{p.name} ({p.value}ms)</span>
                                                </div>
                                            ))}
                                        </div>
                                    </ChartCard>

                                    {/* Chart 4: GPU Memory Usage */}
                                    {analytics.gpuStats && (
                                        <ChartCard title="GPU Memory Usage" subtitle="VRAM allocation throughout the session" span={1}>
                                            <div style={{ height: 180 }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={metricsHistory.filter(m => m.gpu?.mem_alloc_mb)}>
                                                        <defs>
                                                            <linearGradient id="gradGpu" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                                                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                                                        <XAxis dataKey="chunk" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} />
                                                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} label={{ value: 'VRAM (MB)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                                                        <Area isAnimationActive={false} type="monotone" dataKey={(d) => d.gpu?.mem_alloc_mb} name="Allocated VRAM (MB)" stroke="#22d3ee" fill="url(#gradGpu)" strokeWidth={2} dot={false} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </ChartCard>
                                    )}

                                    {/* Chart 5: Model vs Post-Processing Stacked */}
                                    <ChartCard title="Processing Pipeline Over Time" subtitle="Stacked view of model inference vs post-processing per chunk" span={1}>
                                        <div style={{ height: 180 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={metricsHistory}>
                                                    <defs>
                                                        <linearGradient id="gradModel" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                                                        </linearGradient>
                                                        <linearGradient id="gradPost" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.5} />
                                                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                                                    <XAxis dataKey="chunk" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} label={{ value: 'Chunk #', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#334155' }} label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                                                    <Area isAnimationActive={false} type="monotone" dataKey="model_ms" name="Model Inference (ms)" stackId="1" stroke="#8b5cf6" fill="url(#gradModel)" strokeWidth={1.5} />
                                                    <Area isAnimationActive={false} type="monotone" dataKey="post_ms" name="Post-Processing (ms)" stackId="1" stroke="#22d3ee" fill="url(#gradPost)" strokeWidth={1.5} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </ChartCard>
                                </div>

                                {/* ── Summary Table ──────────────────── */}
                                <div style={{ marginTop: 24 }}>
                                    <ChartCard title="Statistical Summary" subtitle="Comprehensive latency metrics across all pipeline stages">
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: 13 }}>
                                                <thead>
                                                    <tr>
                                                        {['Metric', 'Avg', 'Min', 'Max', 'P95', 'P99', 'Std Dev'].map(h => (
                                                            <th key={h} style={{
                                                                textAlign: 'left', padding: '10px 14px', color: '#94a3b8',
                                                                fontWeight: 600, fontSize: 11, letterSpacing: '0.5px',
                                                                borderBottom: '1px solid rgba(51,65,85,0.5)',
                                                            }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[
                                                        { name: 'End-to-End Latency', stats: analytics.totalStats, unit: 'ms', color: '#6366f1' },
                                                        { name: 'Model Inference', stats: analytics.modelStats, unit: 'ms', color: '#8b5cf6' },
                                                        { name: 'Post-Processing', stats: analytics.postStats, unit: 'ms', color: '#22d3ee' },
                                                        ...(analytics.gpuStats ? [{ name: 'GPU Memory (VRAM)', stats: analytics.gpuStats, unit: 'MB', color: '#f59e0b' }] : []),
                                                    ].map((row, i) => (
                                                        <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(30, 41, 59, 0.3)' : 'transparent' }}>
                                                            <td style={{ padding: '6px 14px', color: row.color, fontWeight: 700 }}>{row.name}</td>
                                                            {['avg', 'min', 'max', 'p95', 'p99', 'std'].map(k => (
                                                                <td key={k} style={{ padding: '6px 14px', color: '#e2e8f0', fontWeight: 500 }}>
                                                                    {row.stats[k]} <span style={{ color: '#64748b', fontSize: 11 }}>{row.unit}</span>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </ChartCard>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AnalyticsDashboard;
