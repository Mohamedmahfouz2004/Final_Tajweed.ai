"""
Tajweed explanation — served by the Muaalem model server.

Self-contained port of the logic in the FastAPI backend
(backend/app/services/{tajweed_kb,llm_client}.py + routes/explain.py) so the
recitation report can ride the same tunnel as the model server, with no separate
backend. Keep RULE_KB / aliases in sync with that backend copy and with
myapp/src/utils/errorTypeMap.js.

Hybrid design: deterministic keyed lookup over the fixed 13-rule catalogue gives
the grounding facts and a guaranteed static fallback; OpenRouter (free model,
with a fallback chain) personalises the Arabic explanation. Never hard-fails —
on any LLM error it returns the static catalogue text.

Config via env (loaded by muaalem_server with python-dotenv):
  OPENROUTER_API_KEY, OPENROUTER_BASE_URL, OPENROUTER_MODEL, OPENROUTER_FALLBACK_MODELS
"""

from __future__ import annotations

import json
import logging
import os
import re
import time

import httpx

logger = logging.getLogger("muaalem.explain")

# ── Rule knowledge base (mirror of backend/app/services/tajweed_kb.py) ──
RULE_KB: dict[str, dict] = {
    "madd": {"name_ar": "أحكام المد", "category_ar": "أحكام المدود",
        "summary_ar": "المد هو إطالة الصوت بحرف من حروف المد (الألف والواو والياء) بالمقدار الشرعي. الخطأ يكون بعدم إشباع المد أو الزيادة عليه.",
        "how_to_fix_ar": "اضبط مقدار المد: المد الطبيعي حركتان، والمد الفرعي (المتصل واللازم) أربع إلى ست حركات. عُدّ الحركات أثناء النطق ولا تقطع الصوت قبل تمام المقدار.",
        "letters_or_example": "حروف المد: ا و ي. مثال: «قَالَ» مد طبيعي، «جَاءَ» مد متصل."},
    "ghunna": {"name_ar": "الغنة وأحكام النون والميم", "category_ar": "الغنة وأحكام النون والميم",
        "summary_ar": "الغنة صوت يخرج من الخيشوم يصاحب النون والميم المشددتين والمخفاتين. الخطأ يكون بترك الغنة أو عدم إتمام مقدارها (حركتان).",
        "how_to_fix_ar": "أمسك الصوت في الأنف عند النون والميم المشددة بمقدار حركتين، وتحقق من خروج الصوت من الخيشوم.",
        "letters_or_example": "أكمل الغنة في: «إِنَّ»، «ثُمَّ»، والإخفاء في «مِن قَبْلُ»."},
    "qalqala": {"name_ar": "القلقلة", "category_ar": "القلقلة",
        "summary_ar": "القلقلة اهتزاز المخرج عند النطق بحروف (قطب جد) إذا سكنت. الخطأ يكون بترك الاهتزاز أو إشباعه حركةً كاملة.",
        "how_to_fix_ar": "انطق الحرف الساكن باهتزاز خفيف دون تحريكه بفتحة أو ضمة أو كسرة. القلقلة أوضح عند الوقف.",
        "letters_or_example": "حروف القلقلة: ق ط ب ج د. مثال: «أَحَدْ» عند الوقف."},
    "tafkheem": {"name_ar": "التفخيم والترقيق", "category_ar": "التفخيم والترقيق",
        "summary_ar": "التفخيم تسمين الحرف بامتلاء الفم، والترقيق تنحيفه. الخطأ يكون بنطق حرف مفخم مرققًا أو العكس.",
        "how_to_fix_ar": "فخّم حروف الاستعلاء دائمًا (خص ضغط قظ)، وراعِ أحكام الراء واللام في لفظ الجلالة.",
        "letters_or_example": "حروف التفخيم: خ ص ض غ ط ق ظ. مثال: «الصِّرَاطَ»."},
    "hams_jahr": {"name_ar": "الهمس والجهر", "category_ar": "الهمس والجهر",
        "summary_ar": "الهمس جريان النفس مع الحرف، والجهر انحباسه. الخطأ يكون بجهر حرف مهموس أو همس حرف مجهور.",
        "how_to_fix_ar": "أجرِ النفس مع حروف الهمس (فحثه شخص سكت) واحبسه مع المجهورة.",
        "letters_or_example": "حروف الهمس: ف ح ث ه ش خ ص س ك ت. مثال: «سَتَكْتُبُ»."},
    "shidda": {"name_ar": "الشدة والرخاوة", "category_ar": "الشدة والرخاوة",
        "summary_ar": "الشدة انحباس الصوت تمامًا عند الحرف، والرخاوة جريانه. الخطأ يكون بعدم حبس الصوت في الشديد.",
        "how_to_fix_ar": "احبس الصوت كليًّا في حروف الشدة (أجد قط بكت) عند سكونها، ولا تطل صوتها.",
        "letters_or_example": "حروف الشدة: أ ج د ق ط ب ك ت. مثال: «الْحَقّ»."},
    "safeer": {"name_ar": "الصفير", "category_ar": "الصفير",
        "summary_ar": "الصفير صوت حاد يخرج من بين الشفتين مع حروف (ص ز س). الخطأ يكون بإضعاف الصفير أو فقده.",
        "how_to_fix_ar": "أخرج صوتًا حادًّا من طرف اللسان قرب الثنايا السفلى مع ضيق المخرج.",
        "letters_or_example": "حروف الصفير: ص ز س. مثال: «الصَّمَد»."},
    "istitala": {"name_ar": "الاستطالة", "category_ar": "الاستطالة",
        "summary_ar": "الاستطالة امتداد الصوت في حرف الضاد من أول حافة اللسان إلى آخرها. الخطأ يكون بنطق الضاد كالظاء أو الدال.",
        "how_to_fix_ar": "اضغط بإحدى حافتي اللسان على الأضراس العليا وأطل الصوت قليلًا حتى يتميز الضاد.",
        "letters_or_example": "حرف الاستطالة: ض. مثال: «الضَّالِّينَ»."},
    "vowel": {"name_ar": "الحركات والتشكيل", "category_ar": "الحركات والتشكيل",
        "summary_ar": "ضبط الحركات (الفتحة والضمة والكسرة والسكون والتنوين) أساس صحة القراءة. الخطأ يكون بتغيير الحركة عن الصواب.",
        "how_to_fix_ar": "تأنَّ في قراءة التشكيل وتابع المصحف حرفًا حرفًا.",
        "letters_or_example": "مثال: لا تقرأ «نَعْبُدُ» بكسر الباء."},
    "sifat": {"name_ar": "صفات الحروف", "category_ar": "صفات الحروف",
        "summary_ar": "لكل حرف صفات لازمة (كالتكرار والتفشي) يجب مراعاتها. الخطأ يكون بإهمال صفة من صفات الحرف.",
        "how_to_fix_ar": "تعرّف على صفة الحرف الذي أخطأت فيه وطبّقها، مثل عدم تكرار الراء.",
        "letters_or_example": "مثال: التفشي في الشين «الشَّمْس»."},
    "phoneme": {"name_ar": "مخارج الحروف", "category_ar": "مخارج الحروف",
        "summary_ar": "المخرج موضع خروج الحرف. الخطأ يكون بإخراج الحرف من غير مخرجه فيتبدل بحرف آخر قريب منه.",
        "how_to_fix_ar": "حدّد مخرج الحرف الصحيح ودرّب لسانك عليه، خاصة الحروف المتقاربة كالقاف والكاف.",
        "letters_or_example": "مثال: تمييز «ع» الحلقية عن «أ»، و«ق» عن «ك»."},
    "deletion": {"name_ar": "أساسيات النطق — حذف حرف", "category_ar": "أخطاء النطق",
        "summary_ar": "حذف حرف أو صوت موجود في النص القرآني من غير قصد، وهو خطأ جلي يغيّر الكلمة.",
        "how_to_fix_ar": "اقرأ على تمهّل وانطق كل حرف مكتوب، ولا تسرع في الكلمات الطويلة.",
        "letters_or_example": "مثال: قراءة «العَالَمِينَ» مع إسقاط أحد الحروف."},
    "insertion": {"name_ar": "أساسيات النطق — إضافة صوت", "category_ar": "أخطاء النطق",
        "summary_ar": "نطق صوت أو حرف زائد غير موجود في النص القرآني، كزيادة حركة أو مد غير مشروع.",
        "how_to_fix_ar": "التزم بالمكتوب فقط، ولا تزد حركة أو مدًّا، وراقب أواخر الكلمات عند الوصل.",
        "letters_or_example": "مثال: زيادة مد في «لَهُمْ»."},
}

