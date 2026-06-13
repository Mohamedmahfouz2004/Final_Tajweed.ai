"""
Tajweed rule knowledge base — the *retrieval* corpus for the explanation system.

The set of tajweed rules the model can flag is small and fixed (13 canonical
rules), so "retrieval" is a deterministic keyed lookup rather than a vector
search. Each entry holds the curated Arabic facts the LLM must stay grounded in
when explaining a mistake, and the same facts are used verbatim as a fallback
when the LLM is unavailable.

Keys mirror ERROR_TYPE_MAP in app/models/progress.py and the frontend
ERROR_TYPE_MAP / RULE_ALIASES in myapp/src/utils/errorTypeMap.js. Keep the three
in sync.
"""

from __future__ import annotations

# ── Canonical rule catalogue ──
# name_ar           : short Arabic name of the rule
# category_ar       : Arabic category (matches ERROR_TYPE_MAP categories)
# summary_ar        : what the rule is / what went wrong (grounding + static fallback)
# how_to_fix_ar     : practical correction guidance (static fallback)
# letters_or_example: the rule's letters / a worked example, to anchor the LLM
RULE_KB: dict[str, dict] = {
    "madd": {
        "name_ar": "أحكام المد",
        "category_ar": "أحكام المدود",
        "summary_ar": "المد هو إطالة الصوت بحرف من حروف المد (الألف والواو والياء) بالمقدار الشرعي. الخطأ يكون بعدم إشباع المد أو الزيادة عليه.",
        "how_to_fix_ar": "اضبط مقدار المد: المد الطبيعي حركتان، والمد الفرعي (المتصل واللازم) أربع إلى ست حركات. عُدّ الحركات أثناء النطق ولا تقطع الصوت قبل تمام المقدار.",
        "letters_or_example": "حروف المد: ا و ي. مثال: «قَالَ» مد طبيعي حركتان، «جَاءَ» مد متصل.",
    },
    "ghunna": {
        "name_ar": "الغنة وأحكام النون والميم",
        "category_ar": "الغنة وأحكام النون والميم",
        "summary_ar": "الغنة صوت يخرج من الخيشوم يصاحب النون والميم المشددتين والمخفاتين. الخطأ يكون بترك الغنة أو عدم إتمام مقدارها (حركتان).",
        "how_to_fix_ar": "أمسك الصوت في الأنف عند النون والميم المشددة بمقدار حركتين، وتحقق من خروج الصوت من الخيشوم بإغلاق الفم في الميم وتسكين طرف اللسان في النون.",
        "letters_or_example": "أكمل مراتب الغنة في: «إِنَّ»، «ثُمَّ»، والإخفاء في «مِن قَبْلُ».",
    },
    "qalqala": {
        "name_ar": "القلقلة",
        "category_ar": "القلقلة",
        "summary_ar": "القلقلة اهتزاز المخرج عند النطق بحروف (قطب جد) إذا سكنت. الخطأ يكون بترك الاهتزاز أو إشباعه حركةً كاملة.",
        "how_to_fix_ar": "انطق الحرف الساكن باهتزاز خفيف دون تحريكه بفتحة أو ضمة أو كسرة. القلقلة أوضح عند الوقف (القلقلة الكبرى).",
        "letters_or_example": "حروف القلقلة: ق ط ب ج د. مثال: «أَحَدْ» عند الوقف، «يَجْعَلُونَ».",
    },
    "tafkheem": {
        "name_ar": "التفخيم والترقيق",
        "category_ar": "التفخيم والترقيق",
        "summary_ar": "التفخيم تسمين الحرف بامتلاء الفم، والترقيق تنحيفه. الخطأ يكون بنطق حرف مفخم مرققًا أو العكس.",
        "how_to_fix_ar": "فخّم حروف الاستعلاء دائمًا (خص ضغط قظ)، وراعِ أحكام الراء واللام في لفظ الجلالة. ارفع مؤخرة اللسان نحو الحنك عند التفخيم.",
        "letters_or_example": "حروف الإطباق/التفخيم: خ ص ض غ ط ق ظ. مثال: «الصِّرَاطَ» تفخيم، «رِزْقًا».",
    },
    "hams_jahr": {
        "name_ar": "الهمس والجهر",
        "category_ar": "الهمس والجهر",
        "summary_ar": "الهمس جريان النفس مع الحرف، والجهر انحباسه. الخطأ يكون بجهر حرف مهموس أو همس حرف مجهور.",
        "how_to_fix_ar": "أجرِ النفس مع حروف الهمس (فحثه شخص سكت) واحبسه مع المجهورة. راقب اندفاع الهواء عند نطق الحرف.",
        "letters_or_example": "حروف الهمس: ف ح ث ه ش خ ص س ك ت. مثال: «سَتَكْتُبُ».",
    },
    "shidda": {
        "name_ar": "الشدة والرخاوة",
        "category_ar": "الشدة والرخاوة",
        "summary_ar": "الشدة انحباس الصوت تمامًا عند الحرف، والرخاوة جريانه. الخطأ يكون بعدم حبس الصوت في الشديد أو عدم إجرائه في الرخو.",
        "how_to_fix_ar": "احبس الصوت كليًّا في حروف الشدة (أجد قط بكت) عند سكونها، ولا تطل صوتها. وأجرِ الصوت في الرخوة.",
        "letters_or_example": "حروف الشدة: أ ج د ق ط ب ك ت. مثال: «الْحَقّ».",
    },
    "safeer": {
        "name_ar": "الصفير",
        "category_ar": "الصفير",
        "summary_ar": "الصفير صوت حاد يشبه صوت الطائر يخرج من بين الشفتين مع حروف (ص ز س). الخطأ يكون بإضعاف الصفير أو فقده.",
        "how_to_fix_ar": "أخرج صوتًا حادًّا من طرف اللسان قرب الثنايا السفلى عند نطق الصاد والزاي والسين، مع ضيق المخرج.",
        "letters_or_example": "حروف الصفير: ص ز س. مثال: «الصَّمَد»، «زَيْتُونَة»، «سَلَام».",
    },
    "istitala": {
        "name_ar": "الاستطالة",
        "category_ar": "الاستطالة",
        "summary_ar": "الاستطالة امتداد الصوت في حرف الضاد من أول حافة اللسان إلى آخرها. الخطأ يكون بنطق الضاد كالظاء أو الدال.",
        "how_to_fix_ar": "اضغط بإحدى حافتي اللسان على الأضراس العليا وأطل الصوت قليلًا حتى يتميز نطق الضاد عن الظاء.",
        "letters_or_example": "حرف الاستطالة: ض. مثال: «الضَّالِّينَ».",
    },
    "vowel": {
        "name_ar": "الحركات والتشكيل",
        "category_ar": "الحركات والتشكيل",
        "summary_ar": "ضبط الحركات (الفتحة والضمة والكسرة والسكون والتنوين) أساس صحة القراءة. الخطأ يكون بتغيير الحركة عن الصواب.",
        "how_to_fix_ar": "تأنَّ في قراءة التشكيل: افتح الفم للفتحة، وضمّ الشفتين للضمة، واخفض الفك للكسرة. تابع المصحف حرفًا حرفًا.",
        "letters_or_example": "مثال: لا تقرأ «نَعْبُدُ» بكسر الباء، والتزم ضبط أواخر الكلمات.",
    },
    "sifat": {
        "name_ar": "صفات الحروف",
        "category_ar": "صفات الحروف",
        "summary_ar": "لكل حرف صفات لازمة (كالتكرار والتفشي والقلقلة) يجب مراعاتها. الخطأ يكون بإهمال صفة من صفات الحرف.",
        "how_to_fix_ar": "تعرّف على صفة الحرف الذي أخطأت فيه وطبّقها: مثل عدم تكرار الراء، وتفشّي الشين في الفم.",
        "letters_or_example": "مثال: التفشي في الشين «الشَّمْس»، وعدم تكرار الراء «بَرّ».",
    },
    "phoneme": {
        "name_ar": "مخارج الحروف",
        "category_ar": "مخارج الحروف",
        "summary_ar": "المخرج هو موضع خروج الحرف. الخطأ يكون بإخراج الحرف من غير مخرجه فيتبدل بحرف آخر قريب منه.",
        "how_to_fix_ar": "حدّد مخرج الحرف الصحيح (الحلق، اللسان، الشفتان، الجوف، الخيشوم) ودرّب لسانك على ضبطه، خاصة الحروف المتقاربة كالقاف والكاف والذال والظاء.",
        "letters_or_example": "مثال: تمييز «ع» الحلقية عن «أ»، و«ق» عن «ك».",
    },
    "deletion": {
        "name_ar": "أساسيات النطق — حذف حرف",
        "category_ar": "أخطاء النطق",
        "summary_ar": "حذف حرف أو صوت موجود في النص القرآني من غير قصد، وهو خطأ جلي يغيّر الكلمة.",
        "how_to_fix_ar": "اقرأ على تمهّل وانطق كل حرف مكتوب، ولا تسرع في الكلمات الطويلة أو المتشابهة حتى لا تُسقط حرفًا.",
        "letters_or_example": "مثال: قراءة «العَالَمِينَ» مع إسقاط أحد الحروف.",
    },
    "insertion": {
        "name_ar": "أساسيات النطق — إضافة صوت",
        "category_ar": "أخطاء النطق",
        "summary_ar": "نطق صوت أو حرف زائد غير موجود في النص القرآني، كزيادة حركة أو مد غير مشروع.",
        "how_to_fix_ar": "التزم بالمكتوب فقط، ولا تزد حركة أو مدًّا. راقب أواخر الكلمات حتى لا تضيف صوتًا زائدًا عند الوصل.",
        "letters_or_example": "مثال: زيادة مد في «لَهُمْ» أو إضافة همزة غير موجودة.",
    },
}

