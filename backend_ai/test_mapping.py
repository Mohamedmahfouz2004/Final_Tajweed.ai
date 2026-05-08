import json
from quran_transcript import quran_phonetizer, MoshafAttributes
moshaf = MoshafAttributes(rewaya="hafs", madd_monfasel_len=2, madd_mottasel_len=4, madd_mottasel_waqf=4, madd_aared_len=2)
out = quran_phonetizer('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ', moshaf, remove_spaces=True)
exp_phonemes = out.phonemes
ph_to_uthmani = [[] for _ in range(len(exp_phonemes))]
for u_idx, m in enumerate(out.mappings):
    if m is not None and not m.deleted:
        for p_idx in range(m.pos[0], m.pos[1]):
            if p_idx < len(exp_phonemes):
                ph_to_uthmani[p_idx].append(u_idx)

exp_chunks = [s.phonemes for s in out.sifat]
group_to_p_idxs = []
curr_p = 0
for chunk in exp_chunks:
    group_to_p_idxs.append(list(range(curr_p, curr_p + len(chunk))))
    curr_p += len(chunk)

res = []
for i, g in enumerate(group_to_p_idxs):
    u_idxs = []
    for p in g:
        u_idxs.extend(ph_to_uthmani[p])
    u_idxs = list(set(u_idxs))
    res.append({"group_idx": i, "phoneme": exp_chunks[i], "u_idxs": u_idxs})

print(json.dumps(res, indent=2, ensure_ascii=False))
