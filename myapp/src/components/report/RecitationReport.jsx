'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Mic, Lightbulb, Wrench, Sparkles, Volume2, Square } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { resolveRule } from '../../utils/errorTypeMap';
import { reciters } from '../../utils/data';
import audioService from '../../utils/audioService';

const pad = (n) => String(n).padStart(3, '0');
const FULL_KEY = '__full__';

/**
 * Post-recitation report card. For every distinct tajweed rule the user got
 * wrong it shows a (personalised, LLM-generated or static-fallback) explanation,
 * how to fix it, a CTA to the recommended learning video lesson, and a "listen
 * again" button that plays the correct reference recitation — per rule (the
 * mistake's ayah(s)) and for the whole recited passage.
 *
 * Reads `sessionReport` + `isLoadingReport` built by fetchSessionReport() in the
 * store. Renders nothing until a report exists.
 */
const RecitationReport = () => {
    const router = useRouter();
    const report = useAppStore((s) => s.sessionReport);
    const isLoading = useAppStore((s) => s.isLoadingReport);
    const selectedSurah = useAppStore((s) => s.selectedSurah);
    const selectedReciter = useAppStore((s) => s.selectedReciter);
    const fromVerse = useAppStore((s) => s.fromVerse);
    const toVerse = useAppStore((s) => s.toVerse);

    // Which audio set is currently playing: null | rule_id | FULL_KEY.
    const [playingKey, setPlayingKey] = useState(null);
    // Cancel token so stopping mid-sequence doesn't auto-advance to the next ayah.
    const seqRef = useRef(null);

    // Stop any reference audio when the component unmounts.
    useEffect(() => () => { audioService.stop(); }, []);

    const stopPlayback = () => {
        if (seqRef.current) seqRef.current.cancelled = true;
        audioService.stop();
        setPlayingKey(null);
    };

    // Play a list of ayah numbers (in the selected reciter) one after another.
    // Same everyayah.com pattern as playAya/playVerse; audioService.play() stops
    // any prior audio so only one recitation plays at a time.
    const playAyat = (key, ayatList) => {
        if (!selectedSurah || !Array.isArray(ayatList) || ayatList.length === 0) return;
        if (playingKey === key) { stopPlayback(); return; }
        audioService.stop();

        const reciter = reciters.find((r) => r.id == selectedReciter) || reciters[0];
        const urls = ayatList.map(
            (a) => `https://everyayah.com/data/${reciter.subfolder}/${pad(selectedSurah)}${pad(a)}.mp3`,
        );
        const token = { cancelled: false };
        seqRef.current = token;
        setPlayingKey(key);

        let i = 0;
        const next = () => {
            if (token.cancelled) return;
            if (i >= urls.length) { setPlayingKey(null); return; }
            const url = urls[i++];
            audioService.play(url, next).catch(() => {
                token.cancelled = true;
                setPlayingKey(null);
            });
        };
        next();
    };

    // Full recited passage (from_ayah → to_ayah, inclusive).
    const fromN = parseInt(fromVerse, 10);
    const toN = parseInt(toVerse, 10);
    const fullRange = (Number.isFinite(fromN) && Number.isFinite(toN) && toN >= fromN)
        ? Array.from({ length: toN - fromN + 1 }, (_, k) => fromN + k)
        : [];
    const canPlayFull = !!selectedSurah && fullRange.length > 0;

    if (isLoading) {
        return (
            <div className="mt-4 rounded-2xl border border-[var(--sand-400)] bg-[var(--parchment-50)] p-5 text-right shrink-0">
                <div className="flex items-center justify-end gap-3 text-[var(--ink-700)]">
                    <span className="font-bold">جارٍ تحليل تلاوتك وإعداد الشرح…</span>
                    <Sparkles size={18} className="animate-pulse text-[var(--brass-500)]" />
                </div>
            </div>
        );
    }

    if (!report) return null;

    const rules = report.rules || [];

    // No mistakes → encouraging success card.
    if (rules.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-2xl border border-[var(--emerald-600)]/30 bg-emerald-50/70 p-5 text-right shrink-0"
            >
                <div className="flex items-center justify-end gap-3">
                    <span className="font-amiri text-xl font-bold text-[var(--emerald-600)]">
                        {report.overall_ar || 'أحسنت! لم تُرصد أخطاء في هذه الجلسة. 🎉'}
                    </span>
                    <Sparkles size={20} className="text-[var(--emerald-600)]" />
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-right shrink-0"
        >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between gap-3">
                {/* Listen to the whole recited passage */}
                {canPlayFull ? (
                    <button
                        type="button"
                        onClick={() => playAyat(FULL_KEY, fullRange)}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition"
                        style={playingKey === FULL_KEY
                            ? { background: 'var(--emerald-600)', color: '#fff', borderColor: 'var(--emerald-600)' }
                            : { borderColor: 'var(--sand-400)', color: 'var(--ink-700)' }}
                    >
                        {playingKey === FULL_KEY
                            ? (<><Square size={13} /> إيقاف</>)
                            : (<><Volume2 size={13} /> استمع للمقطع كاملاً</>)}
                    </button>
                ) : <span />}

                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="font-amiri text-2xl font-bold text-[var(--ink-900,#2C1810)]">ملخص التلاوة</h3>
                        {report.overall_ar && (
                            <p className="text-sm text-[var(--ink-700)]">{report.overall_ar}</p>
                        )}
                    </div>
                    <Lightbulb size={22} className="text-[var(--brass-500)]" />
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {rules.map((r, i) => {
                    const meta = resolveRule(r.rule_id);
                    const color = meta.color || 'var(--ink-700)';
                    const icon = meta.icon || '◇';
                    const hasAyat = Array.isArray(r.ayat) && r.ayat.length > 0;
                    const isPlaying = playingKey === r.rule_id;
                    return (
                        <motion.div
                            key={r.rule_id || i}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 + i * 0.05 }}
                            className="rounded-2xl border border-[var(--sand-400)] bg-[var(--parchment-50)] p-4 shadow-sm"
                        >
                            {/* Rule header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    {typeof r.occurrences === 'number' && r.occurrences > 0 && (
                                        <span
                                            className="font-num rounded-full px-2 py-0.5 text-xs font-bold"
                                            style={{ background: `${color}1A`, color }}
                                        >
                                            {r.occurrences} مرة
                                        </span>
                                    )}
                                    {hasAyat && (
                                        <span className="text-xs text-[var(--ink-500)]">
                                            الآيات: {r.ayat.join('، ')}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <div className="font-amiri text-xl font-bold" style={{ color }}>
                                            {r.name_ar || meta.name}
                                        </div>
                                        {r.category_ar && (
                                            <div className="text-xs text-[var(--ink-500)]">{r.category_ar}</div>
                                        )}
                                    </div>
                                    <span
                                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                                        style={{ background: `${color}1A` }}
                                    >
                                        {icon}
                                    </span>
                                </div>
                            </div>

                            {/* Explanation */}
                            {r.explanation_ar && (
                                <p className="mt-3 text-sm leading-relaxed text-[var(--ink-800,#3a2418)]">
                                    {r.explanation_ar}
                                </p>
                            )}

                            {/* How to fix */}
                            {r.how_to_fix_ar && (
                                <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50/70 p-3">
                                    <Wrench size={16} className="mt-0.5 shrink-0 text-[var(--emerald-600)]" />
                                    <div>
                                        <div className="mb-0.5 text-xs font-bold text-[var(--emerald-600)]">كيف تصلحه؟</div>
                                        <p className="text-sm leading-relaxed text-[var(--ink-800,#3a2418)]">{r.how_to_fix_ar}</p>
                                    </div>
                                </div>
                            )}

                            {/* CTAs */}
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                {selectedSurah && hasAyat && (
                                    <button
                                        type="button"
                                        onClick={() => playAyat(r.rule_id, r.ayat)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition"
                                        style={isPlaying
                                            ? { background: color, color: '#fff', borderColor: color }
                                            : { borderColor: 'var(--sand-400)', color: 'var(--ink-700)' }}
                                    >
                                        {isPlaying
                                            ? (<><Square size={13} /> إيقاف</>)
                                            : (<><Volume2 size={13} /> استمع للموضع</>)}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => router.push(`/practical-quiz/${r.rule_id}`)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sand-400)] bg-transparent px-3 py-1.5 text-xs font-bold text-[var(--ink-700)] transition hover:bg-[var(--parchment-200)]"
                                >
                                    <Mic size={13} /> تدرّب على الحكم
                                </button>
                                {r.lesson && r.lesson.id && (
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/lessons/${r.lesson.id}`)}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition"
                                        style={{ background: color }}
                                    >
                                        <BookOpen size={13} /> شاهد الدرس
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default RecitationReport;
