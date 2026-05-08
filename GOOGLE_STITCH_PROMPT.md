# 🎨 Google Stitch Design Prompt — Tajweed.ai (تجويد.ai)

> Copy everything below this line and paste it into Google Stitch.

---

## Project Overview

Design a **premium, modern Arabic-first web application** called **"تجويد.ai" (Tajweed.ai)**. This is an AI-powered Quran recitation trainer that helps Muslims perfect their Tajweed (القرآن الكريم recitation rules) using real-time voice analysis. The application has an elegant Islamic-inspired aesthetic with a professional, luxury feel — think of it as the "Duolingo of Quran recitation" but with a much more refined, premium design.

**Key Design Principles:**
- **Right-to-Left (RTL)** layout throughout — Arabic is the primary language
- **Islamic luxury aesthetic**: Deep emerald greens, warm golds, cream backgrounds
- **Glassmorphism** effects on cards and panels (frosted glass, subtle blur)
- **Smooth micro-animations** on every interactive element (hover lifts, scale presses, page transitions)
- **Desktop-first** with responsive tablet/mobile support
- **Left sidebar navigation** (fixed, always visible)
- **Clean white space** — never cluttered, always breathable

---

## 🎨 Color Palette (EXACT VALUES)

| Role | Color | Hex |
|---|---|---|
| **Primary (Deep Green)** | الأخضر الغامق | `#044D29` |
| **Primary Light** | أخضر فاتح | `#1B5E3B` |
| **Primary Accent** | أخضر متوسط | `#2D8A56` |
| **Secondary (Gold)** | الذهبي | `#D4AF37` |
| **Gold Dark** | ذهبي غامق | `#8B6D2E` |
| **Gold Light** | ذهبي فاتح | `#B8923E` |
| **Background** | كريمي | `#FDFCF5` |
| **Card Background** | بيج فاتح | `#FFF9F0` |
| **Text Primary** | بني غامق | `#2C1810` |
| **Text Secondary** | بني رمادي | `#6B5D4F` |
| **Text Muted** | رمادي | `#9C8E7C` |
| **Success (Correct)** | أخضر | `#22C55E` |
| **Error** | أحمر | `#DC2626` |
| **Future/Unread** | رمادي فاتح | `#94A3B8` |

---

## 🔤 Typography

| Usage | Font | Weight | Size |
|---|---|---|---|
| **Quran Text (Uthmani)** | Amiri | Bold | 28-36px |
| **Arabic Headings** | Amiri | Bold | 24-48px |
| **Arabic Body** | System Arabic | Regular | 14-16px |
| **English Labels** | Inter or Roboto | Bold | 10-14px |
| **Numbers/Stats** | Inter | Black (900) | 36-64px |

---

## 📐 Layout Structure

The app uses a **sidebar + content area** layout:
- **Left Sidebar**: Fixed, 240px wide, dark green (`#044D29`) background
  - Brand logo at top: "تجويد.ai" with a golden BookOpen icon inside a decorative diamond shape
  - Navigation links stacked vertically with Lucide icons
  - User avatar/logout button at bottom
- **Main Content Area**: Takes remaining width, cream background (`#FDFCF5`), padded generously (32-48px)
- **No top navbar** — the sidebar IS the navigation

---

## 📄 Pages to Design (9 total)

### PAGE 1: Splash Screen (شاشة البداية)
**Full-screen overlay** shown for 2.5 seconds on app load.
- **Background**: Deep green gradient (`#033520` → `#044D29` → `#065F46`)
- **Center**: Large golden circle (120px) with a BookOpen icon inside, surrounded by a spinning Lottie animation ring
- **Behind the circle**: A rotated diamond border (golden, semi-transparent)
- **Below the circle**: 
  - Title: "تجويد" in massive Amiri font (72px), cream white
  - Subtitle: "Tajweed.ai" in small caps, golden, letter-spaced
  - Tagline: "ارتقِ بتلاوتك" (Elevate your recitation) in white/75% opacity
- **Bottom**: A thin golden loading bar that fills from 0% to 100%
- **Background texture**: Very subtle radial dot pattern in gold at 5% opacity

---

### PAGE 2: Home / Dashboard (الرئيسية)
**Route: `/`**