_OTHER = {"name_ar": "خطأ تجويدي", "category_ar": "أخطاء أخرى",
    "summary_ar": "رُصد خطأ في التلاوة يحتاج إلى مراجعة أحكام التجويد.",
    "how_to_fix_ar": "راجع الدرس المناسب وتدرّب على الآية مع الاستماع إلى التلاوة الصحيحة.",
    "letters_or_example": ""}

RULE_ALIASES: dict[str, str] = {
    "ghunnah": "ghunna", "ghonna": "ghunna", "maghnoon": "ghunna", "ahkam": "ghunna",
    "qalqalah": "qalqala", "qalqla": "qalqala", "moqalqal": "qalqala",
    "makharij": "phoneme", "makhraj": "phoneme",
    "tafkheem_or_taqeeq": "tafkheem", "tarqeeq": "tafkheem", "mofakham": "tafkheem", "itbaq": "tafkheem",
    "hams_or_jahr": "hams_jahr", "hams": "hams_jahr", "jahr": "hams_jahr",
    "shidda_or_rakhawa": "shidda", "tikraar": "sifat", "tafashie": "sifat", "harakat": "vowel",
}


def normalize_rule_id(raw):
    if not raw or str(raw).strip().lower() == "none":
        return None
    key = str(raw).strip().lower()
    return RULE_ALIASES.get(key, key)


