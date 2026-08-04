// Single source of truth for the backend API URL.
// VITE_API_URL is set per-environment:
//   .env.local        → http://localhost:8000  (local dev)
//   .env.production   → https://luna-backend.onrender.com  (production)
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
