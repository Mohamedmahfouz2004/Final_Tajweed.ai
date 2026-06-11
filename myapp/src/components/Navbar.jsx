'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Mic,
  GraduationCap, BarChart3, LogIn, BookMarked,
  Headphones, Menu, X, User
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import useAppStore from '../store/useAppStore';
import { supabase } from '../utils/supabaseClient';
import { useRouter } from 'next/navigation';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const isLoggedIn = useAppStore(state => state.isLoggedIn);
  const userProfile = useAppStore(state => state.userProfile);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const profileMenuRef = React.useRef(null);

  useOnClickOutside(profileMenuRef, () => setIsProfileMenuOpen(false));

  // Robust scroll detection using Framer Motion
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (latest > previous && latest > 50) {
      setIsVisible(false); // scrolling down
    } else {
      setIsVisible(true);  // scrolling up
    }
  });

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isAdminRoute = pathname?.startsWith('/admin');
  if (isAdminRoute) return null;

  const navItems = [
    { href: '/',         label: 'الرئيسية',     icon: LayoutDashboard, exact: true },
    { href: '/listen',   label: 'استماع',   icon: Headphones },
    { href: '/practice', label: 'التسميع', icon: Mic },
    { href: '/lessons',  label: 'دروس',  icon: GraduationCap },
    { href: '/tafseer',  label: 'تفسير',  icon: BookMarked },
    { href: '/progress', label: 'إحصائيات',    icon: BarChart3 },
  ];

  return (
    <>
      {/* ═══════════ TOP NAVBAR ═══════════ */}
      <nav 
        className="topnav"
        style={{ 
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        }}
      >

        {/* Mobile: Hamburger */}
        {isMobile && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', order: 1 }}>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Menu"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#F0EAD6',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Menu size={26} />
            </button>
          </div>
        )}

        {/* Brand */}
        <Link
          href="/"
          className="topnav-brand flex items-center gap-2 group mr-2"
          style={isMobile ? { flex: 2, justifyContent: 'center', order: 2, textDecoration: 'none' } : { textDecoration: 'none' }}
        >
          <img src="/logo.svg" alt="تجويد.ai" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <strong className="flex items-baseline" aria-label="تجويد ai" dir="rtl" style={{ gap: '0px', flexDirection: 'row' }}>
            <span style={{ fontFamily: 'var(--font-reem-kufi), sans-serif', fontWeight: 'bold', fontSize: '20px', color: '#FFFFFF' }}>تجويد</span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontWeight: 'bold', fontSize: '18px', color: '#B8923E', position: 'relative', top: '1px' }}>.</span>
            <span dir="ltr" style={{ fontFamily: "'Share Tech Mono', monospace", fontWeight: 'bold', fontSize: '18px', color: '#B8923E', position: 'relative', top: '1px', marginRight: '2px' }}>ai</span>
          </strong>
        </Link>

        {/* Desktop: Nav links */}
        {!isMobile && (
          <div className="topnav-links">
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
        )}

        {/* Auth */}
        <div
          className="topnav-auth"
          style={isMobile ? { flex: 1, justifyContent: 'flex-end', order: 3 } : {}}
        >

          {isLoggedIn ? (
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button 
                title="الحساب"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#D4AF37',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.25)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)' }}
              >
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : userProfile?.name ? (
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{userProfile.name.charAt(0).toUpperCase()}</span>
                ) : (
                  <User size={18} />
                )}
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: '48px',
                      left: 0,
                      minWidth: '160px',
                      background: 'var(--surface)',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                      borderRadius: '12px',
                      padding: '8px',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      zIndex: 100
                    }}
                  >
                    <Link 
                      href="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      style={{
                        padding: '10px 14px',
                        color: 'var(--light-text)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <User size={16} />
                      حسابي
                    </Link>
                    <button 
                      onClick={async () => {
                        setIsProfileMenuOpen(false);
                        if (supabase) await supabase.auth.signOut();
                        router.push('/');
                      }}
                      style={{
                        padding: '10px 14px',
                        color: '#EF4444',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <LogIn size={16} style={{ transform: 'rotate(180deg)' }} />
                      تسجيل الخروج
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link 
              href="/register" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #D4AF37 0%, #F1E6CA 100%)',
                color: '#1F2A24',
                padding: isMobile ? '6px 14px' : '8px 20px',
                borderRadius: '999px',
                fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                fontSize: isMobile ? '13px' : '14px',
                fontWeight: '700',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(212, 175, 55, 0.45)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.3)'; }}
            >
              انضم إلينا
            </Link>
          )}
        </div>

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
            border-color: #D4AF37;
            color: #D4AF37;
          }
          .topnav-auth-btn--login {
            background: linear-gradient(135deg, #D4AF37 0%, #F1E6CA 100%);
            border: 1px solid transparent;
            color: #1F2A24;
            box-shadow: 0 6px 16px -6px rgba(212, 175, 55, 0.7);
          }
          .topnav-auth-btn--login:hover {
            box-shadow: 0 9px 20px -6px rgba(212, 175, 55, 0.85);
            transform: translateY(-1px);
          }
        `}</style>
      </nav>

      {/* ═══════════════════════════════════════════
          MOBILE DRAWER — OUTSIDE <nav> because
          .topnav has CSS animation which creates a
          containing block that clips fixed children
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(8, 51, 36, 0.55)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 9998,
              }}
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                right: 0,
                width: '82vw',
                maxWidth: '400px',
                background: 'linear-gradient(170deg, #1a2e25 0%, #0a3d2a 50%, #062819 100%)',
                borderLeft: '1px solid rgba(212, 175, 55, 0.12)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                padding: '32px 20px',
                boxShadow: '-16px 0 60px rgba(0,0,0,0.5)',
                overflowY: 'auto',
              }}
            >
              {/* Drawer Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '36px',
                paddingBottom: '18px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src="/logo.svg" alt="" style={{ height: '26px' }} />
                  <strong className="flex items-baseline" aria-label="تجويد ai" dir="rtl" style={{ gap: '0px', flexDirection: 'row' }}>
                    <span style={{ fontFamily: 'var(--font-reem-kufi), sans-serif', fontWeight: 'bold', fontSize: '20px', color: '#FFFFFF' }}>تجويد</span>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontWeight: 'bold', fontSize: '18px', color: '#B8923E', position: 'relative', top: '1px' }}>.</span>
                    <span dir="ltr" style={{ fontFamily: "'Share Tech Mono', monospace", fontWeight: 'bold', fontSize: '18px', color: '#B8923E', position: 'relative', top: '1px', marginRight: '2px' }}>ai</span>
                  </strong>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close Menu"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%',
                    color: '#F0EAD6',
                    cursor: 'pointer',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Drawer Links */}
              <motion.div
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  open: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
                  closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {navItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname?.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      variants={{
                        open: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } },
                        closed: { opacity: 0, x: 30 },
                      }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '18px',
                          padding: '16px 18px',
                          borderRadius: '14px',
                          fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                          fontSize: '1.2rem',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? '#D4AF37' : 'rgba(240,234,214,0.6)',
                          textDecoration: 'none',
                          background: isActive ? 'rgba(212,175,55,0.12)' : 'transparent',
                          border: isActive ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                        }}
                      >
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: isActive ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Icon size={20} strokeWidth={isActive ? 2.4 : 1.6} />
                        </div>
                        <span>{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Drawer Footer */}
              <div style={{
                marginTop: 'auto',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
                color: 'rgba(240,234,214,0.3)',
                fontSize: '0.75rem',
                fontFamily: "'IBM Plex Sans Arabic', sans-serif",
              }}>
                تجويد.ai — تعلّم التجويد بالذكاء الاصطناعي
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
