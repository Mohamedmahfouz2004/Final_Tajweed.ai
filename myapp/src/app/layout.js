import "./globals.css";
import { IBM_Plex_Sans_Arabic, Rakkas, Aref_Ruqaa } from "next/font/google";
import AppLayoutWrapper from "../components/AppLayoutWrapper";

// Brutalist Arabic theme for Clerk's sign-in / sign-up UI, matching the site.
const clerkAppearance = {
  layout: {
    showOptionalFields: true,
    socialButtonsVariant: "blockButton",
  },
  variables: {
    colorPrimary: "#1B5E3B",          // emerald-700
    colorBackground: "#FDFAF3",       // parchment-50
    colorText: "#1C1208",             // ink-900
    colorTextSecondary: "#3D2F1C",    // ink-700
    colorInputBackground: "#FDFAF3",
    colorInputText: "#1C1208",
    colorDanger: "#C53030",
    borderRadius: "0px",
    fontFamily: "var(--font-ibm), 'IBM Plex Sans Arabic', sans-serif",
  },
  elements: {
    // Card — sharp edges + brass drop shadow (brutalist).
    cardBox: {
      border: "2px solid #1C1208",
      borderRadius: 0,
      boxShadow: "8px 8px 0 0 #B8963E",
    },
    card: { backgroundColor: "#FDFAF3", borderRadius: 0 },
    headerTitle: {
      fontFamily: "var(--font-rakkas), 'Rakkas', cursive",
      fontSize: "1.9rem",
      color: "#1C1208",
    },
    headerSubtitle: { color: "#3D2F1C" },
    socialButtonsBlockButton: {
      border: "2px solid #1C1208",
      borderRadius: 0,
      boxShadow: "2px 2px 0 0 #1C1208",
    },
    dividerLine: { backgroundColor: "#E8DCB8" },
    formFieldLabel: { color: "#1C1208", fontWeight: 700 },
    formFieldInput: {
      border: "2px solid #1C1208",
      borderRadius: 0,
      backgroundColor: "#FDFAF3",
    },
    formButtonPrimary: {
      backgroundColor: "#1C1208",
      color: "#FDFAF3",
      border: "2px solid #1C1208",
      borderRadius: 0,
      boxShadow: "3px 3px 0 0 #B8963E",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 700,
    },
    footerActionLink: { color: "#8B6D2E", fontWeight: 700 },
    // Hide Clerk branding ("Secured by Clerk"), dev-mode badge, and logo box.
    logoBox: { display: "none" },
    footer: { display: "none" },
  },
};

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ibm",
  display: "swap",
  preload: true,
});

const rakkas = Rakkas({
  subsets: ["arabic", "latin"],
  weight: ["400"],
  variable: "--font-rakkas",
  display: "swap",
  preload: true,
});

// Quranic display face for the Listen page mushaf. Regular (non-"Ink") Aref Ruqaa
// is a monochrome font, so it respects the CSS `color` — the "Ink" variant is a
// color font with baked-in shading that ignores `color`.
const arefRuqaa = Aref_Ruqaa({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-aref-ruqaa",
  display: "swap",
  preload: true,
});

import { Reem_Kufi, Inter } from "next/font/google";

const reemKufi = Reem_Kufi({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-reem-kufi",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "تجويد.ai | معلم التجويد التفاعلي",
  description: "منصة تعليم تجويد القرآن الكريم التفاعلية باستخدام الذكاء الاصطناعي",
  keywords: ["تجويد", "قرآن", "تلاوة", "ذكاء اصطناعي", "tajweed", "quran", "AI"],
  openGraph: {
    title: "تجويد.ai",
    description: "ارتقِ بتلاوتك مع مساعد الذكاء الاصطناعي",
    locale: "ar_SA",
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo192.png",
  },
  // iOS: allow installing to home screen and launching fullscreen (standalone).
  appleWebApp: {
    capable: true,
    title: "تجويد.ai",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A3527",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${ibmPlexArabic.variable} ${rakkas.variable} ${arefRuqaa.variable} ${reemKufi.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo192.png" />
      </head>
      <body suppressHydrationWarning>
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
