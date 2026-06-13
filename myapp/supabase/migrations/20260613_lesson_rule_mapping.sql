-- ============================================================================
-- Tajweed.AI — Lesson ↔ tajweed-rule mapping
-- Run AFTER the lessons table exists, ONCE, in the Supabase SQL editor.
-- Idempotent. It:
--   1. Adds lessons.tajweed_rule (canonical rule id: madd, ghunna, …).
--   2. Indexes it for the rule → lesson lookup the recitation report uses.
--   3. Seeds one lesson per matchable tajweed rule (skips rules already mapped).
-- Rule ids match RULE_KB in backend/app/services/tajweed_kb.py and ERROR_TYPE_MAP
-- in myapp/src/utils/errorTypeMap.js. video_url is left blank — admins attach the
-- real learning video later via the admin page.
-- ============================================================================

begin;

-- ── 1. Column ──────────────────────────────────────────────────────────────
alter table public.lessons add column if not exists tajweed_rule text;

-- ── 2. Index (rule → lesson lookup) ────────────────────────────────────────
create index if not exists lessons_tajweed_rule_idx on public.lessons (tajweed_rule);

-- ── 3. Seed one lesson per matchable rule (insert-if-not-already-mapped) ────
insert into public.lessons (title, description, video_url, sequence_order, content_type, tajweed_rule)
select s.title, s.description, '', s.seq, 'video', s.rule
from (values
  ('مخارج الحروف',
   'تعلّم مخارج الحروف العربية الصحيحة من الحلق واللسان والشفتين وتمييز الحروف المتقاربة.', 1, 'phoneme'),
  ('صفات الحروف',
   'الصفات اللازمة والعارضة للحروف ومراعاتها أثناء التلاوة (التكرار، التفشي، وغيرها).', 2, 'sifat'),
  ('التفخيم والترقيق',
   'حروف التفخيم الدائم (خص ضغط قظ) وأحكام تفخيم وترقيق الراء واللام ولفظ الجلالة.', 3, 'tafkheem'),
  ('أحكام المد',
   'المد الطبيعي والمد الفرعي بأنواعه: المتصل والمنفصل والعارض واللازم ومقاديرها.', 4, 'madd'),
  ('الغنة وأحكام النون الساكنة والتنوين',
   'الإظهار والإدغام والإخفاء والإقلاب وعلاقتها بالغنة ومراتبها ومقدارها.', 5, 'ghunna'),
  ('القلقلة',
   'حروف القلقلة (قطب جد) ومراتبها: الصغرى والكبرى عند الوقف.', 6, 'qalqala'),
  ('الهمس والجهر',
   'صفة الهمس (جريان النفس) وصفة الجهر (انحباس النفس) عند نطق الحروف.', 7, 'hams_jahr'),
  ('الشدة والرخاوة',
   'صفة الشدة (انحباس الصوت) والرخاوة (جريانه) والبينية.', 8, 'shidda'),
  ('الصفير',
   'حروف الصفير (ص ز س) وكيفية إخراج صوتها الحاد من المخرج الصحيح.', 9, 'safeer'),
  ('الاستطالة',
   'صفة الاستطالة في حرف الضاد وتمييزه عن الظاء والدال.', 10, 'istitala'),
  ('الحركات والتشكيل',
   'الفتحة والضمة والكسرة والسكون والتنوين وأثرها على صحة النطق.', 11, 'vowel'),
  ('أساسيات النطق — تجنّب الحذف',
   'القراءة المتأنية ونطق كل حرف مكتوب لتجنّب إسقاط الحروف.', 12, 'deletion'),
  ('أساسيات النطق — تجنّب الزيادة',
   'الالتزام بالمكتوب وعدم زيادة حركة أو مدّ أو صوت غير موجود.', 13, 'insertion')
) as s(title, description, seq, rule)
where not exists (
  select 1 from public.lessons l where l.tajweed_rule = s.rule
);

commit;

-- ============================================================================
-- NOTES
--  • Re-running is safe: rules already mapped are skipped, the column/index use
--    IF NOT EXISTS.
--  • To point a rule at an existing lesson instead of the seeded one, set its
--    tajweed_rule in the admin page (or: update public.lessons set tajweed_rule
--    = 'madd' where id = '<lesson-id>';) and remove the seeded duplicate.
-- ============================================================================
