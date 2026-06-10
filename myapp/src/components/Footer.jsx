'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, LifeBuoy, Phone } from 'lucide-react';

const FacebookIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const InstagramIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const TikTokIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
  </svg>
);

const WhatsAppIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    <path d="M16.5 16c0 1-1 2-2 2-5.5 0-9-3.5-9-9 0-1 1-2 2-2s1 2 1 2l-.5 1c0 0 2.5 3 5.5 4l1-.5s1 .5 2 1.5z"></path>
  </svg>
);

const Footer = () => (
  <motion.footer
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    className="ui-footer"
  >
    {/* The accent line at the very top of the footer */}
    <span className="ui-footer-accent" aria-hidden />

    {/* Full width background wrapper */}
    <div className="ui-footer-container">
      <div className="ui-footer-grid">
        {/* Brand Column */}
        <div className="ui-footer-col brand-col">
          <Link
            href="/"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
          >
            <img src="/logo.svg" alt="تجويد.ai" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <strong style={{ display: 'flex', alignItems: 'baseline', gap: '0px', flexDirection: 'row' }} aria-label="تجويد ai" dir="rtl">
              <span style={{ fontFamily: 'var(--font-reem-kufi), sans-serif', fontWeight: 'bold', fontSize: '24px', color: '#FBF7EF' }}>تجويد</span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontWeight: 'bold', fontSize: '22px', color: '#B8923E', position: 'relative', top: '1px' }}>.</span>
              <span dir="ltr" style={{ fontFamily: "'Share Tech Mono', monospace", fontWeight: 'bold', fontSize: '22px', color: '#B8923E', position: 'relative', top: '1px', marginRight: '2px' }}>ai</span>
            </strong>
          </Link>
          <p className="ui-footer-desc">
            منصة تعليمية ذكية لتحليل تلاوتك بدقة وتدريبك على إتقان أحكام التجويد خطوة بخطوة باستخدام الذكاء الاصطناعي.
          </p>
        </div>

        {/* Navigation Column */}
        <div className="ui-footer-col">
          <h4 className="ui-footer-head">الروابط السريعة</h4>
          <div className="ui-footer-links">
            <Link href="/" className="ui-footer-link">الرئيسية</Link>
            <Link href="/listen" className="ui-footer-link">استماع</Link>
            <Link href="/practice" className="ui-footer-link">التسميع التفاعلي</Link>
            <Link href="/lessons" className="ui-footer-link">الدروس</Link>
            <Link href="/tafseer" className="ui-footer-link">التفسير</Link>
          </div>
        </div>

        {/* Legal Column */}
        <div className="ui-footer-col">
          <h4 className="ui-footer-head">قانوني</h4>
          <div className="ui-footer-links">
            <Link href="#" className="ui-footer-link">سياسة الخصوصية</Link>
            <Link href="#" className="ui-footer-link">شروط الاستخدام</Link>
            <Link href="#" className="ui-footer-link">إخلاء المسؤولية</Link>
          </div>
        </div>

        {/* Contact Column */}
        <div className="ui-footer-col">
          <h4 className="ui-footer-head">تواصل معنا</h4>
          <div className="ui-footer-links">
            <Link href="mailto:tajweed.ai0@gmail.com" className="ui-footer-link" dir="ltr" style={{ justifyContent: 'flex-end' }}>
              <span style={{ marginRight: '8px' }}>tajweed.ai0@gmail.com</span>
              <Mail size={16} />
            </Link>
            <Link href="https://wa.me/201055664001" className="ui-footer-link" dir="ltr" style={{ justifyContent: 'flex-end' }}>
              <span style={{ marginRight: '8px' }}>+201055664001</span>
              <WhatsAppIcon size={16} />
            </Link>
            <Link href="#" className="ui-footer-link" style={{ gap: '8px' }}>
              <FacebookIcon size={16} />
              <span>فيسبوك</span>
            </Link>
            <Link href="#" className="ui-footer-link" style={{ gap: '8px' }}>
              <InstagramIcon size={16} />
              <span>إنستاجرام</span>
            </Link>
            <Link href="#" className="ui-footer-link" style={{ gap: '8px' }}>
              <TikTokIcon size={16} />
              <span>تيك توك</span>
            </Link>
            <Link href="#" className="ui-footer-link" style={{ gap: '8px' }}>
              <LifeBuoy size={16} />
              <span>الدعم الفني</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="ui-footer-divider" />

      <div className="ui-footer-bottom">
        <p className="ui-footer-copyright">
          © <span className="font-num">2026</span> تجويد.ai — رفيقك في رحلة إتقان القرآن الكريم
        </p>
        <div className="ui-footer-build">
          BUILD <span className="font-num">2026</span> {'// AI-POWERED TAJWEED CORRECTION ENGINE'}
        </div>
      </div>
    </div>

    <style jsx global>{`
      .ui-footer {
        width: 100%;
        background: rgba(15, 26, 13, 0.75); /* Dark green/black translucent */
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-top: 1px solid rgba(212, 175, 55, 0.4);
        padding: 32px 0 24px; /* Reduced padding */
        position: relative;
        overflow: hidden;
      }
      .ui-footer-container {
        width: 100%;
        max-width: 1040px; /* Match main-content max-width */
        margin: 0 auto;
        padding: 0 36px;
        position: relative;
        z-index: 2;
      }
      .ui-footer-accent {
        position: absolute;
        top: 0;
        left: 12%;
        right: 12%;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.8), transparent);
      }
      
      .ui-footer-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: 40px;
        margin-bottom: 32px; /* Reduced margin */
      }
      
      .brand-col {
        padding-inline-end: 20px;
      }
      
      .ui-footer-desc {
        font-family: var(--font-ibm), 'IBM Plex Sans Arabic', sans-serif;
        font-size: 0.95rem;
        color: rgba(240, 234, 214, 0.7); /* Muted parchment */
        line-height: 1.8;
      }
      
      .ui-footer-head {
        font-family: var(--font-ibm), 'IBM Plex Sans Arabic', sans-serif;
        font-size: 1.05rem;
        font-weight: 700;
        color: #FBF7EF;
        margin-bottom: 24px;
        position: relative;
        padding-bottom: 12px;
      }
      
      .ui-footer-head::after {
        content: '';
        position: absolute;
        bottom: 0;
        right: 0; /* RTL alignment */
        width: 40px;
        height: 2px;
        background: #D4AF37; /* Gold accent */
        border-radius: 2px;
      }
      
      .ui-footer-links {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .ui-footer-link {
        font-family: var(--font-ibm), 'IBM Plex Sans Arabic', sans-serif;
        font-size: 0.95rem;
        font-weight: 500;
        color: rgba(240, 234, 214, 0.8);
        text-decoration: none;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        width: fit-content;
      }
      
      .ui-footer-link:hover {
        color: #D4AF37;
        transform: translateX(-4px); /* Moves left in RTL */
      }
      
      .ui-footer-divider {
        height: 1px;
        background: rgba(212, 175, 55, 0.15);
        margin-bottom: 24px;
      }
      
      .ui-footer-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      }
      
      .ui-footer-copyright {
        font-family: var(--font-ibm), 'IBM Plex Sans Arabic', sans-serif;
        font-size: 0.85rem;
        color: rgba(240, 234, 214, 0.6);
      }
      
      .ui-footer-build {
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.65rem;
        letter-spacing: 0.2em;
        color: rgba(240, 234, 214, 0.4);
        text-transform: uppercase;
      }

      @media (max-width: 900px) {
        .ui-footer-grid {
          grid-template-columns: 1fr 1fr;
          gap: 40px 20px;
        }
        .brand-col {
          grid-column: span 2;
          padding-inline-end: 0;
          margin-bottom: 10px;
        }
      }
      
      @media (max-width: 600px) {
        .ui-footer-grid {
          grid-template-columns: 1fr;
          gap: 32px;
        }
        .ui-footer-container {
          padding: 0 24px;
        }
        .ui-footer-bottom {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
      }
    `}</style>
  </motion.footer>
);

export default Footer;
