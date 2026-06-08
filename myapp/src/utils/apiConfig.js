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

const API_BASE     = process.env.NEXT_PUBLIC_API_URL     || 'http://localhost:8000';
const MUAALEM_BASE = process.env.NEXT_PUBLIC_MUAALEM_URL || 'http://localhost:8888';

// Live recitation WebSocket → Muaalem's native /ws/stream (override with NEXT_PUBLIC_WS_URL).
const WS_HTTP = process.env.NEXT_PUBLIC_WS_URL || MUAALEM_BASE;
const WS_BASE = WS_HTTP.replace(/^http/, 'ws');

export { API_BASE, MUAALEM_BASE, WS_BASE };
