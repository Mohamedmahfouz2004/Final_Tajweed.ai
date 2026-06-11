'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Headphones, Mic, GraduationCap, BarChart3 } from 'lucide-react';

// Primary mobile destinations. Practice (mic) is the emphasized centre action.
// Tafseer + account stay in the hamburger drawer (Navbar) to keep this to 5.
const TABS = [
    { href: '/', label: 'الرئيسية', icon: LayoutDashboard, exact: true },
    { href: '/listen', label: 'استماع', icon: Headphones },
    { href: '/practice', label: 'سمّع', icon: Mic, center: true },
    { href: '/lessons', label: 'دروس', icon: GraduationCap },
    { href: '/progress', label: 'تقدمي', icon: BarChart3 },
];

/**
 * Mobile-only bottom tab bar. Always rendered (hidden ≥769px via CSS so there's
 * no SSR/hydration flash); the parent (AppLayoutWrapper) skips it on fullscreen
 * routes like /admin and /live-moshaf.
 */
export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="bottom-nav" dir="rtl" aria-label="التنقل السريع">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = tab.exact ? pathname === tab.href : pathname?.startsWith(tab.href);
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`bn-tab ${active ? 'is-active' : ''} ${tab.center ? 'bn-center' : ''}`}
                        aria-current={active ? 'page' : undefined}
                    >
                        <span className="bn-icon">
                            <Icon size={tab.center ? 24 : 21} strokeWidth={active || tab.center ? 2.4 : 1.9} />
                        </span>
                        <span className="bn-label">{tab.label}</span>
                    </Link>
                );
            })}

            <style jsx>{`
                .bottom-nav {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 900;
                    display: flex;
                    align-items: stretch;
                    justify-content: space-around;
                    gap: 2px;
                    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
                    background: rgba(253, 250, 243, 0.92);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border-top: 1px solid var(--sand-400);
                    box-shadow: 0 -10px 30px -12px rgba(15, 26, 13, 0.18);
                }
                .bn-tab {
                    flex: 1;
                    min-height: 48px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 3px;
                    padding: 4px 2px;
                    text-decoration: none;
                    color: var(--ink-500);
                    border-radius: 14px;
                    transition: color 0.15s ease;
                }
                .bn-tab.is-active {
                    color: var(--emerald-700);
                }
                .bn-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .bn-label {
                    font-family: var(--font-ibm), 'IBM Plex Sans Arabic', sans-serif;
                    font-size: 0.66rem;
                    font-weight: 700;
                    line-height: 1;
                }
                /* Emphasised centre action (Practice / mic) */
                .bn-center {
                    color: var(--ink-700);
                }
                .bn-center .bn-icon {
                    width: 54px;
                    height: 54px;
                    margin-top: -22px;
                    border-radius: 50%;
                    color: #fff;
                    background: linear-gradient(135deg, var(--emerald-700), var(--emerald-500));
                    border: 3px solid var(--parchment-50);
                    box-shadow: 0 10px 22px -8px rgba(27, 94, 59, 0.55);
                }
                .bn-center.is-active {
                    color: var(--emerald-700);
                }
                /* Desktop: the top navbar takes over. */
                @media (min-width: 769px) {
                    .bottom-nav {
                        display: none;
                    }
                }
            `}</style>
        </nav>
    );
}
