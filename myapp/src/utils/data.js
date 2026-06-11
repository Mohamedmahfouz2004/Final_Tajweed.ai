// --- Data & Helpers ---

export const reciters = [
    // --- الشيوخ المصريين (في المقدمة) ---
    { id: 1, name: 'عبد الباسط عبد الصمد', style: 'مرتل', subfolder: 'Abdul_Basit_Murattal_192kbps', isEgyptian: true },
    { id: 2, name: 'عبد الباسط عبد الصمد', style: 'مجود', subfolder: 'Abdul_Basit_Mujawwad_128kbps', isEgyptian: true },
    { id: 3, name: 'محمد صديق المنشاوي', style: 'مرتل', subfolder: 'Minshawy_Murattal_128kbps', isEgyptian: true },
    { id: 4, name: 'محمد صديق المنشاوي', style: 'مجود', subfolder: 'Minshawy_Mujawwad_192kbps', isEgyptian: true },
    { id: 5, name: 'محمود خليل الحصري', style: 'مرتل', subfolder: 'Husary_128kbps', isEgyptian: true },
    { id: 6, name: 'محمود خليل الحصري', style: 'مجود', subfolder: 'Husary_Mujawwad_128kbps', isEgyptian: true },
    { id: 7, name: 'محمود خليل الحصري', style: 'معلم', subfolder: 'Husary_Muallim_128kbps', isEgyptian: true },
    { id: 8, name: 'مصطفى إسماعيل', style: 'مرتل', subfolder: 'Mustafa_Ismail_48kbps', isEgyptian: true },
    { id: 9, name: 'محمد محمود الطبلاوي', style: 'مرتل', subfolder: 'Mohammad_al_Tablaway_128kbps', isEgyptian: true },
    { id: 10, name: 'محمود علي البنا', style: 'مرتل', subfolder: 'Mahmoud_Ali_Al_Banna_32kbps', isEgyptian: true },
    { id: 11, name: 'محمود علي البنا', style: 'مجود', subfolder: 'Mahmoud_Ali_Al_Banna_128kbps', isEgyptian: true },
    { id: 12, name: 'ياسر سلامة', style: 'حدر', subfolder: 'Yaser_Salamah_128kbps', isEgyptian: true },
    { id: 13, name: 'أحمد نعينع', style: 'مرتل', subfolder: 'Ahmed_Neana_128kbps', isEgyptian: true },

    // --- باقي الشيوخ المشاهير (مرتبين) ---
    { id: 101, name: 'مشاري راشد العفاسي', style: 'مرتل', subfolder: 'Alafasy_128kbps', isEgyptian: false },
    { id: 102, name: 'عبد الرحمن السديس', style: 'مرتل', subfolder: 'Abdurrahmaan_As-Sudais_192kbps', isEgyptian: false },
    { id: 103, name: 'سعود الشريم', style: 'مرتل', subfolder: 'Saood_ash-Shuraym_128kbps', isEgyptian: false },
    { id: 104, name: 'ماهر المعيقلي', style: 'مرتل', subfolder: 'MaherAlMuaiqly128kbps', isEgyptian: false },
    { id: 105, name: 'ياسر الدوسري', style: 'مرتل', subfolder: 'Yasser_Ad-Dussary_128kbps', isEgyptian: false },
    { id: 106, name: 'سعد الغامدي', style: 'مرتل', subfolder: 'Ghamadi_40kbps', isEgyptian: false },
    { id: 107, name: 'علي جابر', style: 'مرتل', subfolder: 'Ali_Jaber_64kbps', isEgyptian: false },
    { id: 108, name: 'أحمد بن علي العجمي', style: 'مرتل', subfolder: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net', isEgyptian: false },
    { id: 109, name: 'فارس عباد', style: 'مرتل', subfolder: 'Fares_Abbad_64kbps', isEgyptian: false },
    { id: 110, name: 'هاني الرفاعي', style: 'مرتل', subfolder: 'Hani_Rifai_192kbps', isEgyptian: false },
    { id: 111, name: 'عبد الله الجهني', style: 'مرتل', subfolder: 'Abdullaah_3awwaad_Al-Juhaynee_128kbps', isEgyptian: false },
    { id: 112, name: 'خالد القحطاني', style: 'مرتل', subfolder: 'Khaalid_Al-Qahtaanee_192kbps', isEgyptian: false },
    { id: 113, name: 'أبو بكر الشاطري', style: 'مرتل', subfolder: 'Abu_Bakr_Ash-Shaatree_128kbps', isEgyptian: false },
    { id: 114, name: 'عبد الباري الثبيتي', style: 'مرتل', subfolder: 'Abdul_Bari_Ath_Thubaity_128kbps', isEgyptian: false },
    { id: 115, name: 'عبد المحسن القاسم', style: 'مرتل', subfolder: 'Muhsin_Al_Qasim_192kbps', isEgyptian: false },
    { id: 116, name: 'صلاح بو خاطر', style: 'مرتل', subfolder: 'Salah_Al_Budair_128kbps', isEgyptian: false },
    { id: 117, name: 'خليفة الطنيجي', style: 'معلم', subfolder: 'Khalefa_Al_Tunaiji_64kbps', isEgyptian: false },
    { id: 118, name: 'محمد أيوب', style: 'مرتل', subfolder: 'Muhammad_Ayyoub_128kbps', isEgyptian: false },
    { id: 119, name: 'محمد جبريل', style: 'مرتل', subfolder: 'Muhammad_Jibreel_128kbps', isEgyptian: false },
    { id: 120, name: 'عبد الودود حنيف', style: 'مرتل', subfolder: 'AbdulWadood_Haneef_192kbps', isEgyptian: false },
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
