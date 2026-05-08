from typing import Literal
import diff_match_patch as dmp

from .explain import expalin_sifat
from .modeling.vocab import SIFAT_ATTR_TO_ARABIC_WITHOUT_BRACKETS


def explain_for_gradio(
    phonemes: str,
    exp_phonemes: str,
    sifat: list,
    exp_sifat: list,
    lang: Literal["arabic", "english"] = "english",
) -> tuple[str, bool]:
    # Create diff-match-patch object
    dmp_obj = dmp.diff_match_patch()

    # Calculate differences using Google's diff-match-patch (same as terminal)
    diffs = dmp_obj.diff_main(exp_phonemes, phonemes)

    # Create HTML for phoneme differences
    phoneme_html = explain_phonemes_html(dmp_obj, diffs)

    # Create HTML for sifat table using your existing function
    sifat_table = expalin_sifat(sifat, exp_sifat, diffs)
    sifat_html = explain_sifat_html(sifat_table, lang)

    # Combine both sections
    html_output = f"""
    <div style="font-family: monospace; width: 100%; direction: rtl; text-align: right;">
        <h3>مقارنة الحروف</h3>
        {phoneme_html}
        <h3>مقارنة صفات الحروف</h3>
        <div style="overflow-x: auto; max-width: 100%;">
            {sifat_html}
        </div>
       <div class="color-legend"></div>
    </div>
    """

    # Check if finished (length based heuristic is more robust)
    is_finished = False
    phonemes_len = len(phonemes.replace(' ', ''))
    exp_phonemes_len = len(exp_phonemes.replace(' ', ''))
    
    if phonemes_len > 0 and exp_phonemes_len > 0:
        if phonemes_len >= exp_phonemes_len * 0.90 or (exp_phonemes_len - phonemes_len < 10):
            is_finished = True

    return html_output, is_finished


def explain_phonemes_html(dmp_obj, diffs):
    html_output = '<div style="background-color: #000; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-size: 24px; word-wrap: break-word; white-space: pre-wrap; direction: rtl; text-align: right; line-height: 1.8;">'

    # Process each difference (same logic as terminal version)
    for op, data in diffs:
        if op == dmp_obj.DIFF_EQUAL:
            html_output += f'<span style="color: #ffffff;">{data}</span>'
        elif op == dmp_obj.DIFF_INSERT:
            html_output += f'<span style="color: #00ff00;">{data}</span>'
        elif op == dmp_obj.DIFF_DELETE:
            html_output += f'<span style="color: #ff0000; text-decoration: line-through;">{data}</span>'

    html_output += "</div>"
    return html_output


def explain_sifat_html(table, lang):
    if not table:
        return "<p>No sifat data available</p>"

    # Create HTML table with full width
    html_output = """
    <table style="width: 100%; border-collapse: collapse; background-color: #000; color: #fff; margin-bottom: 20px;">
        <thead>
            <tr>
    """

    # Get base columns (non-exp keys without 'tag')
    base_keys = [k for k in table[0].keys() if not k.startswith("exp_") and k != "tag" and k != "ref_idx"]

    for key in base_keys:
        html_output += f'<th style="border: 1px solid #444; padding: 8px; text-align: center; white-space: nowrap;">{key.replace("_", " ").title()}</th>'

    html_output += """
            </tr>
        </thead>
        <tbody>
    """

    # Add rows
    for row in table:
        tag = row["tag"]
        html_output += "<tr>"

        for key in base_keys:
            exp_key = f"exp_{key}"
            value = str(row[key])

            # Apply Arabic translation if needed
            if key != "phonemes" and lang == "arabic":
                value = SIFAT_ATTR_TO_ARABIC_WITHOUT_BRACKETS.get(value, value)

            # Apply styling based on tag and comparison
            if tag == "exact" and row.get(exp_key) != row[key]:
                html_output += f'<td style="border: 1px solid #444; padding: 8px; color: #ff0000;">{value}</td>'
            elif tag == "insert":
                html_output += f'<td style="border: 1px solid #444; padding: 8px; color: #ffff00;">{value}</td>'
            else:
                html_output += (
                    f'<td style="border: 1px solid #444; padding: 8px;">{value}</td>'
                )

        html_output += "</tr>"

    html_output += """
        </tbody>
    </table>
    """

    return html_output
    html_output += """
            </tr>
        </thead>
        <tbody>
    """

    # Add rows
    for row in table:
        tag = row["tag"]
        html_output += "<tr>"

        for key in base_keys:
            exp_key = f"exp_{key}"
            value = str(row[key])

            # Apply Arabic translation if needed
            if key != "phonemes" and lang == "arabic":
                value = SIFAT_ATTR_TO_ARABIC_WITHOUT_BRACKETS.get(value, value)

            # Apply styling based on tag and comparison
            if tag == "exact" and row.get(exp_key) != row[key]:
                html_output += f'<td style="border: 1px solid #444; padding: 8px; color: #ff0000;">{value}</td>'
            elif tag == "insert":
                html_output += f'<td style="border: 1px solid #444; padding: 8px; color: #ffff00;">{value}</td>'
            else:
                html_output += (
                    f'<td style="border: 1px solid #444; padding: 8px;">{value}</td>'
                )

        html_output += "</tr>"

    html_output += """
        </tbody>
    </table>
    """

    return html_output
    for row in table:
        tag = row["tag"]
        html_output += "<tr>"

        for key in base_keys:
            exp_key = f"exp_{key}"
            value = str(row[key])

            # Apply Arabic translation if needed
            if key != "phonemes" and lang == "arabic":
                value = SIFAT_ATTR_TO_ARABIC_WITHOUT_BRACKETS.get(value, value)

            # Apply styling based on tag and comparison
            if tag == "exact" and row.get(exp_key) != row[key]:
                html_output += f'<td style="border: 1px solid #444; padding: 8px; color: #ff0000;">{value}</td>'
            elif tag == "insert":
                html_output += f'<td style="border: 1px solid #444; padding: 8px; color: #ffff00;">{value}</td>'
            else:
                html_output += (
                    f'<td style="border: 1px solid #444; padding: 8px;">{value}</td>'
                )

        html_output += "</tr>"

    html_output += """
        </tbody>
    </table>
    """

    return html_output