def resolve_rule(raw) -> dict:
    rid = normalize_rule_id(raw)
    if rid is None:
        return {"rule_id": "other", **_OTHER}
    info = RULE_KB.get(rid)
    if info is None:
        return {"rule_id": rid, **_OTHER, "name_ar": rid}
    return {"rule_id": rid, **info}


# ── OpenRouter client (with model fallback chain) ──
_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def _extract_json(content: str):
    if not content:
        return None
    text = _FENCE_RE.sub("", content.strip())
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        pass
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            parsed = json.loads(text[start:end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def _model_chain() -> list[str]:
    primary = os.environ.get("OPENROUTER_MODEL", "google/gemma-4-31b-it:free").strip()
    chain = [primary] if primary else []
    fallbacks = os.environ.get(
        "OPENROUTER_FALLBACK_MODELS",
        "openai/gpt-oss-20b:free,meta-llama/llama-3.3-70b-instruct:free",
    )
    for m in fallbacks.split(","):
        m = m.strip()
        if m and m not in chain:
            chain.append(m)
    return chain


# Per-call read timeout and overall wall-clock budget. Free models can be slow,
# so cap total time hard — the report shows static text if the budget is blown.
_PER_CALL_TIMEOUT = float(os.environ.get("OPENROUTER_TIMEOUT", "18"))
_TOTAL_BUDGET = float(os.environ.get("OPENROUTER_TOTAL_BUDGET", "35"))


async def _chat_json(system: str, user: str):
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        logger.info("OPENROUTER_API_KEY not set — static fallback.")
        return None
    base = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    url = f"{base}/chat/completions"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json",
               "X-Title": "Tajweed.AI"}
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    deadline = time.monotonic() + _TOTAL_BUDGET
    async with httpx.AsyncClient() as client:
        for model in _model_chain():
            remaining = deadline - time.monotonic()
            if remaining <= 1:
                logger.warning("OpenRouter time budget exhausted — static fallback.")
                break
            body = {"model": model, "messages": messages, "temperature": 0.3,
                    "max_tokens": 700, "response_format": {"type": "json_object"}}
            try:
                resp = await client.post(url, headers=headers, json=body,
                                         timeout=min(_PER_CALL_TIMEOUT, remaining))
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError as e:
                code = e.response.status_code
                logger.warning("OpenRouter HTTP %s (%s): %s", code, model, e.response.text[:200])
                if code in (402, 404, 408, 429, 500, 502, 503, 529):
                    continue
                break
            except httpx.ConnectError:
                logger.warning("OpenRouter not reachable.")
                break
            except (httpx.TimeoutException, Exception) as e:  # noqa: BLE001
                logger.warning("OpenRouter slow/failed (%s): %s", model, str(e)[:120])
                continue
            try:
                content = data["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError):
                continue
            parsed = _extract_json(content)
            if parsed is not None:
                logger.info("OpenRouter explanation served by %s", model)
                return parsed
    return None


# ── Grouping + prompts + public entrypoint ──
_MAX_RULES, _MAX_AYAT, _MAX_SNIPPETS = 8, 6, 2


def _group(mistakes: list[dict]) -> dict:
    grouped: dict[str, dict] = {}
    for m in mistakes:
        rule = resolve_rule(m.get("error_type") or m.get("name"))
        rid = rule["rule_id"]
        b = grouped.setdefault(rid, {"rule": rule, "occurrences": 0, "ayat": [], "snippets": []})
        b["occurrences"] += 1
        ay = m.get("ayah_number")
        if ay and ay not in b["ayat"]:
            b["ayat"].append(ay)
        snip = (m.get("ayah_text") or "").strip()
        if snip and snip not in b["snippets"] and len(b["snippets"]) < _MAX_SNIPPETS:
            b["snippets"].append(snip[:160])
    return grouped


def _build_prompts(grouped: dict):
    facts = []
    for rid, b in grouped.items():
        info = RULE_KB.get(rid, b["rule"])
        facts.append(f"- {rid} ({info.get('name_ar','')}): {info.get('summary_ar','')} "
                     f"التصحيح: {info.get('how_to_fix_ar','')} {info.get('letters_or_example','')}")
    system = (
        "أنت معلّم تجويد خبير ولطيف تخاطب طالبًا أخطأ في التلاوة. "
        "اعتمد فقط على المعلومات المعطاة عن كل حكم ولا تخترع أحكامًا. "
        "لكل حكم اكتب شرحًا موجزًا (جملتين) يربط الخطأ بالآيات، ثم نصيحة عملية للتصحيح، بأسلوب مشجّع. "
        "أعد الناتج بصيغة JSON فقط بهذا الشكل:\n"
        '{"rules": [{"rule_id": "...", "explanation_ar": "...", "how_to_fix_ar": "..."}], "overall_ar": "..."}\n\n'
        "حقائق الأحكام:\n" + "\n".join(facts)
    )
    lines = []
    for rid, b in grouped.items():
        info = RULE_KB.get(rid, b["rule"])
        ayat = "، ".join(str(a) for a in b["ayat"][:_MAX_AYAT]) or "غير محددة"
        line = f"- {rid} ({info.get('name_ar','')}): تكرر {b['occurrences']} مرة في الآيات {ayat}."
        if b["snippets"]:
            line += " من نص الآية: " + " | ".join(b["snippets"])
        lines.append(line)
    user = "أخطاء الطالب في هذه الجلسة:\n" + "\n".join(lines) + "\n\nاكتب الشرح لكل حكم بصيغة JSON كما هو مطلوب."
    return system, user


async def build_explanation(mistakes: list[dict]) -> dict:
    grouped = _group(mistakes or [])
    if not grouped:
        return {"rules": [], "overall_ar": "أحسنت! لم تُرصد أخطاء في هذه الجلسة."}
    if len(grouped) > _MAX_RULES:
        grouped = dict(sorted(grouped.items(), key=lambda kv: kv[1]["occurrences"], reverse=True)[:_MAX_RULES])

    system, user = _build_prompts(grouped)
    ai = await _chat_json(system, user)

    ai_by_rule, overall_ar = {}, None
    if ai:
        overall_ar = ai.get("overall_ar")
        for item in ai.get("rules", []) or []:
            if isinstance(item, dict) and item.get("rule_id"):
                ai_by_rule[str(item["rule_id"]).strip().lower()] = item

    rules_out = []
    for rid, b in grouped.items():
        info = RULE_KB.get(rid, b["rule"])
        ai_item = ai_by_rule.get(rid)
        if ai_item and (ai_item.get("explanation_ar") or "").strip():
            explanation_ar = ai_item["explanation_ar"].strip()
            how_to_fix_ar = (ai_item.get("how_to_fix_ar") or info.get("how_to_fix_ar", "")).strip()
            source = "ai"
        else:
            explanation_ar = info.get("summary_ar", "")
            how_to_fix_ar = info.get("how_to_fix_ar", "")
            source = "static"
        rules_out.append({
            "rule_id": rid, "name_ar": info.get("name_ar", rid),
            "category_ar": info.get("category_ar", ""), "occurrences": b["occurrences"],
            "ayat": b["ayat"][:_MAX_AYAT], "explanation_ar": explanation_ar,
            "how_to_fix_ar": how_to_fix_ar, "source": source,
        })

    if not overall_ar:
        overall_ar = "واصل التدرّب، فكل خطأ تصححه يقرّبك من الإتقان."
    logger.info("[EXPLAIN] %d mistakes → %d rules (source=%s)",
                len(mistakes or []), len(rules_out), "ai" if ai_by_rule else "static")
    return {"rules": rules_out, "overall_ar": overall_ar}
