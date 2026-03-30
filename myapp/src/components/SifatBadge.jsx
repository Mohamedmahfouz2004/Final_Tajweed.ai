import React from 'react';

const SifatBadge = ({ expected, actual }) => {
    if (!actual) return <span style={{ color: '#9CA3AF' }}>-</span>;

    const isMatch = expected === actual;
    const displayText = actual.replace(/_/g, ' ');
    const expectedText = expected?.replace(/_/g, ' ');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{
                color: isMatch ? '#059669' : '#DC2626',
                background: isMatch ? '#D1FAE5' : '#FEE2E2',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
            }}>
                {displayText}
            </span>
            {!isMatch && expectedText && (
                <span style={{ fontSize: '10px', color: '#9CA3AF', textDecoration: 'line-through' }}>
                    {expectedText}
                </span>
            )}
        </div>
    );
};

export default SifatBadge;
