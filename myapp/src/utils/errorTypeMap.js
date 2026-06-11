/**
 * Tajweed Error Type Mapping
 * Maps AI model error_type values → Arabic Tajweed rule names, categories, and lesson links
 * 
 * These match the ErrorType enum in uthmani_annotator.py and the 
 * ERROR_TYPE_MAP in progressController.js
 */

export const ERROR_TYPE_MAP = {
    // ─── أحكام المدود ───
    'madd': {
        category: 'أحكام المدود',
        name: 'خطأ في المد',
        description: 'عدم إطالة الصوت بالمقدار الصحيح عند حروف المد (الألف، الواو، الياء)',
        icon: '📏',
        color: '#F97316',
        lessonTitle: 'أحكام المد'
    },

    // ─── الغنة وأحكام النون والميم ───
    'ghunna': {
        category: 'الغنة وأحكام النون والميم',
        name: 'خطأ في الغنة',
        description: 'عدم إظهار الغنة بالمقدار الصحيح في النون أو الميم المشددة أو المخفاة',
        icon: '🔔',
        color: '#8B5CF6',
        lessonTitle: 'الغنة وأحكام النون الساكنة والتنوين'
    },

    // ─── القلقلة ───
    'qalqala': {
        category: 'القلقلة',
        name: 'خطأ في القلقلة',
        description: 'عدم نطق حروف القلقلة (قطب جد) بالاهتزاز المطلوب عند سكونها',
        icon: '💥',
        color: '#EF4444',
        lessonTitle: 'القلقلة'
    },

    // ─── التفخيم والترقيق ───
    'tafkheem': {
        category: 'التفخيم والترقيق',
        name: 'خطأ في التفخيم أو الترقيق',
        description: 'نطق حرف مفخم بترقيق أو العكس. حروف التفخيم الدائم: خص ضغط قظ',
        icon: '🔊',
        color: '#0284C7',
        lessonTitle: 'التفخيم والترقيق'
    },

    // ─── الهمس والجهر ───
    'hams_jahr': {
        category: 'الهمس والجهر',
        name: 'خطأ في الهمس أو الجهر',
        description: 'نطق حرف مهموس بجهر أو العكس. حروف الهمس: فحثه شخص سكت',
        icon: '🗣️',
        color: '#7C3AED',
        lessonTitle: 'صفات الحروف - الهمس والجهر'
    },

    // ─── الشدة والرخاوة ───
    'shidda': {
        category: 'الشدة والرخاوة',
        name: 'خطأ في الشدة أو الرخاوة',
        description: 'عدم حبس الصوت في الحروف الشديدة أو عدم جريانه في الحروف الرخوة',
        icon: '💪',
        color: '#B45309',
        lessonTitle: 'صفات الحروف - الشدة والرخاوة'
    },

    // ─── الصفير ───
    'safeer': {
        category: 'الصفير',
        name: 'خطأ في الصفير',
        description: 'عدم إخراج صوت الصفير الحاد من حروف الصفير (ص، ز، س)',
        icon: '🎵',
        color: '#0891B2',
        lessonTitle: 'صفات الحروف - الصفير'
    },

    // ─── الاستطالة ───
    'istitala': {
        category: 'الاستطالة',
        name: 'خطأ في الاستطالة',
        description: 'عدم امتداد الصوت في حرف الضاد من أول إحدى حافتي اللسان إلى آخرها',
        icon: '↔️',
        color: '#059669',
        lessonTitle: 'صفات الحروف - الاستطالة'
    },

    // ─── الحركات (التشكيل) ───
    'vowel': {
        category: 'الحركات والتشكيل',
        name: 'خطأ في الحركات',
        description: 'نطق الفتحة أو الضمة أو الكسرة أو السكون بشكل خاطئ',
        icon: '✏️',
        color: '#F59E0B',
        lessonTitle: 'الحركات والتشكيل'
    },

    // ─── صفات الحروف العامة ───
    'sifat': {
        category: 'صفات الحروف',
        name: 'خطأ في صفة الحرف',
        description: 'خطأ في إحدى الصفات اللازمة أو العارضة للحرف (التكرار، التفشي، إلخ)',
        icon: '🔤',
        color: '#6366F1',
        lessonTitle: 'صفات الحروف'
    },

    // ─── مخارج الحروف (Phoneme) ───
    'phoneme': {
        category: 'مخارج الحروف',
        name: 'خطأ في مخرج الحرف',
        description: 'نطق الحرف من مخرج غير صحيح مما يؤدي لتبديله بحرف آخر',
        icon: '👅',
        color: '#0EA5E9',
        lessonTitle: 'مخارج الحروف'
    },

    // ─── حذف حرف ───
    'deletion': {
        category: 'أخطاء النطق',
        name: 'حذف حرف أو صوت',
        description: 'إسقاط حرف أو صوت من التلاوة بشكل غير مقصود',
        icon: '⛔',
        color: '#DC2626',
        lessonTitle: 'أساسيات النطق'
    },

    // ─── إضافة صوت زائد ───
    'insertion': {
        category: 'أخطاء النطق',
        name: 'إضافة صوت زائد',
        description: 'نطق صوت أو حرف زائد غير موجود في النص القرآني',
        icon: '➕',
        color: '#B91C1C',
        lessonTitle: 'أساسيات النطق'
    },
};

