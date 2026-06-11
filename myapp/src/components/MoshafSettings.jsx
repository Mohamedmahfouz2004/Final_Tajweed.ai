import React, { useState, useEffect } from 'react';
import moshafFields from '../assets/moshaf_fields.json';
import useAppStore from '../store/useAppStore';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const REQUIRED_MOSHAF_FIELDS = moshafFields;

const CATEGORIES = [
    {
        id: 'general',
        title: 'الرواية والتكبير والأوجه العامة',
        description: 'اختر الرواية، التكبير، وأوجه الابتداء والوصل بين السور',
        fields: ['rewaya', 'takbeer', 'between_anfal_and_tawba', 'start_with_ism']
    },
    {
        id: 'madd',
        title: 'أحكام المدود وهمزات الوصل',
        description: 'تحديد مقادير المد المنفصل، المتصل، العارض، اللين، والمد الحرفي',
        fields: ['madd_monfasel_len', 'madd_mottasel_len', 'madd_mottasel_waqf', 'madd_aared_len', 'madd_alleen_len', 'madd_yaa_alayn_alharfy', 'tasheel_or_madd']
    },
    {
        id: 'sakt',
        title: 'أحكام السكتات وأوجه الوصل',
        description: 'إعدادات السكت للساكن قبل الهمز وسكتات حفص الواجبة',
        fields: ['saken_before_hamz', 'sakt_iwaja', 'sakt_marqdena', 'sakt_man_raq', 'sakt_bal_ran', 'sakt_maleeyah']
    },
    {
        id: 'noon_meem',
        title: 'أحكام النون والميم والإدغامات المخصوصة',
        description: 'ضبط الغنات والإدغام في الحروف والكلمات المخصوصة مثل (اركب معنا)',
        fields: ['ghonna_lam_and_raa', 'meem_aal_imran', 'noon_and_yaseen', 'yalhath_dhalik', 'irkab_maana', 'idgham_nakhluqkum', 'noon_tamnna', 'meem_mokhfah']
    },
    {
        id: 'tafkheem_tarqeeq',
        title: 'أحكام التفخيم والترقيق والزيادة/الحذف',
        description: 'ضبط تفخيم وترقيق الراءات وإثبات أو حذف حروف العلة وقوفاً',
        fields: ['raa_firq', 'raa_alqitr', 'raa_misr', 'raa_nudhur', 'raa_yasr', 'yaa_ataan', 'alif_salasila', 'harakat_daaf']
    },
    {
        id: 'seen_saad',
        title: 'السين والصاد في الكلمات المخصوصة',
        description: 'تحديد النطق بالسين أو الصاد في كلمات مثل (يبسط، بسطة، المصيطرون)',
        fields: ['yabsut', 'bastah', 'almusaytirun', 'bimusaytir']
    }
];

/* ── Shared inline styles ── */
const selectStyle = {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '14px',
    border: '2px solid #e8e0d0',
    background: '#FFFFFF',
    fontFamily: 'inherit',
    fontSize: '0.92rem',
    color: '#2c2416',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    WebkitAppearance: 'none',
    appearance: 'none',
};

const labelStyle = {
    fontFamily: 'var(--font-ibm), "IBM Plex Sans Arabic", sans-serif',
    fontSize: '0.92rem',
    fontWeight: '700',
    color: '#4a3f30',
    display: 'block',
    textAlign: 'right',
    lineHeight: '1.6',
};

const fieldWrapperStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
};

// Build defaults directly from the JSON — every field now has a proper default value
function buildDefaults() {
    const init = {};
    REQUIRED_MOSHAF_FIELDS.forEach(f => {
        init[f.name] = f.default;
    });
    return init;
}

const DEFAULTS = buildDefaults();