# Fallback record for unknown ids (mirrors resolveRule()'s "other" branch on the
# frontend) so the explain route never KeyErrors.
_OTHER = {
    "name_ar": "خطأ تجويدي",
    "category_ar": "أخطاء أخرى",
    "summary_ar": "رُصد خطأ في التلاوة يحتاج إلى مراجعة أحكام التجويد.",
    "how_to_fix_ar": "راجع الدرس المناسب وتدرّب على الآية مع الاستماع إلى التلاوة الصحيحة.",
    "letters_or_example": "",
}

# Variant spellings → canonical id. Mirrors RULE_ALIASES in errorTypeMap.js plus
# the raw model head names (ghonna, qalqla, tikraar, tafashie, …).
RULE_ALIASES: dict[str, str] = {
    "ghunnah": "ghunna",
    "ghonna": "ghunna",
    "maghnoon": "ghunna",
    "ahkam": "ghunna",
    "qalqalah": "qalqala",
    "qalqla": "qalqala",
    "moqalqal": "qalqala",
    "makharij": "phoneme",
    "makhraj": "phoneme",
    "tafkheem_or_taqeeq": "tafkheem",
    "tarqeeq": "tafkheem",
    "mofakham": "tafkheem",
    "hams_or_jahr": "hams_jahr",
    "hams": "hams_jahr",
    "jahr": "hams_jahr",
    "shidda_or_rakhawa": "shidda",
    "tikraar": "sifat",
    "tafashie": "sifat",
    "itbaq": "tafkheem",
    "harakat": "vowel",
}


def normalize_rule_id(raw: str | None) -> str | None:
    """Map any incoming rule/error id to its canonical key in RULE_KB.

    Returns None for empty/"none" inputs; unknown ids pass through unchanged so
    resolve_rule() can still return a safe fallback record.
    """
    if not raw or str(raw).strip().lower() == "none":
        return None
    key = str(raw).strip().lower()
    return RULE_ALIASES.get(key, key)


def resolve_rule(raw: str | None) -> dict:
    """Resolve a raw rule/error id to its knowledge record.

    Always returns a stable shape with at least name_ar/category_ar/summary_ar/
    how_to_fix_ar so callers never need to guard for missing keys.
    """
    rule_id = normalize_rule_id(raw)
    if rule_id is None:
        return {"rule_id": "other", **_OTHER}
    info = RULE_KB.get(rule_id)
    if info is None:
        return {"rule_id": rule_id, **_OTHER, "name_ar": rule_id}
    return {"rule_id": rule_id, **info}