/**
 * Alias map → canonical rule id.
 * The AI model, older code paths, and the UI have used slightly different spellings
 * for the same rule (ghunnah/ghunna, qalqalah/qalqala, makharij/phoneme …). Every
 * read and write funnels through normalizeRuleId() so the taxonomy is consistent.
 */
export const RULE_ALIASES = {
    ghunnah: 'ghunna',
    ghonna: 'ghunna',
    ahkam: 'ghunna',          // أحكام النون والميم → الغنة
    qalqalah: 'qalqala',
    qalqla: 'qalqala',
    makharij: 'phoneme',
    makhraj: 'phoneme',
    tafkheem_or_taqeeq: 'tafkheem',
    tarqeeq: 'tafkheem',
    hams_or_jahr: 'hams_jahr',
    hams: 'hams_jahr',
    jahr: 'hams_jahr',
    tikraar: 'sifat',
    tafashie: 'sifat',
    harakat: 'vowel',
};

/**
 * Normalize any incoming rule/error id to its canonical key in ERROR_TYPE_MAP.
 * Unknown ids pass through unchanged (resolveRule still returns a safe fallback).
 */
export function normalizeRuleId(raw) {
    if (!raw || raw === 'none') return null;
    const key = String(raw).trim().toLowerCase();
    return RULE_ALIASES[key] || key;
}

/**
 * Resolve a raw rule/error id to the canonical record the whole app stores and renders.
 * Returns a stable shape: { rule_id, category, name, description, icon, color, lessonTitle }.
 * This is THE function to use whenever writing a mistake row or labelling a rule.
 */
export function resolveRule(raw) {
    const rule_id = normalizeRuleId(raw);
    if (!rule_id) {
        return {
            rule_id: 'other', category: 'أخطاء أخرى', name: 'خطأ غير معروف',
            description: '', icon: '❓', color: '#6B7280', lessonTitle: 'التجويد العام',
        };
    }
    const info = ERROR_TYPE_MAP[rule_id];
    if (!info) {
        return {
            rule_id, category: 'أخطاء أخرى', name: rule_id,
            description: '', icon: '❓', color: '#6B7280', lessonTitle: 'التجويد العام',
        };
    }
    return { rule_id, ...info };
}

/**
 * Get full info for an error type. Falls back to generic if unknown.
 * Now alias-aware via normalizeRuleId().
 */
