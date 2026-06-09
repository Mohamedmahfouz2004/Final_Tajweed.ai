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
  return; // Disabled per user request
};

// 2. Speech Recognition (Commands)
export const startVoiceCommands = (onCommand, onError) => {
  return null; // Disabled per user request
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
