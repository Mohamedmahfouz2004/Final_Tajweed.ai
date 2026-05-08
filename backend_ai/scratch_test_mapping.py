import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.append(r'e:\website\quran-muaalem-main\quran-muaalem-main\src')
from quran_transcript import quran_phonetizer, MoshafAttributes
import diff_match_patch as dmp

moshaf = MoshafAttributes(
    rewaya="hafs",
    madd_monfasel_len=4,
    madd_mottasel_len=4,
    madd_mottasel_waqf=4,
    madd_aared_len=4,
)

uthmani_text = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"
phonetizer_out = quran_phonetizer(
    uthmani_text, moshaf, remove_spaces=True
)

exp_phonemes = phonetizer_out.phonemes
pronounced_phonemes = exp_phonemes.replace('هِ', 'هُ')

dmp_obj = dmp.diff_match_patch()
diffs = dmp_obj.diff_main(exp_phonemes, pronounced_phonemes)

# Pre-compute phoneme index -> list of uthmani indices
ph_to_uthmani = [[] for _ in range(len(exp_phonemes))]
for u_idx, m in enumerate(phonetizer_out.mappings):
    if m is not None and not m.deleted:
        for p_idx in range(m.pos[0], m.pos[1]):
            if p_idx < len(exp_phonemes):
                ph_to_uthmani[p_idx].append(u_idx)

# Build a list of objects for the original Uthmani text
# We will flag characters as 'error' if they were involved in a mismatch
chars_out = [{'char': c, 'error': False, 'inserts': []} for c in uthmani_text]

curr_ph_idx = 0
for op, text in diffs:
    if op == dmp_obj.DIFF_EQUAL:
        curr_ph_idx += len(text)
    elif op == dmp_obj.DIFF_DELETE:
        for _ in range(len(text)):
            u_indices = ph_to_uthmani[curr_ph_idx]
            for u in u_indices:
                chars_out[u]['error'] = True
                
                # Highlight consonant if it's a diacritic
                # Basic heuristic: if it's a diacritic, the preceding letter holds it
                if '\u064B' <= chars_out[u]['char'] <= '\u065F':
                    pre = u - 1
                    while pre >= 0 and '\u064B' <= chars_out[pre]['char'] <= '\u065F':
                        pre -= 1
                    if pre >= 0:
                        chars_out[pre]['error'] = True
            
            curr_ph_idx += 1
    elif op == dmp_obj.DIFF_INSERT:
        # User pronounced something else here. We want to insert it in the DOM visually.
        # Find the best Uthmani index to attach this insert
        target_u_idx = 0
        if curr_ph_idx < len(ph_to_uthmani):
            t = ph_to_uthmani[curr_ph_idx]
            if t:
                target_u_idx = t[0]
        else:
            target_u_idx = len(uthmani_text) - 1
            
        # We attach it to the previous character actually, or the current one
        chars_out[target_u_idx]['inserts'].append(text)

# Now, split back into Words!
word_boundaries = []
html_out = ""
for i, c in enumerate(chars_out):
    if c['error']:
        html_out += f"<span style='color:red;'>{c['char']}</span>"
    else:
        html_out += c['char']
        
    for ins in c['inserts']:
        html_out += f"<span style='color:red;'>{ins}</span>"
        
print("HTML OUTPUT:")
print(html_out)
