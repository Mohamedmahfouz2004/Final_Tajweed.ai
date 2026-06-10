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
    isAdmin: false,
    
    initAuth: () => {
        if (typeof window === 'undefined') return;
        if (!supabase) return;
        
        const ADMIN_EMAILS = [
            'mhfwz8889@gmail.com',
            'tajweed.ai0@gmail.com',
            'mmah09378@gmail.com'
        ];

        const checkAdmin = (user) => {
            if (!user) return false;
            if (user.user_metadata?.role === 'admin' || user.role === 'admin') return true;
            if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
            return false;
        };

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            const user = session?.user || null;
            set({ 
                isLoggedIn: !!session, 
                currentUser: user,
                isAdmin: checkAdmin(user)
            });
        });

        // Listen for auth changes (login, logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const user = session?.user || null;
            set({ 
                isLoggedIn: !!session, 
                currentUser: user,
                isAdmin: checkAdmin(user)
            });
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
        completedLessonsList: []
    },

    // --- Adaptive Data ---
    dailyPlaylist: null,
    masteryRadar: null,

    fetchAdaptiveData: async () => {
        const token = await get().getToken?.();
        if (!token) return;

        try {
            const [playlistRes, radarRes] = await Promise.all([
                fetch(`${API_BASE}/api/adaptive/daily-playlist`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/api/adaptive/mastery-radar`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (playlistRes.ok) {
                const playlistData = await playlistRes.json();
                if (playlistData.success) set({ dailyPlaylist: playlistData.data });
            }

            if (radarRes.ok) {
                const radarData = await radarRes.json();
                if (radarData.success) set({ masteryRadar: radarData.data });
            }
        } catch (err) {
            console.error('[STORE] Failed to fetch adaptive data:', err);
        }
    },

    // --- Daily Sessions System ---
    todaySession: null,
    sessionsList: [],
    sessionsSummary: null,
    sessionsPagination: null,

    fetchSessionsList: async (from, to) => {
        const token = await get().getToken?.();
        if (!token) return;
        try {
            let url = `${API_BASE}/api/sessions/list`;
            const params = [];
            if (from) params.push(`from=${from}`);
            if (to) params.push(`to=${to}`);
            if (params.length) url += '?' + params.join('&');

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                set({ sessionsList: data.sessions });
                return data;
            }
        } catch (err) {
            console.error('[SESSION] Failed to fetch sessions list:', err);
        }
    },

    fetchSessionsSummary: async () => {
        const token = await get().getToken?.();
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/sessions/summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                set({ sessionsSummary: data });
                return data;
            }
        } catch (err) {
            console.error('[SESSION] Failed to fetch sessions summary:', err);
        }
    },

    // --- Data Actions ---
    fetchLessons: async () => {
        const data = await fetchJsonSafe(`${API_BASE}/api/lessons`);
        if (Array.isArray(data)) {
            set({ lessons: data });
        }
    },

    fetchUserProgress: async () => {
        const token = await get().getToken?.();
        if (!token) return;

        const data = await fetchJsonSafe(`${API_BASE}/api/progress/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!data) return;

        set({
            userProgress: {
                ...get().userProgress,
                totalMistakes: data.mistakes?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0,
                weeklyStats: data.weekly || [],
                mistakeStats: data.mistakes || [],
                versesPracticed: data.versesPracticed || 0,
                completedLessons: data.completedLessons || 0,
                averageAccuracy: data.averageAccuracy || 0,
                completedLessonsList: data.completedLessonIds || []
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

    updateUserProgress: async (lessonId, status, score) => {
        const token = await get().getToken?.();
        if (!token) return;

        try {
            console.log('[STORE] Updating progress for lesson:', lessonId, { status, score });
            const res = await fetch(`${API_BASE}/api/progress/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ lesson_id: lessonId, status, score })
            });

            if (res.ok) {
                const result = await res.json();
                console.log('[STORE] Update success:', result);
                get().fetchUserProgress(); // Refresh stats
                return result;
            } else {
                const errData = await res.json();
                console.error('[STORE] Update failed. Error Details:', errData);
                get().showToast(`❌ حدث خطأ: ${errData.msg || 'فشل الحفظ'}`);
                throw new Error(errData.msg || 'Update failed');
            }
        } catch (err) {
            console.error('Failed to update progress:', err);
            throw err;
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
    },

    logSessionActivity: async (activity) => {
        const token = await get().getToken?.();
        if (!token) return;
        try {
            const data = await fetchJsonSafe(`${API_BASE}/api/sessions/activity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...activity, local_date: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') })
            });
            if (data) {
                console.log(`[SESSION] Activity logged: ${activity.type}`);
                return data;
            }
        } catch (err) {
            console.warn('[SESSION] Failed to log activity:', err);
        }
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

