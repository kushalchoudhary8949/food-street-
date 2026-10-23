/**
 * @file main.js
 * @module main
 * @description
 * Client Application Entrypoint & React 19 DOM Root Mount.
 * 
 * Architectural Role:
 * - Bootstraps the FoodZa Single Page Application (SPA).
 * - Mounts `<App />` within React 19 `<StrictMode>` into the `#root` container.
 * - Integrates Vercel Web Analytics (`@vercel/analytics/react`).
 * - Self-Healing Deployment Handler:
 *   Listens for Vite's `vite:preloadError` event. If a new deployment removes or re-hashes old dynamic
 *   chunks while an active user is browsing, it triggers a seamless browser reload instead of throwing
 *   an unrecoverable chunk-load error.
 */

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './index.css';

// Automatically and silently reload if a new deployment removed an old chunk, avoiding user disruption
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createRoot(document.getElementById('root')).render(_jsxs(StrictMode, { children: [_jsx(App, {}), _jsx(Analytics, {})] }));