**Hero Section (top)**:
- A large card with deep green gradient background
- Decorative "قرآن" text floating semi-transparent in the background
- Main heading: "ابدأ رحلة إتقان التلاوة" (Start your journey to perfect recitation) — large, white, animated entrance
- Subtitle: "منظومة ذكية تساعدك على تصحيح تلاوتك باستخدام الذكاء الاصطناعي"
- CTA button: "ابدأ التلاوة الآن" — golden background, dark text, rounded-full, with hover glow effect

**Quran Verse Display (middle)**:
- Centered large Arabic text: ﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾
- Golden ornamental brackets (﴿ ﴾), Amiri font, subtle text shadow
- This serves as decorative inspiration

**Stats Grid (bottom)**:
Two cards side by side:
1. **تحليل الأخطاء (Error Analysis)**: Red AlertTriangle icon, shows error count, clickable to open modal
2. **متوسط دقة التلاوة (Average Accuracy)**: Green TrendingUp icon, shows percentage

Both cards: White background, subtle border, hover lifts up 8px with golden border glow

---

### PAGE 3: Practice Selection (صحح تلاوتك)
**Route: `/practice`**

**Initial State — Mode Selection:**
Two large cards centered on screen:
1. **استمع للتلاوة (Listen)**: Golden gradient icon (Play), description text, "ابدأ الاستماع" link with arrow
2. **سجّل تلاوتك (Record)**: Green gradient icon (Mic), description text, "ابدأ التسجيل" link with arrow

Both cards: Cream background (`#FFF9F0`), subtle border, hover lifts with icon rotation animation

**After selecting "Record" — Surah Selection Form:**
- Tab switcher at top: **استمع | سجّل | الإعدادات | رجوع** — pill-shaped tabs, active tab has gradient background
- **Microphone Icon**: Large centered green circle
- **Title**: "سجّل تلاوتك" with subtitle
- **Form Card** (cream background):
  - **السورة (Surah)**: Dropdown selector with searchable list — shows all 114 surahs
  - **من الآية / إلى الآية (From/To Verse)**: Two number inputs side by side
- **Start Button**: Full-width, green gradient, "ابدأ التلاوة المباشرة" with Mic icon, disabled state when no surah selected

---

### PAGE 4: Live Moshaf — Real-Time Recitation (المصحف المباشر) ⭐ HERO PAGE
**Route: `/live-moshaf`**

This is the **most important page** — the core experience.

**Top Bar**:
- Surah name display
- Recording controls: Start/Stop button (red pulsing when active)
- Live metrics: Buffer duration, inference time, chunk count

**Main Content — Uthmani Quran Text**:
- Large Arabic text rendered in **Amiri font, 32px**, centered, RTL
- **Per-character coloring** based on AI analysis:
  - **Grey (`#94A3B8`)**: Not recited yet (future text)
  - **Green (`#22C55E`)**: Correctly recited
  - **Red (`#DC2626`)**: Error detected (with underline decoration based on error type)
- Ayah number markers: Golden ornamental brackets ﴿١﴾
- The text transitions smoothly from grey to green/red as the user recites

**Bottom Stats Bar**:
- Accuracy percentage with progress bar (green fill for correct, red for errors)
- Legend: ● Correct ● Error ● Not recited

**Side Debug Panel** (toggleable):
- Shows live phonemes being detected
- Analysis matrix with character-by-character breakdown
- Performance metrics (inference latency, GPU usage)

---

### PAGE 5: Lessons Library (الدروس)
**Route: `/lessons`**

**Header**: "مكتبة الدروس التفاعلية" with subtitle
**Login prompt banner** (for non-logged-in users): Teal background, BookOpen icon, "سجل دخولك" CTA

**Lesson Cards Grid** (auto-fill, min 300px):
Each card shows:
- Lesson title (e.g., "أحكام النون الساكنة", "القلقلة", "المدود", "التفخيم والترقيق", "أحكام الميم الساكنة")
- Description text
- Duration (e.g., "15 دقيقة")
- Colored icon (different color per lesson)
- Completion badge (checkmark) if completed
- Glass card style with hover animation

---

### PAGE 6: Lesson Detail (تفاصيل الدرس)
**Route: `/lessons/:lessonId`**

**Back Button**: Rounded, bordered, with arrow icon and "العودة للدروس"

**Video Player Section**:
- Full-width card with embedded YouTube iframe or video player
- Title and description below the video

**Two Action Cards** side by side:
1. **القسم النظري (Theoretical)**: Blue accent stripe at top, BookOpen icon, "ابدأ الاختبار النظري" button — navigates to quiz
2. **القسم العملي (Practical)**: Green accent stripe, Mic icon, "قريباً" (Coming Soon) with Lock icon — disabled state

