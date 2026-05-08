import React, { useState, useEffect } from 'react';
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

    const handleChange = (name, value) => {
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        setMoshafSettings(settings);
        setStatus('✅ تم حفظ الإعدادات بنجاح - Settings saved successfully!');
        setTimeout(() => setStatus(''), 3000);
    };

    const handleReset = () => {
        const init = {};
        REQUIRED_MOSHAF_FIELDS.forEach(f => { init[f.name] = f.default; });
        setSettings(init);
        setMoshafSettings(init);
        setStatus('✅ تم إعادة التعيين إلى الإعدادات الافتراضية');
        setTimeout(() => setStatus(''), 3000);
    };

    return (
        <div className="bg-[#FAF9F6] p-6 rounded-2xl border border-gray-100 shadow-sm max-w-5xl mx-auto font-arabic" dir="rtl">
            <div className="mb-8 border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-[#044D29] mb-2 font-amiri">إعدادات خصائص المصحف (كاملة)</h2>
                <p className="text-gray-500">قم بتعديل خصائص المصحف وجميع الأحكام بدقة للحصول على تقييم مثالي.</p>
            </div>

            {/* A wrapper with max-height to avoid taking up the whole screen endlessly if there are 37 items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto px-2 pb-4 tajweed-scrollbar">
                {REQUIRED_MOSHAF_FIELDS.map(field => (
                    <div key={field.name} className="flex flex-col mb-2">
                        <label className="mb-2 font-bold text-[#044D29] text-sm leading-relaxed">{field.label}</label>

                        {field.type === 'select' && (
                            <select
                                className="p-3 bg-white border border-gray-200 rounded-lg text-right outline-none focus:border-[#D4AF37] shadow-sm text-[#044D29] font-medium"
                                value={settings[field.name] || ''}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                            >
                                {field.options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        )}

                        {field.type === 'number' && (
                            <input
                                type="number"
                                className="p-3 bg-white border border-gray-200 rounded-lg text-right outline-none focus:border-[#D4AF37] shadow-sm text-[#044D29] font-medium"
                                value={settings[field.name] ?? ''}
                                onChange={(e) => handleChange(field.name, parseInt(e.target.value))}
                            />
                        )}

                        {field.type === 'checkbox' && (
                            <div className="flex items-center gap-3 bg-white p-3 border border-gray-200 rounded-lg shadow-sm cursor-pointer" onClick={() => handleChange(field.name, !settings[field.name])}>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 accent-[#044D29]"
                                    checked={settings[field.name] || false}
                                    onChange={(e) => handleChange(field.name, e.target.checked)}
                                    onClick={e => e.stopPropagation()}
                                />
                                <span className="text-[#044D29] font-medium">{settings[field.name] ? 'مفعل' : 'معطل'}</span>
                            </div>
                        )}

                        {field.type === 'text' && (
                            <input
                                type="text"
                                className="p-3 bg-white border border-gray-200 rounded-lg text-right outline-none focus:border-[#D4AF37] shadow-sm text-[#044D29] font-medium"
                                value={settings[field.name] || ''}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 flex flex-col items-center border-t border-gray-200 pt-6">
                {status && (
                    <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-bold ${status.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {status}
                    </div>
                )}
                <div className="flex gap-4">
                    <button
                        onClick={handleSave}
                        className="bg-[#044D29] hover:bg-[#066b3b] text-white font-bold py-3 px-12 rounded-lg shadow-md transition-colors"
                    >
                        حفظ الإعدادات
                    </button>
                    <button
                        onClick={handleReset}
                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 px-8 rounded-lg shadow-sm transition-colors"
                    >
                        إعادة التعيين
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoshafSettings;
