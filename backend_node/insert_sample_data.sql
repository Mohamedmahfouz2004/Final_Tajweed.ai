-- مثال لإضافة درس جديد
INSERT INTO lessons (title, description, video_url, sequence_order)
VALUES ('مقدمة في أحكام التجويد', 'درس تمهيدي عن أهمية التجويد ومبادئه الأساسية', 'https://example.com/videos/intro-tajweed.mp4', 1);

-- مثال لإضافة سؤال لاختبار الدرس (بعد الحصول على معرف الدرس)
-- ملاحظة: يجب استبدال المعرف بالمعرف الحقيقي من قاعدة البيانات
INSERT INTO quizzes (lesson_id, question, options, correct_answer, points)
VALUES (
    (SELECT id FROM lessons WHERE sequence_order = 1 LIMIT 1),
    'ما هو تعريف التجويد لغة؟',
    '["التحسين", "القراءة", "الترتيل", "الحفظ"]',
    'التحسين',
    10
);

-- إضافة أنواع الأخطاء الشائعة
INSERT INTO error_types (name, description)
VALUES 
('خطأ في المد', 'زيادة أو نقصان في زمن حرف المد'),
('خطأ في الغنة', 'عدم إعطاء الغنة حقها من مخرج الخيشوم'),
('إدغام غير صحيح', 'خطأ في دمج الحروف عند التقائها');
