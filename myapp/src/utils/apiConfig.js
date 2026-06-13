/**
 * Centralized API configuration for Next.js.
 *
 * Stack: FastAPI backend + Clerk auth + Muaalem model server.
 *   - API_BASE      → FastAPI backend (Clerk auth, MongoDB, lessons, progress)  :8000
 *   - MUAALEM_BASE  → Muaalem model server (Uthmani text + live tajweed)         :8888
 *   - WS_BASE       → WebSocket base for the live recitation /ws/stream.
 *                     Defaults to the Muaalem server (direct). Set
 *                     NEXT_PUBLIC_WS_URL to route through the FastAPI proxy instead.
 *
 * Each can be overridden via a NEXT_PUBLIC_* env var (set them in .env.local).
 */

let API_BASE     = process.env.NEXT_PUBLIC_API_URL || 'https://neat-cougars-glow.loca.lt';
let MUAALEM_BASE = 'https://voice-plus-twisty.ngrok-free.dev'; // Hardcoded to bypass old Vercel env vars

if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.has('localtunnel')) {
        localStorage.setItem('localtunnel_url', params.get('localtunnel'));
    }
    const savedUrl = localStorage.getItem('localtunnel_url');
    if (savedUrl) {
        MUAALEM_BASE = savedUrl;
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        API_BASE = 'http://127.0.0.1:8000';
        MUAALEM_BASE = 'http://127.0.0.1:8888';
    }
}

// Live recitation WebSocket → Muaalem's native /ws/stream (override with NEXT_PUBLIC_WS_URL).
const WS_HTTP = process.env.NEXT_PUBLIC_WS_URL || MUAALEM_BASE;
const WS_BASE = WS_HTTP.replace(/^http/, 'ws');

/**
 * Fetch JSON with graceful degradation. Returns `fallback` (default null) instead
 * of throwing when the backend is unreachable, returns a non-2xx status, or sends
 * a non-JSON body (e.g. a LocalTunnel "503 Tunnel Unavailable" page). Failures are
 * logged with console.warn — not console.error — so an offline backend in dev does
 * not trip the Next.js error overlay.
 */
async function fetchJsonSafe(url, options = {}, fallback = null) {
    try {
        const headers = {
            'Bypass-Tunnel-Reminder': 'true',
            'ngrok-skip-browser-warning': 'true',
            ...(options.headers || {})
        };
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            console.warn(`[api] ${res.status} ${res.statusText} — ${url}`);
            return fallback;
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('json')) {
            console.warn(`[api] Expected JSON but got "${contentType || 'unknown'}" — ${url}`);
            return fallback;
        }
        return await res.json();
    } catch (err) {
        // Network-level failure (DNS, CORS, connection refused, tunnel down).
        console.warn(`[api] Request failed — ${url}: ${err.message}`);
        return fallback;
    }
}

/**
 * Ask the model server to explain a recitation session's tajweed mistakes.
 * Served by /api/explain on the Muaalem server (MUAALEM_BASE) so it rides the same
 * tunnel as the live recitation — no separate backend needed. Override the target
 * with NEXT_PUBLIC_EXPLAIN_URL if you host /api/explain elsewhere (e.g. the FastAPI
 * backend at API_BASE). `mistakes` is the backend-shaped list ({ error_type,
 * surah_number, ayah_number, ayah_text, char_index, tooltip }). Degrades
 * gracefully: returns an empty report (caller falls back to the client-side
 * errorTypeMap) if the server is unreachable or errors.
 */
const EXPLAIN_BASE = process.env.NEXT_PUBLIC_EXPLAIN_URL || MUAALEM_BASE;

async function explainMistakes(mistakes) {
    if (!Array.isArray(mistakes) || mistakes.length === 0) {
        return { rules: [], overall_ar: null };
    }
    return await fetchJsonSafe(
        `${EXPLAIN_BASE}/api/explain`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mistakes }),
        },
        { rules: [], overall_ar: null },
    );
}

export { API_BASE, MUAALEM_BASE, WS_BASE, fetchJsonSafe, explainMistakes };
