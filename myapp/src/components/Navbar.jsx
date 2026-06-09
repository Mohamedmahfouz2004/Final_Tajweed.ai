'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Mic,
  GraduationCap, BarChart3, LogIn, BookMarked,
  Headphones, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

const Navbar = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isAdminRoute = pathname?.startsWith('/admin');
  if (isAdminRoute) return null;

  const navItems = [
    { href: '/',         label: 'HOME',     icon: LayoutDashboard, exact: true },
    { href: '/listen',   label: 'LISTEN',   icon: Headphones },
    { href: '/practice', label: 'PRACTICE', icon: Mic },
    { href: '/lessons',  label: 'LESSONS',  icon: GraduationCap },
    { href: '/progress', label: 'STATS',    icon: BarChart3 },
    { href: '/tafseer',  label: 'TAFSEER',  icon: BookMarked },
  ];

  return (
    <nav className="topnav">
      {/* ── Brand ── */}
      <Link href="/" className="topnav-brand">
        <img src="/logo.svg" alt="تجويد.ai" className="brand-logo" />
        <span className="topnav-brand-title">
          تجويد<span>.ai</span>
        </span>
      </Link>

      {/* ── Desktop Nav links ── */}
      <div className="topnav-links hidden md:flex">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`topnav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={13} strokeWidth={isActive ? 2.4 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Right Section (Auth + Mobile Menu Toggle) ── */}
      <div className="topnav-right">
        {/* ── Auth ── */}
        <div className="topnav-auth">
        <motion.div
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="status-dot"
          aria-hidden
        />

        <Show when="signed-in">
          <UserButton afterSignOutUrl="/" />
        </Show>
        <Show when="signed-out">
          <SignUpButton mode="modal">
            <button className="topnav-auth-btn topnav-auth-btn--logout hidden sm:inline-flex" type="button">
              <span>SIGN&nbsp;UP</span>
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="topnav-auth-btn topnav-auth-btn--login" type="button">
              <LogIn size={13} />
              <span>LOG&nbsp;IN</span>
            </button>
          </SignInButton>
        </Show>
      </div>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-btn flex md:hidden"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open Menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* ── Mobile Side Drawer ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mobile-drawer-backdrop"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="mobile-drawer"
            >
              <div className="mobile-drawer-header">
                <span className="mobile-drawer-title">القائمة</span>
                <button
                  className="mobile-drawer-close"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close Menu"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="mobile-drawer-links">
                {navItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname?.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`mobile-drawer-item ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx>{`
        .brand-logo {
          height: 40px;
          width: auto;
          display: block;
          flex-shrink: 0;
          filter: drop-shadow(0 4px 10px rgba(200, 150, 62, 0.45));
          transition: transform 0.18s ease, filter 0.18s ease;
        }
        @media (max-width: 768px) {
          .brand-logo { height: 28px; }
        }
        .topnav-brand:hover .brand-logo {
          transform: translateY(-1px) scale(1.03);
          filter: drop-shadow(0 7px 16px rgba(200, 150, 62, 0.6));
        }

        .topnav-auth-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Share Tech Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 600;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.16s ease;
          padding: 8px 14px;
        }
        .topnav-auth-btn--logout {
          background: transparent;
          border: 1px solid rgba(245,239,227,0.3);
          color: rgba(245,239,227,0.85);
        }
        .topnav-auth-btn--logout:hover {
          border-color: var(--brass-500);
          color: var(--brass-300);
        }
        .topnav-auth-btn--login {
          background: linear-gradient(135deg, #D4AF37 0%, #F1E6CA 100%);
          border: 1px solid transparent;
          color: var(--ink-900);
          box-shadow: 0 6px 16px -6px rgba(212, 175, 55, 0.7);
        }
        .topnav-auth-btn--login:hover {
          box-shadow: 0 9px 20px -6px rgba(212, 175, 55, 0.85);
          transform: translateY(-1px);
        }
        .topnav-avatar {
          width: 24px;
          height: 24px;
          background: var(--brass-500);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--ink-900);
          font-size: 0.78rem;
          font-family: var(--font-ibm), 'IBM Plex Sans Arabic', sans-serif;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          background: var(--emerald-500);
          box-shadow: 0 0 8px var(--emerald-500);
        }
        .topnav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .mobile-menu-btn {
          background: transparent;
          border: none;
          color: #F0EAD6;
          cursor: pointer;
          padding: 4px;
        }
        .mobile-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(13, 17, 11, 0.7);
          backdrop-filter: blur(4px);
          z-index: 1000;
        }
        .mobile-drawer {
          position: fixed;
          top: 0;
          bottom: 0;
          right: 0;
          width: 280px;
          background: var(--ink-900);
          border-left: 1px solid rgba(212, 175, 55, 0.2);
          z-index: 1001;
          display: flex;
          flex-direction: column;
          padding: 24px;
          box-shadow: -10px 0 30px rgba(0,0,0,0.5);
        }
        .mobile-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }
        .mobile-drawer-title {
          font-family: 'Rakkas', cursive;
          font-size: 1.4rem;
          color: #D4AF37;
        }
        .mobile-drawer-close {
          background: transparent;
          border: none;
          color: #F0EAD6;
          cursor: pointer;
          padding: 4px;
        }
        .mobile-drawer-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .mobile-drawer-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 16px;
          border-radius: 12px;
          font-family: 'IBM Plex Sans Arabic', sans-serif;
          font-size: 1.1rem;
          color: rgba(240, 234, 214, 0.7);
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .mobile-drawer-item:hover {
          background: rgba(212, 175, 55, 0.05);
          color: #F0EAD6;
        }
        .mobile-drawer-item.active {
          background: rgba(212, 175, 55, 0.15);
          color: #D4AF37;
          border: 1px solid rgba(212, 175, 55, 0.3);
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
