import { create } from 'zustand';
import { reciters } from '../utils/data';
import { generateInitialProgress } from '../utils/data';
import audioService from '../utils/audioService';

const useAppStore = create((set, get) => ({
    // --- Auth State ---
    isLoggedIn: !!localStorage.getItem('tajweed_token'),
    currentUser: JSON.parse(localStorage.getItem('tajweed_user') || 'null'),
    loginSuccess: (user, token) => {
        localStorage.setItem('tajweed_token', token);
        localStorage.setItem('tajweed_user', JSON.stringify(user));
        set({ isLoggedIn: true, currentUser: user });
    },
    logout: () => {
        localStorage.removeItem('tajweed_token');
        localStorage.removeItem('tajweed_user');
        set({ isLoggedIn: false, currentUser: null });
    },


    // --- UI State ---
    showSplash: true,
    hideSplash: () => set({ showSplash: false }),
    toast: null,
    showToast: (msg) => {
        set({ toast: msg });
        setTimeout(() => set({ toast: null }), 3000);
    },

    isAuthModalOpen: false,
    openAuthModal: () => set({ isAuthModalOpen: true }),
    closeAuthModal: () => set({ isAuthModalOpen: false }),

    isMistakesModalOpen: false,
    openMistakesModal: () => set({ isMistakesModalOpen: true }),
    closeMistakesModal: () => set({ isMistakesModalOpen: false }),

    // --- Lesson State ---
    lessons: [],
    setLessons: (lessons) => set({ lessons }),
    selectedLesson: null,
    setSelectedLesson: (lesson) => set({ selectedLesson: lesson }),

    // --- Quran Data ---
    surahs: [],
    setSurahs: (surahs) => set({ surahs }),
    userProgress: {
        versesPracticed: 0,
        averageAccuracy: 0,
        badgesEarned: 0,
        weeklyStats: [],
        mistakeStats: []
    },

    // --- Data Actions ---
    fetchLessons: async () => {
        try {
            const res = await fetch('http://localhost:5000/api/lessons');
            const data = await res.json();
            set({ lessons: data });
        } catch (err) {
            console.error('Failed to fetch lessons:', err);
        }
    },

    fetchUserProgress: async () => {
        const token = localStorage.getItem('tajweed_token');
        if (!token) return;

        try {
            const res = await fetch('http://localhost:5000/api/progress/summary', {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            set({
                userProgress: {
                    ...get().userProgress,
                    weeklyStats: data.weekly,
                    mistakeStats: data.mistakes
                }
            });
        } catch (err) {
            console.error('Failed to fetch progress:', err);
        }
    },

    // --- Admin Actions ---
    addLesson: async (lessonData) => {
        const token = localStorage.getItem('tajweed_token');
        try {
            const res = await fetch('http://localhost:5000/api/admin/lessons', {
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
        const token = localStorage.getItem('tajweed_token');
        try {
            const res = await fetch(`http://localhost:5000/api/admin/lessons/${id}`, {
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
        const token = localStorage.getItem('tajweed_token');
        try {
            const res = await fetch(`http://localhost:5000/api/admin/lessons/${id}`, {
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
        const token = localStorage.getItem('tajweed_token');
        try {
            const res = await fetch('http://localhost:5000/api/admin/quizzes', {
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
        const token = localStorage.getItem('tajweed_token');
        try {
            const res = await fetch(`http://localhost:5000/api/admin/quizzes/${quizId}`, {
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
        const token = localStorage.getItem('tajweed_token');
        try {
            const res = await fetch('http://localhost:5000/api/admin/stats', {
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
        const token = localStorage.getItem('tajweed_token');
        try {
            const res = await fetch('http://localhost:5000/api/admin/users', {
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
        const token = localStorage.getItem('tajweed_token');
        try {
            const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
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
        const token = localStorage.getItem('tajweed_token');
        try {
            const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
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
    selectedReciter: 'ar.alafasy',
    setSelectedReciter: (val) => set({ selectedReciter: val }),
    fromVerse: '',
    setFromVerse: (val) => set({ fromVerse: val }),
    toVerse: '',
    setToVerse: (val) => set({ toVerse: val }),
    isPlaying: false,
    setIsPlaying: (val) => set({ isPlaying: val }),
    isRecording: false,
    setIsRecording: (val) => set({ isRecording: val }),
    mistakes: [],
    setMistakes: (val) => set({ mistakes: val }),
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

    // --- Audio Actions (powered by Howler.js via audioService) ---
    playVerse: (verseNum) => {
        const { selectedReciter, selectedSurah, showToast, handleAudioEnded, isLoggedIn, openAuthModal } = get();
        if (!isLoggedIn) {
            openAuthModal();
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
        set({ isPlaying: false, currentPlayingAudio: null });
    },

    handlePlayReference: () => {
        const { listenSurah, selectedSurah, showToast, currentPlayingAudio, isPlaying, listenFromVerse, surahs, listenToVerse, playVerse, isLoggedIn, openAuthModal } = get();

        if (!isLoggedIn) {
            openAuthModal();
            return;
        }

        const surahToUse = listenSurah || selectedSurah;
        if (!surahToUse) { showToast('يرجى تحديد السورة'); return; }

        // If already playing, toggle pause/resume
        if (currentPlayingAudio) {
            audioService.togglePlayPause();
            set({ isPlaying: !isPlaying });
            return;
        }

        if (listenSurah && listenSurah !== selectedSurah) {
            set({ selectedSurah: listenSurah });
        }

        const start = listenFromVerse || 1;
        const surahObj = surahs.find(s => s.id === surahToUse);
        const endVerse = listenToVerse || (surahObj ? surahObj.verses_count : 999);

        set({ fromVerse: start, toVerse: endVerse });

        if (parseInt(start) > parseInt(endVerse)) {
            showToast('عفواً.. رقم آية البداية أكبر من النهاية');
            return;
        }

        playVerse(start);
    },

    handleAudioEnded: () => {
        const { listenToVerse, toVerse, currentVerseIndex, playVerse, showToast } = get();
        const endVerse = listenToVerse || toVerse;
        const end = parseInt(endVerse || 999);
        if (currentVerseIndex < end) {
            playVerse(currentVerseIndex + 1);
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
        const { fromVerse, currentVerseIndex, playVerse, showToast } = get();
        if (currentVerseIndex > parseInt(fromVerse || 1)) {
            playVerse(currentVerseIndex - 1);
        } else {
            showToast('هذه أول آية في المقطع المحدد');
        }
    },
}));

export default useAppStore;