const MoshafSettings = ({ isProfilePage }) => {
    const { moshafSettings, setMoshafSettings } = useAppStore();

    const [settings, setSettings] = useState(() => {
        if (moshafSettings && Object.keys(moshafSettings).length > 0) {
            // Merge: use saved values on top of defaults (in case new fields were added)
            return { ...DEFAULTS, ...moshafSettings };
        }
        return { ...DEFAULTS };
    });
    const [status, setStatus] = useState('');
    const [expandedCategory, setExpandedCategory] = useState('general');

    // On mount: if global store has no settings, populate it with defaults
    useEffect(() => {
        if (!moshafSettings || Object.keys(moshafSettings).length === 0) {
            setMoshafSettings({ ...DEFAULTS });
        }
    }, []);

    // Keep local state and global state in sync
    useEffect(() => {
        if (moshafSettings && Object.keys(moshafSettings).length > 0) {
            setSettings(prev => ({ ...DEFAULTS, ...moshafSettings }));
        }
    }, [moshafSettings]);

    const handleChange = (name, value) => {
        const newSettings = { ...settings, [name]: value };
        setSettings(newSettings);
        setMoshafSettings(newSettings);
    };

    const handleSave = () => {
        setMoshafSettings(settings);
        setStatus('تم حفظ الإعدادات بنجاح');
        setTimeout(() => setStatus(''), 3000);
    };

    const handleReset = () => {
        const init = {};
        REQUIRED_MOSHAF_FIELDS.forEach(f => { init[f.name] = f.default; });
        setSettings(init);
        setMoshafSettings(init);
        setStatus('تم إعادة التعيين للافتراضيات');
        setTimeout(() => setStatus(''), 3000);
    };

    const toggleCategory = (id) => {
        setExpandedCategory(prev => prev === id ? null : id);
    };

    const renderField = (field) => {
        if (field.type === 'select') {
            return (
                <select
                    style={selectStyle}
                    value={settings[field.name] || ''}
                    onChange={e => handleChange(field.name, e.target.value)}
                    onFocus={e => { e.target.style.borderColor = '#B8963E'; e.target.style.boxShadow = '0 0 0 3px rgba(184,150,62,0.12)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e8e0d0'; e.target.style.boxShadow = 'none'; }}
                >
                    {field.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            );
        }
        if (field.type === 'number') {
            return (
                <input
                    type="number"
                    style={{ ...selectStyle, textAlign: 'center' }}
                    value={settings[field.name] ?? ''}
                    onChange={e => handleChange(field.name, parseInt(e.target.value))}
                    onFocus={e => { e.target.style.borderColor = '#B8963E'; e.target.style.boxShadow = '0 0 0 3px rgba(184,150,62,0.12)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e8e0d0'; e.target.style.boxShadow = 'none'; }}
                />
            );
        }
        if (field.type === 'checkbox') {
            return (
                <label
                    style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 18px',
                        border: '2px solid #e8e0d0',
                        borderRadius: '14px',
                        background: settings[field.name] ? '#1a2e1a' : '#FFFFFF',
                        color: settings[field.name] ? '#d4a94b' : '#2c2416',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: '0.92rem',
                        fontWeight: 'bold',
                        transition: 'all 0.2s ease',
                    }}
                >
                    <input
                        type="checkbox"
                        style={{ accentColor: '#B8963E', width: 18, height: 18 }}
                        checked={settings[field.name] || false}
                        onChange={e => handleChange(field.name, e.target.checked)}
                    />
                    <span>{settings[field.name] ? 'مفعّل' : 'معطّل'}</span>
                </label>
            );
        }
        if (field.type === 'text') {
            return (
                <input
                    type="text"
                    style={selectStyle}
                    value={settings[field.name] || ''}
                    onChange={e => handleChange(field.name, e.target.value)}
                    onFocus={e => { e.target.style.borderColor = '#B8963E'; e.target.style.boxShadow = '0 0 0 3px rgba(184,150,62,0.12)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e8e0d0'; e.target.style.boxShadow = 'none'; }}
                />
            );
        }
        return null;
    };

    const renderAccordions = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {CATEGORIES.map(cat => {
                    const isOpen = expandedCategory === cat.id;
                    return (
                        <div 
                            key={cat.id} 
                            style={{
                                borderRadius: '18px',
                                background: '#FFFFFF',
                                overflow: 'hidden',
                                boxShadow: isOpen 
                                    ? '0 8px 32px -4px rgba(26, 92, 58, 0.08), 0 2px 8px rgba(0,0,0,0.03)' 
                                    : '0 2px 8px rgba(0,0,0,0.04)',
                                transition: 'box-shadow 0.3s ease',
                                border: isOpen ? '1px solid rgba(26, 92, 58, 0.12)' : '1px solid transparent',
                            }}
                        >
                            {/* Accordion Header */}
                            <button
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                style={{
                                    width: '100%',
                                    textAlign: 'right',
                                    padding: '22px 28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: isOpen ? 'rgba(26, 92, 58, 0.03)' : 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    transition: 'background 0.2s ease',
                                    gap: '16px',
                                }}
                            >
                                <div style={{ textAlign: 'right', flex: 1 }}>
                                    <h3 style={{ 
                                        fontWeight: '800', 
                                        fontSize: '1.08rem', 
                                        color: isOpen ? '#1A5C3A' : '#2c2416', 
                                        marginBottom: '4px',
                                        lineHeight: '1.5',
                                        transition: 'color 0.2s ease',
                                    }}>{cat.title}</h3>
                                    <p style={{ 
                                        fontSize: '0.82rem', 
                                        color: '#8a7e6a', 
                                        fontWeight: '500',
                                        lineHeight: '1.5',
                                    }}>{cat.description}</p>
                                </div>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: isOpen ? '#ecfdf5' : '#f5f0e6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isOpen ? '#1A5C3A' : '#8a7e6a',
                                    transition: 'all 0.3s ease',
                                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    flexShrink: 0,
                                }}>
                                    <ChevronDown size={18} />
                                </div>
                            </button>

                            {/* Accordion Content */}
                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div
                                        key="content"
                                        initial="collapsed"
                                        animate="open"
                                        exit="collapsed"
                                        variants={{
                                            open: { opacity: 1, height: "auto" },
                                            collapsed: { opacity: 0, height: 0 }
                                        }}
                                        transition={{ duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] }}
                                    >
                                        <div style={{ 
                                            padding: '28px 32px 36px',
                                            borderTop: '1px solid #f0ebe0',
                                            background: '#fcfaf6',
                                        }}>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                                gap: '28px 32px',
                                            }}>
                                                {cat.fields.map(fieldName => {
                                                    const field = REQUIRED_MOSHAF_FIELDS.find(f => f.name === fieldName);
                                                    if (!field) return null;
                                                    return (
                                                        <div key={field.name} style={fieldWrapperStyle}>
                                                            <span style={labelStyle}>{field.label}</span>
                                                            {renderField(field)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (isProfilePage) {
        return (
            <div style={{ width: '100%' }} dir="rtl">
                {renderAccordions()}
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto text-right" dir="rtl">
            <div className="mb-6 text-right">
                <span className="ui-eyebrow">SETTINGS &nbsp;//&nbsp; MOSHAF</span>
                <h2 className="ui-title" style={{ fontSize: '2.2rem' }}>إعدادات المصحف</h2>
                <p style={{ color: 'var(--ink-700)', marginTop: 8 }}>
                  عدّل خصائص المصحف وجميع الأحكام بدقة للحصول على تقييم مثالي.
                </p>
            </div>

            <div className="ui-divider" aria-hidden />

            <div className="ui-panel" style={{ padding: '24px' }}>
                <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingInline: '4px' }}>
                    {renderAccordions()}
                </div>

                {!isProfilePage && (
                    <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--sand-400)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                        {status && (
                            <span className="ui-badge ui-badge--ok">{status}</span>
                        )}
                        <div className="flex gap-3">
                            <button onClick={handleSave} className="ui-cta" type="button">حفظ الإعدادات</button>
                            <button onClick={handleReset} className="ui-btn ui-btn--ghost" type="button">إعادة التعيين</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MoshafSettings;
