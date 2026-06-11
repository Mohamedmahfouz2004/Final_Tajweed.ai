import { supabase } from './supabaseClient';

/**
 * دالة لحفظ نتيجة امتحان الدرس في جدول التقدم (progress)
 * دي بتعمل Upsert: يعني لو اليوزر بيمتحن لأول مرة هتسجل درجته،
 * ولو بيمتحن للمرة التانية هتحدث درجته القديمة بدل ما تعمل صف جديد (بفضل UNIQUE(user_id, lesson_id))
 */
export const saveQuizScore = async (lessonId, score) => {
    // 1. نتأكد إن اليوزر مسجل دخول أصلاً
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) {
        console.error("User not logged in");
        return { success: false, error: "يجب تسجيل الدخول لحفظ تقدمك" };
    }

    // 2. نرفع الدرجة للداتا بيز
    const { data, error } = await supabase
        .from('progress')
        .upsert({ 
            user_id: user.id, 
            lesson_id: lessonId, 
            score: score,
            is_completed: true,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id, lesson_id' // دي كلمة السر عشان منكررش البيانات
        });

    if (error) {
        console.error("Error saving progress:", error);
        return { success: false, error: error.message };
    }
    
    return { success: true, data };
};

/**
 * دالة عشان تجيب كل درجات اليوزر في كل الدروس اللي امتحنها
 * وكمان بتسحب معاها (اسم الدرس) من جدول الدروس المرتبط بيه
 */
export const getUserProgress = async () => {
    const { data, error } = await supabase
        .from('progress')
        .select(`
            *,
            lessons ( title, order_num )
        `);
        
    if (error) {
        console.error("Error fetching progress:", error);
        return [];
    }
    return data;
};
