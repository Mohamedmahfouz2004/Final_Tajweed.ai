/**
 * tajweedErrors.js - Simple mapping of technical tajweed errors to user-friendly Arabic messages
 */

// Mapping from error codes/attributes to simple Arabic explanations
export const TAJWEED_ERROR_MESSAGES = {
  // Error types (from backend error_type field)
  madd: "المد: استطعتم باللمد للحرف بشكل غير صحيح",
  ghunna: "الغنة: النطق بالغنة في المكان المطلوب أو النطق بدون غنة",
  qalqala: "القلقلة: توقف عن القلقلة أو قمت بالقلقلة حيث لا يشترط",
  vowel: "الحركة: حركت الحرف بشكل غير صحيح",
  phoneme: "الحرف: نطقت حرفاً مختلفاً",
  deletion: "نسيان: لم تنطق هذا الحرف أو الحركة",
  insertion: "زيادة: نطقت حرفاً أو حركة ليست في النص",
  sifat: "صفة الحرف: وقع خطأ في صفة أو خاصية الحرف",
  
  // Sifat attributes (from vocab.py SIFAT_ATTR_TO_ARABIC_WITHOUT_BRACKETS)
  ghonna: {
    maghnoon: "الغنة مفقودة: يجب أن تنطق بهذه الصفة",
    not_maghnoon: "الغنة موجودة: لا يجب أن تنطق بهذه الصفة هنا"
  },
  
  tafkheem_or_taqeeq: {
    mofakham: "التفخيم مفقود: يجب أن تفخم هذا الحرف",
    moraqaq: "الترقيق مفقود: يجب أن ترقق هذا الحرف",
    low_mofakham: "شدة الحرف منخفضة"
  },
  
  qalqla: {
    moqalqal: "القلقلة مفقودة",
    not_moqalqal: "القلقلة غير مطلوبة هنا"
  },
  
  hams_or_jahr: {
    hams: "الهمس مفقود",
    jahr: "الجهر مفقود"
  },
  
  tikraar: {
    mokarar: "التكرار مطلوب",
    not_mokarar: "التكرار غير مطلوب"
  },
  
  tafashie: {
    motafashie: "التفشي مفقود",
    not_motafashie: "التفشي غير مطلوب"
  },
  
  istitala: {
    mostateel: "الاستطالة مفقودة",
    not_mostateel: "الاستطالة غير مطلوبة"
  },
  
  // Default fallback
  default: "خطأ في النطق - راجع التلاوة"
}

/**
 * Get user-friendly error message from technical error description
 * @param {string} errorDesc - Error description from backend (e.g., "خطأ في [غنة]: المفروض ([مغن]) وأنت نطقتها ([لا غنة])")
 * @returns {string} User-friendly Arabic message
 */
export function getSimpleErrorMessage(errorDesc) {
  if (!errorDesc) return TAJWEED_ERROR_MESSAGES.default
  
  // Parse specific patterns
  if (errorDesc.includes("غنة") || errorDesc.includes("غن")) {
    if (errorDesc.includes("مفروض ([مغن])") || errorDesc.includes("المفروض ([مغن])")) {
      return "الغنة مفقودة: يجب أن تنطق الحرف بالغنة (نفس النون أو الميم قبله)"
    }
    if (errorDesc.includes("المفروض ([لا غنة])") || errorDesc.includes("مفروض ([لا غنة])")) {
      return "الغنة غير مطلوبة هنا: لا تنطق بالغنة لأن الحرف يليه لا يستدعي الغنة"
    }
  }
  
  if (errorDesc.includes("مد") && errorDesc.includes("حركات")) {
    return "المد: استمرار النطق للمد أو لم يتم المد بالمدة الكاملة"
  }
  
  if (errorDesc.includes("قلقلة") || errorDesc.includes("قلقل")) {
    return "القلقلة: النطق بالضرب أو التخفيف للحرف"
  }
  
  if (errorDesc.includes("تفخيم") || errorDesc.includes("مفخم")) {
    return "التفخيم: النطق بالصوت العميق"
  }
  
  if (errorDesc.includes("ترقيق") || errorDesc.includes("مرقق")) {
    return "الترقيق: النطق بالصوت الرقيق"
  }
  
  if (errorDesc.includes("همس")) {
    return "الهمس: النطق بهمنع الصوت"
  }
  
  if (errorDesc.includes("نسيت نطق") || errorDesc.includes("deletion")) {
    return "نسيان: لم تنطق هذا الحرف أو الحركة"
  }
  
  if (errorDesc.includes("زائدة") || errorDesc.includes("insertion")) {
    return "زيادة: نطقت حرفاً أو حركة ليست في النص"
  }
  
  // Return original if no specific match
  return errorDesc
}

/**
 * Get error category color for UI display
 * @param {string} errorType - Error type code
 * @returns {string} CSS color value
 */
export function getErrorColor(errorType) {
  const colors = {
    madd: "#F59E0B",      // Amber
    ghunna: "#EF4444",    // Red
    qalqala: "#8B5CF6",   // Violet
    vowel: "#10B981",     // Emerald
    phoneme: "#3B82F6",   // Blue
    deletion: "#6B7280",  // Gray
    insertion: "#EC4899", // Pink
    sifat: "#F97316"      // Orange
  }
  return colors[errorType] || "#DC2626"
}