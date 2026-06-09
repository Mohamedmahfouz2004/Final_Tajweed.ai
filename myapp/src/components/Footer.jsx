'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const links = [
  { label: 'سياسة الخصوصية', href: '#' },
  { label: 'شروط الاستخدام', href: '#' },
  { label: 'اتصل بنا', href: '#' },
];

const Footer = () => (
  <motion.footer
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    className="ui-footer"
  >
    {/* warm illuminated band */}
    <div className="ui-footer-card">
      <span className="ui-footer-accent" aria-hidden />

      <div className="ui-footer-inner">
        <motion.div
          whileHover={{ letterSpacing: '0.30em' }}
          transition={{ duration: 0.3 }}
          className="ui-footer-brand"
        >
          <span className="ui-footer-diamond">◆</span>
          تجويد<span className="ui-footer-dot">.ai</span>
          <span className="ui-footer-diamond">◆</span>
        </motion.div>

        <p className="ui-footer-tagline">
          © <span className="font-num">2026</span> — رفيقك في رحلة إتقان القرآن الكريم
        </p>

        <div className="ui-footer-links">
          {links.map((l) => (
            <motion.span key={l.label} whileHover={{ y: -2 }}>
              <Link href={l.href} className="ui-footer-link">{l.label}</Link>
            </motion.span>
          ))}
        </div>

        <div className="ui-footer-build">
          BUILD <span className="font-num">2026</span> {'// AI-POWERED TAJWEED CORRECTION ENGINE'}
        </div>
      </div>
    </div>

    <style jsx>{`
      .ui-footer {
        width: 100%;
        margin-top: 56px;
        padding-bottom: 8px;
      }
      .ui-footer-card {
        position: relative;
        background: #FFFDF8;
        border: 1px solid #DDCDA6;
        border-radius: 20px;
        padding: 38px 28px 30px;
        overflow: hidden;
        box-shadow:
          0 1px 2px rgba(15, 26, 13, 0.05),
          0 18px 40px -22px rgba(15, 26, 13, 0.28);
      }
      /* soft gold hairline along the top, fading at the edges */
      .ui-footer-accent {
        position: absolute;
        top: 0;
        left: 12%;
        right: 12%;
        height: 2px;
        background: linear-gradient(90deg, transparent, rgba(184, 150, 62, 0.7), transparent);
      }
      .ui-footer-inner { text-align: center; }

      .ui-footer-brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        font-family: var(--font-rakkas), 'Rakkas', cursive;
        font-size: 1.7rem;
        color: var(--ink-900);
        line-height: 1;
        margin-bottom: 14px;
      }
      .ui-footer-dot { color: #D4AF37; }
      .ui-footer-diamond {
        font-size: 0.7rem;
        color: rgba(184, 150, 62, 0.7);
      }

      .ui-footer-tagline {
        font-family: var(--font-ibm), 'IBM Plex Sans Arabic', sans-serif;
        font-size: 0.88rem;
        color: var(--ink-700);
        margin-bottom: 20px;
      }

      .ui-footer-links {
        display: flex;
        justify-content: center;
        gap: 24px;
        flex-wrap: wrap;
        margin-bottom: 22px;
      }
      .ui-footer-link {
        font-family: var(--font-ibm), 'IBM Plex Sans Arabic', sans-serif;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--ink-500);
        text-decoration: none;
        transition: color 0.2s ease;
      }
      .ui-footer-link:hover { color: #8B6D2E; }

      .ui-footer-build {
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.6rem;
        letter-spacing: 0.2em;
        color: var(--ink-500);
        text-transform: uppercase;
        opacity: 0.5;
      }
    `}</style>
  </motion.footer>
);

export default Footer;
