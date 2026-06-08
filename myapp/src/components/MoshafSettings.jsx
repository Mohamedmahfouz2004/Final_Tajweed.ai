import React, { useState } from 'react';
import moshafFields from '../assets/moshaf_fields.json';
import useAppStore from '../store/useAppStore';

const REQUIRED_MOSHAF_FIELDS = moshafFields;

const MoshafSettings = () => {
    const { moshafSettings, setMoshafSettings } = useAppStore();

    const [settings, setSettings] = useState(() => {
        if (moshafSettings) return moshafSettings;
        const init = {};
        REQUIRED_MOSHAF_FIELDS.forEach(f => { init[f.name] = f.default; });
        return init;
    });
    const [status, setStatus] = useState('');

    const handleChange = (name, value) => setSettings(prev => ({ ...prev, [name]: value }));

    const handleSave = () => {
        setMoshafSettings(settings);
        setStatus('OK — settings saved');
        setTimeout(() => setStatus(''), 3000);
    };

    const handleReset = () => {
        const init = {};
        REQUIRED_MOSHAF_FIELDS.forEach(f => { init[f.name] = f.default; });
        setSettings(init);
        setMoshafSettings(init);
        setStatus('OK — reset to defaults');
        setTimeout(() => setStatus(''), 3000);
    };

    return (
        <div className="max-w-5xl mx-auto" dir="rtl">
            <div className="mb-6">
                <span className="ui-eyebrow">SETTINGS &nbsp;//&nbsp; MOSHAF</span>
                <h2 className="ui-title" style={{ fontSize: '2.2rem' }}>إعدادات المصحف</h2>
                <p style={{ color: 'var(--ink-700)', marginTop: 8 }}>
                  عدّل خصائص المصحف وجميع الأحكام بدقة للحصول على تقييم مثالي.
                </p>
            </div>

            <div className="ui-divider" aria-hidden />

            <div className="ui-panel" style={{ padding: 20 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ maxHeight: '58vh', overflowY: 'auto', paddingInline: 6 }}>
                    {REQUIRED_MOSHAF_FIELDS.map(field => (
                        <div key={field.name} className="flex flex-col" style={{ marginBottom: 8 }}>
                            <span className="ui-label" style={{ marginBottom: 6 }}>{field.label}</span>

                            {field.type === 'select' && (
                                <select
                                    className="ui-input"
                                    value={settings[field.name] || ''}
                                    onChange={e => handleChange(field.name, e.target.value)}
                                    style={{ background: 'var(--parchment-50)' }}
                                >
                                    {field.options.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            )}

                            {field.type === 'number' && (
                                <input
                                    type="number"
                                    className="ui-input font-num"
                                    value={settings[field.name] ?? ''}
                                    onChange={e => handleChange(field.name, parseInt(e.target.value))}
                                    style={{ textAlign: 'center' }}
                                />
                            )}

                            {field.type === 'checkbox' && (
                                <label
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '10px 14px',
                                        border: '1px solid var(--sand-400)',
                                        background: settings[field.name] ? 'var(--ink-900)' : 'var(--parchment-50)',
                                        color: settings[field.name] ? 'var(--brass-500)' : 'var(--ink-900)',
                                        cursor: 'pointer',
                                        fontFamily: 'Share Tech Mono, monospace',
                                        fontSize: '0.72rem',
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        style={{ accentColor: 'var(--brass-500)', width: 16, height: 16 }}
                                        checked={settings[field.name] || false}
                                        onChange={e => handleChange(field.name, e.target.checked)}
                                    />
                                    {settings[field.name] ? 'ON' : 'OFF'}
                                </label>
                            )}

                            {field.type === 'text' && (
                                <input
                                    type="text"
                                    className="ui-input"
                                    value={settings[field.name] || ''}
                                    onChange={e => handleChange(field.name, e.target.value)}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--sand-400)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    {status && (
                        <span className="ui-badge ui-badge--ok">{status}</span>
                    )}
                    <div className="flex gap-3">
                        <button onClick={handleSave} className="ui-cta" type="button">حفظ الإعدادات</button>
                        <button onClick={handleReset} className="ui-btn ui-btn--ghost" type="button">إعادة التعيين</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MoshafSettings;
