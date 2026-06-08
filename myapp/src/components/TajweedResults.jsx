import React from 'react';
import { BookOpenCheck } from 'lucide-react';

const TajweedResults = ({ result }) => {
    if (!result) return null;

    return (
        <div className="ui-panel" dir="rtl" style={{ padding: 24 }}>
            <div className="flex items-center gap-3" style={{ paddingBottom: 14, borderBottom: '1px solid var(--sand-400)', marginBottom: 18 }}>
                <BookOpenCheck size={20} color="var(--brass-700)" strokeWidth={2.2} />
                <h3 className="ui-title" style={{ fontSize: '1.6rem' }}>
                  نتيجة اختبار التجويد والصفات
                </h3>
            </div>

            <div className="tajweed-gradio-html-container hidden">
                <div dangerouslySetInnerHTML={{ __html: result.html }} />
            </div>

            {result.word_details && result.word_details.length > 0 && (
                <div style={{ marginTop: 8 }}>
                    <span className="ui-eyebrow" style={{ marginBottom: 12, display: 'inline-block' }}>
                      WORD-BY-WORD BREAKDOWN
                    </span>
                    <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 10,
                        fontFamily: 'Amiri, serif', fontSize: '1.7rem', lineHeight: 2.2,
                        color: 'var(--ink-900)',
                    }}>
                        {result.word_details.map((wd, i) => (
                            <span
                                key={i}
                                style={{
                                    padding: '2px 8px',
                                    background: wd.has_error ? 'rgba(139,58,42,0.08)' : 'transparent',
                                    border: wd.has_error ? '1px solid var(--rec-error)' : '1px solid transparent',
                                    color: wd.has_error ? 'var(--rec-error)' : 'var(--ink-900)',
                                    cursor: wd.has_error ? 'help' : 'default',
                                }}
                                title={wd.has_error ? wd.error_descriptions.join(' | ') : 'نطق صحيح'}
                                dangerouslySetInnerHTML={{ __html: wd.html_content || wd.text }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TajweedResults;
