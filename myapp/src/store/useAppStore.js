import { create } from 'zustand';
import { reciters } from '../utils/data';
import { generateInitialProgress } from '../utils/data';
import audioService from '../utils/audioService';
import { SURAH_LIST } from '../utils/surahNames';
import { API_BASE, fetchJsonSafe } from '../utils/apiConfig';
import { supabase } from '../utils/supabaseClient';


const useAppStore = create((set, get) => ({
    // --- Auth State (synced from Supabase) ---
    isLoggedIn: false,
    currentUser: null,
    userProfile: null,
    setUserProfile: (profile) => set({ userProfile: profile }),
    
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
            set({ isLoggedIn: !!session, currentUser: session?.user || null });
            if (session?.user) fetchProfileData(session.user);
            // if (session?.user) get().fetchUserProgress();
        });

        // Listen for auth changes (login, logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            set({ isLoggedIn: !!session, currentUser: session?.user || null });
            if (session?.user) fetchProfileData(session.user);
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
        if (!userId) return;
        try {
            let query = supabase.from('sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            
            if (from) query = query.gte('created_at', from);
            if (to) query = query.lte('created_at', to);
            
            const { data, error } = await query;
            if (error) throw error;
            
            if (data) {
                // Group by day to format it as the UI expects (Daily Sessions)
                const grouped = {};
                data.forEach(row => {
                    const dateStr = new Date(row.created_at).toISOString().split('T')[0];
                    if (!grouped[dateStr]) {
                        grouped[dateStr] = {
                            _id: dateStr,
                            date: dateStr,
                            created_at: dateStr,
                            total_mistakes: 0,
                            total_corrections: 0,
                            activities: []
                        };
                    }
                    grouped[dateStr].activities.push({
                        type: 'recitation',
                        surah_number: row.surah_number,
                        from_ayah: row.from_ayah,
                        to_ayah: row.to_ayah,
                        mistakes_count: row.total_mistakes,
                        duration_seconds: row.duration_seconds
                    });
                    grouped[dateStr].total_mistakes += (row.total_mistakes || 0);
                });
                
                const sessions = Object.values(grouped).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                set({ sessionsList: sessions });
                return { sessions };
            }
        } catch (err) {
            console.error('[SESSION] Failed to fetch sessions list from Supabase:', err);
        }
    },

    fetchSessionsSummary: async () => {
        const userId = get().currentUser?.id;
        if (!userId) return;
        try {
            const { data, error } = await supabase.from('sessions').select('created_at, duration_seconds, total_mistakes').eq('user_id', userId);
            if (error) throw error;
            
            if (data) {
                const uniqueDays = new Set(data.map(row => {
                    if (!row.created_at) return 'unknown';
                    return new Date(row.created_at).toISOString().split('T')[0];
                })).size;
                const summary = {
                    total_sessions: uniqueDays, // Total active days
                    total_recitation_time_seconds: data.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0),
                    total_mistakes: data.reduce((acc, curr) => acc + (curr.total_mistakes || 0), 0)
                };
                set({ sessionsSummary: summary });
                return summary;
            }
        } catch (err) {
            console.error('[SESSION] Failed to fetch sessions summary from Supabase:', err);
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

        // Keep the old API call for mistake stats if needed
        let totalMistakes = 0;
        let weeklyStats = [];
        let mistakeStats = [];
        let versesPracticed = 0;
        let averageAccuracy = 0;
        
        const token = await get().getToken?.();
        if (token) {
            const data = await fetchJsonSafe(`${API_BASE}/api/progress/summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (data) {
                totalMistakes = data.mistakes?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0;
                weeklyStats = data.weekly || [];
                mistakeStats = data.mistakes || [];
                versesPracticed = data.versesPracticed || 0;
                averageAccuracy = data.averageAccuracy || 0;
            }
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

    logUserMistake: async (lessonId, errorType, audioUrl, feedback) => {
        const token = await get().getToken?.();
        if (!token) return;

        try {
            await fetch(`${API_BASE}/api/progress/log-mistake`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ lesson_id: lessonId, error_type: errorType, audio_url: audioUrl, feedback })
            });
        } catch (err) {
            console.error('Failed to log mistake:', err);
        }
    },

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

    saveSessionMistakes: async (mistakesArray) => {
        const token = await get().getToken?.();
        if (!token || !mistakesArray || mistakesArray.length === 0) return;

        try {
            console.log(`[STORE] Saving batch of ${mistakesArray.length} mistakes at session end.`);
            // Using Promise.all to log all mistakes concurrently
            await Promise.all(mistakesArray.map(m => 
                fetchJsonSafe(`${API_BASE}/api/progress/log-mistake`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        error_type: m.name,
                        surah_number: m.surahNumber || null,
                        ayah_number: m.ayahNumber || null,
                        ayah_text: m.ayahText || '',
                        char_index: m.charIndex || null,
                    })
                })
            ));
            
            // Refresh stats after batch save
            get().fetchUserProgress();
        } catch (err) {
            console.warn('Failed to batch save session mistakes:', err);
        }
    },

    // --- Admin Actions ---
    addLesson: async (lessonData) => {
        const token = await get().getToken?.();
        try {
            const res = await fetch(`${API_BASE}/api/admin/lessons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(lessonData)
            });
            if (res.ok) {
                const newLesson = await res.json();
                set({ lessons: [...get().lessons, newLesson].sort((a, b) => a.sequence_order - b.sequence_order) });
                get().showToast('✅ تم إضافة الدرس بنجاح');
                return true;
            } else {
                get().showToast('❌ فشل إضافة الدرس');
            }
        } catch (err) {
            console.error('Add lesson failed:', err);
        }
        return false;
    },

    updateLesson: async (id, lessonData) => {
        const token = await get().getToken?.();
        try {
            const res = await fetch(`${API_BASE}/api/admin/lessons/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(lessonData)
            });
            if (res.ok) {
                const updated = await res.json();
                set({
                    lessons: get().lessons.map(l => (l._id || l.id) === id ? updated : l).sort((a, b) => a.sequence_order - b.sequence_order)
                });
                get().showToast('✅ تم تحديث الدرس بنجاح');
                return true;
            } else {
                get().showToast('❌ فشل تحديث الدرس');
            }
        } catch (err) {
            console.error('Update lesson failed:', err);
        }
        return false;
    },

    deleteLesson: async (id) => {
        const token = await get().getToken?.();
        try {
            const res = await fetch(`${API_BASE}/api/admin/lessons/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                set({ lessons: get().lessons.filter(l => (l._id || l.id) !== id) });
                get().showToast('🗑️ تم حذف الدرس بنجاح');
                return true;
            } else {
                get().showToast('❌ فشل حذف الدرس');
            }
        } catch (err) {
            console.error('Delete lesson failed:', err);
        }
        return false;
    },

    // --- Quiz Management ---
    addQuiz: async (lessonId, quizData) => {
        const token = await get().getToken?.();
        try {
            const res = await fetch(`${API_BASE}/api/admin/quizzes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ lesson_id: lessonId, ...quizData })
            });
            if (res.ok) {
                get().fetchLessons();
                get().showToast('✅ تم إضافة السؤال بنجاح');
                return true;
            } else {
                get().showToast('❌ فشل إضافة السؤال');
            }
        } catch (err) { console.error('Add quiz failed:', err); }
        return false;
    },

    deleteQuiz: async (quizId) => {
        const token = await get().getToken?.();
        try {
            const res = await fetch(`${API_BASE}/api/admin/quizzes/${quizId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                get().fetchLessons();
                get().showToast('🗑️ تم حذف السؤال');
                return true;
            } else {
                get().showToast('❌ فشل حذف السؤال');
            }
        } catch (err) { console.error('Delete quiz failed:', err); }
        return false;
    },

    // --- Admin Stats & User Management ---
    adminStats: null,
    adminUsers: [],

    fetchAdminStats: async () => {
        const token = await get().getToken?.();
        try {
            const res = await fetch(`${API_BASE}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                set({ adminStats: data });
            }
        } catch (err) {
            console.error('Fetch stats failed:', err);
        }
    },

    fetchAdminUsers: async () => {
        const token = await get().getToken?.();
        try {
            const res = await fetch(`${API_BASE}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                set({ adminUsers: data });
            }
        } catch (err) {
            console.error('Fetch users failed:', err);
        }
    },

    updateUserRole: async (userId, role) => {
        const token = await get().getToken?.();
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ role })
            });
            if (res.ok) {
                const updated = await res.json();
                set({ adminUsers: get().adminUsers.map(u => u._id === userId ? updated : u) });
                get().showToast('✅ تم تغيير صلاحية المستخدم');
                return true;
            } else {
                get().showToast('❌ فشل تغيير الصلاحية');
            }
        } catch (err) {
            console.error('Update role failed:', err);
        }
        return false;
    },

    deleteUser: async (userId) => {
        const token = await get().getToken?.();
        try {
            const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                set({ adminUsers: get().adminUsers.filter(u => u._id !== userId) });
                get().showToast('🗑️ تم حذف المستخدم');
                return true;
            } else {
                const data = await res.json();
                get().showToast(data.msg || '❌ فشل حذف المستخدم');
            }
        } catch (err) {
            console.error('Delete user failed:', err);
        }
        return false;
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
        if (!userId) return null;

        try {
            const { data, error } = await supabase
                .from('sessions')
                .insert([{
                    user_id: userId,
                    surah_number: sessionData.surah_number,
                    from_ayah: sessionData.from_ayah,
                    to_ayah: sessionData.to_ayah,
                    duration_seconds: sessionData.duration_seconds || 0,
                    total_mistakes: sessionData.total_mistakes || 0,
                    score: sessionData.score || 0
                }])
                .select('id')
                .single();

            if (error) throw error;
            return data.id;
        } catch (error) {
            console.error("Failed to save session to Supabase:", error);
            return null;
        }
    },

    processLiveMistakes: async (sessionId, currentErrors, getAyahNumberFn, surahNumber, startAyah, endAyah) => {
        const userId = get().currentUser?.id;
        if (!userId) return;

        const { data: existingMistakes, error: fetchErr } = await supabase
            .from('mistakes')
            .select('*')
            .eq('user_id', userId)
            .eq('is_corrected', false);

        if (fetchErr) {
            console.error("Failed to fetch existing mistakes:", fetchErr);
            return;
        }

        const errorChars = currentErrors.filter(ch => ch.error);
        const newMistakesToInsert = [];
        const mistakesToCorrect = [];

        errorChars.forEach(ch => {
            const ayahNum = getAyahNumberFn(ch.index);
            const exists = existingMistakes.find(m => 
                m.rule_category === ch.error_type && 
                m.ayah_number === ayahNum && 
                m.char_index === ch.index
            );

            if (!exists) {
                newMistakesToInsert.push({
                    user_id: userId,
                    lesson_id: null,
                    error_type: ch.error_type || 'tajweed',
                    rule_category: ch.error_type,
                    rule_name_ar: ch.tooltip || ch.error_type,
                    surah_number: surahNumber,
                    ayah_number: ayahNum,
                    ayah_text: ch.char,
                    char_index: ch.index,
                    is_corrected: false,
                    occurrence_count: 1
                });
            }
        });

        const mistakesInScope = existingMistakes.filter(m => 
            m.surah_number === surahNumber && 
            m.ayah_number >= startAyah && 
            m.ayah_number <= endAyah
        );

        mistakesInScope.forEach(m => {
            const stillExists = errorChars.find(ch => 
                ch.error_type === m.rule_category && 
                getAyahNumberFn(ch.index) === m.ayah_number &&
                ch.index === m.char_index
            );

            if (!stillExists) {
                mistakesToCorrect.push(m.id);
            }
        });

        if (newMistakesToInsert.length > 0) {
            await supabase.from('mistakes').insert(newMistakesToInsert);
        }

        if (mistakesToCorrect.length > 0) {
            await supabase.from('mistakes')
                .update({ is_corrected: true, corrected_at: new Date().toISOString() })
                .in('id', mistakesToCorrect);
        }

        get().fetchUserMistakes();
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

