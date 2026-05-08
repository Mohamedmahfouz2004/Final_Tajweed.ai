import os
import json
import urllib.request
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

class QuranAPI:
    @staticmethod
    def get_surah_verses(surah_id: int) -> List[Dict[str, Any]]:
        """
        Fetches all verses of a surah from api.quran.com with word-by-word data.
        Caches the result locally to avoid repeated API calls.
        """
        cache_file = os.path.join(CACHE_DIR, f'surah_{surah_id}.json')
        
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading cache for surah {surah_id}: {e}")

        # Fetch from API with 15s timeout and User-Agent
        url = f"https://api.quran.com/api/v4/verses/by_chapter/{surah_id}?words=true&word_fields=text_uthmani"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        logger.info(f"Fetching surah {surah_id} from api.quran.com...")
        
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as response:
                data = json.loads(response.read().decode())
                verses = data.get('verses', [])
                
                # Save to cache
                with open(cache_file, 'w', encoding='utf-8') as f:
                    json.dump(verses, f, ensure_ascii=False)
                
                return verses
        except Exception as e:
            logger.error(f"Failed to fetch surah {surah_id} from API: {e}")
            return []

    @staticmethod
    def transform_to_verse_entries(verses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transforms API verse objects into the format expected by QuranDataBuilder.
        """
        records = []
        for verse in verses:
            # We want to mimic the structure that QuranDataBuilder.build_indices expects
            # or we can modify build_indices to handle both.
            # Most important: sura_no, aya_no, words[], aya_text_emlaey (for normalization)
            
            sura_no = int(verse['verse_key'].split(':')[0])
            aya_no = int(verse['verse_key'].split(':')[1])
            
            # Handle both API (dict with 'words') and local fallback mappings
            v_words = verse.get('words', [])
            clean_text = " ".join([w['text'] for w in v_words if w.get('char_type_name') == 'word'])
            uthmani_text = " ".join([w.get('text_uthmani', w.get('text', '')) for w in v_words if w.get('char_type_name') == 'word'])
            
            # If no words list (fallback mode), use the raw verse text
            if not v_words:
                clean_text = verse.get('aya_text_emlaey', verse.get('text', ''))
                uthmani_text = verse.get('text_uthmani', verse.get('text', ''))
            
            records.append({
                "id": verse['id'],
                "sura_no": sura_no,
                "aya_no": aya_no,
                "page": verse.get('page_number', 0),
                "aya_text_emlaey": clean_text,
                "text_uthmani": uthmani_text,
                "api_words": verse['words'] # Pass raw words too
            })
        return records
