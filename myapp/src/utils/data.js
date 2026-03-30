// --- Data & Helpers ---

export const reciters = [
    { id: 1, name: 'عبد الباسط عبد الصمد', style: 'مرتل', subfolder: 'Abdul_Basit_Murattal_64kbps', quran_api_id: 2 },
    { id: 2, name: 'محمد صديق المنشاوي', style: 'مجود', subfolder: 'Minshawy_Mujawwad_192kbps', quran_api_id: 8 },
    { id: 3, name: 'محمود خليل الحصري', style: 'معلم', subfolder: 'Husary_Muallim_128kbps', quran_api_id: 12 }
];

export const progressData = [
    { day: 'السبت', score: 65 },
    { day: 'الأحد', score: 72 },
    { day: 'الاثنين', score: 68 },
    { day: 'الثلاثاء', score: 85 },
    { day: 'الأربعاء', score: 78 },
    { day: 'الخميس', score: 90 },
    { day: 'الجمعة', score: 92 },
];

export const accuracyTrend = [
    { session: 1, acc: 60 }, { session: 2, acc: 65 }, { session: 3, acc: 63 }, { session: 4, acc: 75 },
    { session: 5, acc: 80 }, { session: 6, acc: 85 }, { session: 7, acc: 82 }, { session: 8, acc: 88 },
];

export const mistakeStats = [
    { name: 'أحكام النون الساكنة', value: 35, color: '#EF4444' },
    { name: 'القلقلة', value: 25, color: '#F59E0B' },
    { name: 'المدود', value: 20, color: '#3B82F6' },
    { name: 'التفخيم والترقيق', value: 15, color: '#10B981' },
    { name: 'أخرى', value: 5, color: '#6B7280' },
];

export const generateInitialProgress = () => ({
    versesPracticed: 0,
    averageAccuracy: 0,
    badgesEarned: 0,
});
