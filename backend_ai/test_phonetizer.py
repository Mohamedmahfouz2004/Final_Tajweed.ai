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
    text = Aya(6, 1).get_by_imlaey_words(0, 14).uthmani
    print("Length of Uthmani:", len(text))
    out = quran_phonetizer(text, moshaf, remove_spaces=True)
    print("Phonetizer success!")
except Exception as e:
    print("EXCEPTION:", repr(e))
