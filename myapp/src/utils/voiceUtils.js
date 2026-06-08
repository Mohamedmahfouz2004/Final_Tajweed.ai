/**
 * Voice utilities for Tajweed.AI
 * Handles Speech Recognition and high-quality Arabic Synthesis
 */

// 1. Text to Speech (TTS)
const ELEVENLABS_API_KEY = 'sk_7360213f996215ad52f14f0e35e348dc0b4acd3c50d0f5c8';
const VOICE_ID = 've9185oRsQi5NuTQ7DK2'; // User's new custom designed voice

const speakArabicBrowserFallback = (text) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar';
  
  // Optional: try to find an Arabic voice
  const voices = window.speechSynthesis.getVoices();
  const arVoice = voices.find(v => v.lang.toLowerCase().startsWith('ar'));
  if (arVoice) {
    utterance.voice = arVoice;
  }
  
  window.speechSynthesis.speak(utterance);
};

export const speakArabic = async (text) => {
  try {
    if (!text) return;
    
    // Immediately stop any browser speech to prevent overlap
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn("ElevenLabs API Error, falling back to browser speech:", response.status, errData);
      speakArabicBrowserFallback(text);
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  } catch (e) {
    console.warn("speakArabic ElevenLabs failure, falling back to browser speech:", e);
    speakArabicBrowserFallback(text);
  }
};

// 2. Speech Recognition (Commands)
export const startVoiceCommands = (onCommand, onError) => {
  try {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    
    // Support multiple Arabic dialects for better recognition
    recognition.lang = 'ar'; 
    
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      const normalized = transcript.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
      onCommand(normalized);
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') {
        console.debug("Recognition: No speech detected.");
        return;
      }
      // Permission/hardware errors — expected in certain environments, not actionable
      if (e.error === 'not-allowed' || e.error === 'audio-capture' || e.error === 'service-not-allowed') {
        return;
      }
      console.warn("Recognition Error:", e.error);
      if (onError) onError(e.error);
    };


    recognition.onend = () => {
      recognition._restartTimeout = setTimeout(() => {
        try { recognition.start(); } catch (e) {}
      }, 1000);
    };

    recognition.start();
    return recognition;
  } catch (e) {
    if (onError) onError(e.message);
    return null;
  }
};

export const commandsMap = {
  '/': ['رئيسيه', 'بداية', 'الصفحة الرئيسيه', 'هوم', 'رئيسية', 'الرئيسيه', 'الرئيسية', 'بيت', 'بدايه', 'اول صفحه', 'الاولى', 'رجوع', 'خلف', 'تجويد', 'عوده', 'رجعني', 'الاول'],
  '/practice': ['تلاوه', 'ممارسه', 'تسميع', 'صفحة التلاوه', 'تلاوة', 'التلاوه', 'التلاوة', 'المصحف المعلم', 'قراءه', 'قراءة', 'تدريب', 'اقرا', 'صحح تلاوتك', 'تلاوتك'],
  '/live-moshaf': ['مصحف', 'لايف', 'مصحف مباشر', 'المصحف', 'مباشر'],
  '/lessons': ['دروس', 'تعليم', 'تعلم', 'صفحة الدروس', 'الدروس', 'حصص', 'درسي'],
  '/progress': ['تقدم', 'مستوى', 'احصائيات', 'مستواي', 'التقدم', 'مستوايا', 'انجازاتي', 'احصائياتي', 'المستوى', 'تقييم', 'التقييم', 'درجاتي', 'نتائجي', 'نتيجة', 'تقريري', 'التقرير', 'بروجرس', 'عملت ايه', 'قولي مستوايا', 'أخطائي'],
  '/tafseer': ['تفسير', 'معاني', 'صفحة التفسير', 'التفسير', 'اخر صفحه', 'الاخيرة', 'اخر واحدة']
};

export const getRouteFromCommand = (transcript) => {
  if (!transcript) return null;
  
  const normalizedTranscript = transcript.trim().toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه'); // Removed space stripping to avoid merging words

  for (const [route, keywords] of Object.entries(commandsMap)) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه');
        
      // Only match if the user's speech contains the full keyword
      if (normalizedTranscript.includes(normalizedKeyword)) {
        return route;
      }
    }
  }
  return null;
};

export const getPageNameAr = (route) => {
  const names = {
    '/': 'الصفحة الرئيسية',
    '/practice': 'صفحة التلاوة',
    '/live-moshaf': 'المصحف المباشر',
    '/lessons': 'صفحة الدروس',
    '/progress': 'صفحة التقدم',
    '/tafseer': 'صفحة التفسير'
  };
  return names[route] || 'الصفحة';
};
