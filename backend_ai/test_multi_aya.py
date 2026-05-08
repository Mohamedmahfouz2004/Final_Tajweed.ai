import sys
sys.path.append(r'e:\website\quran-muaalem-main\quran-muaalem-main\src')
from quran_transcript import Aya, quran_phonetizer, MoshafAttributes

moshaf = MoshafAttributes(
    rewaya='hafs', 
    takbeer='no_takbeer', 
    madd_monfasel_len=4, 
    madd_mottasel_len=4, 
    madd_mottasel_waqf=4, 
    madd_aared_len=4, 
    madd_alleen_len=4, 
    madd_badal_len=2
)
try:
    a1 = Aya(6, 1).get().uthmani
    a2 = Aya(6, 2).get().uthmani
    text = a1 + " \u06dd " + a2 # or just space
    print("Testing with just space:")
    text_space = a1 + " " + a2
    out = quran_phonetizer(text_space, moshaf, remove_spaces=True)
    print("Space Phonetizer success! len words:", len(out.words))
    
    print("Testing with ayah marker:")
    out2 = quran_phonetizer(text, moshaf, remove_spaces=True)
    print("Marker Phonetizer success! len words:", len(out2.words))
    
except Exception as e:
    import traceback
    traceback.print_exc()
