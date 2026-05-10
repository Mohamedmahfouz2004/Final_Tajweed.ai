/**
 * Voice utilities for Tajweed.AI
 * Handles Speech Recognition and high-quality Arabic Synthesis
 */

// 1. Text to Speech (TTS)
const ELEVENLABS_API_KEY = 'sk_32e59c90d9b86944a0b66e74db1fdc8fa9ee7930544e17c4';
const VOICE_ID = '15tA2ZAIKsMz5AmwMxx4'; // User's new custom designed voice

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
      console.error("ElevenLabs API Error:", response.status, errData);
      throw new Error(`ElevenLabs Error ${response.status}: ${JSON.stringify(errData)}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  } catch (e) {
    console.error("speakArabic Failure:", e);
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
      console.error("Recognition Error:", e.error);
      if (onError) onError(e.error);
    };

    recognition.onend = () => {
      setTimeout(() => {
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
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ''); // Remove spaces for ultra-flexible matching

  for (const [route, keywords] of Object.entries(commandsMap)) {
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, '');
        
      if (normalizedTranscript.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedTranscript)) {
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
