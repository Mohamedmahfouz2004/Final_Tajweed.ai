'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, UserPlus, ArrowLeft } from 'lucide-react';
import useAppStore from '../store/useAppStore';

/**
 * AuthGuard — wraps a page and shows a branded "login required" screen
 * if the user is not authenticated.
 *
 * Props:
 *   @param {React.ReactNode}  children   – the protected page content
 *   @param {string}           title      – Arabic heading, e.g. "إحصائياتك"
 *   @param {string}           subtitle   – why login is needed
 *   @param {React.ReactNode}  icon       – Lucide icon element for decoration
 */
const AuthGuard = ({ children, title, subtitle, icon }) => {
  const isLoggedIn = useAppStore(s => s.isLoggedIn);

  if (isLoggedIn) return children;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full flex items-center justify-center"
      style={{ minHeight: 'calc(100vh - var(--topnav-height) - 120px)' }}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          padding: '56px 32px 48px',
          background: 'var(--parchment-50)',
          border: '2px solid var(--ink-900)',
          borderRadius: '24px',
          boxShadow: '6px 6px 0 var(--ink-900)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 28px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            border: '2px solid var(--ink-900)',
            boxShadow: '4px 4px 0 var(--ink-900)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F1E6CA',
          }}
        >
          {icon || <Lock size={36} strokeWidth={2} />}
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "'Rakkas', cursive",
            fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
            color: 'var(--ink-900)',
            lineHeight: 1.2,
            marginBottom: '14px',
          }}
        >
          {title || 'سجّل دخولك أولاً'}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "'IBM Plex Sans Arabic', sans-serif",
            fontSize: '1rem',
            color: 'var(--ink-500)',
            lineHeight: 1.7,
            maxWidth: '38ch',
            margin: '0 auto 32px',
          }}
        >
          {subtitle || 'هذه الصفحة تحتاج تسجيل دخول للوصول إلى محتواها ومتابعة تقدمك.'}
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
          <Link
            href="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 36px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #F1E6CA 100%)',
              color: 'var(--ink-900)',
              border: '2px solid var(--ink-900)',
              borderRadius: '14px',
              fontFamily: "'IBM Plex Sans Arabic', sans-serif",
              fontWeight: 700,
              fontSize: '1.05rem',
              textDecoration: 'none',
              boxShadow: '4px 4px 0 var(--ink-900)',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
          >
            <UserPlus size={20} strokeWidth={2.2} />
            انضم إلينا — مجاناً
          </Link>

          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 28px',
              background: 'transparent',
              color: 'var(--ink-700)',
              border: '2px solid var(--sand-400)',
              borderRadius: '14px',
              fontFamily: "'IBM Plex Sans Arabic', sans-serif",
              fontWeight: 600,
              fontSize: '0.92rem',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
            }}
          >
            عندي حساب بالفعل
          </Link>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '10px',
              color: 'var(--ink-500)',
              fontFamily: "'IBM Plex Sans Arabic', sans-serif",
              fontSize: '0.84rem',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            <ArrowLeft size={14} className="rtl:rotate-180" />
            الرجوع للرئيسية
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default AuthGuard;