export function getErrorInfo(errorType) {
    const rule_id = normalizeRuleId(errorType);
    if (!rule_id) return null;
    return ERROR_TYPE_MAP[rule_id] || {
        category: 'أخطاء أخرى',
        name: errorType,
        description: '',
        icon: '❓',
        color: '#6B7280',
        lessonTitle: 'التجويد العام'
    };
}

/**
 * Get all unique categories from the error map.
 */
export function getAllCategories() {
    const cats = new Map();
    Object.entries(ERROR_TYPE_MAP).forEach(([key, val]) => {
        if (!cats.has(val.category)) {
            cats.set(val.category, {
                category: val.category,
                icon: val.icon,
                color: val.color,
                errorTypes: [key]
            });
        } else {
            cats.get(val.category).errorTypes.push(key);
        }
    });
    return Array.from(cats.values());
}

/**
 * Tajweed lesson seed data — hierarchical structure
 * Main categories with sub-rules as lessons
 */
export const TAJWEED_LESSONS = [
    {
        title: 'مقدمة في أحكام التجويد',
        description: 'تعريف بعلم التجويد وأهميته وفضله وحكم تعلمه.',
        sequence_order: 1,
        tajweed_rule: 'intro',
        quizzes: [
            { question: 'ما معنى التجويد لغة؟', options: ['التحسين', 'الإسراع', 'الإهمال', 'التغيير'], correct_answer: 'التحسين', points: 10 },
            { question: 'ما حكم تعلم التجويد؟', options: ['فرض كفاية', 'فرض عين', 'مستحب', 'سنة'], correct_answer: 'فرض كفاية', points: 10 },
        ]
    },
    {
        title: 'مخارج الحروف',
        description: 'تعلم مخارج الحروف العربية الصحيحة من الحلق واللسان والشفتين.',
        sequence_order: 2,
        tajweed_rule: 'phoneme',
        quizzes: [
            { question: 'كم عدد مخارج الحروف الرئيسية؟', options: ['خمسة', 'أربعة', 'ثلاثة', 'ستة'], correct_answer: 'خمسة', points: 10 },
            { question: 'من أي مخرج يخرج حرف العين؟', options: ['الحلق', 'اللسان', 'الشفتان', 'الجوف'], correct_answer: 'الحلق', points: 10 },
        ]
    },
    {
        title: 'صفات الحروف',
        description: 'الصفات اللازمة والعارضة للحروف: الهمس والجهر والشدة والرخاوة.',
        sequence_order: 3,
        tajweed_rule: 'sifat',
        quizzes: [
            { question: 'ما هي حروف الهمس؟', options: ['فحثه شخص سكت', 'قطب جد', 'لن عمر', 'أجد قط بكت'], correct_answer: 'فحثه شخص سكت', points: 10 },
            { question: 'ما عكس صفة الشدة؟', options: ['الرخاوة', 'الجهر', 'الهمس', 'القلقلة'], correct_answer: 'الرخاوة', points: 10 },
        ]
    },
    {
        title: 'التفخيم والترقيق',
        description: 'حروف التفخيم الدائم (خص ضغط قظ) وأحكام تفخيم وترقيق الراء واللام ولام لفظ الجلالة.',
        sequence_order: 4,
        tajweed_rule: 'tafkheem',
        quizzes: [
            { question: 'ما هي حروف الإطباق (التفخيم الدائم)؟', options: ['ص ض ط ظ', 'ق ك ج ش', 'ب ت ث ن', 'ف ح ث هـ'], correct_answer: 'ص ض ط ظ', points: 10 },
            { question: 'متى تفخم الراء؟', options: ['إذا كانت مفتوحة أو مضمومة', 'إذا كانت مكسورة', 'دائماً', 'لا تفخم أبداً'], correct_answer: 'إذا كانت مفتوحة أو مضمومة', points: 10 },
        ]
    },
    {
        title: 'أحكام المد',
        description: 'المد الطبيعي والمد الفرعي بأنواعه: المتصل والمنفصل والعارض واللازم.',
        sequence_order: 5,
        tajweed_rule: 'madd',
        quizzes: [
            { question: 'كم مقدار المد الطبيعي؟', options: ['حركتان', 'أربع حركات', 'ست حركات', 'حركة واحدة'], correct_answer: 'حركتان', points: 10 },
            { question: 'ما هي حروف المد؟', options: ['الألف والواو والياء', 'النون والميم', 'الباء والتاء', 'الحاء والعين'], correct_answer: 'الألف والواو والياء', points: 10 },
        ]
    },
    {
        title: 'الغنة وأحكام النون الساكنة والتنوين',
        description: 'الإظهار والإدغام والإخفاء والإقلاب وعلاقتها بالغنة ومراتبها.',
        sequence_order: 6,
        tajweed_rule: 'ghunna',
        quizzes: [
            { question: 'ما هي الغنة؟', options: ['صوت يخرج من الخيشوم', 'صوت يخرج من الحلق', 'صوت يخرج من الشفتين', 'صوت يخرج من اللسان'], correct_answer: 'صوت يخرج من الخيشوم', points: 10 },
            { question: 'في أي حرفين تظهر الغنة بشكل أساسي؟', options: ['النون والميم', 'الباء والتاء', 'السين والصاد', 'القاف والكاف'], correct_answer: 'النون والميم', points: 10 },
        ]
    },
    {
        title: 'القلقلة',
        description: 'حروف القلقلة (قطب جد) ومراتبها: الصغرى والكبرى.',
        sequence_order: 7,
        tajweed_rule: 'qalqala',
        quizzes: [
            { question: 'ما هي حروف القلقلة؟', options: ['قطب جد', 'فحثه شخص سكت', 'لن عمر', 'أجد قط بكت'], correct_answer: 'قطب جد', points: 10 },
            { question: 'متى تكون القلقلة الكبرى؟', options: ['عند الوقف على الحرف', 'في وسط الكلمة', 'عند المد', 'عند الإدغام'], correct_answer: 'عند الوقف على الحرف', points: 10 },
        ]
    },
    {
        title: 'الهمس والجهر',
        description: 'صفة الهمس (جريان النفس) وصفة الجهر (انحباس النفس) عند نطق الحروف.',
        sequence_order: 8,
        tajweed_rule: 'hams_jahr',
        quizzes: [
            { question: 'ما هو الهمس؟', options: ['جريان النفس عند النطق بالحرف', 'انحباس النفس', 'ارتفاع اللسان', 'انخفاض اللسان'], correct_answer: 'جريان النفس عند النطق بالحرف', points: 10 },
        ]
    },
    {
        title: 'الشدة والرخاوة',
        description: 'صفة الشدة (انحباس الصوت) والرخاوة (جريان الصوت) والبينية.',
        sequence_order: 9,
        tajweed_rule: 'shidda',
        quizzes: [
            { question: 'ما هي حروف الشدة؟', options: ['أجد قط بكت', 'فحثه شخص سكت', 'لن عمر', 'قطب جد'], correct_answer: 'أجد قط بكت', points: 10 },
        ]
    },
    {
        title: 'الحركات والتشكيل',
        description: 'الفتحة والضمة والكسرة والسكون والتنوين وأثرها على النطق.',
        sequence_order: 10,
        tajweed_rule: 'vowel',
        quizzes: [
            { question: 'كم عدد الحركات الأساسية في اللغة العربية؟', options: ['ثلاث', 'أربع', 'خمس', 'اثنتان'], correct_answer: 'ثلاث', points: 10 },
        ]
    },
    {
        title: 'أساسيات النطق',
        description: 'تجنب حذف الحروف أو إضافة أصوات زائدة أثناء التلاوة.',
        sequence_order: 11,
        tajweed_rule: 'deletion',
        quizzes: [
            { question: 'ما حكم حذف حرف من القرآن عمداً؟', options: ['حرام', 'مكروه', 'جائز', 'مستحب'], correct_answer: 'حرام', points: 10 },
        ]
    },
];
