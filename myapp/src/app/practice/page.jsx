'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Settings, Headphones, BookOpen } from 'lucide-react';
import PracticeRecordCard from '../../components/PracticeRecordCard';
import MoshafSettings from '../../components/MoshafSettings';
import useAppStore from '../../store/useAppStore';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const reveal = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function PracticePage() {
  const router = useRouter();
  const isLoggedIn = useAppStore(s => s.isLoggedIn);
  const requireAuth = useAppStore(s => s.requireAuth);
  const practiceActiveTab = useAppStore(s => s.practiceActiveTab);
  const setPracticeActiveTab = useAppStore(s => s.setPracticeActiveTab);

  // This page is record-focused; coerce any legacy 'listen' tab to 'record'.
  const tab = practiceActiveTab === 'settings' ? 'settings' : 'record';

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="w-full">
      {/* Header */}
      <motion.div variants={reveal} className="ui-page-head">
        <span className="ui-eyebrow"><Mic size={12} /> التدريب &nbsp;//&nbsp; RECORD &amp; ANALYZE</span>
        <h1 className="ui-title">سجِّل تلاوتك</h1>
        <p className="ui-sub">
          سجّل تلاوتك واحصل على تحليل فوري ودقيق لأحكام التجويد على مستوى الحرف والحركة بواسطة محرك
          Muaalem.
        </p>
      </motion.div>

      <div className="ui-divider" aria-hidden />

      {/* Tabs + listen shortcut */}
      <motion.div variants={reveal} className="flex items-center justify-start mb-6 flex-wrap">
        <div className="ui-tabs">
          <button type="button" className={`ui-tab ${tab === 'record' ? 'is-active' : ''}`}
            onClick={() => setPracticeActiveTab('record')}>
            <Mic size={13} /> سجّل
          </button>
          <button type="button" className="ui-tab" onClick={() => router.push('/listen')}>
            <Headphones size={14} /> استمع أولاً
          </button>
        </div>
      </motion.div>

      {/* Panel */}
      <div className="min-h-[420px]">
        <AnimatePresence mode="wait">
          {tab === 'record' && (
            <motion.div key="record" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {!isLoggedIn ? (
                <div className="ui-card--emerald" style={{ textAlign: 'center', padding: '44px 28px' }}>
                  <div style={{
                    width: 60, height: 60, margin: '0 auto 18px', borderRadius: 16,
                    background: 'linear-gradient(135deg, #D4AF37, #F1E6CA)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 24px -8px rgba(212,175,55,0.6)',
                  }}>
                    <BookOpen size={28} color="#0F1A0D" strokeWidth={2.2} />
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-rakkas), Rakkas', fontSize: '2rem', lineHeight: 1.1, marginBottom: 10, color: '#FFFFFF' }}>
                    سجِّل دخولك للبدء
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.78)', maxWidth: '34ch', margin: '0 auto 22px' }}>
                    انضم إلينا لتسجيل تلاوتك واكتشاف أحكام التجويد وحفظ تقدمك.
                  </p>
                  <button onClick={requireAuth} className="ui-cta" type="button">ابدأ مجاناً</button>
                </div>
              ) : (
                <PracticeRecordCard />
              )}
            </motion.div>
          )}

          {tab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="ui-card flex flex-col items-center justify-center p-12 text-center">
                <Settings size={40} className="mb-4 text-brass-500" />
                <h3 className="text-xl font-bold mb-2">إعدادات القراءة والتجويد</h3>
                <p className="text-ink-600 mb-6">تم نقل جميع إعدادات القراءة والشيخ المفضل إلى صفحة الحساب لتكون افتراضية دائماً.</p>
                <button onClick={() => router.push('/profile')} className="ui-cta">
                  الذهاب لصفحة الحساب
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
