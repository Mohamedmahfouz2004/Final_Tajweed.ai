import { create } from 'zustand';
import { reciters } from '../utils/data';
import { generateInitialProgress } from '../utils/data';
import audioService from '../utils/audioService';
import { SURAH_LIST } from '../utils/surahNames';
import { API_BASE, fetchJsonSafe, explainMistakes } from '../utils/apiConfig';
import { supabase } from '../utils/supabaseClient';
import { resolveRule } from '../utils/errorTypeMap';


const useAppStore = create((set, get) => ({
    // --- Auth State (synced from Supabase) ---
    isLoggedIn: false,
    authChecked: false,   // true once the initial getSession() has resolved
    currentUser: null,
    userProfile: null,
    setUserProfile: (profile) => set({ userProfile: profile }),

    // Re-fetch the signed-in user's profile (role, settings…) on demand. initAuth
    // only fetches once at login, so anything that changes the DB row afterwards
    // (e.g. an admin role granted via SQL) needs this to refresh the in-memory copy.
    refreshUserProfile: async () => {
        const userId = get().currentUser?.id;
        if (!userId || !supabase) return null;
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (error) {
            console.error('[auth] profile refresh failed:', error.message);
            return null;
        }
        if (data) set({ userProfile: data });
        return data;
    },
    
    initAuth: () => {
        if (typeof window === 'undefined') return;
        if (!supabase) return;
        
        const fetchProfileData = async (user) => {
            if (!user) return;
            try {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (data) {
                    set({ userProfile: data });
                    if (data.preferred_reciter) set({ selectedReciter: data.preferred_reciter });
                    if (data.moshaf_settings && Object.keys(data.moshaf_settings).length > 0) set({ moshafSettings: data.moshaf_settings });
                }
            } catch (e) {
                console.error("Error fetching profile on auth init:", e);
            }
        };

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            set({ isLoggedIn: !!session, currentUser: session?.user || null, authChecked: true });
            if (session?.user) fetchProfileData(session.user);
            // if (session?.user) get().fetchUserProgress();
        });

        // Listen for auth changes (login, logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            set({ isLoggedIn: !!session, currentUser: session?.user || null, authChecked: true });
            if (session?.user) fetchProfileData(session.user);
            else set({ userProfile: null });
            // if (session?.user) get().fetchUserProgress();
        });
        
        return () => subscription.unsubscribe();
    },

    // Opens the sign-in page if not authenticated
    requireAuth: () => {
        if (typeof window !== 'undefined') window.location.href = '/login';
    },


    // --- UI State ---
    showSplash: true,
    hideSplash: () => set({ showSplash: false }),
    toast: null,
    showToast: (msg) => {
        set({ toast: msg });
        setTimeout(() => set({ toast: null }), 3000);
    },

    isMistakesModalOpen: false,
    openMistakesModal: () => set({ isMistakesModalOpen: true }),
    closeMistakesModal: () => set({ isMistakesModalOpen: false }),

    // Session result overlay (shown after a recording session ends)
    sessionResultOpen: false,
    openSessionResult: () => set({ sessionResultOpen: true }),
    closeSessionResult: () => set({ sessionResultOpen: false }),

    // --- Lesson State ---
    lessons: [],
    isLoadingLessons: true,
    setLessons: (lessons) => set({ lessons }),
    selectedLesson: null,
    setSelectedLesson: (lesson) => set({ selectedLesson: lesson }),

    // --- Quran Data ---
    surahs: SURAH_LIST,
    setSurahs: (surahs) => set({ surahs }),
    userProgress: {
        versesPracticed: 0,
        averageAccuracy: 0,
        badgesEarned: 0,
        weeklyStats: [],
        mistakeStats: [],
        completedLessons: 0,
        completedLessonsList: [],
        practicalProgress: {}, // { lessonId: [testId1, testId2, ...] }
    },

    markPracticalTestPassed: (lessonId, testId) => {
        get().updateSupabaseProgress(lessonId, { practical_passed_add: testId });
    },

    markPracticalTestFailed: (lessonId, testId) => {
        get().updateSupabaseProgress(lessonId, { practical_failed_add: testId });
    },

    // --- Adaptive Data ---
    dailyPlaylist: null,
    masteryRadar: null,

    fetchAdaptiveData: async () => {
        const userId = get().currentUser?.id;
        if (!userId) {
            set({ dailyPlaylist: { remediation_practice: [], warmup_revision: [], progression: null } });
            return;
        }

        try {
            // Fetch mistakes for remediation & revision
            const { data: mistakesData } = await supabase.from('mistakes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            
            // Fetch latest session for progression
            const { data: sessionsData } = await supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);

            const activeMistakes = (mistakesData || []).filter(m => !m.is_corrected);
            const correctedMistakes = (mistakesData || []).filter(m => m.is_corrected);

            // Group active mistakes by rule
            const groupedActive = {};
            activeMistakes.forEach(m => {
                if (!groupedActive[m.rule_category]) groupedActive[m.rule_category] = [];
                groupedActive[m.rule_category].push(m);
            });

            // Pick top 2 rules for remediation
            const remediation = Object.values(groupedActive)
                .sort((a, b) => b.length - a.length)
                .slice(0, 2)
                .map(group => ({
                    rule: group[0].rule_category,
                    surah: group[0].surah_number,
                    ayah: group[0].ayah_number
                }));

            // Pick 1 recent corrected rule for warmup
            const warmup = correctedMistakes.length > 0 ? [{
                rule: correctedMistakes[0].rule_category,
                surah: correctedMistakes[0].surah_number,
                ayah: correctedMistakes[0].ayah_number
            }] : [];

            // Progression: Continue from last session
            let progression = null;
            if (sessionsData && sessionsData.length > 0) {
                const lastSession = sessionsData[0];
                progression = {
                    surah: lastSession.surah_number,
                    from_ayah: lastSession.to_ayah + 1 // Start from the next ayah
                };
            } else {
                progression = { surah: 1, from_ayah: 1 }; // Default Al-Fatihah
            }

            set({
                dailyPlaylist: {
                    remediation_practice: remediation,
                    warmup_revision: warmup,
                    progression: progression
                }
            });

        } catch (err) {
            console.error('[STORE] Failed to compute adaptive data:', err);
            set({ dailyPlaylist: { remediation_practice: [], warmup_revision: [], progression: { surah: 1, from_ayah: 1 } } });
        }
    },

    // --- Daily Sessions System ---
    todaySession: null,
    sessionsList: [],
    sessionsSummary: null,
    sessionsPagination: null,

    fetchSessionsList: async (from, to) => {
        const userId = get().currentUser?.id;
        if (!userId || !supabase) return;
        try {
            let query = supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to);

            const { data, error } = await query;
            if (error) throw error;

            // Corrections per day (by corrected_at) so the history shows real ✅ counts.
            const { data: corrected } = await supabase
                .from('mistakes')
                .select('corrected_at')
                .eq('user_id', userId)
                .eq('is_corrected', true)
                .not('corrected_at', 'is', null);
            const correctionsByDay = {};
            (corrected || []).forEach((m) => {
                const d = new Date(m.corrected_at).toISOString().split('T')[0];
                correctionsByDay[d] = (correctionsByDay[d] || 0) + 1;
            });

            const grouped = {};
            (data || []).forEach((row) => {
                const dateStr = new Date(row.created_at).toISOString().split('T')[0];
                if (!grouped[dateStr]) {
                    grouped[dateStr] = {
                        _id: dateStr, date: dateStr, created_at: dateStr,
                        total_mistakes: 0, total_corrections: 0, activities: [],
                    };
                }
                grouped[dateStr].activities.push({
                    type: 'recitation',
                    surah_number: row.surah_number,
                    from_ayah: row.from_ayah,
                    to_ayah: row.to_ayah,
                    mistakes_count: row.total_mistakes,
                    duration_seconds: row.duration_seconds,
                });
                grouped[dateStr].total_mistakes += (row.total_mistakes || 0);
            });
            Object.keys(grouped).forEach((d) => {
                grouped[d].total_corrections = correctionsByDay[d] || 0;
            });

            const sessions = Object.values(grouped).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            set({ sessionsList: sessions });
            return { sessions };
        } catch (err) {
            console.error('[SESSION] Failed to fetch sessions list from Supabase:', err);
        }
    },

    fetchSessionsSummary: async () => {
        const userId = get().currentUser?.id;
        if (!userId || !supabase) return;
        try {
            const { data, error } = await supabase
                .from('sessions')
                .select('created_at, duration_seconds, total_mistakes')
                .eq('user_id', userId);
            if (error) throw error;

            // Corrections = mistakes the user has resolved.
            const { count: correctedCount } = await supabase
                .from('mistakes')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_corrected', true);

            const rows = data || [];
            const uniqueDays = new Set(rows.map(row =>
                row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : 'unknown'
            )).size;

            const summary = {
                total_sessions: uniqueDays, // active days
                // NOTE: field name must match what progress/page.jsx reads.
                total_recitation_time: rows.reduce((acc, r) => acc + (r.duration_seconds || 0), 0),
                total_mistakes: rows.reduce((acc, r) => acc + (r.total_mistakes || 0), 0),
                total_corrections: correctedCount || 0,
            };
            set({ sessionsSummary: summary });
            return summary;
        } catch (err) {
            console.error('[SESSION] Failed to fetch sessions summary from Supabase:', err);
        }
    },

    // --- Gamified progress overview (streak, XP, level, per-rule mastery) ---
    // Single source for the headline progress numbers. Degrades gracefully if the
    // progress-system migration hasn't been applied yet (missing cols/table → zeros).
    progressOverview: null,

    fetchProgressOverview: async () => {
        const userId = get().currentUser?.id;
        if (!userId || !supabase) return;
        try {
            // select('*') so missing gamification columns don't throw pre-migration.
            const [{ data: profile }, { data: mistakes }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).single(),
                supabase.from('mistakes')
                    .select('rule_category, rule_name_ar, is_corrected, occurrence_count, created_at, corrected_at')
                    .eq('user_id', userId),
            ]);

            // Mastery per rule: recency-weighted ratio of resolved vs outstanding errors.
            // Newer + repeated uncorrected mistakes drag mastery down; correcting them
            // (auto-detected on a clean re-recitation) pulls it back up. 21-day half-life.
            const HALF_LIFE = 21;
            const now = Date.now();
            const w = (ts) => {
                if (!ts) return 1;
                const ageDays = (now - new Date(ts).getTime()) / 86400000;
                return Math.pow(0.5, Math.max(0, ageDays) / HALF_LIFE);
            };
            const byRule = {};
            (mistakes || []).forEach((m) => {
                const id = m.rule_category || 'other';
                if (!byRule[id]) byRule[id] = { resolved: 0, outstanding: 0, total: 0, outstandingCount: 0, name: m.rule_name_ar };
                byRule[id].total += 1;
                const occ = m.occurrence_count || 1;
                if (m.is_corrected) byRule[id].resolved += w(m.corrected_at || m.created_at);
                else { byRule[id].outstanding += occ * w(m.created_at); byRule[id].outstandingCount += 1; }
            });
            const mastery = Object.keys(byRule).map((id) => {
                const r = byRule[id];
                const denom = r.resolved + r.outstanding;
                const percent = denom > 0 ? Math.round((r.resolved / denom) * 100) : 100;
                const info = resolveRule(id);
                return { ...info, rule_id: id, name: r.name || info.name, total: r.total, outstandingCount: r.outstandingCount, percent };
            }).sort((a, b) => a.percent - b.percent); // weakest first

            const xp = profile?.xp || 0;
            const overview = {
                xp,
                level: profile?.level || (1 + Math.floor(xp / 500)),
                xpIntoLevel: xp % 500,
                xpForNextLevel: 500,
                currentStreak: profile?.current_streak || 0,
                longestStreak: profile?.longest_streak || 0,
                lastActiveDate: profile?.last_active_date || null,
                dailyGoal: profile?.daily_goal || 5,
                totalRecitationSeconds: profile?.total_recitation_seconds || 0,
                mastery,
                migrated: profile?.xp !== undefined,
            };
            set({ progressOverview: overview });
            return overview;
        } catch (err) {
            console.warn('[progress] fetchProgressOverview failed:', err?.message);
        }
    },

    // --- Data Actions ---
    fetchLessons: async () => {
        set({ isLoadingLessons: true });
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select('*, quizzes(*), practical_tests(*)')
                .order('sequence_order', { ascending: true });
                
            if (error) throw error;
            
            if (data && Array.isArray(data)) {
                set({ lessons: data });
            } else {
                set({ lessons: [] });
            }
        } catch (error) {
            console.error("Error fetching lessons from Supabase:", error);
            set({ lessons: [] });
        } finally {
            set({ isLoadingLessons: false });
        }
    },

    fetchUserProgress: async () => {
        const userId = get().currentUser?.id;
        if (!userId) return;

        // Fetch Supabase lesson progress
        const { data: supaProgress } = await supabase
            .from('progress')
            .select('*')
            .eq('user_id', userId);

        const practicalProgress = {};
        const completedLessonIds = [];
        const lessonProgressDetails = {};
        let completedLessons = 0;

        if (supaProgress) {
            supaProgress.forEach(p => {
                practicalProgress[p.lesson_id] = p.practical_passed || [];
                lessonProgressDetails[p.lesson_id] = p;
                if (p.status === 'completed') {
                    completedLessonIds.push(p.lesson_id);
                    completedLessons++;
                }
            });
        }

        // Mistake stats + accuracy, computed from Supabase (no more Mongo round-trip).
        let totalMistakes = 0;
        let weeklyStats = [];
        let mistakeStats = [];
        let versesPracticed = 0;
        let averageAccuracy = 0;

        const [{ data: activeMistakes }, { data: recentSessions }] = await Promise.all([
            supabase.from('mistakes').select('rule_category, rule_name_ar, surah_number, ayah_number')
                .eq('user_id', userId).eq('is_corrected', false),
            supabase.from('sessions').select('score, surah_number, from_ayah, to_ayah')
                .eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        ]);

        if (activeMistakes) {
            totalMistakes = activeMistakes.length;
            const byRule = {};
            activeMistakes.forEach((m) => {
                const key = m.rule_category || 'other';
                if (!byRule[key]) byRule[key] = { name: key, rule_name_ar: m.rule_name_ar, count: 0 };
                byRule[key].count += 1;
            });
            mistakeStats = Object.values(byRule).sort((a, b) => b.count - a.count);
        }
        if (recentSessions && recentSessions.length) {
            const scores = recentSessions.map((s) => s.score || 0);
            averageAccuracy = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            const verseSet = new Set();
            recentSessions.forEach((s) => {
                for (let a = s.from_ayah; a <= s.to_ayah; a++) verseSet.add(`${s.surah_number}:${a}`);
            });
            versesPracticed = verseSet.size;
        }

        set({
            userProgress: {
                ...get().userProgress,
                practicalProgress,
                lessonProgressDetails,
                totalMistakes,
                weeklyStats,
                mistakeStats,
                versesPracticed,
                completedLessons,
                averageAccuracy,
                completedLessonsList: completedLessonIds
            }
        });
    },

    fetchSurahs: async () => {
        // We already have a base list from SURAH_LIST, but we can refresh it from Muaalem API.
        const data = await fetchJsonSafe(`${API_BASE}/api/surahs`);
        if (Array.isArray(data)) {
            set({ surahs: data.map(s => ({
                id: parseInt(s.id),
                name: s.name,
                name_arabic: s.name,
                aya_count: parseInt(s.aya_count),
                verses_count: parseInt(s.aya_count),
            })) });
        }
    },

    updateSupabaseProgress: async (lessonId, updates) => {
        const userId = get().currentUser?.id;
        if (!userId) return;

        // Get current progress to merge arrays properly
        const { data: current } = await supabase
            .from('progress')
            .select('*')
            .eq('user_id', userId)
            .eq('lesson_id', lessonId)
            .single();

        let payload = { user_id: userId, lesson_id: lessonId, last_accessed: new Date().toISOString() };
        
        if (current) {
            payload = { ...current, ...payload };
        } else {
            payload = { ...payload, theoretical_score: 0, theoretical_answers: {}, practical_passed: [], practical_failed: [], video_watched: false, score: 0, status: 'in_progress' };
        }

        if (updates.theoretical_score !== undefined) payload.theoretical_score = updates.theoretical_score;
        if (updates.theoretical_answers !== undefined) {
            // If explicitly passing empty object, clear it. Otherwise merge.
            if (Object.keys(updates.theoretical_answers).length === 0) {
                payload.theoretical_answers = {};
            } else {
                payload.theoretical_answers = { ...(payload.theoretical_answers || {}), ...updates.theoretical_answers };
            }
        }
        if (updates.video_watched !== undefined) payload.video_watched = updates.video_watched;
        if (updates.is_completed !== undefined) {
            payload.status = updates.is_completed ? 'completed' : 'in_progress';
        }
        
        if (updates.practical_passed_add) {
            if (!payload.practical_passed) payload.practical_passed = [];
            if (!payload.practical_passed.includes(updates.practical_passed_add)) {
                payload.practical_passed.push(updates.practical_passed_add);
            }
        }
        if (updates.practical_failed_add) {
            if (!payload.practical_failed) payload.practical_failed = [];
            if (!payload.practical_failed.includes(updates.practical_failed_add)) {
                payload.practical_failed.push(updates.practical_failed_add);
            }
        }

        const { error } = await supabase.from('progress').upsert(payload, { onConflict: 'user_id, lesson_id' });
        if (!error) {
            get().fetchUserProgress();
        } else {
            console.error("Error updating Supabase progress:", error?.message, error?.details, error?.code, "Payload:", payload);
        }
    },

    // Deprecated: mistakes are persisted to Supabase via processLiveMistakes().
    // Kept as a no-op so any legacy callers don't break. (Previously hit Mongo.)
    logUserMistake: async () => {},

    updateLiveMistake: async (errorType, context = {}) => {
        // context: { surahNumber, ayahNumber, ayahText, charIndex }
        
        // 1. Update Local State (Immediate Feedback)
        set((state) => {
            const currentMistakes = [...state.userProgress.mistakeStats];
            const existing = currentMistakes.find(m => m.name === errorType);
            
            if (existing) {
                existing.count += 1;
            } else {
                currentMistakes.push({ name: errorType, count: 1 });
            }

            return {
                userProgress: {
                    ...state.userProgress,
                    mistakeStats: currentMistakes,
                    totalMistakes: (state.userProgress.totalMistakes || 0) + 1
                }
            };
        });

        // We no longer persist to DB here. This is now handled in batch when the session ends.
    },

    // Deprecated: session mistakes are reconciled + persisted to Supabase by
    // processLiveMistakes() (called from the live-moshaf session-end handler).
    // Kept as a no-op so the existing call site stays harmless. (Previously hit Mongo.)
    saveSessionMistakes: async () => {},

    // --- Site settings (editable footer / contact / legal links) ---
    siteSettings: null,

    fetchSiteSettings: async () => {
        if (!supabase) return;
        try {
            const { data } = await supabase.from('site_settings').select('value').eq('key', 'footer').single();
            if (data?.value) set({ siteSettings: data.value });
        } catch (err) {
            // Table may not exist before the migration is applied — Footer falls back to defaults.
            console.warn('[settings] fetch skipped:', err?.message);
        }
    },

    updateSiteSettings: async (patch) => {
        if (!supabase) return false;
        const value = { ...(get().siteSettings || {}), ...patch };
        const { error } = await supabase.from('site_settings')
            .upsert({ key: 'footer', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) {
            console.error('Update site settings failed:', error.message);
            const missingTable = error.code === '42P01' || /site_settings.*does not exist|relation .*does not exist/i.test(error.message || '');
            get().showToast(missingTable ? '⚠️ شغّل migration الإعدادات في Supabase أولاً' : '❌ فشل حفظ الإعدادات');
            return false;
        }
        set({ siteSettings: value });
        get().showToast('✅ تم حفظ الإعدادات');
        return true;
    },

    // --- Admin Actions (Supabase; gated by is_admin() RLS) ---
    // Reusable select so admin reads come back with nested quizzes + practical tests.
    _lessonSelect: '*, quizzes(*), practical_tests(*)',

    addLesson: async (lessonData) => {
        if (!supabase) return false;
        const { data, error } = await supabase.from('lessons').insert({
            title: lessonData.title,
            description: lessonData.description || '',
            video_url: lessonData.video_url || '',
            content_type: 'video',
            sequence_order: lessonData.sequence_order || (get().lessons.length + 1),
        }).select(get()._lessonSelect).single();
        if (error) {
            console.error('Add lesson failed:', error.message);
            get().showToast('❌ فشل إضافة الدرس');
            return false;
        }
        set({ lessons: [...get().lessons, data].sort((a, b) => a.sequence_order - b.sequence_order) });
        get().showToast('✅ تم إضافة الدرس بنجاح');
        return true;
    },

    updateLesson: async (id, lessonData) => {
        if (!supabase) return false;
        const { data, error } = await supabase.from('lessons').update({
            title: lessonData.title,
            description: lessonData.description,
            video_url: lessonData.video_url,
            sequence_order: lessonData.sequence_order,
        }).eq('id', id).select(get()._lessonSelect).single();
        if (error) {
            console.error('Update lesson failed:', error.message);
            get().showToast('❌ فشل تحديث الدرس');
            return false;
        }
        set({ lessons: get().lessons.map(l => l.id === id ? data : l).sort((a, b) => a.sequence_order - b.sequence_order) });
        get().showToast('✅ تم تحديث الدرس بنجاح');
        return true;
    },

    deleteLesson: async (id) => {
        if (!supabase) return false;
        try {
            // Remove children first (no guaranteed FK cascade on these tables).
            await Promise.all([
                supabase.from('quizzes').delete().eq('lesson_id', id),
                supabase.from('practical_tests').delete().eq('lesson_id', id),
            ]);
            const { error } = await supabase.from('lessons').delete().eq('id', id);
            if (error) throw error;
            set({ lessons: get().lessons.filter(l => l.id !== id) });
            get().showToast('🗑️ تم حذف الدرس بنجاح');
            return true;
        } catch (err) {
            console.error('Delete lesson failed:', err?.message);
            get().showToast('❌ فشل حذف الدرس');
            return false;
        }
    },

    uploadLessonVideo: async (file) => {
        if (!supabase || !file) return null;
        try {
            const ext = (file.name?.split('.').pop() || 'mp4').toLowerCase();
            const path = `lessons/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await supabase.storage.from('lesson-videos')
                .upload(path, file, { cacheControl: '3600', upsert: false });
            if (error) throw error;
            const { data } = supabase.storage.from('lesson-videos').getPublicUrl(path);
            return data.publicUrl;
        } catch (err) {
            console.error('Video upload failed:', err?.message);
            get().showToast('❌ فشل رفع الفيديو');
            return null;
        }
    },

    // --- Quiz Management (Supabase quizzes table) ---
    addQuiz: async (lessonId, quizData) => {
        if (!supabase) return false;
        const { error } = await supabase.from('quizzes').insert({
            lesson_id: lessonId,
            question: quizData.question,
            options: quizData.options,
            correct_answer: quizData.correct_answer,
            points: quizData.points || 10,
        });
        if (error) {
            console.error('Add quiz failed:', error.message);
            get().showToast('❌ فشل إضافة السؤال');
            return false;
        }
        await get().fetchLessons();
        get().showToast('✅ تم إضافة السؤال بنجاح');
        return true;
    },

    updateQuiz: async (quizId, quizData) => {
        if (!supabase) return false;
        const { error } = await supabase.from('quizzes').update({
            question: quizData.question,
            options: quizData.options,
            correct_answer: quizData.correct_answer,
            points: quizData.points,
        }).eq('id', quizId);
        if (error) {
            console.error('Update quiz failed:', error.message);
            get().showToast('❌ فشل تحديث السؤال');
            return false;
        }
        await get().fetchLessons();
        get().showToast('✅ تم تحديث السؤال');
        return true;
    },

    deleteQuiz: async (quizId) => {
        if (!supabase) return false;
        const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
        if (error) {
            console.error('Delete quiz failed:', error.message);
            get().showToast('❌ فشل حذف السؤال');
            return false;
        }
        await get().fetchLessons();
        get().showToast('🗑️ تم حذف السؤال');
        return true;
    },

    // --- Practical Test Management (Supabase practical_tests table) ---
    addPracticalTest: async (lessonId, t) => {
        if (!supabase) return false;
        const { error } = await supabase.from('practical_tests').insert({
            lesson_id: lessonId,
            surah_id: t.surah_id,
            verse_number: t.verse_number,
            target_word: t.target_word,
            target_rule: t.target_rule,
            instruction: t.instruction || '',
            occurrence_index: t.occurrence_index ?? 0,
        });
        if (error) {
            console.error('Add practical test failed:', error.message);
            get().showToast('❌ فشل إضافة الاختبار العملي');
            return false;
        }
        await get().fetchLessons();
        get().showToast('✅ تم إضافة الاختبار العملي');
        return true;
    },

    deletePracticalTest: async (id) => {
        if (!supabase) return false;
        const { error } = await supabase.from('practical_tests').delete().eq('id', id);
        if (error) {
            get().showToast('❌ فشل حذف الاختبار');
            return false;
        }
        await get().fetchLessons();
        get().showToast('🗑️ تم حذف الاختبار العملي');
        return true;
    },

    // --- Admin Stats & User Management (Supabase profiles) ---
    adminStats: null,
    adminUsers: [],

    fetchAdminStats: async () => {
        if (!supabase) return;
        try {
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
            const head = { count: 'exact', head: true };
            const [users, admins, lessons, newUsers, progress, completed, sessions] = await Promise.all([
                supabase.from('profiles').select('id', head),
                supabase.from('profiles').select('id', head).eq('role', 'admin'),
                supabase.from('lessons').select('id', head),
                supabase.from('profiles').select('id', head).gte('created_at', weekAgo),
                supabase.from('progress').select('id', head),
                supabase.from('progress').select('id', head).eq('status', 'completed'),
                supabase.from('sessions').select('id', head),
            ]);
            const totalProgress = progress.count || 0;
            const completedProgress = completed.count || 0;
            set({ adminStats: {
                totalUsers: users.count || 0,
                totalAdmins: admins.count || 0,
                totalLessons: lessons.count || 0,
                newUsersThisWeek: newUsers.count || 0,
                totalProgress,
                completedProgress,
                totalSessions: sessions.count || 0,
                completionRate: totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0,
            }});
        } catch (err) {
            console.error('Fetch stats failed:', err?.message);
        }
    },

    fetchAdminUsers: async () => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase.from('profiles')
                .select('id, name, email, role, created_at, avatar_url')
                .order('created_at', { ascending: false });
            if (error) throw error;
            set({ adminUsers: (data || []).map(u => ({
                id: u.id, _id: u.id,
                name: u.name || u.email || 'مستخدم',
                email: u.email || '',
                role: u.role || 'user',
                avatar_url: u.avatar_url,
                createdAt: u.created_at,
            })) });
        } catch (err) {
            console.error('Fetch users failed:', err?.message);
        }
    },

    updateUserRole: async (userId, role) => {
        if (!supabase) return false;
        const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
        if (error) {
            console.error('Update role failed:', error.message);
            get().showToast('❌ فشل تغيير الصلاحية');
            return false;
        }
        set({ adminUsers: get().adminUsers.map(u => u.id === userId ? { ...u, role } : u) });
        get().showToast('✅ تم تغيير صلاحية المستخدم');
        return true;
    },

    // Removes the user's profile + all their data. NOTE: the underlying Supabase
    // Auth login (auth.users) can only be hard-deleted with the service_role key
    // (a future Edge Function); from the browser we soft-delete the profile + data.
    deleteUser: async (userId) => {
        if (!supabase) return false;
        if (userId === get().currentUser?.id) {
            get().showToast('❌ لا يمكنك حذف حسابك');
            return false;
        }
        try {
            await Promise.all([
                supabase.from('mistakes').delete().eq('user_id', userId),
                supabase.from('sessions').delete().eq('user_id', userId),
                supabase.from('progress').delete().eq('user_id', userId),
            ]);
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;
            set({ adminUsers: get().adminUsers.filter(u => u.id !== userId) });
            get().showToast('🗑️ تم حذف بيانات المستخدم');
            return true;
        } catch (err) {
            console.error('Delete user failed:', err?.message);
            get().showToast('❌ فشل حذف المستخدم');
            return false;
        }
    },

    // --- Practice State ---
    selectedSurah: '',
    setSelectedSurah: (val) => set({ selectedSurah: val }),

    // --- Last session (resume hook for the Mastery Studio home) ---
    lastSession: (() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem('tajweed_last_session');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    })(),
    setLastSession: (session) => {
        if (typeof window !== 'undefined') {
            try {
                if (session) localStorage.setItem('tajweed_last_session', JSON.stringify(session));
                else localStorage.removeItem('tajweed_last_session');
            } catch {}
        }
        set({ lastSession: session });
    },
    resumeLastSession: () => {
        const s = get().lastSession;
        if (!s) return null;
        if (s.surahId) get().setSelectedSurah(s.surahId);
        if (s.fromAyah) get().setFromVerse(s.fromAyah);
        if (s.toAyah)   get().setToVerse(s.toAyah);
        return s;
    },

    selectedReciter: 1,
    setSelectedReciter: (val) => set({ selectedReciter: val }),
    fromVerse: '',
    setFromVerse: (val) => set({ fromVerse: val }),
    toVerse: '',
    setToVerse: (val) => set({ toVerse: val }),
    isPlaying: false,
    setIsPlaying: (val) => set({ isPlaying: val }),
    isRecording: false,
    setIsRecording: (val) => set({ isRecording: val }),
    sessionMistakes: [],
    setSessionMistakes: (val) => set({ sessionMistakes: val }),
    mistakes: [],
    setMistakes: (val) => set({ mistakes: val }),

    // --- Recitation report (post-session: rule explanation + recommended video) ---
    sessionReport: null,        // { rules: [...], overall_ar } | null
    isLoadingReport: false,
    clearSessionReport: () => set({ sessionReport: null }),

    // Look up the lesson/video for each tajweed rule the user got wrong.
    // Returns a { rule_id: lesson } map. Degrades to {} if the column/table is
    // missing or Supabase is unreachable (the report just omits the video CTA).
    fetchRecommendedVideos: async (ruleIds) => {
        if (!supabase || !ruleIds || ruleIds.length === 0) return {};
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select('id, title, description, video_url, tajweed_rule')
                .in('tajweed_rule', ruleIds);
            if (error) throw error;
            const map = {};
            (data || []).forEach((l) => {
                if (l.tajweed_rule && !map[l.tajweed_rule]) map[l.tajweed_rule] = l;
            });
            return map;
        } catch (e) {
            console.warn('[report] video lookup failed:', e.message);
            return {};
        }
    },

    // Build the post-session report: ask the backend (LLM + static KB) to explain
    // each rule, and join the recommended lesson video per rule. Fully resilient —
    // if the backend is down, falls back to the client-side errorTypeMap text.
    fetchSessionReport: async () => {
        const mistakes = get().sessionMistakes || [];
        if (mistakes.length === 0) {
            set({ sessionReport: { rules: [], overall_ar: 'أحسنت! لم تُرصد أخطاء في هذه الجلسة.' } });
            return;
        }
        set({ isLoadingReport: true });
        try {
            // Canonical grouping (client-side) for the video lookup + offline fallback.
            const groups = {};
            mistakes.forEach((m) => {
                const rule = resolveRule(m.name || m.error_type);
                const rid = rule.rule_id;
                if (rid === 'other') return;
                const g = groups[rid] || (groups[rid] = { rule, count: 0, ayat: [] });
                g.count += 1;
                if (m.ayahNumber && !g.ayat.includes(m.ayahNumber)) g.ayat.push(m.ayahNumber);
            });
            const ruleIds = Object.keys(groups);

            const payload = mistakes.map((m) => ({
                error_type: m.name || m.error_type,
                surah_number: m.surahNumber,
                ayah_number: m.ayahNumber,
                ayah_text: m.ayahText,
                char_index: m.charIndex,
                tooltip: m.tooltip,
            }));

            const [report, videoMap] = await Promise.all([
                explainMistakes(payload),
                get().fetchRecommendedVideos(ruleIds),
            ]);

            let rules;
            if (report && Array.isArray(report.rules) && report.rules.length > 0) {
                rules = report.rules.map((r) => ({ ...r, lesson: videoMap[r.rule_id] || null }));
            } else {
                // Backend unreachable / empty → build from the client-side catalogue.
                rules = ruleIds.map((rid) => {
                    const { rule, count, ayat } = groups[rid];
                    return {
                        rule_id: rid,
                        name_ar: rule.name,
                        category_ar: rule.category,
                        occurrences: count,
                        ayat,
                        explanation_ar: rule.description || '',
                        how_to_fix_ar: '',
                        source: 'static',
                        lesson: videoMap[rid] || null,
                    };
                });
            }

            set({ sessionReport: { rules, overall_ar: report?.overall_ar || null } });
        } catch (e) {
            console.warn('[report] build failed:', e.message);
            set({ sessionReport: null });
        } finally {
            set({ isLoadingReport: false });
        }
    },

    // --- Practice UI State (moved to store for voice control) ---
    practiceViewState: 'selection', // 'selection' | 'practice'
    setPracticeViewState: (val) => set({ practiceViewState: val }),
    practiceActiveTab: 'record', // 'listen' | 'record'
    setPracticeActiveTab: (val) => set({ practiceActiveTab: val }),
    showSurahList: false,
    setShowSurahList: (val) => set({ showSurahList: val }),
    showReciterList: false,
    setShowReciterList: (val) => set({ showReciterList: val }),
    currentPlayingAudio: null,
    setCurrentPlayingAudio: (val) => set({ currentPlayingAudio: val }),
    currentVerseIndex: 0,
    setCurrentVerseIndex: (val) => set({ currentVerseIndex: val }),
    currentVerseWords: [],
    setCurrentVerseWords: (val) => set({ currentVerseWords: val }),
    analysisTable: [],
    setAnalysisTable: (val) => set({ analysisTable: val }),
    liveTranscription: null,
    setLiveTranscription: (val) => set({ liveTranscription: val }),
    phonemeDiffs: [],
    setPhonemeDiffs: (val) => set({ phonemeDiffs: val }),
    moshafSettings: null,
    setMoshafSettings: (val) => set({ moshafSettings: val }),

    // --- Analytics Session Data ---
    currentSessionId: null,
    setCurrentSessionId: (val) => set({ currentSessionId: val }),
    lastSessionMetrics: null,
    setLastSessionMetrics: (val) => set({ lastSessionMetrics: val }),
    analyticsReport: null,
    setAnalyticsReport: (val) => set({ analyticsReport: val }),
    
    fetchSessionAnalytics: async (sessionId) => {
        const data = await fetchJsonSafe(`${API_BASE}/api/session/${sessionId}/analytics`);
        if (data && !data.error) {
            set({ analyticsReport: data });
            return data;
        }
        return null;
    },

    // --- Listen Section State ---
    listenSurah: null,
    setListenSurah: (val) => set({ listenSurah: val }),
    listenFromVerse: 1,
    setListenFromVerse: (val) => set({ listenFromVerse: val }),
    listenToVerse: null,
    setListenToVerse: (val) => set({ listenToVerse: val }),
    showListenSurahList: false,
    setShowListenSurahList: (val) => set({ showListenSurahList: val }),
    listenSurahSearch: '',
    setListenSurahSearch: (val) => set({ listenSurahSearch: val }),
    listenRepeat: false,
    setListenRepeat: (val) => set({ listenRepeat: val }),
    toggleListenRepeat: () => set((s) => ({ listenRepeat: !s.listenRepeat })),

    // Signature of the currently loaded recitation { surah, reciter, from, to }.
    // Lets handlePlayReference tell a genuine pause/resume from a stale selection.
    playbackContext: null,

    // --- Audio Actions (powered by Howler.js via audioService) ---
    playVerse: (verseNum) => {
        const { selectedReciter, selectedSurah, showToast, handleAudioEnded, isLoggedIn, requireAuth } = get();
        if (!isLoggedIn) {
            requireAuth();
            return;
        }
        if (!selectedReciter) { showToast('الرجاء اختيار القارئ أولاً'); return; }
        if (!selectedSurah) { showToast('الرجاء اختيار السورة أولاً'); return; }
        const reciter = reciters.find(r => r.id == selectedReciter);
        if (!reciter) { showToast('القارئ غير موجود'); return; }
        const pad = (num) => num.toString().padStart(3, '0');
        const url = `https://everyayah.com/data/${reciter.subfolder}/${pad(selectedSurah)}${pad(verseNum)}.mp3`;
        const textUrl = `https://api.quran.com/api/v4/verses/by_key/${selectedSurah}:${verseNum}?language=en&words=true&word_fields=text_uthmani`;

        // Fetch verse text
        fetch(textUrl).then(res => res.json()).then(data => {
            if (data.verse && data.verse.words) {
                set({ currentVerseWords: data.verse.words });
            }
        });

        // Play via Howler audioService
        set({ currentPlayingAudio: url, isPlaying: true, currentVerseIndex: parseInt(verseNum) });
        audioService.play(url, () => {
            // onEnd callback — auto-advance to next verse
            get().handleAudioEnded();
        }).catch(err => {
            console.error('Playback failed:', err);
            showToast('حدث خطأ أثناء تشغيل الصوت');
            set({ isPlaying: false, currentPlayingAudio: null });
        });
    },

    handleStopRecitation: () => {
        audioService.stop();
        set({ isPlaying: false, currentPlayingAudio: null, playbackContext: null });
    },

    handlePlayReference: () => {
        const {
            listenSurah, selectedSurah, selectedReciter, surahs, showToast,
            currentPlayingAudio, isPlaying, playbackContext,
            listenFromVerse, listenToVerse, playVerse, isLoggedIn, requireAuth,
        } = get();

        if (!isLoggedIn) {
            requireAuth();
            return;
        }

        const surah = listenSurah || selectedSurah;
        if (!surah) { showToast('يرجى تحديد السورة'); return; }

        const surahObj = surahs.find(s => s.id === surah);
        const start = parseInt(listenFromVerse || 1);
        const end = parseInt(listenToVerse || (surahObj ? surahObj.verses_count : 999));

        if (start > end) {
            showToast('عفواً.. رقم آية البداية أكبر من النهاية');
            return;
        }

        // Only a genuine pause/resume when the loaded audio still matches the
        // current surah + reciter + range. Any change → start a fresh recitation.
        const sameSelection =
            currentPlayingAudio && playbackContext &&
            playbackContext.surah === surah &&
            playbackContext.reciter === selectedReciter &&
            playbackContext.from === start &&
            playbackContext.to === end;

        if (sameSelection) {
            audioService.togglePlayPause();
            set({ isPlaying: !isPlaying });
            return;
        }

        // Selection changed (or nothing loaded): stop the old audio, sync the
        // global selection that playVerse reads from, then play from the start.
        audioService.stop();
        set({
            selectedSurah: surah,
            fromVerse: start,
            toVerse: end,
            playbackContext: { surah, reciter: selectedReciter, from: start, to: end },
        });
        playVerse(start);
    },

    handleAudioEnded: () => {
        const { listenToVerse, toVerse, fromVerse, listenFromVerse, currentVerseIndex, playVerse, showToast, listenRepeat } = get();
        const endVerse = listenToVerse || toVerse;
        const end = parseInt(endVerse || 999);
        if (currentVerseIndex < end) {
            playVerse(currentVerseIndex + 1);
        } else if (listenRepeat) {
            // Loop the selected range from the beginning
            const start = parseInt(fromVerse || listenFromVerse || 1);
            playVerse(start);
        } else {
            audioService.stop();
            set({ isPlaying: false, currentPlayingAudio: null });
            showToast('انتهت التلاوة');
        }
    },

    handleNextVerse: () => {
        const { listenToVerse, toVerse, currentVerseIndex, playVerse, showToast } = get();
        const endVerse = listenToVerse || toVerse;
        if (currentVerseIndex < parseInt(endVerse || 999)) {
            playVerse(currentVerseIndex + 1);
        } else {
            showToast('وصلت لنهاية المقطع المحدد');
        }
    },

    handlePrevVerse: () => {
        const { fromVerse, listenFromVerse, currentVerseIndex, playVerse, showToast } = get();
        if (currentVerseIndex > parseInt(fromVerse || listenFromVerse || 1)) {
            playVerse(currentVerseIndex - 1);
        } else {
            showToast('هذه أول آية في المقطع المحدد');
        }
    },

    // --- Live Moshaf Additions ---
    moshafSettings: null,
    setMoshafSettings: (val) => set({ moshafSettings: val }),

    currentSessionId: null,
    setCurrentSessionId: (val) => set({ currentSessionId: val }),
    lastSessionMetrics: null,
    setLastSessionMetrics: (val) => set({ lastSessionMetrics: val }),

    updateLiveMistake: async (errorType, context = {}) => {
        // Legacy stub to prevent breaking old code
    },

    logSessionActivity: async (activity) => {
        // Legacy stub
    },

    userActiveMistakes: [],

    fetchUserMistakes: async () => {
        const userId = get().currentUser?.id;
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('mistakes')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            if (data) {
                set({ userActiveMistakes: data });
                return data;
            }
        } catch (error) {
            console.error("Failed to fetch user mistakes:", error);
        }
    },

    saveRecitationSession: async (sessionData) => {
        const userId = get().currentUser?.id;
        if (!userId || !supabase) return null;

        const duration = sessionData.duration_seconds || 0;
        const score = sessionData.score || 0;
        const verses = Math.max(1, (sessionData.to_ayah || 0) - (sessionData.from_ayah || 0) + 1);

        try {
            const { data, error } = await supabase
                .from('sessions')
                .insert([{
                    user_id: userId,
                    surah_number: sessionData.surah_number,
                    from_ayah: sessionData.from_ayah,
                    to_ayah: sessionData.to_ayah,
                    duration_seconds: duration,
                    total_mistakes: sessionData.total_mistakes || 0,
                    score: score
                }])
                .select('id')
                .single();

            if (error) throw error;

            // Atomic streak + XP + level bump in the DB. XP rewards both effort
            // (verses recited) and accuracy (score). Degrades silently pre-migration.
            const xpGain = Math.max(10, Math.round(score / 2) + verses * 5);
            supabase.rpc('apply_session_result', {
                p_score: score,
                p_duration: duration,
                p_xp_gain: xpGain,
            }).then(({ error: rpcErr }) => {
                if (rpcErr) console.warn('[progress] streak/XP update skipped:', rpcErr.message);
                else get().fetchProgressOverview();
            });

            return data.id;
        } catch (error) {
            console.error('Failed to save session to Supabase:', error);
            return null;
        }
    },

    // Reconcile a finished recitation against the user's stored mistakes.
    //   • New error spots  → insert a canonical mistake row (full ayah text).
    //   • Recurring spots  → bump occurrence_count + updated_at (don't duplicate).
    //   • Cleaned-up spots → mark is_corrected.
    // Also tallies per-rule attempts/errors and feeds the rolling mastery model.
    processLiveMistakes: async (sessionId, currentErrors, getAyahNumberFn, surahNumber, startAyah, endAyah) => {
        const userId = get().currentUser?.id;
        if (!userId || !supabase) return;

        const { data: existingMistakes, error: fetchErr } = await supabase
            .from('mistakes')
            .select('*')
            .eq('user_id', userId)
            .eq('is_corrected', false);

        if (fetchErr) {
            console.error('Failed to fetch existing mistakes:', fetchErr);
            return;
        }

        // Reconstruct full ayah text from the recited chars (chars sharing an ayah).
        // NOTE: the model only tags error_type on ERROR chars (correct chars are
        // ErrorType.NONE), so there is no per-rule "attempt" count to compute a true
        // accuracy ratio. Mastery is therefore derived from the mistakes table itself
        // (recency-weighted corrected-vs-uncorrected) in fetchProgressOverview().
        const ayahTextByNum = {};
        currentErrors.forEach((ch) => {
            const ayahNum = getAyahNumberFn(ch.index);
            if (ch.char) ayahTextByNum[ayahNum] = (ayahTextByNum[ayahNum] || '') + ch.char;
        });

        const errorChars = currentErrors.filter((ch) => ch.error);
        const newMistakesToInsert = [];
        const occurrenceBumps = [];   // ids of existing mistakes that recurred this session

        errorChars.forEach((ch) => {
            const ayahNum = getAyahNumberFn(ch.index);
            const rule = resolveRule(ch.error_type);
            const existing = existingMistakes.find((m) =>
                m.rule_category === rule.rule_id &&
                m.ayah_number === ayahNum &&
                m.char_index === ch.index
            );

            if (existing) {
                occurrenceBumps.push(existing);
            } else {
                newMistakesToInsert.push({
                    user_id: userId,
                    lesson_id: null,
                    error_type: rule.rule_id,
                    rule_category: rule.rule_id,        // canonical id (was raw/inconsistent)
                    rule_name_ar: ch.tooltip || rule.name,
                    surah_number: surahNumber,
                    ayah_number: ayahNum,
                    ayah_text: ayahTextByNum[ayahNum] || ch.char || '',
                    char_index: ch.index,
                    is_corrected: false,
                    occurrence_count: 1,
                });
            }
        });

        // A previously-logged mistake inside the recited range that no longer errors → corrected.
        const mistakesInScope = existingMistakes.filter((m) =>
            m.surah_number === surahNumber &&
            m.ayah_number >= startAyah &&
            m.ayah_number <= endAyah
        );
        const mistakesToCorrect = mistakesInScope
            .filter((m) => !errorChars.find((ch) =>
                resolveRule(ch.error_type).rule_id === m.rule_category &&
                getAyahNumberFn(ch.index) === m.ayah_number &&
                ch.index === m.char_index
            ))
            .map((m) => m.id);

        const ops = [];
        if (newMistakesToInsert.length > 0) {
            ops.push(supabase.from('mistakes').insert(newMistakesToInsert));
        }
        occurrenceBumps.forEach((m) => {
            ops.push(supabase.from('mistakes')
                .update({ occurrence_count: (m.occurrence_count || 1) + 1, updated_at: new Date().toISOString() })
                .eq('id', m.id));
        });
        if (mistakesToCorrect.length > 0) {
            ops.push(supabase.from('mistakes')
                .update({ is_corrected: true, corrected_at: new Date().toISOString() })
                .in('id', mistakesToCorrect));
        }
        await Promise.all(ops);

        get().fetchUserMistakes();
        get().fetchProgressOverview();
    },

    fetchSessionAnalytics: async (sessionId) => {
        try {
            const { API_BASE, MUAALEM_BASE } = require('../utils/apiConfig');
            const url = MUAALEM_BASE || 'http://127.0.0.1:8888';
            const data = await fetchJsonSafe(`${url}/api/session/${sessionId}/analytics`);
            if (data && !data.error) {
                return data;
            }
        } catch (err) {
            console.warn('Failed to fetch session analytics:', err);
        }
        return null;
    },
}));

export default useAppStore;

