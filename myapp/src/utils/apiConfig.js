/**
 * Centralized API configuration for Next.js.
 *
 * The platform is split across three services (see the deployment readme):
 *   - API_BASE      → Node.js backend (auth, MongoDB, progress)        :5000
 *   - MUAALEM_BASE  → Muaalem model (Uthmani text + deep tajweed)       :8888
 *   - STREAM_BASE   → Streaming AI (live word tracking over WebSocket)  :5050
 *
 * Each can be overridden via a NEXT_PUBLIC_* env var (set them in .env.local).
 */

const API_BASE     = process.env.NEXT_PUBLIC_API_URL     || 'http://localhost:5000';
const MUAALEM_BASE  = process.env.NEXT_PUBLIC_MUAALEM_URL  || 'http://localhost:8888';
const STREAM_BASE   = process.env.NEXT_PUBLIC_STREAM_URL   || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

// WebSocket base for the live streaming server (http(s):// → ws(s)://)
const WS_BASE = STREAM_BASE.replace(/^http/, 'ws');

export { API_BASE, MUAALEM_BASE, STREAM_BASE, WS_BASE };
