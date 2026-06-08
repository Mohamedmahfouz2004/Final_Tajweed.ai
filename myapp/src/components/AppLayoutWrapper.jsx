'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import useAppStore from '../store/useAppStore';

// Components
import SplashScreen from './SplashScreen';
import Toast from './Toast';
import Footer from './Footer';
import Navbar from './Navbar';
import MistakesModal from './MistakesModal';
import VoiceAssistant from './VoiceAssistant';
import ClerkStoreBridge from './ClerkStoreBridge';

export default function AppLayoutWrapper({ children }) {
    const [mounted, setMounted] = useState(false);

    // Store state
    const showSplash = useAppStore(s => s.showSplash);
    const hideSplash = useAppStore(s => s.hideSplash);
    const toast = useAppStore(s => s.toast);
    const isMistakesModalOpen = useAppStore(s => s.isMistakesModalOpen);
    const closeMistakesModal = useAppStore(s => s.closeMistakesModal);
    const setSurahs = useAppStore(s => s.setSurahs);

    const pathname = usePathname();
    const isAdminPath = pathname?.startsWith('/admin');

    useEffect(() => {
        setMounted(true);
        const timer = setTimeout(() => { hideSplash(); }, 2500);

        fetch('https://api.quran.com/api/v4/chapters?language=ar')
            .then(res => res.json())
            .then(data => { if (data.chapters) setSurahs(data.chapters); })
            .catch(err => console.error("Error fetching chapters:", err));

        return () => clearTimeout(timer);
    }, []);

    // Prevent hydration mismatch
    if (!mounted) {
        return (
            <div className="app-layout min-h-screen bg-[#FDFCF5] flex items-center justify-center">
                <div className="font-amiri text-3xl text-primary animate-pulse">تجويد.ai...</div>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <ClerkStoreBridge />
            <SplashScreen show={showSplash} />
            <Toast message={toast} />
            <VoiceAssistant />

            {/* GLOBAL MODALS */}
            <MistakesModal isOpen={isMistakesModalOpen} onClose={closeMistakesModal} />

            {/* Hide global components for Admin routes */}
            {!isAdminPath && <Navbar />}

            <main className={isAdminPath ? "admin-layout-wrapper w-full flex flex-col" : "main-content flex flex-col w-full"} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div style={{ flex: 1 }}>
                    <Suspense fallback={
                        <div className="flex justify-center items-center min-h-[60vh]">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    }>
                        {children}
                    </Suspense>
                </div>
                {!isAdminPath && <Footer />}
            </main>
        </div>
    );
}
