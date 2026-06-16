"""
Explanation route — POST /api/explain

Takes the tajweed mistakes detected during a recitation session and returns, per
distinct rule, a clear Arabic explanation of what went wrong and how to fix it.

Architecture: deterministic keyed lookup over the fixed tajweed rule catalogue
(tajweed_kb.RULE_KB) provides the grounding facts and a guaranteed static
fallback; an LLM (OpenRouter) turns those facts plus the student's specific
mistakes into a personalised explanation. If the LLM is unavailable or returns
nothing usable, the static catalogue text is returned instead, so the endpoint
never hard-fails.

The endpoint is intentionally unauthenticated: it is a stateless text utility
that writes nothing and only echoes back ayah text the client already holds.
Video recommendations are resolved client-side (the frontend owns Supabase) by
joining the returned rule_ids against lessons.tajweed_rule.
"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import llm_client
from app.services.tajweed_kb import RULE_KB, normalize_rule_id, resolve_rule

logger = logging.getLogger("tajweed.explain")

router = APIRouter(prefix="/api", tags=["Explain"])

# Cap how much we feed the model / iterate over, in case of a noisy session.
_MAX_RULES = 8
_MAX_AYAT_PER_RULE = 6
_MAX_SNIPPETS_PER_RULE = 2


class Mistake(BaseModel):
    # Matches the sessionMistakes shape produced in myapp/src/store/useAppStore.js.
    error_type: str | None = None
    name: str | None = None  # frontend uses `name` for the error type as well
    surah_number: int | None = None
    ayah_number: int | None = None
    ayah_text: str | None = None
    char_index: int | None = None
    tooltip: str | None = None
    severity: str | None = None


class ExplainRequest(BaseModel):
    mistakes: list[Mistake] = []


def _group(mistakes: list[Mistake]) -> dict[str, dict]:
    """Group mistakes by canonical rule id, aggregating counts, ayah numbers and
    a couple of representative text snippets."""
    grouped: dict[str, dict] = {}
    for m in mistakes:
        rule = resolve_rule(m.error_type or m.name)
        rid = rule["rule_id"]
        bucket = grouped.setdefault(
            rid,
            {"rule": rule, "occurrences": 0, "ayat": [], "snippets": []},
        )
        bucket["occurrences"] += 1
        if m.ayah_number and m.ayah_number not in bucket["ayat"]:
            bucket["ayat"].append(m.ayah_number)
        snippet = (m.ayah_text or "").strip()
        if snippet and snippet not in bucket["snippets"] and len(bucket["snippets"]) < _MAX_SNIPPETS_PER_RULE:
            bucket["snippets"].append(snippet[:160])
    return grouped


def _build_prompts(grouped: dict[str, dict]) -> tuple[str, str]:
    """Build the (system, user) prompt pair. The system prompt carries the
    grounding facts; the user prompt carries the student's specific mistakes."""
    facts = []
    for rid, b in grouped.items():
        info = RULE_KB.get(rid, b["rule"])
        facts.append(
            f"- {rid} ({info.get('name_ar', '')}): {info.get('summary_ar', '')} "
            f"التصحيح: {info.get('how_to_fix_ar', '')} {info.get('letters_or_example', '')}"
        )
    facts_block = "\n".join(facts)

    system = (
        "أنت معلّم تجويد خبير ولطيف تخاطب طالبًا أخطأ في التلاوة. "
        "اعتمد فقط على المعلومات المعطاة عن كل حكم ولا تخترع أحكامًا. "
        "لكل حكم اكتب شرحًا موجزًا وواضحًا بالعربية الفصحى يربط الخطأ بالآيات التي أخطأ فيها، "
        "ثم نصيحة عملية للتصحيح، بأسلوب مشجّع لا يثبّط. "
        "أعد الناتج بصيغة JSON فقط بهذا الشكل:\n"
        '{"rules": [{"rule_id": "...", "explanation_ar": "...", "how_to_fix_ar": "..."}], "overall_ar": "..."}\n'
        "اجعل explanation_ar في حدود جملتين، و how_to_fix_ar نصيحة واحدة عملية، "
        "و overall_ar كلمة تشجيع قصيرة.\n\n"
        "حقائق الأحكام:\n" + facts_block
    )

    student_lines = []
    for rid, b in grouped.items():
        info = RULE_KB.get(rid, b["rule"])
        ayat = "، ".join(str(a) for a in b["ayat"][:_MAX_AYAT_PER_RULE]) or "غير محددة"
        snippets = " | ".join(b["snippets"]) if b["snippets"] else ""
        line = f"- {rid} ({info.get('name_ar', '')}): تكرر {b['occurrences']} مرة في الآيات {ayat}."
        if snippets:
            line += f" من نص الآية: {snippets}"
        student_lines.append(line)

    user = (
        "أخطاء الطالب في هذه الجلسة:\n"
        + "\n".join(student_lines)
        + "\n\nاكتب الشرح لكل حكم بصيغة JSON كما هو مطلوب."
    )
    return system, user


@router.post("/explain")
async def explain_mistakes(body: ExplainRequest):
    grouped = _group(body.mistakes)
    if not grouped:
        return {"rules": [], "overall_ar": "أحسنت! لم تُرصد أخطاء في هذه الجلسة."}

    # Keep only the most-frequent rules if the session was noisy.
    if len(grouped) > _MAX_RULES:
        grouped = dict(
            sorted(grouped.items(), key=lambda kv: kv[1]["occurrences"], reverse=True)[:_MAX_RULES]
        )

    system, user = _build_prompts(grouped)
    ai = await llm_client.chat_json(system, user)

    # Index any AI explanations by rule_id for merging.
    ai_by_rule: dict[str, dict] = {}
    overall_ar = None
    if ai:
        overall_ar = ai.get("overall_ar")
        for item in ai.get("rules", []) or []:
            if isinstance(item, dict) and item.get("rule_id"):
                # Normalize through the alias map so a model that echoes e.g.
                # "ghunnah" / "tarqeeq" still matches the canonical grouped rid.
                key = normalize_rule_id(item["rule_id"]) or str(item["rule_id"]).strip().lower()
                ai_by_rule[key] = item

    rules_out = []
    for rid, b in grouped.items():
        info = RULE_KB.get(rid, b["rule"])
        ai_item = ai_by_rule.get(rid)
        if ai_item and (ai_item.get("explanation_ar") or "").strip():
            explanation_ar = ai_item.get("explanation_ar", "").strip()
            how_to_fix_ar = (ai_item.get("how_to_fix_ar") or info.get("how_to_fix_ar", "")).strip()
            source = "ai"
        else:
            explanation_ar = info.get("summary_ar", "")
            how_to_fix_ar = info.get("how_to_fix_ar", "")
            source = "static"

        rules_out.append({
            "rule_id": rid,
            "name_ar": info.get("name_ar", rid),
            "category_ar": info.get("category_ar", ""),
            "occurrences": b["occurrences"],
            "ayat": b["ayat"][:_MAX_AYAT_PER_RULE],
            "explanation_ar": explanation_ar,
            "how_to_fix_ar": how_to_fix_ar,
            "source": source,
        })

    if not overall_ar:
        overall_ar = "واصل التدرّب، فكل خطأ تصححه يقرّبك من الإتقان." if rules_out else None

    logger.info(
        "[EXPLAIN] %d mistakes → %d rules (source=%s)",
        len(body.mistakes),
        len(rules_out),
        "ai" if ai_by_rule else "static",
    )
    return {"rules": rules_out, "overall_ar": overall_ar}
