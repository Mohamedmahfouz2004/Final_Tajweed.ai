'use client';

import { useEffect, useState } from 'react';

/**
 * SSR-safe mobile breakpoint hook.
 * Defaults to `false` on the server / first render, then syncs on mount and on
 * resize — same pattern as the Navbar's inline check, shared here.
 *
 * @param {number} breakpoint  max viewport width (inclusive) treated as "mobile"
 */
export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= breakpoint);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, [breakpoint]);

    return isMobile;
}

export default useIsMobile;