---

### PAGE 7: Quiz (الاختبار)
**Route: `/lessons/:lessonId/quiz`**

**Glass panel card** with:
- Progress bar at top (gradient green-to-gold fill, animated)
- Question counter: "سؤال 1 من 5"
- Lesson title badge

**Question Display**:
- Arabic text in Amiri font
- Answer options as clickable cards:
  - Default: White, grey border
  - Hover: Golden border, amber background
  - Correct answer (after check): Green background, green border
  - Wrong answer: Red background, red border
- "السؤال التالي" button appears after answering — animated entrance

**Results Screen (after all questions)**:
- Large animated circle (spring animation): Green checkmark (≥70%) or Red X (<70%)
- Percentage in massive bold text
- Success/failure message in Amiri font
- Action buttons: "إعادة المحاولة" (amber) or "العودة للدرس" (white bordered)

---

### PAGE 8: Progress & Statistics (التقدم)
**Route: `/progress`**

**Header**: "لوحة الإحصائيات المتقدمة"

**Stats Row** (2 cards):
1. **الدقة الأسبوعية** (Weekly Accuracy): CheckCircle icon, big percentage number
2. **آيات تم ممارستها** (Verses Practiced): TrendingUp icon, big count number

**Charts Grid** (2 columns):
1. **الأداء الأسبوعي (Weekly Performance)**: Bar chart with green bars, grid lines
2. **الأخطاء الشائعة (Common Mistakes)**: Line chart with golden line, dots at data points

Charts use glass panel styling with blur background

---

### PAGE 9: Tafseer — Interpreted Quran (القرآن مفسّر)
**Route: `/tafseer`**

**Toolbar** (frosted glass, backdrop blur):
- Surah selector dropdown (searchable)
- Verse range inputs (من / إلى)
- Title: "القرآن الكريم مفسّر" with BookMarked icon

**Surah Title Banner**: Centered, with decorative golden gradient lines on either side

**Quran Text Container**:
- Large frosted glass card with decorative blurred circles in background (gold and green)
- Bismillah shown at top (golden text, Amiri font)
- Verses in large Amiri font (28-32px), emerald green text
- Ayah numbers in golden ornamental brackets
- **Hover effect**: Each verse gets a subtle green highlight on hover
- **Click to expand Tafsir**: Shows a gradient panel below the verse with:
  - "التفسير الميسّر" label with BookMarked icon
  - Tafsir text in readable size
  - Close button (X in grey circle)
- **Hover tooltip**: Quick preview tooltip showing first 200 chars of tafsir

---

## 🔲 Modals & Overlays

### Auth Modal (تسجيل الدخول)
- Backdrop blur overlay
- Centered card with tabs: **تسجيل الدخول | إنشاء حساب**
- Form fields: Email, Password, Name (for signup)
- Role selector: **مستخدم | مشرف** (User/Admin toggle)
- Green gradient submit button
- Framer Motion entrance animation (slide up + fade)

### Mistakes Analysis Modal
- Shows error breakdown by type
- Suggests relevant lessons for each mistake category
- "اذهب للدرس" navigation buttons

---

## ✨ Animation Requirements
- **Page transitions**: Fade + slide up (200ms)
- **Card hovers**: translateY(-8px) + golden border + enhanced shadow
- **Button presses**: scale(0.97) on tap
- **Button hovers**: scale(1.05) + glow shadow
- **Splash screen**: Spring physics for icon entrance, sequential text fade-in
- **Tab switches**: AnimatePresence with fade + slide
- **Chart animations**: Bars/lines should animate in on mount
- **Loading states**: Lottie animation spinner

---

## 🏗️ Component Library Notes
- All cards use `border-radius: 16-24px`
- Glass panels: `background: rgba(255,255,255,0.4)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.6)`
- Buttons: `border-radius: 12-16px`, no hard borders, gradient backgrounds
- Shadows: Multi-layered, soft (`0 4px 20px rgba(44,24,16,0.06)`)
- Icons: Lucide React icon set throughout
- Font imports: Google Fonts — Amiri (Arabic display), Inter (English/numbers)

---

**Generate all 9 pages as high-fidelity web UI designs with the exact specifications above. The design should feel like a premium Islamic education platform — elegant, trustworthy, and modern.**
